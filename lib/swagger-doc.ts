import * as fs from 'fs';
import { SwaggerGenerator, SwaggerSailsModel, SwaggerRouteInfo } from './interfaces';
import cloneDeep from 'lodash/cloneDeep'
import uniqBy from 'lodash/uniqBy';
import { blueprintActionTemplates as defaultBlueprintActionTemplates, defaults as configurationDefaults, blueprintParameterTemplates } from './type-formatter';
import { parseModels, parseControllers, parseModelsJsDoc, parseBoundRoutes, parseControllerJsDoc } from './parsers';
import { getUniqueTagsFromPath } from './utils';
import { generateSchemas, generatePaths, generateDefaultModelTags } from './generators';
import { OpenApi } from '../types/openapi';
import { mergeModelJsDoc, mergeTags, mergeComponents, mergeControllerJsDoc, transformSailsPathsToSwaggerPaths, aggregateAssociationRoutes } from './transformations';

export default async (sails: Sails.Sails, sailsRoutes: Array<Sails.Route>, context: Sails.Hook<SwaggerGenerator>): Promise<OpenApi.OpenApi | undefined> => {

  const hookConfig: SwaggerGenerator = sails.config[context.configKey!];

  if (hookConfig.disabled) {
    return;
  }

  let blueprintActionTemplates = cloneDeep(defaultBlueprintActionTemplates);
  if (hookConfig.updateBlueprintActionTemplates) {
    blueprintActionTemplates = hookConfig.updateBlueprintActionTemplates(blueprintActionTemplates);
  }

  const specifications = {
    tags: [],
    components: {},
    ...cloneDeep(hookConfig.swagger)
  } as OpenApi.OpenApi;

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

  if (hookConfig.includeRoute) {
    routes = routes.filter(route => hookConfig.includeRoute!(route));
  }

  transformSailsPathsToSwaggerPaths(routes);
  routes = aggregateAssociationRoutes(routes);

  mergeModelJsDoc(models, modelsJsDoc);
  mergeControllerJsDoc(controllers, controllersJsDoc);

  if (!specifications.tags) specifications.tags = [];
  if (!specifications.components) specifications.components = {};

  // const controllers = await parseControllers(sails, uniqueControllers)
  // const action2Paths = getAction2Paths(withoutSwaggerRoutes)
  // const action2s = await parseControllers(sails, action2Paths)

  //routes = attachControllerOrActionSwagger(routes, controllers, action2s);

  specifications.components.schemas = generateSchemas(models);

  const defaultModelTags = generateDefaultModelTags(models);

  // merge model, controller and action2 .components and .tags
  mergeComponents(specifications.components, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc);
  mergeTags(specifications.tags, models, modelsJsDoc, controllers, controllersJsDoc, defaultModelTags);

  specifications.paths = generatePaths(routes, blueprintActionTemplates, theDefaults, {}, specifications, models);

  specifications.components.parameters = {
    ...blueprintParameterTemplates,
    ...specifications.components.parameters
  };


  // clean up of specification, removing unreferenced tags
  const referencedTags = getUniqueTagsFromPath(specifications.paths);
  specifications.tags = specifications.tags.filter(tag => referencedTags.has(tag.name));

  if (hookConfig.postProcess) hookConfig.postProcess(specifications);

  const destPath = hookConfig.swaggerJsonPath;
  try {
    fs.writeFileSync(destPath, JSON.stringify(specifications, null, 2));
  } catch (e) {
    sails.log.error(`ERROR: sails-hook-swagger-generator: Error writing ${destPath}: ${e.message}`, e);
  }

  sails.log.info('Swagger generated successfully');

  return specifications;
}
