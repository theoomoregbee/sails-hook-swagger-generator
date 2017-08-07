/**
 * Created by theophy on 06/08/2017.
 */
var parser = require("../lib/parsers");
var formatters = require('../lib/type-formatter');
const chai = require('chai');
const assertArrays = require('chai-arrays');
chai.use(assertArrays);
var assert = chai.assert;
var expect = chai.expect;


describe('Parser', function () {

    it('it should be an object', function (done) {
        expect(parser).to.be.an('object');

        done();
    });

    //for attribute types
    describe('Parse Attributes', function () {
        it('should contain', function (done) {
            expect(parser).to.have.property('attributes');
            done();
        });

        it('should return object with just properties and required keys', function (done) {
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
                }
            };
            var attributes = parser.attributes(model_attributes);
            expect(attributes).to.be.an('object');
            expect(attributes).to.have.all.keys('properties', 'required');
            expect(Object.keys(attributes)).to.have.lengthOf(2); //must be of length 2 of properties and or required

            // assert.equal(attributes.required, ['name'], 'It should be an array containing the required attributes name or key');

            expect(attributes.required).to.be.containingAllOf(['name']);

            var expected_properties = {};
            //if it's among our swagger allowed types
            expected_properties['name'] = _.clone(formatters.attribute_type(model_attributes.name.type));
            expected_properties['gender'] = _.clone(formatters.attribute_type(model_attributes.gender.type));
            expected_properties['ageLimit'] = _.clone(formatters.attribute_type(model_attributes.ageLimit.type));

            //if the rules is among our allowed swagger rules
            expected_properties['gender'][formatters.validation_type('enum')] = model_attributes.gender.enum;
            expected_properties['ageLimit'][formatters.validation_type('max')] = model_attributes.ageLimit.max;
            expected_properties['ageLimit'][formatters.validation_type('min')] = model_attributes.ageLimit.min;

            assert.notStrictEqual(expected_properties, attributes.properties, 'It should look exactly like this, following swagger specification');

            done();
        });
    });

});