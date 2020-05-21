/**
 * OldPet.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

  primaryKey: 'petID',

  attributes: {
    petID: {
      type: 'number',
      autoIncrement: true,
      meta: {
        swagger: { readOnly: true }
      }
    },
    names: {
      type: 'string',
      required: true,
      example: 'Pet\'s full name'
    },
    _internalField: {
      type: 'string',
      meta: {
        swagger: { exclude: true }
      }
    },
    owner: {
      model: 'User',
    },
    caredForBy: {
      model: 'User',
    },
  },

  swagger: {
    model: { exclude: true }
  },

};

