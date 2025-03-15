function setupCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
}

const overlayCanvas = document.getElementById('cursorCanvas');
const overlayCtx = setupCanvas(overlayCanvas);
function resizeCanvas() {
    overlayCanvas.width = window.innerWidth;
    overlayCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

let cursorColor = 'black';
const cursorsMap = new Map();

function drawCursors() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    cursorsMap.forEach(cursor => {
        overlayCtx.beginPath();
        overlayCtx.arc(cursor.position.x, cursor.position.y, 4, 0, 2 * Math.PI);
        overlayCtx.fillStyle = cursor.color;

        overlayCtx.font = '12px Arial';
        const textWidth = overlayCtx.measureText(cursor.username).width;
        overlayCtx.roundRect(cursor.position.x + 15, cursor.position.y - 8, textWidth + 12, 16, 8);
        overlayCtx.fill();
        overlayCtx.fillStyle = 'white';
        overlayCtx.fillText(cursor.username, cursor.position.x + 21, cursor.position.y + 4);
    });
    requestAnimationFrame(drawCursors);
}
requestAnimationFrame(drawCursors);

function setupCursorOverlay() {
    document.addEventListener('mousemove', (event) => {
        const rect = overlayCanvas.getBoundingClientRect();
        const position = {
            x: Math.round((event.clientX - rect.left) * 100) / 100,
            y: Math.round((event.clientY - rect.top) * 100) / 100
        };
        socket.emit('cursor move', { position, canvasId: event.target.id });
    });

    socket.on('cursor update', (data) => {
        cursorsMap.set(data.socketId, { position: data.position, color: data.color, username: data.username });
    });

    socket.on('user disconnected', (socketId) => {
        cursorsMap.delete(socketId);
    });

    socket.on('assign color', (color) => {
        cursorColor = color;
    });
}


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

    // Draw initial dots and connections
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before redraw cursor
        ctx.save();
        //ctx.rect(0, 0, canvas.width, canvas.height);

        // Draw all connections
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
    }

    // Check if a position is close to a dot
    function closeToDot(x, y) {
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
        const x = (event.clientX - rect.left);
        const y = (event.clientY - rect.top);
        const closeDot = closeToDot(x, y);

        if (closeDot && (lastConnectedDot === null || dots.indexOf(closeDot) === dots.indexOf(lastConnectedDot) + 1)) {
            if (lastConnectedDot !== null) {
                connectDots(lastConnectedDot, closeDot, cursorColor);
                socket.emit('connect dot', { from: lastConnectedDot, to: closeDot, canvasId: event.srcElement.id, color: cursorColor });
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

    setupCursorOverlay();
    draw(); // Initial draw

    socket.on('assign color', (color) => {
        cursorColor = color; // Update this user's cursor color
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