'use strict';
var _ = require('lodash');
var generators = require('./generators');
var fs = require('fs');

module.exports = function (sails, context) {
    if (sails.config[context.configKey].disabled === true) {
        return;
    }

    var specifications = sails.config[context.configKey].swagger;
    specifications.tags = generators.tags(sails.models);
    specifications.definitions = generators.definitions(sails.models);
    specifications.parameters = generators.parameters(sails.config, context);


    let actions = sails.getActions();
    let controllers = {};

    _.each(actions, (action,path) => {
      let [ identity, actionVerb ] = path.split('/');
      let isBlueprint = action._middlewareType.startsWith('BLUEPRINT: ');
      if(!isBlueprint) return;
      if(!controllers[identity]) controllers[identity] = {};
      controllers[identity][actionVerb] = {
        http_method: action.http_method || 'get', //as my default
        path: path, // action.path || (identity + '/' + action),
        action: actionVerb,
        keys: [], //always empty since they are directly from the controller file and not specified unless default blue prints
        summary: action.summary,
        description: action.description
      };
    });

    var generatedRoutes = generators.routes(controllers, sails.config, specifications.tags);
    specifications.paths = generators.paths(generatedRoutes, specifications.tags, sails.config[context.configKey].blueprint_parameters);


    /**
     * clean up of specification
     * removing unwanted params
     */
    specifications.tags = _.map(specifications.tags, function (tag) {
        delete tag.identity;
        return tag;
    });

    fs.writeFile(sails.config[context.configKey].swaggerJsonPath, JSON.stringify(specifications), function (err) {
        if (err) {
            return console.log(err);
        }

        console.log("Swagger generated successfully");
    });

    return specifications;

};