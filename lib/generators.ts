/**
 * Maps from a Sails route path of the form `/path/:id` to a
 * Swagger path of the form `/path/{id}`. and the path variables
 */
export const  generateSwaggerPath = (path: string): {variables: string[]; path: string}  => {
    const variables: string[] = [];
    const swaggerPath = path
      .split('/')
      .map(v => {
        const match = v.match(/^:([^/:?]+)\??$/);
        if (match) {
          variables.push(match[1]);
          return '{' + match[1] + '}';
        }
        return v;
      })
      .join('/');
    return { variables, path: swaggerPath };
  }