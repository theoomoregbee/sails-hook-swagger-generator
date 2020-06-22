import { NameKeyMap, SwaggerSailsModel, SwaggerModelAttribute, SwaggerSailsControllers, SwaggerControllerAttribute, SwaggerRouteInfo, BluePrintAction, SwaggerActionAttribute, MiddlewareType } from "./interfaces";
import { forEach, defaults, cloneDeep, groupBy, mapValues, map } from "lodash";
import { Tag } from "swagger-schema-official";
import { OpenApi } from "../types/openapi";
import path from "path";


const transformSailsPathToSwaggerPath = (path: string): string => {
  return path
    .split('/')
    .map(v => v.replace(/^:([^/:?]+)\??$/, '{$1}'))
    .join('/');
}

/**
 * Maps from a Sails route path of the form `/path/:id` to a
 * Swagger path of the form `/path/{id}`.
 *
 * Also transform standard Sails primary key reference '{id}' to
 * '_{primaryKeyAttributeName}'.
 *
 * Add underscore to path variable names, used to differentiate the PK value
 * used for paths from query variables. Specifically, differentiate the PK value
 * used for shortcut blueprint update routes, which allow for PK update
 * using query parameters. Some validators expect unique names across all
 * parameter types.
 */
export const transformSailsPathsToSwaggerPaths = (routes: SwaggerRouteInfo[]): void => {

  routes.map(route => {

    route.path = transformSailsPathToSwaggerPath(route.path);

    if (route.model?.primaryKey) {
      const pathVariable = '_' + route.model.primaryKey;
      route.path = route.path.replace('{id}', `{${pathVariable}}`);
      route.variables = route.variables.map(v => v === 'id' ? pathVariable : v);
      route.optionalVariables = route.optionalVariables.map(v => v === 'id' ? pathVariable : v);
    }

  });

};

