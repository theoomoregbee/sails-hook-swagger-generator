/**
 * Created by theophy on 02/08/2017.
 */
import * as path from 'path';
import { SwaggerSailsModel, SwaggerAttribute } from './interfaces';
import swaggerJSDoc from 'swagger-jsdoc';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import uniqByLodash from 'lodash/uniqBy';
import { OpenApi } from '../types/openapi';

declare const sails: any;

const uniqBy = uniqByLodash as unknown as <T>(array: Array<T>, prop: string) => Array<T>

const componentReference: Array<keyof OpenApi.Components> = [
  "schemas",
  "parameters",
  "securitySchemes",
  "requestBodies",
  "responses",
  "headers",
  "examples",
  "links",
  "callbacks"
]

// consider all models except associative tables and 'Archive' model special case
const removeModelExceptions = (model: SwaggerSailsModel): boolean => model.globalId && model.globalId!=='Archive'

// TODO: write test for this
// * don't mutate params
// * should merge tags and source tag properties should always override destination if a tag is existing
// * should merge components and source component properties should override component that is existing
const mergeSwaggerSpec = (destination: SwaggerAttribute, source: SwaggerAttribute): SwaggerAttribute => {
  const dest: SwaggerAttribute = cloneDeep(destination)
  dest.tags = uniqBy([
    ...(get(source, 'tags', [])),
    ...(get(dest, 'tags', [])),
  ], 'name');

  dest.components = componentReference.reduce((mergedComponents, ref) => {
    const type = get(source, `components.${ref}`);
    if (type) {
      mergedComponents[ref] = {
        ...(get(dest.components, ref, {})),
        ...type
      }
    }
    return mergedComponents
  }, {})
  return dest
}

const loadSwaggerDocComments = (filePath: string): Promise<SwaggerAttribute>=> {
  return new Promise((resolve, reject) => {
    try {
      const opts = {
        definition: {
          openapi: '3.0.0', // Specification (optional, defaults to swagger: '2.0')
          info: { title: 'dummy', version: '0.0.0' },
        },
        apis: [filePath],
      };
      const specification = swaggerJSDoc(opts);
      resolve(specification as SwaggerAttribute)
    }catch(err){
      reject(err)
    }
  });
}

export const parseModels = async (sailsConfig: Sails.Config, sailsModels: Array<SwaggerSailsModel>): {[globalId: string]: SwaggerSailsModel} => {
  const models = sailsModels.filter(removeModelExceptions);
  // parse swagger jsDoc comments in each of our models
  const modelDir = sailsConfig.paths.models;
  const swaggerComments: Array<SwaggerAttribute | undefined> = await Promise.all(models.map(model =>
    loadSwaggerDocComments(require.resolve(path.join(modelDir, model.globalId))).catch(err => {
      sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading model ${model.globalId}: ${err.message || ''}`, err);
      return undefined
    })));
 return models.reduce((parsed, model, index) => {
   parsed[model.globalId] = model;
   // retrieve swagger documentation from jsDoc comments and merge it with any .swagger within our model
   const swagger = swaggerComments[index];
   model.swagger = cloneDeep(model.swagger || {})
   if(swagger) {
    model.swagger = mergeSwaggerSpec(model.swagger, swagger);
   }
   return parsed
 },{}) 
}

/**
 * Parses Sails model information and returns `modelInfo` objects keyed on `globalId`.
 *
 * @param {any} sailsConfig the `sails.config` object
 * @param {any} sailsModels the `sails.models` object
 * @returns { [globalId:string]: { tag:string, globalId:string, identity:string, primaryKey:string, attributes:[], swagger:{ _tags:[], _components:{} } } }
 */
function parseModelsi(sailsConfig, sailsModels) {

  const models = {};

  const jsDocCache = {};

  _.forEach(sailsModels, model => {

    // consider all models except associative tables and 'Archive' model special case
    if (!model.globalId || model.globalId == 'Archive') return;

    const swagger = {};

    const actionNames = ['findone', 'find', 'create', 'update', 'destroy', 'populate', 'add', 'remove', 'replace'];

    mergeSwagger(swagger, model.swagger);

    // collect `_{blueprintAction}` swagger definitions
    _.forEach(model.swagger, (v, k) => {
      if (!k.startsWith('_')) return;
      if (!swagger[k]) swagger[k] = {};
      mergeSwagger(swagger[k], v);
    });

    try {
      const dir = sailsConfig.paths.models;
      const pth = require.resolve(_path.join(dir, model.globalId));
      if (pth) {
        loadAndMergeJsDoc(jsDocCache, swagger, pth, model.globalId);

        // collect `/{blueprintAction}` swagger definitions
        _.forEach(
          _.get(jsDocCache, [pth, 'paths']),
          (v, k) => {
            if(k==('/'+model.globalId)) return; // skip, handled above
            const ba = '_' + k.substring(1);
            if (!swagger[ba]) swagger[ba] = {};
            mergeSwagger(swagger[ba], v);
          }
        );
      }
    } catch (error) {
      sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading model ${model.globalId}: ${error.message || ''}`, error);
    }

    const modelInfo = {
      tags: swagger.tags || [model.globalId], // default name of Swagger group based on model globalId
      globalId: model.globalId, // model globalId
      identity: model.identity, // model identity
      primaryKey: model.primaryKey || 'id', // name of primary key attribute
      attributes: _.cloneDeep(model.attributes), // attribute definition as per Sails model definition
      swagger: swagger, // model-specific swagger (see below)
    };

    const defaultDescription = `Sails blueprint actions for the **${model.globalId}** model`;

    const tagDefs = getOrSet(swagger, '_tags', []);
    modelInfo.tags.map(tagName => {
      const existing = tagDefs.find(t => t.name == tagName);
      if (existing) {
        if (!existing.description) existing.description = defaultDescription;
      } else {
        tagDefs.push({ name: tagName, description: defaultDescription });
      }
    });

    models[model.globalId] = modelInfo;

  });

  return models;

}

