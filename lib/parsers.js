/**
 * Created by theophy on 02/08/2017.
 */
var formatters = require('./type-formatter');
var _ = require('lodash');


/**
 * this is used to parse our attributes to give us the properties and required field and it's based
 * on swagger specifications, so we map each sails types to swagger types
 * and also validation rules are added for just the ones handles in our @link type-formatter.js
 * @param attributes
 * @returns {{properties: {}, required: Array}}
 * @private
 */
function _parseAttributes(attributes) {
    var properties = {};
    var required = [];
    _.forEach(attributes, function (attribute, name) {
        properties[name] = formatters.attribute_type(attribute.type);

        //filter out required fields here
        if (_.has(attribute, 'required') && attribute.required === true)
            required.push(name);

        //scan through validation types
        _.forEach(attribute, function (value, rule) {
            rule = formatters.validation_type(rule); //transform rule here
            if (rule) //if it is existing in our formatter add it else leave it
                properties[name][rule] = value;
        });

    });

    return {properties: properties, required: required};
}

/**
 * this is used to parse our routes from config/routes then break it down
 * to a form which is readable and transversing is easy
 * for all route under an {identity:[http_method,path,action]
 * @param routes
 * @returns {{}}
 * @private
 */
function _parseRoutes(routes) {
    var custom_routes = {};

    _.forEach(routes, function (controller_action, method_path) {
        if (method_path === "/csrfToken") //exclude this csrfToken route not needed
            return;

        var model_identity = controller_action.substring(0, controller_action.indexOf("Controller")).toLowerCase();
        method_path = method_path.split(/ (.+)/);//get only the first instance of our space splitting

        if (!custom_routes[model_identity])   //first time
            custom_routes[model_identity] = [];//declare as array

        custom_routes[model_identity].push({
            http_method: method_path[0].trim(),
            path: method_path[1].trim(),
            action: controller_action.substring(controller_action.indexOf(".") + 1) //remove the .
        });


    });


    return custom_routes;
}


module.exports = {
    attributes: _parseAttributes,
    routes: _parseRoutes
};