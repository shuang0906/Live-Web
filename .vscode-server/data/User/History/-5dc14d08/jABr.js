function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
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

let myCursorColor = 'black';

// Cursor handling using Map for efficient lookup
function setupCursorOverlay(canvasId) {
    const cursorsMap = new Map();

    function drawCursors() {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        cursorsMap.forEach(cursor => {
            overlayCtx.beginPath();
            overlayCtx.arc(cursor.x, cursor.y, 4, 0, 2 * Math.PI);
            overlayCtx.fillStyle = cursor.color;
            overlayCtx.fill();

            // Display cursor username
            const textWidth = overlayCtx.measureText(cursor.username).width;
            const height = 16, margin = 6, distance = 15;

            overlayCtx.fillStyle = cursor.color;
            overlayCtx.fillRect(cursor.x + distance, cursor.y - height / 2, textWidth + margin * 2, height);

            overlayCtx.fillStyle = 'white';
            overlayCtx.fillText(cursor.username, cursor.x + distance + margin, cursor.y + 4);
        });
    }

    document.addEventListener('mousemove', event => {
        const rect = overlayCanvas.getBoundingClientRect();
        const position = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        socket.emit('cursor move', { position, canvasId: event.target.id });
    });

    socket.on('cursor update', ({ socketId, position, color, username }) => {
        cursorsMap.set(socketId, { ...position, color, username });
        drawCursors();
    });

    socket.on('user disconnected', socketId => {
        cursorsMap.delete(socketId);
        drawCursors();
    });

    socket.on('assign color', color => myCursorColor = color);
}

function setupAndDrawCanvas(canvasId, dotDatas) {
    const canvas = document.getElementById(canvasId);
    const ctx = setupCanvas(canvas);
    let lastConnectedDot = null;

    const dots = dotDatas.map(dot => ({
        ...dot, connected: false, canvasId
    }));

    const connections = new Set(); // Using Set to store unique connections

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.rect(0, 0, canvas.width, canvas.height);

        // Draw connections
        connections.forEach(({ from, to, color }) => {
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.strokeStyle = color;
            ctx.stroke();
        });

        // Draw dots
        dots.forEach(dot => {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, 1, 0, Math.PI * 2);
            ctx.fillStyle = dot.connected ? dot.color : 'black';
            ctx.fill();

            ctx.font = '6px Arial';
            ctx.fillText(dot.index, dot.x - ctx.measureText(dot.index).width / 2, dot.y - 3);
        });

        ctx.restore();
    }

    function closeToDot(x, y) {
        return dots.find(dot => Math.hypot(dot.x - x, dot.y - y) < 5);
    }

    function connectDots(dot1, dot2, userColor) {
        connections.add({ from: dot1, to: dot2, color: userColor });
        dot1.connected = dot2.connected = true;
        dot1.color = dot2.color = userColor;
    }

    canvas.addEventListener('click', event => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const closeDot = closeToDot(x, y);

        if (closeDot && (!lastConnectedDot || dots.indexOf(closeDot) === dots.indexOf(lastConnectedDot) + 1)) {
            if (lastConnectedDot) {
                connectDots(lastConnectedDot, closeDot, myCursorColor);
                socket.emit('connect dot', { from: lastConnectedDot, to: closeDot, canvasId: event.target.id, color: myCursorColor });
            }
            lastConnectedDot = closeDot;
            draw();
        }
    });

    socket.on('dot connected', ({ canvasId: targetCanvasId, from, to, color }) => {
        if (targetCanvasId !== canvasId) return;
        const dot1 = dots.find(dot => dot.index === from.index);
        const dot2 = dots.find(dot => dot.index === to.index);
        if (dot1 && dot2) {
            connectDots(dot1, dot2, color);
            draw();
        }
    });

    setupCursorOverlay(canvasId);

    function render() {
        draw();
        requestAnimationFrame(render);
    }
    render();
}

function loadAndDrawCanvas(canvasId, jsonPath) {
    fetch(jsonPath)
        .then(response => response.json())
        .then(dotData => setupAndDrawCanvas(canvasId, dotData))
        .catch(error => console.error(`Error loading JSON: ${jsonPath}`, error));
}

const canvasConfigs = [
    { id: 'canvas1', path: 'dot_datas/dotDataForCanvas1.json' },
    { id: 'canvas2', path: 'dot_datas/dotDataForCanvas2.json' }
];

canvasConfigs.forEach(({ id, path }) => loadAndDrawCanvas(id, path));
