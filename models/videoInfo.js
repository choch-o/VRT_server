var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// var videoInfoSchema = new Schema({
//   name: String,
//   feedback: [
//     {
//       userId: String,
//       startTime: Number,
//       endTime: Number,
//       feedback: String
//     }
//   ],
//   emojiFeedback: [
//       {
//         userId: String,
//         startTime: Number,
//         emoji: Number
//       }
//   ]
// });

// Thread
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
  ]
});

// Editing
// var videoInfoSchema = new Schema({
//   name: String,
//   feedback: [
//     {
//       startTime: Number,
//       endTime: Number,
//       feedbackHistory: [
//         {
//           userId: String,
//           feedback: String,
//           like: [
//             userId: String
//           ]
//         }
//       ]
//     }
//   ],
//   emojiFeedback: [
//       {
//         userId: String,
//         startTime: Number,
//         emoji: Number
//       }
//   ]
// });

module.exports = mongoose.model('video_info', videoInfoSchema);
