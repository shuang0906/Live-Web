// request animation frame to make 
// draw cursor on a canvas on a top canvas that is not interactable

function showInfo() {
    var popup = document.getElementById('info-pop');
    if (popup.style.display === 'none') {
        popup.style.display = 'block';
    } else {
        popup.style.display = 'none';
    }
};

var myButton = document.getElementsByClassName('myButton')[0];
myButton.addEventListener('mouseenter', showInfo);
myButton.addEventListener('mouseleave', showInfo);

function setupCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
}

// draw background start----------------------
const bgcanvas = document.getElementById('bg');

function drawPoints() {
    const bgctx = setupCanvas(bgcanvas);
    for (let i = 0; i < 1500; i++) {
        const x = Math.random() * bgcanvas.width;
        const y = Math.random() * bgcanvas.height;
        bgctx.beginPath();
        bgctx.arc(x, y, 1, 0, 2 * Math.PI);
        bgctx.fill();
        bgctx.font = '6px Arial';
        const textWidth = bgctx.measureText(i).width;
        bgctx.fillText(i, x - textWidth / 2, y - 3);
    }
}
drawPoints();
window.addEventListener('resize', drawPoints);

// draw background end----------------------

function setupAndDrawCanvas(canvasId, dotDatas) {

    const canvas = document.getElementById(canvasId);
    var ctx = setupCanvas(canvas);

    let lastConnectedDot = null;

    const dots = dotDatas.map(dot => ({
        x: dot.coordinates[0],
        y: dot.coordinates[1],
        connected: false,
        color: dot.color,
        index: dot.index,
        canvasId
    }));

    const connections = []; // Array to store connections between dots
    const otherCursors = {};// Object to track other users' cursor positions

    // Function to draw other users' cursors
    function drawCursors() {
        for (let id in otherCursors) {
            const cursor = otherCursors[id];
            //cursor.position.x *= zoomLevel;
            ctx.beginPath();
            ctx.arc(cursor.position.x, cursor.position.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = cursor.color; // Use the color assigned by the server
            ctx.fill();

            // Draw the username next to the cursor
            ctx.font = '12px Arial';
            ctx.fillStyle = cursor.color; // Use the same color for the username
            const textWidth = ctx.measureText(cursor.username).width;
            const height = 16;
            const margin = 6;
            const distance = 15;
            ctx.beginPath();
            ctx.roundRect(cursor.position.x + distance, cursor.position.y - height / 2, textWidth + margin * 2, height, height / 2);
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.fillText(cursor.username, cursor.position.x + distance + margin, cursor.position.y + 4);
        }
    }

    let myCursorColor = 'black'; // Default color, updated upon 'assign color' event

    //zoom features
    let zoomLevel = 1;
    const zoomFactor = 1.1;
    let isZooming = false;
    let offsetX = 0, offsetY = 0;

    canvas.addEventListener('wheel', (event) => {
    	event.preventDefault();
    	isZooming = true; // Activate zooming flag

    	const rect = canvas.getBoundingClientRect();
    	const mouseX = event.clientX - rect.left; // Get mouse position relative to canvas
    	const mouseY = event.clientY - rect.top;

    	const scaleFactor = event.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    	const newZoomLevel = Math.min(5, Math.max(0.5, zoomLevel * scaleFactor));

    	// Adjust translation to zoom at cursor position
    	const zoomRatio = newZoomLevel / zoomLevel;
    	ctx.translate(mouseX, mouseY);
    	ctx.scale(zoomRatio, zoomRatio);
    	//ctx.translate(-mouseX/zoomRatio, -mouseY/zoomRatio);
        ctx.translate(-mouseX, -mouseY);

        // offsetX = (mouseX + offsetX) * zoomRatio - mouseX;
        // offsetY = (mouseY + offsetY) * zoomRatio - mouseY;        

    	zoomLevel = newZoomLevel; // Update zoom level
        console.log(zoomLevel, zoomRatio, scaleFactor);

        const position = {
            x: Math.round((event.clientX - rect.left) * 100) / 100 / zoomLevel + offsetX,
            y: Math.round((event.clientY - rect.top) * 100) / 100 / zoomLevel + offsetY 
        };
        socket.emit('cursor move', { position, canvasId: event.srcElement.id }); 

    	draw();
    	isZooming = false; // Deactivate zooming after drawing
    });

    // Draw initial dots and connections
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before redraw cursor
        ctx.save();
        ctx.rect(0, 0, canvas.width, canvas.height);
        //ctx.stroke();

        // Draw all connections`56
        connections.forEach(connection => {
            ctx.beginPath();
            ctx.moveTo(connection.from.x, connection.from.y);
            ctx.lineTo(connection.to.x, connection.to.y);
            ctx.strokeStyle = connection.color; // Use the connection's color
            ctx.stroke();
        });

        // Draw all dots
        dots.forEach(dot => {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 1, 0, Math.PI * 2);
            ctx.fillStyle = dot.connected ? dot.color : 'black'; // Use the dot's color if connected
            ctx.fill();

            // Draw index number above each dot
            ctx.font = '6px Arial';
            const textWidth = ctx.measureText(dot.index).width;
            ctx.fillText(dot.index, dot.x - textWidth / 2, dot.y - 3);
        });

        drawCursors(); // Draw cursors last so they're on top

    }

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const position = {
            x: Math.round((event.clientX - rect.left) * 100) / 100 / zoomLevel,
            y: Math.round((event.clientY - rect.top) * 100) / 100 / zoomLevel
        };
        // const scaledX = (event.clientX - rect.left - offsetX) / zoomLevel;
        // console.log('offsetX' + offsetX);
        // const scaledY = (event.clientY - rect.top - offsetY) / zoomLevel;
        // const position = { x: scaledX, y: scaledY };
        socket.emit('cursor move', { position, canvasId: event.srcElement.id }); 
    });


    canvas.addEventListener('mouseleave', () => {
        socket.emit('cursor leave', { canvasId: canvasId });
    });

    // Listen for cursor updates from other clients
    socket.on('cursor update', (data) => {
        if (data.canvasId !== canvasId) return;
        otherCursors[data.socketId] = { position: data.position, color: data.color, username: data.username };
        draw(); // Redraw the canvas to show the updated cursor positions
    });

    // Clear cursor data for users who disconnect
    socket.on('user disconnected', (socketId) => {
        console.log(`Before deletion:`, otherCursors);
        delete otherCursors[socketId];
        console.log(`After deletion:`, otherCursors);
        draw(); // Redraw the canvas to remove the cursor
    });

    // Clear cursor data for users who are not on the canvas
    socket.on('remove cursor', (data) => {
        if (data.canvasId !== canvasId) return; // Ensure we remove only from the correct canvas
        delete otherCursors[data.socketId];
        draw(); // Redraw the canvas to remove the cursor
    });


    // Check if a position is close to a dot
    function closeToDot(x, y) {
        // return dots.find(dot => Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2) < 10 && !dot.connected);
        return dots.find(dot => Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2) < 5);
    }

    // Add connection between two dots
    function connectDots(dot1, dot2, userColor) {
        connections.push({ from: dot1, to: dot2, color: userColor }); // Store the connection
        dot1.connected = dot2.connected = true;
        dot1.color = dot2.color = userColor; // Assign the user's color to the connected dots
    }

    // Handle canvas click events
    canvas.addEventListener('click', (event) => {
        console.log('canvas id', event.srcElement.id);
        const rect = canvas.getBoundingClientRect();
        // const x = event.clientX - rect.left;
        // const y = event.clientY - rect.top;
        const x = (event.clientX - rect.left) / zoomLevel;
        const y = (event.clientY - rect.top) / zoomLevel;
        const closeDot = closeToDot(x, y);

        if (closeDot && (lastConnectedDot === null || dots.indexOf(closeDot) === dots.indexOf(lastConnectedDot) + 1)) {
            if (lastConnectedDot !== null) {
                connectDots(lastConnectedDot, closeDot, myCursorColor);
                //socket.emit('connect dot', { from: lastConnectedDot, to: closeDot, canvasId: event.srcElement.id});
                socket.emit('connect dot', { from: lastConnectedDot, to: closeDot, canvasId: event.srcElement.id, color: myCursorColor });
            }
            lastConnectedDot = closeDot;
            draw(); // Redraw to update connections and dot colors
        }
    });

    // Listen for dot connections from other users
    socket.on('dot connected', (data) => {
        if (data.canvasId !== canvasId) return; // Only update the matching canvas
        //console.log('data canvas id', data.canvasId);
        connections.push({ from: data.from, to: data.to, color: data.color });
        const dot1 = dots.find(dot => dot.index === data.from.index);
        const dot2 = dots.find(dot => dot.index === data.to.index);
        if (dot1 && dot2) {
            dot1.connected = dot2.connected = true;
            dot1.color = dot2.color = data.color;
        }
        console.log('dots', dot1, dot2)

        draw();
    });

    //draw(); // Initial draw

    socket.on('assign color', (color) => {
        myCursorColor = color; // Update this user's cursor color
    });

}

function loadAndDrawCanvas(canvasId, jsonPath) {
    fetch(jsonPath)
        .then(response => response.json())
        .then(dotData => {
            setupAndDrawCanvas(canvasId, dotData);
        })
        .catch(error => console.error(`Error loading the JSON file (${jsonPath}):`, error));
}

const canvasConfigs = [
    { id: 'canvas1', path: 'dot_datas/dotDataForCanvas1.json' },
    { id: 'canvas2', path: 'dot_datas/dotDataForCanvas2.json' }
];

canvasConfigs.forEach(({ id, path }) => loadAndDrawCanvas(id, path));