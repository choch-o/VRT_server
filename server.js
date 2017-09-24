var http = require('http');
var express = require('express');

var port = 4000;
var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);
var router = require('./router/router')(app, io);
var upload = require('express-fileupload');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');

var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function() {
  console.log('connected to mongod server')
});

mongoose.connect('mongodb://emma.kaist.ac.kr/reaction_tagging')
// mongoose.connect('mongodb://143.248.78.115/reaction_tagging')

app.use(upload());
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use('/videos', express.static(__dirname + '/static/videos'));

server.listen(port, function() {
	console.log('http server listening on port ' + port)
});

io.on('connection', function(socket) {
  socket.emit('connected', 'Hello, client!')
});
