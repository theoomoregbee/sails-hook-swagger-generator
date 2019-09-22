/**
 * Created by theophy on 02/08/2017.
 *
 * this is used to generate our tags and paths from our sails
 */

const _ = require('lodash');
const formatters = require('./type-formatter');

/**
 * Generate Swagger schema content describing the specified Sails attribute.
 *
 * @see https://swagger.io/docs/specification/data-models/
 *
 * @param {any} attributeInfo Sails model attribute specification as per `Model.js` file
 */
function generateAttributeSchema(attributeInfo) {

  let ai = attributeInfo || {}, sts = formatters.swaggerTypes;

  let type = attributeInfo.type || 'string';
  let columnType = _.get(attributeInfo, ['autoMigrations', 'columnType']);
  let autoIncrement = _.get(attributeInfo, ['autoMigrations', 'autoIncrement']);

  let schema = {};

  if (ai.model) {

    _.assign(schema, {
      description: `JSON dictionary representing the **${ai.model}** instance or FK when creating / updating / not populated`,
      // '$ref': '#/components/schemas/' + ai.model,
      oneOf: [ // we use oneOf (rather than simple ref) so description rendered (!) (at least in redocly)
        { '$ref': '#/components/schemas/' + ai.model },
      ],
    });

  } else if (ai.collection) {

    _.assign(schema, {
      description: `Array of **${ai.collection}**'s or array of FK's when creating / updating / not populated`,
      type: 'array',
      items: { '$ref': '#/components/schemas/' + ai.collection },
    });

  } else if (type == 'number') {
    let t = autoIncrement ? sts.integer : sts.double;
    if (ai.isInteger) {
      t = sts.integer;
    } else if (columnType) {
      let ct = columnType;
      if (ct.match(/int/i)) t = sts.integer;
      else if (ct.match(/long/i)) t = sts.long;
      else if (ct.match(/float/i)) t = sts.float;
      else if (ct.match(/double/i)) t = sts.double;
      else if (ct.match(/decimal/i)) t = sts.double;
    }
    _.assign(schema, t);
  } else if (type == 'boolean') {
    _.assign(schema, sts.boolean);
  } else if (type == 'json') {
    _.assign(schema, sts.string);
  } else if (type == 'ref') {
    let t = sts.string;
    if (columnType) {
      let ct = columnType;
      if (ct.match(/timestamp/i)) t = sts.datetime;
      else if (ct.match(/datetime/i)) t = sts.datetime;
      else if (ct.match(/date/i)) t = sts.date;
    }
    _.assign(schema, t);
  } else { // includes =='string'
    _.assign(schema, sts.string);
  }

  let isIP = false;
  if (schema.type == 'string') {
    let v = ai.validations;
    if (v) {
      if (v.isEmail) schema.format = 'email';
      if (v.isIP) { isIP = true; schema.format = 'ipv4'; }
      if (v.isURL) schema.format = 'uri';
      if (v.isUUID) schema.format = 'uuid';
    }
  }

  let annotations = [];

  // annotate format with Sails autoCreatedAt/autoUpdatedAt
  if (schema.type == 'string' && schema.format == 'date-time') {
    if (ai.autoCreatedAt) annotations.push('autoCreatedAt');
    else if (ai.autoUpdatedAt) annotations.push('autoUpdatedAt');
  }

  // process Sails --> Swagger attribute mappings as per sailAttributePropertiesMap
  let am = formatters.sailAttributePropertiesMap;
  _.defaults(schema, _.mapKeys(_.pick(ai, _.keys(am)), (v, k) => am[k]));

  // process Sails --> Swagger attribute mappings as per validationsMap
  let vm = formatters.validationsMap;
  _.defaults(schema, _.mapKeys(_.pick(ai.validations, _.keys(vm)), (v, k) => vm[k]));

  // copy default into example if present
  if (schema.default && !schema.example) {
    schema.example = schema.default;
  }

  // process final autoMigrations: autoIncrement, unique
  if (autoIncrement) annotations.push('autoIncrement');
  if (_.get(attributeInfo, ['autoMigrations', 'unique'])) {
    schema.uniqueItems = true;
  }

  // represent Sails `isIP` as one of ipv4/ipv6
  if (schema.type == 'string' && isIP) {
    schema = {
      description: 'ipv4 or ipv6 address',
      oneOf: [
        _.cloneDeep(schema),
        _.assign(_.cloneDeep(schema), { format: 'ipv6' }),
      ]
    }
  }

  if(annotations.length>0) {
    let s = `Note Sails special attributes: ${annotations.join(', ')}`;
    schema.description = schema.description ? `\n\n${s}` : s;
  }

  // note: required --> required[] (not here, needs to be done at model level)

  delete schema.common_name;

  return schema;
}

