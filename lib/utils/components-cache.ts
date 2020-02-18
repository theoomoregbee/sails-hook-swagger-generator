import { OpenApi } from '../../types/openapi';
import set from 'lodash/set';

const componentDefinitionCache: OpenApi.Components = {
    // Reusable schemas (data models)
    schemas: {},
    // Reusable path, query, header and cookie parameters
    parameters: {},
    // Security scheme definitions (see Authentication)
    securitySchemes: {},
    // Reusable request bodies
    requestBodies: {},
    // Reusable responses, such as 401 Unauthorized or 400 Bad Request
    responses: {},
    // Reusable response headers
    headers: {},
    // Reusable examples
    examples: {},
    // Reusable links
    links: {},
    // Reusable callbacks
    callbacks: {},
  };

export default {
    getCache: (): OpenApi.Components => componentDefinitionCache,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    write: (path: string, value: any): void => {
        set(componentDefinitionCache, path, value)
    }
}