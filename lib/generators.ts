import { SwaggerSailsModel, NameKeyMap, SwaggerRouteInfo, BlueprintActionTemplates, Defaults, MiddlewareType, Action2Response } from './interfaces';
import { Reference, Tag } from 'swagger-schema-official';
import { swaggerTypes, sailsAttributePropertiesMap, validationsMap, actions2Responses } from './type-formatter';
import assign from 'lodash/assign';
import defaults from 'lodash/defaults';
import mapKeys from 'lodash/mapKeys';
import pick from 'lodash/pick';
import keys from 'lodash/keys';
import cloneDeep from 'lodash/cloneDeep';
import isFunction from 'lodash/isFunction';
import forEach from 'lodash/forEach';
import { OpenApi } from '../types/openapi';
import set from 'lodash/set';
import { map, omit, isEqual, reduce } from 'lodash';
import { attributeValidations } from './utils';


/**
 * Generate Swagger schema content describing the specified Sails attribute.
 * TODO: add test to this function
 *
 * @see https://swagger.io/docs/specification/data-models/
 * @param {Record<string, any>} attribute Sails model attribute specification as per `Model.js` file
 */
export const generateAttributeSchema = (attribute: Sails.AttributeDefinition): OpenApi.UpdatedSchema => {
  const ai = attribute || {}, sts = swaggerTypes;

  const type = ai.type || 'string';
  const columnType = ai.autoMigrations?.columnType;
  const autoIncrement = ai.autoMigrations?.autoIncrement;

  let schema: OpenApi.UpdatedSchema = {};

  const formatDesc = (extra: string): string => {
    const ret: string[] = [];
    if(ai.description) ret.push(ai.description);
    if(extra) ret.push(extra);
    return ret.join(' ');
  }

  if (ai.model) {
    assign(schema, {
      description: formatDesc(`JSON dictionary representing the **${ai.model}** instance or FK when creating / updating / not populated`),
      // '$ref': '#/components/schemas/' + ai.model,
      oneOf: [ // we use oneOf (rather than simple ref) so description rendered (!) (at least in redocly)
        { '$ref': '#/components/schemas/' + ai.model },
      ],
    });

  } else if (ai.collection) {
    assign(schema, {
      description: formatDesc(`Array of **${ai.collection}**'s or array of FK's when creating / updating / not populated`),
      type: 'array',
      items: { '$ref': '#/components/schemas/' + ai.collection },
    });

  } else if (type == 'number') {
    let t = autoIncrement ? sts.integer : sts.double;
    if (ai.validations?.isInteger) {
      t = sts.integer;
    } else if (columnType) {
      const ct = columnType;
      if (ct.match(/int/i)) t = sts.integer;
      else if (ct.match(/long/i)) t = sts.long;
      else if (ct.match(/float/i)) t = sts.float;
      else if (ct.match(/double/i)) t = sts.double;
      else if (ct.match(/decimal/i)) t = sts.double;
    }
    assign(schema, t);
  } else if (type == 'boolean') {
    assign(schema, sts.boolean);
  } else if (type == 'json') {
    assign(schema, sts.string);
  } else if (type == 'ref') {
    let t = sts.string;
    if (columnType) {
      const ct = columnType;
      if (ct.match(/timestamp/i)) t = sts.datetime;
      else if (ct.match(/datetime/i)) t = sts.datetime;
      else if (ct.match(/date/i)) t = sts.date;
    }
    assign(schema, t);
  } else { // includes =='string'
    assign(schema, sts.string);
  }

  let isIP = false;
  if (schema.type == 'string') {
    const v = ai.validations;
    if (v) {
      if (v.isEmail) schema.format = 'email';
      if (v.isIP) { isIP = true; schema.format = 'ipv4'; }
      if (v.isURL) schema.format = 'uri';
      if (v.isUUID) schema.format = 'uuid';
      if (v.regex) schema.pattern = v.regex.toString().slice(1, -1);
    }
  }

  const annotations = [];

  // annotate format with Sails autoCreatedAt/autoUpdatedAt
  if (schema.type == 'string' && schema.format == 'date-time') {
    if (ai.autoCreatedAt) annotations.push('autoCreatedAt');
    else if (ai.autoUpdatedAt) annotations.push('autoUpdatedAt');
  }

  // process Sails --> Swagger attribute mappings as per sailAttributePropertiesMap
  defaults(schema, mapKeys(pick(ai, keys(sailsAttributePropertiesMap)), (v, k: keyof Sails.AttributeDefinition) => sailsAttributePropertiesMap[k]));

  // process Sails --> Swagger attribute mappings as per validationsMap
  defaults(schema, mapKeys(pick(ai.validations, keys(validationsMap)), (v, k: keyof Sails.AttributeValidation) => validationsMap[k]));

  // copy default into example if present
  if (schema.default && !schema.example) {
    schema.example = schema.default;
  }

  // process final autoMigrations: autoIncrement, unique
  if (autoIncrement) {
    annotations.push('autoIncrement');
  }
  if (ai.autoMigrations?.unique) {
    schema.uniqueItems = true;
  }

  // represent Sails `isIP` as one of ipv4/ipv6
  if (schema.type == 'string' && isIP) {
    schema = {
      description: formatDesc('ipv4 or ipv6 address'),
      oneOf: [
        cloneDeep(schema),
        assign(cloneDeep(schema), { format: 'ipv6' }),
      ]
    }
  }

  if (annotations.length > 0) {
    const s = `Note Sails special attributes: ${annotations.join(', ')}`;
    schema.description = schema.description ? `${schema.description}\n\n${s}` : s;
  }

  if(schema.description) schema.description = schema.description.trim();

  // note: required --> required[] (not here, needs to be done at model level)

  // finally, overwrite in custom swagger
  if(ai.meta?.swagger) {
    assign(schema, omit(ai.meta.swagger, 'exclude'));
  }

  return schema;
}

