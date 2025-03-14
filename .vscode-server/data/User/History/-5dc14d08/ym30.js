// Helper function to set up canvas
function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
}

// Draw background points with optimized resizing
const bgCanvas = document.getElementById('bg');
const bgCtx = setupCanvas(bgCanvas);

function drawPoints() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    for (let i = 0; i < 1500; i++) {
        const x = Math.random() * bgCanvas.width;
        const y = Math.random() * bgCanvas.height;
        bgCtx.beginPath();
        bgCtx.arc(x, y, 1, 0, 2 * Math.PI);
        bgCtx.fill();
        bgCtx.font = '6px Arial';
        const textWidth = bgCtx.measureText(i).width;
        bgCtx.fillText(i, x - textWidth / 2, y - 3);
    }
}

drawPoints();

// Optimize resizing
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(drawPoints, 100);
});

// Function to set up canvas and draw elements
async function setupAndDrawCanvas(canvasId, dotData) {
    const canvas = document.getElementById(canvasId);
    const ctx = setupCanvas(canvas);
    
    let lastConnectedDot = null;
    const cursorsList = {}; // Track cursor positions
    const connections = [];

    // Transform dot data
    const dots = dotData.map(dot => ({
        x: dot.coordinates[0],
        y: dot.coordinates[1],
        connected: false,
        color: dot.color,
        index: dot.index,
        canvasId
    }));

    // Draw function (optimized)
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
            const textWidth = ctx.measureText(dot.index).width;
            ctx.fillText(dot.index, dot.x - textWidth / 2, dot.y - 3);
        });

        drawCursors(); // Draw cursors last for visibility
    }

    // Draw cursors separately for optimization
    function drawCursors() {
        for (const id in cursorsList) {
            const { position, color, username } = cursorsList[id];
            ctx.beginPath();
            ctx.arc(position.x, position.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.font = '12px Arial';
            const textWidth = ctx.measureText(username).width;
            ctx.fillText(username, position.x + 15, position.y - 3);
        }
    }

    // Cursor movement event
    canvas.addEventListener('mousemove', event => {
        const rect = canvas.getBoundingClientRect();
        const position = {
            x: Math.round((event.clientX - rect.left) * 100) / 100,
            y: Math.round((event.clientY - rect.top) * 100) / 100
        };
        socket.emit('cursor move', { position, canvasId });
    });

    canvas.addEventListener('mouseleave', () => {
        socket.emit('cursor leave', { canvasId });
    });

    socket.on('cursor update', data => {
        if (data.canvasId !== canvasId) return;
        cursorsList[data.socketId] = { position: data.position, color: data.color, username: data.username };
        draw();
    });

    socket.on('user disconnected', socketId => {
        delete cursorsList[socketId];
        draw();
    });

    socket.on('remove cursor', data => {
        if (data.canvasId !== canvasId) return;
        delete cursorsList[data.socketId];
        draw();
    });

    // Helper function to check if a click is near a dot
    function closeToDot(x, y) {
        return dots.find(dot => Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2) < 5);
    }

    // Connect dots function
    function connectDots(dot1, dot2, userColor) {
        connections.push({ from: dot1, to: dot2, color: userColor });
        dot1.connected = dot2.connected = true;
        dot1.color = dot2.color = userColor;
    }

    // Click event for connecting dots
    canvas.addEventListener('click', event => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const closeDot = closeToDot(x, y);

        if (closeDot && (lastConnectedDot === null || dots.indexOf(closeDot) === dots.indexOf(lastConnectedDot) + 1)) {
            if (lastConnectedDot !== null) {
                connectDots(lastConnectedDot, closeDot, myCursorColor);
                socket.emit('connect dot', { from: lastConnectedDot, to: closeDot, canvasId, color: myCursorColor });
            }
            lastConnectedDot = closeDot;
            draw();
        }
    });

    socket.on('dot connected', data => {
        if (data.canvasId !== canvasId) return;
        const dot1 = dots.find(dot => dot.index === data.from.index);
        const dot2 = dots.find(dot => dot.index === data.to.index);
        if (dot1 && dot2) {
            dot1.connected = dot2.connected = true;
            dot1.color = dot2.color = data.color;
        }
        draw();
    });

    socket.on('assign color', color => {
        myCursorColor = color;
    });

    draw(); // Initial draw
}

// Load data asynchronously
async function loadAndDrawCanvas(canvasId, jsonPath) {
    try {
        const response = await fetch(jsonPath);
        const dotData = await response.json();
        setupAndDrawCanvas(canvasId, dotData);
    } catch (error) {
        console.error(`Error loading JSON (${jsonPath}):`, error);
    }
}

// Canvas configurations
const canvasConfigs = [
    { id: 'canvas1', path: 'dot_datas/dotDataForCanvas1.json' },
    { id: 'canvas2', path: 'dot_datas/dotDataForCanvas2.json' }
];

canvasConfigs.forEach(({ id, path }) => loadAndDrawCanvas(id, path));
