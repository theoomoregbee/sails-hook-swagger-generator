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


module.exports = {
    attributes: _parseAttributes
};