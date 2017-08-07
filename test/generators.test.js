/**
 * Created by theophy on 06/08/2017.
 */
var generators = require("../lib/generators");
var assert = require('chai').assert;
var expect = require('chai').expect;


describe('Generators', function () {

    it('it should be an object', function (done) {
        expect(generators).to.be.an('object');
        done();
    });

    //for tags
    describe('tags', function () {
        it('should contain ', function (done) {
            expect(generators).to.have.property('tags');
            done();
        });

        it('should generate an array of models which contains name(globalId) and identity', function (done) {
            var models = {
                user: {
                    attributes: {},
                    identity: 'user',
                    globalId: 'User'
                }
            };

            expect(generators.tags(models)).to.be.an('array').to.have.deep.members([{
                name: models.user.globalId,
                identity: models.user.identity
            }]);

            done();
        });

    });

    //for definitions
    describe('definitions', function () {
        it('should contain ', function (done) {
            expect(generators).to.have.property('definitions');
            done();
        });

        it('should generate an object of definitions which contains the schemas for each of our model', function (done) {
            var models = {
                user: {
                    attributes: {
                        name: {type: 'string', required: true}
                    },
                    identity: 'user',
                    globalId: 'User'
                }
            };

            expect(generators.definitions(models)).to.be.an('object').to.have.deep.property('user', {
                properties: {name: {type: 'string'}},
                required: ['name']
            });

            done();
        });

        it('should not generate definition for models with no globalId, Ignoring associative tables', function (done) {
            var models = {
                user: {
                    attributes: {
                        name: {type: 'string', required: true}
                    },
                    identity: 'user'
                }
            };

            expect(generators.definitions(models)).to.not.have.property('user');
            done();
        });
    });

    //for parameters
    describe('parameters', function () {
        it('should contain ', function (done) {
            expect(generators).to.have.property('parameters');
            done();
        });
    });

    //for routes
    describe('routes', function () {
        it('should contain ', function (done) {
            expect(generators).to.have.property('routes');
            done();
        });
    });

    //for paths
    describe('paths', function () {
        it('should contain ', function (done) {
            expect(generators).to.have.property('paths');
            done();
        });
    });
});