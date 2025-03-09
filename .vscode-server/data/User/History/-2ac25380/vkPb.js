var express = require('express');
var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
	res.send('Nothing match index.html in public folder.');
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
    socket.on('join room', (room) => {
        socket.join(room);
    });

    socket.on('cursor move', (data) => {
        // Ensure you include room in your data from the client
        const room = data.room;
        const positionData = { socketId: socket.id, position: data.position, color: userColors[socket.id], username: userNames[socket.id] };
        io.to(room).emit('cursor update', positionData);
    });

    socket.on('connect dot', (data) => {
        // Include the room in your data from the client
        const room = data.room;
        const color = userColors[socket.id];
        const updatedData = { ...data, color: color }; // Include the user's color in the data
        io.to(room).emit('dot connected', updatedData);
    });

    //-=============================== END ===============================

    socket.on('disconnect', function () {
        console.log("Client has disconnected " + socket.id);
        // Emit a user disconnected event to each room the user was part of
        // This may require tracking which rooms a user has joined
        // For simplicity, this example doesn't explicitly manage room membership on disconnect

        if (userColors[socket.id]) {
            availableColors.push(userColors[socket.id]);
            delete userColors[socket.id];
        }
        if (userNames[socket.id]) {
            availableNames.push(userNames[socket.id]);
            delete userNames[socket.id];
        }
    });
});
