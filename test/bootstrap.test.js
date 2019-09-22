/**
 * Created by theophy on 02/08/2017.
 */
var Sails = require('sails').Sails;
var swaggerDoc = require('../lib/swaggerDoc');
var assert = require('chai').assert;
var expect = require('chai').expect;
var _ = require('lodash');

describe('Basic tests ::', function () {

  // Var to hold a running sails app instance
  var sails;

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
        swaggergenerator: require('../'),
        // Skip grunt (unless your hook uses it)
        grunt: false
      },
      log: { level: "error" }

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

  describe('Swagger generator', function () {

    it("should make sure tags only have valid properties", function (done) {
      let hook = sails.hooks.swaggergenerator;
      var spec = swaggerDoc(sails, hook._routes, hook);
      for (var i = 0; i < spec.tags.length; i++) {
        expect(_.omit(spec.tags[i], ['name', 'description', 'externalDocs']), 'invalid properties').to.be.empty;
      }

      done();
    });
  });


});
