module.exports = {

  friendlyName: 'Get User (find one) (A2)',

  description: '**Actions2** override of blueprint action: Look up the **User** record with the specified ID.',

  inputs: {
    _id: {
      description: 'The ID of the user to look up (actions2 version)',
      type: 'number',
      isInteger: true,
      required: true,
      meta: { swagger: { readOnly: true } },
    },
  },

  exits: {
    success: {
      description: 'Another success',
      outputExample: 'Some dynamic message like this.',
      meta: { swagger: { exclude: true } },
    },
    notFound: {
      description: 'No user with the specified ID was found in the database (actions2 version)',
      responseType: 'notFound',
      statusCode: 404,
    }
  },

  fn: async function ({ userId }) {
    return {
      message: 'TEST ACTIONS2 (foobar) ' + userId,
    };

  }

};
