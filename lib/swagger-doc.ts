import * as fs from 'fs';
import { SwaggerGenerator, SwaggerSailsModel } from './interfaces';
import cloneDeep from 'lodash/cloneDeep'
import uniqBy from 'lodash/uniqBy';
import { blueprintActionTemplates as defaultBlueprintActionTemplates, defaults as configurationDefaults, blueprintParameterTemplates } from './type-formatter';
import { parseModels, parseCustomRoutes, parseBindRoutes, mergeCustomAndBindRoutes, parseControllers, attachControllerOrActionSwagger, parseModelsJsDoc } from './parsers';
import { getAction2Paths, getUniqueTagsFromPath, mergeComponents } from './utils';
import { generateSchemas, generatePaths, generateDefaultModelTags } from './generators';
import { OpenApi } from '../types/openapi';
import { mergeModelJsDoc, mergeTags } from './transformations';

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

  const models = parseModels(sails);
  const modelsJsDoc = await parseModelsJsDoc(sails, models);

  const customRoutes = parseCustomRoutes(sails.config);
  let allRoutes = parseBindRoutes(sailsRoutes, models, sails);

  // remove globally excluded routes
  allRoutes = allRoutes.filter(route => route.path !== '/__getcookie')

  let routes = mergeCustomAndBindRoutes(customRoutes, allRoutes, models);

  if (hookConfig.includeRoute) {
    routes = routes.filter(route => hookConfig.includeRoute!(route));
  }

  mergeModelJsDoc(models, modelsJsDoc);

  if (!specifications.tags) specifications.tags = [];
  if (!specifications.components) specifications.components = {};

  const withoutSwaggerRoutes = routes.filter(route => !route.swagger)
  const uniqueControllers = uniqBy(withoutSwaggerRoutes, 'controller')
    .map(route => route.controller)
    .filter((controller): controller is string => !!controller);

  const controllers = await parseControllers(sails, uniqueControllers)
  const action2Paths = getAction2Paths(withoutSwaggerRoutes)
  const action2s = await parseControllers(sails, action2Paths)

  routes = attachControllerOrActionSwagger(routes, controllers, action2s);

  specifications.components.schemas = generateSchemas(models);

  const defaultModelTags = generateDefaultModelTags(models);

  // merge model, controller and action2 .components and .tags
  specifications.components = mergeComponents(specifications.components, models, controllers, action2s);
  mergeTags(specifications.tags, models, modelsJsDoc, /*controllers, controllersJsDoc,*/ defaultModelTags);

  specifications.paths = generatePaths(routes, blueprintActionTemplates, theDefaults, action2s, specifications, models);

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
