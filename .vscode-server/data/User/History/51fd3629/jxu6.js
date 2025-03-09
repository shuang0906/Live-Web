var https = require('https');
var fs = require('fs'); // Using the filesystem module

// Express is a node module for building HTTP servers
var express = require('express');
var app = express();

var credentials = {
key: fs.readFileSync('/etc/letsencrypt/live/sc7436.itp.io/privkey.pem'),
cert: fs.readFileSync('/etc/letsencrypt/live/sc7436.itp.io/cert.pem')
};


// Tell Express to look in the "public" folder for any files first
app.use(express.static('public'));

// If the user just goes to the "route" / then run this function
app.get('/', function (req, res) {
  res.send('Hello World!')
});

var uploadDir = __dirname + '/uploads'; // Directory to store uploaded videos
// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Here is the actual HTTP server 
//var http = require('http');
// We pass in the Express object
var httpsServer = https.createServer(credentials, app);

// Default HTTPS Port
httpsServer.listen(443);

// WebSocket Portion
// WebSockets work with the HTTP server
var io = require('socket.io')(httpsServer);

const path = require('path');


let drawingHistory = [];
// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection', 
	// We are given a websocket object in our function
	function (socket) {
	
		console.log("We have a new client: " + socket.id);
		
		socket.on('image', function(data) {
		        socket.broadcast.emit('image', data);
		});

        socket.on('video', function (data) {
            // Generate a unique filename for the video
            const fileName = Date.now() + '.mp4';
            const filePath = uploadDir + '/' + fileName;
    
            // Write the received video data to disk
            fs.writeFile(filePath, data, 'binary', function (err) {
                if (err) {
                    console.error('Error saving video:', err);
                    return;
                }
                console.log('Video saved:', fileName);
    
                // Emit the URL of the saved video to connected clients
                const fileUrl = 'https://yourdomain.com/uploads/' + fileName; // Change 'yourdomain.com' to your actual domain
                io.emit('videoUrl', fileUrl);
            });
        });


		socket.emit('history', drawingHistory);
		socket.on('mouse', function(data) {
			drawingHistory.push(data);
		        socket.broadcast.emit('mouse', data);

		});
		// When this user emits, client side: socket.emit('otherevent',some data);
		socket.on('chatmessage', function(data) {
			// Data comes in as whatever was sent, including objects
			console.log("Received: 'chatmessage' " + socket.id + " " + data);
			
			// Send it to all of the clients
			socket.broadcast.emit('chatmessage', data);
		});
	
		socket.on('reset', function() {
			drawingHistory.length = 0;
			socket.broadcast.emit('reset');

                });
		socket.on('disconnect', function() {
			console.log("Client has disconnected " + socket.id);
		});
	}
);
