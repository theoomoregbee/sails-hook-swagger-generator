# Swagger Generator Sails Hook
[![Travis](https://img.shields.io/travis/theo4u/sails-hook-swagger-generator.svg)]()
[![npm](https://img.shields.io/npm/v/sails-hook-swagger-generator.svg)](https://www.npmjs.com/package/sails-hook-swagger-generator)
[![npm](https://img.shields.io/npm/l/express.svg)]()
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)


This helps to create swagger documentation json which is based entirely on swagger specification [Specifications](https://swagger.io/specification/).

![](screenshot/swagger-doc.gif)


## Installation
```sh
$ npm install sails-hook-swagger-generator --save
```

## Usage
Just install the library and `sails lift`, the moment you do, that's all check your **./swagger** folder, it should be there and make sure this folder is already existing.

![](screenshot/nuh_uh_conan_obrien.gif)



## Example
check the **./swagger/swagger.json** for sample generated swagger documentation json, then head to [Swagger Editor](http://editor.swagger.io/)

## Configurations
It comes with some default settings which can be override by creating **config/swaggergenerator.js**
```javascript
module.exports["swagger-generator"] = {
    swaggerJsonPath: "./swagger/swagger.json",
    parameters: { //we can add up custom parameters here
        PerPageQueryParam: {
            in: 'query',
            name: 'perPage',
            required: false,
            type: 'integer',
            description: 'This helps with pagination and when the limit is known for pagify'
        }
    },
    blueprint_parameters: {list: [{$ref: '#/parameters/PerPageQueryParam'}]},//we can add custom blueprint action to parameters binding here, any specified overrides default created
    swagger: {
        swagger: '2.0',
        info: {
            title: 'Swagger Json',
            description: 'This is a generated swagger json for your sails project',
            termsOfService: 'http://example.com/terms',
            contact: {name: 'Theophilus Omoregbee', url: 'http://github.com/theo4u', email: 'theo4u@ymail.com'},
            license: {name: 'Apache 2.0', url: 'http://www.apache.org/licenses/LICENSE-2.0.html'},
            version: '1.0.0'
        },
        host: 'localhost:1337',
        basePath: '/',
        externalDocs: {url: 'http://theophilus.ziippii.com'}
    }
};
```
* **swaggerJsonPath** where to generate the `swagger.json` file to, default to `sails.config.appPath + "/swagger/swagger.json"`
* **parameters** we can create your own custom parameter to be referenced by api service methods and it's totally based on swagger specification for parameter object. Any one added here is added to the default parameters which are
```javascript
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
```
* **blueprint_parameters** is a map between blueprint action and list of parameters and it's based on referencing of a particular parameter which can be any of this *WhereQueryParam*, *LimitQueryParam*, *SkipQueryParam*, *SortQueryParam*, *PopulateQueryParam*, *PageQueryParam*, *SelectQueryParam*, *TokenHeaderParam*, *IDPathParam* and the ones created under the **parameters** above. Any array of parameter mapped to a blueprint action overrides the default mapped parameters.
* **Swagger** object is used to hold necessary information needed by swagger to run our mock test of api services. Check swagger specification for more, incase you want to extend it.

## Custom Route Configuration
If you want to add extra configuration to a route, it can be done via the `config/routes.js`, since sails uses any of this two route pattern
* `'http_method route':'controller.action'` or
* `'http_method route':{controller:'controller', action:'action'}`

We can extend and add extra information on the second above for sails hook swagger generator to override default properties(which is created from the first). Adding an object with a key **swagger** will do the trick.

```javascript
{
  'post /user/login': {
    controller: 'UserController',
    action: 'login',
    swagger: {
      summary: 'Authentication',
      description: 'This is for authentication of any user',
      body: {
        username: { type: 'string', required: true },
        password: { type: 'password', required: true }
      },
      query: [{
        $ref: '#/parameters/IDPathParam'
      }],
      parameters: [{
        in: 'query',
        name: 'firstName',
        required: true,
        type: 'string',
        description: 'This is a custom required parameter'
      }]
    }
  }
}
```

### Properties of swagger
* **summary**: for adding your own custom summary, e.g Authentication
* **description**: for giving detailed description about the api service method, e.g This is for authentication of any type of user
* **body**: if the route is taking in form post, and it follows our normal attribute from [sails model](http://sailsjs.com/documentation/concepts/models-and-orm/attributes)
* **query**: for any query you expecting from the user consuming the service method, you can also reference the default created above (*WhereQueryParam*, *LimitQueryParam*, *SkipQueryParam*, *SortQueryParam*, *PopulateQueryParam*, *PageQueryParam*, *SelectQueryParam*, *TokenHeaderParam*, *IDPathParam*) and add your own following the swagger specification.
* We can also add custom personalized **parameters** if required.

**NB** it overrides the default route params attached from the sails generator



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
* [ ] read info about a control using machine-as-action [#4](https://github.com/theo4u/sails-hook-swagger-generator/issues/4)

## Contribute

Fork this repo and push in your ideas.
Do not forget to add a bit of test(s) of what value you adding.
* stick to conventional commit message [here](https://conventionalcommits.org/) or read more [angular commit](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit) pattern

## Changelog

See the different releases [here](https://github.com/theo4u/sails-hook-swagger-generator/releases)

## License

MIT License (MIT)
