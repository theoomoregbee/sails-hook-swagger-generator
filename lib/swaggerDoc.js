'use strict';
var _ = require('lodash');
var generators = require('./generators');
var fs = require('fs');

module.exports = function (sails, context) {


    var specifications = sails.config[context.configKey].swagger;
    specifications.tags = generators.tags(sails.models);
    specifications.definitions = generators.definitions(sails.models);
    specifications.parameters = generators.parameters(sails.config, context);


    var generatedRoutes = generators.routes(sails.controllers, sails.config.routes);
    specifications.paths = generators.paths(generatedRoutes, specifications.tags, sails.config[context.configKey].blueprint_parameters);


    /**
     * clean up of specification
     * removing unwanted params
     */
    specifications.tags = _.map(specifications.tags, function (tag) {
        delete tag.identity;
        return tag;
    });


    fs.writeFile(sails.config.appPath + "/swagger/swagger.json", JSON.stringify(specifications), function (err) {
        if (err) {
            return console.log(err);
        }

        console.log("Swagger generated successfully");
    });

    return specifications;

};