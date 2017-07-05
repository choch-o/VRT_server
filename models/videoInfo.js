var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var videoInfoSchema = new Schema({
  name: String,
  feedback: [
    {
      startTime: Number,
      endTime: Number,
      feedback: String
    }
  ],
  emojiFeedback: [
      {
        startTime: Number,
        emoji: Number
      }
  ]
});

module.exports = mongoose.model('video_info', videoInfoSchema);
