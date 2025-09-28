import { PositionDescriptor } from "./Position";
import { OffsetDescriptor } from "./Offset";
import { AngleDescriptor } from "./Angle";
import { PivotDescriptor } from "./Pivot";
import { SizeDescriptor } from "./Size";
import { ColorDescriptor } from "./Color";
import { SpeedDescriptor } from "./Speed";
import { VelocityDescriptor } from "./Velocity";
import { HealthDescriptor } from "./Health";
import { LivesDescriptor } from "./Lives";
import { PlayerDescriptor } from "./Player";
import { BulletDescriptor } from "./Bullet";
import { CameraDescriptor } from "./Camera";
import { SpriteDescriptor } from "./Sprite";
import { AnimationDescriptor } from "./Animation";
import { TileDescriptor } from "./Tile";
import { WallDescriptor } from "./Wall";
import { FloorDescriptor } from "./Floor";
import { ZombieDescriptor } from "./Zombie";
import { WeaponDescriptor } from "./Weapon";
import { AABBDescriptor } from "./AABB";

export const DESCRIPTORS = {
    Position: PositionDescriptor,
    Offset: OffsetDescriptor,
    Angle: AngleDescriptor,
    Pivot: PivotDescriptor,
    Size: SizeDescriptor,
    Color: ColorDescriptor,
    Speed: SpeedDescriptor,
    Velocity: VelocityDescriptor,
    Health: HealthDescriptor,
    Lives: LivesDescriptor,
    Player: PlayerDescriptor,
    Bullet: BulletDescriptor,
    Camera: CameraDescriptor,
    Sprite: SpriteDescriptor,
    Animation: AnimationDescriptor,
    Tile: TileDescriptor,
    Wall: WallDescriptor,
    Floor: FloorDescriptor,
    Zombie: ZombieDescriptor,
    Weapon: WeaponDescriptor,
    AABB: AABBDescriptor,
} as const;
