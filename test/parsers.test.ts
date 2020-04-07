import { expect } from 'chai';
import {  parseModels, parseCustomRoutes, parseBindRoutes } from '../lib/parsers';
import { SwaggerSailsModel } from '../lib/interfaces';
import parsedRoutesFixture from './fixtures/parsedRoutes.json';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const userModel = require('../../api/models/User');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const routes = require('../../config/routes');


const sailsConfig = {
    paths: {
        models: '../../api/models'
    },
    routes: routes.routes,
    appPath: ''
}

describe ('Parsers', () => {

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

    describe('parseCustomRoutes', () => {
        it('should parse routes from config/routes.js or sails.routes', done => {
            const actual = parseCustomRoutes(sailsConfig);
            expect(JSON.stringify(actual)).to.equal(JSON.stringify(parsedRoutesFixture));
            done()
        })
    })

    describe('parseBindRoutes', () => {
        it('should parse routes from sails router:bind event', done => {
            // use fixture and check if the returned has some of the things we expected
            // const actual = parseBindRoutes(sailsConfig);
            // expect(JSON.stringify(actual)).to.equal(JSON.stringify(parsedRoutesFixture));
            done()
        })
    })

})