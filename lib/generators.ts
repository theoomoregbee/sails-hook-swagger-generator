import { SwaggerSailsModel, NameKeyMap, SwaggerRouteInfo, BlueprintActionTemplates, Defaults, Action2Response } from './interfaces';
import { Reference, Tag } from 'swagger-schema-official';
import { swaggerTypes, sailsAttributePropertiesMap, validationsMap, actions2Responses, blueprintParameterTemplates } from './type-formatter';
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
import { map, omit, isEqual, reduce, uniq } from 'lodash';
import { attributeValidations, resolveRef, unrollSchema, deriveSwaggerTypeFromExample } from './utils';


/**
 * Generate Swagger schema content describing the specified Sails attribute.
 *
 * XXX TODO: add test to this function
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

  if (ai.meta?.swagger && 'type' in ai.meta.swagger) {
    // OpenAPI 3 stipulates NO type as 'any', allow this by 'type' present but null to achieve this
    if(ai.meta.swagger.type) schema.type = ai.meta.swagger.type;
  } else if (ai.model) {
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
    assign(schema, deriveSwaggerTypeFromExample(ai.example || ai.defaultsTo));
  } else if (type == 'ref') {
    let t: OpenApi.UpdatedSchema | undefined;
    if (columnType) {
      const ct = columnType;
      if (ct.match(/timestamp/i)) t = sts.datetime;
      else if (ct.match(/datetime/i)) t = sts.datetime;
      else if (ct.match(/date/i)) t = sts.date;
    }
    if(t === undefined) t = deriveSwaggerTypeFromExample(ai.example || ai.defaultsTo);
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
    // note: 'type' handled above
    assign(schema, omit(ai.meta.swagger, 'exclude', 'type', 'in'));
  }

  return schema;
}

/**
 * Generate the OpenAPI schemas for the foreign key values used to reference
 * ORM records for the associations of the specified Sails Model.
 *
 * Used for 'replace' REST blueprint.
 *
 * @param model
 * @param models
 */
export const generateModelAssociationFKAttributeSchemas = (model: SwaggerSailsModel,
  aliasesToInclude: string[] | undefined, models: NameKeyMap<SwaggerSailsModel>): OpenApi.UpdatedSchema[] => {

  if (!model.associations) { return []; }

  return model.associations.map(association => {

    if (!aliasesToInclude || aliasesToInclude.indexOf(association.alias) < 0) return;

    const targetModelIdentity = association.type === 'model' ? association.model : association.collection;
    const targetModel = models[targetModelIdentity!];

    if (!targetModel) {
      return; // data structure integrity issue should not occur
    }

    const description = association.type === 'model' ?
      `**${model.globalId}** record's foreign key value to use as the replacement for this attribute`
      : `**${model.globalId}** record's foreign key values to use as the replacement for this collection`;

    const targetFKAttribute = targetModel.attributes[targetModel.primaryKey];
    return generateAttributeSchema({
      ...targetFKAttribute,
      autoMigrations: {
        ...(targetFKAttribute.autoMigrations || {}),
        autoIncrement: false, // autoIncrement not relevant for FK parameter
      },
      description: `${description} (**${association.alias}** association${targetFKAttribute.description ? '; ' + targetFKAttribute.description : ''})`
    });

  })
  .filter(parameter => parameter) as OpenApi.UpdatedSchema[];

}

/**
 * Generate the OpenAPI parameters for the foreign key values used to reference
 * ORM records for the associations of the specified Sails Model.
 *
 * Used for 'replace' shortcut blueprint.
 *
 * @param model
 * @param aliasesToInclude
 * @param models
 */
