import { BlueprintActionTemplates, Modifiers, Action2Response, Defaults } from './interfaces';

/* eslint-disable @typescript-eslint/camelcase */
/**
 * Created by theophy on 02/08/2017.
 *
 * this modules helps us to stick with swagger specifications for formatting types
 */

/**
 * this is used to map our sails types with the allowed type defintions based on swagger specification
 * @type {{integer: {common_name: string, type: string, format: string, comments: string}, long: {common_name: string, type: string, format: string, comments: string}, float: {common_name: string, type: string, format: string}, double: {common_name: string, type: string, format: string}, string: {common_name: string, type: string}, byte: {common_name: string, type: string, format: string, comments: string}, binary: {common_name: string, type: string, format: string, comments: string}, boolean: {common_name: string, type: string}, date: {common_name: string, type: string, format: string, comments: string}, datetime: {common_name: string, type: string, format: string, comments: string}, password: {common_name: string, type: string, format: string, comments: string}}}
 */
export const swaggerTypes = {
  integer: { common_name: 'integer', type: 'integer', format: 'int32', /* comments: 'signed 32 bits' */ },
  long: { common_name: 'long', type: 'integer', format: 'int64', /* comments: 'signed 64 bits' */ },
  float: { common_name: 'float', type: 'number', format: 'float' },
  double: { common_name: 'double', type: 'number', format: 'double' },
  string: { common_name: 'string', type: 'string' },
  byte: { common_name: 'byte', type: 'string', format: 'byte', /* comments: 'base64 encoded characters' */ },
  binary: { common_name: 'binary', type: 'string', format: 'binary', /* comments: 'any sequence of octets' */ },
  boolean: { common_name: 'boolean', type: 'boolean' },
  date: { common_name: 'date', type: 'string', format: 'date', /* comments: 'As defined by full-date - RFC3339' */ },
  datetime: {
    common_name: 'dateTime',
    type: 'string',
    format: 'date-time',
    /* comments: 'As defined by date-time - RFC3339' */
  },
  password: { common_name: 'password', type: 'string', format: 'password', /* comments: 'A hint to UIs to obscure input' */ }
};

/**
 * Defines allowed Sails model attribute definition values, and provides mapping to Swagger/OpenAPI names
 */
export const sailAttributePropertiesMap = {
  allowNull: 'nullable',
  defaultsTo: 'default',
  description: 'description',
  externalDocs: 'externalDocs',
  example: 'example',
};

/**
 * this is used to hold on to the different types of validation sails offers with the value as the swagger specification
 */
export const validationsMap: Record<keyof Sails.AttributeValidation, string> = {
  max: 'maximum',
  min: 'minimum',
  maxLength: 'maxLength',
  minLength: 'minLength',
  regex: 'pattern',
  isIn: 'enum'
};

/**
 * Defines template for generating Swagger for each Sails blueprint action routes.
 *
 * In summary/description strings the value `{globalId}` is replaced with the applicable Sails model.
 *
 * Parameters values are Swagger definitions, with the exception of the string value
 * `primaryKeyPathParameter` used to include a reference to a model's primary key (this is
 * handled in `generatePaths()`).
 *
 * Modifiers are used to apply custom changes to the generated Swagger:
 * - String values are predefined in `generatePaths()`
 * - Functions are called with `func(blueprintActionTemplate, routeInfo, pathEntry)`
 *
 * These templates may be modfied / added to using the `updateBlueprintActionTemplates` config option
 * e.g. to support custom blueprint actions/routes.
 */
