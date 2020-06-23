/* eslint-disable @typescript-eslint/no-explicit-any */
import { Reference, Tag, ExternalDocs, XML } from 'swagger-schema-official';

// This is simply building from  OpenApi Specification
// see: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md
// TODO: move this to https://github.com/DefinitelyTyped/DefinitelyTyped as openapi-spec

declare namespace OpenApi {

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

    export interface Discriminator {
      propertyName: string;
      mapping?: { [key: string]: string };
    }

    export type DataType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';

    export interface UpdatedSchema {
      nullable?: boolean;
      discriminator?: Discriminator;
      readOnly?: boolean;
      writeOnly?: boolean;
      xml?: XML;
      externalDocs?: ExternalDocs;
      example?: any;
      examples?: any[];
      deprecated?: boolean;

      type?: DataType;
      allOf?: (UpdatedSchema | Reference)[];
      oneOf?: (UpdatedSchema | Reference)[];
      anyOf?: (UpdatedSchema | Reference)[];
      not?: UpdatedSchema | Reference;
      items?: UpdatedSchema | Reference;
      properties?: { [propertyName: string]: (UpdatedSchema | Reference) };
      additionalProperties?: (UpdatedSchema | Reference | boolean);
      description?: string;
      format?: string;
      default?: any;

      title?: string;
      multipleOf?: number;
      maximum?: number;
      exclusiveMaximum?: boolean;
      minimum?: number;
      exclusiveMinimum?: boolean;
      maxLength?: number;
      minLength?: number;
      pattern?: string;
      maxItems?: number;
      minItems?: number;
      uniqueItems?: boolean;
      maxProperties?: number;
      minProperties?: number;
      required?: string[];
      enum?: any[];
    }

    export type ParameterLocation = 'query' | 'header' | 'path' | 'cookie';

    export type ParameterStyle = 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject';

    export interface ParameterCommon {
      description?: string;
      required?: boolean;
      deprecated?: boolean;
      allowEmptyValue?: boolean;

      style?: ParameterStyle;
      explode?: boolean;
      allowReserved?: boolean;
      schema?: UpdatedSchema | Reference;
      examples?: Map<string, Example | Reference>;
      example?: any;
      content?: Record<string, MediaType>;
    }

    export interface Parameter extends ParameterCommon {
      name: string;
      in: ParameterLocation;
    }

    export type Header = ParameterCommon

    export interface Example {
        summary?: string;
        description?: string;
        value?: any;
        externalValue?: string;
    }

    export interface Encoding {
        contentType?: string;
        headers?: Record<string, Header | Reference>;
        style?: string;
        explode?: boolean;
        allowReserved?: boolean;
    }

    export interface MediaType {
        schema?: UpdatedSchema | Reference;
        example?: any;
        examples?: Record<string, Example | Reference>;
        encoding?: Record<string, Encoding>;

    }

    export interface RequestBody {
        description?: string;
        content: Record<string, MediaType>;
        required?: boolean;
    }

    export interface Link {
        operationRef?: string;
        operationId?: string;
        parameters?: Record<string, any>;
        requestBody?: any;
        description?: string;
        server: Server;
    }

    export interface Response {
        description: string;
        headers?: Record<string, Header | Reference>;
        content?: Record<string, MediaType>;
        links?: Record<string, Link | Reference>;
    }

    export interface Operation {
        tags?: Array<string>;
        summary?: string;
        description?: string;
        externalDocs?: ExternalDocs;
        operationId?: string;
        parameters: Array<Parameter | Reference>;
        requestBody?: RequestBody | Reference;
        responses: Record<string, Response>; // index is statusCode
        servers?: Array<Server>;
        security?: SecuritySchemeRefPlusScopes[];
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

    /**
     * Security applied globally or to Operation
     */

    export type Scope = string;

    export interface SecuritySchemeRefPlusScopes {
      [schemeName: string]: Scope[];
    }

    /**
     * Security scheme definition
     */

    export interface BaseSecurity {
      type: 'http' | 'apiKey' | 'openIdConnect' | 'oauth2';
      description?: string;
    }

    export interface HttpSecurity extends BaseSecurity {
      type: 'http';
      scheme: 'basic' | 'bearer';
      bearerFormat?: string; // e.g. 'JWT'
    }

    export interface ApiKeySecurity extends BaseSecurity {
      type: 'apiKey';
      name: string;
      in: 'query' | 'header' | 'cookie';
    }

    export interface OpenIDConnectSecurity extends BaseSecurity {
      type: 'openIdConnect';
      openIdConnectUrl: string;
    }

    export interface OAuth2Security extends BaseSecurity {
      type: 'oauth2';
      flows: OAuth2SecurityFlow;
    }

    export interface OAuth2SecurityFlows {
      implicit?: OAuth2ImplicitSecurityFlow;
      password?: OAuth2PasswordSecurityFlow;
      clientCredentials?: OAuth2ClientCredentialsSecurityFlow;
      authorizationCode?: OAuth2AuthorizationCodeSecurityFlow;
    }

    export interface OAuth2SecurityFlow {
      refreshUrl?: string;
      scopes?: OAuthScope;
    }

    export interface OAuth2ImplicitSecurityFlow extends OAuth2SecurityFlow {
      authorizationUrl: string;
    }

    export interface OAuth2PasswordSecurityFlow extends OAuth2SecurityFlow {
      tokenUrl: string;
    }

    export interface OAuth2ClientCredentialsSecurityFlow extends OAuth2SecurityFlow {
      authorizationUrl: string;
    }

    export interface OAuth2AuthorizationCodeSecurityFlow extends OAuth2SecurityFlow {
      authorizationUrl: string;
      tokenUrl: string;
    }

    export interface OAuthScope {
      [scopeName: string]: string;
    }

    export type Security =
      | HttpSecurity
      | ApiKeySecurity
      | OpenIDConnectSecurity
      | OAuth2Security;

    /**
     * Components dictionary
     */

    export interface Components {
        schemas?: Record<string, UpdatedSchema | Reference>;
        responses?: Record<string, Response | Reference>;
        parameters?: Record<string, Parameter | Reference>;
        examples?: Record<string, Example | Reference>;
        requestBodies?: Record<string, RequestBody | Reference>;
        headers?: Record<string, Header | Reference>;
        securitySchemes?: Record<string, Security | Reference>;
        links?: Record<string, Link | Reference>;
        callbacks?: Record<string, Path | Reference>;
    }

    export interface OpenApi {
        openapi: string;
        info: Info;
        servers: Array<Server>;
        paths: Paths;
        components?: Components;
        security?: SecuritySchemeRefPlusScopes[];
        tags?: Array<Tag>;
        externalDocs: ExternalDocs;
    }
}
