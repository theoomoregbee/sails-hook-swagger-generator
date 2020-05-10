/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Created by theophy on 02/08/2017.
 */
const Sails = require('sails').Sails;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const swaggergenerator = require('../');

describe('Basic tests ::', function () {

  // Var to hold a running sails app instance
  let sails: any;

  // Before running any tests, attempt to lift Sails
  before(function (done) {

    // Hook will timeout in 10 seconds
    this.timeout(11000);

    // Attempt to lift sails
    Sails().lift({
      blueprints: {
        shortcuts: false,
      },
      hooks: {
        // Load the hook
        swaggergenerator,
        // Skip grunt (unless your hook uses it)
        grunt: false
      },
      log: { level: "silent" }

    }, function (err: any, _sails: any) {
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