export const blueprintActionTemplates: BlueprintActionTemplates = {
  findone: {
    summary: 'Get {globalId} (find one)',
    description: 'Look up the **{globalId}** record with the specified ID.',
    externalDocs: {
      url: 'https://sailsjs.com/documentation/reference/blueprint-api/find-one',
      description: 'See https://sailsjs.com/documentation/reference/blueprint-api/find-one'
    },
    parameters: [
      'primaryKeyPathParameter', // special case; filtered and substituted during generation phase
    ],
    resultDescription: 'Responds with a single **{globalId}** record as a JSON dictionary',
    notFoundDescription: 'Response denoting **{globalId}** record with specified ID **NOT** found',
    // if functions, each called with (blueprintActionTemplate, routeInfo, pathEntry)
    modifiers: [Modifiers.ADD_SELECT_QUERY_PARAM, Modifiers.ADD_OMIT_QUERY_PARAM, Modifiers.ADD_POPULATE_QUERY_PARAM, Modifiers.ADD_RESULT_OF_MODEL, Modifiers.ADD_RESULT_NOT_FOUND],
  },
  find: {
    summary: 'List {globalId} (find where)',
    description: 'Find a list of **{globalId}** records that match the specified criteria.',
    externalDocs: {
      url: 'https://sailsjs.com/documentation/reference/blueprint-api/find-where',
      description: 'See https://sailsjs.com/documentation/reference/blueprint-api/find-where'
    },
    parameters: [
      { $ref: '#/components/parameters/AttributeFilterParam' },
      { $ref: '#/components/parameters/WhereQueryParam' },
      { $ref: '#/components/parameters/LimitQueryParam' },
      { $ref: '#/components/parameters/SkipQueryParam' },
      { $ref: '#/components/parameters/SortQueryParam' },
    ],
    resultDescription: 'Responds with a paged list of **{globalId}** records that match the specified criteria',
    modifiers:[Modifiers.ADD_SELECT_QUERY_PARAM, Modifiers.ADD_OMIT_QUERY_PARAM, Modifiers.ADD_POPULATE_QUERY_PARAM, Modifiers.ADD_RESULT_OF_MODEL]
  },
  create: {
    summary: 'Create {globalId}',
    description: 'Create a new **{globalId}** record.',
    externalDocs: {
      url: 'https://sailsjs.com/documentation/reference/blueprint-api/create',
      description: 'See https://sailsjs.com/documentation/reference/blueprint-api/create'
    },
    parameters: [],
    resultDescription: 'Responds with a JSON dictionary representing the newly created **{globalId}** instance',
    modifiers: [Modifiers.ADD_MODEL_BODY_PARAM, Modifiers.ADD_RESULT_OF_MODEL, Modifiers.ADD_RESULT_VALIDATION_ERROR]
  },
  update: {
    summary: 'Update {globalId}',
    description: 'Update an existing **{globalId}** record.',
    externalDocs: {
      url: 'https://sailsjs.com/documentation/reference/blueprint-api/update',
      description: 'See https://sailsjs.com/documentation/reference/blueprint-api/update'
    },
    parameters: [
      'primaryKeyPathParameter',
    ],
    resultDescription: 'Responds with the newly updated **{globalId}** record as a JSON dictionary',
    notFoundDescription: 'Cannot update, **{globalId}** record with specified ID **NOT** found',
    modifiers: [Modifiers.ADD_MODEL_BODY_PARAM, Modifiers.ADD_RESULT_OF_MODEL, Modifiers.ADD_RESULT_VALIDATION_ERROR, Modifiers.ADD_RESULT_NOT_FOUND]
  },
  destroy: {
    summary: 'Delete {globalId} (destroy)',
    description: 'Delete the **{globalId}** record with the specified ID.',
    externalDocs: {
      url: 'https://sailsjs.com/documentation/reference/blueprint-api/destroy',
      description: 'See https://sailsjs.com/documentation/reference/blueprint-api/destroy'
    },
    parameters: [
      'primaryKeyPathParameter',
    ],
    resultDescription: 'Responds with a JSON dictionary representing the destroyed **{globalId}** instance',
    notFoundDescription: 'Cannot destroy, **{globalId}** record with specified ID **NOT** found',
    modifiers: [Modifiers.ADD_RESULT_OF_MODEL, Modifiers.ADD_RESULT_NOT_FOUND],
  },
  populate: {
    summary: 'Populate association for {globalId}',
    description: 'Populate and return foreign record(s) for the given association of this **{globalId}** record.',
    externalDocs: {
      url: 'https://sailsjs.com/documentation/reference/blueprint-api/populate-where',
      description: 'See https://sailsjs.com/documentation/reference/blueprint-api/populate-where'
    },
    parameters: [
      'primaryKeyPathParameter',
      { $ref: '#/components/parameters/WhereQueryParam' },
      { $ref: '#/components/parameters/LimitQueryParam' },
      { $ref: '#/components/parameters/SkipQueryParam' },
      { $ref: '#/components/parameters/SortQueryParam' },
    ],
    resultDescription: 'Responds with the list of associated records as JSON dictionaries',
    notFoundDescription: 'Cannot populate, **{globalId}** record with specified ID **NOT** found',
    modifiers: [Modifiers.ADD_ASSOCIATION_PATH_PARAM, Modifiers.ADD_SELECT_QUERY_PARAM, Modifiers.ADD_OMIT_QUERY_PARAM, Modifiers.ADD_ASSOCIATION_RESULT_OF_ARRAY, Modifiers.ADD_RESULT_NOT_FOUND],
  },
  add: {
    summary: 'Add to for {globalId}',
    description: 'Add a foreign record to one of this **{globalId}** record\'s collections.',
    externalDocs: {
      url: 'https://sailsjs.com/documentation/reference/blueprint-api/add-to',
      description: 'See https://sailsjs.com/documentation/reference/blueprint-api/add-to'
    },
    parameters: [
      'primaryKeyPathParameter',
    ],
    resultDescription: 'Responds with the newly updated **{globalId}** record as a JSON dictionary',
    notFoundDescription: 'Cannot perform add to, **{globalId}** record OR **FK record** with specified ID **NOT** found',
    modifiers: [Modifiers.ADD_ASSOCIATION_PATH_PARAM, Modifiers.ADD_ASSOCIATION_FK_PATH_PARAM,Modifiers.ADD_RESULT_OF_MODEL, Modifiers.ADD_RESULT_NOT_FOUND],
  },
  remove: {
    summary: 'Remove from for {globalId}',
    description: 'Remove a foreign record from one of this **{globalId}** record\'s collections.',
    externalDocs: {
      url: 'https://sailsjs.com/documentation/reference/blueprint-api/remove-from',
      description: 'See https://sailsjs.com/documentation/reference/blueprint-api/remove-from'
    },
    parameters: [
      'primaryKeyPathParameter',
    ],
    resultDescription: 'Responds with the newly updated **{globalId}** record as a JSON dictionary',
    notFoundDescription: 'Cannot perform remove from, **{globalId}** record OR **FK record** with specified ID **NOT** found',
    modifiers: [Modifiers.ADD_ASSOCIATION_PATH_PARAM, Modifiers.ADD_ASSOCIATION_FK_PATH_PARAM, Modifiers.ADD_RESULT_OF_MODEL, Modifiers.ADD_RESULT_NOT_FOUND]
  },
  replace: {
    summary: 'Replace for {globalId}',
    description: 'Replace all of the foreign **{globalId}** records in one of this record\'s collections.',
    externalDocs: {
      url: 'https://sailsjs.com/documentation/reference/blueprint-api/replace',
      description: 'See https://sailsjs.com/documentation/reference/blueprint-api/replace'
    },
    parameters: [
      'primaryKeyPathParameter',
    ],
    resultDescription: 'Responds with the newly updated **{globalId}** record as a JSON dictionary',
    notFoundDescription: 'Cannot replace, **{globalId}** record with specified ID **NOT** found',
    modifiers: [Modifiers.ADD_ASSOCIATION_PATH_PARAM, Modifiers.ADD_FKS_BODY_PARAM, Modifiers.ADD_RESULT_OF_MODEL, Modifiers.ADD_RESULT_NOT_FOUND],
  },
};

