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
        description: 'Incase we want to send header information along our request'
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
 * @param config this sails.config
 * @param tags model dictionary for checking if our identity is among our tag
 * @returns {{}}
 * @private
 */
function _generateRoutes(controllers, config, tags) {

    controllers = _.cloneDeep(controllers);//copy the value out without variable referencing
    //building all our routes from the custom since the custom over writes the default route
    var routes = parsers.routes(config.routes);

    _.forEach(controllers, function (controller, identity) {
        if (!routes[identity])
            routes[identity] = [];


        var blueprints = _.defaults(config.blueprints, {
            rest: true
        });

      var prefix = (blueprints.prefix && blueprints.prefix !== '' ? blueprints.prefix : '') + (blueprints.restPrefix && blueprints.restPrefix !== '' ? blueprints.restPrefix : '');
      if (prefix !== '') prefix += '/';
        if (blueprints.rest === true) { //if rest is true add this to default routes and actions
            ///let's extend our controllers for default blue print actions now iff that controller has a model
            if (_.find(tags, {identity: identity})) {
                controller = _.merge(controller, {
                    findOne: {
                        http_method: 'get',
                        path:  prefix + identity + '/{id}',
                        summary: 'Get {identity}',
                        description: 'This is use to get a single {identity} with the supplied id'
                    },
                    find: {
                        http_method: 'get',
                        path: prefix + identity,
                        summary: 'List {identity}',
                        description: 'This is use to retrieve List of {identity}'
                    },
                    create: {
                        http_method: 'post',
                        path: prefix + identity,
                        summary: 'Create {identity}',
                        description: 'This is use to create new {identity}'
                    },
                    update: {
                        http_method: 'put',
                        path: prefix + identity + '/{id}',
                        summary: 'Update {identity}',
                        description: 'This is for updating our {identity} based on the id'
                    },
                    destroy: {
                        http_method: 'delete',
                        path: prefix + identity + '/{id}',
                        summary: 'Delete {identity}',
                        description: 'This is for deleting specified {identity} with id'
                    }
                });
            }
        }

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

            if (!tag) {
                //   throw new Error("No tag for this identity-" + identity); --> some controller exist without model
                console.warn("No tag for this identity '" + identity + "'");
            }

            var parameter;

          if(!route.custom){ // if not from routes.js use the default custom blueprint maps
            parameter = formatter.blueprint_parameter(route.action, customBlueprintMaps);
          }

          // contains just ref string to our default/defined parameters
          var excludeParameters = route.excludeParameters || []

            if (!parameter) //which means is not in our parameters, then use the keys to get and add token for us incase of any route using header information
                parameter = _getPathParamsFromKeys(route.keys).concat({$ref: '#/parameters/TokenHeaderParam'});

            var path = {
                summary: route.summary ? route.summary.replace("{identity}", _.capitalize(identity)) : '',
                description: route.description ? route.description.replace("{identity}", _.capitalize(identity)) : '',
                tags: tag ? [tag.name] : [identity],
                produces: ['application/json'],
                consumes: ['application/json'],
                parameters: parameter.concat(_getQueryParamsFromParameters(route.parameters))
                                     .concat(_getQueryParamsFromRouteQuery(route.query))
                                     .concat(_getBodyParamsFromRouteBody(route.body))
                                     .filter(_isNotExcludedParameters(excludeParameters)),
                responses: {
                    '200': {description: 'The requested resource'},
                    '404': {description: 'Resource not found'},
                    '500': {description: 'Internal server error'}
                }
            };

            //for our route that alters db we need json form body
            if (route.action === "create" || route.action === "update") {
              // check if it contains body already if so no need of adding this, swagger does not allow multiple body
              if(!_.find(path.parameters, {name: 'body'})){
                path.parameters.push({
                    "name": "body",
                    "in": "body",
                    "required": true,
                    "description": "An object defining our schema for " + _.capitalize(identity),
                    "schema": {"$ref": "#/definitions/" + identity}
                });
              }
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
 * and also keys with path like so /:key/path --> https://github.com/theo4u/sails-hook-swagger-generator/issues/24
 *
 * @param keys
 * @returns {string}
 * @private
 */
function _processRouteKeys(keys) {

    var map = _.map(keys, function (key) {
      // handle keys of such nature specified here: theo4u/sails-hook-swagger-generator#24
      const keyWithPath = key.split('/');
      var path = "";
      if(keyWithPath[1]){
        path = "/"+ keyWithPath[1]
      }
      return "{" + keyWithPath[0] + "}"+path;
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
      const mainKey = key.split('/')[0]; // for keys coming as key/extra_path related to theo4u/sails-hook-swagger-generator#24
        params.push({
            in: 'path',
            name: mainKey,
            required: true,
            type: 'string',
            description: 'This is a path param for ' + mainKey
        });
    });

    return params;
}

/**
 * this is used to create param for custom controllers
 * @param parameters
 * @returns {Array}
 * @private
 */
function _getQueryParamsFromParameters(parameters) {
    var params = [];

    _.forEach(parameters, function (parameter) {
        params.push({
            in: parameter.in || 'parameters',
            name: parameter.name,
            required: parameter.required || false,
            type: parameter.type || 'string',
            description: parameter.description || 'This is a custom param for ' + parameter.name
        });
    });

    return params;
}

/**
 * this is used to create param or custom queries for our request or route path
 * @param queries
 * @returns {Array}
 * @private
 */
function _getQueryParamsFromRouteQuery(queries) {
    var params = [];

    _.forEach(queries, function (query) {
        params.push({
            in: 'query',
            name: query,
            required: false,
            type: 'string',
            description: 'This is a query param for ' + query
        });
    });

    return params;
}

/**
 * this is used to create body type of parameter for any request that requires post or put of information
 * @param body
 * @returns {Array}
 * @private
 */
function _getBodyParamsFromRouteBody(body) {
    var param = [];

    if (!_.isEmpty(body)) {
        param.push({
            "name": "body",
            "in": "body",
            "required": true,
            "description": "An object defining our schema for this request",
            "schema": parsers.attributes(body)
        });
    }

    return param;
}

// check if the parameters should be excluded or not
function _isNotExcludedParameters (toBeExcluded) {
  return function (parameter) {
    const ref = parameter['$ref']
    return !(ref && _.includes(toBeExcluded, ref))
  }
}


module.exports = {
    tags: _generateModels,
    definitions: _generateDefinitions,
    parameters: _generateParameters,
    routes: _generateRoutes,
    paths: _generatePaths
};
