import { NameKeyMap, SwaggerSailsModel, SwaggerModelAttribute, SwaggerSailsControllers, SwaggerControllerAttribute } from "./interfaces";
import { forEach, defaults, cloneDeep } from "lodash";
import { Tag } from "swagger-schema-official";


/**
 * Merges JSDoc `actions` and `model` elements **but not** `components` and `tags`
 * (which are merged in `mergeComponents()` and `mergeTags()`).
 *
 * @param models
 * @param modelsJsDoc
 */
export const mergeModelJsDoc = (models: NameKeyMap<SwaggerSailsModel>, modelsJsDoc: NameKeyMap<SwaggerModelAttribute>): void => {

  forEach(models, model => {

    const modelJsDoc = modelsJsDoc[model.identity];
    if(modelJsDoc) {
      if(modelJsDoc.actions) {
        forEach(modelJsDoc.actions, (action, actionName) => {
          if(!model.swagger.actions) {
            model.swagger.actions = {};
          }
          if(!model.swagger.actions[actionName]) {
            model.swagger.actions[actionName] = { ...action };
          } else {
            defaults(model.swagger.actions[actionName], action);
          }
        });
      }

      if(modelJsDoc.model) {
        if(!model.swagger.model) {
          model.swagger.model = { ...modelJsDoc.model };
        } else {
          defaults(model.swagger.model, modelJsDoc.model);
        }
      }

      // if(modelJsDoc.exclude !== undefined) {
      //   if(model.swagger.exclude === undefined) {
      //     model.swagger.exclude = modelJsDoc.exclude;
      //   }
      // }
    }

  });

}

/**
 * Merge tag definitions from `config/routes.js`, model definition files and
 * controller definition files.
 *
 * Tags are added to the top-level Swagger/OpenAPI definitions as follows:
 * 1. If a tags with the specified name **does not** exist, it is added.
 * 1. Where a tag with the specified name **does** exist, elements _of that tag_ that do not exist are added
 *    e.g. `description` and `externalDocs` elements.
 *
 * @param dest
 * @param routesJsDoc
 * @param models
 * @param controllers
 */
export const mergeTags = (dest: Tag[],
  // routesJsDoc: OpenApi.OpenApi,
  models: NameKeyMap<SwaggerSailsModel>,
  modelsJsDoc: NameKeyMap<SwaggerModelAttribute>,
  // WIP controllers: SwaggerSailsControllers,
  // WIP controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>,
  defaultModelTags: Tag[]): void => {

  const mergeIntoDest = (source: Tag[] | undefined) => {
    if(!source) { return; }
    source.map(sourceTag => {
      const destTag = dest.find(t => t.name === sourceTag.name);
      if(destTag) {
        defaults(destTag, sourceTag); // merge into existing
      } else {
        dest.push(cloneDeep(sourceTag)); // add new tag
      }
    });
  }

  // WIP mergeIntoDest(routesJsDoc.tags);

  forEach(models, model => mergeIntoDest(model.swagger?.tags));
  forEach(modelsJsDoc, jsDoc => mergeIntoDest(jsDoc.tags));

  // WIP forEach(controllers.controllerFiles, controllerFile => mergeIntoDest(controllerFile.swagger?.tags));
  // WIP forEach(controllersJsDoc, jsDoc => mergeIntoDest(jsDoc.tags));

  mergeIntoDest(defaultModelTags);

}