/*
  * Sails returns individual routes for each association:
  * - /api/v1/quote/:parentid/supplier/:childid
  * - /api/v1/quote/:parentid/items/:childid
  *
  * where the model is 'quote' and the populate aliases are 'supplier' and 'items'.
  *
  * We now aggreggate these routes considering:
  * 1. Blueprint prefix, REST prefix, and model including any pluralization
  * 2. More complete grouping check including verb, model, and blueprint
  *
  * Note that we seek to maintain order of routes.
  *
  * RESTful Blueprint Routes
  * - **add**: PUT /api/v2/activitysummary/:parentid/${alias}/:childid
  * - **remove**: DELETE /api/v2/activitysummary/:parentid/${alias}/:childid
  * - **replace**: PUT /api/v2/activitysummary/:parentid/${alias}
  * - **populate**: GET /api/v2/activitysummary/:parentid/${alias}
  *
  * Shortcut Routes
  * - **add**: GET /api/v2/activitysummary/:parentid/${alias}/add/:childid
  * - **remove**: GET /api/v2/activitysummary/:parentid/${alias}/remove/:childid
  * - **replace**: GET /api/v2/activitysummary/:parentid/${alias}/replace
  *
  * @see https://sailsjs.com/documentation/concepts/blueprints/blueprint-routes#?restful-blueprint-routes
  * @see https://sailsjs.com/documentation/concepts/blueprints/blueprint-routes#?shortcut-blueprint-routes
  *
  */
 export const aggregateAssociationRoutes = (boundRoutes: SwaggerRouteInfo[] /*, models: NameKeyMap<SwaggerSailsModel>*/): SwaggerRouteInfo[] => {

  type AnnotatedRoute = { route: SwaggerRouteInfo; match: RegExpMatchArray };

  /* standard Sails blueprint path pattern, noting that prefix (match[1]) includes
   * blueprint prefix, REST prefix, and model including any pluralization. */
  const re = /^(\/.*)\/{parentid}\/([^/]+)(\/(?:add|remove|replace))?(\/{childid})?$/;

  // only considering these relevant actions
  const actions: BluePrintAction[] = [ 'add', 'remove', 'replace', 'populate' ];

  // step 1: filter to include path matched blueprint actions with a single association alias defined
  const routesToBeAggregated = boundRoutes.map(route => {

    if (route.blueprintAction && actions.indexOf(route.blueprintAction as BluePrintAction) >= 0
      && route.associationAliases && route.associationAliases.length === 1) {
      const match = route.path.match(re);
      if (match && route.associationAliases[0]===match[2]) {
        return { route, match } as AnnotatedRoute;
      }
    }
    return undefined;
  })
  .filter(r => !!r) as AnnotatedRoute[];

  // step 2: group by verb --> then route prefix --> then model identity --> then blueprint action
  const groupedByVerb = groupBy(routesToBeAggregated, r => r.route.verb);
  const thenByPathPrefix = mapValues(groupedByVerb, verbGroup => groupBy(verbGroup, r => r.match[1]));
  const thenByModelIdentity = mapValues(thenByPathPrefix, verbGroup => mapValues(verbGroup, prefixGroup => groupBy(prefixGroup, r => r.route.model!.identity)));
  const thenByAction = mapValues(thenByModelIdentity, verbGroup => mapValues(verbGroup, prefixGroup => mapValues(prefixGroup, modelGroup => groupBy(modelGroup, r => r.route.blueprintAction))));

  // const example = {
  //   get: { // <-- verb groups
  //     '/api/v9/rest/pets': { // <-- url prefix groups
  //       pet: { // <-- model identity groups
  //         populate: [ // <-- blueprint association action groups (add, remove, replace, populate)
  //           {
  //             route: { path: '/api/v9/rest/pets/{parentid}/owner', ... },
  //             match: ['/api/v9/rest/pets/{parentid}/owner', '/api/v9/rest/pets', ... ],
  //           }, {
  //             route: { path: '/api/v9/rest/pets/{parentid}/caredForBy', ... },
  //             match: ['/api/v9/rest/pets/{parentid}/caredForBy', '/api/v9/rest/pets', ... ],
  //           }
  //         ]
  //       }
  //     }
  //   }
  // };

  // step 3: perform aggregation of leaf groups
  const transformedRoutes: NameKeyMap<SwaggerRouteInfo | 'REMOVE'> = {};

  map(thenByAction, verbGroup => {
    map(verbGroup, prefixGroup => {
      map(prefixGroup, modelGroup => {
        map(modelGroup, actionGroup => {

          // first route becomes 'aggregated' version
          const g = actionGroup[0];
          const prefix = g.match[1];
          const pk = '_' + g.route.model!.primaryKey; // note '_' as per transformSailsPathsToSwaggerPaths()
          const shortcutRoutePart = g.match[3] || '';
          const childPart = g.match[4] || '';
          const aggregatedRoute = {
            ...g.route,
            path: `${prefix}/{${pk}}/{association}${shortcutRoutePart}${childPart}`,
            variables: [ ...g.route.variables.map(v => v==='parentid' ? pk : v), 'association' ],
            optionalVariables: g.route.optionalVariables.map(v => v==='parentid' ? pk : v),
            associationAliases: actionGroup.map(r => r.route.associationAliases![0]),
          }
          const routeKey = g.route.verb + '|' + g.route.path;
          transformedRoutes[routeKey] = aggregatedRoute;

          // mark others for removal
          actionGroup.slice(1).map(g => {
            const routeKey = g.route.verb + '|' + g.route.path;
            transformedRoutes[routeKey] = 'REMOVE';
          });

        })
      })
    })

  });

  // step 4: filter
  return boundRoutes.map(route => {

    const routeKey = route.verb + '|' + route.path;
    if(transformedRoutes[routeKey] === undefined) {
      return route; // not being aggregrated --> retain
    } else if(transformedRoutes[routeKey] === 'REMOVE') {
      return undefined; // mark for removal
    } else {
      return transformedRoutes[routeKey]; // new aggregated route
    }

  })
  .filter(r => !!r) as SwaggerRouteInfo[];

}

/**
 * Merges JSDoc `actions` and `model` elements **but not** `components` and `tags`
 * (which are merged in `mergeComponents()` and `mergeTags()`).
 *
 * @param models
 * @param modelsJsDoc
 */
