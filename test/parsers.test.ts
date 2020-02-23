import path from 'path';
import { expect } from 'chai';
import { mergeSwaggerSpec, parseModels, loadSwaggerDocComments, mergeSwaggerPaths } from '../lib/parsers';
import { SwaggerSailsModel } from '../lib/interfaces';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const userModel = require('../../api/models/User');


const sailsConfig = {
    paths: {
        models: '../../api/models'
    }
}

describe ('Parsers', () => {

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

    describe ('parseModels', async () => {
        const models = [

            {
                globalId: 'User',
                ...userModel
            },
            {
                attributes: {}
            },
            {
                globalId: 'Archive'
            }
        ]
        const parsedModels = await parseModels(sailsConfig as Sails.Config, models as unknown as SwaggerSailsModel[])
        it(`should only consider all models except associative tables and 'Archive' model special case `, done => {
            expect(Object.keys(parsedModels).length).to.equal(1);
            expect(parsedModels['User'],'key parsed models with their globalId').to.be.ok;
            done()
        })

        it('should load and merge swagger specification in /models/{globalId} with the model.swagger attribute', done => {
            const expectedTags = [
                {
                    "name": "User (ORM)",
                    "description": "A longer, multi-paragraph description\nexplaining how this all works.\n\nIt is linked to more information.\n",
                    "externalDocs": {
                        "url": "https://somewhere.com/yep",
                        "description": "Refer to these docs"
                    }
                },
                {
                    "name": "User (ORM duplicate)",
                    "externalDocs": {
                        "url": "https://somewhere.com/alternate",
                        "description": "Refer to these alternate docs"
                    }
                }
            ]
            expect(parsedModels.User.swagger.tags, 'should merge tags from swagger doc with Model.swagger.tags').to.deep.equal(expectedTags);
            expect(parsedModels.User.swagger.components, 'should merge components from swagger doc with Model.swagger.components').to.deep.equal({parameters: []});
            expect(parsedModels.User.swagger.actions, 'should convert and merge swagger doc path param to actions').to.contains.keys('findone', 'find');
            done()
        })
    })

})