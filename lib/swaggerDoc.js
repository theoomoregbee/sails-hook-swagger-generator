'use strict';
var _ = require('lodash');

module.exports = function (sails) {
    console.log("Our sails models", sails.models);
    console.log("Our sails controllers", sails.controllers);
    console.log("Our sails policies", sails.config.policies);
    console.log("Our sails services", sails.services);
};