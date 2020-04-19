/* eslint-disable @typescript-eslint/no-empty-function */
import { expect } from 'chai';
import {  parseModels, parseCustomRoutes, parseBindRoutes, mergeCustomAndBindRoutes, parseControllers } from '../lib/parsers';
import { SwaggerSailsModel, BluePrintAction } from '../lib/interfaces';
import parsedRoutesFixture from './fixtures/parsedRoutes.json';
import { bluerprintActions } from '../lib/utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const userModel = require('../../api/models/User');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const routes = require('../../config/routes');


const sailsConfig = {
    paths: {
        models: '../../api/models',
        controllers: '../../api/controllers'
    },
    routes: routes.routes,
    appPath: ''
}

const sails = {
    log: {
        warn: () => {},
        error: ()=> {}
    },
    config: sailsConfig
}

describe ('Parsers', () => {
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

    const boundRoutes = [
        {
            "path": "/user",
            "verb": "get",
            "options": {
              "model": "user",
              "associations": [],
              "detectedVerb": {
                "verb": "",
                "original": "/user",
                "path": "/user"
              },
              "action": "user/find",
              "_middlewareType": "BLUEPRINT: find",
              "skipRegex": []
            }
          },
          {
            "path": "/user/:id",
            "verb": "get",
            "options": {
              "model": "user",
              "associations": [],
              "autoWatch": true,
              "detectedVerb": {
                "verb": "",
                "original": "/user/:id",
                "path": "/user/:id"
              },
              "action": "user/findone",
              "_middlewareType": "BLUEPRINT: findone",
              "skipRegex": [
                {}
              ],
              "skipAssets": true
            }
          },
          {
            "path": "/user/:id",
            "verb": "put",
            "options": {
              "associations": [],
              "autoWatch": true,
              "detectedVerb": {
                "verb": "",
                "original": "/user/:id",
                "path": "/user/:id"
              },
              "action": "user/update",
              "_middlewareType": "BLUEPRINT: update",
              "skipRegex": [
                {}
              ],
              "skipAssets": true
            }
          },
          {
            "path": "/actions2",
            "verb": "get",
            "options": {
              "detectedVerb": {
                "verb": "",
                "original": "/actions2",
                "path": "/actions2"
              },
              "action": "subdir/actions2",
              "_middlewareType": "ACTION: subdir/actions2",
              "skipRegex": []
            }
          }
    ];

    describe ('parseModels', () => {
        it(`should only consider all models except associative tables and 'Archive' model special case `, async () => {
          const parsedModels = await parseModels(sails as unknown as Sails.Sails, sails.config as Sails.Config, models as unknown as SwaggerSailsModel[])
            expect(Object.keys(parsedModels).length).to.equal(1);
            expect(parsedModels['user'],'key parsed models with their globalId').to.be.ok;
        })

        it('should load and merge swagger specification in /models/{globalId} with the model.swagger attribute', async () => {
          const parsedModels = await parseModels(sails as unknown as Sails.Sails, sails.config as Sails.Config, models as unknown as SwaggerSailsModel[])
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
            expect(parsedModels.user.swagger.tags, 'should merge tags from swagger doc with Model.swagger.tags').to.deep.equal(expectedTags);
            expect(parsedModels.user.swagger.components, 'should merge components from swagger doc with Model.swagger.components').to.deep.equal({parameters: []});
            expect(parsedModels.user.swagger.actions, 'should convert and merge swagger doc path param to actions').to.contains.keys('findone', 'find');
        })
    })

    describe('parseCustomRoutes', () => {
        it('should parse routes from config/routes.js or sails.routes', done => {
            const actual = parseCustomRoutes(sails.config);
            expect(JSON.stringify(actual)).to.equal(JSON.stringify(parsedRoutesFixture));
            done()
        })
    })

    describe('parseBindRoutes: sails router:bind event',  () => {
        
        it('Should only parse blueprint routes',  async () => {
            const parsedModels = await parseModels(sails as unknown as Sails.Sails, sailsConfig as Sails.Config, models as unknown as SwaggerSailsModel[])
            const actual = parseBindRoutes(boundRoutes as unknown as Sails.Route[], parsedModels, sails as unknown as Sails.Sails);
            expect(actual.every(route => bluerprintActions.includes(route.action as BluePrintAction))).to.be.true;
        })
        it('Should contain route model',  async () => {
            const parsedModels = await parseModels(sails as unknown as Sails.Sails, sailsConfig as Sails.Config, models as unknown as SwaggerSailsModel[])
            const actual = parseBindRoutes(boundRoutes as unknown as Sails.Route[], parsedModels, sails as unknown as Sails.Sails);
            expect(actual.every(route => !!route.model), 'Should return model for all routes');
            const updateUserRoute = actual.find(route => route.action === 'update');
            expect(!!updateUserRoute?.model, 'should parse blueprint routes and auto add model to routes without model').to.be.true;
            expect(updateUserRoute?.path, 'should convert sails path param to swagger param with :id to {id}').to.equal('/user/{id}');
        })
    })

    describe('mergeCustomAndBindRoutes', () => {
        it('should merge both custom and bound routes', async () => {
            const parsedModels = await parseModels(sails as unknown as Sails.Sails, sailsConfig as Sails.Config, models as unknown as SwaggerSailsModel[])
            const parsedBoundRoutes = parseBindRoutes(boundRoutes as unknown as Sails.Route[], parsedModels, sails as unknown as Sails.Sails);
            const parsedCustomRoutes = parseCustomRoutes(sails.config);
            const mergedRoutes = mergeCustomAndBindRoutes(parsedCustomRoutes, parsedBoundRoutes, parsedModels);
            expect(mergedRoutes
                .filter(route => route.controller && route.controller.includes('Controller'))
                .every(route => !!route.model), 'should attach model to custom routes with controller routes if existing').to.be.true;
            expect(mergedRoutes.length, 'merge both custom and bound routes').to.equal(18)
        })
    })

    describe ('parseControllers', () => {
      
      it('should load and merge swagger specification in /controllers/{name} with the controller.swagger attribute', async () => {
        const parsedControllers = await parseControllers(sails as unknown as Sails.Sails, ['UserController'])
        const expectedTags = [
          {
            name: 'Auth Mgt',
            description: 'User management and login'
          },
          {
            name: 'User List',
            description: 'Group just for user list operation',
          }
        ]
          expect(parsedControllers.UserController.swagger.tags, 'should merge tags from swagger doc with Controller.swagger.tags').to.deep.equal(expectedTags);
          expect(parsedControllers.UserController.swagger.components, 'should merge components from swagger doc with Controller.swagger.components').to.deep.equal({parameters: []});
          expect(parsedControllers.UserController.swagger.actions, 'should convert and merge swagger doc path param to actions').to.contains.keys('list', 'logout');
      })
  })
})