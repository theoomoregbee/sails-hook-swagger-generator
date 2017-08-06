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
    })

});