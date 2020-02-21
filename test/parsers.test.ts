import { expect } from 'chai';
import { mergeSwaggerSpec } from '../lib/parsers';


describe ('Parsers', () => {

    describe('mergeSwaggerDoc', () => {
        it('should not mutate destination and source swagger attribute', done => {
            const dest = {tags: [{name: 'Users'}]}
            const source = {tags: [{name: 'Clients'}]}
            mergeSwaggerSpec(dest, source)
            expect(source).to.deep.equal({tags: [{name: 'Clients'}]})
            expect(dest).to.deep.equal({tags: [{name: 'Users'}]})
            done()
        })
    })

    // describe('Parse models', ()=> {

    // })


})