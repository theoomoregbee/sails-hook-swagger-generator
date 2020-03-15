/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#!/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {

  /***************************************************************************
   *                                                                          *
   * Make the view located at `views/homepage.ejs` (or `views/homepage.jade`, *
   * etc. depending on your default view engine) your home page.              *
   *                                                                          *
   * (Alternatively, remove this and add an `index.html` file in your         *
   * `assets` directory)                                                      *
   *                                                                          *
   ***************************************************************************/

  //not needed for now since no asset just api
  // '/': {
  //   view: 'homepage'
  // },

  /***************************************************************************
   *                                                                          *
   * Custom routes here...                                                    *
   *                                                                          *
   * If a request to a URL doesn't match any of the custom routes above, it   *
   * is matched against Sails route blueprints. See `config/blueprints.js`    *
   * for configuration options and examples.                                  *
   *                                                                          *
   ***************************************************************************/

  /** @swagger
   * /clients/:client_id/user/:id:
   *   delete:
   *     summary: Client Op
   *     description: This is not really useful - example only :)
   */
  'delete /clients/:client_id/user/:id': 'UserController.destroy',

  'post /user': {
    controller: 'UserController',
    action: 'create',
  },

  'post /user/login': {
    controller: 'UserController',
    action: 'login',
    swagger: {
      summary: 'Authentication',
      description: 'This is for authentication of any user',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              properties: {
                email: { type: 'string' },
                password: { type: 'string', format: 'password' }
              },
              required: ['email', 'password'],
            },
          },
        },
      },
      responses: {
        '200': { description: 'Success' },
      }
    }
  },

  'get /user/logout': 'UserController.logout',
  'get /user/list': 'UserController.list',
  'get /user/list2': 'user.list2',
  'all /user/list3': 'user.list3',

  'get /actions2': 'subdir/actions2',

  // 'get /user/test/:phoneNumber': 'UserController.logout',

  'get /user/test/:phoneNumber': {
    action: 'user/logout',
    swagger: {
      summary: 'Phone No. Logout',
      description: 'Alternate description (of no real significance)'
    }
  },

  'get /user/upload': {
    controller: 'UserController',
    action: 'upload',
    swagger: {
      parameters: [{
        in: 'query',
        name: 'data',
        required: true,
        schema: {
          type: 'string',
        },
        description: 'The data',
      }],
      responses: {
        '200': { description: 'Success' },
      }
    }
  },

  'put /user/roles': {
    controller: 'UserController',
    action: 'roles',
    swagger: {
      summary: 'update user roles',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              properties: {
                roles: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['roles']
            }
          },
        },
      },
      responses: {
        '200': { description: 'Success' },
      }
    }
  }

};
