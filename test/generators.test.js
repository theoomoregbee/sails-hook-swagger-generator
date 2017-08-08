/**
 * Created by theophy on 06/08/2017.
 */
var generators = require("../lib/generators");
var assert = require('chai').assert;
var expect = require('chai').expect;
var _ = require('lodash');


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

        it('should return default parameters with custom parameters', function (done) {
            var custom_parameters = { //we can add up custom parameters here
                PerPageQueryParam: {
                    in: 'query',
                    name: 'perPage',
                    required: false,
                    type: 'integer',
                    description: 'This helps with pagination and when the limit is known for pagify'
                }
            };

            expect(generators.parameters({
                blueprints: {defaultLimit: 30},
                swaggerDoc: {parameters: custom_parameters}
            }, {configKey: 'swaggerDoc'})).to.have.property('PerPageQueryParam');

            done();
        });


    });

    //for routes
    describe('routes', function () {
        it('should contain ', function (done) {
            expect(generators).to.have.property('routes');
            done();
        });

        it('generated route should have this properties assuming custom route(config/route.js) is empty', function (done) {

            var controllers = {
                user: {
                    login: function (req, res) {

                    },
                    logout: function (req, res) {

                    }
                }
            };

            expect(generators.routes(controllers, {}).user[0]).to.have.all.keys('http_method', 'path', 'action', 'keys', 'summary', 'description');
            done();
        });

        it("if controller action in custom route dont't generate route for it again, use the one from the custom", function (done) {
            var controllers = {
                user: {
                    login: function (req, res) {

                    },
                    logout: function (req, res) {

                    }
                }
            };

            expect(_.find(generators.routes(controllers, {'post /user/login': 'UserController.login'}).user, {
                http_method: 'post',
                action: 'login'
            })).to.be.an('object');

            done();
        });

        it('it should generate default blueprint action routes, create, find, findOne, update, destroy', function (done) {
            var controllers = {
                user: {
                    login: function (req, res) {

                    },
                    logout: function (req, res) {

                    }
                }
            };

            expect(_.find(generators.routes(controllers, {'post /user/login': 'UserController.login'}).user, {
                action: 'find',
                http_method: 'get'
            })).to.be.an('object');

            expect(_.find(generators.routes(controllers, {'post /user/login': 'UserController.login'}).user, {
                action: 'findOne',
                http_method: 'get'
            })).to.be.an('object');

            expect(_.find(generators.routes(controllers, {'post /user/login': 'UserController.login'}).user, {
                action: 'update',
                http_method: 'put'
            })).to.be.an('object');

            expect(_.find(generators.routes(controllers, {'post /user/login': 'UserController.login'}).user, {
                action: 'create',
                http_method: 'post'
            })).to.be.an('object');

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