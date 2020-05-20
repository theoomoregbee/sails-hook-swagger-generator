import { expect } from 'chai';
import { NameKeyMap, SwaggerSailsModel, SwaggerSailsController, SwaggerModelAttribute } from '../lib/interfaces';
import { OpenApi } from '../types/openapi';
import { mergeComponents, mergeTags } from '../lib/transformations';
import { cloneDeep } from 'lodash';
import { generateDefaultModelTags } from '../lib/generators';

// const sailsConfig = {
//     paths: {
//         models: '../../api/models'
//     }
// }

describe('Transformations', () => {

  const componentsFromConfiguration = {
    schemas: { existingSchema: {} }
  } as OpenApi.Components;

  const tagsFromConfiguration = [
    { name: 'existing' }
  ];

  const models = {
    user: {
      globalId: 'User',
      swagger: {
        components: {
          schemas: { modelSchema: {} }
        },
        tags: [{ name: 'modelTag' }]
      }
    }
  } as unknown as NameKeyMap<SwaggerSailsModel>;

  const modelsJsDoc = {
    user: {
      tags: [{ name: 'modelsJsDocTag' }]
    }
  } as NameKeyMap<SwaggerModelAttribute>;

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