/**
 * Generate the OpenAPI schemas for the foreign key values used to reference
 * ORM records for the associations of the specified Sails Model.
 *
 * @param model
 * @param models
 */
export const generateModelAssociationFKAttributeSchemas = (model: SwaggerSailsModel, models: NameKeyMap<SwaggerSailsModel>): OpenApi.UpdatedSchema[] => {

  if (!model.associations) { return []; }

  const ret = model.associations.map(association => {

    const targetModelIdentity = association.type === 'model' ? association.model : association.collection;
    const targetModel = models[targetModelIdentity!];

    if (!targetModel) {
      return {}; // data structure integrity issue should not occur
    }

    const targetFKAttribute = targetModel.attributes[targetModel.primaryKey];
    return generateAttributeSchema({
      ...targetFKAttribute,
      description: `**${model.globalId}** record's foreign key value (**${association.alias}** association${targetFKAttribute.description ? '; ' + targetFKAttribute.description : ''})`
    });

  });

  return ret;

}

/**
 * Generate Swagger schema content describing specified Sails models.
 *
 * @see https://swagger.io/docs/specification/data-models/
 *
 * @param models parsed Sails models as per `parsers.parseModels()`
 * @returns
 */
export const generateSchemas = (models: NameKeyMap<SwaggerSailsModel>): NameKeyMap<OpenApi.UpdatedSchema | Reference> => {
  return Object.keys(models)
    .reduce((schemas, identity) => {
      const model = models[identity]

      if(model.swagger?.modelSchema?.exclude === true) {
        return schemas;
      }

      const schema: OpenApi.UpdatedSchema = {
        description: model.swagger.modelSchema?.description || `Sails ORM Model **${model.globalId}**`,
        required: [],
        ...omit(model.swagger?.modelSchema || {}, 'exclude', 'description', 'tags'),
      }

      const attributes = model.attributes || {}
      schema.properties = Object.keys(attributes).reduce((props, attributeName) => {
        const attribute = model.attributes[attributeName];
        if(attribute.meta?.swagger?.exclude !== true) {
          props[attributeName] = generateAttributeSchema(attribute);
          if (attribute.required) schema.required!.push(attributeName);
        }
        return props
      }, {} as NameKeyMap<OpenApi.UpdatedSchema>)

      if (schema.required!.length <= 0) delete schema.required;

      schemas[model.identity] = schema;

      return schemas
    }, {} as NameKeyMap<OpenApi.UpdatedSchema | Reference>)
}

