import * as fs from 'fs';
import { SwaggerGenerator } from './interfaces';
import { cloneDeep, defaultsDeep, defaults } from 'lodash';
import { blueprintActionTemplates as defaultBlueprintActionTemplates, defaults as configurationDefaults, blueprintParameterTemplates } from './type-formatter';
import { parseModels, parseControllers, parseModelsJsDoc, parseBoundRoutes, parseControllerJsDoc } from './parsers';
import { getUniqueTagsFromPath } from './utils';
import { generateSchemas, generatePaths, generateDefaultModelTags } from './generators';
import { OpenApi } from '../types/openapi';
import { mergeModelJsDoc, mergeTags, mergeComponents, mergeControllerJsDoc, transformSailsPathsToSwaggerPaths, aggregateAssociationRoutes, mergeControllerSwaggerIntoRouteInfo } from './transformations';
import { Tag } from 'swagger-schema-official';

export default async (sails: Sails.Sails, sailsRoutes: Array<Sails.Route>, context: Sails.Hook<SwaggerGenerator>): Promise<OpenApi.OpenApi | undefined> => {

  const hookConfig: SwaggerGenerator = sails.config[context.configKey!];

  if (hookConfig.disabled) {
    return;
  }

  let blueprintActionTemplates = cloneDeep(defaultBlueprintActionTemplates);
  if (hookConfig.updateBlueprintActionTemplates) {
    blueprintActionTemplates = hookConfig.updateBlueprintActionTemplates(blueprintActionTemplates);
  }

  const specifications = cloneDeep(hookConfig.swagger || {}) as OpenApi.OpenApi;

  const theDefaults = hookConfig.defaults || configurationDefaults;

  /*
   * parse models and controllers (structures, source Swagger and JSDoc Swagger)
   */

  const models = parseModels(sails);
  const modelsJsDoc = await parseModelsJsDoc(sails, models);

  const controllers = await parseControllers(sails);
  const controllersJsDoc = await parseControllerJsDoc(sails, controllers);

  let routes = parseBoundRoutes(sailsRoutes, models, sails);

  /*
   * transformations phase - filter, transform, merge into consistent single model
   * of SwaggerRouteInfo[]
   */

  // remove globally excluded routes
  routes = routes.filter(route => route.path !== '/__getcookie')

  transformSailsPathsToSwaggerPaths(routes);
  routes = aggregateAssociationRoutes(routes);

  if (hookConfig.includeRoute) {
    routes = routes.filter(route => hookConfig.includeRoute!(route));
  }

  mergeModelJsDoc(models, modelsJsDoc);
  mergeControllerJsDoc(controllers, controllersJsDoc);

  mergeControllerSwaggerIntoRouteInfo(sails, routes, controllers, controllersJsDoc);

  /*
   * generation phase
   */

  defaultsDeep(specifications, {
    tags: [],
    components: {
      schemas: {},
      parameters: {},
    },
    paths: {},
  });

  defaults(specifications.components!.schemas, generateSchemas(models));

  const defaultModelTags = generateDefaultModelTags(models);

  mergeComponents(specifications.components!, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc);
  mergeTags(specifications.tags!, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc, defaultModelTags);

  defaults(specifications.paths, generatePaths(routes, blueprintActionTemplates, theDefaults, specifications, models));

  defaults(specifications.components!.parameters, blueprintParameterTemplates);

  if (hookConfig.postProcess) hookConfig.postProcess(specifications);

  // clean up of specification, removing unreferenced tags
  const referencedTags = getUniqueTagsFromPath(specifications.paths);

  specifications.tags = specifications.tags!.filter(tagDef => {
    const ret = referencedTags.has(tagDef.name);
    if(!ret) {
      sails.log.warn(`WARNING: sails-hook-swagger-generator: Tag '${tagDef.name}' defined but not referenced; removing`);
    }
    return ret;
  });

  // clean up of specification, define referenced tags that dne
  referencedTags.forEach(tagName => {
    const tagDef = specifications.tags!.find(t => t.name === tagName);
    if(!tagDef) {
      sails.log.info(`NOTICE: sails-hook-swagger-generator: Tag '${tagName}' referenced but not defined; adding`);
      specifications.tags!.push({ name: tagName } as Tag);
    }
  });

  const destPath = hookConfig.swaggerJsonPath;
  try {
    fs.writeFileSync(destPath, JSON.stringify(specifications, null, 2));
  } catch (e) {
    sails.log.error(`ERROR: sails-hook-swagger-generator: Error writing ${destPath}: ${e.message}`, e);
  }

  sails.log.info('Swagger generated successfully');

  return specifications;
}
