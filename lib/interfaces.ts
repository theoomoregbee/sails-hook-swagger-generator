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
}

/**
 * Sails action types.
 *
 * @see https://sailsjs.com/documentation/concepts/routes/custom-routes
 */
export type ActionType = 'blueprint' | 'shortcutBlueprint' | 'controller' | 'standalone' | 'actions2' | 'function';

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
    ADD_RESULT_OF_ARRAY_OF_MODELS = 'addResultOfArrayOfModels',
    ADD_ASSOCIATION_PATH_PARAM = 'addAssociationPathParam',
    ADD_ASSOCIATION_FK_PATH_PARAM = 'addAssociationFKPathParam',
    ADD_ASSOCIATION_RESULT_OF_ARRAY = 'addAssociationResultOfArray',
    ADD_RESULT_OF_MODEL = 'addResultOfModel',
    ADD_RESULT_NOT_FOUND = 'addResultNotFound',
    ADD_RESULT_VALIDATION_ERROR = 'addResultValidationError',
    ADD_FKS_BODY_PARAM = 'addFksBodyParam'
}

type Modifier = Modifiers | ((template: BluePrintActionTemplate, route: SwaggerRouteInfo, path: OpenApi.Operation, tags: Tag[], components: OpenApi.Components) => void)

export interface Defaults {
    responses: { [statusCode: string]: { description: string } };
}

/**
 * JSON used to desribe/document individual Swagger/OpenAPI Operation, with
 * additional annotation to enable excluding the Sails action from the generated Swagger.
 */
export interface SwaggerActionAttribute extends OpenApi.Operation {
  exclude?: boolean;
}

/**
 * JSON used to desribe/document Sails Controller file, describing global `tags` and
 * `components` to be added, `controller` documentation to be applied to **all**
 * actions in the file and per-action documentation.
 */
export interface SwaggerControllerAttribute {
    tags?: Array<Tag>;
    components?: OpenApi.Components;
    controller?: SwaggerActionAttribute;
    actions?: NameKeyMap<SwaggerActionAttribute>;
}

/**
 * JSON used to desribe/document Sails Model definition file, describing global `tags` and
 * `components` to be added, `model` documentation to be applied to **all**
 * blueprint actions for the model and per-action documentation.
 */
export interface SwaggerModelAttribute extends Omit<SwaggerControllerAttribute, 'controller'> {
  model?: SwaggerActionAttribute;
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

export interface SwaggerSailsController extends Sails.Controller {
    name: string; // controller name
    inputs?: any; // action2
    exits?: any; // action2
    swagger: SwaggerControllerAttribute;
}

/**
 * All Sails controller files and actions (as loaded from disk).
 */
export interface SwaggerSailsControllers {

  /// Controller files keyed on controller file identity
  controllerFiles: NameKeyMap<IncludeAll.File & {
    defaultTagName: string;
    swagger: SwaggerControllerAttribute;
  }>;

  /// All controller actions keyed on action identity
  actions: NameKeyMap<(Sails.Action | Sails.Actions2Machine) & {
    actionType: ActionType;
    defaultTagName: string;
    swagger?: SwaggerActionAttribute;
  }>;

}

export interface SwaggerSailsRouteControllerTarget extends Sails.RouteTargetObject {
    swagger?: OpenApi.Operation;
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
    BLUEPRINT = 'BLUEPRINT',
    ACTION = 'ACTION'
}

export interface ParsedCustomRoute {
    verb: HTTPMethodVerb;
    path: string;
    variables: string[];
    controller?: string;
    action: string;
    swagger?: OpenApi.Operation;
}

export interface ParsedBindRoute {
    controller: string | undefined;
    tags: Array<Tag>;
    action: string;
    verb: HTTPMethodVerb;
    path: string;
    variables: string[];
    swagger: OpenApi.Operation | undefined;
    model: SwaggerSailsModel;
    associations: Sails.Association[];
    associationAliases: string[];
    middlewareType: MiddlewareType.BLUEPRINT;
}

/**
 * Metadata relating to Sails action or blueprint action routes.
 */
export interface SwaggerRouteInfo {
    middlewareType?: MiddlewareType;

    tags: Array<Tag>;
    model?: SwaggerSailsModel;
    swagger?: SwaggerActionAttribute;

    controller?: string | undefined;
    action: string;

    verb: HTTPMethodVerb;
    path: string;
    variables: string[];

    associationAliases?: string[]; //< association attribute names (relevant blueprint routes only)    associationsPrimaryKeyAttribute: AssociationPrimaryKeyAttribute[];
}

export interface NameKeyMap<T> {
    [name: string]: T;
}
