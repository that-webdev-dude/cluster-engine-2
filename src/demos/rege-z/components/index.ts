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
    Camera,
    CameraSettings,
    CameraFlags,
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
    Position: {
        type: Component.Position,
        name: "Position",
        count: 8,
        buffer: Float32Array,
        default: [0, 0, 0, 0, 0, 0, 0, 0], // currX, currY, prevX, prevY, minx, minY, maxX, maxY
        // prettier-ignore
        fields: [
            "x", 
            "y", 
            "prevX", 
            "prevY", 
            "minX", 
            "minY", 
            "maxX", 
            "maxY"
        ],
    },
    Offset: {
        type: Component.Offset,
        name: "Offset",
        count: 2,
        buffer: Float32Array,
        default: [0, 0], // offsetX, offsetY
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
        default: [0], // in radians
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
        default: [0, 0], // pivotX, pivotY
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
        default: [1, 1], // width, height
        // prettier-ignore
        fields: [
            "x", 
            "y"
        ],
    },
    Color: {
        type: Component.Color,
        name: "Color",
        count: 4,
        buffer: Uint8Array,
        default: [255, 255, 255, 255], // r, g, b, a
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
        default: [0], // is a number
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
        default: [0, 0], // vx, vy
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
        default: [0], // is a number
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
        default: [0], // is a number
        // prettier-ignore
        fields: [
            "value"
        ],
    },
    // tags
    Player: {
        type: Component.Player,
        name: "Player",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means "is Player"
        // prettier-ignore
        fields: [
            "value"
        ],
    },
    Bullet: {
        type: Component.Bullet,
        name: "Bullet",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means "is Bullet"
        // prettier-ignore
        fields: [
            "value"
        ],
    },
    Camera: {
        type: Component.Camera,
        name: "Camera",
        count: 4,
        buffer: Float32Array,
        default: [
            5, // springFreqX (typical 3–8 Hz)
            5, // springFreqY
            0, // lookAheadX (smoothed state)
            0, // lookAheadY (smoothed state)
        ],
        // prettier-ignore
        fields: [
            "springFreqX", 
            "springFreqY", 
            "lookAheadX", 
            "lookAheadY"
        ],
    },
    CameraSettings: {
        type: Component.CameraSettings,
        name: "CameraSettings",
        count: 9,
        buffer: Float32Array,
        default: [
            0.28, // DeadZoneWPerc (28%)
            0.2, // DeadZoneHPerc (20%)
            0.2, // LookAheadGainPerSec
            96, // LookAheadMaxOffset
            0.08, // LookAheadTau
            8, // DeadBandEnter
            10, // DeadBandExit
            0.0, // AirborneYScale (0 disables Y look-ahead when airborne)
            0, // Flags (see bitfield below)
        ],
        fields: [
            "deadZoneWPerc",
            "deadZoneHPerc",
            "lookAheadGainPerSec",
            "lookAheadMaxOffset",
            "lookAheadTau",
            "deadBandEnter",
            "deadBandExit",
            "airborneYScale",
            "flags",
        ],
    },
    Sprite: {
        type: Component.Sprite,
        name: "Sprite",
        count: 4,
        buffer: Float32Array,
        default: [0, 0, 0, 0], // frameX, frameY, frameWidth, frameHeight
        // prettier-ignore
        fields: [
            "frameX",
            "frameY",
            "frameWidth",
            "frameHeight"
        ],
    },
    Animation: {
        type: Component.Animation,
        name: "Animation",
        count: 6,
        buffer: Float32Array,
        default: [0, 0, 0, 0, 0, 0], // start, end, current, time, elapsed, playing
        // prettier-ignore
        fields: [
            "start",
            "end",
            "current",
            "time",
            "elapsed",
            "playing"
        ],
    },
    Tile: {
        type: Component.Tile,
        name: "Tile",
        count: 1,
        buffer: Float32Array,
        default: [1], // is a tile?
        // prettier-ignore
        fields: [
            "value"
        ],
    },
    Wall: {
        type: Component.Wall,
        name: "Wall",
        count: 1,
        buffer: Float32Array,
        default: [1], // is a tile?
        // prettier-ignore
        fields: [
            "value"
        ],
    },
    Floor: {
        type: Component.Floor,
        name: "Floor",
        count: 1,
        buffer: Float32Array,
        default: [1], // is a tile?
        // prettier-ignore
        fields: [
            "value"
        ],
    },
    Zombie: {
        type: Component.Zombie,
        name: "Zombie",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means "is Zombie"
        // prettier-ignore
        fields: [
            "value"
        ],
    },
    Weapon: {
        type: Component.Weapon,
        name: "Weapon",
        count: 1,
        buffer: Uint8Array,
        default: [1], // means "is Weapon"
        // prettier-ignore
        fields: [
            "active"
        ],
    },
    AABB: {
        type: Component.AABB,
        name: "AABB",
        count: 4,
        buffer: Float32Array,
        default: [0, 0, 0, 0], // minX, minY, maxX, maxY
        // prettier-ignore
        fields: [
            "minX",
            "minY",
            "maxX",
            "maxY"
        ],
    },
};

