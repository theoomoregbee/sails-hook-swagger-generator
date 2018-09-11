/**
 * Our hook
 */
var swaggerDoc = require("./lib/swaggerDoc");

module.exports = function (sails) {
    return {

        defaults: {
            disabled: false,
            __configKey__: {
                swaggerJsonPath: sails.config.appPath + "/swagger/swagger.json",
<<<<<<< HEAD
                swagger: {
                    swagger: '2.0',
                    info: {
=======
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
                        contact: {
                            name: 'Theophilus Omoregbee',
                            url: 'http://github.com/theo4u',
                            email: 'theo4u@ymail.com'
                        },
                        license: {name: 'Apache 2.0', url: 'http://www.apache.org/licenses/LICENSE-2.0.html'},
>>>>>>> a5e58a645333d5c8b5e1026acc83de834f1888a6
                        version: '1.0.0'
                    },
                    host: 'localhost:1337',
                    basePath: '/',
<<<<<<< HEAD
                    externalDocs: {url: ""}
=======
                    externalDocs: {url: 'http://theophilus.ziippii.com'}
>>>>>>> a5e58a645333d5c8b5e1026acc83de834f1888a6
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