/**
 * Generate Swagger schema content describing specified Sails models.
 *
 * @see https://swagger.io/docs/specification/data-models/
 *
 * @param {any} models the parsed Sails models as per `parsers.parseModels()`.
 */
function generateSchemas(models) {

  let schemas = {};

  _.forEach(models, function (modelInfo) {

    let schema = {
      description: _.get(modelInfo, ['swagger', 'description']) || `Sails ORM Model **${modelInfo.globalId}**`,
      properties: {},
      required: [],
    };

    _.forEach(modelInfo.attributes, (attributeInfo, attributeName) => {
      schema.properties[attributeName] = generateAttributeSchema(attributeInfo);
      if (attributeInfo.required) schema.required.push(attributeName);
    });

    if (schema.required.length <= 0) delete schema.required;

    schemas[modelInfo.identity] = schema;

  });

  return schemas;

}

/**
 * Generate Swagger schema content describing specified Sails routes/actions.
 *
 * @see https://swagger.io/docs/specification/paths-and-operations/
 *
 * @param {any} routes the parsed Sails models as per `parsers.parseCustomRoutes()` / `parsers.parseAllRoutes()`
 * @param {any} blueprintActionTemplates blueprint action templates; see `formatters.blueprintActionTemplates`
 * @param {any[]} tags generated Swagger tags to be added to as applicable
 * @param {any} components generated Swagger components to be added to as applicable
 * @returns {object} Swagger paths object
 */
