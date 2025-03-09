var Datastore = require('nedb');
var db = new Datastore({filename: "data.db", autoload: true});

var fs = require('fs');

var express = require('express');
var app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
	res.send('Nothing match index.html in pubblic folder.')
});

var https = require('https');

var options = {
  key: fs.readFileSync('/etc/letsencrypt/live/sh7361.itp.io/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/sh7361.itp.io/fullchain.pem')
};

var httpServer = https.createServer(options, app);

httpServer.listen(4443);

let peers = [];

var io = require('socket.io')(httpServer);

// ------------ give user name
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
// ------------ give user name end

io.sockets.on('connection', function (socket) {
	peers.push({socket: socket});
	console.log("We have a new client: " + socket.id + " peers length: " + peers.length);

	socket.on('list', function() {
		let ids = [];
		for (let i = 0; i < peers.length; i++) {
			ids.push(peers[i].socket.id);
		}
		console.log("ids length: " + ids.length);
		socket.emit('listresults', ids);			
	});
	
	// Relay signals back and forth
	socket.on('signal', (to, from, data) => {
		console.log("SIGNAL", to, data);
		let found = false;
		for (let i = 0; i < peers.length; i++) {
			console.log(peers[i].socket.id, to);
			if (peers[i].socket.id == to) {
				console.log("Found Peer, sending signal");
				peers[i].socket.emit('signal', to, from, data);
				found = true;
				break;
			}				
		}	
		if (!found) {
			console.log("never found peer");
		}
	});
	
    assignRandomFromPool(availableColors, userColors, socket, 'assign color');
    assignRandomFromPool(availableNames, userNames, socket, 'assign username');

	socket.on('cursor move', (data) => {
		io.to('some room').emit('cursor update', { socketId: socket.id, position: data, color: userColors[socket.id], username: userNames[socket.id] });
	});

	socket.on('connect dot', (data) => {
		// Make sure to include the color of the user who is connecting the dots
		const color = userColors[socket.id];
		const updatedData = { ...data, color: color }; // Include the user's color in the data
		io.to('some room').emit('dot connected', updatedData);
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