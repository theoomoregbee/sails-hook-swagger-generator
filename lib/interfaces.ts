/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpenApi } from '../types/openapi';
import { Reference, Tag, ExternalDocs } from 'swagger-schema-official';

export interface SwaggerGenerator {
  includeRoute?: (route: SwaggerRouteInfo) => boolean;
  disabled?: boolean;
  swaggerJsonPath: string;
  swagger: Omit<OpenApi.OpenApi, 'paths'>;
  updateBlueprintActionTemplates?: (template: BlueprintActionTemplates) => BlueprintActionTemplates;
  defaults?: Defaults;
  postProcess?: (specification: OpenApi.OpenApi) => void;
  excludeDeprecatedPutBlueprintRoutes?: boolean;
}

/**
 * Sails action types.
 *
 * @see https://sailsjs.com/documentation/concepts/routes/custom-routes
 */
export type ActionType = 'controller' | 'standalone' | 'actions2' | 'function';

/**
 * Sails blueprint action types.
 *
 * @see https://sailsjs.com/documentation/concepts/blueprints/blueprint-actions
 */
export type BluePrintAction = 'findone' | 'find' | 'create' | 'update' | 'destroy' | 'populate' | 'add' | 'remove' | 'replace'

export enum Modifiers {
    ADD_POPULATE_QUERY_PARAM = 'addPopulateQueryParam',
    ADD_SELECT_QUERY_PARAM = 'addSelectQueryParam',
    ADD_OMIT_QUERY_PARAM = 'addOmitQueryParam',
    ADD_MODEL_BODY_PARAM = 'addModelBodyParam',
    ADD_MODEL_BODY_PARAM_UPDATE = 'addModelBodyParamUpdate',
    ADD_RESULT_OF_ARRAY_OF_MODELS = 'addResultOfArrayOfModels',
    ADD_ASSOCIATION_PATH_PARAM = 'addAssociationPathParam',
    ADD_ASSOCIATION_FK_PATH_PARAM = 'addAssociationFKPathParam',
    ADD_ASSOCIATION_RESULT_OF_ARRAY = 'addAssociationResultOfArray',
    ADD_RESULT_OF_MODEL = 'addResultOfModel',
    ADD_RESULT_NOT_FOUND = 'addResultNotFound',
    ADD_RESULT_VALIDATION_ERROR = 'addResultValidationError',
    ADD_FKS_BODY_PARAM = 'addFksBodyParam',
    ADD_SHORTCUT_BLUEPRINT_ROUTE_NOTE = 'addShortCutBlueprintRouteNote',
}

type Modifier = Modifiers | ((template: BluePrintActionTemplate, route: SwaggerRouteInfo, path: OpenApi.Operation, tags: Tag[], components: OpenApi.Components) => void)

export interface Defaults {
    responses: { [statusCode: string]: { description: string } };
}

/**
 * JSON used to desribe/document individual Swagger/OpenAPI Operation, with
 * additional annotation to enable excluding the Sails action from the generated Swagger.
 */
export interface SwaggerActionAttribute extends Omit<OpenApi.Operation, 'parameters'|'responses'> {
  parameters?: Array<OpenApi.Parameter>; // allow to be optional (for incremental change within hook)
  responses?: Record<string, OpenApi.Response>; // allow to be optional (for incremental change within hook)
  exclude?: boolean;
}

/**
 * JSON used describe/document Sails Model files, describing the model's **schema**
 * and a list of Swagger/OpenAPI `tags` to be applied to **all** blueprint actions for
 * the model.
 */
export interface SwaggerModelSchemaAttribute extends OpenApi.UpdatedSchema {
  tags?: string[];
  exclude?: boolean;
}

/**
 * JSON used to describe/document Sails Controller file, describing global `tags` and
 * `components` to be added, 'controller' documentation to be applied to **all**
 * actions in the file and per-action documentation.
 */
export interface SwaggerControllerAttribute {
    tags?: Array<Tag>;
    components?: OpenApi.Components;
    actions?: NameKeyMap<SwaggerActionAttribute>;
}

/**
 * JSON used to desribe/document Sails Model definition file, describing global `tags` and
 * `components` to be added, `model` documentation to be applied to **all**
 * blueprint actions for the model and per-action documentation.
 */
export interface SwaggerModelAttribute extends SwaggerControllerAttribute {
  modelSchema?: SwaggerModelSchemaAttribute;
}

/**
 * Extend Sail attribute definition to include `meta.swagger`, including `exclude` for
 * individual attributes.
 */