/**
 * Parse Sails custom routes and returns an array of `routeInfo` objects.
 *
 * @param {any} sailsConfig the `sails.config` object
 * @returns array of `routeInfo` objects (see documentation in-code below)
 */
function parseCustomRoutes(sailsConfig) {

  const customRoutes = [];

  const jsDocCache = {};

  _.forEach(sailsConfig.routes, (target, address) => {

    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?route-address
    let [verb, path] = address.split(/\s+/);
    if (path === undefined) {
      path = verb;
      verb = 'all';
    }

    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?wildcards-and-dynamic-parameters
    const { patternVariables, swaggerPath } = generateSwaggerPath(path);

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

    // parse target
    let middlewareType = 'action', controller = '?', action = '?', actionType = '?', actionFound = '?', actionSwagger = {}, actions2;

    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?controller-action-target-syntax
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?standalone-action-target-syntax
    if (_.isString(target)) {
      let match;
      if (match = target.match(/^([^.]+Controller)\.([^.]+)$/)) { // 'FooController.myGoAction'
        [, controller, action] = match;
        actionType = 'controller';
      } else if (match = target.match(/^([^.]+)\.([^.]+)$/)) { // 'foo.myGoAction'
        [, controller, action] = match;
        controller = toController(controller);
        actionType = 'controller';
      } else if (match = target.match(/^([^.]+)$/)) { // 'foo/go-action'
        controller = null;
        [, action] = match;
        actionType = 'standalone';
      }
    } else if (_.isObject(target)) {
      // { controller: 'foo', action: 'myGoAction' }
      // OR { controller: 'FooController', action:'myGoAction' }
      if (target.controller && target.action) {
        ({ controller, action } = target);
        if (!controller.endsWith('Controller')) controller = toController(controller);
        actionType = 'controller';
      } else if (target.action) { // { action: 'foo/go-action' }
        controller = null;
        ({ action } = target);
        actionType = 'standalone';
      } else if (target.view) {
        // https://sailsjs.com/documentation/concepts/routes/custom-routes#?view-target-syntax
        middlewareType = 'view';
      }
      mergeSwagger(actionSwagger, target.swagger);
    }

    // load any JSDoc in config/routes.js
    try {
      const dir = sailsConfig.paths.config;
      const pth = require.resolve(_path.join(dir, 'routes'));
      if (pth) {
        loadAndMergeJsDoc(jsDocCache, actionSwagger, pth, path.substring(1), verb);
      }
    } catch (error) {
      sails.log.error(`ERROR: sails-hook-swagger-generator: Error (ignoring) resolving/loading config/routes.js: ${error.message || ''}`, error);
    }

    if (action) {
      ({ status:actionFound, actions2 } = testLoadAction(sailsConfig, jsDocCache, actionSwagger, controller, action));
    }

    // check for 'foo/go-action' --> FooController.go-action
    if (!controller && action && actionType == 'standalone' && actionFound == 'notfound') {
      let _controller = _path.dirname(action);
      if (_controller != '.') {
        _controller = toController(_controller);
        const _action = _path.basename(action);
        const { status:_actionFound } = testLoadAction(sailsConfig, jsDocCache, actionSwagger, _controller, _action);
        if (_actionFound == 'loaded+found') {
          // if FooController.go-action, update details
          controller = _controller;
          action = _action;
          actionType = 'controller';
          actionFound = _actionFound;
        }
      }
    }

    const tag = controller ? controller.substring(0, controller.length - 10) : action;
    const actionPath = (controller ? _path.join(tag, action) : action).toLowerCase();

    const routeInfo = {
      middlewareType: middlewareType, // one of action|blueprint|view
      blueprintAction: undefined, // optional; one of findone|find|create|update|destroy|populate|add|remove|replace or custom
      httpMethod: verb.toLowerCase(), // one of all|get|post|put|patch|delete
      path: path, // full Sails URL as per sails.getUrlFor() including prefix
      swaggerPath: swaggerPath, // full Sails URL with ':token' replaced with '{token}' for use with Swagger
      identity: undefined, // optional (present for blueprints only); Sails Model identity
      modelInfo: undefined, // optional (present for blueprints only); Sails Model metadata
      controller: controller, // Sails Controller relative path including 'Controller' suffix
      tags: [tag], // default name of Swagger group based on Sails controller/action or Sails Model globalId
      actionPath: actionPath, // Sails Controller action path consistent with 'router:bind' events (controller relative path without suffix + action name)
      actionName: action, // Sails Controller action name e.g. findone or buildModels
      actionType: actionType, // one of controller|standalone|actions2
      actionFound: actionFound, // one of notfound|loaded+notfound|loaded+found|implicit
      actions2: actions2, // optional; present for custom routes with actions2 actions
      patternVariables: patternVariables, // route dynamic parameters
      associations: undefined, // optional (present for blueprints only); Sails Model associations
      aliases: undefined, // optional (applicable for populate blueprints only); Sails Model attribute names for populate action(s)
      associationsPrimaryKeyAttributeInfo: undefined, // optional (present for blueprints only); array of attributeInfo's for association PKs
      swagger: actionSwagger, // per-route swagger (see below)
    };

    if (verb != 'all') {
      customRoutes.push(routeInfo);
    } else {
      ['get', 'post', 'put', 'patch', 'delete'].map(v => {
        customRoutes.push(_.defaults({ httpMethod: v }, _.cloneDeep(routeInfo)));
      });
    }

  });

  return customRoutes;
}

