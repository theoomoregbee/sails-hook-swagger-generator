/**
 * Created by theophy on 02/08/2017.
 */
import * as path from 'path';
import { SwaggerSailsModel, SwaggerSailsRouteControllerTarget, HTTPMethodVerb, ParsedCustomRoute, ParsedBindRoute, MiddlewareType, SwaggerRouteInfo, SwaggerSailsController, NameKeyMap, SwaggerActionAttribute, SwaggerModelAttribute, ActionType } from './interfaces';
import cloneDeep from 'lodash/cloneDeep';
import { OpenApi } from '../types/openapi';
import { loadSwaggerDocComments, mergeSwaggerSpec, mergeSwaggerPaths, getSwaggerAction, getActionNameFromPath } from './utils';
import { map, pickBy, mapValues, mapKeys } from 'lodash';


/**
 * Parses Sails route path of the form `/path/:id` to extract list of variables
 * and optional variables.
 *
 * Optional variables are annotated with a `?` as `/path/:id?`.
 *
 * @note The `variables` elements contains all variables (including optional).
 */
const parsePath = (path: string): { path: string; variables: string[]; optionalVariables: string[] } => {
  const variables: string[] = [];
  const optionalVariables: string[] = [];
  path
    .split('/')
    .map(v => {
      const match = v.match(/^:([^/:?]+)(\?)?$/);
      if (match) {
        variables.push(match[1]);
        if(match[2]) optionalVariables.push(match[1]);
      }
    });
  return { path, variables, optionalVariables };
}

/**
 * Parse Sails ORM models (runtime versions from `sails.models`).
 *
 * @param sails
 */
export const parseModels = (sails: Sails.Sails): NameKeyMap<SwaggerSailsModel> => {

  const filteredModels = pickBy(sails.models, (model /*, _identity */) => {

    // consider all models except associative tables and 'Archive' model special case
    return !!model.globalId && model.globalId !== 'Archive';

  });

  return mapValues(filteredModels, model => {
    return {
      globalId: model.globalId,
      primaryKey: model.primaryKey,
      identity: model.identity,
      attributes: model.attributes,
      associations: model.associations,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      swagger: (model as any).swagger || {}
    };
  });

}

/**
 * Parse array of routes capture from Sails 'router:bind' events.
 *
 * @note See detailed background in implementation comments.
 *
 * @param boundRoutes
 * @param models
 * @param sails
 */
