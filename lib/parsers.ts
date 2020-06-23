/**
 * Created by theophy on 02/08/2017.
 */
import * as path from 'path';
import { SwaggerSailsModel, HTTPMethodVerb, MiddlewareType, SwaggerRouteInfo, NameKeyMap, SwaggerActionAttribute, SwaggerModelAttribute, ActionType, SwaggerSailsControllers, AnnotatedFunction, SwaggerControllerAttribute, BluePrintAction, SwaggerModelSchemaAttribute } from './interfaces';
import { loadSwaggerDocComments, blueprintActions } from './utils';
import { map, pickBy, mapValues, forEach, isObject, isArray, isFunction, isString, isUndefined, omit } from 'lodash';
import includeAll from 'include-all';


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

  /* example of standard blueprint route but with standard action overridden in controller */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const standardBlueprintRouteWithOverriddenActionExampleForReference = {
    path: '/user',
    target: '[Function: routeTargetFnWrapper]',
    verb: 'post',
    options: {
      model: 'user',
      associations: [ /* [Object], [Object], [Object] */ ],
      autoWatch: true,
      detectedVerb: { verb: '', original: '/user', path: '/user' },
      action: 'user/create',
      _middlewareType: 'ACTION: user/create',
      skipRegex: []
    },
    originalFn: /* [Function] */ { _middlewareType: 'ACTION: user/create' }
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
   * Whilst automatic blueprints `options.model` is set (see above), Sails `parseBlueprintOptions()`
   * (see below) uses the model identity parsed from the action 'user/find' --> model 'User', blueprint action 'find'.
   * This rule (parsing from action) is used below.
   *
   * We can pick up `swagger` objects from either custom routes or hook routes.
   *
   * @see https://sailsjs.com/documentation/reference/request-req/req-options
   * @see https://sailsjs.com/documentation/concepts/extending-sails/hooks/hook-specification/routes
   * @see https://github.com/balderdashy/sails/blob/master/lib/hooks/blueprints/parse-blueprint-options.js#L58
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

      const verb = route.verb.toLowerCase();

      // ignore RegExp-based routes
      if(typeof route.path !== 'string') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const routeKey = verb + '|' + (route.path as any).toString();
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
      const routeKey = verb + '|' + route.path;
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

      const verb = route.verb.toLowerCase();
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
        sails.log.verbose(`WARNING: sails-hook-swagger-generator: Ignoring bound route '${route.verb} ${route.path}' as middleware type missing`);
        return undefined;
      }

      const middlewareType = _middlewareType === 'blueprint' ? MiddlewareType.BLUEPRINT : MiddlewareType.ACTION;
      const parsedPath = parsePath(route.path);

      // model-based (blueprint or other) actions (of the form `{modelIdentity}/{action}`)
      const [modelIdentity, blueprintAction, ...tail] = routeOptions.action.split('/');
      if (tail.length === 0) {

        const model = models[modelIdentity!];
        if (model) { // blueprint / model-based action

          if (middlewareType === MiddlewareType.BLUEPRINT && mwtAction !== blueprintAction) {
            sails.log.warn(`WARNING: sails-hook-swagger-generator: Bound route '${route.verb} ${route.path}' has blueprint action mismatch '${blueprintAction}' != '${routeOptions._middlewareType}' (ignoring)`);
          }

          let isShortcutBlueprintRoute = false;

          // test for shortcut blueprint routes
          if (verb === 'get') {
            // 1:prefix, 2:identity, 3:shortcut-action, 4:id
            const re = /^(\/.+)?\/([^/]+)\/(find|create|update|destroy)(\/:id)?$/;

            // 1:prefix, 2:identity, 3:id, 4:association, 5:shortcut-action, 6:id
            const re2 = /^(\/.+)?\/([^/]+)\/(:parentid)\/([^/]+)\/(add|remove|replace)(\/:childid)?$/;

            if (route.path.match(re) || route.path.match(re2)) {
              // XXX TODO check identity & shortcut-action matches action
              isShortcutBlueprintRoute = true;
            }
          }

          return {
            middlewareType,
            verb: verb as HTTPMethodVerb,
            ...parsedPath, // path & variables
            action: routeOptions.action,
            actionType: 'function',
            model,
            associationAliases: routeOptions.alias ? [routeOptions.alias] : [],
            blueprintAction,
            isShortcutBlueprintRoute,
            swagger: routeOptions.swagger,
          } as SwaggerRouteInfo;

        }

      }

      // fall-through --> non-model based action

      return {
        middlewareType,
        verb: verb as HTTPMethodVerb,
        ...parsedPath, // path & variables
        action: routeOptions.action || mwtAction || '_unknown',
        actionType: 'function',
        swagger: routeOptions.swagger,
      } as SwaggerRouteInfo;

    })
    .filter(route => !!route) as SwaggerRouteInfo[];

}

/**
 * Load and return details of all Sails controller files and actions.
 *
 * @note The loading mechanism is taken from Sails.
 * @see https://github.com/balderdashy/sails/blob/master/lib/app/private/controller/load-action-modules.js#L27
 *
 * @param sails
 */