/**
 * Parses specified Sails routes and return an array of `routeInfo` objects.
 *
 * @see https://github.com/balderdashy/sails/blob/master/lib/EVENTS.md#routerbind
 *
 * @param {object[]} sailsRoutes array of `routeObj`'s from `router:bind` event
 * @param {object} models `modelInfo` objects keyed on `globalId` as per `parseModels()`
 * @param {object} sailsConfig the `sails.config` object
 * @returns array of `routeInfo` objects (see documentation in-code below)
 */
function parseAllRoutes(sailsRoutes, models, sailsConfig) {

  // there seems to be duplicates in the routes, so merge them here to capture maximum metadata
  const routesByPath = {};
  _.forEach(sailsRoutes, _route => {
    if (!_route.path || !_route.verb) {
      sails.log.warn(`WARNING: sails-hook-swagger-generator: Bad route ${_route.verb} ${_route.path} (ignoring)`);
      return;
    }
    const key = [_route.verb, _route.path].join(' ');
    const val = _.defaults({ path: _route.path, verb: _route.verb }, _route.options);
    if (_.isEqual(val, routesByPath[key])) return;
    _.defaults(val, routesByPath[key]);
    routesByPath[key] = val;
  });

  let _routes = [];

  _.forEach(routesByPath, routeObj => {

    let middlewareType = '?', blueprintAction, identity, modelInfo, controller = '?', tags, actionName = '?', actionType = '?', actionFound = '?', modelSwagger;

    let { patternVariables, swaggerPath } = generateSwaggerPath(routeObj.path);

    let associationPrimaryKeyAttributeInfo;

    if (routeObj._middlewareType) {
      // ACTION | BLUEPRINT | CORS HOOK | POLICY | VIEWS HOOK | CSRF HOOK | * HOOK
      const match = routeObj._middlewareType.match(/^([^:]+):\s+(.+)$/);
      if (match) {
        middlewareType = match[1].toLowerCase();
        actionName = match[2].toLowerCase();
        if (middlewareType != 'action' && middlewareType != 'blueprint') {
          // sails.log.warn(`WARNING: sails-hook-swagger-generator: Unrecognised middlewareType '${routeObj._middlewareType}' for ${routeObj.path}`);
          return;
        }
      } else {
        sails.log.warn(`WARNING: sails-hook-swagger-generator: Unrecognised middlewareType '${routeObj._middlewareType}' for ${routeObj.path}`);
      }
    }

    if (middlewareType == 'blueprint') {

      blueprintAction = actionName;
      identity = routeObj.model;
      if (!identity && routeObj.action) {
        // custom blueprint actions may not have model name explicitly specified --> extract from action
        [identity] = routeObj.action.split('/');
      }
      modelInfo = _.find(models, model => model.identity == identity);
      if (!modelInfo) {
        sails.log.warn(`WARNING: sails-hook-swagger-generator: Ignoring unregconised shadow/implicit route ${routeObj.path} (type ${middlewareType}) referencing unknown model ${identity}`);
        return;
      }
      controller = toController(modelInfo.globalId);
      tags = modelInfo.tags;
      actionType = 'controller';
      actionFound = 'implicit';

      modelSwagger = mergeSwagger(
        {},
        _.get(modelInfo.swagger, '_' + blueprintAction, {}),
        _.get(modelInfo.swagger, '_tags'),
        _.get(modelInfo.swagger, '_components')
      );

      if (routeObj.associations && routeObj.alias) {
        associationPrimaryKeyAttributeInfo = function () {
          const _assoc = routeObj.associations.find(a => a.alias == routeObj.alias);
          if (!_assoc) return;
          const _identity = _assoc.collection || _assoc.model;
          const _modelInfo = _.find(models, model => model.identity == _identity);
          if (!_modelInfo) return;
          const ret = _.cloneDeep(_modelInfo.attributes[_modelInfo.primaryKey]);
          ret.description = `**${_modelInfo.globalId}** record's foreign key value (**${routeObj.alias}** association${ret.description ? '; ' + ret.description : ''})`;
          return ret;
        }();
      }

      if (modelInfo.primaryKey !== 'id') {
        swaggerPath = swaggerPath.replace('{id}', '{' + modelInfo.primaryKey + '}');
      }

    } else if (middlewareType == 'action') {

      actionName = '?'; // case of controller/action is flattened by Sails --> easier to obtain from custom routes

    }

    const routeInfo = {
      middlewareType: middlewareType, // one of action|blueprint|view
      blueprintAction: blueprintAction, // optional; one of findone|find|create|update|destroy|populate|add|remove|replace or custom
      httpMethod: routeObj.verb.toLowerCase(), // one of all|get|post|put|patch|delete
      path: routeObj.path, // full Sails URL as per sails.getUrlFor() including prefix
      swaggerPath: swaggerPath, // full Sails URL with ':token' replaced with '{token}' for use with Swagger
      identity: identity, // optional (present for blueprints only); Sails Model identity
      modelInfo: modelInfo, // optional (present for blueprints only); Sails Model metadata
      controller: controller, // Sails Controller relative path including 'Controller' suffix
      tags: tags || [], // default name of Swagger group based on Sails controller/action or Sails Model globalId
      actionPath: routeObj.action, // Sails Controller action path consistent with 'router:bind' events (controller relative path without suffix + action name)
      actionName: actionName, // Sails Controller action name e.g. findone or buildModels
      actionType: actionType, // one of controller|standalone|actions2
      actionFound: actionFound, // one of notfound|loaded+notfound|loaded+found|implicit
      actions2: undefined, // optional; present for custom routes with actions2 actions
      patternVariables: patternVariables, // optional; route dynamic parameters
      associations: routeObj.associations || [], // optional (present for blueprints only); Sails Model associations
      alias: routeObj.alias || undefined, // optional (applicable for populate blueprints only); Sails Model attribute name for populate actions
      // ^ replaced by `aliases` below (plural after aggregation)
      associationPrimaryKeyAttributeInfo: associationPrimaryKeyAttributeInfo, // optional (present for blueprints only); alias attributeInfo for association PK
      // ^ replaced by `associationsPrimaryKeyAttributeInfo` below (plural after aggregation)
      swagger: modelSwagger, // per-route swagger (see below)
    };

    _routes.push(routeInfo);

  });

  /*
   * Sails returns individual routes for each association:
   * - /api/v1/quote/:parentid/supplier/:childid
   * - /api/v1/quote/:parentid/items/:childid
   *
   * We now aggreggate these routes.
   */

  const populateByModel = {}, addByModel = {}, removeByModel = {}, replaceByModel = {};
  _routes.map(routeInfo => {

    // only blueprint actions
    if (routeInfo.middlewareType != 'blueprint') return;

    const m = routeInfo.identity;
    function addTo(ba, tgt) {
      if (routeInfo.blueprintAction != ba) return;
      if (!tgt[m]) tgt[m] = [];
      tgt[m].push(routeInfo);
    }
    addTo('populate', populateByModel);
    addTo('add', addByModel);
    addTo('remove', removeByModel);
    addTo('replace', replaceByModel);
  });

  _routes = _routes
    .map(routeInfo => {

      // only blueprint actions
      if (routeInfo.middlewareType != 'blueprint') return routeInfo;

      const m = routeInfo.identity;
      const pk = routeInfo.modelInfo.primaryKey;

      function process(tgt) {
        const arr = tgt[m];
        if (!arr) return undefined; // emit aggregated routeInfo on first occurence

        let re = new RegExp('/{parentid}/' + routeInfo.alias + '$', 'g');
        routeInfo.swaggerPath = routeInfo.swaggerPath.replace(re, `/{${pk}}/{association}`);

        re = new RegExp('/{parentid}/' + routeInfo.alias + '/{childid}$', 'g');
        routeInfo.swaggerPath = routeInfo.swaggerPath.replace(re, `/{${pk}}/{association}/{fk}`);

        routeInfo.aliases = arr.map(ri => ri.alias);
        routeInfo.associationsPrimaryKeyAttributeInfo = arr.map(ri => ri.associationPrimaryKeyAttributeInfo);
        delete routeInfo.alias;
        delete routeInfo.associationPrimaryKeyAttributeInfo;

        delete tgt[m];
        return routeInfo;
      }
      if (routeInfo.blueprintAction == 'populate') return process(populateByModel);
      if (routeInfo.blueprintAction == 'add') return process(addByModel);
      if (routeInfo.blueprintAction == 'remove') return process(removeByModel);
      if (routeInfo.blueprintAction == 'replace') return process(replaceByModel);

      return routeInfo;

    })
    .filter(routeInfo => routeInfo);

  return _routes;

}

