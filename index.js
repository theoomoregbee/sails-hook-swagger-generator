/**
 * Our hook
 */
var swaggerDoc = require("./lib/swaggerDoc");

module.exports = function (sails) {
    return {

        defaults: {
            __configKey__: {
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
                    host:'localhost:1337',
                    basePath:'/',
                    externalDocs: {url: 'http://theophilus.ziippii.com'}
                }
            }
        },
        // Run when sails loads-- be sure and call `next()`.
        initialize: function (next) {
            swaggerDoc(sails, this);
            return next();
        }

    };
};
