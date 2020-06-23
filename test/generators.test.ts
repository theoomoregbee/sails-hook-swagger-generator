import { generateSchemas } from '../lib/generators'
import { expect } from 'chai';
import { map } from 'lodash';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const userModel = require('../../api/models/User');

describe('Generators', () => {

    describe('generateSchemas', () => {
        // TODO: attribute with relationship with other models
        it('should generate OpenAPIV3 accepted schema type', done => {
            map(userModel.attributes, (ai: Sails.AttributeDefinition) => {
              // preprocessing of autoMigrations+validations by Sails will not have been performed
              if(!ai.autoMigrations) ai.autoMigrations = {};
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if((ai as any).columnType) ai.autoMigrations.columnType = (ai as any).columnType;
            });
            const actual = generateSchemas({ user: { ...userModel, globalId: 'User', identity: 'user' } })
            const expected = {
                user: {
                type: "object",
                  allOf: [
                    { '$ref': '#/components/schemas/user-without-required-constraint' },
                    { required: ['names'] },
                  ]
                },
                'user-without-required-constraint': {
                    type: "object",
                    description: "Sails ORM Model **User**",
                    properties: {
                        id: {
                            type: "number",
                            format: "double"
                        },
                        names: {
                            type: "string",
                            example: "First Middle Last"
                        },
                        email: {
                            type: "string",
                            description: "Just any old email"
                        },
                        sex: {
                            type: "string"
                        },
                        ageLimit: {
                            type: "number",
                            format: "double"
                        },
                        "advancedOptions": {
                          "type": "object",
                          "properties": {
                            "useDefaults": {
                              "example": false,
                              "type": "boolean"
                            },
                            "customName": {
                              "example": "foobar",
                              "type": "string"
                            }
                          },
                          "example": {
                            "useDefaults": false,
                            "customName": "foobar"
                          }
                        },
                        "advancedOptionsAny": {
                          "example": {
                            "useDefaults": false,
                            "customName": "foobar again"
                          }
                        },
                        "data": {
                          "type": "object",
                          "properties": {
                            "lots": {
                              "example": "lot",
                              "type": "string"
                            },
                            "data": {
                              "example": [
                                3,
                                4,
                                5
                              ],
                              "type": "array",
                              "items": {
                                "type": "integer",
                                "format": "int64"
                              }
                            },
                            "more": {
                              "example": [
                                3.3,
                                2.344
                              ],
                              "type": "array",
                              "items": {
                                "type": "number",
                                "format": "double"
                              }
                            },
                            "andMore": {
                              "example": [
                                "mixed",
                                3,
                                true
                              ],
                              "type": "array",
                              "items": {
                                "anyOf": [
                                  {
                                    "type": "string"
                                  },
                                  {
                                    "type": "integer",
                                    "format": "int64"
                                  },
                                  {
                                    "type": "boolean"
                                  }
                                ]
                              }
                            }
                          },
                          "description": "Some custom JSON data",
                          "example": {
                            "lots": "lot",
                            "data": [
                              3,
                              4,
                              5
                            ],
                            "more": [
                              3.3,
                              2.344
                            ],
                            "andMore": [
                              "mixed",
                              3,
                              true
                            ]
                          }
                        },
                        pets: {
                          description: "Array of **Pet**'s or array of FK's when creating / updating / not populated",
                          type: "array",
                          items: { '$ref': "#/components/schemas/Pet", }
                        },
                        favouritePet: {
                          description: "JSON dictionary representing the **Pet** instance or FK when creating / updating / not populated",
                          oneOf: [
                            { $ref: "#/components/schemas/Pet" }
                          ]
                        },
                        neighboursPets: {
                          description: "Array of **Pet**'s or array of FK's when creating / updating / not populated",
                          type: "array",
                          items: { '$ref': "#/components/schemas/Pet", }
                        },
                        "createdAt": {
                          "type": "string",
                          "format": "date-time",
                          "description": "Note Sails special attributes: autoCreatedAt"
                        },
                        "updatedAt": {
                          "type": "string",
                          "format": "date-time",
                          "description": "Note Sails special attributes: autoUpdatedAt"
                        },
                    }
                }
            }
            expect(actual).to.deep.equal(expected)
            done()
        })
    })

})
