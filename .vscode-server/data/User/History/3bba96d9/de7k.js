// describe('Basic Test', function () {
//     it('should pass', function () {
//         expect(true).toBe(true);
//     });
// });

function closeToDot(x, y, dots) {
    return dots.find(dot => Math.hypot(dot.x - x, dot.y - y) < 5);
}

// should return the closest dot
function testCloseToDot() {
    const dots = [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 }
    ];

    const expected = { x: 10, y: 20 };
    const result = closeToDot(10, 21, dots);

    if (JSON.stringify(result) === JSON.stringify(expected)) {
        return true; 
    } else {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}!`);
    }
}

// should return undefined if no dot is within the threshold
function testCloseToDotUndefined() {
    const dots = [
        { x: 100, y: 200 },
        { x: 300, y: 400 }
    ];

    const expected = undefined;
    const result = closeToDot(50, 50, dots);

    if (result === expected) {
        return true; 
    } else {
        throw new Error(`Expected ${expected}, got ${JSON.stringify(result)}!`);
    }
}

console.log("Run testCloseToDot:");
console.log(testCloseToDot());

console.log("Run testCloseToDotUndefined:");
console.log(testCloseToDotUndefined());