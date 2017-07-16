var multiparty = require('multiparty')
var fs = require('fs')
var glob = require('glob')
var path = require('path')
var mime = require('mime')
var VideoInfo = require('./../models/videoInfo')
var UserInfo = require('./../models/userInfo')

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

    var responseHeaders = {};
    var rangeRequest = readRangeHeader(req.headers['range'], stat.size);
    var filestream = fs.createReadStream(file);

    if (rangeRequest == null) {
      responseHeaders['Content-Type'] = mimetype;
      responseHeaders['Content-Length'] = stat.size;
      responseHeaders['Accept-Ranges'] = 'bytes';

      // res.setHeader('Content-disposition', 'attachment; filename=' + filename);
      res.setHeader('Content-Type', mimetype);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Accept-Ranges', 'bytes');
      filestream.pipe(res);
    } else {
      var start = rangeRequest.Start;
      var end = rangeRequest.End;

      if (start >= stat.size || end >= stat.size) {
        res.setHeader('Content-Range', 'bytes */' + stat.size);
        res.status(416);
        res.end();
      } else {
        res.setHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + stat.size);
        res.setHeader('Content-Length', start == end ? 0 : (end - start + 1));
        res.setHeader('Content-Type', mimetype);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');

        res.status(206);
        filestream.pipe(res);
      }
    }
  })

  app.get('/prototype_apk', function(req, res) {
    var file = __dirname + '/../static/HYFBABP.apk';
    var filename = path.basename(file);
    var mimetype = mime.lookup(file);

    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', mimetype);

    var filestream = fs.createReadStream(file);
    filestream.pipe(res);
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
      var feedback = videoInfo.feedback;
      res.json({ feedback : feedback });
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
    console.log('new user request!');
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

  app.get('/feedback/:videoName', function(req, res) {
    res.render('feedback', { videoName: req.params.videoName });
  });
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

function readRangeHeader(range, totalLength) {
        /*
         * Example of the method 'split' with regular expression.
         *
         * Input: bytes=100-200
         * Output: [null, 100, 200, null]
         *
         * Input: bytes=-200
         * Output: [null, null, 200, null]
         */

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
