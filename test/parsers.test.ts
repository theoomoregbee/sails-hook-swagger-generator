/* eslint-disable @typescript-eslint/no-empty-function */
import { expect } from 'chai';
import { parseModels, parseBoundRoutes, parseControllers, parseControllerJsDoc, parseModelsJsDoc } from '../lib/parsers';
import { BluePrintAction, MiddlewareType, SwaggerSailsControllers, NameKeyMap, SwaggerControllerAttribute, SwaggerModelAttribute, SwaggerSailsModel } from '../lib/interfaces';
import { blueprintActions } from '../lib/utils';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const userModel = require('../../api/models/User');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const routes = require('../../config/routes');


const sailsConfig = {
    paths: {
        models: path.resolve('./api/models'),
        controllers: path.resolve('./api/controllers')
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
} as unknown as Sails.Sails;

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
            const parsedModels = parseModels(sails);
            expect(Object.keys(parsedModels).length).to.equal(1);
            expect(parsedModels['user'],'key parsed models with their globalId').to.be.ok;
        })

        it('should load and merge swagger specification in /models/{globalId} with the model.swagger attribute', async () => {
          const parsedModels = parseModels(sails);
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

    describe ('parseModelsJsDoc', () => {


      let parsedModels: NameKeyMap<SwaggerSailsModel>;
      let modelsJsDoc: NameKeyMap<SwaggerModelAttribute>;

      before(async () => {
        parsedModels = parseModels(sails);
        modelsJsDoc = await parseModelsJsDoc(sails, parsedModels);
      })

      it('should parse `tags` from model JSDoc', () => {
        const expected = [{
          name: 'User (ORM)',
          description: 'A longer, multi-paragraph description\nexplaining how this all works.\n\nIt is linked to more information.\n',
          externalDocs: { url: 'https://somewhere.com/yep', description: 'Refer to these docs' }
        }];
        expect(modelsJsDoc.user.tags).to.deep.equal(expected);
      })

      it('should parse `components` from model JSDoc', () => {
        const expected = { examples: { modelDummy: { summary: 'A model example example', value: 'dummy' } } };
        expect(modelsJsDoc.user.components).to.deep.equal(expected);
      })

      it('should parse model JSDoc for blueprint actions', () => {
        const expected = {
          find: { description: '_Alternate description_: Find a list of **User** records that match the specified criteria.\n' },
          allactions: { externalDocs: { description: 'Refer to these docs for more info', url: 'https://somewhere.com/yep' } },
         };
        expect(modelsJsDoc.user.actions).to.deep.equal(expected);
      })

    })

    describe('parseBoundRoutes: sails router:bind events',  () => {

        it('Should only parse blueprint and action routes',  async () => {
            const parsedModels = parseModels(sails);
            const actual = parseBoundRoutes(boundRoutes as unknown as Sails.Route[], parsedModels, sails);
            const expectedPaths = [ '/user', '/user/:id', '/user/:id', '/actions2' ];
            expect(actual.map(r => r.path)).to.deep.equal(expectedPaths);
            expect(actual.every(route => {
              if(route.middlewareType === MiddlewareType.BLUEPRINT) {
                return blueprintActions.includes(route.blueprintAction as BluePrintAction);
              } else {
                return route.middlewareType === MiddlewareType.ACTION;
              }
            })).to.be.true;
        })

        it('Should contain route model for all blueprint routes',  async () => {
            const parsedModels = parseModels(sails);
            const actual = parseBoundRoutes(boundRoutes as unknown as Sails.Route[], parsedModels, sails);
            const expectedPaths = [ '/user', '/user/:id', '/user/:id' ];
            expect(actual.filter(route => route.middlewareType == MiddlewareType.BLUEPRINT && !!route.model).map(r => r.path), 'should return model for all blueprint routes').to.deep.equal(expectedPaths);
            const updateUserRoute = actual.find(route => route.blueprintAction === 'update');
            expect(!!updateUserRoute?.model, 'should parse blueprint routes and auto add model to routes without model (based on action)').to.be.true;
        })

    })

    describe ('parseControllers', () => {

      let parsedControllers: SwaggerSailsControllers;

      before(async () => {
        parsedControllers = await parseControllers(sails);
      })

      describe('load and parse `swagger` element exports in controller files', () => {

        it('should parse `tags` from controller swagger element', () => {
          const expected = [{ name: 'User List', description: 'Group just for user list operation', }];
          expect(parsedControllers.controllerFiles.user.swagger.tags).to.deep.equal(expected);
        })

        it('should parse `components` from controller swagger element', () => {
          expect(parsedControllers.controllerFiles.user.swagger.components).to.deep.equal({ parameters: [] });
        })

        it('should parse controller swagger element for actions', () => {
          expect(parsedControllers.controllerFiles.user.swagger.actions).to.contains.keys('list');
        })

      })

      describe('load and parse `swagger` element expoerts in actions2 files', () => {

        it('should parse `tags` from actions2 action swagger element', () => {
          const expected = [{ name: 'Actions2 Group', description: 'A test actions2 group', }];
          expect(parsedControllers.controllerFiles['subdir/actions2'].swagger.tags).to.deep.equal(expected);
        })

        it('should parse `components` from actions2 action swagger element', () => {
          expect(parsedControllers.controllerFiles['subdir/actions2'].swagger.components).to.deep.equal({ parameters: [] });
        })

        it('should parse actions2 action swagger element for actions', () => {
          expect(parsedControllers.controllerFiles['subdir/actions2'].swagger.actions).to.contains.keys('actions2');
        })

      })

    })

    describe('parseControllerJsDoc', () => {

      let parsedControllers: SwaggerSailsControllers;
      let controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>;

      before(async () => {
        parsedControllers = await parseControllers(sails);
        controllersJsDoc = await parseControllerJsDoc(sails, parsedControllers);
      })

      describe('load and parse JSDoc comments in controller files', () => {

        it('should parse `tags` from controller JSDoc', () => {
          const expected = [ { name: 'Auth Mgt', description: 'User management and login' } ];
          expect(controllersJsDoc.user.tags).to.deep.equal(expected);
        })

        it('should parse `components` from controller JSDoc', () => {
          const expected = { examples: { dummy: { summary: 'An example example', value: 3.0 } } };
          expect(controllersJsDoc.user.components).to.deep.equal(expected);
        })

        it('should parse controller JSDoc for actions', () => {
          expect(controllersJsDoc.user.actions).to.contains.keys('logout');
        })
      })

      describe('load and parse JSDoc comments in actions2 files', () => {

        it('should parse `tags` from actions2 JSDoc', () => {
          const expectedTagsActions2 = [
            { name: 'Actions2 Mgt', description: 'Actions2 testing' },
          ];
          expect(controllersJsDoc['subdir/actions2'].tags).to.deep.equal(expectedTagsActions2);
        })

        it('should parse `components` from actions2 JSDoc', () => {
          const expected = { examples: { dummyA2: { summary: 'Another example example', value: 4 } } };
          expect(controllersJsDoc['subdir/actions2'].components).to.deep.equal(expected);
        })

        it('should parse actions2 JSDoc', () => {
          expect(controllersJsDoc['subdir/actions2'].actions).to.contains.keys('actions2');
        })

      })

    })

})
