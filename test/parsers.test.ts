import { expect } from 'chai';
import { mergeSwaggerSpec } from '../lib/parsers';


describe ('Parsers', () => {

    describe('mergeSwaggerDoc', () => {
        const destJSON = `{"tags":[{"name":"Users", "description": "dest description"}], 
                           "components": {"schemas": {"Users": {"properties": {}}, "Clients": {}}}}`;
        const sourceJSON = `{"tags":[{"name":"Clients"},{"name":"Users","description":"some fancy description"}],
                            "components": {"schemas": {"Users": {}}}}`;
        const dest = JSON.parse(destJSON); 
        const source = JSON.parse(sourceJSON);
        const actual = mergeSwaggerSpec(dest, source)
        it('should not mutate destination and source swagger attribute', done => {
            expect(dest).to.deep.equal(JSON.parse(destJSON));
            expect(source).to.deep.equal(JSON.parse(sourceJSON));
            done();
        })

        it(' should merge tags and source tag properties should always override destination if a tag is existing', done => {
            expect(actual.tags).to.deep.equal(source.tags) 
            done();
        })

        it('should merge components and source component properties should override component that is existing', done => {
             
            expect(actual.components, 'destination Users schema with properties is updated to take dest {}').to.deep.equal({schemas: {
                Users: {},
                Clients: {}
            }})
            done()
        })
    })

})