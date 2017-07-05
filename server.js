var http = require('http')
var express = require('express')

var port = 3000
var app = express()
var router = require('./router/router')(app)
var upload = require('express-fileupload')
var bodyParser = require('body-parser')

app.use(upload())
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(bodyParser.json())
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.engine('html', require('ejs').renderFile)

app.use('/videos', express.static(__dirname + '/static/videos'))

http.createServer(app).listen(port, function() {
	console.log('http server listening on port ' + port)
})
