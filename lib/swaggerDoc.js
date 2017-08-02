'use strict';
var _ = require('lodash');
var generators = require('./generators');

var specifications = {
    openapi: '',
    info: {
        title: '',
        description: '',
        termsOfService: 'http://example.com/terms',
        contact: {name: 'Theophilus Omoregbee', url: 'github.com/theo4u', email: 'theo4u@ymail.com'},
        license: {name: 'Apache 2.0', url: 'http://www.apache.org/licenses/LICENSE-2.0.html'},
        version: '1.0.0'
    },
    servers: [
        {url: 'http://localhost:1337/', description: 'Local server'},
        {url: 'http://plutus.glosskode.com', description: 'Development server'}
    ],
    externalDocs: {}
};

module.exports = function (sails) {
    console.log("Our sails models", sails.models);
    // console.log("Our sails controllers", sails.controllers);
    // console.log("Our sails policies", sails.config.policies);
    // console.log("Our sails services", sails.services);


    specifications.tags = generators.tags(sails.models);
    specifications.definitions = generators.definitions(sails.models);
    specifications.parameters = {};

    console.log("swagger json", specifications);
};