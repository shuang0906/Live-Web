var express = require('express');
var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
	res.send('Nothing match index.html in pubblic folder.')
});

var https = require('https');
var fs = require('fs'); // Using the filesystem module

var credentials = { 
key: fs.readFileSync('/etc/letsencrypt/live/sh7361.itp.io/privkey.pem'), 
cert: fs.readFileSync('/etc/letsencrypt/live/sh7361.itp.io/cert.pem') 
};

// Start Normal Express Code
var express = require('express');
var app = express();

app.get('/', function(req, res) {
	res.send("Hello World!");
});
/////

var httpsServer = https.createServer(credentials, app);

// Default HTTPS Port
httpsServer.listen(443);

var io = require('socket.io')(httpsServer);

let messages = [];

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection', 
	// We are given a websocket object in our function
	function (socket) {
	
		console.log("We have a new client: " + socket.id);

		for (let i = 0; i < messages.length; i++) {
			socket.emit('chatmessage',messages[i]);
		}
		
		// When this user emits, client side: socket.emit('otherevent',some data);
		socket.on('chatmessage', function(data) {
			// Data comes in as whatever was sent, including objects
			console.log("Received: 'chatmessage' " + data);
			
			messages.push(data);

			// Send it to all of the clients
			//socket.broadcast.emit('chatmessage', data);
			io.emit('chatmessage', data);
		});

		socket.on('click', function(data) {
			io.emit('click', {});
		});
		
		socket.on('disconnect', function() {
			console.log("Client has disconnected " + socket.id);
		});
	}
);
	
