var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var videoInfoSchema = new Schema({
  name: String,
  feedback: [
    {
      userId: String,
      startTime: Number,
      endTime: Number,
      feedback: String,
      like: [ String ],
      thread: [
        {
          userId: String,
          feedback: String,
          like: [ String ]
        }
      ]
    }
  ],
  emojiFeedback: [
      {
        userId: String,
        startTime: Number,
        emoji: Number
      }
  ],
  prompt: [
    {
      promptType: Number,
      time: Number,
      question: String,
      answers: [
        {
          userId: String,
          answer: String
        }
      ]
    }
  ],
  question: [
    {
      userId: String,
      startTime: Number,
      feedback: String,
      isComment: Boolean,
      question: String,
      answers: [
        {
          userId: String,
          feedback: String
        }
      ]
    }
  ]
});

module.exports = mongoose.model('video_info', videoInfoSchema);
