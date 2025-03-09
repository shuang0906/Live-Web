
const s = p => {
    let x = 100;
    let y = 100;

    p.setup = function() {
      p.createCanvas(700, 410);
    };
  
    p.draw = function() {
      p.background(background);
      p.fill(color);
      p.rect(x, y, 50, 50);
      //for let i = 0 i < connectedCircles.length; i++
      //line(circles[connectedCircles[i][0]].x, circles[connectedCircles[i][0]].y, circles[connectedCircles[i][1]].x, circles[connectedCircles[i][1]].y)

    };

    p.mousePressed = function(){
        socket.emit("colorchange", {color:"blue"});
        //connected circles array: [[1,2],[2,3],[3,4]]
        // connectedCircles.push([4,5])
            }
  };
  

  new p5(s); // invoke p5