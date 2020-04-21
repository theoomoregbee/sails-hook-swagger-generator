import * as fs from 'fs';
import { SwaggerGenerator, SwaggerSailsModel } from './interfaces';
import * as lodash from 'lodash';
import uniqBy from 'lodash/uniqBy';
import { blueprintActionTemplates as bluePrintTemplates, defaults as defaultsResponses } from './type-formatter';
import { parseModels, parseCustomRoutes, parseBindRoutes, mergeCustomAndBindRoutes, parseControllers, loadRoutesSwaggerJsDoc } from './parsers';
import { getAction2Paths } from './utils';
import { generateSchemas } from './generators';

const cloneDeep = lodash.cloneDeep

export default  async (sails: Sails.Sails, sailsRoutes: Array<Sails.Route>, context: Sails.Hook<SwaggerGenerator>): Promise<void> => {

  const hookConfig: SwaggerGenerator = sails.config[context.configKey!];

  if (hookConfig.disabled) {
    return;
  }

  let blueprintActionTemplates = cloneDeep(bluePrintTemplates);
  if (hookConfig.updateBlueprintActionTemplates) {
    blueprintActionTemplates = hookConfig.updateBlueprintActionTemplates(blueprintActionTemplates);
  }

  const specifications = cloneDeep(hookConfig.swagger);

  const defaults = hookConfig.defaults || defaultsResponses;

  const models = await parseModels(sails, sails.config, Object.keys(sails.models).map(key => sails.models[key]) as Array<SwaggerSailsModel>);

  const customRoutes = parseCustomRoutes(sails.config);
  let allRoutes = parseBindRoutes(sailsRoutes, models, sails);

  // remove globally excluded routes
  allRoutes = allRoutes.filter(route => route.path !== '/__getcookie')

  let routes = mergeCustomAndBindRoutes(customRoutes, allRoutes, models);

  if (hookConfig.includeRoute) {
    routes = routes.filter(route => hookConfig.includeRoute!(route));
  }

  if (!specifications.tags) specifications.tags = [];
  if (!specifications.components) specifications.components = {};

  const withoutSwaggerRoutes = routes.filter(route => !route.swagger)
  const uniqueControllers = uniqBy(withoutSwaggerRoutes, 'controller')
    .map(route => route.controller)
    .filter((controller): controller is string => !!controller);
    
  const controllers = await parseControllers(sails, uniqueControllers)
  const action2Paths = getAction2Paths(withoutSwaggerRoutes, controllers)
  const action2s = await parseControllers(sails, action2Paths)

  routes = loadRoutesSwaggerJsDoc(routes, controllers, action2s);

  specifications.components.schemas = generateSchemas(models);

  /*

  specifications.paths = generators.generatePaths(routes, blueprintActionTemplates, defaults, specifications.tags, specifications.components);

  _.defaults(specifications.components.parameters, formatters.blueprintParameterTemplates);

  // clean up of specification, removing unreferenced tags
  const referencedTags = new Set();
  _.forEach(specifications.paths, (pathDef, path) => {
    _.forEach(pathDef, (def, httpMethod) => {
      if (def.tags) def.tags.map(tag => referencedTags.add(tag))
    });
  });
  specifications.tags = specifications.tags.filter(tag => referencedTags.has(tag.name));

  if (hookConfig.postProcess) hookConfig.postProcess(specifications);

  const destPath = sails.config[context.configKey].swaggerJsonPath;
  try {
    fs.writeFileSync(destPath, JSON.stringify(specifications, null, 2));
  } catch(e) {
    sails.log.error(`ERROR: sails-hook-swagger-generator: Error writing ${destPath}: ${e.message}`, e);
  }

  sails.log.info('Swagger generated successfully');

  return specifications;
*/
}
