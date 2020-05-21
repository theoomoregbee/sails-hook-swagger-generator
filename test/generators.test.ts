import { generateSwaggerPath, generateSchemas } from '../lib/generators'
import { expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const userModel = require('../../api/models/User');

describe('Generators', () => {

    describe('generateSwaggerPath', () => {
        it('should return swagger open api version path', done => {
            const params = generateSwaggerPath('/pets/:id')
            expect(params.path).to.equal('/pets/{id}')
            done()
        })

        it('should return path params as variables', done => {
            const params = generateSwaggerPath('/pets/:id/:anotherID')
            expect(params.variables).to.deep.equal(['id', 'anotherID'])
            done()
        })
    })

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
