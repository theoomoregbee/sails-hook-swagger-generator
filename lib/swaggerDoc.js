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
     * @todo save spec to file
     *
     */
    var spec2save = JSON.stringify(specifications);

    fs.writeFile(sails.config.appPath+"/json/swagger.json", spec2save, function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });

    // console.log("swagger json", specifications);
    // console.log("sails controllers", sails.controllers);
    // console.log("sails controllers", sails.config.blueprints);

};