export const mergeModelJsDoc = (models: NameKeyMap<SwaggerSailsModel>, modelsJsDoc: NameKeyMap<SwaggerModelAttribute>): void => {

  forEach(models, model => {

    const modelJsDoc = modelsJsDoc[model.identity];
    if(modelJsDoc) {
      if(modelJsDoc.actions) {
        forEach(modelJsDoc.actions, (action, actionName) => {
          if(!model.swagger.actions) {
            model.swagger.actions = {};
          }
          if(!model.swagger.actions[actionName]) {
            model.swagger.actions[actionName] = { ...action };
          } else {
            defaults(model.swagger.actions[actionName], action);
          }
        });
      }

      if(modelJsDoc.modelSchema) {
        if(!model.swagger.modelSchema) {
          model.swagger.modelSchema = { ...modelJsDoc.modelSchema };
        } else {
          defaults(model.swagger.modelSchema, modelJsDoc.modelSchema);
        }
      }

    }

  });

}

/**
 * Merges JSDoc into `controllerFiles` (not `actions`).
 *
 * The merge includes JSDoc `actions` and `controller` elements **but not** `components` and `tags`
 * (which are merged in `mergeComponents()` and `mergeTags()`).
 *
 * @param controllers
 * @param controllersJsDoc
 */
export const mergeControllerJsDoc = (controllers: SwaggerSailsControllers, controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>): void => {

  forEach(controllers.controllerFiles, (controllerFile, identity) => {

    const controllerJsDoc = controllersJsDoc[identity];
    if(controllerJsDoc) {
      if(controllerJsDoc.actions) {
        forEach(controllerJsDoc.actions, (action, actionName) => {
          if(!controllerFile.swagger.actions) {
            controllerFile.swagger.actions = {};
          }
          if(!controllerFile.swagger.actions[actionName]) {
            controllerFile.swagger.actions[actionName] = { ...action };
          } else {
            defaults(controllerFile.swagger.actions[actionName], action);
          }
        });
      }
    }

  });

}

/**
 * Merges controller file Swagger/JSDoc into `routes` from controller files and controller file JSDoc.
 *
 * The merge includes JSDoc `actions` and `exclude` elements **but not** `components` and `tags`
 * (which are merged in `mergeComponents()` and `mergeTags()`).
 *
 * Specifically, in order of precedence:
 * 1. Route itself; in `SwaggerRouteInfo` and taken from `route.options` (from `config/routes.js` or route bound by hook)
 * 2. Controller file action function `swagger` element (`controllers.actions[].swagger` below)
 * 3. Controller file `swagger` element export (`controllers.controllerFiles[].swagger.actions[]` below) incl `allActions`.
 * 4. Controller file JSDoc `@swagger` comments under the `/{action}` path (`controllersJsDoc[].actions[]` below) incl `allActions`.
 *
 * This function also merges the Actions2Machine details (inputs, exits etc) into `routes`.
 *
 * @param sails
 * @param routes
 * @param controllers
 * @param controllersJsDoc
 */
export const mergeControllerSwaggerIntoRouteInfo = (sails: Sails.Sails, routes: SwaggerRouteInfo[],
  controllers: SwaggerSailsControllers, controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>): void => {

  routes.map(route => {

    const mergeIntoDest = (source: SwaggerActionAttribute | undefined) => {
      if(!source) { return; }
      if(!route.swagger) {
        route.swagger = { ...source };
      } else {
        defaults(route.swagger, source);
      }
    }

    const actionNameLookup = path.basename(route.action);

    const controllerAction = controllers.actions[route.action];
    if (controllerAction) {

      // for actions, route will have action type 'function' --> update from controller info
      route.actionType = controllerAction.actionType;
      route.defaultTagName = controllerAction.defaultTagName;

      // for actions2, store machine metadata (inputs, exits etc) into route
      if(route.actionType === 'actions2') {
        route.actions2Machine = controllerAction;
      }

      /*
       * Step 2: Controller file action function `swagger` element
       */
      mergeIntoDest(controllerAction.swagger);

      /*
       * Step 3: Controller file `swagger` element export
       */
      const controllerFileIdentity = controllerAction.actionType === 'controller' ? path.dirname(route.action) : route.action;

      const controllerFile = controllers.controllerFiles[controllerFileIdentity];
      if(controllerFile) {
        if (controllerFile.swagger) {
          if (controllerFile.swagger.actions) {
            mergeIntoDest(controllerFile.swagger.actions[actionNameLookup]);
          }
          mergeIntoDest(controllerFile.swagger.actions?.allactions);
        }
      } else {
        sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading controller file '${controllerFileIdentity}'`);
      }

      /*
       * Step 4: Controller file JSDoc `@swagger` comments under the `/{action}` path
       */
      const controllerJsDoc = controllersJsDoc[controllerFileIdentity];
      if(controllerJsDoc && controllerJsDoc.actions) {
        mergeIntoDest(controllerJsDoc.actions[actionNameLookup]);
        mergeIntoDest(controllerJsDoc.actions.allactions);
      }

    } else {
      if(route.middlewareType === MiddlewareType.ACTION) {
        sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading controller action '${route.action}' source file`);
      }
    }

  });

}

