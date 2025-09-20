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
        // prettier-ignore
        fields: [
            "x",
            "y"
        ],
    },
    Position: {
        type: Component.Position,
        name: "Position",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
        // prettier-ignore
        fields: [
            "x",
            "y"
        ],
    },
    Offset: {
        type: Component.Offset,
        name: "Offset",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
        // prettier-ignore
        fields: [
            "x",
            "y"
        ],
    },
    Angle: {
        type: Component.Angle,
        name: "Angle",
        count: 1,
        buffer: Float32Array,
        default: [0],
        // prettier-ignore
        fields: [
            "radians"
        ],
    },
    Pivot: {
        type: Component.Pivot,
        name: "Pivot",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
        // prettier-ignore
        fields: [
            "x",
            "y"
        ],
    },
    Size: {
        type: Component.Size,
        name: "Size",
        count: 2,
        buffer: Float32Array,
        default: [1, 1],
        // prettier-ignore
        fields: [
            "width",
            "height"
        ],
    },
    Color: {
        type: Component.Color,
        name: "Color",
        count: 4,
        buffer: Uint8Array,
        default: [255, 255, 255, 255],
        // prettier-ignore
        fields: [
            "r",
            "g",
            "b",
            "a"
        ],
    },
    Speed: {
        type: Component.Speed,
        name: "Speed",
        count: 1,
        buffer: Float32Array,
        default: [0],
        // prettier-ignore
        fields: [
            "value"
        ],
    },
    Velocity: {
        type: Component.Velocity,
        name: "Velocity",
        count: 2,
        buffer: Float32Array,
        default: [0, 0],
        // prettier-ignore
        fields: [
            "x",
            "y"
        ],
    },
    Health: {
        type: Component.Health,
        name: "Health",
        count: 1,
        buffer: Uint32Array,
        default: [0],
        // prettier-ignore
        fields: [
            "value"
        ],
    },
    Lives: {
        type: Component.Lives,
        name: "Lives",
        count: 1,
        buffer: Uint32Array,
        default: [0],
        // prettier-ignore
        fields: [
            "value"
        ],
    },
    Player: {
        type: Component.Player,
        name: "Player",
        count: 1,
        buffer: Uint8Array,
        default: [1],
        // prettier-ignore
        fields: [
            "enabled"
        ],
    },
    Bullet: {
        type: Component.Bullet,
        name: "Bullet",
        count: 1,
        buffer: Uint8Array,
        default: [1],
        // prettier-ignore
        fields: [
            "enabled"
        ],
    },
    Meteor: {
        type: Component.Meteor,
        name: "Meteor",
        count: 1,
        buffer: Uint8Array,
        default: [1],
        // prettier-ignore
        fields: [
            "enabled"
        ],
    },
    Camera: {
        type: Component.Camera,
        name: "Camera",
        count: 3,
        buffer: Uint8Array,
        default: [1, 0, 0],
        // prettier-ignore
        fields: [
            "enabled",
            "shakeOffsetX",
            "shakeOffsetY"
        ],
    },
};

export { DESCRIPTORS };
