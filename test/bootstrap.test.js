/**
 * Created by theophy on 02/08/2017.
 */
var Sails = require('sails').Sails;

describe('Basic tests ::', function () {

    // Var to hold a running sails app instance
    var sails;

    // Before running any tests, attempt to lift Sails
    before(function (done) {

        // Hook will timeout in 10 seconds
        this.timeout(11000);

        // Attempt to lift sails
        Sails().lift({
            hooks: {
                // Load the hook
                "swaggerdoc": require('../'),
                // Skip grunt (unless your hook uses it)
                "grunt": false

            },
            log: {level: "error"}

        }, function (err, _sails) {
            if (err) return done(err);
            sails = _sails;
            return done();

        });

    });

    // After tests are complete, lower Sails
    after(function (done) {

        // Lower Sails (if it successfully lifted)
        if (sails) {
            return sails.lower(done);
        }
        // Otherwise just return
        return done();

    });

    // Test that Sails can lift with the hook in place
    it('sails does not crash on loading our hook', function () {
        return true;
    });


});
