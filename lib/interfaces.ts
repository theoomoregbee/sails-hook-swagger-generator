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

export interface SwaggerAction {
    [name: string]: OpenApi.Operation;
}

export interface SwaggerAttribute {
    tags?: Array<Tag>;
    components?: OpenApi.Components;
    actions?: SwaggerAction;
}

export interface SwaggerSailsModel extends Omit<Sails.Model, 'attributes'> {
    attributes: Record<string, Sails.AttributeValue & {
        description?: string;
        externalDocs?: ExternalDocs;
        example?: string;
    }>;
    swagger: SwaggerAttribute;
}

export interface SwaggerSailsController extends Sails.Controller {
    name: string; // controller name
    inputs?: any; // action2
    exits?: any; // action2
    swagger: SwaggerAttribute;
}

export interface SwaggerSailsRouteControllerTarget extends Sails.RouteControllerTarget {
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

// (present for blueprints only); alias attributeInfo for association PK
export interface AssociationPrimaryKeyAttribute {
    [name: string]: any;
    description: string;
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
    associations: Sails.RouteAssociation[];
    alias?: string;
    aliases: string[];
    middlewareType: MiddlewareType.BLUEPRINT;
    associationsPrimaryKeyAttribute: AssociationPrimaryKeyAttribute[];
}

export interface SwaggerRouteInfo {
    middlewareType?: MiddlewareType;

    tags: Array<Tag>;
    model?: SwaggerSailsModel;
    swagger?: OpenApi.Operation | undefined;

    controller?: string | undefined;
    action: string;

    verb: HTTPMethodVerb;
    path: string;
    variables: string[];

    associations: Sails.RouteAssociation[];
    alias?: string;
    aliases: string[];
    associationsPrimaryKeyAttribute: AssociationPrimaryKeyAttribute[];
}

export interface NameKeyMap<T> {
    [name: string]: T;
}
