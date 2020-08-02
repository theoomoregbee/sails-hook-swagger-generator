/**
 * ItemController
 *
 * @description :: Server-side logic for managing Items
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

  // override Item blueprint
  /**
   * @swagger
   *
   * /create:
   *   summary: Create Item (**)
   *   requestBody:
   *     content:
   *       application/x-www-form-urlencoded:
   *         schema:
   *           type: object
   *           properties:
   *             field1:
   *               type: string
   *             field2:
   *               type: string
   */
  create: (req, res) => {
    return res.json({ in: 'create' });
  },

  /**
   * @swagger
   *
   * /find:
   *   summary: List Item (**)
   *   parameters:
   *     - in: query
   *       name: where
   *       description: Override **just** the 'where' parameter.
   *       schema:
   *         type: string
   */
  find: (req, res) => {
    return res.json({ in: 'find' });
  },

};