/**
 * Defines standard parameters for generated Swagger for each Sails blueprint action routes.
 */
export const blueprintParameterTemplates = {
  AttributeFilterParam: {
    in: 'query',
    name: '_*_',
    required: false,
    schema: { type: 'string' },
    description: 'To filter results based on a particular attribute, specify a query parameter with the same name'
      + ' as the attribute defined on your model. For instance, if our `Purchase` model has an `amount` attribute, we'
      + ' could send `GET /purchase?amount=99.99` to return a list of $99.99 purchases.',
  },
  WhereQueryParam: {
    in: 'query',
    name: 'where',
    required: false,
    schema: { type: 'string' },
    description: 'Instead of filtering based on a specific attribute, you may instead choose to provide'
      + ' a `where` parameter with the WHERE piece of a'
      + ' [Waterline criteria](https://sailsjs.com/documentation/concepts/models-and-orm/query-language),'
      + ' _encoded as a JSON string_. This allows you to take advantage of `contains`, `startsWith`, and'
      + ' other sub-attribute criteria modifiers for more powerful `find()` queries.'
      + '\n\ne.g. `?where={"name":{"contains":"theodore"}}`'
  },
  LimitQueryParam: {
    in: 'query',
    name: 'limit',
    required: false,
    schema: { type: 'integer' },
    description: 'The maximum number of records to send back (useful for pagination). Defaults to 30.'
  },
  SkipQueryParam: {
    in: 'query',
    name: 'skip',
    required: false,
    schema: { type: 'integer' },
    description: 'The number of records to skip (useful for pagination).'
  },
  SortQueryParam: {
    in: 'query',
    name: 'sort',
    required: false,
    schema: { type: 'string' },
    description: 'The sort order. By default, returned records are sorted by primary key value in ascending order.'
      + '\n\ne.g. `?sort=lastName%20ASC`'
  },
};

/**
 * Defines standard Sails responses as used within actions2 actions.
 */
export const actions2Responses: Action2Response = {
  success: { statusCode: '200', description: 'Success' },
  badRequest: { statusCode: '400', description: 'Bad request' },
  forbidden: { statusCode: '403', description: 'Forbidden' },
  notFound: { statusCode: '404', description: 'Not found' },
  error: { statusCode: '500', description: 'Server error' },
};

/**
 * Default values for produces/consumes and responses for custom actions.
 */
export const defaults: Defaults = {
  responses: {
    '200': { description: 'The requested resource' },
    '404': { description: 'Resource not found' },
    '500': { description: 'Internal server error' }
  }
};