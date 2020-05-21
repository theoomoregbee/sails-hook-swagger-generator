import { expect } from 'chai';
import { NameKeyMap, SwaggerSailsModel, SwaggerSailsController, SwaggerModelAttribute, SwaggerControllerAttribute, SwaggerSailsControllers, SwaggerRouteInfo } from '../lib/interfaces';
import { OpenApi } from '../types/openapi';
import { mergeComponents, mergeTags, mergeModelJsDoc, mergeControllerJsDoc, transformSailsPathsToSwaggerPaths } from '../lib/transformations';
import { cloneDeep, defaults } from 'lodash';
import { generateDefaultModelTags } from '../lib/generators';

// const sailsConfig = {
//     paths: {
//         models: '../../api/models'
//     }
// }

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
        defaultTagName: 'User',
        swagger: {
          components: {
            schemas: { controllerSchema: {} }
          },
          tags: [{ name: 'controllerTag' }]
        }
      }
    },
    actions: {},
  } as SwaggerSailsControllers;
  const controllersJsDoc = {
    user: {
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
      defaults(expected.controllerFiles.user!.swagger, {
        actions: cloneDeep(controllersJsDoc.user.actions)
      });
      expect(destControllers).to.deep.equal(expected);
    })
  })

  describe('mergeComponents', () => {
    it(`should merge component definitions from models and controllers`, () => {

      const destComponents = cloneDeep(componentsFromConfiguration);

      mergeComponents(destComponents, models, modelsJsDoc);

      expect(Object.keys(destComponents.schemas!)).to.deep.equal([
        'existingSchema', 'modelSchema', // WIP 'controllerSchema', 'action2Schema'
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

      mergeTags(destTags, models, modelsJsDoc, defaultModelTags);
      expect(destTags).to.deep.equal([
        tagsFromConfiguration[0],
        models.user.swagger!.tags![0],
        modelsJsDoc.user.tags![0],
        expectedDefaultModelTags
      ], 'merge of tag definitions to existing tags');

    })
  })

});
