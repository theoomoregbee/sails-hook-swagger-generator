import { NameKeyMap, SwaggerSailsModel, SwaggerModelAttribute, SwaggerSailsControllers, SwaggerControllerAttribute } from "./interfaces";
import { forEach, defaults, cloneDeep } from "lodash";
import { Tag } from "swagger-schema-official";
import { OpenApi } from "../types/openapi";


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
 * Merge elements of components from `config/routes.js`, model definition files and
 * controller definition files.
 *
 * Elements of components are added to the top-level Swagger/OpenAPI definitions as follows:
 * 1. Elements of the component definition reference (schemas, parameters, etc) are added where
 *    they **do not exist**.
 * 2. Existing elements are **not** overwritten or merged.
 *
 * For example, the element `components.schemas.pet` will be added as part of a merge process,
 * but the contents of multiple definitions of `pet` **will not** be merged.
 *
 * @param dest
 * @param routesJsDoc
 * @param models
 * @param controllers
 */
export const mergeComponents = (dest: OpenApi.Components,
  // routesJsDoc: OpenApi.OpenApi,
  models: NameKeyMap<SwaggerSailsModel>,
  modelsJsDoc: NameKeyMap<SwaggerModelAttribute>,
  // controllers: SwaggerSailsControllers,
  // controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>
  ): void => {

  const mergeIntoDest = (source: OpenApi.Components | undefined) => {
    if (!source) { return; }
    for (const key in source) {
      const componentName = key as keyof OpenApi.Components;
      if (!dest[componentName]) {
        dest[componentName] = {};
      }
      defaults(dest[componentName], source[componentName]);
    }
  }

  // WIP TBC mergeIntoDest(routesJsDoc.components);

  forEach(models, model => mergeIntoDest(model.swagger?.components));
  forEach(modelsJsDoc, jsDoc => mergeIntoDest(jsDoc.components));

  // WIP forEach(controllers.controllerFiles, controllerFile => mergeIntoDest(controllerFile.swagger?.components));
  // WIP forEach(controllersJsDoc, jsDoc => mergeIntoDest(jsDoc.components));

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

  // WIP TBC mergeIntoDest(routesJsDoc.tags);

  forEach(models, model => mergeIntoDest(model.swagger?.tags));
  forEach(modelsJsDoc, jsDoc => mergeIntoDest(jsDoc.tags));

  // WIP forEach(controllers.controllerFiles, controllerFile => mergeIntoDest(controllerFile.swagger?.tags));
  // WIP forEach(controllersJsDoc, jsDoc => mergeIntoDest(jsDoc.tags));

  mergeIntoDest(defaultModelTags);

}
