import path from 'path';
import { expect } from 'chai';
import { mergeSwaggerSpec, mergeSwaggerPaths, loadSwaggerDocComments, normalizeRouteControllerName, normalizeRouteControllerTarget, removeViewRoutes, getSwaggerAction, mergeComponents, mergeTags, getActionNameFromPath } from '../lib/utils';
import { SwaggerActionAttribute, NameKeyMap, SwaggerSailsModel, SwaggerSailsController } from '../lib/interfaces';
import { OpenApi } from '../types/openapi';

const sailsConfig = {
    paths: {
        models: '../../api/models'
    }
}

describe('Utils', () => {

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
            expect(actual.components, 'destination Users schema with properties is updated to take dest {}').to.deep.equal({
                schemas: {
                    Users: {},
                    Clients: {}
                }
            })
            done()
        })
    })

    describe('mergeSwaggerPaths', () => {
        const dest = {
            find: {
                description: 'something about description',
                summary: 'summary about find'
            }
        }
        const source = {
            '/find': {
                description: 'something with /'
            }
        }
        const merged = mergeSwaggerPaths(dest as unknown as NameKeyMap<SwaggerActionAttribute>, source as unknown as NameKeyMap<SwaggerActionAttribute>)
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

    describe('loadSwaggerDocComments', () => {
        const fixturePath = require.resolve(path.join(sailsConfig.paths.models, 'User'))
        let doc: OpenApi.OpenApi;
        before(async () => {
          doc = await loadSwaggerDocComments(fixturePath);
        });
        it('should generate openapi v3.0.0 spec doc from swagger-doc comment', done => {
            expect(doc.openapi).equal('3.0.0');
            done()
        });
    })

    describe('removeViewRoutes', () => {
        it('should remove route targets with views', done => {
            expect(removeViewRoutes({
                'path/:id': 'address.foo',
                'get users/:id': { action: 'index' },
                'get users/me': { view: 'brochure/about' }
            })).to.deep.equal({
                'path/:id': 'address.foo',
                'get users/:id': { action: 'index' },
            })
            done();
        })
    })

    describe('normalizeRouteControllerName', () => {
        it('should normalize undefined route controller name to undefined', done => {
            expect(normalizeRouteControllerName(undefined)).to.undefined;
            done();
        })
        it('should normalize route controller name from foo to FooController', done => {
            expect(normalizeRouteControllerName('foo')).to.equal('FooController');
            done();
        })
        it('should normalize route controller name from FooController to FooController', done => {
            expect(normalizeRouteControllerName('FooController')).to.equal('FooController');
            done();
        })
    })

    describe('normalizeRouteControllerTarget', () => {
        it('should normalize FooController.myGoAction', done => {
            expect(normalizeRouteControllerTarget('FooController.myGoAction')).to.deep.equal({ controller: 'FooController', action: 'myGoAction' })
            done();
        })
        it('should normalize foo.myGoAction', done => {
            expect(normalizeRouteControllerTarget('foo.myGoAction')).to.deep.equal({ controller: 'FooController', action: 'myGoAction' })
            done();
        })
        it('should normalize foo/go-action', done => {
            expect(normalizeRouteControllerTarget('foo/go-action')).to.deep.equal({ action: 'foo/go-action' })
            done();
        })
        it(`should normalize {action: 'index'}`, done => {
            expect(normalizeRouteControllerTarget({ action: 'index' })).to.deep.equal({ action: 'index', controller: undefined, swagger: undefined })
            done();
        })
        it(`should normalize {action: 'foo/go-action'}`, done => {
            expect(normalizeRouteControllerTarget({ action: 'foo/go-action' })).to.deep.equal({ action: 'foo/go-action', controller: undefined, swagger: undefined })
            done();
        })

        it('should throw type error if route target is not among the accepted pattern', done => {
            expect(() => normalizeRouteControllerTarget('something-bind')).throw()
            done()
        })
    })

    describe('getSwaggerAction', () => {
        it('should not throw if model or controller is undefined', done => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const object: any = undefined
            expect(getSwaggerAction(object, 'example/action')).to.equal(undefined);
            done()
        })
        it('should return action if it exist in either model or controller', done => {
            const action = { ke: 'string' }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const object: any = { swagger: { actions: { action } } }
            expect(getSwaggerAction(object, 'action')).to.deep.equal(action);
            done()
        })
    })

    const models = {
        user: {
            swagger: {
                components: {
                    schemas: { modelSchema: {} }
                },
                tags: [{ name: 'modelTag' }]
            }
        }
    } as unknown as NameKeyMap<SwaggerSailsModel>
    const controllers = {
        UserController: {
            swagger: {
                components: {
                    schemas: { controllerSchema: {} }
                },
                tags: [{ name: 'controllerTag' }]
            }
        }
    } as unknown as NameKeyMap<SwaggerSailsController>
    const action2 = {
        'action/action2': {
            swagger: {
                components: {
                    schemas: { action2Schema: {} }
                },
                tags: [{ name: 'action2Tag' }]
            }
        }
    } as unknown as NameKeyMap<SwaggerSailsController>
    describe('mergeComponents', () => {
        it(`should merge models,controllers and action2 swagger.components if it's existing`, done => {
            const components = { schemas: { existingSchema: {} } } as OpenApi.Components
            const actual = mergeComponents(components, models, controllers, action2)
            expect(Object.keys(actual.schemas!)).to.deep.equal(['existingSchema', 'modelSchema', 'controllerSchema', 'action2Schema'], 'merge components props to existing components')
            done()
        })
    })

    describe('mergeTags', () => {
        it(`should merge models,controllers and action2 swagger.tags if it's existing`, done => {
            const tags = [{ name: 'existing' }]
            const actual = mergeTags(tags, models, controllers, action2)
            expect(actual).to.deep.equal([tags[0], models.user.swagger!.tags![0], controllers.UserController.swagger!.tags![0], action2['action/action2'].swagger!.tags![0]], 'merge tags props to existing tags')
            done()
        })
    })

    describe('getActionNameFromPath', () => {
        it('should get action2 filename from action2path', done => {
            expect(getActionNameFromPath('subdir/actions2')).to.be.equal('actions2');
            done();
        })
    })

})
