var express = require('express');
var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
	res.send('Nothing match index.html in pubblic folder.')
});

var http = require('http');
var httpServer = http.createServer(app);
httpServer.listen(80);

var io = require('socket.io')(httpServer);


const users = {}; // Tracks users and their cursor positions

const allColors = ['red', 'green', 'blue', 'yellow', 'purple', 'orange'];
let availableColors = [...allColors]; // Initially, all colors are available

const allNames = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'];
let availableNames = [...allNames]; // Initially, all colors are available

const userColors = {};
const userNames = {}; // Map socket IDs to allNames


io.sockets.on('connection', function (socket) {
	console.log("We have a new client: " + socket.id);

	// Assign a random color to the user from available colors
	if (availableColors.length > 0) {
		const colorIndex = Math.floor(Math.random() * availableColors.length);
		const userColor = availableColors[colorIndex];
		userColors[socket.id] = userColor;
		// Remove the assigned color from available colors
		availableColors.splice(colorIndex, 1);

		// Immediately send back the assigned color to the user
		io.to(socket.id).emit('assign color', userColor);
	} else {
		console.error('No more colors available');
		// Handle the case where there are no available colors (e.g., assign a default color or reject connection)
	}

	if (availableNames.length > 0) {
		const nameIndex = Math.floor(Math.random() * availableNames.length);
		const userName = availableNames[nameIndex];
		userNames[socket.id] = userName;
		availableNames.splice(nameIndex, 1);

		io.to(socket.id).emit('assign username', userName);
	} else {
		console.error('No more names available');
	}

	socket.on('chatmessage', function (data) {
		console.log("Received: 'chatmessage' " + data);
		io.emit('chatmessage', data);
	});

	socket.on('click', function (data) {
		console.log("Received: 'click' " + data);
		io.emit('click', data);
	});

	//=============================== IRIS AND SHUN ===============================
	socket.on('cursor move', (data) => {
		// users[socket.id] = data;
		socket.broadcast.emit('cursor update', { socketId: socket.id, position: data, color: userColors[socket.id], username: userNames[socket.id] });
		// io.emit('cursor update', { socketId: socket.id, position: data });

	});

	socket.on('connect dot', (data) => {
		io.emit('dot connected', data);
		io.emit('dot color change', data);
	});

	//-=============================== END ===============================

	socket.on('disconnect', function () {
		io.emit('user disconnected', socket.id);
		if (userColors[socket.id]) {
			availableColors.push(userColors[socket.id]);
			delete userColors[socket.id];
		}
		if (userNames[socket.id]) {
			availableNames.push(userNames[socket.id]);
			delete userNames[socket.id];
		}
		console.log("Client has disconnected " + socket.id);
	});
}
);