var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var videoInfoSchema = new Schema({
  name: String,
  feedback: [
    {
      userId: String,
      startTime: Number,
      endTime: Number,
      feedback: String
    }
  ],
  emojiFeedback: [
      {
        userId: String,
        startTime: Number,
        emoji: Number
      }
  ]
});

module.exports = mongoose.model('video_info', videoInfoSchema);
