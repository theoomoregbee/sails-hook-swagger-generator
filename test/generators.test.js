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

        it("if controller action in custom route don't generate route for it again, use the one from the custom", function (done) {
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

        var controllers = {
            user: {
                login: function (req, res) {

                },
                logout: function (req, res) {

                },
                list: function (req, res) {

                }
            }
        };

        var models = {
            user: {
                attributes: {
                    name: {type: 'string', required: true}
                },
                identity: 'user',
                globalId: 'User'
            }
        };
        var generatedRoutes = generators.routes(controllers, {'get /user/phone/:phoneNumber': 'UserController.phone'});
        var tags = generators.tags(models);
        var actual = generators.paths(generatedRoutes, tags, {list: [{$ref: '#/parameters/PerPageQueryParam'}]});


        it('should follow the swagger standardized url format of  "/route instead of /route/ or route/"', function (done) {
            assert.containsAllDeepKeys(actual, ['/user/login', '/user/{id}'], "should have this url pattern");
            expect(actual).to.not.have.property('user/login');
            expect(actual).to.not.have.property('/user/{id}/');

            done();
        });

        it('every route must contain tags which must be the globalId of the model', function (done) {
            assert.deepEqual(actual['/user/login'].get.tags, [models.user.globalId], "The tag must be array of the globalId ");
            done();
        });

        it('all route should produce and consume application/json', function (done) {
            expect(actual['/user/login'].get.produces).to.have.members(['application/json']);
            expect(actual['/user/login'].get.consumes).to.have.members(['application/json']);
            done();
        });

        it('should handle the different types of response', function (done) {
            expect(actual['/user/login'].get.responses).to.have.all.keys(200, 404, 500);
            done();
        });

        it('should custom blueprint mapping should override default parameter mapping', function (done) {
            assert.notIncludeDeepMembers(actual['/user/list'].get.parameters, [{$ref: '#/parameters/TokenHeaderParam'}], "should not contain token header param since it was overridden");
            done();
        });

        it('all route should hold the token header parameter, in case that routes needs authentication, if overridden above test case, it wont add', function (done) {
            expect(actual['/user/logout'].get.parameters).to.have.deep.members([{$ref: '#/parameters/TokenHeaderParam'}]);
            done();
        });

        it('should add form body for default blueprints actions like create and update', function (done) {
            expect(_.find(actual['/user'].post.parameters, {name: 'body', in: 'body'})).to.be.an('object');
            expect(_.find(actual['/user/{id}'].put.parameters, {name: 'body', in: 'body'})).to.be.an('object');
            done();
        });


        it('should make sure every route keys has a corresponding path type of parameter', function (done) {
            expect(_.find(actual['/user/phone/{phoneNumber}'].get.parameters, {
                name: 'phoneNumber',
                in: 'path'
            })).to.be.an('object');
            expect(_.find(actual['/user/{id}'].get.parameters, {$ref: '#/parameters/IDPathParam'})).to.be.an('object');
            done();
        });

    });
})
;