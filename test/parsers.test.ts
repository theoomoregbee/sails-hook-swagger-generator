/* eslint-disable @typescript-eslint/no-empty-function */
import { expect } from 'chai';
import {  parseModels, parseBoundRoutes, parseControllers } from '../lib/parsers';
import { SwaggerSailsModel, BluePrintAction, MiddlewareType } from '../lib/interfaces';
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

    const models = {
        user: {
            globalId: 'User',
            ...userModel
        },
        dummy: {
            attributes: {}
        },
        archive: {
            globalId: 'Archive'
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sails as any).models = models;

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
          },
          {
            // eslint-disable-next-line @typescript-eslint/camelcase
            path: /^\/app\/.*$/,
            target: '[Function]',
            verb: 'get',
            options: {
              detectedVerb: { verb: '', original: 'r|^/app/.*$|', path: 'r|^/app/.*$|' },
              skipAssets: true,
              view: 'pages/homepage',
              locals: { layout: false },
              skipRegex: [/^[^?]*\/[^?/]+\.[^?/]+(\?.*)?$/]
            },
            originalFn: { /* [Function: serveView] */ _middlewareType: 'FUNCTION: serveView' }
          }
    ];

    describe ('parseModels', () => {
        it(`should only consider all models except associative tables and 'Archive' model special case`, async () => {
            const parsedModels = parseModels(sails as unknown as Sails.Sails);
            expect(Object.keys(parsedModels).length).to.equal(1);
            expect(parsedModels['user'],'key parsed models with their globalId').to.be.ok;
        })

        it('should load and merge swagger specification in /models/{globalId} with the model.swagger attribute', async () => {
          const parsedModels = parseModels(sails as unknown as Sails.Sails);
            const expectedTags = [
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
            expect(parsedModels.user.swagger.actions, 'should convert and merge swagger doc path param to actions').to.contains.keys('findone');
        })
    })

    describe('parseBoundRoutes: sails router:bind events',  () => {

        it('Should only parse blueprint and action routes',  async () => {
            const parsedModels = parseModels(sails as unknown as Sails.Sails);
            const actual = parseBoundRoutes(boundRoutes as unknown as Sails.Route[], parsedModels, sails as unknown as Sails.Sails);
            const expectedPaths = [ '/user', '/user/:id', '/user/:id', '/actions2' ];
            expect(actual.map(r => r.path)).to.deep.equal(expectedPaths);
            expect(actual.every(route => {
              if(route.middlewareType === MiddlewareType.BLUEPRINT) {
                return bluerprintActions.includes(route.action as BluePrintAction);
              } else {
                return route.middlewareType === MiddlewareType.ACTION;
              }
            })).to.be.true;
        })

        it('Should contain route model for all blueprint routes',  async () => {
            const parsedModels = parseModels(sails as unknown as Sails.Sails);
            const actual = parseBoundRoutes(boundRoutes as unknown as Sails.Route[], parsedModels, sails as unknown as Sails.Sails);
            const expectedPaths = [ '/user', '/user/:id', '/user/:id' ];
            expect(actual.filter(route => route.middlewareType == MiddlewareType.BLUEPRINT && !!route.model).map(r => r.path), 'should return model for all blueprint routes').to.deep.equal(expectedPaths);
            const updateUserRoute = actual.find(route => route.action === 'update');
            expect(!!updateUserRoute?.model, 'should parse blueprint routes and auto add model to routes without model (based on action)').to.be.true;
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

      it('Action2: should load and merge swagger specification in /controllers/{action2-name} with the action2.swagger attribute', async () => {
        const parsedControllers = await parseControllers(sails as unknown as Sails.Sails, ['subdir/actions2'])
        const expectedTags = [
          {
            name: 'Action2 Mgt',
            description: 'Action2 testing'
          },
          {
            name: 'Actions2 Group',
            description: 'A test actions2 group',
          }
        ]
          expect(parsedControllers['subdir/actions2'].swagger.tags, 'should merge tags from swagger doc with Action2.swagger.tags').to.deep.equal(expectedTags);
          expect(parsedControllers['subdir/actions2'].swagger.components, 'should merge components from swagger doc with Action2.swagger.components').to.deep.equal({parameters: []});
          expect(parsedControllers['subdir/actions2'].swagger.actions, 'should convert and merge swagger doc path param to actions').to.contains.keys('actions2');
      })
  })
})
