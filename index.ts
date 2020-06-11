import * as path from 'path';
import swaggerDoc from './lib/swagger-doc';
import { SwaggerGenerator } from './lib/interfaces';


module.exports = (sails: Sails.Sails): Sails.Hook<SwaggerGenerator> => {
  const routes: Sails.Route[] = [];

  return {

    defaults: {
      disabled: false,
      __configKey__: {
        swaggerJsonPath: path.join(sails.config.appPath, '/swagger/swagger.json'),
        swagger: {
          openapi: '3.0.0',
          info: {
            title: 'Swagger Json',
            description: 'This is a generated swagger json for your sails project',
            termsOfService: 'http://example.com/terms',
            contact: {
              name: 'Theophilus Omoregbee',
              url: 'http://github.com/theo4u',
              email: 'theo4u@ymail.com'
            },
            license: { name: 'Apache 2.0', url: 'http://www.apache.org/licenses/LICENSE-2.0.html' },
            version: '1.0.0'
          },
          servers: [
            { url: 'http://localhost:1337/' }
          ],
          externalDocs: { url: 'https://theoomoregbee.github.io/' }
        },
        excludeDeprecatedPutBlueprintRoutes: true,
      }
    },
    // Run when sails loads-- be sure and call `next()`.
    initialize: function (next): void {

      // https://github.com/balderdashy/sails/blob/master/lib/EVENTS.md#routerbind
      sails.on('router:bind', routeObj => {
        routes.push(routeObj);
      });

      sails.after('ready', async () => {
        await swaggerDoc(sails, routes, this);
      });
      next();
    }

  };
}
