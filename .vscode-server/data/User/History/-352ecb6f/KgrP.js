
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
    };

    p.mousePressed = function(){
        socket.emit("colorchange", {color:"blue"});
    }
  };
  

  new p5(s); // invoke p5