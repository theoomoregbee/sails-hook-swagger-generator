/**
 * Created by theophy on 06/08/2017.
 */
var parser = require("../lib/parsers");
var formatters = require('../lib/type-formatter');
const chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;


describe('Parser', function () {

    it('it should be an object', function (done) {
        expect(parser).to.be.an('object');

        done();
    });

    //for attribute parsing
    describe('Parse Attributes', function () {
        it('should contain', function (done) {
            expect(parser).to.have.property('attributes');
            done();
        });

        it('should return object with just properties', function (done) {
            var model_attributes = {
                name: {
                    type: 'string',
                    required: true
                },
                gender: {
                    type: 'string',
                    enum: ['Male', 'Female']
                },
                ageLimit: {
                    type: 'integer',
                    max: 100,
                    min: 18
                },
                roles: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
            };
            var attributes = parser.attributes(model_attributes);
            expect(attributes).to.be.an('object');
            expect(attributes).to.have.all.keys('properties', 'required');
            expect(Object.keys(attributes)).to.have.lengthOf(2); //must be of length 2 of properties and or required

            assert.deepEqual(attributes.required, ['name'], 'It should be an array containing the required attributes name or key');

            var expected_properties = {};
            //if it's among our swagger allowed types
            expected_properties['name'] = _.clone(formatters.attribute_type(model_attributes.name.type));
            expected_properties['gender'] = _.clone(formatters.attribute_type(model_attributes.gender.type));
            expected_properties['ageLimit'] = _.clone(formatters.attribute_type(model_attributes.ageLimit.type));
            expected_properties['roles'] = _.clone(formatters.attribute_type(model_attributes.roles.type));

            //if the rules is among our allowed swagger rules
            expected_properties['gender'][formatters.validation_type('enum')] = model_attributes.gender.enum;
            expected_properties['ageLimit'][formatters.validation_type('max')] = model_attributes.ageLimit.max;
            expected_properties['ageLimit'][formatters.validation_type('min')] = model_attributes.ageLimit.min;
            expected_properties['roles'][formatters.validation_type('items')] = model_attributes.roles.items;

            assert.deepEqual(attributes.properties, expected_properties, 'It should look exactly like this, following swagger specification');

            done();
        });

        it('parsed attributes should not contain required field when no required attribute is passed ', function (done) {
            var model_attributes = {
                name: {
                    type: 'string'
                },
                gender: {
                    type: 'string',
                    enum: ['Male', 'Female']
                },
                ageLimit: {
                    type: 'integer',
                    max: 100,
                    min: 18
                }
            };
            var attributes = parser.attributes(model_attributes);
            expect(attributes).to.not.have.property('required');
            done();
        });

    });

    //for route parsing
    describe('Parse Routes', function () {
        it('should contain', function (done) {
            expect(parser).to.have.property('routes');
            done();
        });

        describe('should handle the 3 type of route pattern', function () {
            var expected_route = {
                user: [{
                    http_method: 'post',
                    path: '/user/login',
                    action: 'login',
                    keys: [],
                    summary: '',
                    description: '',
                    body: {},
                    query: [],
                    custom: true
                }]
            };

            // TODO: Going to fix it soon to follow Sails Routes Address which means for a path allow any CRUD method (GET, PUT, POST, DELETE or PATCH) when a method is not specified
            var expected_route2 = {
                user: [{
                    http_method: 'post',
                    path: '/user/login',
                    action: 'login',
                    keys: [],
                    summary: '',
                    description: '',
                    body: {},
                    query: [],
                    custom: true
                },
                    {
                        http_method: 'get',
                        path: '/user/login',
                        action: 'login',
                        keys: [],
                        summary: '',
                        description: '',
                        query: [],
                        custom: true
                    },
                    {
                        http_method: 'put',
                        path: '/user/login',
                        action: 'login',
                        keys: [],
                        summary: '',
                        description: '',
                        body: {},
                        query: [],
                        custom: true
                    },
                    {
                        http_method: 'delete',
                        path: '/user/login',
                        action: 'login',
                        keys: [],
                        summary: '',
                        description: '',
                        query: [],
                        custom: true
                    },
                    {
                        http_method: 'patch',
                        path: '/user/login',
                        action: 'login',
                        keys: [],
                        summary: '',
                        description: '',
                        query: [],
                        custom: true
                    }

                ]
            };

            it("should handle basic route pattern, 'method path':'controller.action'", function (done) {
                assert.deepEqual(parser.routes({'post /user/login': 'UserController.login'}), expected_route, "Should return exactly the above properties for each route");
                done();
            });

            it("should handle basic route pattern, 'method path':{controller:'UserController', action:'login'}", function (done) {

                assert.deepEqual(parser.routes({
                    'post /user/login': {
                        controller: 'UserController',
                        action: 'login'
                    }
                }), expected_route, "Should return exactly the above properties for each route");
                done();
            });

            it("should handle basic route pattern, 'path':'controller.action'", function (done) {
                assert.deepEqual(parser.routes({'/user/login': 'UserController.login'}), expected_route2, "Should return exactly the above properties for each route");
                done();
            });

        });


        it('should parse path params to keys', function (done) {
            var route = parser.routes({'put /user/:id/:model': 'UserController.update'});
            assert.deepEqual(route.user[0].keys, ['id', 'model'], 'It should be an array containing the path param as keys');
            done();
        });

        it('should be able to extend swagger object in each route which overrides default route properties', function (done) {
            var default_route = parser.routes({'post /user/login': 'UserController.login'});

            var actual_parsed_route = parser.routes({
                'post /user/login': {
                    controller: 'UserController',
                    action: 'login',
                    swagger: {
                        summary: 'Authentication',
                        description: 'This is for authentication of any user',
                        body: {
                            username: {type: 'string', required: true},
                            password: {type: 'password', required: true}
                        },
                        query: [{$ref: '#/parameters/IDPathParam'}]
                    }
                }
            });

            assert.notDeepEqual(actual_parsed_route, default_route, "should not be same, since swagger object would overrides our default without swagger");
            done();
        });

        it('should not contain body in methods other than post and put', function (done) {

            var actual_parsed_route = parser.routes({
                'post /user/login': {
                    controller: 'UserController',
                    action: 'login',
                    swagger: {
                        body: {
                            username: {type: 'string', required: true},
                            password: {type: 'password', required: true}
                        },
                        query: [{$ref: '#/parameters/IDPathParam'}]
                    }
                },
                'put /user/:id': {
                    controller: 'UserController',
                    action: 'update',
                    swagger: {
                        body: {
                            name: {type: 'string'}
                        }
                    }
                },
                'get /user/login': {
                    controller: 'UserController',
                    action: 'login',
                    swagger: {
                        body: {
                            names: {type: 'string'}
                        }
                    }
                }
            });

            expect(actual_parsed_route.user[0], "Since method is post, body is needed").to.have.property('body');
            expect(actual_parsed_route.user[1], "Since method is put, body is needed").to.have.property('body');
            expect(actual_parsed_route.user[2], "Since method is get, body is not needed").to.not.have.property('body');

            done();
        });

    });


})
;
