import * as fs from 'fs';
import { SwaggerGenerator, SwaggerSailsModel } from './interfaces';
import cloneDeep from 'lodash/cloneDeep';
import { blueprintActionTemplates as bluePrintTemplates, defaults as defaultsResponses } from './type-formatter';
import { parseModels } from './parsers';

const parsers = require('./parsers');
const generators = require('./generators');

export default  (sails: Sails.Sails, sailsRoutes: Array<Sails.Route>, context: Sails.Hook<SwaggerGenerator>): void => {

  const hookConfig: SwaggerGenerator = sails.config[context.configKey];

  if (hookConfig.disabled) {
    return;
  }

  let blueprintActionTemplates = cloneDeep(bluePrintTemplates);
  if (hookConfig.updateBlueprintActionTemplates) {
    blueprintActionTemplates = hookConfig.updateBlueprintActionTemplates(blueprintActionTemplates);
  }

  const specifications = cloneDeep(hookConfig.swagger);

  const defaults = hookConfig.defaults || defaultsResponses;

  const models = parseModels(sails.config, sails.models as Array<SwaggerSailsModel>);
  const customRoutes = parsers.parseCustomRoutes(sails.config);
  let allRoutes = parsers.parseAllRoutes(sailsRoutes, models, sails.config);

  // remove globally excluded routes
  allRoutes = allRoutes.filter(r => {
    if (r.path == '/__getcookie') return false;
    return true;
  });

  let routes = parsers.mergeCustomAndAllRoutes(customRoutes, allRoutes);

  if (hookConfig.includeRoute) {
    routes = routes.filter(r => hookConfig.includeRoute(r));
  }

  if (!specifications.tags) specifications.tags = [];
  if (!specifications.components) specifications.components = {};

  specifications.components.schemas = generators.generateSchemas(models);

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

}