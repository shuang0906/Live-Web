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
let availableColors = [...allColors]; 

const allNames = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'];
let availableNames = [...allNames];

const userColors = {};
const userNames = {}; 

function assignRandomFromPool(pool, assigned, socket, emitEventName) {
    if (pool.length > 0) {
        const index = Math.floor(Math.random() * pool.length);
        const item = pool[index];
        assigned[socket.id] = item;
        pool.splice(index, 1); // Remove the assigned item from the pool

        // Immediately send back the assigned item to the user
        io.to(socket.id).emit(emitEventName, item);
    } else {
        console.error(`No more items available for ${emitEventName}`);
        // Handle the case where there are no available items
    }
}

io.sockets.on('connection', function (socket) {
	console.log("We have a new client: " + socket.id);

    assignRandomFromPool(availableColors, userColors, socket, 'assign color');
    assignRandomFromPool(availableNames, userNames, socket, 'assign username');

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
		//users[socket.id] = data;
		//socket.broadcast.emit('cursor update', { socketId: socket.id, position: data, color: userColors[socket.id], username: userNames[socket.id] });
		io.emit('cursor update', { socketId: socket.id, position: data, color: userColors[socket.id], username: userNames[socket.id] });

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