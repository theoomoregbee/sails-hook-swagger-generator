/**
 * Created by theophy on 02/08/2017.
 *
 * this modules helps us to stick with swagger specifications for formatting types
 */
_ = require('lodash');

/**
 * this is used to map our sails types with the allowed type defintions based on swagger specification
 * @type {{integer: {common_name: string, type: string, format: string, comments: string}, long: {common_name: string, type: string, format: string, comments: string}, float: {common_name: string, type: string, format: string}, double: {common_name: string, type: string, format: string}, string: {common_name: string, type: string}, byte: {common_name: string, type: string, format: string, comments: string}, binary: {common_name: string, type: string, format: string, comments: string}, boolean: {common_name: string, type: string}, date: {common_name: string, type: string, format: string, comments: string}, datetime: {common_name: string, type: string, format: string, comments: string}, password: {common_name: string, type: string, format: string, comments: string}}}
 */
var swagger_types = {
    integer: {common_name: 'integer', type: 'integer', format: 'int32', comments: 'signed 32 bits'},
    long: {common_name: 'long', type: 'integer', format: 'int64', comments: 'signed 64 bits'},
    float: {common_name: 'float', type: 'number', format: 'float'},
    double: {common_name: 'double', type: 'number', format: 'double'},
    string: {common_name: 'string', type: 'string'},
    byte: {common_name: 'byte', type: 'string', format: 'byte', comments: 'base64 encoded characters'},
    binary: {common_name: 'binary', type: 'string', format: 'binary', comments: 'any sequence of octets'},
    boolean: {common_name: 'boolean', type: 'boolean'},
    date: {common_name: 'date', type: 'string', format: 'date', comments: 'As defined by full-date - RFC3339'},
    datetime: {
        common_name: 'dateTime',
        type: 'string',
        format: 'date-time',
        comments: 'As defined by date-time - RFC3339'
    },
    password: {common_name: 'password', type: 'string', format: 'password', comments: 'A hint to UIs to obscure input'}
};

/**
 * this is used to hold on to the different types of validation sails offers with the value as the swagger specification
 * @type {{max: string, min: string, maxLength: string, minLength: string, regex: string, required: string, enum: string}}
 */
var validationsMap = {
    max: 'maximum',
    min: 'minimum',
    maxLength: 'maxLength',
    minLength: 'minLength',
    regex: 'pattern',
    enum: 'enum'
};

/**
 * this is used to bind our blueprint actions with our type of parameters
 * and custom map of which action to watch for and the param to attach to it
 * @type {{findOne: [*], find: [*], create: [*], update: [*], destroy: [*]}}
 */
var blueprintActions_paramMap = {
    findOne: ['TokenHeaderParam', 'IDPathParam'],
    find: ['TokenHeaderParam', 'WhereQueryParam', 'LimitQueryParam', 'SkipQueryParam', 'SortQueryParam', 'PopulateQueryParam', 'SelectQueryParam', 'PageQueryParam'],
    create: ['TokenHeaderParam'],
    update: ['TokenHeaderParam', 'IDPathParam'],
    destroy: ['TokenHeaderParam', 'IDPathParam']
};

module.exports = {
    /**
     * this returns the swagger specification types based on the common name parsed
     * @param common_name
     * @returns {*|swagger_types.string|{common_name, type}}
     */
    attribute_type: function (common_name) {
        return swagger_types[common_name] || swagger_types.string;
    },

    /**
     * this returns the equivalent swagger specification for the passed sails validation rule
     * @param rule
     * @returns {*}
     */
    validation_type: function (rule) {
        return validationsMap[rule];
    },
    /**
     * this is used to return our params attached to each of our parameters created @link generators.parameters
     * @param action
     * @param customMaps this holds the custom maps created from our sails.config[configKey].blueprint_parameters
     * @returns {*}
     */
    blueprint_parameter: function (action, customMaps) {
        var map = _.defaults(customMaps, blueprintActions_paramMap); //override using the custom if it exist

        return map[action];
    }
};
