import { OpenApi } from '../types/openapi';
import { Reference, Tag } from 'swagger-schema-official';

export interface SwaggerGenerator {
    disabled?: boolean;
    swaggerJsonPath: string;
    swagger: Omit<OpenApi.OpenApi, 'paths'>;
    updateBlueprintActionTemplates?: (template: BlueprintActionTemplates) => BlueprintActionTemplates;
    defaults?: Defaults;
}

type BluePrintAction = 'findone' | 'find' | 'create' | 'update' | 'destroy' | 'populate' | 'add' | 'remove' | 'replace'

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

export interface Defaults {
    responses: { [statusCode: string]: { description: string } };
}

export interface SwaggerAction {
    [path: string]: OpenApi.Path;
}

export interface SwaggerAttribute {
    tags?: Array<Tag>;
    components?: OpenApi.Components;
    actions?: SwaggerAction;
}

export interface SwaggerSailsModel extends Omit<Sails.Model, 'attributes'> {
    attributes: Record<string, Sails.AttributeValue & {
        description?: string;
        externalDocs?: OpenApi.ExternalDoc;
        example?: string;
    }>;
    swagger: SwaggerAttribute;
}

export interface SwaggerSailsRouteControllerTarget extends Sails.RouteControllerTarget {
    swagger?: OpenApi.Operation;
}

interface BluePrintActionTemplate {
    summary: string;
    description: string;
    externalDocs: OpenApi.ExternalDoc;
    parameters: Array<'primaryKeyPathParameter' | Reference | OpenApi.Parameter>;
    resultDescription: string;
    notFoundDescription?: string;
    modifiers?: Array<Modifiers>;
}

export type BlueprintActionTemplates = {
    [action in BluePrintAction]: BluePrintActionTemplate;
};

type ResponseType = 'success' | 'badRequest' | 'forbidden' | 'notFound' | 'error'

export type Action2Response = {
    [type in ResponseType]: { statusCode: string; description: string }
}

export type HTTPMethodVerb = 'all' | 'get' | 'post' | 'put' | 'patch' | 'delete'

export interface SwaggerRouteInfo {
    middlewareType: 'action'| 'blueprint';
    verb: HTTPMethodVerb;
    path: string;
    swaggerPath: string; // with :id converted to {id}
    variables: string[];
    identity: string;
    model: SwaggerSailsModel;
    controller?: string;
    action: string;
    swagger?: OpenApi.Operation; 
}

export interface ParsedCustomRoute {
    verb: HTTPMethodVerb;
    path: string;
    swaggerPath: string; // with :id converted to {id}
    variables: string[];
    controller?: string;
    action: string;
    swagger?: OpenApi.Operation; 
}

// export interface ParsedBindRoute {

// }