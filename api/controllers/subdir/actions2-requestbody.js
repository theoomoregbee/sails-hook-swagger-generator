module.exports = {

  /**
   * @swagger
   * /actions2-requestbody:
   *   tags:
   *     - Actions2 Group
   */

  friendlyName: 'Friendly (RB)',

  inputs: {
    dummyHeader: {
      description: 'A value for the request header',
      type: 'string',
      example: 'why-not',
      meta: { swagger: { in: 'header' } },
    },
    dummyCookie: {
      description: 'A cookie',
      type: 'string',
      example: 'why-not-indeed',
      meta: { swagger: { in: 'cookie' } },
    },
    userId: {
      description: 'The ID of the user to look up',
      type: 'number',
      isInteger: true,
      required: true,
      example: 123456,
      meta: { swagger: { in: 'body' } },
    },
    userName: {
      description: 'The user\'s name',
      example: 'John Smith',
      meta: { swagger: { in: 'body' } },
    },
    addExtra: {
      description: 'Should extra details be reported',
      example: true,
      meta: { swagger: { in: 'body' } },
    },
    excludedUserId: {
      description: 'The ID of the user to look up (should be excluded from Swagger)',
      type: 'number',
      isInteger: true,
      required: true,
      meta: { swagger: { exclude: true } },
    },
    verbose: {
      description: 'Should we provide verbose output',
      type: 'boolean',
    }
  },

  exits: {
    success: {
      description: 'A successful result',
    },
  },

  fn: async function ({ userId }) {
    return {
      message: 'TEST ACTIONS2 (request body alternative) ' + userId,
    };

  }

};