/**
 * Merge custom routes (from `config/routes.js`) and 'all' routes (from router bind events),
 * removing duplicates where necessary.
 *
 * Notes:
 * 1. 'Custom' routes contain Swagger documention from source and JSDoc.
 * 2. 'All' routes contain Swagger documentation from `api/models/*.js` for blueprint routes.
 * 3. 'All' routes contain more detail for custom route actions which resolve to blueprint actions
 *    but miss custom route Swagger documentation.
 *
 * @param {object[]} customRoutes array of `routeInfo` objects from `parseCustomRoutes()`
 * @param {object[]} allRoutes array of `routeInfo` objects from `parseAllRoutes()`
 * @returns {object[]} array of `routeInfo` objects
 */
function mergeCustomAndAllRoutes(customRoutes, allRoutes) {

  const merged = allRoutes.map(ar => {

    const cr = customRoutes.find(_cr => _cr.path == ar.path && _cr.httpMethod == ar.httpMethod);
    if(!cr) return ar;

    if(ar.middlewareType=='blueprint') {
      // if resolves to blueprint, use this merging in any Swagger documention from custom route
      const swagger = _.cloneDeep(cr.swagger);
      mergeSwagger(swagger, ar.swagger);
      return _.assign(_.cloneDeep(ar), { swagger: swagger });
    } else if(ar.middlewareType=='action') {
      // for actions, prefer custom routes
      return _.cloneDeep(cr);
    } else {
      // default to custom route
      return _.cloneDeep(cr);
    }

  });

  customRoutes.map(cr => {
    const r = merged.find(m => m.path == cr.path && m.httpMethod == cr.httpMethod);
    if(!r) {
      sails.log.warn(`WARNING: sails-hook-swagger-generator: Sails custom route ${cr.path} NOT found as bound route (ignoring)`);
    }
  })

  return merged;

}

