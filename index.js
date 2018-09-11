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
                swagger: {
                    swagger: '2.0',
                    info: {
                        version: '1.0.0'
                    },
                    host: 'localhost:1337',
                    basePath: '/',
                    externalDocs: {url: ""}
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
