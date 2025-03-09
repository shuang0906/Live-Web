var Datastore = require('nedb');
var db = new Datastore({filename: "data.db", autoload: true});

// We need the file system here
var fs = require('fs');
				
// Express is a node module for building HTTP servers
var express = require('express');
var app = express();

// Tell Express to look in the "public" folder for any files first
app.use(express.static('public'));

// If the user just goes to the "route" / then run this function
app.get('/', function (req, res) {
  res.send('Hello World!')
});

// Here is the actual HTTP server 
// In this case, HTTPS (secure) server
var https = require('https');

// Security options - key and certificate
var options = {
  key: fs.readFileSync('/etc/letsencrypt/live/sh7361.itp.io/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/sh7361.itp.io/fullchain.pem')
};

// We pass in the Express object and the options object
var httpServer = https.createServer(options, app);

// Default HTTPS port
httpServer.listen(4443);

/* 
This server simply keeps track of the peers all in one big "room"
and relays signal messages back and forth.
*/

let peers = [];

// WebSocket Portion
// WebSockets work with the HTTP server
//var io = require('socket.io').listen(httpServer);
var io = require('socket.io')(httpServer);

//------------------ assign username start
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

//------------------ assign username end


// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on('connection', 

	// We are given a websocket object in our function
	function (socket) {
	
		peers.push({socket: socket});
		console.log("We have a new client: " + socket.id + " peers length: " + peers.length);
		
		db.find({}).sort({ts: 1}).exec(function(err, docs) {
			for (let i = 0; i < docs.length; i++) {
				socket.emit('newvideo',docs[i]);
			}
		});

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

		// Save Recording
		socket.on('video', function(data){
			console.log(data);
			// Unique filename
			let filename = Date.now() + "_" + Math.floor(Math.random()*10000) + ".webm";
			fs.writeFile(__dirname + '/public/videos/' + filename, data.video, function(err){
				if (err) console.log(err);
				console.log("It's saved!")

				let dataToStore = {"filename": filename, "ts": Date.now(), "name":data.name};
				db.insert(dataToStore, function(err, newDocs) {
					if (err) {
						console.log("ERROR:" + err);
					} 
					console.log(newDocs);
				});
				io.emit('newvideo',dataToStore);

			});
		});		

		//--------------------------added
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
		//--------------------------added end
		
		socket.on('disconnect', function() {
			console.log("Client has disconnected " + socket.id);
		    io.emit('peer_disconnect', socket.id);
			for (let i = 0; i < peers.length; i++) {
				if (peers[i].socket.id == socket.id) {
					peers.splice(i,1);
				}
			}			
		});
	}
);
