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
    tags: [ 'Actions2 Group' ],
    responses: {
      '200': {
        content: {
          'application/json': {
            schema: { type: 'number', default: 123, },
          },
        },
      }
    },
    _tags: [
      {
        name: 'Actions2 Group',
        description: 'A test actions2 group',
      },
    ],
  },

  fn: async function ({userId}) {

    return {
      message: 'TEST ACTIONS2 (foobar) ' + userId,
    };

  }

};
