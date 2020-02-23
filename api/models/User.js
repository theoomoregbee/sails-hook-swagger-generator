/**
 * User.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

/**
* @swagger
*
* /User:
*   tags:
*     - User (ORM)
*     - User (ORM duplicate)
*
* /find:
*   description: >
*     _Alternate description_: Find a list of **User** records that match the specified criteria.
*
* tags:
*
*   - name: User (ORM)
*     description: |
*       A longer, multi-paragraph description
*       explaining how this all works.
*
*       It is linked to more information.
*
*     externalDocs:
*       url: https://somewhere.com/yep
*       description: Refer to these docs
*/

module.exports = {

  attributes: {
    id: {
      type: 'number',
      autoIncrement: true,
    },
    names: {
      type: 'string',
      required: true,
      example: 'First Middle Last'
    },
    email: {
      type: 'string',
      email: true,
      description: 'Just any old email',
    },
    sex: {
      type: 'string',
      enum: ['Male', 'Female']
    },
    ageLimit: {
      type: 'number',
      min: 15,
      max: 100
    }

  },

  swagger: {

    actions: {
      findone: {
        description: '_Alternate description_: Look up the **User** record with the specified ID.'
      }
    },
    tags: [
      {
        name: 'User (ORM duplicate)',
        externalDocs: {
          url: 'https://somewhere.com/alternate',
          description: 'Refer to these alternate docs'
        }
      }
    ],
    components: {
      parameters: []
    }
  }

};

