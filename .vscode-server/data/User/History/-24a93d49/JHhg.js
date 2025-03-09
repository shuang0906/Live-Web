var https = require('https');
var fs = require('fs'); // Using the filesystem module

// Database to store data
var Datastore = require('nedb');
var db = new Datastore({filename: "data.db", autoload: true});

const express = require('express');
//var siofu = require('socketio-file-upload');
var app = express();
app.use(express.static(__dirname+"/uploads"));
//app.use(siofu.router);
app.listen(8000, () => {
    console.log('Server is running on port 8000');
});

const credentials = {
    key: fs.readFileSync('/etc/ssl/mycerts/selfsigned.key'),
    cert: fs.readFileSync('/etc/ssl/mycerts/selfsigned.crt')
};


// Tell Express to look in the "public" folder for any files first
app.use(express.static('public'));

// If the user just goes to the "route" / then run this function
app.get('/', function (req, res) {
//   res.send('Hello World!')
    res.sendFile(__dirname + "/index.html");
});


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

const users = {}; // Tracks users and their cursor positions

const allColors = ['Red','Salmon','DarkRed','DeepSkyBlue','DodgerBlue','Blue','Orange','OrangeRed','Gold','Lime','LimeGreen','DarkGreen','Pink','HotPink','Magenta','BlueViolet','MediumPurple'];
let availableColors = [...allColors]; 

const allNames = ['Spaghetti', 'Fusilli', 'Ravioli', 'Lasagna', 'Macaroni', 'Ditalini', 'Orzo', 'Gnocchi', 'Ziti', 'Angel hair', 'Cavatappi', 'Rotini', 'Cavatelli', 'Gemelli', 'Conchiglie', 'Long pasta', 'Tortellini', 'Egg noodles', 'Rotelle', 'Campanelle', 'Capellini', 'Radiatori', 'Manicotti'];
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

	socket.join('some room');

    assignRandomFromPool(availableColors, userColors, socket, 'assign color');
    assignRandomFromPool(availableNames, userNames, socket, 'assign username');

	socket.on('cursor move', (data) => {
		io.to('some room').emit('cursor update', { socketId: socket.id, position: data, color: userColors[socket.id], username: userNames[socket.id] });
	});

	socket.on('cursor move1', (data) => {
		io.to('some room').emit('cursor update1', { socketId: socket.id, position: data, color: userColors[socket.id], username: userNames[socket.id] });
	});

	socket.on('connect dot', (data) => {
		// Make sure to include the color of the user who is connecting the dots
		const color = userColors[socket.id];
		const updatedData = { ...data, color: color }; // Include the user's color in the data
		io.to('some room').emit('dot connected', updatedData);
	});

	socket.on('connect dot1', (data) => {
		// Make sure to include the color of the user who is connecting the dots
		const color = userColors[socket.id];
		const updatedData = { ...data, color: color }; // Include the user's color in the data
		io.to('some room').emit('dot connected1', updatedData);
		//push
	});
	

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