var multiparty = require('multiparty')
var fs = require('fs')
var glob = require('glob')
var path = require('path')
var mime = require('mime')
var VideoInfo = require('./../models/videoInfo')
var UserInfo = require('./../models/userInfo')
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

module.exports = function(app, io)
{
  app.get('/', function(req, res) {
    console.log('homepage access!');
    res.render('index.html');
  })

  app.get('/index.js', function(req, res) {
    res.sendFile(path.join(__dirname, '..', 'javascript/index.js'));
  })

  app.get('/feedback.js', function(req, res) {
    res.sendFile(path.join(__dirname, '..', 'javascript/feedback.js'));
  })

  app.post('/', function(req, res) {
    var form = new multiparty.Form();
    // get field name & value
    form.on('field',function(name,value) {
      console.log('normal field / name = ' + name + ' , value = ' + value);
    });

    // file upload handling
    form.on('part',function(part) {
      var filename;
      var size;
      if (part.filename) {
        filename = part.filename;
        size = part.byteCount;
      } else {
        part.resume();
      }

      console.log("Write Streaming file :" + filename);
      var writeStream = fs.createWriteStream(__dirname + '/../static/videos/' + filename);
      writeStream.filename = filename;
      part.pipe(writeStream);
      part.on('data', function(chunk) {
        console.log(filename + ' read ' + chunk.length + 'bytes');
      });

      part.on('end', function() {
        console.log(filename + ' Part read complete');
        var videoInfo = new VideoInfo();
        videoInfo.name = filename;
        videoInfo.feedback = [];
        videoInfo.emojiFeedback = [];
        videoInfo.prompt = [];
        videoInfo.save(function(err) {
          // if (err) {
          //   console.error(err);
          //   res.send({ result: 0 });
          //   return;
          // }
          // res.send({ result: 1 });
        });
        writeStream.end();
      });
    });

    // all uploads are completed
    form.on('close', function() {
      res.status(200).send('Upload complete');
    });

    // track progress
    form.on('progress', function(byteRead,byteExpected) {
      console.log(' Reading total  ' + byteRead + '/' + byteExpected);
    });

    form.parse(req);
  });

  app.get('/videos', function(req, res) {
    glob('static/videos/*', function(err, files) {
      console.log('files: ', files);
      res.send(files);
    });
  });

  app.get('/videos/:videoName', function(req, res) {
    var file = __dirname + '/../static/videos/' + req.params.videoName;

    var filename = path.basename(file);
    var stat = fs.statSync(file);
    var mimetype = mime.lookup(file);

    console.log(req.headers['range']);
    console.log(req.headers);

    var responseHeaders = {};
    var rangeRequest = readRangeHeader(req.headers['range'], stat.size);
    var filestream = fs.createReadStream(file);

    if (rangeRequest == null) {
      console.log("rangeRequest null");
      responseHeaders['Content-Type'] = mimetype;
      responseHeaders['Content-Length'] = stat.size;
      responseHeaders['Accept-Ranges'] = 'bytes';

      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      filestream.pipe(res);
    } else {
      var start = rangeRequest.Start;
      var end = rangeRequest.End;

      if (start >= stat.size || end >= stat.size) {
        console.log(416);
        res.setHeader('Content-Range', 'bytes */' + stat.size);
        res.status(416);
        res.end();
      } else {
        console.log(206);
        res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + stat.size);
        res.setHeader('Content-Length', start == end ? 0 : (end - start + 1));
        res.setHeader('Content-Type', mimetype);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');

        res.status(206);
        fs.createReadStream(file, { start: start, end: end }).pipe(res);
      }
    }
  })

  app.get('/apk', function(req, res) {
    var file = __dirname + '/../static/prototype.apk';
    var filename = path.basename(file);
    var mimetype = mime.lookup(file);

    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', mimetype);

    var filestream = fs.createReadStream(file);
    filestream.pipe(res);
  })

  app.get('/download_video/:videoName', function(req, res) {
    console.log('download video request!');
    var file = __dirname + '/../static/videos/' + req.params.videoName;
    console.log(file);
    var filename = path.basename(file);
    var mimetype = mime.lookup(file);

    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', mimetype);

    var filestream = fs.createReadStream(file);
    filestream.pipe(res);
  })

  app.post('/new_prompt/:videoName', function(req, res) {
    console.log('new prompt arrived!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
        newPrompt = {
          promptType: data.type,
          time: data.time,
          question: data.question,
          answers: []
        };
        videoInfo.prompt.push(newPrompt);
        videoInfo.save(function(err) {
          if (err) res.status(500).json({ error: 'failed to add new prompt' });
          res.json({ message: 'new prompt added' });
        });
      });
    });
  })

  app.post('/token_refreshed/:userId', function(req, res) {
    console.log('token refreshed arrived!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      console.log(req.params.userId + ": " + content);
      UserInfo.findOne({ userId: req.params.userId }, function(err, userInfo) {
        userInfo.userToken = content;
        userInfo.save(function(err) {
          if (err) res.status(500).json({ error: 'failed to update token' });
          res.json({ message: 'token updated' });
        })
      });
    });
  })

  app.post('/new_emoji_feedback/:videoName', function(req, res) {
    console.log('new emoji feedback arrived!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
        newEmoji = {
          userId: data.userId,
          startTime: data.startTime,
          emoji: data.emoji
        };
        console.log(newEmoji);
        videoInfo.emojiFeedback.push(newEmoji);
        videoInfo.save(function(err) {
          if (err) res.status(500).json({ error: 'failed to update emoji feedback' });
          res.json({ message: 'emoji feedback updated' });
          io.emit('emoji feedback addition', newEmoji);
        });
      });
    });
  });

  app.post('/new_feedback/:videoName', function(req, res) {
    console.log('new feedback arrived!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
        newFeedback = {
          userId: data.userId,
          startTime: data.startTime,
          endTime: data.endTime,
          feedback: data.feedback,
          like: [],
          thread: []
        };
        console.log(newFeedback);
        videoInfo.feedback.push(newFeedback);
        videoInfo.save(function(err) {
          if (err) res.status(500).json({ error: 'failed to update feedback' });
          res.json({ message: 'feedback updated' });
          io.emit('feedback addition', newFeedback);
        });
      });
    });
  });

  app.post('/new_prompt_answer/:videoName', function(req, res) {
    console.log('new prompt answer arrived!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
        newPromptAnswer = {
          userId: data.userId,
          answer: data.answer
        };
        console.log(newPromptAnswer);
        for (var i = 0; i < videoInfo.prompt.length; i++) {
          var prompt = videoInfo.prompt[i];
          if (prompt.promptType === data.type
            && prompt.time === data.time
            && prompt.question === data.question) {
              prompt.answers.push(newPromptAnswer);
              break;
          }
        }
        videoInfo.save(function(err) {
          if (err) res.status(500).json({ success: 'failed to update prompt answer' });
          res.json({ success: 'success' });
        });
      });
    });
  });

  app.post('/send_notification/:videoName', function(req, res) {
    console.log('send notification arrived!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      console.log(data);
      VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
        if (!data.isComment) {
          videoInfo.question.push({
            userId: data.feedback.userId,
            startTime: data.feedback.startTime,
            feedback: data.feedback.feedback,
            isComment: false,
            question: data.question,
            answers: []
          });
        } else {
          videoInfo.question.push({
            userId: data.feedback.thread[data.commentIndex].userId,
            startTime: data.feedback.startTime,
            feedback: data.feedback.thread[data.commentIndex].feedback,
            isComment: true,
            question: data.question,
            answers: []
          });
        }
        videoInfo.save(function(err) {
          if (err) {
            console.log(err);
            res.status(500).json({ success: false });
          } else {
            var userId;
            if (!data.isComment) userId = data.feedback.userId;
            else userId = data.feedback.thread[data.commentIndex].userId;
            UserInfo.findOne({ userId: userId }, function(err, userInfo) {
              var httpRequest = new XMLHttpRequest();
              httpRequest.onreadystatechange = () => {
                if (httpRequest.readyState === 4) {
                  if (httpRequest.status === 200) {
                    console.log(httpRequest.responseText);
                    res.json({ success: true });
                  }
                }
              }
              httpRequest.open('POST', 'https://fcm.googleapis.com/fcm/send', true);
              httpRequest.setRequestHeader('Authorization', 'key=AAAAHH3bJ-s:APA91bFzAT0EM_lRaFHUormHbOtev3PhKXhfuWgwAC3gMzaNGNeWellLyYsyc7ReSIqqlI_3IVzJnyMDioUablZD7tgXgiG-999aG8ahsk-iMM4MJyT3gXdyEhoXWpqvWRfN-BSQYGoW');
              httpRequest.setRequestHeader('Content-Type', 'application/json');
              httpRequest.send(JSON.stringify({
                to: userInfo.userToken,
                data: {
                  title: "AIFI",
                  message: "Please tell more about your feedback!",
                  userId: userInfo.userId,
                  videoName: req.params.videoName,
                  startTime: data.feedback.startTime
                }
              }));
            });
          }
        })
      });
    });
  });

  app.get('/get_emoji_feedback/:videoName', function(req, res) {
    console.log('emoji feedback request!');
    VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
      var emojiFeedback = videoInfo.emojiFeedback;
      res.json({ emojiFeedback : emojiFeedback });
    });
  });

  app.get('/get_feedback/:videoName', function(req, res) {
    console.log('feedback request!');
    VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
      res.json({ feedback: videoInfo.feedback });
    });
  });

  app.get('/get_question/:videoName', function(req, res) {
    console.log('question request!');
    VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
      res.json({ question: videoInfo.question });
    });
  });

  app.get('/get_prompt/:videoName', function(req, res) {
    console.log('prompt request!');
    VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
      var prompt = videoInfo.prompt;
      res.json({ prompt: prompt });
    });
  });

  app.get('/check_duplicate_id/:userId', function(req, res) {
    console.log('check duplicate id request!');
    UserInfo.find({ userId: req.params.userId }, function(err, userInfos) {
      console.log(userInfos);
      if (err) console.log(err);
      if (userInfos.length === 0) res.json({ duplicated: false });
      else res.json({ duplicated: true });
    });
  });

  app.post('/new_user', function(req, res) {
    console.log('new user request!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      console.log(data);
      var newUserInfo = new UserInfo();
      newUserInfo.userId = data.userId;
      newUserInfo.userPw = data.userPw;
      console.log(newUserInfo);
      newUserInfo.save(function(err) {
          console.log('new user save succeed!');
          if (err) res.status(500).json({ error: 'failed to save new user' });
          res.json({ result: 'success' });
      });
    });
  });

  app.post('/try_login', function(req, res) {
    console.log('try login request!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      console.log(data);
      UserInfo.find({ userId: data.userId, userPw: data.userPw }, function(err, userInfos) {
        if (userInfos.length === 0) res.json({ success: false });
        else res.json({ success: true });
      });
    });
  });

  app.post('/delete_feedback', function(req, res) {
    console.log('new delete feedback request!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      console.log(data);
      VideoInfo.findOne({ name: data.videoName }, function(err, videoInfo) {
        var feedbackList = videoInfo.feedback;
        console.log('feedback list');
        for (var i = 0; i < feedbackList.length; i++) {
          if (isSame(feedbackList[i], data))
            videoInfo.feedback.splice(i, 1);
        }
        videoInfo.save(function(err) {
          if (err) res.status(500).json({ success: false });
          res.json({ success: true });
        });
      });
    });
  });

  app.post('/give_like_to_feedback/:videoName', function(req, res) {
    console.log('new give like to feedback request!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      console.log(data);
      VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
        var feedbackList = videoInfo.feedback;
        for (var i = 0; i < feedbackList.length; i++) {
          if (isSame(feedbackList[i], data))
            videoInfo.feedback[i].like.push(data.likeUserId);
        }
        videoInfo.save(function(err) {
          if (err) res.status(500).json({ success: false });
          res.json({ success: true });
          io.emit('feedback like', {
            userId: data.userId,
            startTime: data.startTime,
            endTime: data.endTime,
            feedback: data.feedback,
            like: data.like,
            likeUserId: data.likeUserId
          })
        });
      });
    });
  });

  app.post('/give_like_to_thread_feedback/:videoName', function(req, res) {
    console.log('new give like to thread feedback request!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      console.log(data);
      VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
        var feedbackList = videoInfo.feedback;
        for (var i = 0; i < feedbackList.length; i++) {
          if (isSame(feedbackList[i], data))
            videoInfo.feedback[i].thread[data.threadIndex].like.push(data.likeUserId);
        }
        videoInfo.save(function(err) {
          if (err) res.status(500).json({ success: false });
          res.json({ success: true });
          io.emit('thread feedback like', {
            userId: data.userId,
            startTime: data.startTime,
            endTime: data.endTime,
            feedback: data.feedback,
            like: data.like,
            threadIndex: data.threadIndex,
            likeUserId: data.likeUserId
          })
        });
      });
    });
  });

  app.post('/new_thread_feedback/:videoName', function(req, res) {
    console.log('new thread feedback request!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      console.log(data);
      VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
        var feedbackList = videoInfo.feedback;
        for (var i = 0; i < feedbackList.length; i++) {
          if (isSame(feedbackList[i], data))
            videoInfo.feedback[i].thread.push({
              userId: data.threadUserId,
              feedback: data.threadFeedback,
              like: []
            });
        }
        videoInfo.save(function(err) {
          if (err) res.status(500).json({ success: false });
          res.json({ success: true });
          io.emit('thread feedback addition', {
            userId: data.userId,
            startTime: data.startTime,
            endTime: data.endTime,
            feedback: data.feedback,
            like: data.like,
            threadUserId: data.threadUserId,
            threadFeedback: data.threadFeedback
          })
        });
      });
    });
  });

  app.post('/new_question_answer/:videoName', function(req, res) {
    console.log('new question answer request!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      console.log(data);
      VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
        var questionList = videoInfo.question;
        for (var i = 0; i < questionList.length; i++) {
          if (isSameQuestion(questionList[i], data))
            videoInfo.question[i].answers.push({
              userId: data.userId,
              feedback: data.answer
            });
        }
        videoInfo.save(function(err) {
          if (err) res.status(500).json({ success: false });
          res.json({ success: true });
          io.emit('question answer addition', {
            userId: data.userId,
            startTime: data.startTime,
            feedback: data.feedback,
            question: data.question,
            answer: data.answer
          })
        });
      });
    });
  });

  app.get('/feedback/:videoName', function(req, res) {
    res.render('feedback', { videoName: req.params.videoName });
  });

  app.post('/log', function(req, res) {
    console.log('new log request!');
    var content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      var data = JSON.parse(content);
      console.log(data);
      var str = '\n' + data.userId + ',' + data.date.replace(',', '') + ',' + data.videoName + ',' + data.videoTime + ',' + data.latitude + ',' + data.longitude
      fs.appendFile(__dirname + '/../log.csv', str, function (err) {
        if (err) {
          console.log(err);
          res.json({ success: false });
        } else res.json({ success: true });
      });
    });
  })
}

function isSame(feedback1, feedback2) {
  if (feedback1.userId === feedback2.userId
    && feedback1.startTime === feedback2.startTime
    && feedback1.endTime === feedback2.endTime
    && feedback1.feedback === feedback2.feedback
    && JSON.stringify(feedback1.like) === JSON.stringify(feedback2.like))
    return true;
  return false;
}

function isSameQuestion(q1, q2) {
  if (q1.userId === q2.userId
    && q1.startTime === q2.startTime
    && q1.feedback === q2.feedback
    && q1.question === q2.question)
    return true;
  return false;
}

function readRangeHeader(range, totalLength) {
    if (range == null || range.length == 0)
        return null;

    var array = range.split(/bytes=([0-9]*)-([0-9]*)/);
    var start = parseInt(array[1]);
    var end = parseInt(array[2]);
    var result = {
        Start: isNaN(start) ? 0 : start,
        End: isNaN(end) ? (totalLength - 1) : end
    };

    if (!isNaN(start) && isNaN(end)) {
        result.Start = start;
        result.End = totalLength - 1;
    }

    if (isNaN(start) && !isNaN(end)) {
        result.Start = totalLength - end;
        result.End = totalLength - 1;
    }

    return result;
}
