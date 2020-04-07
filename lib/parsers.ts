/**
 * Created by theophy on 02/08/2017.
 */
import * as path from 'path';
import { SwaggerSailsModel, SwaggerRouteInfo, SwaggerSailsRouteControllerTarget, HTTPMethodVerb, ParsedCustomRoute, ParsedBindRoute, AssociationPrimaryKeyAttribute, MiddlewareType } from './interfaces';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import { OpenApi } from '../types/openapi';
import { generateSwaggerPath } from './generators';
import { loadSwaggerDocComments, mergeSwaggerSpec, mergeSwaggerPaths, removeViewRoutes, normalizeRouteControllerTarget, getAllowedMiddlewareRoutes, normalizeRouteControllerName } from './utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const sails: any;


// consider all models except associative tables and 'Archive' model special case
const removeModelExceptions = (model: SwaggerSailsModel): boolean => !!model.globalId && model.globalId !== 'Archive'


export const parseModels = async (sailsConfig: Sails.Config, sailsModels: Array<SwaggerSailsModel> = []): Promise<{[globalId: string]: SwaggerSailsModel}> => {
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
      // parse and merge swagger.actions and swagger-doc path 
      const swagger = swaggerComments[index] 
      if(swagger){
        const paths = swagger.paths || {}
        model.swagger.actions = mergeSwaggerPaths(model.swagger.actions!, paths)
      }

      return model
    }

  return models
    .map(parseTagsComponents)
    .map(parseSwaggerDocPaths)
    .reduce((parsed, model) => {
      parsed[model.globalId] = model;
      return parsed
    }, {} as { [globalId: string]: SwaggerSailsModel })
}

export const parseCustomRoutes = (sailsConfig: Sails.Config): Array<ParsedCustomRoute> => {
  const routes = removeViewRoutes(sailsConfig.routes) as Record<string, string | SwaggerSailsRouteControllerTarget>;
  const customRoutes: ParsedCustomRoute[] = []
  for (const routeAddress in routes) {
    // Parse 1: Route Address
    // see https://sailsjs.com/documentation/concepts/routes/custom-routes#?route-address
    let [verb, path] = routeAddress.split(/\s+/) 
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
      path,
      swaggerPath:swaggerPathParams.path,
      variables: swaggerPathParams.variables,
      ...routeTarget
    }

    if (verb !== 'all') {
      customRoutes.push(parsedRoute);
    } else {
      ['get', 'post', 'put', 'patch', 'delete'].forEach(v => {
        customRoutes.push({...parsedRoute, verb: v as HTTPMethodVerb});
      });
    }
  }
  return customRoutes
}

const getAssociationPrimaryKeyAttribute = (routeOptions: Sails.RouteOption, models: { [globalId: string]: SwaggerSailsModel }): AssociationPrimaryKeyAttribute | undefined => {
  const associations = routeOptions.associations || [] 
  const association = associations.find(item => item.alias === routeOptions.alias);
  if(!association){
    return 
  }
  const identity = association.collection || association.model;
  const model = models[identity];
  if(!model) {
    return
  }
  const associationInfo = get(model.attributes, `[${model.primaryKey}]`, { description: '' });
  return {
    ...associationInfo,
    description: `**${model.globalId}** record's foreign key value (**${routeOptions.alias}** association${associationInfo.description ? '; ' + associationInfo.description : ''})`
  }
}

export const parseBindRoutes = (boundRoutes: Array<Sails.Route>, models: { [globalId: string]: SwaggerSailsModel }, sails: Sails.Sails): ParsedBindRoute[] => {
  const routes = getAllowedMiddlewareRoutes(boundRoutes);

  const parsedRoutes: ParsedBindRoute[] = routes.map(route => {
    const routeOptions = route.options;
    let identity = routeOptions.model;
    const _middlewareType = routeOptions._middlewareType as string;
    const [middlewareType, actionName = ''] = _middlewareType.split(':') as [MiddlewareType, string];
    const blueprintAction = actionName.toLowerCase();
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
    const associationPrimaryKeyAttribute = routeOptions.associations && routeOptions.alias ? getAssociationPrimaryKeyAttribute(routeOptions, models) : undefined;
    const swaggerPathParams = generateSwaggerPath(route.path);

    if(model.primaryKey !== 'id') {
      swaggerPathParams.path = swaggerPathParams.path.replace('{id}', `{${model.primaryKey}}`);
    }

    return {
      ...swaggerPathParams,
      verb: route.verb,
      path: route.path,
      model,
      action: blueprintAction,
      controller,
      tags,
      swagger,
      associationPrimaryKeyAttribute
    }
  }).filter((route): route is ParsedBindRoute => !!route)


  return parsedRoutes
}

export const mergeCustomAndBindRoutes = (customRoutes: ParsedCustomRoute[], boundRoutes: ParsedBindRoute[]) => {
  return 
}