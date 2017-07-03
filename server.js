var http = require('http')
var express = require('express')

var port = 3000
var app = express()
var router = require('./router/router')(app)

// app.use(express.urlencoded());
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.engine('html', require('ejs').renderFile)

http.createServer(app).listen(port, function() {
	console.log('http server listening on port ' + port)
})
