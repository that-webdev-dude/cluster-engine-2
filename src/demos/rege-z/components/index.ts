export enum Component {
    PreviousPosition,
    Position,
    Offset,
    Angle,
    Pivot,
    Size,
    Color,
    Speed,
    Velocity,
    Health,
    Lives,
    Player,
    Bullet,
    // Camera,
    Camera,
    Sprite,
    Animation,
    Tile,
    Wall,
    Floor,
    Zombie,
    Weapon,
    AABB,
}

const DESCRIPTORS = {
    PreviousPosition: {
        type: Component.PreviousPosition,
        name: "PreviousPosition",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
    Position: {
        type: Component.Position,
        name: "Position",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
    Offset: {
        type: Component.Offset,
        name: "Offset",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
    Angle: {
        type: Component.Angle,
        name: "Angle",
        count: 1,
        buffer: Float32Array,
        default: [0], // in radians
    },
    Pivot: {
        type: Component.Pivot,
        name: "Pivot",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
    Size: {
        type: Component.Size,
        name: "Size",
        count: 2,
        buffer: Float32Array,
        default: [1, 1],
    },
    Color: {
        type: Component.Color,
        name: "Color",
        count: 4,
        buffer: Uint8Array,
        default: [255, 255, 255, 255],
    },
    Speed: {
        type: Component.Speed,
        name: "Speed",
        count: 1,
        buffer: Float32Array,
        default: [0],
    },
    Velocity: {
        type: Component.Velocity,
        name: "Velocity",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
    },
    Health: {
        type: Component.Health,
        name: "Health",
        count: 1,
        buffer: Uint32Array,
        default: [0], // is a number
    },
    Lives: {
        type: Component.Lives,
        name: "Lives",
        count: 1,
        buffer: Uint32Array,
        default: [0], // is a number
    },
    // tags
    Player: {
        type: Component.Player,
        name: "Player",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means "is Player"
    },
    Bullet: {
        type: Component.Bullet,
        name: "Bullet",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means "is Bullet"
    },
    Camera: {
        type: Component.Camera,
        name: "Camera",
        count: 8,
        buffer: Float32Array,
        // prettier-ignore
        default: [
            0, 0,   // vx, vy
            // 0, 0,   // tw, th,
            0, 0,   // omega
            0, 0,   // look ahead x and y
            0,      // look ahead maxOffset
            0,      // look ahead decay
        ],
    },
    Sprite: {
        type: Component.Sprite,
        name: "Sprite",
        count: 4,
        buffer: Float32Array,
        default: [0, 0, 0, 0], // framex - framey - framew - frameh
    },
    Animation: {
        type: Component.Animation,
        name: "Animation",
        count: 6,
        buffer: Float32Array,
        default: [0, 0, 0, 0, 0, 0], // startFrameIdx - endFrameIdx - currentFrameIdx - frameTime - frameElapsed - playing?
    },
    Tile: {
        type: Component.Tile,
        name: "Tile",
        count: 1,
        buffer: Float32Array,
        default: [1], // is a tile?
    },
    Wall: {
        type: Component.Wall,
        name: "Wall",
        count: 1,
        buffer: Float32Array,
        default: [1], // is a tile?
    },
    Floor: {
        type: Component.Floor,
        name: "Floor",
        count: 1,
        buffer: Float32Array,
        default: [1], // is a tile?
    },
    Zombie: {
        type: Component.Zombie,
        name: "Zombie",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means "is Zombie"
    },
    Weapon: {
        type: Component.Weapon,
        name: "Weapon",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means "is Weapon"
    },
    AABB: {
        type: Component.AABB,
        name: "AABB",
        count: 4,
        buffer: Float32Array,
        default: [0, 0, 0, 0], // means minX, minY, maxX, maxY
    },
};

export { DESCRIPTORS };
