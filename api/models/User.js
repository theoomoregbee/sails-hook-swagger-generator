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
 *   description: |
 *     You might write a short summary of how this **User** model works and what it represents here.
 *
 *   tags:
 *     - User (ORM)
 *     - User (ORM duplicate)
 *
 * /allActions:
 *   externalDocs:
 *     url: https://somewhere.com/yep
 *     description: Refer to these docs for more info
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
 *
 * components:
 *   examples:
 *     modelDummy:
 *       summary: A model example example
 *       value: dummy
 */

module.exports = {
  attributes: {
    id: {
      type: "number",
      autoIncrement: true,
    },
    names: {
      type: "string",
      required: true,
      example: "First Middle Last",
    },
    email: {
      type: "string",
      isEmail: true,
      description: "Just any old email",
    },
    sex: {
      type: "string",
      isIn: ["Male", "Female"],
    },
    ageLimit: {
      type: "number",
      min: 15,
      max: 100,
    },
    advancedOptions: {
      type: "json",
      example: {
        useDefaults: false,
        customName: 'foobar',
      },
    },
    advancedOptionsAny: {
      type: "json",
      example: {
        useDefaults: false,
        customName: 'foobar again',
      },
      meta: { swagger: { type: null } },
    },
    data: {
      description: "Some custom JSON data",
      type: "ref",
      columnType: "MEDIUMBLOB",
      example: {
        lots: 'lot',
        data: [3, 4, 5],
        more: [3.3, 2.344],
        andMore: ['mixed', 3, true],
      }
    },
    pets: {
      collection: "Pet",
      via: "owner",
    },
    favouritePet: {
      model: "Pet",
    },
    neighboursPets: {
      collection: "Pet",
      via: "caredForBy",
    },
    createdAt: {
      type: "ref",
      columnType: "DATETIME",
      autoCreatedAt: true,
    },
    updatedAt: {
      type: "ref",
      columnType: "DATETIME",
      autoUpdatedAt: true,
    },
  },

  swagger: {
    actions: {
      findone: {
        description:
          "_Alternate description_: Look up the **User** record with the specified ID.",
      },
    },
    tags: [
      {
        name: "User (ORM duplicate)",
        externalDocs: {
          url: "https://somewhere.com/alternate",
          description: "Refer to these alternate docs",
        },
      },
    ],
    components: {
      parameters: [],
    },
  },
};
