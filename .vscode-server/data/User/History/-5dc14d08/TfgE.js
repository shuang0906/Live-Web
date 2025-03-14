function setupCanvas(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
}

// Cursor Handling Module
function setupCursorOverlay(canvasId) {
    const mainCanvas = document.getElementById(canvasId);
    const overlayCanvas = document.createElement('canvas'); // Create overlay canvas
    overlayCanvas.id = `${canvasId}-overlay`;
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.left = mainCanvas.style.left;
    overlayCanvas.style.top = mainCanvas.style.top;
    overlayCanvas.style.pointerEvents = 'none'; // Prevent interactions
    mainCanvas.parentElement.appendChild(overlayCanvas);

    const overlayCtx = setupCanvas(overlayCanvas); // Set up the overlay canvas
    const cursorsList = {};
    let myCursorColor = 'black';

    function drawCursors() {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); // Only clear overlay

        for (let id in cursorsList) {
            const cursor = cursorsList[id];
            overlayCtx.beginPath();
            overlayCtx.arc(cursor.position.x, cursor.position.y, 4, 0, 2 * Math.PI);
            overlayCtx.fillStyle = cursor.color;
            overlayCtx.fill();

            overlayCtx.font = '12px Arial';
            overlayCtx.fillStyle = cursor.color;
            const textWidth = overlayCtx.measureText(cursor.username).width;
            const height = 16;
            const margin = 6;
            const distance = 15;
            overlayCtx.beginPath();
            overlayCtx.roundRect(cursor.position.x + distance, cursor.position.y - height / 2, textWidth + margin * 2, height, height / 2);
            overlayCtx.fill();
            overlayCtx.fillStyle = 'white';
            overlayCtx.fillText(cursor.username, cursor.position.x + distance + margin, cursor.position.y + 4);
        }
    }

    mainCanvas.addEventListener('mousemove', (event) => {
        const rect = mainCanvas.getBoundingClientRect();
        const position = {
            x: Math.round((event.clientX - rect.left) * 100) / 100,
            y: Math.round((event.clientY - rect.top) * 100) / 100
        };
        socket.emit('cursor move', { position, canvasId: event.srcElement.id });
    });

    mainCanvas.addEventListener('mouseleave', () => {
        socket.emit('cursor leave', { canvasId: canvasId });
    });

    socket.on('cursor update', (data) => {
        if (data.canvasId !== canvasId) return;
        cursorsList[data.socketId] = { position: data.position, color: data.color, username: data.username };
        drawCursors();
    });

    socket.on('user disconnected', (socketId) => {
        delete cursorsList[socketId];
        drawCursors();
    });

    socket.on('remove cursor', (data) => {
        if (data.canvasId !== canvasId) return;
        delete cursorsList[data.socketId];
        drawCursors();
    });

    socket.on('assign color', (color) => {
        myCursorColor = color;
    });
}

// Main Drawing Function
function setupAndDrawCanvas(canvasId, dotDatas) {
    const mainCanvas = document.getElementById(canvasId);
    var mainCtx = setupCanvas(mainCanvas);

    let lastConnectedDot = null;
    const dots = dotDatas.map(dot => ({
        x: dot.coordinates[0],
        y: dot.coordinates[1],
        connected: false,
        color: dot.color,
        index: dot.index,
        canvasId
    }));
    const connections = [];

    function drawMainCanvas() {
        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        mainCtx.save();
        mainCtx.rect(0, 0, mainCanvas.width, mainCanvas.height);

        connections.forEach(connection => {
            mainCtx.beginPath();
            mainCtx.moveTo(connection.from.x, connection.from.y);
            mainCtx.lineTo(connection.to.x, connection.to.y);
            mainCtx.strokeStyle = connection.color;
            mainCtx.stroke();
        });

        dots.forEach(dot => {
            mainCtx.beginPath();
            mainCtx.arc(dot.x, dot.y, 1, 0, Math.PI * 2);
            mainCtx.fillStyle = dot.connected ? dot.color : 'black';
            mainCtx.fill();
            mainCtx.font = '6px Arial';
            const textWidth = mainCtx.measureText(dot.index).width;
            mainCtx.fillText(dot.index, dot.x - textWidth / 2, dot.y - 3);
        });
    }

    function closeToDot(x, y) {
        return dots.find(dot => Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2) < 5);
    }

    function connectDots(dot1, dot2, userColor) {
        connections.push({ from: dot1, to: dot2, color: userColor });
        dot1.connected = dot2.connected = true;
        dot1.color = dot2.color = userColor;
    }

    mainCanvas.addEventListener('click', (event) => {
        const rect = mainCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const closeDot = closeToDot(x, y);

        if (closeDot && (lastConnectedDot === null || dots.indexOf(closeDot) === dots.indexOf(lastConnectedDot) + 1)) {
            if (lastConnectedDot !== null) {
                connectDots(lastConnectedDot, closeDot, myCursorColor);
                socket.emit('connect dot', { from: lastConnectedDot, to: closeDot, canvasId: event.srcElement.id, color: myCursorColor });
            }
            lastConnectedDot = closeDot;
            drawMainCanvas();
        }
    });

    socket.on('dot connected', (data) => {
        if (data.canvasId !== canvasId) return;
        const dot1 = dots.find(dot => dot.index === data.from.index);
        const dot2 = dots.find(dot => dot.index === data.to.index);
        if (dot1 && dot2) {
            dot1.connected = dot2.connected = true;
            dot1.color = dot2.color = data.color;
        }
        drawMainCanvas();
    });

    drawMainCanvas();
    setupCursorOverlay(canvasId);
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