export interface SwaggerSailsModelAttributeDefinition extends Omit<Sails.AttributeDefinition, 'meta'> {
  meta?: {
    swagger?: OpenApi.UpdatedSchema & {
      exclude?: boolean;
    };
    [name: string]: any;
  };
}

export interface SwaggerSailsModel extends Omit<Sails.Model, 'attributes'> {
    attributes: Record<string, SwaggerSailsModelAttributeDefinition>;
    swagger: SwaggerModelAttribute;
}

export interface SwaggerSailsActions2Input extends Sails.Actions2Input {
  meta?: {
    swagger?: (OpenApi.Parameter | OpenApi.MediaType) & {
      in?: 'query' | 'header' | 'path' | 'cookie' | 'body';
      exclude?: boolean;
    };
    [name: string]: any;
  };
}

export interface SwaggerSailsActions2Exit extends Sails.Actions2Exit {
  meta?: {
    swagger?: OpenApi.Response & {
      exclude?: boolean;
    };
    [name: string]: any;
  };
}

export interface SwaggerSailsActions2Machine extends Omit<Sails.Actions2Machine, 'inputs' | 'exits'> {
  inputs?: NameKeyMap<SwaggerSailsActions2Input>;
  exits?: NameKeyMap<SwaggerSailsActions2Exit>;
}

/**
 * All Sails controller files and actions (as loaded from disk).
 */
export interface SwaggerSailsControllers {

  /// Controller files keyed on controller file identity
  controllerFiles: NameKeyMap<IncludeAll.File & {
    actionType: ActionType;
    defaultTagName: string;
    swagger: SwaggerControllerAttribute;
  }>;

  /// All controller actions keyed on action identity
  actions: NameKeyMap<(Sails.Action | SwaggerSailsActions2Machine) & {
    actionType: ActionType;
    defaultTagName: string;
    swagger?: SwaggerActionAttribute;
  }>;

}

interface BluePrintActionTemplate {
    summary: string;
    description: string;
    externalDocs: ExternalDocs;
    parameters: Array<'primaryKeyPathParameter' | Reference | OpenApi.Parameter>;
    resultDescription: string;
    notFoundDescription?: string;
    modifiers?: Array<Modifier>;
}

export type BlueprintActionTemplates = {
    [action in BluePrintAction]: BluePrintActionTemplate;
};

type ResponseType = 'success' | 'badRequest' | 'forbidden' | 'notFound' | 'error'

export type Action2Response = {
    [type in ResponseType]: { statusCode: string; description: string }
}

export type HTTPMethodVerb = 'all' | 'get' | 'post' | 'put' | 'patch' | 'delete'

export enum MiddlewareType {
    BLUEPRINT = 'BLUEPRINT', //< Sails built-in blueprint middleware
    ACTION = 'ACTION', //< custom action (may include specific per-model blueprint action overrides or custom blueprint actions)
}

/**
 * Metadata relating to Sails action or blueprint action routes.
 */
export interface SwaggerRouteInfo {
  middlewareType: MiddlewareType; //< one of action|blueprint

  verb: HTTPMethodVerb; //< one of all|get|post|put|patch|delete
  path: string; //< full Sails URL as per sails.getUrlFor() including prefix
  variables: string[]; //< list of ALL variables extracted from path e.g. `/pet/:id` --> `id`
  optionalVariables: string[]; //< list of optional variables from path e.g. `/pet/:id?` // XXX TODO make Variable type

  action: string; //< either blueprint action (e.g. 'user/find') or action identity (e.g. 'subdir/reporting/run')
  actionType: ActionType; //< one of controller|standalone|actions2|function
  actions2Machine?: SwaggerSailsActions2Machine; //< for actionType === 'actions2', details of the action2 machine

  model?: SwaggerSailsModel; //< reference to Sails Model (blueprints or custom model action only)
  associationAliases?: string[]; //< association attribute names (relevant blueprint routes only)
  blueprintAction?: string; //< blueprint action (or custom model action) without model identity reference e.g. 'find' (only where model defined)
  isShortcutBlueprintRoute?: boolean; //< true if the route matches a shortcut blueprint route

  defaultTagName?: string; //< default tag name for route, if any, based on Sails Model or Controller

  swagger?: SwaggerActionAttribute; //< per-route Swagger (OpenApi Operation)
}

export interface NameKeyMap<T> {
    [name: string]: T;
}

export type AnnotatedFunction = {
  (): Function;
  swagger?: SwaggerActionAttribute;
}