/**
 * Generate Swagger schema content describing specified Sails routes/actions.
 *
 * @see https://swagger.io/docs/specification/paths-and-operations/
 *
 * TODO: break down this function into smaller methods and add tests separately
 *
 * @param routes
 * @param templates
 * @param defaultsValues
 * @param models
 */
export const generatePaths = (routes: SwaggerRouteInfo[], templates: BlueprintActionTemplates,
  defaultsValues: Defaults, specification: Omit<OpenApi.OpenApi, 'paths'>,
  models: NameKeyMap<SwaggerSailsModel>): OpenApi.Paths => {

  const paths = {};
  const tags = specification.tags!;
  const components = specification.components!;

  if (!components.parameters) {
    components.parameters = {}
  }

  forEach(routes, route => {

    if(route.swagger?.exclude === true) {
      return;
    }

    let pathEntry: OpenApi.Operation;

    if (route.middlewareType === MiddlewareType.BLUEPRINT && route.model) {

      if(route.model.swagger?.modelSchema?.exclude === true) {
        return;
      }

      const template = templates[route.action as keyof BlueprintActionTemplates] || {};

      const subst = (str: string) => str ? str.replace('{globalId}', route.model!.globalId) : '';

      // handle special case of PK parameter
      const parameters = [...(template.parameters || [])]
        .map(parameter => {
          if (parameter === 'primaryKeyPathParameter') {
            const primaryKey = route.model!.primaryKey;
            const attributeInfo = route.model!.attributes[primaryKey];
            const pname = 'ModelPKParam-' + route.model!.identity;
            if (components.parameters && !components.parameters[pname]) {
              components.parameters[pname] = {
                in: 'path',
                name: primaryKey,
                required: true,
                schema: generateAttributeSchema(attributeInfo),
                description: subst('The desired **{globalId}** record\'s primary key value'),
              };
            }
            return { $ref: '#/components/parameters/' + pname };
          }
          return parameter;
        }) as Array<OpenApi.Parameter>;

      pathEntry = {
        summary: subst(template.summary),
        description: subst(template.description),
        externalDocs: template.externalDocs || undefined,
        tags: route.swagger?.tags || route.model.swagger.modelSchema?.tags || route.model.swagger.actions?.allactions?.tags || [route.model.globalId],
        parameters,
        responses: cloneDeep(defaultsValues.responses || {}),
        ...omit(route.model.swagger.actions?.allactions || {}, 'exclude'),
        ...omit(route.swagger || {}, 'exclude')
      };

      const isParam = (inType: string, name: string): boolean => !!pathEntry.parameters.find(parameter => 'in' in parameter && parameter.in == inType && parameter.name == name);

      const modifiers = {

        addPopulateQueryParam: () => {
          const assoc = route.model?.associations || [];
          if (isParam('query', 'populate') || assoc.length == 0) return;
          pathEntry.parameters.push({
            in: 'query',
            name: 'populate',
            required: false,
            schema: {
              type: 'string',
              example: ['false', ...(assoc.map(row => row.alias) || [])].join(','),
            },
            description: 'If specified, overide the default automatic population process.'
              + ' Accepts a comma-separated list of attribute names for which to populate record values,'
              + ' or specify `false` to have no attributes populated.',
          });

        },

        addSelectQueryParam: () => {
          if (isParam('query', 'select')) return;
          const attributes = route.model!.attributes || {};
          const csv = reduce(attributes, (acc, a, n) => ((a.meta?.swagger?.exclude === true) ? acc : [...acc, n]), [] as string[]);
          pathEntry.parameters.push({
            in: 'query',
            name: 'select',
            required: false,
            schema: {
              type: 'string',
              example: csv.join(','),
            },
            description: 'The attributes to include in the result, specified as a comma-delimited list.'
              + ' By default, all attributes are selected.'
              + ' Not valid for plural (“collection”) association attributes.',
          });

        },

        addOmitQueryParam: () => {
          if (isParam('query', 'omit')) return;
          const attributes = route.model!.attributes || {};
          const csv = reduce(attributes, (acc, a, n) => ((a.meta?.swagger?.exclude === true) ? acc : [...acc, n]), [] as string[]);
          pathEntry.parameters.push({
            in: 'query',
            name: 'omit',
            required: false,
            schema: {
              type: 'string',
              example: csv.join(','),
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
                schema: { "$ref": "#/components/schemas/" + route.model!.identity }
              },
            },
          };
        },

        addResultOfArrayOfModels: () => {
          assign(pathEntry.responses['200'], {
            description: subst(template.resultDescription),
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { '$ref': '#/components/schemas/' + route.model!.identity },
                },
              },
            },
          });
        },

        addAssociationPathParam: () => {
          if (isParam('path', 'association')) return;
          pathEntry.parameters.splice(1, 0, {
            in: 'path',
            name: 'association',
            required: true,
            schema: {
              type: 'string',
              enum: route.associationAliases,
            },
            description: 'The name of the association',
          });
        },

        addAssociationFKPathParam: () => {
          if (isParam('path', 'fk')) return; // pre-defined/pre-configured --> skip
          pathEntry.parameters.push({
            in: 'path',
            name: 'fk',
            required: true,
            schema: {
              oneOf: generateModelAssociationFKAttributeSchemas(route.model!, models),
            } as OpenApi.UpdatedSchema,
            description: 'The desired target association record\'s foreign key value'
          });
        },

        addAssociationResultOfArray: () => {
          const associations = route.model?.associations || [];
          const models = (route.associationAliases || []).map(a => {
            const assoc = associations.find(_assoc => _assoc.alias == a);
            return assoc ? (assoc.collection || assoc.model) : a;
          });
          assign(pathEntry.responses['200'], {
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
          assign(pathEntry.responses['200'], {
            description: subst(template.resultDescription),
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/' + route.model!.identity },
              },
            },
          });
        },

        addResultNotFound: () => {
          assign(pathEntry.responses['404'], {
            description: subst(template.notFoundDescription || 'Not found'),
          });
        },

        addResultValidationError: () => {
          assign(pathEntry.responses['400'], {
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
                    oneOf: generateModelAssociationFKAttributeSchemas(route.model!, models),
                  }
                } as OpenApi.UpdatedSchema,
              },
            },
          };
        },

        addShortCutBlueprintRouteNote: () => {
          if(route.actionType !== 'shortcutBlueprint') { return; }
          pathEntry.summary += ' *';
          pathEntry.description += `\n\n(\\*) Note that this is a`
            + ` [Sails blueprint shortcut route](https://sailsjs.com/documentation/concepts/blueprints/blueprint-routes#?shortcut-blueprint-routes)`
            + ` (recommended for **development-mode only**)`;
        },

      };

      // apply changes for blueprint action
      (template.modifiers || []).map(modifier => {
        if (isFunction(modifier)) modifier(template, route, pathEntry, tags, components); // custom modifier
        else modifiers[modifier](); // standard modifier
      });

      defaults(pathEntry.responses, {
        '500': {
          description: 'Internal server error',
        }
      });

    } else { // otherwise action

      pathEntry = {
        parameters: [],
        responses: cloneDeep(defaultsValues.responses || {}),
        ...omit(route.swagger || {}, 'exclude')
      }

      if (route.actionType === 'actions2') {

        const patternVariables = route.variables || [];
        if (route.actions2Machine?.inputs) {
          forEach(route.actions2Machine.inputs, (value, key) => {
            if(value.meta?.swagger?.exclude === true) {
              return;
            }
            const _in = patternVariables.indexOf(key) >= 0 ? 'path' : 'query';
            const isExisting = pathEntry.parameters.find(p => 'in' in p && p.in === _in && p.name === key)
            if (isExisting) {
              return
            }
            const { description, ..._attribute } = value;
            const attribute = {
              ...omit(_attribute, attributeValidations),
              validations: pick(_attribute, attributeValidations),

            } as Sails.AttributeDefinition;
            pathEntry.parameters.push({
              in: _in,
              name: key,
              required: value.required || false,
              schema: generateAttributeSchema(attribute),
              description
            })
          })
        }

        if (route.actions2Machine?.exits) {
          const exitResponses: NameKeyMap<OpenApi.Response> = {};

          // actions2 may specify more than one 'exit' per 'statusCode' --> use oneOf (and attempt to merge)
          forEach(route.actions2Machine.exits, (exit, exitName) => {

            if(exit.meta?.swagger?.exclude === true) {
              return;
            }

            let { statusCode, description } = actions2Responses[exitName as keyof Action2Response] || actions2Responses.success;
            statusCode = exit.statusCode || statusCode;
            description = exit.description || description;

            // XXX TODO review support for responseType, viewTemplatePath, outputExample
            // XXX TODO use deriveJsonSwaggerTypeFromExample() for 'content' otherwise don't use

            if (exitResponses[statusCode]) {

              // this statusCode already exists --> will contain 'oneOf' so add
              const arr = (exitResponses[statusCode].content!['application/json'].schema as OpenApi.UpdatedSchema)!.oneOf;
              arr!.push({ type: 'object', description: description });

            } else if(pathEntry.responses[statusCode]) {

              // if not exists, check for response defined in source swagger and merge/massage to suit 'application/json' oneOf
              const r = cloneDeep(pathEntry.responses[statusCode]);
              if(!r.content) r.content = {};
              if(!r.content['application/json']) r.content['application/json'] = {};
              if(r.content['application/json'].schema) {
                if (!(r.content['application/json'].schema as OpenApi.UpdatedSchema).oneOf) {
                  const s = r.content['application/json'].schema;
                  r.content['application/json'].schema = { oneOf: [s] };
                }
              } else {
                r.content['application/json'].schema = { oneOf: [] };
              }

              // now add this exit to the merged/massaged response
              const arr = (r.content!['application/json'].schema as OpenApi.UpdatedSchema)!.oneOf;
              arr!.push({ type: 'object', description: description });
              exitResponses[statusCode] = r;

            } else {

              // dne, so add
              exitResponses[statusCode] = {
                description: description,
                content: {
                  'application/json': {
                    schema: { oneOf: [{ type: 'object', description: description }] }
                  }
                }
              };

            }
          });

          // remove oneOf for single entries
          forEach(exitResponses, resp => {
            if ((resp.content?.['application/json'].schema as OpenApi.UpdatedSchema)?.oneOf) {
              const arr = (resp.content!['application/json'].schema as OpenApi.UpdatedSchema)!.oneOf;
              if (arr!.length === 1) {
                resp.content!['application/json'].schema = arr![0];
              }
            }
          });

          pathEntry.responses = {
            ...pathEntry.responses,
            ...exitResponses,
          }
          forEach(pathEntry.responses, (resp, statusCode) => { // ensure description
            if (!resp.description) resp.description =  exitResponses[statusCode]?.description || '-';
          });
        }

        // actions2 summary and description
        defaults(
          pathEntry,
          {
            summary: route.actions2Machine?.friendlyName || route.path || '',
            description: route.actions2Machine?.description || undefined,
            tags: route.swagger?.tags || [route.actions2Machine?.friendlyName || route.defaultTagName],
          }
        );

      } // of if(actions2)

      // final populate noting others above
      defaults(
        pathEntry,
        {
          summary: route.path || '',
          tags: route.swagger?.tags || [route.defaultTagName],
        }
      );

      // catch the case where defaultTagName not defined
      if(isEqual(pathEntry.tags, [undefined])) pathEntry.tags = [];

    }

    if (route.variables) {
      // first resolve '$ref' parameters
      const resolved = pathEntry.parameters.map(parameter => {
        let ref = '$ref' in parameter && parameter.$ref;
        if (!ref) return parameter;
        const _prefix = '#/components/parameters/';
        if (ref.startsWith(_prefix)) {
          ref = ref.substring(_prefix.length);
          const dereferenced = components.parameters![ref];
          return dereferenced ? dereferenced : parameter;
        }
      });

      // now add patternVariables that don't already exist
      route.variables.map(v => {
        const existing = resolved.find(p => p && 'in' in p && p.in == 'path' && p.name == v);
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

    set(paths, [route.path, route.verb], pathEntry);
  });

  return paths
}

export const generateDefaultModelTags = (models: NameKeyMap<SwaggerSailsModel>): Tag[] => {

  return map(models, model => {

    const defaultDescription = `Sails blueprint actions for the **${model.globalId}** model`;

    const tagDef: Tag = {
      name: model.globalId,
      description: model.swagger.modelSchema?.description || defaultDescription,
    };

    if(model.swagger.modelSchema?.externalDocs) {
      tagDef.externalDocs = { ...model.swagger.modelSchema.externalDocs };
    }

    return tagDef;

  });

}
