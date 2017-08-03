/**
 * Created by theophy on 02/08/2017.
 *
 * this is used to generate our tags from our sails
 */

var _ = require("lodash");
var parsers = require("./parsers");

/**
 * this is used to parse models to tags just the globalId is picked to gather our
 * tags
 * @param models
 * @returns {Array}
 * @private
 */
function _generateModels(models) {
    var tags = [];

    _.forEach(models, function (model) {

        // Do tagging for  all models. Ignoring associative tables
        if (model.globalId) {
            tags.push({name: model.globalId});
        }
    });

    return tags;
}

/**
 * this generates our definitions from our models and returns the equivalent swagger specification
 * @param models
 * @returns {{}}
 * @private
 */
function _generateDefintions(models) {
    var defintions = {};

    _.forEach(models, function (model) {
        // Do tagging for  all models. Ignoring associative tables
        if (model.globalId) {
            defintions[model.identity] = parsers.attributes(model.attributes);
        }
    });


    return defintions;
}

/**
 * this is used to generate our default parameters and extending the ones created in our
 * sails.config[configKey].parameters to the default
 * @param config
 * @param context
 * @private
 */
function _generateParameters(config, context) {
    var params = {};

    //default parameters-> where, limit, skip, sort, populate, select, page
    params.WhereQueryParam = {
        in: 'query',
        name: 'where',
        required: false,
        type: 'string',
        description: 'This follows the standard from http://sailsjs.com/documentation/reference/blueprint-api/find-where'
    };
    params.LimitQueryParam = {
        in: 'query',
        name: 'limit',
        required: false,
        type: 'integer',
        description: 'The maximum number of records to send back (useful for pagination). Defaults to ' + config.blueprints.defaultLimit
    };
    params.SkipQueryParam = {
        in: 'query',
        name: 'skip',
        required: false,
        type: 'integer',
        description: 'The number of records to skip (useful for pagination).'
    };
    params.SortQueryParam = {
        in: 'query',
        name: 'sort',
        required: false,
        type: 'string',
        description: 'The sort order. By default, returned records are sorted by primary key value in ascending order. e.g. ?sort=lastName%20ASC'
    };

    params.PopulateQueryParam = {
        in: 'query',
        name: 'sort',
        required: false,
        type: 'string',
        description: 'check for better understanding -> http://sailsjs.com/documentation/reference/blueprint-api/find-where'
    };

    params.PageQueryParam = {
        in: 'query',
        name: 'page',
        required: false,
        type: 'integer',
        description: 'This helps with pagination and when the limit is known'
    };
    params.SelectQueryParam = {
        in: 'query',
        name: 'select',
        required: false,
        type: 'string',
        description: 'This helps with what to return for the user and its "," delimited'
    };

    params.TokenHeaderParam = {
        in: 'header',
        name: 'token',
        required: false,
        type: 'string',
        description: 'Incase we want to send header inforamtion along our request'
    };


    //now we extend our config.swaggerDoc.parameters
    return _.merge(params, config[context.configKey].parameters);
}


module.exports = {
    tags: _generateModels,
    definitions: _generateDefintions,
    parameters: _generateParameters
};

