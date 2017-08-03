/**
 * Our hook
 */
var swaggerDoc = require("./lib/swaggerDoc");

module.exports = function (sails) {
    return {

        defaults: {
            __configKey__: {
                parameters: {},//we can add up custom parameters here
                blueprint_parameters: {list: ['']},//we can add custom blueprint action to parameters binding here, any specified overrides default created
                swagger: {
                    openapi: '',
                    info: {
                        title: '',
                        description: '',
                        termsOfService: 'http://example.com/terms',
                        contact: {name: 'Theophilus Omoregbee', url: 'github.com/theo4u', email: 'theo4u@ymail.com'},
                        license: {name: 'Apache 2.0', url: 'http://www.apache.org/licenses/LICENSE-2.0.html'},
                        version: '1.0.0'
                    },
                    servers: [
                        {url: 'http://localhost:1337/', description: 'Local server'},
                        {url: 'http://plutus.glosskode.com', description: 'Development server'}
                    ],
                    externalDocs: {}
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
