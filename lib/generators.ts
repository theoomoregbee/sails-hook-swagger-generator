import { SwaggerSailsModel } from './interfaces';

/**
 * Maps from a Sails route path of the form `/path/:id` to a
 * Swagger path of the form `/path/{id}`. and the path variables
 */
export const  generateSwaggerPath = (path: string): {variables: string[]; path: string}  => {
    const variables: string[] = [];
    const swaggerPath = path
      .split('/')
      .map(v => {
        // TODO: update this to accept optional route param e.g id?
        // simply remove the ? in [^/:?]
        const match = v.match(/^:([^/:?]+)\??$/);
        if (match) {
          variables.push(match[1]);
          return `{${match[1]}}`;
        }
        return v;
      })
      .join('/');
  return { path: swaggerPath, variables };
  }

  /**
   * Generate Swagger schema content describing specified Sails models.
   * @see https://swagger.io/docs/specification/data-models/
   * @param models parsed Sails models as per `parsers.parseModels()` 
   * @returns 
   */
export const generateSchemas = (models: { [globalId: string]: SwaggerSailsModel }) => {
  return null
}