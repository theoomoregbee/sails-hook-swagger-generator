/**
 * Our hook
 */

module.exports = function (sails) {
    return {

        // Run when sails loads-- be sure and call `next()`.
        initialize: function (next) {

            return next();
        }

    };
};
