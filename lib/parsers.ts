/**
 * Created by theophy on 02/08/2017.
 */
import * as path from 'path';
import { SwaggerSailsModel, SwaggerSailsRouteControllerTarget, HTTPMethodVerb, ParsedCustomRoute, ParsedBindRoute, MiddlewareType, SwaggerRouteInfo, SwaggerSailsController, SwaggerAction, NameKeyMap } from './interfaces';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import { OpenApi } from '../types/openapi';
import { generateSwaggerPath } from './generators';
import { loadSwaggerDocComments, mergeSwaggerSpec, mergeSwaggerPaths, removeViewRoutes, normalizeRouteControllerTarget, getBlueprintAllowedMiddlewareRoutes, normalizeRouteControllerName, getSwaggerAction, getActionNameFromPath } from './utils';

// consider all models except associative tables and 'Archive' model special case
const removeModelExceptions = (model: SwaggerSailsModel): boolean => !!model.globalId && model.globalId !== 'Archive'


export const parseModels = async (sails: Sails.Sails, sailsConfig: Sails.Config, sailsModels: Array<SwaggerSailsModel> = []): Promise<NameKeyMap<SwaggerSailsModel>> => {
  const models = sailsModels.filter(removeModelExceptions);
  // parse swagger jsDoc comments in each of our models
  const modelDir = sailsConfig.paths.models;
  const swaggerComments: Array<OpenApi.OpenApi | undefined> = await Promise.all(models.map(model =>
    loadSwaggerDocComments(require.resolve(path.join(modelDir, model.globalId))).catch(err => {
      sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading model ${model.globalId}: ${err.message || ''}`, err);
      return undefined
    })));

  const parseTagsComponents = (model: SwaggerSailsModel, index: number) => {
    // retrieve swagger documentation from jsDoc comments and merge it with any .swagger within our model
    const swagger = swaggerComments[index];
    model.swagger = cloneDeep(model.swagger || {})
    if (swagger) {
      model.swagger = mergeSwaggerSpec(model.swagger, swagger);
    }
    return model
  }

  const parseSwaggerDocPaths = (model: SwaggerSailsModel, index: number) => {
    // parse and merge swagger.actions and swagger-doc path (and take them as precendence)
    const swagger = swaggerComments[index]
    if (swagger) {
      const paths = swagger.paths || {}
      model.swagger.actions = mergeSwaggerPaths(model.swagger.actions!, paths as SwaggerAction)
    }

    return model
  }

  return models
    .map(parseTagsComponents)
    .map(parseSwaggerDocPaths)
    .reduce((parsed, model) => {
      parsed[model.globalId.toLowerCase()] = model;
      return parsed
    }, {} as NameKeyMap<SwaggerSailsModel>)
}

export const parseCustomRoutes = (sailsConfig: Sails.Config): Array<ParsedCustomRoute> => {
  const routes = removeViewRoutes(sailsConfig.routes) as Record<string, string | SwaggerSailsRouteControllerTarget>;
  const customRoutes: ParsedCustomRoute[] = []
  for (const routeAddress in routes) {
    // Parse 1: Route Address
    // see https://sailsjs.com/documentation/concepts/routes/custom-routes#?route-address
    let [verb = 'get', path] = routeAddress.split(/\s+/)
    verb = verb.toLowerCase();
    if (!path) {
      path = verb
      verb = 'all'
    }

    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?wildcards-and-dynamic-parameters
    const swaggerPathParams = generateSwaggerPath(path);

    // XXX TODO wildcard

    // XXX TODO Handle arrays
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?route-target
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?policy-target-syntax
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?function-target-syntax

    // XXX TODO Handle these variations
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?regular-expressions-in-addresses
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?routing-to-blueprint-actions
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?redirect-target-syntax (starts with / or scheme)
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?response-target-syntax
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?policy-target-syntax
    // https://sailsjs.com/documentation/concepts/actions-and-controllers#?actions-2

    // Parse 2: Route target
    const routeTarget = normalizeRouteControllerTarget(routes[routeAddress]);

    const parsedRoute: ParsedCustomRoute = {
      verb: verb as HTTPMethodVerb,
      ...swaggerPathParams,
      ...routeTarget
    }

    if (verb !== 'all') {
      customRoutes.push(parsedRoute);
    } else {
      ['get', 'post', 'put', 'patch', 'delete'].forEach(v => {
        customRoutes.push({ ...parsedRoute, verb: v as HTTPMethodVerb });
      });
    }
  }
  return customRoutes
}

type GroupAggregatedModelRoutes = NameKeyMap<ParsedBindRoute[]>
const groupAggregatedModelRoutes = (routes: ParsedBindRoute[], type: 'populate' | 'add' | 'remove' | 'replace') => {
  return routes.filter(route => route.action === type)
    .reduce((grouped, route) => {
      const identity = route.model.identity;
      if (!grouped[identity]) {
        grouped[identity] = []
      }
      grouped[identity].push(route);
      return grouped
    }, {} as GroupAggregatedModelRoutes);
}


/*
  * Sails returns individual routes for each association:
  * - /api/v1/quote/:parentid/supplier/:childid
  * - /api/v1/quote/:parentid/items/:childid
  *
  * We now aggreggate these routes.
  */
const aggregateAssociationRoutes = (blueprintRoutes: ParsedBindRoute[], models: NameKeyMap<SwaggerSailsModel>): Array<ParsedBindRoute | undefined> => {
  type AggregationRoutesModel = {
    [name in 'populateByModel' | 'addByModel' | 'removeByModel' | 'replaceByModel']: GroupAggregatedModelRoutes;
  };

  const aggregatedRoutesByModel: AggregationRoutesModel = {
    populateByModel: groupAggregatedModelRoutes(blueprintRoutes, 'populate'),
    addByModel: groupAggregatedModelRoutes(blueprintRoutes, 'add'),
    removeByModel: groupAggregatedModelRoutes(blueprintRoutes, 'remove'),
    replaceByModel: groupAggregatedModelRoutes(blueprintRoutes, 'replace'),
  }

  const processAggregationModelRoutes = (route: ParsedBindRoute, byModel: keyof AggregationRoutesModel): ParsedBindRoute | undefined => {
    const byModelRoutes = aggregatedRoutesByModel[byModel][route.model.identity];
    if (!byModelRoutes) {
      return undefined
    }

    const primaryKey = route.model.primaryKey;
    route.path = route.path.replace(new RegExp(`/{parentid}/${route.associationAliases[0]}$`, 'g'), `/{${primaryKey}}/{association}`);
    route.path = route.path.replace(new RegExp(`/{parentid}/${route.associationAliases[0]}/{childid}$`, 'g'), `/{${primaryKey}}/{association}/{fk}`);

    route.associationAliases = byModelRoutes.map(r => r.associationAliases[0]).filter((alias): alias is string => !!alias)
    return route
  }

  return blueprintRoutes.map(route => {
    if (route.action === 'populate') return processAggregationModelRoutes(route, 'populateByModel')
    if (route.action === 'add') return processAggregationModelRoutes(route, 'addByModel')
    if (route.action === 'remove') return processAggregationModelRoutes(route, 'removeByModel')
    if (route.action === 'replace') return processAggregationModelRoutes(route, 'replaceByModel')
    return route
  });
}

export const parseBindRoutes = (boundRoutes: Array<Sails.Route>, models: NameKeyMap<SwaggerSailsModel>, sails: Sails.Sails): ParsedBindRoute[] => {
  const routes = getBlueprintAllowedMiddlewareRoutes(boundRoutes);

  const parsedRoutes: ParsedBindRoute[] = routes.map(route => {
    const routeOptions = route.options;
    let identity = routeOptions.model;
    const _middlewareType = routeOptions._middlewareType as string;
    const [middlewareType, actionName = ''] = _middlewareType.split(':') as [MiddlewareType, string];
    const blueprintAction = actionName.toLowerCase().trim();
    if (!identity && routeOptions.action) {
      // custom blueprint actions may not have model name explicitly specified --> extract from action
      [identity] = routeOptions.action.split('/');
    }

    const model = models[identity!];
    if (!model) {
      sails.log.warn(`WARNING: sails-hook-swagger-generator: Ignoring unregconised shadow/implicit route ${route.path} (type ${middlewareType}) referencing unknown model ${identity}`);
      return;
    }
    const controller = normalizeRouteControllerName(model.globalId);
    const tags = get(model.swagger, 'tags', []);
    const swagger = get(model.swagger.actions, `${blueprintAction}.${route.verb}`) as OpenApi.Operation | undefined;

    const swaggerPathParams = generateSwaggerPath(route.path);

    if (model.primaryKey && model.primaryKey !== 'id') {
      swaggerPathParams.path = swaggerPathParams.path.replace('{id}', `{${model.primaryKey}}`);
    }

    return {
      ...swaggerPathParams,
      verb: route.verb as HTTPMethodVerb,
      model,
      action: blueprintAction,
      controller,
      tags,
      swagger,
      associationAliases: [routeOptions.alias],
      associations: routeOptions.associations,
      middlewareType: MiddlewareType.BLUEPRINT,
    } as ParsedBindRoute
  }).filter((route): route is ParsedBindRoute => !!route)


  return aggregateAssociationRoutes(parsedRoutes, models)
    .filter((route): route is ParsedBindRoute => !!route)
}

const toSwaggerRoute = (customRoute: ParsedCustomRoute, models: NameKeyMap<SwaggerSailsModel>): SwaggerRouteInfo => {

  const route: SwaggerRouteInfo = {
    ...customRoute,
    tags: [],
    associationAliases: [],
  }

  // use controller name as model identity name
  if (customRoute.controller) {
    const [identity = ''] = customRoute.controller.split('Controller');
    const model = models[identity.toLowerCase()];
    route.model = model;
    route.tags = get(model, 'swagger.tags', []);
  }

  return route
}

/**
 * Merge both custom and bound routes, we only need
 * .swagger,.action and .controller props from custom
 * merge the others with bound routes
 * attached to customRoutes takes precedence over boundRoutes
 *
 * @param customRoutes
 * @param boundRoutes
 */
export const mergeCustomAndBindRoutes = (customRoutes: ParsedCustomRoute[], boundRoutes: ParsedBindRoute[], models: NameKeyMap<SwaggerSailsModel>): SwaggerRouteInfo[] => {
  // blueprints routes from bound routes
  const merged: SwaggerRouteInfo[] = boundRoutes.map(route => {
    const customRoute = customRoutes.find(croute => croute.path === route.path && croute.verb === route.verb);
    if (customRoute) {
      route.swagger = customRoute.swagger;
      route.action = customRoute.action;
      route.controller = customRoute.controller;
    }
    return route
  });

  // custom routes not in above blueprint routes
  customRoutes.forEach(customRoute => {
    if (!merged.find(mergedRoute => mergedRoute.path === customRoute.path && mergedRoute.verb === customRoute.verb)) {
      merged.push(toSwaggerRoute(customRoute, models))
    }
  });

  return merged
}


export const parseControllers = async (sails: Sails.Sails, controllerNames: string[]): Promise<NameKeyMap<SwaggerSailsController>> => {
  const controllerDir = sails.config.paths.controllers!;
  const swaggerDocComments: Array<OpenApi.OpenApi | undefined> = await Promise.all(controllerNames.map(async name => {
    let filePath
    try {
      filePath = require.resolve(path.join(controllerDir, name))
    } catch (err) {
      sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading controller ${name}: ${err.message || ''}`, err);
      return undefined
    }
    return loadSwaggerDocComments(filePath).catch(err => {
      sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading controller ${name}: ${err.message || ''}`, err);
      return undefined
    })
  }));
  const parseController = (name: string): SwaggerSailsController => {
    try {
      const controllerPath = path.join(controllerDir, name)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const controllerOrAction = require(controllerPath);
      if (controllerOrAction) {
        return { name, ...controllerOrAction }
      }
    } catch (err) {
      sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading controller ${name}: ${err.message || ''}`, err);
    }

    return { name, swagger: {} }
  }

  const parseTagsComponents = (controller: SwaggerSailsController, index: number) => {
    // retrieve swagger documentation from jsDoc comments and merge it with any .swagger within our controller
    const swagger = swaggerDocComments[index];
    controller.swagger = cloneDeep(controller.swagger || {})
    if (swagger) {
      controller.swagger = mergeSwaggerSpec(controller.swagger, swagger);
    }
    return controller
  }

  const parseSwaggerDocPaths = (controller: SwaggerSailsController, index: number) => {
    // parse and merge swagger.actions and swagger-doc path (and take them as precendence)
    const swagger = swaggerDocComments[index]
    if (swagger) {
      const paths = swagger.paths || {}
      controller.swagger.actions = mergeSwaggerPaths(controller.swagger.actions!, paths as SwaggerAction)
    }

    return controller
  }


  return controllerNames
    .map(parseController)
    .map(parseTagsComponents)
    .map(parseSwaggerDocPaths)
    .reduce((parsed, controller) => {
      parsed[controller.name] = controller;
      return parsed
    }, {} as NameKeyMap<SwaggerSailsController>)
}

export const attachControllerOrActionSwagger = (routesInfo: SwaggerRouteInfo[], controllers: NameKeyMap<SwaggerSailsController>, action2s: NameKeyMap<SwaggerSailsController>): SwaggerRouteInfo[] => {
  return routesInfo.map(route => {
    if (route.swagger) {
      return route
    }
    route.swagger = getSwaggerAction(controllers[route.controller!], route.action);
    if (!route.swagger) {
      route.swagger = getSwaggerAction(action2s[route.action], getActionNameFromPath(route.action));
    }
    return route
  })
}
