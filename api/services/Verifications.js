/**
 * Created by theophy on 14/05/2017.
 *
 * this holds our verification types
 */

module.exports = function () {
  var types = {
    SIGNUP: 'SIGNUP', //when the person signs up
    PASSWORD: 'PASSWORD',//when the user want to change password
    UPDATE_PROFILE: 'UPDATE_PROFILE'//when you want to update profile
  };
  return Enum(types);
};
