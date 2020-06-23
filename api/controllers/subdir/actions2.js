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
      example: 123456,
      meta: { swagger: { readOnly: true } },
    },
    addExtra: {
      description: 'Should extra details be reported',
      example: true,
    },
    excludedUserId: {
      description: 'The ID of the user to look up (should be excluded from Swagger)',
      type: 'number',
      isInteger: true,
      required: true,
      meta: { swagger: { exclude: true } },
    }
  },

  exits: {
    success: {
      description: 'A successful result',
    },
    alternateSuccess: {
      description: 'Alternate success',
      outputExample: 'Some dynamic message like this.',
    },
    alternateSuccess2: {
      description: 'Alternate success (2)',
      outputExample: 93.45,
    },
    excludedSuccess: {
      description: 'Another success (should be excluded from Swagger)',
      outputExample: 'Some dynamic message like this.',
      meta: { swagger: { exclude: true } },
    },
    successAgain: {
      description: 'Another success (partial content)',
      outputExample: {
        weatherPerson: 'Joaquin',
        days: [
          { tempCelsius: 21, windSpeedMph: 392 }
        ]
      },
      // statusCode: 206,
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
          '206': {
            description: 'Done/Success (partial)',
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