/**
 * Converts controller syntax from `path/foo` to `path/FooController`.
 * @param {string} path
 * @returns converted path
 */
function toController(path) {
  const dir = _path.dirname(path);
  let controller = _path.basename(path);
  controller = controller.charAt(0).toUpperCase() + controller.substring(1) + 'Controller';
  return _path.join(dir, controller);
}

/**
 * Attempts to load Sails controller action JavaScript file, merge any Swagger content
 * (in-code and/or JSDoc) and return actions2 metadata if applicable.
 *
 * @param {any} sailsConfig the `sails.config` object
 * @param {any} jsDocCache object cached used across multiple calls
 * @param {any} swagger object into which to load and merge Swagger content
 * @param {string} controller relative path of the Sails controller file (or empty for standalone action)
 * @param {string} action name of the action within the controller file or relative path for standalone action
 * @return { status: notfound|loaded+notfound|loaded+found|loaded+found+actions2, actions2: {} }
 */
function testLoadAction(sailsConfig, jsDocCache, swagger, controller, action) {
  const dir = sailsConfig.paths.controllers;
  try {
    if (controller) {
      const pth = _path.join(dir, controller);
      const module = require(pth);
      if (module[action]) {
        mergeSwagger(swagger, module[action].swagger);
        mergeSwagger(
          swagger,
          _.get(module, ['swagger', '_' + action]),
          _.get(module, ['swagger', '_tags'], []),
          _.get(module, ['swagger', '_components'], {}),
        );

        const rpth = require.resolve(pth);
        loadAndMergeJsDoc(jsDocCache, swagger, rpth, action);

        return { status: 'loaded+found' };
      } else {
        return { status: 'loaded+notfound' };
      }
    } else {
      const pth = _path.join(dir, action);
      const module = require(pth);

      mergeSwagger(swagger, module.swagger);

      const rpth = require.resolve(pth);
      loadAndMergeJsDoc(jsDocCache, swagger, rpth, _path.basename(action));

      if (_.isFunction(module)) { // standalone action
        return { status: 'loaded+found' };
      } else { // actions2
        return { status: 'loaded+found', actions2: _.omit(module, 'fn') };
      }
    }
  } catch (error) {
    return { status: 'notfound' };
  }
}