export const parseControllers = async (sails: Sails.Sails): Promise<SwaggerSailsControllers> => {

  const controllersLoadedFromDisk = await new Promise((resolve, reject) => {
    includeAll.optional({
      dirname: sails.config.paths.controllers,
      filter: /(^[^.]+\.(?:(?!md|txt).)+$)/,
      flatten: true,
      keepDirectoryPath: true,
    }, (err: Error | string, files: IncludeAll.FilesDictionary) => {
      if (err) reject(err);
      resolve(files);
    });
  }) as IncludeAll.FilesDictionary;

  const ret: SwaggerSailsControllers = {
    controllerFiles: {},
    actions: {}
  };

  // Traditional controllers are PascalCased and end with the word "Controller".
  const traditionalRegex = new RegExp('^((?:(?:.*)/)*([0-9A-Z][0-9a-zA-Z_]*))Controller\\..+$');
  // Actions are kebab-cased.
  const actionRegex = new RegExp('^((?:(?:.*)/)*([a-z][a-z0-9-]*))\\..+$');

  forEach(controllersLoadedFromDisk, (moduleDef) => {

    let filePath = moduleDef.globalId;
    if (filePath[0] === '.') { return; }

    if (path.dirname(filePath) !== '.') {
      filePath = path.dirname(filePath).replace(/\./g, '/') + '/' + path.basename(filePath);
    }

    /* traditional controllers */
    let match = traditionalRegex.exec(filePath);
    if (match) {

      if (!isObject(moduleDef) || isArray(moduleDef) || isFunction(moduleDef)) { return; }
      const moduleIdentity = match[1].toLowerCase();
      const defaultTagName = path.basename(match[1]);

      // store keyed on controller file identity
      ret.controllerFiles[moduleIdentity] = {
        ...moduleDef,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        swagger: (moduleDef as any).swagger || {},
        actionType: 'controller',
        defaultTagName
      };

      // check for swagger.actions[] for which action dne AND convert to case-insensitive identities
      const swaggerActions: NameKeyMap<SwaggerActionAttribute> = {};
      forEach(ret.controllerFiles[moduleIdentity].swagger.actions || {}, (swaggerDef, actionName) => {
        if (actionName === 'allActions') {
          // proceed
        } else if(!moduleDef[actionName]) {
          sails.log.warn(`WARNING: sails-hook-swagger-generator: Controller '${filePath}' contains Swagger action definition for unknown action '${actionName}'`);
          return;
        }
        const actionIdentity = actionName.toLowerCase();
        if(swaggerActions[actionIdentity]) {
          sails.log.warn(`WARNING: sails-hook-swagger-generator: Controller '${filePath}' contains Swagger action definition '${actionName}' which conflicts with a previously-loaded definition`);
        }
        swaggerActions[actionIdentity] = swaggerDef;
      });

      ret.controllerFiles[moduleIdentity].swagger.actions = swaggerActions;

      forEach(moduleDef, (action, actionName) => {
        if (isString(action)) { /* ignore */ return; }
        else if (actionName === '_config') { /* ignore */ return; }
        else if(actionName === 'swagger') { /* ignore */ return; }
        else if(isFunction(action)) {
          const actionIdentity = (moduleIdentity + '/' + actionName).toLowerCase();
          if(ret.actions[actionIdentity]) {
            // conflict --> dealt with by Sails loader so just ignore here
          } else {
            ret.actions[actionIdentity] = {
              actionType: 'controller',
              defaultTagName,
              fn: action,
            };
            const _action = action as AnnotatedFunction;
            if(_action.swagger) {
              ret.actions[actionIdentity].swagger = _action.swagger;
            }
          }
        }
      });

    /* else actions (standalone or actions2) */
    } else if ((match = actionRegex.exec(filePath))) {

      const actionIdentity = match[1].toLowerCase();
      if (ret.actions[actionIdentity]) {
        // conflict --> dealt with by Sails loader so just ignore here
        return;
      }

      const actionType: ActionType = isFunction(moduleDef) ? 'standalone' : 'actions2';
      const defaultTagName = path.basename(match[1]);

      // store keyed on controller file identity
      ret.controllerFiles[actionIdentity] = {
        ...moduleDef,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        swagger: (moduleDef as any).swagger || {},
        actionType,
        defaultTagName
      };

      if(isFunction(moduleDef)) {
        ret.actions[actionIdentity] = {
          actionType,
          defaultTagName: path.basename(match[1]),
          fn: moduleDef,
        }
        const _action = moduleDef as AnnotatedFunction;
        if (_action.swagger) {
          ret.actions[actionIdentity].swagger = _action.swagger;
        }
      } else if(!isUndefined(moduleDef.machine) || !isUndefined(moduleDef.friendlyName) || isFunction(moduleDef.fn)) {
        // note no swagger here as this is captured at the controller file level above
        ret.actions[actionIdentity] = {
          actionType,
          defaultTagName,
          ...(omit(moduleDef, 'swagger') as unknown as Sails.Actions2Machine)
        };
      }

      // check for swagger.actions[] for which action dne
      forEach(ret.controllerFiles[actionIdentity].swagger.actions || {}, (swaggerDef, actionName) => {
        if (actionName === 'allActions') return;
        if(actionName !== defaultTagName) {
          sails.log.warn(`WARNING: sails-hook-swagger-generator: ${ret.actions[actionIdentity].actionType} action '${filePath}' contains Swagger action definition for unknown action '${actionName}' (expected '${defaultTagName}')`);
        }
      });

    }

  });

  return ret;

}

