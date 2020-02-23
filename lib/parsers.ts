/**
 * Created by theophy on 02/08/2017.
 */
import * as path from 'path';
import { SwaggerSailsModel, SwaggerAttribute, SwaggerAction } from './interfaces';
import swaggerJSDoc from 'swagger-jsdoc';
import cloneDeep from 'lodash/cloneDeep';
import mapKeys from 'lodash/mapKeys';
import get from 'lodash/get';
import uniqByLodash from 'lodash/uniqBy';
import uniq from 'lodash/uniq';
import { OpenApi } from '../types/openapi';

declare const sails: any;

const uniqBy = uniqByLodash as unknown as <T>(array: Array<T>, prop: string) => Array<T>

const componentReference: Array<keyof OpenApi.Components> = [
  "schemas",
  "parameters",
  "securitySchemes",
  "requestBodies",
  "responses",
  "headers",
  "examples",
  "links",
  "callbacks"
]

// consider all models except associative tables and 'Archive' model special case
const removeModelExceptions = (model: SwaggerSailsModel): boolean => !!model.globalId && model.globalId !== 'Archive'

export const mergeSwaggerSpec = (destination: SwaggerAttribute, source: SwaggerAttribute): SwaggerAttribute => {
  const dest: SwaggerAttribute = cloneDeep(destination)
  dest.tags = uniqBy([
    ...(get(source, 'tags', [])),
    ...(get(dest, 'tags', [])),
  ], 'name');

  dest.components = componentReference.reduce((mergedComponents, ref) => {
    const type = get(source, `components.${ref}`);
    if (type) {
      mergedComponents[ref] = {
        ...(get(dest.components, ref, {})),
        ...type
      }
    }
    return mergedComponents
  }, dest.components || {})
  return dest
}

export const mergeSwaggerPaths = (dest: SwaggerAction | undefined, sourcePaths: SwaggerAction): SwaggerAction => {
  // strip off leading '/' from both source and destination swagger action, swagger-doc returns paths with leading /path-name: {}
  const swaggerActions = mapKeys(cloneDeep(dest || {}), (_, key) => key.replace(/^\//, ''));
  const paths = mapKeys(cloneDeep(sourcePaths), (_, key) => key.replace(/^\//, ''));
  // unique action keys
  const actions = uniq(Object.keys(swaggerActions).concat(Object.keys(paths)))
  return actions.reduce((merged, key) => {
    const destination = swaggerActions[key];
    const source = paths[key];
    merged[key] = {
      ...(destination || {}),
      ...(source || {})
    }
    return merged
  }, {} as SwaggerAction)
}

export const loadSwaggerDocComments = (filePath: string): Promise<OpenApi.OpenApi>=> {
  return new Promise((resolve, reject) => {
    try {
      const opts = {
        definition: {
          openapi: '3.0.0', // Specification (optional, defaults to swagger: '2.0')
          info: { title: 'dummy', version: '0.0.0' },
        },
        apis: [filePath],
      };
      const specification = swaggerJSDoc(opts);
      resolve(specification as OpenApi.OpenApi)
    }catch(err){
      reject(err)
    }
  });
}

export const parseModels = async (sailsConfig: Sails.Config, sailsModels: Array<SwaggerSailsModel>): Promise<{[globalId: string]: SwaggerSailsModel}> => {
  const models = sailsModels.filter(removeModelExceptions);
  // parse swagger jsDoc comments in each of our models
  const modelDir = sailsConfig.paths.models;
  const swaggerComments: Array<OpenApi.OpenApi | undefined> = await Promise.all(models.map(model =>
    loadSwaggerDocComments(require.resolve(path.join(modelDir, model.globalId))).catch(err => {
      sails.log.error(`ERROR: sails-hook-swagger-generator: Error resolving/loading model ${model.globalId}: ${err.message || ''}`, err);
      return undefined
    })));

    const parseTagsComponents = (model: SwaggerSailsModel, index: number) => {
      // retrieve swagger documentation from jsDoc comments and merge it with any .swagger within our model
      const swagger = swaggerComments[index];
      model.swagger = cloneDeep(model.swagger || {})
      if (swagger) {
        model.swagger = mergeSwaggerSpec(model.swagger, swagger);
      }
      return model
    }

    const parseSwaggerDocPaths = (model: SwaggerSailsModel, index: number) => {
      // parse and merge swagger.actions and swagger-doc path 
      const swagger = swaggerComments[index] 
      if(swagger){
        const paths = swagger.paths || {}
        model.swagger.actions = mergeSwaggerPaths(model.swagger.actions!, paths)
      }

      return model
    }

  return models
    .map(parseTagsComponents)
    .map(parseSwaggerDocPaths)
    .reduce((parsed, model) => {
      parsed[model.globalId] = model;
      return parsed
    }, {} as { [globalId: string]: SwaggerSailsModel })
}