/**
 * Attempts to load specified source file, parse JSDoc and merge any
 * `@swagger` annotated comments.
 *
 * @param {any} jsDocCache object cached used across multiple calls
 * @param {any} swagger object into which to merge loaded Swagger content
 * @param {string} path path of file to load and parse JSDoc from
 * @param {string} actionOrPath Sails action within the target file, or relative path (no leading '/')
 * @param {string} httpMethod optional HTTP method used as sub-element under actionOrPath within Swagger content
 */
function loadAndMergeJsDoc(jsDocCache, swagger, path, actionOrPath, httpMethod) {

  let _swagger;
  if (jsDocCache[path]) {
    _swagger = jsDocCache[path];
  } else {
    try {
      const opts = {
        definition: {
          openapi: '3.0.0', // Specification (optional, defaults to swagger: '2.0')
          info: { title: 'dummy', version: '0.0.0' },
        },
        apis: [path],
      };
      _swagger = swaggerJSDoc(opts);
      if (_swagger) jsDocCache[path] = _swagger;

    } catch (error) {
      sails.log.warn(`WARNING: sails-hook-swagger-generator: Error loading/parsing JSDoc ${path}: ${error.message || ''}`, error);
      _swagger = {};
      jsDocCache[path] = {}; // cache empty result so report error only once
    }
  }

  if (_swagger) {
    const srcSwagger = httpMethod ? _.get(_swagger, ['paths', '/' + actionOrPath, httpMethod])
      : _.get(_swagger, ['paths', '/' + actionOrPath]);
    mergeSwagger(
      swagger,
      srcSwagger,
      _.get(_swagger, 'tags', []),
      _.get(_swagger, 'components', {})
    );
  }

}