export const parseBoundRoutes = (boundRoutes: Array<Sails.Route>,
  models: NameKeyMap<SwaggerSailsModel>, sails: Sails.Sails): SwaggerRouteInfo[] => {

  /* example of Sails.Route (in particular `options`) for standard blueprint */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const standardBlueprintRouteExampleForReference = {
    path: '/user',
    target: '[Function: routeTargetFnWrapper]',
    verb: 'get',
    options: {
      model: 'user',
      associations: [ { alias: 'pets', type: 'collection', collection: 'pet', via: 'owner' } ],
      autoWatch: true,
      detectedVerb: { verb: '', original: '/user', path: '/user' },
      action: 'user/find',
      _middlewareType: 'BLUEPRINT: find',
      skipRegex: []
    },
    originalFn: { /*[Function] */ _middlewareType: 'BLUEPRINT: find' }
  };

  /* example of Sails.Route for custom route targetting blueprint action */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const customRouteTargettingBlueprintExampleForReference = {
    path: '/user/test2/:phoneNumber',
    target: '[Function]',
    verb: 'get',
    options: {
      detectedVerb: { verb: '', original: '/user/test2/:phoneNumber', path: '/user/test2/:phoneNumber' },
      swagger: { summary: 'Unusual route to access `find` blueprint' },
      action: 'user/find',
      _middlewareType: 'BLUEPRINT: find',
      skipRegex: [/^[^?]*\/[^?/]+\.[^?/]+(\?.*)?$/],
      skipAssets: true
    },
    originalFn: { /* [Function] */ _middlewareType: 'BLUEPRINT: find' }
  };

  /* example of Sails.Route for custom route action */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const customRouteTargettingActionExampleForReference = {
    path: '/api/v2/reporting/period-summary',
    target: '[Function: routeTargetFnWrapper]',
    verb: 'get',
    options: {
      detectedVerb: { verb: '', original: '/api/v2/reporting/period-summary', path: '/api/v2/reporting/period-summary' },
      action: 'reporting/periodsummary/run',
      _middlewareType: 'ACTION: reporting/periodsummary/run',
      skipRegex: []
    },
    originalFn:
      { /* [Function] */ _middlewareType: 'ACTION: reporting/periodsummary/run' }
  };

  /*
   * Background notes on Sails 'router:bind' events.
   *
   * Sails 'router:bind' emits events for the action **and** all middleware
   * (run before the action itself) applicable to the route. Events are emitted
   * in the order executed i.e. middleware (CORS, policies etc) with action handler
   * last.
   *
   * We filter based on `options._middlewareType` (taking actions and blueprints,
   * ignoring others) and merge for unique `verb`/`path` tuples.
   *
   * Note that:
   * 1. Middleware typically includes options of the final action (except
   *    CORS setHeaders it would seem).
   * 2. The value `originalFn._middlewareType` can be used to determine
   *    the nature of the middleware/action itself.
   *
   * @see https://github.com/balderdashy/sails/blob/master/lib/EVENTS.md#routerbind
   */

  /*
   * Background notes on `options.action`.
   *
   * Note that 'router:bind' events have a normalised action identity; lowercase, with
   * `Controller` removed and dots with slashes (`.`'s replaced with `/`'s).
   *
   * @see https://github.com/balderdashy/sails/blob/ef8e98f09d9a97ea9a22b1a7c961800bc906c061/lib/router/index.js#L455
   */

  /*
   * Background on `options` element of 'router:bind' events.
   *
   * Options contains values from several possible sources:
   * 1. Sails configuration `config/routes.js` route target objects (including
   *    all actions and actions targetting a blueprint action).
   * 2. Sails hook initialization `hook.routes.before` or `hook.routes.after`.
   * 3. Sails automatic blueprint routes.
   *
   * Most (all?) actions include the following options:
   * - action e.g. 'user/find'
   * - _middlewareType e.g. 'BLUEPRINT: find', 'ACTION: user/logout' or 'ACTION: subdir/actions2'
   *
   * Automatic blueprint routes also include:
   * - model - the identity of the model that a particular blueprint action should target
   * - alias - for blueprint actions that directly involve an association, indicates the name of the associating attribute
   * - associations - copy of `sails.models[identity].associations`
   *
   * We can pick up `swagger` objects from either custom routes or hook routes.
   *
   * @see https://sailsjs.com/documentation/reference/request-req/req-options
   * @see https://sailsjs.com/documentation/concepts/extending-sails/hooks/hook-specification/routes
   */

  /*
   * Background on shortcut route patterns used to detect blueprint shortcut routes.
   *
   * The following patterns are used to detect shortcut blueprint routes:
   * -  GET /:modelIdentity/find
   * -  GET /:modelIdentity/find/:id
   * -  GET /:modelIdentity/create
   * -  GET /:modelIdentity/update/:id
   * -  GET /:modelIdentity/destroy/:id
   * -  GET /:modelIdentity/:parentid/:association/add/:childid
   * -  GET /:modelIdentity/:parentid/:association/remove/:childid
   * -  GET /:modelIdentity/:parentid/:association/replace?association=[1,2...]
   */

  // key is `${verb}|${path}`, used to merge duplicate routes as per notes above
  const routeLookup: NameKeyMap<Sails.Route> = {};
  const ignoreDuplicateCheck: NameKeyMap<boolean> = {};

  return boundRoutes
    .map(route => {

      // ignore RegExp-based routes
      if(typeof route.path !== 'string') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const routeKey = route.verb + '|' + (route.path as any).toString();
        if (!ignoreDuplicateCheck[routeKey]) {
          ignoreDuplicateCheck[routeKey] = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (typeof (route.path as any).exec === 'function') { // test for RegExp
            sails.log.warn(`WARNING: sails-hook-swagger-generator: Ignoring regular expression based bound route '${route.verb} ${route.path}' - you will need to document manually if required`);
          } else {
            sails.log.warn(`WARNING: sails-hook-swagger-generator: Ignoring route with unrecognised path '${route.verb} ${route.path}' - you will need to document manually if required`);
          }
        }
        return undefined;
      }

      // remove duplicates base on verb+path, merging options (overwriting); see notes above
      const routeKey = route.verb + '|' + route.path;
      if(!routeLookup[routeKey]) {
        routeLookup[routeKey] = {
          ...route,
          options: { ...route.options }
        };
        return routeLookup[routeKey];
      } else {
        Object.assign(routeLookup[routeKey].options, route.options);
        return undefined;
      }

    })
    .map(route => {

      if(!route) { // ignore removed duplicates
        return undefined;
      }

      const routeOptions = route.options;
      let _middlewareType, mwtAction;

      if (routeOptions._middlewareType) {
        // ACTION | BLUEPRINT | CORS HOOK | POLICY | VIEWS HOOK | CSRF HOOK | * HOOK
        const match = routeOptions._middlewareType.match(/^([^:]+):\s+(.+)$/);
        if (match) {
          _middlewareType = match[1].toLowerCase();
          mwtAction = match[2];
          if (_middlewareType !== 'action' && _middlewareType !== 'blueprint') {
            sails.log.silly(`DEBUG: sails-hook-swagger-generator: Ignoring bound route '${route.verb} ${route.path}' bound to middleware of type '${routeOptions._middlewareType}'`);
            return undefined;
          }
        } else {
          sails.log.warn(`WARNING: sails-hook-swagger-generator: Ignoring bound route '${route.verb} ${route.path}' bound to middleware with unrecognised type '${routeOptions._middlewareType}'`);
          return undefined;
        }
      } else {
        sails.log.warn(`WARNING: sails-hook-swagger-generator: Ignoring bound route '${route.verb} ${route.path}' as middleware type missing`);
        return undefined;
      }

      const parsedPath = parsePath(route.path);
      // let middlewareType, action, actionType;

      if (_middlewareType === 'action') {

        return {
          middlewareType: MiddlewareType.ACTION,
          verb: route.verb as HTTPMethodVerb,
          ...parsedPath, // path & variables
          action: routeOptions.action || mwtAction || '_unknown',
          actionType: 'function',
          swagger: routeOptions.swagger,
        } as SwaggerRouteInfo;

      } else { // _middlewareType === 'blueprint'

        let actionType: ActionType = 'blueprint';

        // test for shortcut blueprint routes
        if (route.verb === 'get') {
          // 1:prefix, 2:identity, 3:shortcut-action, 4:id
          const re = /^(\/.*)\/([^/]+)\/(find|create|update|destroy)(\/:id)?$/;

          // 1:prefix, 2:identity, 3:id, 4:association, 5:shortcut-action, 6:id
          const re2 = /^(\/.*)\/([^/]+)\/(:parentid)\/([^/]+)\/(add|remove|replace)(\/:childid)?$/;

          if (route.path.match(re) || route.path.match(re2)) {
            actionType = 'shortcutBlueprint';
          }
        }

        let modelIdentity = routeOptions.model;
        if (!modelIdentity && routeOptions.action) {
          // custom blueprint actions may not have model name explicitly specified --> extract from action
          let actionToCheck: string;
          [modelIdentity, actionToCheck] = routeOptions.action.split('/');
          if(!actionToCheck) {
            sails.log.warn(`WARNING: sails-hook-swagger-generator: Bound route '${route.verb} ${route.path}' has missing blueprint action '${routeOptions.action}' (ignoring)`);
          } else if(mwtAction !== actionToCheck) {
            sails.log.warn(`WARNING: sails-hook-swagger-generator: Bound route '${route.verb} ${route.path}' has blueprint action mismatch '${actionToCheck}' != '${routeOptions._middlewareType}' (ignoring)`);
          }
        }

        const model = models[modelIdentity!];
        if (!model) {
          sails.log.warn(`WARNING: sails-hook-swagger-generator: Ignoring unregconised shadow/implicit route ${route.path} bound to middleware with unrecognised type '${routeOptions._middlewareType}' referencing unknown model ${modelIdentity}`);
          return undefined;
        }

        return {
          middlewareType: MiddlewareType.BLUEPRINT,
          verb: route.verb as HTTPMethodVerb,
          ...parsedPath, // path & variables
          action: mwtAction,
          actionType,
          model,
          associationAliases: routeOptions.alias ? [routeOptions.alias] : [],
          swagger: routeOptions.swagger,
        } as SwaggerRouteInfo;

    }

  })
  .filter(route => !!route) as SwaggerRouteInfo[];

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
      controller.swagger.actions = mergeSwaggerPaths(controller.swagger.actions!, paths as NameKeyMap<SwaggerActionAttribute>)
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


