var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userInfoSchema = new Schema({
  userId: String,
  userPw: String,
  userToken: String
});

module.exports = mongoose.model('user_info', userInfoSchema);
