/**
 * Created by theophy on 06/08/2017.
 */
var generators = require("../lib/generators");
var parser = require("../lib/parsers");
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

        it('should not allow empty required array, instead it should be out instead of empty array -- avoiding swagger Semantic error ', function (done) {
            var models = {
                user: {
                    attributes: {
                        name: {type: 'string'} //no required this time
                    },
                    identity: 'user',
                    globalId: 'User'
                }
            };

            expect(generators.definitions(models).user).to.not.have.property('required');
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

        var controllers = {
            user: {
                login: function (req, res) {

                },
                logout: function (req, res) {

                }
            },
            base: {
                clear: function (req, res) { //this is a service that does general stuff so we don't need a model for it

                }
            }
        };
        var models = {
            user: {
                attributes: {},
                identity: 'user',
                globalId: 'User'
            }
        };

        var tags = generators.tags(models);

        it('generated route should have this properties assuming custom route(config/route.js) is empty', function (done) {

            expect(generators.routes(controllers, {routes: {}}).user[0]).to.have.all.keys('http_method', 'path', 'action', 'keys', 'summary', 'description');
            done();
        });

        it("if controller action in custom route don't generate route for it again, use the one from the custom", function (done) {

            expect(_.find(generators.routes(controllers, {routes: {'post /user/login': 'UserController.login'}}).user, {
                http_method: 'post',
                action: 'login'
            })).to.be.an('object');

            done();
        });

        it('it should generate default blueprint action routes, create, find, findOne, update, destroy for routes with model or tag', function (done) {

            expect(_.find(generators.routes(controllers, {routes: {'post /user/login': 'UserController.login'}}, tags).user, {
                action: 'find',
                http_method: 'get'
            })).to.be.an('object');

            expect(_.find(generators.routes(controllers, {routes: {'post /user/login': 'UserController.login'}}, tags).user, {
                action: 'findOne',
                http_method: 'get'
            })).to.be.an('object');

            expect(_.find(generators.routes(controllers, {routes: {'post /user/login': 'UserController.login'}}, tags).user, {
                action: 'update',
                http_method: 'put'
            })).to.be.an('object');

            expect(_.find(generators.routes(controllers, {routes: {'post /user/login': 'UserController.login'}}, tags).user, {
                action: 'create',
                http_method: 'post'
            })).to.be.an('object');


            /**
             * should not have any of these since no model for 'base'
             */
            expect(_.find(generators.routes(controllers, {routes: {'post /base/clear': 'BaseController.clear'}}, tags).base, {
                action: 'find',
                http_method: 'get'
            })).to.be.undefined;

            expect(_.find(generators.routes(controllers, {routes: {'post /base/clear': 'BaseController.clear'}}, tags).base, {
                action: 'findOne',
                http_method: 'get'
            })).to.be.undefined;

            expect(_.find(generators.routes(controllers, {routes: {'post /base/clear': 'BaseController.clear'}}, tags).base, {
                action: 'update',
                http_method: 'put'
            })).to.be.undefined;

            expect(_.find(generators.routes(controllers, {routes: {'post /base/clear': 'BaseController.clear'}}, tags).base, {
                action: 'create',
                http_method: 'post'
            })).to.be.undefined;


            done();
        });


        it('should allow default methods(actions) name in a controller with no model or tag but not the one created by us', function (done) {
            controllers.base['find'] = function (req, res) {

            };
            expect(_.find(generators.routes(controllers, {routes: {'post /base/clear': 'BaseController.clear'}}, tags).base, {
                action: 'find',
                http_method: 'get'
            })).to.be.an('object');

            done();
        });

        it('should not override default blueprints path, http_method even if found in a controller and it has model or tag', function (done) {

            controllers.user['update'] = function (req, res) {
            };

            expect(_.find(generators.routes(controllers, {routes: {}}, tags).user, {
                action: 'update',
                http_method: 'put'
            })).to.be.an('object');
            done();
        });


        it('should not generate default rest routes if blueprint.rest is false', function (done) {

            var config = {routes: {}, blueprints: {rest: false}};

            var controllers = {
                user: {
                    login: function (req, res) {

                    },
                    logout: function (req, res) {

                    }
                }
            };

            var routes = generators.routes(controllers, config, tags).user;

            expect(_.find(routes, {
                action: 'create',
                http_method: 'post'
            }), "POST /user -> UserController.create").to.be.undefined;

            expect(_.find(routes, {
                action: 'find',
                http_method: 'get'
            }), "GET /user -> UserController.find").to.be.undefined;

            expect(_.find(routes, {
                action: 'findOne',
                http_method: 'get'
            }), "GET /user/:id -> UserController.findOne").to.be.undefined;

            expect(_.find(routes, {
                action: 'update',
                http_method: 'put'
            }), "PUT /user/:id -> UserController.update").to.be.undefined;

            expect(_.find(routes, {
                action: 'destroy',
                http_method: 'delete'
            }), "DELETE /user/:id -> UserController.destroy").to.be.undefined;

            done();
        });

        it('should generate default rest routes with restPrefix blueprints argument', function (done) {

            var config = {routes: {}, blueprints: {rest: true, restPrefix: '/api'}};

            var controllers = {
              user: {
                login: function (req, res) {

                },
                logout: function (req, res) {

                }
              }
            };

            var routes = generators.routes(controllers, config, tags).user;

            expect(_.find(routes, {
              action: 'create',
              http_method: 'post',
              path: '/api/user'
            })).to.be.not.undefined;

            expect(_.find(routes, {
              action: 'find',
              http_method: 'get',
              path: '/api/user'
            })).to.be.not.undefined;

            expect(_.find(routes, {
              action: 'findOne',
              http_method: 'get',
              path: '/api/user/{id}'
            })).to.be.not.undefined;

            expect(_.find(routes, {
              action: 'update',
              http_method: 'put',
              path: '/api/user/{id}'
            })).to.be.not.undefined;

            expect(_.find(routes, {
              action: 'destroy',
              http_method: 'delete',
              path: '/api/user/{id}'
            })).to.be.not.undefined;

            done();
        });

        it('should generate default rest routes with prefix blueprints argument', function (done) {

            var config = {routes: {}, blueprints: {rest: true, prefix: '/root'}};

            var controllers = {
              user: {
                login: function (req, res) {

                },
                logout: function (req, res) {

                }
              }
            };

            var routes = generators.routes(controllers, config, tags).user;

            expect(_.find(routes, {
              action: 'create',
              http_method: 'post',
              path: '/root/user'
            })).to.be.not.undefined;

            expect(_.find(routes, {
              action: 'find',
              http_method: 'get',
              path: '/root/user'
            })).to.be.not.undefined;

            expect(_.find(routes, {
              action: 'findOne',
              http_method: 'get',
              path: '/root/user/{id}'
            })).to.be.not.undefined;

            expect(_.find(routes, {
              action: 'update',
              http_method: 'put',
              path: '/root/user/{id}'
            })).to.be.not.undefined;

            expect(_.find(routes, {
              action: 'destroy',
              http_method: 'delete',
              path: '/root/user/{id}'
            })).to.be.not.undefined;

            done();
        });

      it('should generate default rest routes with prefix and restPrefix blueprints argument', function (done) {

        var config = {routes: {}, blueprints: {rest: true, prefix: '/root', restPrefix: '/api'}};

        var controllers = {
          user: {
            login: function (req, res) {

            },
            logout: function (req, res) {

            }
          }
        };

        var routes = generators.routes(controllers, config, tags).user;

        expect(_.find(routes, {
          action: 'create',
          http_method: 'post',
          path: '/root/api/user'
        })).to.be.not.undefined;

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
            },
            base: { //a controller without model
                clear: function (req, res) {

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
      var tags = generators.tags(models);
      const modifiedAttr = {nameModified: {type: 'string', required: true}}
      var generatedRoutes = generators.routes(controllers, {routes: {
        'get /user/phone/:phoneNumber': 'UserController.phone',
        'get /user/phone/:phoneNumber/call': 'UserController.phone',
        'post /user': {
            controller: 'UserController',
            action: 'create',
            swagger: {
                body: modifiedAttr
            }
        },
        'put /user/:id': {
            controller: 'UserController',
            action: 'update',
            swagger: {
                body: modifiedAttr
            }
        }
      }}, tags);
        var actual = generators.paths(generatedRoutes, tags, {list: [{$ref: '#/parameters/PerPageQueryParam'}]});

        it('should not create default paths like create, find, findOne, update and destroy for routes without models', function (done) {
            expect(actual).to.not.have.property('/base'); //for destroy, find
            expect(actual).to.not.have.property('/base/{id}'); //for findOne, update
            done();
        });

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

      it('should not allow multiple body param in a route', function (done){
        const postParam = actual['/user'].post.parameters;
        const body = [];
        _.forEach(postParam, function (param){
          if(param.name === 'body'){
            body.push(param)
          }
        })
        expect(body).to.have.lengthOf(1, 'Multiple body parameters are not allowed in POST')
        const putParam = actual['/user/{id}'].put.parameters;
        const bodyPut = [];
        _.forEach(putParam, function (param){
          if(param.name === 'body'){
            bodyPut.push(param)
          }
        })
        expect(bodyPut).to.have.lengthOf(1, 'Multiple body parameters are not allowed in Put')
        done();
      });


        it('should make sure every route keys has a corresponding path type of parameter', function (done) {
            expect(_.find(actual['/user/phone/{phoneNumber}'].get.parameters, {
                name: 'phoneNumber',
                in: 'path'
            })).to.be.an('object');
          expect(_.find(actual['/user/phone/{phoneNumber}/call'].get.parameters, {
                name: 'phoneNumber',
                in: 'path'
            })).to.be.an('object');
            expect(_.find(actual['/user/{id}'].get.parameters, {$ref: '#/parameters/IDPathParam'})).to.be.an('object');
            done();
        });

    });
    //for custom parameter addition from routes.js
    describe('custom parameters', function(done) {

      var models = {
        user: {
          attributes: {
            name: {
              type: 'string',
              required: true
            }
          },
          identity: 'user',
          globalId: 'User'
        },
      };

      var controllers = {
        user: {
          view: function(req, res) {

          },
        },
        base: { //a controller without model
          clear: function(req, res) {

          }
        }
      };
      var swaggerObjectUser = {
        parameters: [{ in: 'query',
          name: 'firstName',
          required: true,
          type: 'string',
          description: 'This is a custom required parameter'
        }]
      };

      var swaggerObjectBase = {
        parameters: [{
          name: 'data'
        }]
      };
      var tags = generators.tags(models);
      var generatedRoutes = generators.routes(controllers, {
        routes: {
          'post /user/view': {
            controller: 'UserController',
            action: 'view',
            swagger: swaggerObjectUser
          },
          'get /base/clear': {
            controller: 'BaseController',
            action: 'clear',
            swagger: swaggerObjectBase
          }
        },
        blueprints: {
          rest: false
        }
      }, tags);
      var actual = generators.paths(generatedRoutes, tags);

      it('should contain', function(done) {
        expect(generators).to.have.property('parameters');
        done();
      });

      it('should increase the number of parameters after adding custom parameter', function(done) {
        expect(actual['/user/view'].post.parameters).to.have.length(2);
        done();
      });

      it('should override and create new parameter when blueprint is false', function(done) {
        expect(actual['/user/view'].post.parameters).to.have.deep.members([{
          "$ref": "#/parameters/TokenHeaderParam"
        }, swaggerObjectUser.parameters[0]]);
        done();
      });

      it('should generate custom parameter with default details', function(done) {
        expect(actual['/base/clear'].get.parameters).to.have.deep.members([{
          "$ref": "#/parameters/TokenHeaderParam"
        }, { in: 'parameters',
          name: 'data',
          required: false,
          type: 'string',
          description: 'This is a custom param for data'
        }]);
        done();
      });
    });
})
;