/**
 * Loads and parses model JSDoc, returning a map keyed on model identity.
 *
 * @note Identities lowercase.
 *
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

        const modelJsDocPath = '/' + model.globalId;

        ret[identity] = {
          tags: swaggerDoc.tags,
          components: swaggerDoc.components,
          actions: {},
        };

        // check for paths for which an action dne AND convert to case-insensitive identities
        forEach(swaggerDoc.paths, (swaggerDef, actionName) => {
          if(actionName === modelJsDocPath) {
            return;
          } else if(actionName === '/allActions') {
            // proceed
          } else if (!actionName.startsWith('/') || !blueprintActions.includes(actionName.slice(1) as BluePrintAction)) {
            sails.log.warn(`WARNING: sails-hook-swagger-generator: Model file '${model.globalId}' contains Swagger JSDoc action definition for unknown blueprint action '${actionName}'`);
            return;
          }
          const actionIdentity = actionName.substring(1).toLowerCase(); // convert '/{action}' --> '{action}'
          if (ret[identity].actions![actionIdentity]) {
            sails.log.warn(`WARNING: sails-hook-swagger-generator: Model file '${model.globalId}' contains Swagger JSDoc action definition '${actionName}' which conflicts with a previously-loaded definition`);
          }
          // note coercion as non-standard swaggerDoc i.e. '/{action}' contains operation contents (no HTTP method specified)
          ret[identity].actions![actionIdentity] = swaggerDef as SwaggerActionAttribute;
        });

        const modelJsDoc = swaggerDoc.paths['/' + model.globalId];
        if(modelJsDoc) {
          // note coercion as non-standard swaggerDoc i.e. '/{globalId}' contains operation contents (no HTTP method specified)
          ret[identity].modelSchema = modelJsDoc as SwaggerModelSchemaAttribute;
        }

      } catch (err) {
        sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading model ${model.globalId}: ${err.message || ''}` /* , err */);
      }
    })
  );

  return ret;

}

/**
 * Loads and parses controller JSDoc, returning a map keyed on controller file identity.
 *
 * @note Identities lowercase.
 *
 * @param sails
 * @param controllers
 */
export const parseControllerJsDoc = async (sails: Sails.Sails, controllers: SwaggerSailsControllers):
  Promise<NameKeyMap<SwaggerControllerAttribute>> => {

  const ret: NameKeyMap<SwaggerControllerAttribute> = {};

  await Promise.all(
    map(controllers.controllerFiles, async (controller, identity) => {
      try {
        const controllerFile = path.join(sails.config.paths.controllers, controller.globalId);
        const swaggerDoc = await loadSwaggerDocComments(controllerFile);

        ret[identity] = {
          tags: swaggerDoc.tags,
          components: swaggerDoc.components,
          actions: {},
        };

        // check for paths for which an action dne AND convert to case-insensitive identities
        forEach(swaggerDoc.paths, (swaggerDef, actionName) => {
          if(actionName === '/allActions') {
            // proceed
          } else if (controller.actionType === 'standalone' || controller.actionType === 'actions2') {
            if(actionName !== `/${controller.defaultTagName}`) {
              sails.log.warn(`WARNING: sails-hook-swagger-generator: ${controller.actionType} action '${controller.globalId}' contains Swagger JSDoc action definition for unknown action '${actionName}' (expected '/${controller.defaultTagName}')`);
              return;
            }
          } else {
            if (!actionName.startsWith('/') || !controller[actionName.slice(1)]) {
              sails.log.warn(`WARNING: sails-hook-swagger-generator: Controller file '${controller.globalId}' contains Swagger JSDoc action defintion for unknown action '${actionName}'`);
              return;
            }
          }
          const actionIdentity = actionName.substring(1).toLowerCase(); // convert '/{action}' --> '{action}'
          if (ret[identity].actions![actionIdentity]) {
            sails.log.warn(`WARNING: sails-hook-swagger-generator: Controller file '${controller.globalId}' contains Swagger JSDoc action definition '${actionName}' which conflicts with a previously-loaded definition`);
          }
          // note coercion as non-standard swaggerDoc i.e. '/{action}' contains operation contents (no HTTP method specified)
          ret[identity].actions![actionIdentity] = swaggerDef as SwaggerActionAttribute;
        });

      } catch (err) {
        sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading controller ${controller.globalId}: ${err.message || ''}` /* , err */);
      }
    })
  );

  return ret;
}

