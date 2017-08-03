'use strict';
var _ = require('lodash');
var generators = require('./generators');


module.exports = function (sails, context) {


    var specifications = sails.config[context.configKey].swagger;
    specifications.tags = generators.tags(sails.models);
    specifications.definitions = generators.definitions(sails.models);
    specifications.parameters = generators.parameters(sails.config, context);

    /**
     * @todo below comments
     *
     */

    // console.log("swagger json", specifications);
    // console.log("sails controllers", sails.controllers);
    // console.log("sails controllers", sails.config.blueprints);
    console.log("sails routes", generators.routes(sails.controllers, sails.config.routes));
    //  console.log("sails paths", generators.paths(sails.controllers));
};