export const generateModelAssociationFKAttributeParameters = (model: SwaggerSailsModel,
  aliasesToInclude: string[] | undefined, models: NameKeyMap<SwaggerSailsModel>): OpenApi.Parameter[] => {

  if (!model.associations) { return []; }

  return model.associations.map(association => {

    if (!aliasesToInclude || aliasesToInclude.indexOf(association.alias) < 0) return;

    const targetModelIdentity = association.type === 'model' ? association.model : association.collection;
    const targetModel = models[targetModelIdentity!];

    if (!targetModel) {
      return; // data structure integrity issue should not occur
    }

    const description = association.type === 'model' ?
      `**${model.globalId}** record's foreign key value to use as the replacement for this attribute`
      : `**${model.globalId}** record's foreign key values to use as the replacement for this collection`;

    const targetFKAttribute = targetModel.attributes[targetModel.primaryKey];
    const targetFKAttributeSchema = generateAttributeSchema({
      ...targetFKAttribute,
      autoMigrations: {
        ...(targetFKAttribute.autoMigrations || {}),
        autoIncrement: false, // autoIncrement not relevant for FK parameter
      },
      description: `${description} (**${association.alias}** association${targetFKAttribute.description ? '; ' + targetFKAttribute.description : ''})`
    });

    return {
      in: 'query' as OpenApi.ParameterLocation,
      name: association.alias,
      description: targetFKAttributeSchema.description,
      schema: {
        type: 'array',
        items: targetFKAttributeSchema,
      },
    } as OpenApi.Parameter;

  })
  .filter(parameter => parameter) as OpenApi.Parameter[];

}

