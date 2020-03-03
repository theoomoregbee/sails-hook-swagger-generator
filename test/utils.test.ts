import path from 'path';
import { expect } from 'chai';
import { mergeSwaggerSpec, mergeSwaggerPaths, loadSwaggerDocComments } from '../lib/utils';

const sailsConfig = {
    paths: {
        models: '../../api/models'
    }
}

describe ('Utils', () => {

    describe('mergeSwaggerDoc', () => {
        const destJSON = `{
            "tags": [
              {
                "name": "Users",
                "description": "dest description"
              }
            ],
            "components": {
              "schemas": {
                "Users": {
                  "properties": {}
                },
                "Clients": {}
              }
            }
          }`
        const sourceJSON = `{
            "tags": [
              {
                "name": "Clients"
              },
              {
                "name": "Users",
                "description": "some fancy description"
              }
            ],
            "components": {
              "schemas": {
                "Users": {}
              }
            }
          }`;
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

    describe('mergeSwaggerPaths', () => {
        const dest = {find: {
            description: 'something about description',
            summary: 'summary about find'
        }}
        const source = {'/find': {
            description: 'something with /'
        }} 
        const merged = mergeSwaggerPaths(dest, source)
        it('should remove only leading / from merged paths', done => {
            expect(Object.keys(merged).every(key => key.charAt(0) !== '/')).to.be.true;
            done()
        })

        it('should merge and take /find and find action as the same', done => {
            expect(Object.keys(merged), 'contain only one key after merging').to.deep.equal(['find']);
            expect(merged.find, 'contain both source and destination keys').to.have.all.keys('summary', 'description')
            expect(merged.find.description, 'source should override destination params').to.equal(source['/find'].description);
            done()
        })
    })

    describe('loadSwaggerDocComments', async () => {
        const fixturePath = require.resolve(path.join(sailsConfig.paths.models,'User'))
        const doc = await loadSwaggerDocComments(fixturePath);
        it('should generate openapi v3.0.0 spec doc from swagger-doc comment', done => {
            expect(doc.openapi).equal('3.0.0');
            done()
        });
    })

})