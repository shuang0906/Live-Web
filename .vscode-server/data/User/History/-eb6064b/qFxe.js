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

