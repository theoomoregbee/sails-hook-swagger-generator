'use strict';

const _ = require('lodash');
const fs = require('fs');

const parsers = require('./parsers');
const generators = require('./generators');
const formatters = require("./type-formatter");

export default function (sails, sailsRoutes, context) {

  let hookConfig = sails.config[context.configKey];

  if (hookConfig.disabled === true) {
    return;
  }

  let blueprintActionTemplates = _.cloneDeep(formatters.blueprintActionTemplates);
  if (hookConfig.updateBlueprintActionTemplates) {
    hookConfig.updateBlueprintActionTemplates(blueprintActionTemplates);
  }

  let specifications = _.cloneDeep(hookConfig.swagger);

  let defaults = hookConfig.defaults || formatters.defaults;

  let models = parsers.parseModels(sails.config, sails.models);
  let customRoutes = parsers.parseCustomRoutes(sails.config);
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
  let referencedTags = new Set();
  _.forEach(specifications.paths, (pathDef, path) => {
    _.forEach(pathDef, (def, httpMethod) => {
      if (def.tags) def.tags.map(tag => referencedTags.add(tag))
    });
  });
  specifications.tags = specifications.tags.filter(tag => referencedTags.has(tag.name));

  if (hookConfig.postProcess) hookConfig.postProcess(specifications);

  let destPath = sails.config[context.configKey].swaggerJsonPath;
  try {
    fs.writeFileSync(destPath, JSON.stringify(specifications, null, 2));
  } catch(e) {
    sails.log.error(`ERROR: sails-hook-swagger-generator: Error writing ${destPath}: ${e.message}`, e);
  }

  sails.log.info('Swagger generated successfully');

  return specifications;

};
