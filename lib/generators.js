/**
 * Created by theophy on 02/08/2017.
 *
 * this is used to generate our tags from our sails
 */

var _ = require("lodash");
var parsers = require("./parsers");
var formatter = require("./type-formatter");

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
            tags.push({name: model.globalId, identity: model.identity});
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
function _generateDefinitions(models) {
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
        name: 'populate',
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

    params.IDPathParam = {
        in: 'path',
        name: 'id',
        required: true,
        type: 'string',
        description: 'This is to identify a particular object out'
    };


    //now we extend our config.swaggerDoc.parameters
    return _.merge(params, config[context.configKey].parameters);
}

/**
 * this uses the controllers from our sails application and the routes defined in our config/routes
 * to get out all the necessary routes with their properties defined in @link parsers.routes
 * @param controllers
 * @param custom_routes
 * @returns {{}}
 * @private
 */
function _generateRoutes(controllers, custom_routes) {

    //building all our routes from the custom since the custom over writes the default route
    var routes = parsers.routes(custom_routes);

    _.forEach(controllers, function (controller, identity) {
        if (!routes[identity])
            routes[identity] = [];

        ///let's extend our controllers for default blue print actions now
        controller = _.defaults(controller, {
            findOne: {
                http_method: 'get',
                path: identity + '/{id}',
                summary: 'Get {identity}',
                description: 'This is use to get a single {identity} with the supplied id'
            },
            find: {
                http_method: 'get',
                path: identity,
                summary: 'List {identity}',
                description: 'This is use to retrieve List of {identity}'
            },
            create: {
                http_method: 'post',
                path: identity,
                summary: '',
                description: 'This is use to create new {identity}'
            },
            update: {
                http_method: 'put',
                path: identity + '/{id}',
                summary: 'Update {identity}',
                description: 'This is for updating our {identity} based on the id'
            },
            destroy: {
                http_method: 'delete',
                path: identity + '/{id}',
                summary: 'Delete {identity}',
                description: 'This is for deleting specified {identity} with id'
            }
        });

        //let's go through all the actions in the controller, excluding identity and globalId
        var exclude = ['identity', 'globalId', 'sails'];
        _.forEach(controller, function (value, action) {
            if (exclude.indexOf(action) > -1)
                return;

            //here we check if it's in our custom routes if so don't add, simply move to the next one
            if (_.findIndex(routes[identity], {'action': action}) < 0) {
                routes[identity].push({
                    http_method: value.http_method || 'get', //as my default
                    path: value.path || (identity + '/' + action),
                    action: action,
                    keys: [], //always empty since they are directly from the controller file and not specified unless default blue prints
                    summary: value.summary,
                    description: value.description
                });
            }

        });

    });

    return routes;
}

/**
 * this is used to generate our routes from the generated routes and tags with the custom blue print
 * @param generated_routes
 * @param tags
 * @param customBlueprintMaps
 * @returns {{}}
 * @private
 */
function _generatePaths(generated_routes, tags, customBlueprintMaps) {
    var paths = {};

    _.forEach(generated_routes, function (routes, identity) {
        _.forEach(routes, function (route) {


            var tag = _.find(tags, {identity: identity});

            if (!tag)
                throw new Error("No tag for this identity");


            var parameter = formatter.blueprint_parameter(route.action, customBlueprintMaps);
            if (!parameter) //which means is not in our parameters, then use the keys to get and add token for us incase of any route using header information
                parameter = _getPathParamsFromKeys(route.keys).concat({$ref: '#/parameters/TokenHeaderParam'});

            var path = {
                summary: route.summary ? route.summary.replace("{identity}", _.capitalize(identity)) : '',
                description: route.description ? route.description.replace("{identity}", _.capitalize(identity)) : '',
                tags: [tag.name],
                produces: ['application/json'],
                parameters: parameter,
                responses: {
                    '200': {description: 'The requested resource'},
                    '404': {description: 'Resource not found'},
                    '500': {description: 'Internal server error'}
                }
            };

            //for our route that alters db we need json form body
            if (route.action === "create" || route.action === "update") {
                path.consumes = ['application/json'];
                path.parameters.push({
                    "name": "body",
                    "in": "body",
                    "required": true,
                    "description": "An object defining our schema for " + _.capitalize(identity),
                    "schema": {"$ref": "#/definitions/" + identity}
                });
            }

            //standardize our link here
            var link = _standardiseLink(route.path + "/" + _processRouteKeys(route.keys));
            if (!paths[link]) //if it's undefined create it as empty object for us
                paths[link] = {};

            paths[link][route.http_method] = path;

        });
    });


    return paths;
}

/**
 * help to process route keys to swagger spec format
 * which is {key} instead of sails default /:key
 * @param keys
 * @returns {string}
 * @private
 */
function _processRouteKeys(keys) {

    var map = _.map(keys, function (key) {
        return "{" + key + "}";
    });

    return map.join("/");
}

/**
 * making our link string to look like this
 * user/route instead of /user/route/ which is not allowed by swagger spec
 * @param link
 * @returns {*}
 * @private
 */
function _standardiseLink(link) {

    //check if the first character is / if not add it
    if (!_.startsWith(link, '/'))
        link = "/" + link;

    if (_.endsWith(link, '/'))
        link = link.slice(0, -1); //remove the / by the end

    return link;
}

/**
 * this is used to generate path param from the route keys
 * @param keys
 * @returns {Array}
 * @private
 */
function _getPathParamsFromKeys(keys) {
    var params = [];

    _.forEach(keys, function (key) {
        params.push({
            in: 'path',
            name: key,
            required: true,
            type: 'string',
            description: 'This is a path param for ' + key
        });
    });

    return params;
}


module.exports = {
    tags: _generateModels,
    definitions: _generateDefinitions,
    parameters: _generateParameters,
    routes: _generateRoutes,
    paths: _generatePaths
};

