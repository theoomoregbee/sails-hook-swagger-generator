/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, Reference, Header, Tag, Security } from 'swagger-schema-official';

// This is simply building from  OpenApi Specification
// see: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md
// TODO: move this to https://github.com/DefinitelyTyped/DefinitelyTyped as openapi-spec

declare namespace OpenApi {

    type EmptyObject = {}

    export interface Info {
        title: string;
        version: string;
        description?: string;
        termsOfService?: string;
        contact?: {
            name?: string;
            url?: string;
            email?: string;
        };
        license?: {
            name: string;
            url?: string;
        };
    }

    export interface Server {
        url: string;
        description?: string;
        variables?: Array<string | { enum?: Array<string>; default: string; description?: string }>;
    }

    export interface ExternalDoc {
        description?: string;
        url: string;
    }

    export interface Parameter {
        name: string;
        in: string;
        description?: string;
        required?: boolean;
        deprecated?: boolean;
        allowEmptyValue?: boolean;
    }

    export interface Example {
        summary?: string;
        description?: string;
        value?: any;
        externalValue?: string;
    }

    export interface Encoding {
        contentType?: string;
        headers?: Map<string, Header | Reference>;
        style?: string;
        explode?: boolean;
        allowReserved?: boolean;
    }

    export interface MediaType {
        schema?: Schema | Reference;
        example?: any;
        examples?: Map<string, Example | Reference>;
        encoding?: Map<string, Encoding>;

    }

    export interface RequestBody {
        description?: string;
        content: Map<string, MediaType>;
    }

    export interface Link {
        operationRef?: string;
        operationId?: string;
        parameters?: Map<string, any>;
        requestBody?: any;
        description?: string;
        server: Server;
    }

    export interface Response {
        description: string;
        headers?: Map<string, Header | Reference>;
        content?: Map<string, MediaType>;
        links?: Map<string, Link | Reference>;
    }

    export interface Operation {
        tags?: Array<string>;
        summary?: string;
        description?: string;
        externalDocs?: ExternalDoc;
        operationId?: string;
        parameters: Array<Parameter>;
        requestBody?: RequestBody | Reference;
        responses: Record<string, Response>;
        servers?: Array<Server>;
        security?: Array<Security>;
    }

    export interface Path {
        $ref?: string;
        summary?: string;
        description: string;
        get?: Operation;
        put?: Operation;
        post?: Operation;
        delete?: Operation;
        options?: Operation;
        head?: Operation;
        patch?: Operation;
        trace?: Operation;
        servers?: Array<Server>;
        parameters?: Array<Parameter | Reference>;
    }

    export interface Paths {
        [path: string]: Path;
    }


    export interface Components {
        schemas?: Map<string, Schema | Reference> | EmptyObject;
        responses?: Map<string, Response | Reference> | EmptyObject;
        parameters?: Map<string, Parameter | Reference> | EmptyObject;
        examples?: Map<string, Example | Reference> | EmptyObject;
        requestBodies?: Map<string, RequestBody | Reference> | EmptyObject;
        headers?: Map<string, Header | Reference> | EmptyObject;
        securitySchemes?: Map<string, Security | Reference> | EmptyObject;
        links?: Map<string, Link | Reference> | EmptyObject;
        callbacks?: Map<string, Path | Reference> | EmptyObject;
    }

    export interface OpenApi {
        openapi: string;
        info: Info;
        servers: Array<Server>;
        paths: Paths;
        components?: Components;
        security?: Array<Security>;
        tags?: Array<Tag>;
        externalDocs: ExternalDoc;
    }
}