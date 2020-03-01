import { generateSwaggerPath } from '../lib/generators'
import { expect } from 'chai';

describe ('Generators', () => {

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

})