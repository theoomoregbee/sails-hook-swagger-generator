# Swagger Generator Sails Hook
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
module.exports.swaggergenerator = {
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

## Contribute

Fork this repo and push in your ideas.
Do not forget to add a bit of test(s) of what value you adding.


## Changelog

See the different releases [here](https://github.com/theo4u/sails-hook-swagger-generator/releases)

## Licence

The MIT License (MIT)

Copyright (c) 2017 theo4u & Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.



