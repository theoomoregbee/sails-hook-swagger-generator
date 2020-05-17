import { SwaggerSailsModel, NameKeyMap, SwaggerRouteInfo, BlueprintActionTemplates, Defaults, MiddlewareType, SwaggerSailsController, Action2Response } from './interfaces';
import { Reference, Tag } from 'swagger-schema-official';
import get from 'lodash/get';
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

/**
 * Maps from a Sails route path of the form `/path/:id` to a
 * Swagger path of the form `/path/{id}`. and the path variables
 */
export const generateSwaggerPath = (path: string): { variables: string[]; path: string } => {
  const variables: string[] = [];
  const swaggerPath = path
    .split('/')
    .map(v => {
      // TODO: update this to accept optional route param e.g id?
      // simply remove the ? in [^/:?]
      const match = v.match(/^:([^/:?]+)\??$/);
      if (match) {
        variables.push(match[1]);
        return `{${match[1]}}`;
      }
      return v;
    })
    .join('/');
  return { path: swaggerPath, variables };
}

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
 * @see https://swagger.io/docs/specification/data-models/
 * @param models parsed Sails models as per `parsers.parseModels()`
 * @returns
 */
export const generateSchemas = (models: NameKeyMap<SwaggerSailsModel>): NameKeyMap<OpenApi.UpdatedSchema | Reference> => {
  return Object.keys(models)
    .reduce((schemas, identiy) => {
      const model = models[identiy]
      const schema: OpenApi.UpdatedSchema = {
        description: get(model, 'swagger.description', `Sails ORM Model **${model.globalId}**`),
        required: [],
      }

      const attributes = model.attributes || {}
      schema.properties = Object.keys(attributes).reduce((props, attributeName) => {
        const attribute = model.attributes[attributeName];
        props[attributeName] = generateAttributeSchema(attribute);
        if (attribute.required) schema.required!.push(attributeName);
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
 * @param action2s
 * @param specification
 */
export const generatePaths = (routes: SwaggerRouteInfo[], templates: BlueprintActionTemplates, defaultsValues: Defaults, action2s: NameKeyMap<SwaggerSailsController>, specification: Omit<OpenApi.OpenApi, 'paths'>, models: NameKeyMap<SwaggerSailsModel>): OpenApi.Paths => {
  const paths = {};
  const tags = specification.tags!;
  const components = specification.components!;

  if (!components.parameters) {
    components.parameters = {}
  }

  const addTags = (toAdd: Array<Tag>) => {
    const newTags = toAdd.filter(newTag => tags.find(tag => newTag.name === tag.name));
    tags.push(...newTags)
  }

  const mergeComponents = (toMerge: OpenApi.Components) => {
    for (const key in toMerge) {
      const componentName = key as keyof OpenApi.Components
      if (!components[componentName]) {
        components[componentName] = {};
      }
      defaults(components[componentName], toMerge[componentName]);
    }
  }

  for (const route of routes) {
    const path = route.path;
    let pathEntry: OpenApi.Operation;

    if (route.middlewareType === MiddlewareType.BLUEPRINT && route.model) {
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
        tags: get(route, 'swagger.tags', []) as string[],
        parameters,
        responses: cloneDeep(defaultsValues.responses || {}),
        ...(route.swagger || {})
      };

      const isParam = (inType: string, name: string): boolean => !!pathEntry.parameters.find(parameter => parameter.in == inType && parameter.name == name);
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
          pathEntry.parameters.push({
            in: 'query',
            name: 'select',
            required: false,
            schema: {
              type: 'string',
              example: [...keys(route.model!.attributes || {})].join(','),
            },
            description: 'The attributes to include in the result, specified as a comma-delimited list.'
              + ' By default, all attributes are selected.'
              + ' Not valid for plural (“collection”) association attributes.',
          });

        },

        addOmitQueryParam: () => {
          if (isParam('query', 'omit')) return;
          pathEntry.parameters.push({
            in: 'query',
            name: 'omit',
            required: false,
            schema: {
              type: 'string',
              example: [...keys(route.model!.attributes || {})].join(','),
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
          if (isParam('path', 'fk')) return;
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
      };

      // apply changes for blueprint action
      (template.modifiers || []).map(modifier => {
        if (isFunction(modifier)) modifier(template, route, pathEntry, tags, components); // custom modifier
        else modifiers[modifier](); // standard modifier
      });

      assign(pathEntry.responses['500'], {
        description: 'Internal server error',
      });
    } else {
      pathEntry = {
        parameters: [],
        responses: cloneDeep(defaultsValues.responses || {}),
        ...(route.swagger || {})
      }

      const action2 = action2s[route.action];

      if (action2) {
        const patternVariables = route.variables || [];
        if (action2.inputs) {
          forEach(action2.inputs, (value, key) => {
            const _in = patternVariables.indexOf(key) >= 0 ? 'path' : 'query';
            const isExisting = pathEntry.parameters.find(p => p.in === _in && p.name === key)
            if (isExisting) {
              return
            }
            const { description, ...attribute } = value
            pathEntry.parameters.push({
              in: _in,
              name: key,
              required: value.required || false,
              schema: generateAttributeSchema(attribute) as OpenApi.UpdatedSchema,
              description
            })
          })
        }

        if (action2.exits) {
          const exitResponses: NameKeyMap<OpenApi.Response> = {};

          // actions2 may specify more than one 'exit' per 'statusCode' --> use oneOf
          forEach(action2.exits, (exit, exitName) => {
            let { statusCode, description } = actions2Responses[exitName as keyof Action2Response] || actions2Responses.success;
            statusCode = exit.statusCode || statusCode;
            description = exit.description || description;

            if (exitResponses[statusCode]) {
              const arr = get(pathEntry, ['responses', statusCode, 'content', 'application/json', 'schema', 'oneOf'], []);
              arr.push({ type: 'json', description: description });
            } else {
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

          // remove oneOf for single entries, otherwise summarise
          forEach(exitResponses, resp => {
            const arr = get(resp, ['content', 'application/json', 'schema', 'oneOf'], []);
            if (arr.length === 1) {
              set(resp, ['content', 'application/json', 'schema'], arr[0]);
            } else {
              resp.description = `${arr.length} alternative responses`;
            }
          });

          defaults(pathEntry.responses, exitResponses);
          forEach(pathEntry.responses, (v, k) => { // ensure description
            if (!v.description) v.description = get(exitResponses, [k, 'description'], '-');
          });
        }
      }


      // actions2 summary and description
      defaults(
        pathEntry,
        {
          summary: get(route, ['actions2', 'friendlyName']) || route.path || '',
          description: get(route, ['actions2', 'description']) || undefined,
        }
      );
    }

    if (route.variables) {
      // first resolve '$ref' parameters
      const resolved = pathEntry.parameters.map(parameter => {
        let ref = parameter['$ref' as keyof OpenApi.Parameter] as string;
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
        const existing = resolved.find(p => p.in == 'path' && p.name == v);
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

    addTags(get(route.swagger, 'tags', []) as Tag[]);
    mergeComponents(get(route.swagger, 'components', {}));

    set(paths, [path, route.verb], pathEntry);
  }

  return paths
}
