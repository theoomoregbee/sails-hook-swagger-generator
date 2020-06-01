import { generateSchemas } from '../lib/generators'
import { expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const userModel = require('../../api/models/User');

describe('Generators', () => {

    describe('generateSchemas', () => {
        // TODO: attribute with relationship with other models
        it('should generate OpenAPIV3 accepted schema type', done => {
            const actual = generateSchemas({ user: { ...userModel, globalId: 'User', identity: 'user' } })
            const expected = {
                user: {
                    description: "Sails ORM Model **User**",
                    required: ['names'],
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
                    }
                }
            }
            expect(actual).to.deep.equal(expected)
            done()
        })
    })

})
