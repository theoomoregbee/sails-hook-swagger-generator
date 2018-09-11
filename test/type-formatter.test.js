/**
 * Created by theophy on 06/08/2017.
 */
var type_formatter = require("../lib/type-formatter");
var assert = require('chai').assert;
var expect = require('chai').expect;


describe('Type Formatter', function () {

    it('it should be an object', function (done) {
        expect(type_formatter).to.be.an('object');

        done();
    });

    //for attribute types
    describe('Attribute types', function () {
        it('should contain ', function (done) {
            expect(type_formatter).to.have.property('attribute_type');
            done();
        });

        it('If what is passed as argument is not among our swagger types, use default "string"', function (done) {
            assert.strictEqual(type_formatter.attribute_type(''), type_formatter.attribute_type('string'));
            done();
        });

        it('should return object with just type and format(optional, for some types)', function (done) {
            var type = type_formatter.attribute_type('');
            expect(type).to.be.an('object');
            expect(type).to.have.property('type'); //must contain type

            if (Object.keys(type).length === 2) {
                expect(type).to.have.property('format'); //2nd key must be format and nothing else
            }

            if (Object.keys(type).length > 2) {
                expect(Object.keys(type)).to.have.lengthOf(2); //must be of length 2 of type and or format
            }

            done();
        });
    });

    //for validation types
    describe('Validation types', function () {
        it('should contain ', function (done) {
            expect(type_formatter).to.have.property('validation_type');
            done();
        });

        it('should return a string among the allowed types or undefined for not allowed types', function (done) {
            expect(type_formatter.validation_type('max')).to.be.a('string');
            expect(type_formatter.validation_type('')).to.be.an('undefined');
            done();
        });
    });

    //for blueprint parameters mapping
    describe('Blueprint parameter', function () {
        it('should contain ', function (done) {
            expect(type_formatter).to.have.property('blueprint_parameter');
            done();
        });

        it('should return array of passed action or undefined for no parameter that matched the action', function (done) {
            expect(type_formatter.blueprint_parameter('find', {})).to.be.an('array');
            expect(type_formatter.blueprint_parameter('PerPageQueryParam', {})).to.be.an('undefined');
            done();
        });

        it('custom map should override defaults mapping', function (done) {
            var find = type_formatter.blueprint_parameter('find', {});
            var custom_map = {find: [{$ref: '#/parameters/WhereQueryParam'}]};
            var find2 = type_formatter.blueprint_parameter('find', custom_map);

            assert.notStrictEqual(find, find2, 'After applying custom map both should not be same');
            assert.strictEqual(find2, custom_map.find, 'This should be same and not find again');

            done();
        });
    });


});