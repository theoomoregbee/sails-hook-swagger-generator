import { SwaggerSailsModel, NameKeyMap } from './interfaces';
import { Schema, Reference } from 'swagger-schema-official';
import get from 'lodash/get';
import { swaggerTypes, sailAttributePropertiesMap, validationsMap } from './type-formatter';
import assign from 'lodash/assign';
import defaults from 'lodash/defaults';
import mapKeys from 'lodash/mapKeys';
import pick from 'lodash/pick';
import keys from 'lodash/keys';
import cloneDeep from 'lodash/cloneDeep';

/**
 * Maps from a Sails route path of the form `/path/:id` to a
 * Swagger path of the form `/path/{id}`. and the path variables
 */
export const  generateSwaggerPath = (path: string): {variables: string[]; path: string}  => {
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateAttributeSchema = (attribute: NameKeyMap<any>): Schema & { oneOf?: Schema[] } => {
  const ai = attribute || {}, sts = swaggerTypes;

  const type = attribute.type || 'string';
  const columnType = get(attribute, ['autoMigrations', 'columnType']);
  const autoIncrement = get(attribute, ['autoMigrations', 'autoIncrement']);

  let schema: Schema & { oneOf?: Schema[]; common_name?: string } = {};

  if (ai.model) {
    assign(schema, {
      description: `JSON dictionary representing the **${ai.model}** instance or FK when creating / updating / not populated`,
      // '$ref': '#/components/schemas/' + ai.model,
      oneOf: [ // we use oneOf (rather than simple ref) so description rendered (!) (at least in redocly)
        { '$ref': '#/components/schemas/' + ai.model },
      ],
    });

  } else if (ai.collection) {
    assign(schema, {
      description: `Array of **${ai.collection}**'s or array of FK's when creating / updating / not populated`,
      type: 'array',
      items: { '$ref': '#/components/schemas/' + ai.collection },
    });

  } else if (type == 'number') {
    let t = autoIncrement ? sts.integer : sts.double;
    if (ai.isInteger) {
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
    }
  }

  const annotations = [];

  // annotate format with Sails autoCreatedAt/autoUpdatedAt
  if (schema.type == 'string' && schema.format == 'date-time') {
    if (ai.autoCreatedAt) annotations.push('autoCreatedAt');
    else if (ai.autoUpdatedAt) annotations.push('autoUpdatedAt');
  }

  // process Sails --> Swagger attribute mappings as per sailAttributePropertiesMap
  defaults(schema, mapKeys(pick(ai, keys(sailAttributePropertiesMap)), (v, k) => sailAttributePropertiesMap[k]));

  // process Sails --> Swagger attribute mappings as per validationsMap
  defaults(schema, mapKeys(pick(ai.validations, keys(validationsMap)), (v, k: Sails.AttributeValidation) => get(validationsMap, `${k}`)));

  // copy default into example if present
  if (schema.default && !schema.example) {
    schema.example = schema.default;
  }

  // process final autoMigrations: autoIncrement, unique
  if (autoIncrement) annotations.push('autoIncrement');
  if (get(attribute, ['autoMigrations', 'unique'])) {
    schema.uniqueItems = true;
  }

  // represent Sails `isIP` as one of ipv4/ipv6
  if (schema.type == 'string' && isIP) {
    schema = {
      description: 'ipv4 or ipv6 address',
      oneOf: [
        cloneDeep(schema),
        assign(cloneDeep(schema), { format: 'ipv6' }),
      ]
    }
  }

  if(annotations.length>0) {
    const s = `Note Sails special attributes: ${annotations.join(', ')}`;
    schema.description = schema.description ? `\n\n${s}` : s;
  }

  // note: required --> required[] (not here, needs to be done at model level)

  delete schema.common_name;

  return schema;
}


  /**
   * Generate Swagger schema content describing specified Sails models.
   * @see https://swagger.io/docs/specification/data-models/
   * @param models parsed Sails models as per `parsers.parseModels()` 
   * @returns 
   */
export const generateSchemas = (models: NameKeyMap<SwaggerSailsModel>): NameKeyMap<Schema | Reference> => {
  return Object.keys(models)
    .reduce((schemas, identiy) => {
      const model = models[identiy]
      const schema: Schema = {
        description: get(model, 'swagger.description', `Sails ORM Model **${model.globalId}**`),
        required: [],
      }

      const attributes = model.attributes || {}
       schema.properties = Object.keys(attributes).reduce((props, attributeName) => {
        const attribute = model.attributes[attributeName];
       props[attributeName] = generateAttributeSchema(attribute); 
       if (attribute.required) schema.required!.push(attributeName);
        return props
      }, {} as NameKeyMap<Schema>)

      if (schema.required!.length <= 0) delete schema.required;

      schemas[model.identity] = schema;

      return schemas
    }, {} as NameKeyMap<Schema | Reference>)
}