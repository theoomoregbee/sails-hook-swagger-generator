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
Simply by lifting your sails app `sails lift`, after lifting or starting the app,there should be `swagger.json` within **./swagger** folder.

> make sure ./swagger folder is already existing.


## Example
Check the **./swagger/swagger.json** for generated swagger documentation json, then head to [Swagger Editor](http://editor.swagger.io/).

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
   functions, model definitions and model attribute definitions. A `swagger` must be of type [SwaggerAttribute](./lib/interfaces.ts#L42)
1. Adding JSDoc ([swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)) `@swagger` comments to controller/action files and model files.

Top-level Swagger/OpenAPI definitions for `tags` and `components` may be added in all `swagger` objects
above and in all JSDoc `@swagger` documentation comments. This enables the definition of top-level elements.

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

1. Adding an object with the key `swagger`(must be of type [OpenApi.Operation](./types/openapi.d.ts#L99)) to individual route configurations in `config/routes.js`.
1. Adding an object with the key `swagger`(must be of type [SwaggerAttribute](./lib/interfaces.ts#L42)) to the exports of a model file, controller file, standalone action file or actions2 file.
1. Adding JSDoc `@swagger` comments to Sails
  [model files](https://sailsjs.com/documentation/concepts/models-and-orm/models),
  [controller files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?controllers),
  [standalone action files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?standalone-actions) or
  [actions2 files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?actions-2); specifically:
    - JSDoc `@swagger` documentation under the `/{actionName}` path for the route, or
    - JSDoc `@swagger` documentation under `tags` and `components` paths for adding to the top-level Swagger/OpenAPI definitions.


### Custom Route Configuration in `config/routes.js`

If you want to add extra configuration to a route, it can be done via the `config/routes.js`, since Sails uses different [route targets](https://sailsjs.com/documentation/concepts/routes/custom-routes#?route-target), we can leverage the route object target to extend/override our swagger configuration by adding an object with a key `swagger`.

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

### Custom Route Configuration in Controller or Action files

Documentation detail and customisation of most aspects of the generated Swagger may be added to
[controller files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?controllers),
[standalone action files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?standalone-actions) or
[actions2 files](https://sailsjs.com/documentation/concepts/actions-and-controllers#?actions-2) as follows:

1. Adding an object with the key `swagger` added to a controller file action function.
1. Adding an object with the key `swagger` to the exports of a controller file, standalone action file or actions2 file: 
   - For controller files, actions are referenced by adding objects keyed on `swagger.actions.{actionName}` name. See [UserController.js](./api/controllers/UserController.js),
   - For standalone action or actions2 files, placing content in the `swagger.actions.{actionName|actions2Name}` object. See [actions2.js](./api/controllers/subdir/actions2.js) 
   - Adding documentation under `tags` and `components` elements for adding to the top-level Swagger/OpenAPI definitions. See example in either [UserController.js](./api/controllers/UserController.js) or [actions2.js](./api/controllers/subdir/actions2.js)  
1. Adding JSDoc `@swagger` comments to controller file, standalone action file or actions2 file:
   - JSDoc `@swagger` documentation under the `/{actionName}` path for the route, or
   - JSDoc `@swagger` documentation under `tags` and `components` paths for adding to the top-level Swagger/OpenAPI definitions.

#### For actions2 files:
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
      actions: {
        tokens: {
            tags: [ 'Auth' ],
            description: 'Route description...'
        }
      }
      tags: [
             {
                name: 'Auth',
                description: 'Module description ...',
             }
        ],
      components: {
        ...
      }
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
   - Adding per-action documentation by adding objects keyed on `actions.{blueprintAction}` name.
   - Adding documentation under `tags` and `components` elements for adding to the top-level Swagger/OpenAPI definitions.
1. Adding specific fields to model attributes (supports `description`, `externalDocs` and `example`).
   Note that applicable Sails [attributes](https://sailsjs.com/documentation/concepts/models-and-orm/attributes),
   [automigrations](https://sailsjs.com/documentation/concepts/models-and-orm/attributes#?automigrations) and
   [validations](https://sailsjs.com/documentation/concepts/models-and-orm/validations) are also parsed.
1. JSDoc `@swagger` documentation under the `/{globalId}` path for models.
1. JSDoc `@swagger` per-action documentation under the `/{blueprintAction}` path for the
  [model blueprint actions](https://sailsjs.com/documentation/concepts/blueprints/blueprint-actions).
1. JSDoc `@swagger` documentation under `tags` and `components` paths for adding to the top-level Swagger definitions.

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
    actions{
      create: { ... },
    }
    tags: [...]
    components: {...}
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

All `swagger` objects may contain the elements `tags` and `components`(*except the ones specified in `config.routes.js*) e.g.

```javascript
{
  tags: [
    {
      name: 'Test Module',
      description: 'Module description ...',
      externalDocs: { url: 'https://docs.com/test' }
    }
  ],
  components: {
    schemas: {
      test: { ... }
    }
  }
}
```

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
Each route is described by a `SwaggerRouteInfo` object
(see defintion [here](./lib/interfaces.ts#L126)):

```typescript
export interface SwaggerRouteInfo {
    middlewareType?: MiddlewareType;

    tags: Array<Tag>;
    model?: SwaggerSailsModel;
    swagger?: OpenApi.Operation;

    controller?: string;
    action: string;

    verb: HTTPMethodVerb;
    path: string;
    variables: string[];

    associations: Sails.RouteAssociation[];
    alias?: string;
    aliases: string[];
    associationsPrimaryKeyAttribute: AssociationPrimaryKeyAttribute[];
}
```

Sails **models** are described by a `SwaggerSailsModel` object
(see defintion [here](./lib/interfaces.ts#L48)):

```typescript
export interface SwaggerSailsModel extends Omit<Sails.Model, 'attributes'> {
    attributes: Record<string, Sails.AttributeValue & {
        description?: string;
        externalDocs?: OpenApi.ExternalDoc;
        example?: string;
    }>;
    swagger: SwaggerAttribute;
}
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
 npm install
```
* Then run test

```sh
npm test
```

## Contribute

Fork this repo and push in your ideas.
Do not forget to add a bit of test(s) of what value you adding.
* stick to conventional commit message [here](https://conventionalcommits.org/) or read more [angular commit](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit) pattern
* While developing, you can run the below command to start nodemon watch too run linting and testing on `.ts` changes

```sh
npm run dev 
```

## Changelog

See the different releases [here](https://github.com/theo4u/sails-hook-swagger-generator/releases)

## License

MIT License (MIT)
