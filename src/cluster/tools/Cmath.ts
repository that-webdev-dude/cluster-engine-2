type Point = {
    x: number;
    y: number;
};

class Ease {
    static in(x: number, power: number): number {
        return Math.pow(x, power);
    }

    static out(x: number, power: number): number {
        return 1 - Ease.in(x, power);
    }

    static inOut(x: number, power: number): number {
        return x < 0.5
            ? Ease.in(x * 2, power) / 2
            : Ease.out(x * 2, power) / 2 + 0.5;
    }

    static quadIn(x: number): number {
        return Math.pow(x, 2);
    }

    static quadOut(x: number): number {
        return 1 - Ease.quadIn(1 - x);
    }

    static cubicIn(x: number): number {
        return Math.pow(x, 3);
    }

    static cubicOut(x: number): number {
        return 1 - Ease.cubicIn(1 - x);
    }

    static elasticOut(x: number): number {
        const p = 0.4;
        return (
            Math.pow(2, -10 * x) * Math.sin(((x - p / 4) * (Math.PI * 2)) / p) +
            1
        );
    }
}

export class Cmath {
    /**
     * Generate a floating point random number between min & max.
     * If max is "undefined" return a random number between 0 & min.
     * If min & max are "undefined" return a random number between 0 & 1.
     * @param {number} min lower limit
     * @param {number} max upper limit
     * @returns {number} floating point random number between min:max or 0: min or 0:1
     */
    static randf(min: number, max: number): number {
        if (max == null) {
            max = min || 1;
            min = 0;
        }
        return Math.random() * (max - min) + min;
    }

    /**
     * Return an integer random number between min & max.
     * If max is "undefined" return a random number between 0 & min.
     * If min & max are "undefined" return a random number between 0 & 1.
     * @param {number} min lower limit
     * @param {number} max upper limit
     * @returns {number} integer random number between min:max or 0: min or 0:1
     */
    static rand(min: number, max: number): number {
        return Math.floor(this.randf(min, max));
    }

    /**
     * Generate a boolean flag with given odds.
     * @param {number} odds number of odds (default is 2)
     * @returns {boolean} true with given "odds"
     */
    static randOneIn(odds: number = 2): boolean {
        return this.rand(0, odds) === 0;
    }

    /**
     * Pick a random element from an array.
     * @param {Array} items target array
     * @returns {*} picked array item
     */
    static randOneFrom<T>(items: T[]): T {
        return items[Math.floor(Math.random() * items.length)];
    }

    /**
     * Generate a random string id with given length.
     * @param {number} length length of the id
     * @returns {string} random string id
     */
    static randId(length: number): string {
        const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            result += characters[randomIndex];
        }
        return `_${result}`;
    }

    /**
     * Compute the Euclidean distance between two points (ax, ay) and (bx, by).
     * @param {number} ax x-coordinate of the first point
     * @param {number} ay y-coordinate of the first point
     * @param {number} bx x-coordinate of the second point
     * @param {number} by y-coordinate of the second point
     * @returns {number} distance between the two points
     */
    static distance(ax: number, ay: number, bx: number, by: number): number {
        return Math.hypot(ax - bx, ay - by);
    }

    /**
     * Compute the angle between two points a & b
     * @param {Object} a x/y coordinate object
     * @param {Object} b x/y coordinate object
     * @returns {number} angle between a & b in radians
     */
    static angle(ax: number, ay: number, bx: number, by: number): number {
        return Math.atan2(bx - ax, by - ay);
    }

    /**
     * converts the angle value
     * from degrees to radians
     * @param {*} degrees
     * @returns {number} angle in radians
     */
    static deg2rad(degrees: number): number {
        return degrees * 0.017453292519943295; // precomputed value of Math.PI / 180
    }

    /**
     * converts the angle value
     * from radians to degree
     * @param {*} radians
     * @returns {number} angle in radians
     */
    static rad2deg(radians: number): number {
        return radians * 57.29577951308232; // precomputed value of 180 / Math.PI
    }

    /**
     * Clamp the value to the provided min max limits
     * defined by min and max parameters
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number} clamped value
     */
    static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(value, max));
    }

    /**
     * lerp - normalize the x parameter
     * between the min, max values
     * @param {number} x
     * @param {number} min
     * @param {number} max
     */
    static lerp(x: number, min: number, max: number) {
        const t = Math.max(0, Math.min(1, x));
        return min + t * (max - min);
    }

    /**
     * Converts a number in the range [0,1] to [0,255], or clamps and floors if already in [0,255].
     * @param {number} x Input number
     * @returns {number} Integer in [0,255]
     */
    static to255(x: number): number {
        if (x <= 1) {
            return Math.floor(Cmath.clamp(x, 0, 1) * 255);
        }
        return Math.floor(Cmath.clamp(x, 0, 255));
    }

    /**
     * normalize - normalize the x parameter
     * between the min, max values
     * @param {number} x
     * @param {number} min
     * @param {number} max
     */
    static normalize(x: number, min: number, max: number) {
        return this.lerp(x, min, max);
    }

    /**
     * mix - returns a value (number) between a & b,
     * according to the percentage p
     * @param {Number} a - min
     * @param {Number} b - max
     * @param {Number} p - percentage
     * @returns
     */
    static mix(a: number, b: number, p: number): number {
        return a * (1 - p) + b * p;
    }

    /**
     * easing functions collection
     */
    static ease = Ease;
}

export default Cmath;