/**
 * Maps from a Sails route path of the form `/path/:id` to a
 * Swagger path of the form `/path/{id}`.
 *
 * @param {string} path
 * @returns { patternVariables:string[], swaggerPath:string }
 */
function generateSwaggerPath(path) {
  const patternVariables = [];
  const swaggerPath = path
    .split('/')
    .map(v => {
      const match = v.match(/^:([^/:?]+)\??$/);
      if (match) {
        patternVariables.push(match[1]);
        return '{' + match[1] + '}';
      }
      return v;
    })
    .join('/');
  return { patternVariables: patternVariables, swaggerPath: swaggerPath };
}

/**
 * Gets and returns the specified lodash path, setting if dne.
 * @param {*} object object to operate on
 * @param {*} path path (as per `_.get()`) within `object`
 * @param {*} defaultValue default value to set if `path` not set
 * @returns {any} requested path within object
 */
function getOrSet(object, path, defaultValue) {
  const v = _.get(object, path);
  if (v !== undefined) return v;
  _.set(object, path, defaultValue);
  return defaultValue;
}

/**
 * Takes source Swagger content, incuding additions for tags and components,
 * and merges into the destination Swagger content.
 *
 * @see Tag and component element handing in README for notes on merging
 * @see The reference object `componentDefinitionReference` below
 *
 * @param {any} destSwagger object into which to merge loaded Swagger content
 * @param {any} srcSwagger object from which to extract Swagger content *for* merging
 * @param {any} tags object from which to extract Swagger tag definitions *for* merging; defaults to `['_tags']` element
 * @param {any} components object from which to extract Swagger component definitions *for* merging; defaults to `['_components']` element
 * @returns the destSwagger object
 */
function mergeSwagger(destSwagger, srcSwagger, tags, components) {

  if (srcSwagger) {
    _.defaults(destSwagger,
      _.cloneDeep(
        _.omitBy(srcSwagger, (v, k) => k.startsWith('_'))
      )
    );
  }

  // add any tags defined if dne
  if (tags === undefined) {
    tags = _.get(srcSwagger, '_tags');
  }
  if (tags && _.isArray(tags)) {
    const dtags = getOrSet(destSwagger, '_tags', []);
    tags.map(tag => {
      const existing = dtags.find(t => t.name == tag.name);
      if (existing) {
        _.defaults(existing, tag);
      } else {
        dtags.push(_.cloneDeep(tag));
      }
    });
  }

  // add any components defined
  if (components === undefined) {
    components = _.get(srcSwagger, '_components')
  }
  if (components) {
    _.forEach(componentDefinitionReference, (_unused, refName) => {
      _.forEach(components[refName], (v, k) => {
        const existing = _.get(destSwagger, ['_components', refName, k]);
        if (existing === undefined) _.set(destSwagger, ['_components', refName, k], _.cloneDeep(v));
      });
    });
  }

  return destSwagger;
}

/// Reference object used in `mergeSwagger()` above
var componentDefinitionReference = {
  // Reusable schemas (data models)
  schemas: {},
  // Reusable path, query, header and cookie parameters
  parameters: {},
  // Security scheme definitions (see Authentication)
  securitySchemes: {},
  // Reusable request bodies
  requestBodies: {},
  // Reusable responses, such as 401 Unauthorized or 400 Bad Request
  responses: {},
  // Reusable response headers
  headers: {},
  // Reusable examples
  examples: {},
  // Reusable links
  links: {},
  // Reusable callbacks
  callbacks: {},
};

module.exports = {
  parseModels: parseModels,
  parseCustomRoutes: parseCustomRoutes,
  parseAllRoutes: parseAllRoutes,
  mergeCustomAndAllRoutes: mergeCustomAndAllRoutes,
};