/**
 * Merge elements of components from `config/routes.js`, model definition files and
 * controller definition files.
 *
 * Elements of components are added to the top-level Swagger/OpenAPI definitions as follows:
 * 1. Elements of the component definition reference (schemas, parameters, etc) are added where
 *    they **do not exist**.
 * 2. Existing elements are **not** overwritten or merged.
 *
 * For example, the element `components.schemas.pet` will be added as part of a merge process,
 * but the contents of multiple definitions of `pet` **will not** be merged.
 *
 * @param dest
 * @param routesJsDoc
 * @param models
 * @param controllers
 */
export const mergeComponents = (dest: OpenApi.Components,
  // routesJsDoc: OpenApi.OpenApi,
  models: NameKeyMap<SwaggerSailsModel>,
  modelsJsDoc: NameKeyMap<SwaggerModelAttribute>,
  controllers: SwaggerSailsControllers,
  controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>): void => {

  const mergeIntoDest = (source: OpenApi.Components | undefined) => {
    if (!source) { return; }
    for (const key in source) {
      const componentName = key as keyof OpenApi.Components;
      if (!dest[componentName]) {
        (dest[componentName] as unknown) = {};
      }
      defaults(dest[componentName], source[componentName]);
    }
  }

  // WIP TBC mergeIntoDest(routesJsDoc.components);

  forEach(models, model => mergeIntoDest(model.swagger?.components));
  forEach(modelsJsDoc, jsDoc => mergeIntoDest(jsDoc.components));

  forEach(controllers.controllerFiles, controllerFile => mergeIntoDest(controllerFile.swagger?.components));
  forEach(controllersJsDoc, jsDoc => mergeIntoDest(jsDoc.components));

}

/**
 * Merge tag definitions from `config/routes.js`, model definition files and
 * controller definition files.
 *
 * Tags are added to the top-level Swagger/OpenAPI definitions as follows:
 * 1. If a tags with the specified name **does not** exist, it is added.
 * 1. Where a tag with the specified name **does** exist, elements _of that tag_ that do not exist are added
 *    e.g. `description` and `externalDocs` elements.
 *
 * @param dest
 * @param routesJsDoc
 * @param models
 * @param controllers
 */
export const mergeTags = (dest: Tag[],
  // routesJsDoc: OpenApi.OpenApi,
  models: NameKeyMap<SwaggerSailsModel>,
  modelsJsDoc: NameKeyMap<SwaggerModelAttribute>,
  controllers: SwaggerSailsControllers,
  controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>,
  defaultModelTags: Tag[]): void => {

  const mergeIntoDest = (source: Tag[] | undefined) => {
    if(!source) { return; }
    source.map(sourceTag => {
      const destTag = dest.find(t => t.name === sourceTag.name);
      if(destTag) {
        defaults(destTag, sourceTag); // merge into existing
      } else {
        dest.push(cloneDeep(sourceTag)); // add new tag
      }
    });
  }

  // WIP TBC mergeIntoDest(routesJsDoc.tags);

  forEach(models, model => mergeIntoDest(model.swagger?.tags));
  forEach(modelsJsDoc, jsDoc => mergeIntoDest(jsDoc.tags));

  forEach(controllers.controllerFiles, controllerFile => mergeIntoDest(controllerFile.swagger?.tags));
  forEach(controllersJsDoc, jsDoc => mergeIntoDest(jsDoc.tags));

  mergeIntoDest(defaultModelTags);

}
