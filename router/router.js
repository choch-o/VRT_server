var multiparty = require('multiparty')
var fs = require('fs')
var glob = require('glob')
var path = require('path')
var mime = require('mime')
var VideoInfo = require('./../models/videoInfo')

module.exports = function(app, io)
{
  app.get('/', function(req, res) {
    res.render('index.html')
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
        let videoInfo = new VideoInfo();
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
    glob('static/videos/*.mp4', function(err, files) {
      console.log('files: ', files);
      res.send(files);
    });
  });

  app.get('/videos/:videoName', function(req, res) {
    var file = __dirname + '/../static/videos/' + req.params.videoName;

    var filename = path.basename(file);
    var mimetype = mime.lookup(file);

    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', mimetype);

    var filestream = fs.createReadStream(file);
    filestream.pipe(res);
  })

  app.post('/new_emoji_feedback/:videoName', function(req, res) {
    console.log('new emoji feedback arrived!');
    let content = '';

    req.on('data', function(data) {
      content += data;
    });

    req.on('end', function() {
      let data = JSON.parse(content);
      VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
        newEmoji = {
          startTime: data.startTime,
          emoji: data.emoji
        };
        videoInfo.emojiFeedback.push(newEmoji);
        videoInfo.save(function(err) {
          if (err) res.status(500).json({ error: 'failed to update emoji feedback' });
          res.json({ message: 'emoji feedback updated' });
        });
      });
    });
  });

  app.post('/new_feedback/:videoName', function(req, res) {
    VideoInfo.findOne({ name: req.params.videoName }, function(err, videoInfo) {
      newFeedback = {
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        feedback: req.body.feedback
      };
      videoInfo.feedback.push(newFeedback);
      videoInfo.save(function(err) {
        if (err) res.status(500).json({ error: 'failed to update feedback' });
        res.json({ message: 'feedback updated' });
      });
    });
  });
}
