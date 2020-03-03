/**
 * Created by theophy on 02/08/2017.
 */
import * as path from 'path';
import { SwaggerSailsModel, SwaggerRouteInfo } from './interfaces';
import cloneDeep from 'lodash/cloneDeep';
import { OpenApi } from '../types/openapi';
import { generateSwaggerPath } from './generators';
import { loadSwaggerDocComments, mergeSwaggerSpec, mergeSwaggerPaths } from './utils';

declare const sails: any;


// consider all models except associative tables and 'Archive' model special case
const removeModelExceptions = (model: SwaggerSailsModel): boolean => !!model.globalId && model.globalId !== 'Archive'


export const parseModels = async (sailsConfig: Sails.Config, sailsModels: Array<SwaggerSailsModel> = []): Promise<{[globalId: string]: SwaggerSailsModel}> => {
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

export const parseCustomRoutes = (sailsConfig: Sails.Config): Array<SwaggerRouteInfo>  => {
  for(const routeAddress in sailsConfig.routes){
    // Parse 1: Route Address
    // see https://sailsjs.com/documentation/concepts/routes/custom-routes#?route-address
    let [verb, path] = routeAddress.split(/\s+/)
    if (!path) {
      path = verb
      verb = 'all'
    }

    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?wildcards-and-dynamic-parameters
    const swaggerPathParams = generateSwaggerPath(path);

    // XXX TODO wildcard

    // XXX TODO Handle arrays
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?route-target
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?policy-target-syntax
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?function-target-syntax

    // XXX TODO Handle these variations
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?regular-expressions-in-addresses
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?routing-to-blueprint-actions
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?redirect-target-syntax (starts with / or scheme)
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?response-target-syntax
    // https://sailsjs.com/documentation/concepts/routes/custom-routes#?policy-target-syntax
    // https://sailsjs.com/documentation/concepts/actions-and-controllers#?actions-2

    // Parse 2: Route target
    const routerTarget = sailsConfig.routes[routeAddress];
    // if(typeof routerTarget === 'string') {
      
    // }

  }
   return [] 
}