export const generateSchemaAsQueryParameters = (schema: OpenApi.UpdatedSchema): OpenApi.Parameter[] => {

  const required = schema.required || [];

  return map(schema.properties || {}, (property, name) => {
    const parameter = {
      in: 'query' as OpenApi.ParameterLocation,
      name: name,
      schema: property,
    } as OpenApi.Parameter;
    if((property as OpenApi.UpdatedSchema).description) {
      parameter.description = (property as OpenApi.UpdatedSchema).description;
    }
    if(required.indexOf(name) >= 0) {
      parameter.required = true;
    }
    return parameter;
  });

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

      const schemaWithoutRequired: OpenApi.UpdatedSchema = {
        type: 'object',
        description: model.swagger.modelSchema?.description || `Sails ORM Model **${model.globalId}**`,
        properties: {},
        ...omit(model.swagger?.modelSchema || {}, 'exclude', 'description', 'required', 'tags'),
      }

      let required: string[] = [];

      const attributes = model.attributes || {}
      defaults(
        schemaWithoutRequired.properties,
        Object.keys(attributes).reduce((props, attributeName) => {
          const attribute = model.attributes[attributeName];
          if (attribute.meta?.swagger?.exclude !== true) {
            props[attributeName] = generateAttributeSchema(attribute);
            if (attribute.required) required!.push(attributeName);
          }
          return props
        }, {} as NameKeyMap<OpenApi.UpdatedSchema>)
      );

      const withoutRequiredName = `${model.identity}-without-required-constraint`;
      const schema: OpenApi.UpdatedSchema = {
        type: 'object',
        allOf: [
          { '$ref': `#/components/schemas/${withoutRequiredName}` },
        ],
      };

      if(model.swagger?.modelSchema?.required) {
        required = [ ...model.swagger.modelSchema.required ];
      }

      if(required.length > 0) {
        schema.allOf!.push({ required: required });
      }

      schemas[model.identity] = schema;
      schemas[withoutRequiredName] = schemaWithoutRequired;

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
  defaultsValues: Defaults, specification: OpenApi.OpenApi,
  models: NameKeyMap<SwaggerSailsModel>, sails: Sails.Sails): OpenApi.Paths => {

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

    /* overwrite: summary, description, externalDocs, operationId, tags, requestBody, servers, security
     * merge: parameters (by in+name), responses (by statusCode) */
    const pathEntry: OpenApi.Operation = {
      summary: undefined,
      description: undefined,
      externalDocs: undefined,
      operationId: undefined,
      tags: undefined,
      parameters: [],
      responses: {},
      ...cloneDeep(omit(route.swagger || {}, 'exclude')),
    };

    const resolveParameterRef = (p: OpenApi.Parameter | Reference): OpenApi.Parameter | Reference => {
      const specWithDefaultParametersToBeMerged = {
        components: { parameters: blueprintParameterTemplates }
      } as OpenApi.OpenApi;
      // resolve first with current spec, then try template params to be added later
      return (resolveRef(specification, p) || resolveRef(specWithDefaultParametersToBeMerged, p)) as OpenApi.Parameter | Reference;
    };
    const isParam = (inType: string, name: string): boolean => {
      return !!pathEntry.parameters
        .map(parameter => resolveParameterRef(parameter))
        .find(parameter => parameter && 'in' in parameter && parameter.in == inType && parameter.name == name);
    };
    const addParamIfDne = (p: OpenApi.Parameter | Reference) => {
      const resolved = resolveParameterRef(p);
      if (resolved && 'in' in resolved) {
        if (!isParam(resolved.in, resolved.name)) {
          pathEntry.parameters.push(p);
        }
      }
    };

    if (route.actionType === 'actions2') {

      // note: check before blueprint template as these may override template for specific action(s)

      const patternVariables = route.variables || [];
      if (route.actions2Machine?.inputs) {
        forEach(route.actions2Machine.inputs, (value, key) => {

          if(value.meta?.swagger?.exclude === true) {
            return;
          }

          let _in = value.meta?.swagger?.in;
          if(!_in) {
            _in = patternVariables.indexOf(key) >= 0 ? 'path' : 'query';
          }

          // compose attribute definition
          const { description, ..._attribute } = value;
          const attribute = {
            ...omit(_attribute, attributeValidations),
            validations: pick(_attribute, attributeValidations),
          } as Sails.AttributeDefinition;
          if(!attribute.type && 'example' in attribute) { // derive type if not specified (optional for actions2)
            defaults(attribute, deriveSwaggerTypeFromExample(attribute.example || attribute.defaultsTo));
          }

          if(_in === 'body') {

            if(!['put', 'post', 'patch'].includes(route.verb)) {
              sails.log.warn(`WARNING: sails-hook-swagger-generator: Route '${route.verb} ${route.path}' cannot contain 'requestBody'; ignoring input '${key} for generated Swagger`);
              return;
            }

            // add to request body if we can do so cleanly
            if(!pathEntry.requestBody) {
              pathEntry.requestBody = { content: {} };
            }
            if (!('content' in pathEntry.requestBody)) {
              return; // could be reference --> in which case do not override
            }

            const rbc = pathEntry.requestBody.content;
            if (!rbc['application/json']) { rbc['application/json'] = {}; }
            if (!rbc['application/json'].schema) { rbc['application/json'].schema = { type:'object', properties:{} }; }

            if ('type' in rbc['application/json'].schema
              && rbc['application/json'].schema.type === 'object'
              && rbc['application/json'].schema.properties) {
                // if not reference and of type 'object' --> consider adding new property (but don't overwrite)
                defaults(
                  rbc['application/json'].schema.properties,
                  { [key]: generateAttributeSchema(attribute) }
                );
            }

          } else {

            // otherwise, handle path|query|cookie|header parameters
            if (isParam(_in, key)) {
              return;
            }
            pathEntry.parameters.push({
              in: _in,
              name: key,
              required: value.required || false,
              schema: generateAttributeSchema(attribute),
              description
            });

          }

        });
      }

      if (route.actions2Machine?.exits) {
        const exitResponses: NameKeyMap<OpenApi.Response> = {};

        // status to determine whether 'content' can be removed in simple cases
        const defaultOnly: NameKeyMap<boolean> = {};

        // actions2 may specify more than one 'exit' per 'statusCode' --> use oneOf (and attempt to merge)
        forEach(route.actions2Machine.exits, (exit, exitName) => {

          if(exit.meta?.swagger?.exclude === true) {
            return;
          }

          let { statusCode, description } = actions2Responses[exitName as keyof Action2Response] || actions2Responses.success;
          const defaultDescription = description;
          statusCode = exit.statusCode || statusCode;
          description = exit.description || description;

          const schema: OpenApi.UpdatedSchema = {
            example: exit.outputExample,
            ...deriveSwaggerTypeFromExample(exit.outputExample || ''),
            description: description,
          };

          // XXX TODO review support for responseType, viewTemplatePath

          const addToContentJsonSchemaOneOfIfDne = (): void => {
            const r = exitResponses[statusCode];

            // add to response if can do so cleanly
            if (!r.content) r.content = {};
            if (!r.content['application/json']) r.content['application/json'] = {};
            if (!r.content['application/json'].schema) r.content['application/json'].schema = { oneOf: [] };

            // if schema with 'oneOf' exists, add new schema content
            const existingSchema = r.content?.['application/json']?.schema;
            if (existingSchema && 'oneOf' in existingSchema) {
              existingSchema.oneOf?.push(schema);
            } else {
              // skip --> custom schema overrides auto-generated
            }
          }

          if (exitResponses[statusCode]) {

            // this statusCode already exists --> add as alternative if 'oneOf' present (or can be cleanly added)
            addToContentJsonSchemaOneOfIfDne();
            defaultOnly[statusCode] = false;

          } else if(pathEntry.responses[statusCode]) {

            // if not exists, check for response defined in source swagger and merge/massage to suit 'application/json' oneOf
            exitResponses[statusCode] = cloneDeep(pathEntry.responses[statusCode]);
            addToContentJsonSchemaOneOfIfDne();
            defaultOnly[statusCode] = false;

          } else {

            // dne, so add
            exitResponses[statusCode] = {
              description: defaultDescription,
              content: { 'application/json': { schema: { oneOf: [schema] } }, }
            };
            defaultOnly[statusCode] = exit.outputExample === undefined;

          }
        });

        // remove oneOf for single entries and move description back to top-level
        forEach(exitResponses, (resp, statusCode) => {
          if ((resp.content?.['application/json'].schema as OpenApi.UpdatedSchema)?.oneOf) {
            const arr = (resp.content!['application/json'].schema as OpenApi.UpdatedSchema)!.oneOf;
            if (arr!.length === 1) {
              resp.content!['application/json'].schema = arr![0];
              if ('description' in arr![0]) resp.description = arr![0].description as string;
              if (defaultOnly[statusCode]) delete resp.content;
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

      // merge actions2 summary and description
      defaults(
        pathEntry,
        {
          summary: route.actions2Machine?.friendlyName || undefined,
          description: route.actions2Machine?.description || undefined,
        }
      );

    } // of if(actions2)

    // handle blueprint actions and related documentation (from model and blueprint template)
    if (route.model && route.blueprintAction) {

      if (route.model.swagger?.modelSchema?.exclude === true
        || route.model.swagger.actions?.[route.blueprintAction]?.exclude === true) {
        return;
      }

      const template = templates[route.blueprintAction as keyof BlueprintActionTemplates] || {};

      const subst = (str: string) => str ? str.replace('{globalId}', route.model!.globalId) : undefined;

      /* overwrite: summary, description, externalDocs, operationId, tags, requestBody, servers, security
       * merge: parameters (by in+name), responses (by statusCode) */
      defaults(
        pathEntry,
        {
          summary: subst(template.summary),
          description: subst(template.description),
          externalDocs: template.externalDocs || undefined,
          tags: route.model.swagger.modelSchema?.tags || route.model.swagger.actions?.allactions?.tags || [route.model.globalId],
          ...cloneDeep(omit({
            ...route.model.swagger.actions?.allactions || {},
            ...route.model.swagger.actions?.[route.blueprintAction] || {},
          }, 'exclude')),
        }
      );

      // merge parameters from model actions and template (in that order)
      (route.model.swagger.actions?.[route.blueprintAction]?.parameters || []).map(p => addParamIfDne(p));
      (route.model.swagger.actions?.allactions?.parameters || []).map(p => addParamIfDne(p));

      (template.parameters || []).map(parameter => {
        // handle special case of PK parameter
        if (parameter === 'primaryKeyPathParameter') {
          const primaryKey = route.model!.primaryKey;
          const attributeInfo = route.model!.attributes[primaryKey];
          const pname = 'ModelPKParam-' + route.model!.identity;
          if (components.parameters && !components.parameters[pname]) {
            components.parameters[pname] = {
              in: 'path',
              name: '_' + primaryKey, // note '_' as per transformSailsPathsToSwaggerPaths()
              required: true,
              schema: generateAttributeSchema(attributeInfo),
              description: subst('The desired **{globalId}** record\'s primary key value'),
            };
          }
          parameter = { $ref: '#/components/parameters/' + pname };
        }
        addParamIfDne(parameter);
      });

      // merge responses from model actions
      defaults(
        pathEntry.responses,
        (route.model.swagger.actions?.[route.blueprintAction]?.responses || {}),
        (route.model.swagger.actions?.allactions?.responses || {}),
      );

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
          if(route.isShortcutBlueprintRoute) {
            const schema = specification!.components!.schemas?.[route.model!.identity];
            if (schema) {
              const resolvedSchema = unrollSchema(specification, schema);
              if (resolvedSchema) {
                generateSchemaAsQueryParameters(resolvedSchema as OpenApi.UpdatedSchema).map(p => {
                  if (isParam('query', p.name)) return;
                  pathEntry.parameters.push(p);
                });
              }
            }
          } else {
            if (pathEntry.requestBody) return;
            pathEntry.requestBody = {
              description: subst('JSON dictionary representing the {globalId} instance to create.'), // XXX TODO Incorporate model description?
              required: true,
              content: {
                'application/json': {
                  schema: { '$ref': `#/components/schemas/${route.model!.identity}` }
                },
              },
            };
          }
        },

        addModelBodyParamUpdate: () => {
          if (route.isShortcutBlueprintRoute) {
            const schema = specification!.components!.schemas?.[route.model!.identity+'-without-required-constraint'];
            if (schema) {
              const resolvedSchema = resolveRef(specification, schema);
              if (resolvedSchema) {
                generateSchemaAsQueryParameters(resolvedSchema as OpenApi.UpdatedSchema).map(p => {
                  if (isParam('query', p.name)) return;
                  pathEntry.parameters.push(p);
                });
              }
            }
          } else {
            if (pathEntry.requestBody) return;
            pathEntry.requestBody = {
              description: subst('JSON dictionary representing the {globalId} instance to update.'), // XXX TODO Incorporate model description?
              required: true,
              content: {
                'application/json': {
                  schema: { '$ref': `#/components/schemas/${route.model!.identity}-without-required-constraint` }
                },
              },
            }
          }
        },

        addResultOfArrayOfModels: () => {
          defaults(pathEntry.responses, {
            '200': {
              description: subst(template.resultDescription || 'Array of **{globalId}** records'),
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { '$ref': '#/components/schemas/' + route.model!.identity },
                  },
                },
              },
            }
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
          if (isParam('path', 'childid')) return; // pre-defined/pre-configured --> skip
          pathEntry.parameters.push({
            in: 'path',
            name: 'childid',
            required: true,
            schema: {
              oneOf: generateModelAssociationFKAttributeSchemas(route.model!, route.associationAliases, models),
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
          defaults(pathEntry.responses, {
            '200': {
              description: subst(template.resultDescription),
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    // items: { type: 'any' },
                    items: {
                      oneOf: uniq(models).map(model => {
                        return { '$ref': '#/components/schemas/' + model };
                      }),
                    },
                  },
                },
              },
            }
          });
        },

        addResultOfModel: () => {
          defaults(pathEntry.responses, {
            '200': {
              description: subst(template.resultDescription || '**{globalId}** record'),
              content: {
                'application/json': {
                  schema: { '$ref': '#/components/schemas/' + route.model!.identity },
                },
              },
            }
          });
        },

        addResultNotFound: () => {
          defaults(pathEntry.responses, {
            '404': { description: subst(template.notFoundDescription || 'Not found'), }
          });
        },

        addResultValidationError: () => {
          defaults(pathEntry.responses, {
            '400': { description: subst('Validation errors; details in JSON response'), }
          });
        },

        addFksBodyParam: () => {
          if(route.isShortcutBlueprintRoute) {
            generateModelAssociationFKAttributeParameters(route.model!, route.associationAliases, models).map(p => {
              if(!route.associationAliases || route.associationAliases.indexOf(p.name) < 0) return;
              if (isParam('query', p.name)) return;
              pathEntry.parameters.push(p);
            });
          } else {
            if (pathEntry.requestBody) return;
            pathEntry.requestBody = {
              description: 'The primary key values (usually IDs) of the child records to use as the new members of this collection',
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      oneOf: generateModelAssociationFKAttributeSchemas(route.model!, route.associationAliases, models),
                    }
                  } as OpenApi.UpdatedSchema,
                },
              },
            };
          }
        },

        addShortCutBlueprintRouteNote: () => {
          if(!route.isShortcutBlueprintRoute) { return; }
          pathEntry.summary += ' *';
          if(route.blueprintAction === 'replace') {
            pathEntry.description += `\n\nOnly one of the query parameters, that matches the **association** path parameter, should be specified.`;
          }
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

    } // of if (route.model && route.blueprintAction)

    // final populate noting others above
    defaults(
      pathEntry,
      {
        summary: route.path || '',
        tags: [route.actions2Machine?.friendlyName || route.defaultTagName],
      }
    );

    defaults(
      pathEntry.responses,
      defaultsValues.responses,
      { '500': { description: 'Internal server error' } },
    );

    // catch the case where defaultTagName not defined
    if (isEqual(pathEntry.tags, [undefined])) pathEntry.tags = [];

    if (route.variables) {
      // now add patternVariables that don't already exist
      route.variables.map(v => {
        const existing = isParam('path', v);
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

    if(pathEntry.tags) {
      pathEntry.tags.sort();
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
