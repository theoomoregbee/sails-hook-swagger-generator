/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
        names: {
            type: 'string'
        },
        email: {
            type: 'string',
            email: true
        },
        sex: {
            type: 'string',
            enum: ["Male", "Female"]
        }

    }
};

