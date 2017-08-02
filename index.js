/**
 * Our hook
 */
var swaggerDoc = require("./lib/swaggerDoc");

module.exports = function (sails) {
    return {

        // Run when sails loads-- be sure and call `next()`.
        initialize: function (next) {
            swaggerDoc(sails);
            return next();
        }

    };
};
