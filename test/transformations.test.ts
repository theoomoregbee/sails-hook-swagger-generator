import { expect } from 'chai';
import { NameKeyMap, SwaggerSailsModel, SwaggerModelAttribute, SwaggerControllerAttribute, SwaggerSailsControllers, SwaggerRouteInfo } from '../lib/interfaces';
import { OpenApi } from '../types/openapi';
import { mergeComponents, mergeTags, mergeModelJsDoc, mergeControllerJsDoc, transformSailsPathsToSwaggerPaths, aggregateAssociationRoutes, mergeControllerSwaggerIntoRouteInfo } from '../lib/transformations';
import { cloneDeep, defaults } from 'lodash';
import { generateDefaultModelTags } from '../lib/generators';

import parsedRoutesFixture from './fixtures/parsedRoutes.json';

const sails = {
  log: {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      warn: () => {},
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      error: ()=> {}
  },
} as unknown as Sails.Sails;

describe('Transformations', () => {

  describe('transformSailsPathsToSwaggerPaths', () => {
    it('should convert `/:id` paths to `/{id}` paths (for all such variables)', () => {

      const inputPaths = [
        '/user',
        '/actions2',
        '/user/login',
        '/user/logout',
        '/user/list',
        '/user/list2',
        '/user/upload',
        '/user/roles',
        '/user/test/:phoneNumber',
        '/clients/:client_id/user/:id',
        '/user',
        '/user/:id',
        '/user/:id',
        '/user/:id?'
      ];

      const expectedOutputPaths = [
        '/user',
        '/actions2',
        '/user/login',
        '/user/logout',
        '/user/list',
        '/user/list2',
        '/user/upload',
        '/user/roles',
        '/user/test/{phoneNumber}',
        '/clients/{client_id}/user/{id}',
        '/user',
        '/user/{id}',
        '/user/{id}',
        '/user/{id}'
      ];

      const routes = inputPaths.map(p => ({ path:p } as SwaggerRouteInfo));
      transformSailsPathsToSwaggerPaths(routes);
      const paths = routes.map(r => r.path);
      expect(paths).to.deep.equal(expectedOutputPaths);

    })
  })

  describe('aggregateAssociationRoutes', () => {
    it('should aggreggate association-based blueprint routes', () => {

      let routes = parsedRoutesFixture as SwaggerRouteInfo[];

      const expectedOutputPaths = [
        '/user',
        '/user',
        '/actions2',
        '/twofind',
        '/twoclear',
        '/user/login',
        '/user/logout',
        '/user/list',
        '/user/list2',
        '/user/upload',
        '/user/roles',
        '/nomodel/deep-url/more/find',
        '/nomodel/deep-url/more/clear',
        '/nomodel/deep-url/more/should_be_excluded',
        '/user/test/{phoneNumber}',
        '/clients/{client_id}/user/{_id}',
        '/oldpet/find',
        '/oldpet/find/{_petID}',
        '/oldpet/create',
        '/oldpet/update/{_petID}',
        '/oldpet/destroy/{_petID}',
        '/pet/find',
        '/pet/find/{_petID}',
        '/pet/create',
        '/pet/update/{_petID}',
        '/pet/destroy/{_petID}',
        '/user/find',
        '/user/find/{_id}',
        '/user/create',
        '/user/update/{_id}',
        '/user/destroy/{_id}',
        '/user/{_id}/{association}/add/{childid}',
        '/user/{_id}/{association}/replace',
        '/user/{_id}/{association}/remove/{childid}',
        '/oldpet',
        '/oldpet/{_petID}',
        '/oldpet',
        '/oldpet/{_petID}',
        '/oldpet/{_petID}',
        '/oldpet/{_petID}',
        '/oldpet/{_petID}/{association}',
        '/pet',
        '/pet/{_petID}',
        '/pet',
        '/pet/{_petID}',
        '/pet/{_petID}',
        '/pet/{_petID}',
        '/pet/{_petID}/{association}',
        '/user',
        '/user/{_id}',
        '/user/{_id}',
        '/user/{_id}',
        '/user/{_id}',
        '/user/{_id}/{association}/{childid}',
        '/user/{_id}/{association}',
        '/user/{_id}/{association}/{childid}',
        '/user/{_id}/{association}',
      ];

      transformSailsPathsToSwaggerPaths(routes);
      routes = aggregateAssociationRoutes(routes);
      const paths = routes.map(r => r.path);
      expect(paths).to.deep.equal(expectedOutputPaths);

    })
  })

  const componentsFromConfiguration = {
    schemas: { existingSchema: {} }
  } as OpenApi.Components;

  const tagsFromConfiguration = [
    { name: 'existing' }
  ];

  const models = {
    user: {
      globalId: 'User',
      identity: 'user',
      primaryKey: 'id',
      attributes: {},
      swagger: {
        components: {
          schemas: { modelSchema: {} }
        },
        tags: [{ name: 'modelTag' }]
      }
    }
  } as NameKeyMap<SwaggerSailsModel>;

  const modelsJsDoc = {
    user: {
      tags: [{ name: 'modelsJsDocTag' }],
      components: {
        examples: { dummy: { summary: 'An example', value: 'dummy' } }
      },
      actions: {
        find: { description: 'Description', parameters: [], responses: {} }
      }
    }
  } as NameKeyMap<SwaggerModelAttribute>;

  const controllers = {
    controllerFiles: {
      user: {
        globalId: 'User',
        identity: 'user',
        actionType: 'controller',
        defaultTagName: 'User',
        swagger: {
          components: {
            schemas: { controllerSchema: {} }
          },
          tags: [{ name: 'controllerTag' }],
          actions: {
            upload: {
              tags: ['controllerTag']
            }
          }
        }
      }
    },
    actions: {
      'user/upload': {
        actionType: 'controller',
        defaultTagName: 'User',
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        fn: () => {},
      }
    },
  } as SwaggerSailsControllers;

  const controllersJsDoc = {
    user: {
      tags: [{ name: 'controllersJsDocTag' }],
      actions: {
        logout: {
          summary: 'Perform Logout',
          description: 'Logout of the application',
          tags: ['Auth Mgt'],
          parameters:
            [{
              name: 'example-only',
              description: 'Username to use for logout (dummy for test)',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }],
          responses: { '200': { description: 'logout result' } }
        }
      }
    }
  } as NameKeyMap<SwaggerControllerAttribute>;

  describe('mergeModelJsDoc', () => {
    it('should merge model JSDoc `actions` and `model` elements into model `swagger` element', () => {
      const destModels = cloneDeep(models);
      mergeModelJsDoc(destModels, modelsJsDoc);
      const expected = cloneDeep(models);
      defaults(expected.user.swagger, {
        actions: cloneDeep(modelsJsDoc.user.actions)
      });
      expect(destModels).to.deep.equal(expected);
    })
  })

  describe('mergeControllerJsDoc', () => {
    it('should merge model JSDoc `actions` and `model` elements into model `swagger` element', () => {
      const destControllers = cloneDeep(controllers);
      mergeControllerJsDoc(destControllers, controllersJsDoc);
      const expected = cloneDeep(controllers);
      defaults(expected.controllerFiles.user!.swagger.actions, cloneDeep(controllersJsDoc.user.actions));
      expect(destControllers).to.deep.equal(expected);
    })
  })

  describe('mergeControllerSwaggerIntoRouteInfo', () => {
    it('should merge controller file Swagger/JSDoc into `routes` from controller files', () => {

      const routes = cloneDeep(parsedRoutesFixture as SwaggerRouteInfo[]);

      const expected = cloneDeep(parsedRoutesFixture as SwaggerRouteInfo[]);
      expected.map(route => {
        if(route.action === 'user/upload') {
          route.actionType = 'controller';
          route.defaultTagName = 'User';
          route.swagger!.tags = [ 'controllerTag' ];
        }
      });

      // XXX TODO increase test data in controllers and controllersJsDoc
      mergeControllerSwaggerIntoRouteInfo(sails, routes, controllers, controllersJsDoc);
      expect(routes).to.deep.equal(expected);

    })
  })

  describe('mergeComponents', () => {
    it(`should merge component definitions from models and controllers`, () => {

      const destComponents = cloneDeep(componentsFromConfiguration);

      mergeComponents(destComponents, models, modelsJsDoc, controllers, controllersJsDoc);

      expect(Object.keys(destComponents.schemas!)).to.deep.equal([
        'existingSchema', 'modelSchema', 'controllerSchema'
      ], 'merge of components props to existing components');

    })
  })

  describe('mergeTags', () => {
    it(`should merge tags from models, controllers and default definitions`, () => {

      const defaultModelTags = generateDefaultModelTags(models);
      const destTags = cloneDeep(tagsFromConfiguration);

      const expectedDefaultModelTags = {
        description: 'Sails blueprint actions for the **User** model',
        name: 'User'
      };

      mergeTags(destTags, models, modelsJsDoc, controllers, controllersJsDoc, defaultModelTags);
      expect(destTags).to.deep.equal([
        tagsFromConfiguration[0],
        models.user.swagger!.tags![0],
        modelsJsDoc.user.tags![0],
        controllers.controllerFiles.user.swagger!.tags![0],
        controllersJsDoc.user.tags![0],
        expectedDefaultModelTags
      ], 'merge of tag definitions to existing tags');

    })
  })

});
