/**
 * Created by theophy on 05/05/2017.
 *
 * this is used to check if the user performing the action is an admin
 *
 */

module.exports = function (req, res, next) {

  var user = req.user;

  if (user)
    return res.forbidden("You are not an admin");

  next();
};
