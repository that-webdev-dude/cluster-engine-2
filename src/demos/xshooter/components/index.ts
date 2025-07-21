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
    Meteor,
    Camera,
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
    Meteor: {
        type: Component.Meteor,
        name: "Meteor",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means "is Meteor"
    },
    Camera: {
        type: Component.Camera,
        name: "Camera",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means "is Camera"
    },
};

export { DESCRIPTORS };