/**
 * Loads and parses model JSDoc, returning a map keyed on model identity.
 * @param sails
 * @param models
 */
export const parseModelsJsDoc = async (sails: Sails.Sails, models: NameKeyMap<SwaggerSailsModel>):
  Promise<NameKeyMap<SwaggerModelAttribute>> => {

  const ret: NameKeyMap<SwaggerModelAttribute> = {};


  await Promise.all(
    map(models, async (model, identity) => {
      try {

        const modelFile = require.resolve(path.join(sails.config.paths.models, model.globalId));
        const swaggerDoc = await loadSwaggerDocComments(modelFile);

        ret[identity] = {
          tags: swaggerDoc.tags,
          components: swaggerDoc.components,
        };

        const modelJsDoc = swaggerDoc.paths['/' + model.globalId];
        if(modelJsDoc) {
          // note coercion as non-standard swaggerDoc i.e. '/{globalId}' contains operation contents (no HTTP method specified)
          ret[identity].model = modelJsDoc as SwaggerActionAttribute;
        }

        // note coercion as non-standard swaggerDoc i.e. '/{action}' contains operation contents (no HTTP method specified)
        const actionNames = ['findone', 'find', 'create', 'update', 'destroy', 'populate', 'add', 'remove', 'replace'];
        ret[identity].actions = mapKeys(
          pickBy(swaggerDoc.paths, (action, path) => actionNames.includes(path.substring(1))),
          (action, path) => path.substring(1) // convert '/findone' --> 'findone'
        ) as NameKeyMap<SwaggerActionAttribute>;

      } catch (err) {
        sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading model ${model.globalId}: ${err.message || ''}` /* , err */);
      }
    })
  );

  return ret;

}
