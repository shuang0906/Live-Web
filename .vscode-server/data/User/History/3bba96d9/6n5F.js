describe('Basic Test', function () {
    it('should pass', function () {
        expect(true).toBe(true);
    });
});

const { closeToDot } = require('../src/script');

describe('closeToDot', function () {
    it('should return a dot if the given point is within the threshold distance', function () {
        const dots = [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
            { x: 50, y: 60 }
        ];
        
        const result = closeToDot(10, 21, dots);
        expect(result).toEqual({ x: 10, y: 20 }); // Should return the closest dot
    });

    it('should return undefined if no dot is within the threshold', function () {
        const dots = [
            { x: 100, y: 200 },
            { x: 300, y: 400 }
        ];
        
        const result = closeToDot(50, 50, dots);
        expect(result).toBeUndefined();
    });
});
