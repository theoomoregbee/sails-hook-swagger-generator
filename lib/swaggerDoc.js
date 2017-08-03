'use strict';
var _ = require('lodash');
var generators = require('./generators');


module.exports = function (sails, context) {
    // console.log("Our sails controllers", sails.controllers);
    // console.log("Our sails policies", sails.config.policies);
    // console.log("Our sails services", sails.services);


    var specifications = sails.config[context.configKey].swagger;
    specifications.tags = generators.tags(sails.models);
    specifications.definitions = generators.definitions(sails.models);
    specifications.parameters = generators.parameters(sails.config, context);

    console.log("swagger json", specifications);
};