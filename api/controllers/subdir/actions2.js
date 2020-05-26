/**
 * @swagger
 * tags:
 *   name: Actions2 Mgt
 *   description: Actions2 testing
 *
 * components:
 *   examples:
 *     dummyA2:
 *       summary: Another example example
 *       value: 4
 */

module.exports = {

  /**
   * @swagger
   * /actions2:
   *   description: Swagger element below should take precedence
   *   tags:
   *     - Ditto
   */

  friendlyName: 'Friendly',

  description: 'Friendly description',

  inputs: {
    userId: {
      description: 'The ID of the user to look up',
      type: 'number',
      isInteger: true,
      required: true,
      meta: { swagger: { readOnly: true } },
    }
  },

  exits: {
    success: {
      description: 'Another success',
      outputExample: 'Some dynamic message like this.'
    },
    successAgain: {
      description: 'Another success (2)',
      outputExample: {
        weatherPerson: 'Joaquin',
        days: [
          { tempCelsius: 21, windSpeedMph: 392 }
        ]
      }
    },
    notFound: {
      description: 'No user with the specified ID was found in the database',
      responseType: 'notFound',
      statusCode: 404,
    }
  },

  swagger: {
    actions: {
      actions2: {
        tags: ['Actions2 Group'],
        description: 'Return a user list',
        responses: {
          '200': {
            description: 'Done/Success',
            content: {
              'text/html': {
                schema: { type: 'string', description: 'Human readable result', },
              },
              'application/json': {
                schema: { type: 'number', default: 123, description: 'The **123** result' },
              },
            },
          },
          '500': {
            description: 'An unexpected error occurred'
          }
        },
      },
    },
    tags: [
      {
        name: 'Actions2 Group',
        description: 'A test actions2 group',
      },
    ],
    components: {
      parameters: [],
    },
  },

  fn: async function ({ userId }) {
    return {
      message: 'TEST ACTIONS2 (foobar) ' + userId,
    };

  }

};
