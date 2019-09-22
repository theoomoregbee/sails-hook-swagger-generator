# Swagger Generator Sails Hook
[![Travis](https://img.shields.io/travis/theo4u/sails-hook-swagger-generator.svg)](https://travis-ci.org/theo4u/sails-hook-swagger-generator)
[![npm](https://img.shields.io/npm/v/sails-hook-swagger-generator.svg)](https://www.npmjs.com/package/sails-hook-swagger-generator)
[![npm](https://img.shields.io/npm/l/express.svg)]()
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)


This helps to create swagger documentation json which is based entirely on Swagger/OpenAPI specification (see [here](https://swagger.io/specification/)).
The hook produces specification based upon OAS 3.0.

![](screenshot/swagger-doc.gif)


## Installation
```sh
$ npm install sails-hook-swagger-generator --save
```

## Usage
Just install the library and `sails lift`, the moment you do, that's all check your **./swagger** folder, it should be there and make sure this folder is already existing.

![](screenshot/nuh_uh_conan_obrien.gif)



## Example
Check the **./swagger/swagger.json** for sample generated swagger documentation json, then head to [Swagger Editor](http://editor.swagger.io/).

## Generated Output

By default, the Swagger Generator Sails Hook generates:
1. Full automatic documentation for all Sails Blueprint routes;
1. Documentation for all Sails
   [actions2](https://sailsjs.com/documentation/concepts/actions-and-controllers#?actions-2)
   actions with routes configured in `config/routes.js`; and
1. Listing of all routes configured in `config/routes.js` (full details cannot be inferred
   for custom routes without additional information being provided - see below).

## Adding/Customising Generated Output

Documentation detail and customisation of most aspects of the generated Swagger can be achieved by:
1. Top-level configuration to `config/swaggergenerator.js`. This provides direct JSON
   used as the template for the output Swagger/OpenAPI.
1. Adding objects with the key `swagger` to custom route configuration, controller files, action
   functions, model definitions and model attribute definitions.
1. Adding JSDoc ([swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)) `@swagger` comments to
   `config/routes.js`, controller/action files and model files.

Top-level Swagger/OpenAPI definitions for `tags` and `components` may be added in all `swagger` objects
above and in all JSDoc `@swagger` documentation comments. This enables the definition of top-level elements
in the location where they are logically defined/documented within the Sails application.

All content added to `swagger` objects is merged into the generated output **except** those at the top-level with
keys that use an `_` (underscore) prefix, which are processed specially
e.g. `_tags`, `_components`, `_{actionName}` or `_{blueprintAction}`.

See below for details.

## Configurations

It comes with some default settings which can be overridden by creating `config/swaggergenerator.js`:
```javascript
module.exports['swagger-generator'] = {
    disabled: false,
    swaggerJsonPath: './swagger/swagger.json',
    swagger: {
        openapi: '3.0.0',
        info: {
            title: 'Swagger Json',
            description: 'This is a generated swagger json for your sails project',
            termsOfService: 'http://example.com/terms',
            contact: {name: 'Theophilus Omoregbee', url: 'http://github.com/theo4u', email: 'theo4u@ymail.com'},
            license: {name: 'Apache 2.0', url: 'http://www.apache.org/licenses/LICENSE-2.0.html'},
            version: '1.0.0'
        },
        servers: [
            { url: 'http://localhost:1337/' }
        ],
        externalDocs: {url: 'http://theophilus.ziippii.com'}
    },
    defaults: {
        responses: {
            '200': { description: 'The requested resource' },
            '404': { description: 'Resource not found' },
            '500': { description: 'Internal server error' }
        }
    },
    includeRoute: function(routeInfo) { return true; },
    updateBlueprintActionTemplates: function(blueprintActionTemplates) { ... },
    postProcess: function(specifications) { ... }
};
```

Notes on the use of configuration:

* `disabled` attribute is used to disable the module (e.g you may want to disable it on production).
* `swaggerJsonPath` where to generate the `swagger.json` file to; defaults to `sails.config.appPath + '/swagger/swagger.json'`.
* `swagger` object is template for the Swagger/OpenAPI output. It defaults to the minimal content above.
   Check Swagger/OpenAPI specification for more, in case you want to extend it.
   Generally, this hook provides sensible defaults for as much as possible but you may
   override them in this location or in any of the mechanisms explained below.
* `defaults` object should contain the `responses` element; defaults to the above if not specified.
* `includeRoute` function used to filter routes to be included in generated Swagger output; see advanced section below.
* `updateBlueprintActionTemplates` allows customisation of the templates used to generate Swagger for blueprints; see advanced section below.
* `postProcess` allows modification of the generated Swagger output before it is written to the output file; see advanced section below.


## Custom Route Configuration

Documentation detail and customisation of most aspects of the generated Swagger for
[custom routes](https://sailsjs.com/documentation/concepts/routes/custom-routes) may be achieved by:

1. Adding an object with the key `swagger` to individual route configurations in `config/routes.js`.
1. Adding an object with the key `swagger` added to a controller file action function.
1. Adding an object with the key `swagger` to the exports of a controller file, standalone action file or actions2 file.
1. Adding JSDoc `@swagger` comments to route configurations in `config/routes.js`; specifically:
  - JSDoc `@swagger` documentation under the `/{routePath}` and `{httpMethod}` *Swagger path* for routes, or
  - JSDoc `@swagger` documentation under `tags` and `components` paths for adding to the top-level Swagger/OpenAPI definitions.
1. Adding JSDoc `@swagger` comments to Sails
  [controller files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?controllers),
  [standalone action files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?standalone-actions) or
  [actions2 files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?actions-2); specifically:
  - JSDoc `@swagger` documentation under the `/{actionName}` path for the route, or
  - JSDoc `@swagger` documentation under `tags` and `components` paths for adding to the top-level Swagger/OpenAPI definitions.

### Custom Route Configuration in `config/routes.js`

If you want to add extra configuration to a route, it can be done via the `config/routes.js`, since Sails uses any of these two route patterns
(see full documentation [here](https://sailsjs.com/documentation/concepts/routes/custom-routes#?route-address)):
* `'http_method route': 'controller.action'` or
* `'http_method route': { controller:'controller', action:'action' }`

We can extend and add extra information on the second above for sails hook swagger generator to override
default properties (which is created from the first). Adding an object with a key `swagger` or adding
JSDoc `@swagger` commonents will do the trick.

For example, in `config/routes.js`:
```javascript
{
  'post /user/login': {
    controller: 'UserController',
    action: 'login',
    swagger: {
      summary: 'Authentication',
      description: 'This is for authentication of any user',
      tags: [ 'Tag Name' ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              properties: {
                email: { type: 'string' },
                password: { type: 'string', format: 'password' }
              },
              required: [ 'email', 'password' ],
            }
          }
        }
      },
      parameters: [{
        in: 'query',
        name: 'firstName',
        required: true,
        schema: { type: 'string' },
        description: 'This is a custom required parameter'
      }],
      responses: {
        '200': {
          description: 'The requested resource',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { '$ref': '#/components/schemas/someDataType' },
                },
              },
            },
        },
        '404': { description: 'Resource not found' },
        '500': { description: 'Internal server error' }
      }
    }
  }
}
```

Alternately, JSDoc `@swagger` comments may be added for route configuration in `config/routes.js` as follows:
1. JSDoc `@swagger` documentation under the `/{routePath}` and `{httpMethod}` *Swagger path* for routes, or
1. JSDoc `@swagger` documentation under `tags` and `components` paths for adding to the top-level Swagger/OpenAPI definitions.

For example, in `config/routes.js`:
```javascript
{
  /** @swagger
   * /clients/:client_id/user/:id:
   *   delete:
   *     summary: Client Op
   *     description: This is not really useful - example only :)
   */
  'delete /clients/:client_id/user/:id': 'UserController.destroy',
}
```

### Custom Route Configuration in Controller or Action files

Documentation detail and customisation of most aspects of the generated Swagger may be added to
[controller files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?controllers),
[standalone action files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?standalone-actions) or
[actions2 files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?actions-2) as follows:

1. Adding an object with the key `swagger` added to a controller file action function.
1. Adding an object with the key `swagger` to the exports of a controller file, standalone action file or actions2 file:
   - For controller files, actions are referenced by adding objects keyed on `_{actionName}` name.
   - For standalone action or actions2 files, placing content in the `swagger` object itself.
   - Adding documentation under `_tags` and `_components` elements for adding to the top-level Swagger/OpenAPI definitions.
1. Adding JSDoc `@swagger` comments to controller file, standalone action file or actions2 file:
   - JSDoc `@swagger` documentation under the `/{actionName}` path for the route, or
   - JSDoc `@swagger` documentation under `tags` and `components` paths for adding to the top-level Swagger/OpenAPI definitions.

Note the use of the `_` (underscore) prefix to avoid clashes with / distinguish them from general Swagger/OpenAPI elements.

For actions2 files:
1. Inputs are parsed to generate parameter documentation.
2. Exits are parsed to generate response documentation.
3. Both may be customised/overridden by specifying parameters and/or responses in the `swagger` object
   in actions2 file.

For example, for a route configured as:
```javascript
module.exports.routes = {
    '/api/v1/auth/tokens': 'AuthController.tokens',
};
```

The `tokens` action might be documented in a Controller `api/controllers/AuthController.js` as follows:
```javascript
function tokens(req, res) {
    ...
}

module.exports = {
    tokens: tokens,
    swagger: {
        _tokens: {
            tags: [ 'Auth' ],
            description: 'Route description...'
        },
        _tags: [
            {
                name: 'Auth',
                description: 'Module description ...',
            }
        ],
    }
};
```

Or, alternately:
```javascript
function tokens(req, res) {
    ...
}

tokens.swagger = {
    tags: [ 'Auth ],
    description: 'Route description...'
}

module.exports = {
    tokens: tokens,
    swagger: {
        _tags: [ ... ]
    }
};
```

Or, alternately using JSDoc:
```javascript
/**
 * @swagger
 *
 * /tokens:
 *   description: Route description...
 *   tags:
 *     - Auth
 * tags:
 *   - name: Auth
 *     description: Module description...
 */
function tokens(req, res) {
    ...
}

module.exports = {
    tokens: tokens
};
```

## Blueprint Route Configuration

Documentation detail and customisation of most aspects of the generated Swagger for
[blueprint routes](https://sailsjs.com/documentation/concepts/blueprints/blueprint-routes) may be achieved by:

1. Adding an object with the key `swagger` to individual models e.g. `api/models/modelName.js`:
   - Documenting the Swagger **schema** associated with the Sails mode by adding general content.
   - Adding per-action documentation by adding objects keyed on `_{blueprintAction}` name.
   - Adding documentation under `_tags` and `_components` elements for adding to the top-level Swagger/OpenAPI definitions.
1. Adding specific fields to model attributes (supports `description`, `externalDocs` and `example`).
   Note that applicable Sails [attributes](https://sailsjs.com/documentation/concepts/models-and-orm/attributes),
   [automigrations](https://sailsjs.com/documentation/concepts/models-and-orm/attributes#?automigrations) and
   [validations](https://sailsjs.com/documentation/concepts/models-and-orm/validations) are also parsed.
1. JSDoc `@swagger` documentation under the `/{globalId}` path for models.
1. JSDoc `@swagger` per-action documentation under the `/{blueprintAction}` path for the
  [model blueprint actions](https://sailsjs.com/documentation/concepts/blueprints/blueprint-actions).
1. JSDoc `@swagger` documentation under `tags` and `components` paths for adding to the top-level Swagger definitions.

Note the use of the `_` (underscore) prefix to avoid clashes with / distinguish them from general Swagger/OpenAPI elements.

For example, in a model `api/models/User.js`:

```javascript
/**
 * @swagger
 *
 * /User:
 *   tags:
 *     - Tag Name
 * /findone:
 *   externalDocs:
 *     url: https://docs.com/here
 */
module.exports = {
  attributes: {
    uid: {
      type: 'string',
      example: '012345',
      description: 'A unique identifier',
    }
  },
  swagger: {
    _create: { ... },
    _tags: { ... }
  }
};
```

Note that following parameters are added to the `components/parameters` if they are not
provided in `config/swaggergenerator.js` (expressed as OpenAPI references):

```javascript
[
  { $ref: '#/components/parameters/WhereQueryParam' },
  { $ref: '#/components/parameters/LimitQueryParam' },
  { $ref: '#/components/parameters/SkipQueryParam' },
  { $ref: '#/components/parameters/SortQueryParam' },
  { $ref: '#/components/parameters/SelectQueryParam' },
  { $ref: '#/components/parameters/PopulateQueryParam' },
]
```

Note that when generating Swagger/OpenAPI documentation for blueprint routes, the hook also
generates:

1. Schemas for **models**, which may be referenced using the form `{ $ref: '#/components/schemas/modelName' }`.
2. Parameters for model **primary keys**, which may be referenced using the form `{ $ref: '#/components/parameters/ModelPKParam-modelName' }`.

These may be re-used (referenced) if/as applicable within custom route documentation.


## Handling Top-Level Swagger Defintions (Tags and Components)

You are able to add to the top-level Swagger/OpenAPI definitions for `tags` and `components` in all `swagger` objects
detailed above and in all JSDoc `@swagger` documention comments.

All `swagger` objects may contain the elements `_tags` and `_components` e.g.

```javascript
{
  _tags: [
    {
      name: 'Test Module',
      description: 'Module description ...',
      externalDocs: { url: 'https://docs.com/test' }
    }
  ],
  _components: {
    schemas: {
      test: { ... }
    }
  }
}
```

Note the use of the `_` (underscore) prefix to avoid clashes with / distinguish them from general Swagger/OpenAPI elements.

Similarly, JSDoc `@swagger` tags may define `tags` and `components`:

```javascript
/**
 * @swagger
 *
 * tags:
 *   - name: Test Module
 *     description: |
 *       Module description
 *       (continued).
 *
 *       Another paragraph.
 *
 *     externalDocs:
 *       url: https://docs.com/test
 *       description: Refer to these docs
 *
 * components:
 *   schemas:
 *     test:
 *       ...
 */
```

### Tags Handling

Tags are added to the top-level Swagger/OpenAPI definitions as follows:
1. If a tags with the specified name **does not** exist, it is added.
1. Where a tag with the specified name **does** exist, elements _of that tag_ that do not exist are added
   e.g. `description` and `externalDocs` elements.

### Component Element Handling

Elements of components are added to the top-level Swagger/OpenAPI definitions as follows:
1. Elements of the component definition reference (schemas, parameters, etc) are added where
   they **do not exist**.
1. Existing elements are **not** overwritten or merged.

The following elements (from the OpenAPI 3 specification) are handled:
```javascript
let componentDefinitionReference = {
    // Reusable schemas (data models)
    schemas: {},
    // Reusable path, query, header and cookie parameters
    parameters: {},
    // Security scheme definitions (see Authentication)
    securitySchemes: {},
    // Reusable request bodies
    requestBodies: {},
    // Reusable responses, such as 401 Unauthorized or 400 Bad Request
    responses: {},
    // Reusable response headers
    headers: {},
    // Reusable examples
    examples: {},
    // Reusable links
    links: {},
    // Reusable callbacks
    callbacks: {},
};
```


## Advanced Filtering/Processing of Generated Swagger

Three mechanisms are provided to enable advancing filtering of the Swagger generation process:
1. An `includeRoute()` function used to filter routes to be included in generated Swagger output.
1. An `updateBlueprintActionTemplates()` function allows customisation of the templates used to generate Swagger for blueprints.
1. A `postProcess()` function allows modification of the generated Swagger output before it is written to the output file.

Each is configured in `config/swaggergenerator.js`.

### Route Information

This hook parses all routes, custom and blueprint, before commencing the generation of the Swagger output.
Each route is described by a `RouteInfo` object
(see defintions [here](lib/parsers.js#L211) and [here](lib/parsers.js#L350)):

```javascript
let routeInfo = {
  middlewareType: string, // one of action|blueprint|view
  blueprintAction: string, // optional; one of findone|find|create|update|destroy|populate|add|remove|replace or custom
  httpMethod: string, // one of all|get|post|put|patch|delete
  path: string, // full Sails URL as per sails.getUrlFor() including prefix
  swaggerPath: string, // full Sails URL with ':token' replaced with '{token}' for use with Swagger
  identity: string, // optional (present for blueprints only); Sails Model identity
  modelInfo: object, // optional (present for blueprints only); Sails Model metadata
  controller: string, // Sails Controller relative path including 'Controller' suffix
  tags: string[], // default name of Swagger group based on Sails controller/action or Sails Model globalId
  actionPath: string, // Sails Controller action path consistent with 'router:bind' events (controller relative path without suffix + action name)
  actionName: string, // Sails Controller action name e.g. findone or buildModels
  actionType: string, // one of controller|standalone|actions2
  actionFound: string, // one of notfound|loaded+notfound|loaded+found|implicit
  actions2: object, // optional; present for custom routes with actions2 actions
  patternVariables: string[], // route dynamic parameters
  associations: object[], // optional (present for blueprints only); Sails Model associations
  aliases: string[], // optional (applicable for populate blueprints only); Sails Model attribute names for populate action(s)
  associationsPrimaryKeyAttributeInfo: object[], // optional (present for blueprints only); array of attributeInfo's for association PKs
  swagger: object, // per-route swagger (see below)
};
```

Sails **models** are described by a `ModelInfo` object
(see defintion [here](lib/parsers.js#L62)):

```javascript
let modelInfo = {
  tags: string[], // default name of Swagger group based on model globalId
  globalId: string, // model globalId
  identity: string, // model identity
  primaryKey: string, // name of primary key attribute
  attributes: object, // attribute definition as per Sails model definition
  swagger: object, // model-specific swagger (see below)
};
```

### Route Filtering

The `includeRoute(routeInfo): boolean` function may be used to select which routes are included in the generated Swagger output.

For example:
```javascript
module.exports['swagger-generator'] = {
  includeRoute: (routeInfo) => {
    let c = routeInfo.controller;
    if(!c) return true;
    if(c.toLowerCase().startsWith('user')) return true;
    return false;
  }
}
```

### Customising Blueprint Action Templates

The templates used for generating Swagger for each Sails blueprint action route may be
customised / modified / added to using the `updateBlueprintActionTemplates` config option
e.g. to support custom blueprint actions/routes.

For example:
```javascript
module.exports['swagger-generator'] = {
  updateBlueprintActionTemplates: function(blueprintActionTemplates) {
    blueprintActionTemplates.search = { ... };
  }
}
```

The `blueprintActionTemplates` object contains keys of the blueprint **action names**
and values as per the following example (refer to the
[source code](lib/type-formatter.js#L70) for the default templates):

```javascript
let blueprintActionTemplates = {
  findone: {
    summary: 'Get {globalId} (find one)',
    description: 'Look up the **{globalId}** record with the specified ID.',
    externalDocs: {
      url: 'https://sailsjs.com/documentation/reference/blueprint-api/find-one',
      description: 'See https://sailsjs.com/documentation/reference/blueprint-api/find-one'
    },
    parameters: [
      'primaryKeyPathParameter', // special case; filtered and substituted during generation phase
      { $ref: '#/components/parameters/LimitQueryParam' },
    ],
    resultDescription: 'Responds with a single **{globalId}** record as a JSON dictionary',
    notFoundDescription: 'Response denoting **{globalId}** record with specified ID **NOT** found',
    // if functions, each called with (blueprintActionTemplate, routeInfo, pathEntry)
    modifiers: ['addSelectQueryParam', exampleModifierFunctionRef],
  },
  ...
};
```

Note that:
1. For summary and description strings the value `{globalId}` is replaced with the applicable Sails model value.
1. Parameters values are Swagger definitions, with the exception of the *special* string value
   `primaryKeyPathParameter`, which may be used to include a reference to a model's primary key.
1. Modifiers are used to apply custom changes to the generated Swagger, noting that:
   - String values are predefined in `generatePaths()` (refer to the [source code](lib/generators.js#L246));
     valid  modifiers are:
     - `addPopulateQueryParam`
     - `addSelectQueryParam`
     - `addOmitQueryParam`
     - `addModelBodyParam`
     - `addResultOfArrayOfModels`
     - `addAssociationPathParam`
     - `addAssociationFKPathParam`
     - `addAssociationResultOfArray`
     - `addResultOfModel`
     - `addResultNotFound`
     - `addResultValidationError`
     - `addFksBodyParam`
   - Functions are called as `func(blueprintActionTemplate, routeInfo, pathEntry, tags, components)`
     where
     - `blueprintActionTemplate` the blueprint action template (see above) to which the modifier relates
     - `routeInfo` the route information object (see above) for which the Swagger is being generated
     - `pathEntry` the generated Swagger path entry to be modified
     - `tags` the generated Swagger **tag** definitions to be modified/extended
     - `components` the generated Swagger **component** definitions to be modified/extended

### Post-processing Generated Swagger Output

The final generated Swagger output may be post-processed before it is written to
the output file using a post-processing function specified as the `postProcess` config option.

For example:
```javascript
module.exports['swagger-generator'] = {
  postProcess: function(specifications) {
    let sch = specifications.components.schemas;
    Object.keys(sch).map(k => {
      sch[k].description = sck[k].description.toUpperCase();
    });
  }
}
```


## Testing

* Clone this repository

* Install all development dependencies

```sh
$ npm install
```
* Then run test

```sh
$ npm test
```

## Road Map

Since the release of v1.0.0 of [sailsjs](https://github.com/balderdashy/sails)
* [x] test compatibility with v1.0.0
* [ ] read info about a controller using machine-as-action [#4](https://github.com/theo4u/sails-hook-swagger-generator/issues/4)

## Contribute

Fork this repo and push in your ideas.
Do not forget to add a bit of test(s) of what value you adding.
* stick to conventional commit message [here](https://conventionalcommits.org/) or read more [angular commit](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit) pattern

## Changelog

See the different releases [here](https://github.com/theo4u/sails-hook-swagger-generator/releases)

## License

MIT License (MIT)
