/**
 * @swagger
 * tags:
 *   name: Action2 Mgt
 *   description: Action2 testing
 */

module.exports = {

  friendlyName: 'Friendly',

  description: 'Friendly description',

  inputs: {
    userId: {
      description: 'The ID of the user to look up.',
      type: 'number',
      required: true
    }
  },

  exits: {
    success: {
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
            content: {
              'application/json': {
                schema: { type: 'number', default: 123, },
              },
            },
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