enum CameraIndex {
    SPRING_FREQ_X = 0, // Hz
    SPRING_FREQ_Y = 1, // Hz
    LOOK_AHEAD_X = 2, // smoothed px
    LOOK_AHEAD_Y = 3, // smoothed px
}
enum CameraSettingsIndex {
    DEAD_ZONE_W_PERC = 0, // [0..1] of display width
    DEAD_ZONE_H_PERC = 1, // [0..1] of display height
    LOOK_AHEAD_GAIN_PER_SEC = 2, // seconds (lead time factor)
    LOOK_AHEAD_MAX_OFFSET = 3, // px
    LOOK_AHEAD_TAU = 4, // seconds (EMA smoothing)
    DEAD_BAND_ENTER = 5, // px/s (hysteresis low)
    DEAD_BAND_EXIT = 6, // px/s (hysteresis high)
    AIRBORNE_Y_SCALE = 7, // 0..1 (how much Y look-ahead when airborne)
    FLAGS = 8, // bitfield: enableYLookAhead, debug etc.
}
export const CameraFlags = {
    EnableYLookAhead: 1 << 0, // if 0, Y look-ahead is always disabled
    DebugOverlay: 1 << 1, // draw dead zone rectangle
} as const;
enum PositionIndex {
    X = 0,
    Y = 1,
    PREV_X = 2,
    PREV_Y = 3,
    MIN_X = 4,
    MIN_Y = 5,
    MAX_X = 6,
    MAX_Y = 7,
}
enum OffsetIndex {
    X = 0,
    Y = 1,
}
enum AngleIndex {
    RADIANS = 0,
}
enum VelocityIndex {
    X = 0,
    Y = 1,
}
enum SizeIndex {
    WIDTH = 0,
    HEIGHT = 1,
}
enum ColorIndex {
    R = 0,
    G = 1,
    B = 2,
    A = 3,
}
enum AnimationIndex {
    START = 0,
    END = 1,
    CURRENT = 2,
    TIME = 3,
    ELAPSED = 4,
    PLAYING = 5,
}
enum SpriteIndex {
    FRAME_X = 0,
    FRAME_Y = 1,
    FRAME_WIDTH = 2,
    FRAME_HEIGHT = 3,
}
enum WeaponIndex {
    ACTIVE = 0,
}
enum SpeedIndex {
    VALUE = 0,
}

export {
    DESCRIPTORS,
    PositionIndex,
    OffsetIndex,
    AngleIndex,
    VelocityIndex,
    CameraIndex,
    CameraSettingsIndex,
    AnimationIndex,
    SpriteIndex,
    SizeIndex,
    ColorIndex,
    WeaponIndex,
    SpeedIndex,
};