function generatePaths(routes, blueprintActionTemplates, defaults, tags, components) {

  let paths = {};

  // let defaultBlueprintTagsToAdd = {}; // for blueprint ORM models, keyed on globalId, values `true`

  if(!components.parameters) components.parameters = {};

  function addTags(toAdd) {
    toAdd.map(tag => {
      let existing = tags.find(t => t.name == tag.name);
      if (existing) _.defaults(existing, tag);
      else tags.push(tag);
    });
  }

  function mergeComponents(toMerge) {
    _.forEach(toMerge, (obj, compName) => {
      if (!components[compName]) components[compName] = {};
      _.defaults(components[compName], obj);
    });
  }

  _.forEach(routes, routeInfo => {

    let path = routeInfo.swaggerPath || routeInfo.path, pathEntry = {};

    if (routeInfo.middlewareType == 'blueprint') {

      let template = blueprintActionTemplates[routeInfo.blueprintAction] || {};

      let subst = s => s ? s.replace('{globalId}', routeInfo.modelInfo.globalId) : '';

      // handle special case of PK parameter
      let parameters = [...(template.parameters || [])]
        .map(p => {
          if (p === 'primaryKeyPathParameter') {
            let primaryKey = routeInfo.modelInfo.primaryKey;
            let attributeInfo = routeInfo.modelInfo.attributes[primaryKey];
            let pname = 'ModelPKParam-' + routeInfo.identity;
            if (!components.parameters[pname]) components.parameters[pname] = {
              in: 'path',
              name: primaryKey,
              required: true,
              schema: generateAttributeSchema(attributeInfo),
              description: subst('The desired **{globalId}** record\'s primary key value'),
            };
            return { $ref: '#/components/parameters/' + pname };
          }
          return p;
        });

      _.defaults(
        pathEntry,
        _.omitBy((routeInfo.swagger || {}), (v, k) => k.startsWith('_')),
        {
          summary: subst(template.summary),
          description: subst(template.description),
          externalDocs: template.externalDocs || undefined,
          tags: routeInfo.tags,
          parameters: parameters,
          responses: _.cloneDeep(template.responses || defaults.responses || {}),
        }
      );

      function isParam(_in, _name) {
        return !!pathEntry.parameters.find(p => p.in == _in && p.name == _name);
      }

      let modifiers = {

        addPopulateQueryParam: () => {
          if (isParam('query', 'populate') || routeInfo.associations.length == 0) return;
          pathEntry.parameters.push({
            in: 'query',
            name: 'populate',
            required: false,
            schema: {
              type: 'string',
              example: ['false', ...(routeInfo.associations.map(row => row.alias) || [])].join(','),
            },
            description: 'If specified, overide the default automatic population process.'
              + ' Accepts a comma-separated list of attribute names for which to populate record values,'
              + ' or specify `false` to have no attributes populated.',
          });

        },

        addSelectQueryParam: () => {
          if(isParam('query', 'select')) return;
          pathEntry.parameters.push({
            in: 'query',
            name: 'select',
            required: false,
            schema: {
              type: 'string',
              example: [..._.keys(routeInfo.modelInfo.attributes || {})].join(','),
            },
            description: 'The attributes to include in the result, specified as a comma-delimited list.'
              + ' By default, all attributes are selected.'
              + ' Not valid for plural (“collection”) association attributes.',
          });

        },

        addOmitQueryParam: () => {
          if(isParam('query', 'omit')) return;
          pathEntry.parameters.push({
            in: 'query',
            name: 'omit',
            required: false,
            schema: {
              type: 'string',
              example: [..._.keys(routeInfo.modelInfo.attributes || {})].join(','),
            },
            description: 'The attributes to exclude from the result, specified as a comma-delimited list.'
              + ' Cannot be used in conjuction with `select`.'
              + ' Not valid for plural (“collection”) association attributes.',
          });

        },

        addModelBodyParam: () => {
          if (pathEntry.requestBody) return;
          pathEntry.requestBody = {
            description: subst('JSON dictionary representing the {globalId} instance to create.'),
            required: true,
            content: {
              'application/json': {
                schema: { "$ref": "#/components/schemas/" + routeInfo.identity }
              },
            },
          };
        },

        addResultOfArrayOfModels: () => {
          _.assign(pathEntry.responses['200'], {
            description: subst(template.resultDescription),
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { '$ref': '#/components/schemas/' + routeInfo.identity },
                },
              },
            },
          });
        },

        addAssociationPathParam: () => {
          if(isParam('path', 'association')) return;
          pathEntry.parameters.splice(1, 0, {
            in: 'path',
            name: 'association',
            required: true,
            schema: {
              type: 'string',
              enum: routeInfo.aliases,
            },
            description: 'The name of the association',
          });
        },

        addAssociationFKPathParam: () => {
          if(isParam('path', 'fk')) return;
          pathEntry.parameters.push({
            in: 'path',
            name: 'fk',
            required: true,
            schema: {
              oneOf: routeInfo.associationsPrimaryKeyAttributeInfo.map(ai => generateAttributeSchema(ai)),
            },
            description: 'The desired target association record\'s foreign key value'
          });
        },

        addAssociationResultOfArray: () => {
          let models = routeInfo.aliases.map(a => {
            let assoc = routeInfo.associations.find(_assoc => _assoc.alias == a);
            return assoc ? (assoc.collection || assoc.model) : a;
          });
          _.assign(pathEntry.responses['200'], {
            description: subst(template.resultDescription),
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  // items: { type: 'any' },
                  items: {
                    oneOf: models.map(model => {
                      return { '$ref': '#/components/schemas/' + model };
                    }),
                  },
                },
              },
            },
          });
        },

        addResultOfModel: () => {
          _.assign(pathEntry.responses['200'], {
            description: subst(template.resultDescription),
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/' + routeInfo.identity },
              },
            },
          });
        },

        addResultNotFound: () => {
          _.assign(pathEntry.responses['404'], {
            description: subst(template.notFoundDescription || 'Not found'),
          });
        },

        addResultValidationError: () => {
          _.assign(pathEntry.responses['400'], {
            description: subst('Validation errors; details in JSON response'),
          });
        },

        addFksBodyParam: () => {
          if (pathEntry.requestBody) return;
          pathEntry.requestBody = {
            description: 'The primary key values (usually IDs) of the child records to use as the new members of this collection',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    oneOf: routeInfo.associationsPrimaryKeyAttributeInfo.map(ai => generateAttributeSchema(ai)),
                  },
                },
              },
            },
          };
        },

      };

      // apply changes for blueprint action
      (template.modifiers || []).map(m => {
        if (_.isFunction(m)) m(template, routeInfo, pathEntry, tags, components); // custom modifier
        else modifiers[m](); // standard modifier
      });

      _.assign(pathEntry.responses['500'], {
        description: 'Internal server error',
      });

    } else if (routeInfo.middlewareType == 'action') {

      // initial defaults as actions2 may populate parameters and responses (more below)
      _.defaults(
        pathEntry,
        _.omitBy((routeInfo.swagger || {}), (v, k) => k.startsWith('_')),
        {
          parameters: [],
          responses: _.cloneDeep(defaults.responses || {}),
        }
      );

      if (routeInfo.actions2) {
        let a2 = routeInfo.actions2;
        let pv = routeInfo.patternVariables || [];

        if (a2.inputs) {
          _.forEach(a2.inputs, (v, k) => {
            let _in = pv.indexOf(k) >= 0 ? 'path' : 'query';
            let existing = pathEntry.parameters.find(p => p.in == _in && p.name == k);
            if (existing) return;
            pathEntry.parameters.push({
              in: _in,
              name: k,
              required: v.required || false,
              schema: generateAttributeSchema(_.omit(v, 'description')),
              description: v.description || undefined,
            });
          });
        }

        if (a2.exits) {
          let exitResponses = {};

          // actions2 may specify more than one 'exit' per 'statusCode' --> use oneOf
          _.forEach(a2.exits, (exit, exitName) => {
            let a2r = formatters.actions2Responses;
            let { statusCode, description } = a2r[exitName] || a2r.success;
            statusCode = exit.statusCode || statusCode;
            description = exit.description || description;

            if (exitResponses[statusCode]) {
              let arr = _.get(pathEntry, ['responses', statusCode, 'content', 'application/json', 'schema', 'oneOf']);
              arr.push({ type: 'json', description: description });
            } else {
              exitResponses[statusCode] = {
                description: description,
                content: {
                  'application/json': {
                    schema: { oneOf: [{ type: 'object', description: description },], },
                  },
                },
              };
            }
          });

          // remove oneOf for single entries, otherwise summarise
          _.forEach(exitResponses, (resp, sc) => {
            let arr = _.get(resp, ['content', 'application/json', 'schema', 'oneOf']);
            if (arr.length == 1) {
              _.set(resp, ['content', 'application/json', 'schema'], arr[0]);
            } else {
              resp.description = `${arr.length} alternative responses`;
            }
          });

          _.defaults(pathEntry.responses, exitResponses);
          _.forEach(pathEntry.responses, (v,k) => { // ensure description
            if(!v.description) v.description = _.get(exitResponses, [k, 'description'], '-');
          });
        }

        // actions2 summary and description
        _.defaults(
          pathEntry,
          {
            summary: _.get(routeInfo, ['actions2', 'friendlyName']) || routeInfo.actionPath || '',
            description: _.get(routeInfo, ['actions2', 'description']) || undefined,
          }
        );
      }

      // final populate noting others above
      _.defaults(
        pathEntry,
        {
          summary: routeInfo.actionPath || '',
          tags: routeInfo.tags,
        }
      );

    } else {

      sails.log.warn(`WARNING: sails-hook-swagger-generator: Cannot generate path for ${routeInfo.path}`);

    }

    if (routeInfo.patternVariables) {

      // first resolve '$ref' parameters
      let resolved = pathEntry.parameters.map(p => {
        let ref = p['$ref'];
        if (!ref) return p;
        let _prefix = '#/components/parameters/';
        if (ref.startsWith(_prefix)) {
          ref = ref.substring(_prefix.length);
          let dereferenced = components.parameters[ref];
          return dereferenced ? dereferenced : p;
        }
      });

      // now add patternVariables that don't already exist
      routeInfo.patternVariables.map(v => {
        let existing = resolved.find(p => p.in == 'path' && p.name == v);
        if (existing) return;
        pathEntry.parameters.push({
          in: 'path',
          name: v,
          required: true,
          schema: { type: 'string' },
          description: `Route pattern variable \`${v}\``,
        });
      });

    }

    addTags(_.get(routeInfo.swagger, '_tags', []));
    mergeComponents(_.get(routeInfo.swagger, '_components'));

    _.set(paths, [path, routeInfo.httpMethod], pathEntry);

  });

  return paths;

}

module.exports = {
  generateSchemas: generateSchemas,
  generatePaths: generatePaths,
};
