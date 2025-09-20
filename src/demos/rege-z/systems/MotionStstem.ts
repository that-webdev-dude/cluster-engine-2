import {
    Component,
    DESCRIPTORS,
    PositionIndex,
    VelocityIndex,
} from "../components";
import { Cmath, View } from "../../../cluster";
import { CommandBuffer } from "../../../cluster/ecs/cmd";
import { ECSUpdateSystem } from "../../../cluster/ecs/system";

export class MotionSystem extends ECSUpdateSystem {
    public update(view: View, cmd: CommandBuffer, dt: number) {
        const posStride = DESCRIPTORS.Position.count;
        const velStride = DESCRIPTORS.Velocity.count;

        view.forEachChunkWith(
            [Component.Position, Component.Velocity],
            (chunk) => {
                const count = chunk.count;
                if (count === 0) return;

                const pos = chunk.views.Position;
                const vel = chunk.views.Velocity;

                for (let i = 0; i < count; i++) {
                    const pb = i * posStride;
                    const vb = i * velStride;

                    pos[pb + PositionIndex.PREV_X] = pos[pb + PositionIndex.X];
                    pos[pb + PositionIndex.PREV_Y] = pos[pb + PositionIndex.Y];

                    pos[pb + PositionIndex.X] += vel[vb + VelocityIndex.X] * dt;
                    pos[pb + PositionIndex.Y] += vel[vb + VelocityIndex.Y] * dt;

                    const minX = pos[pb + PositionIndex.MIN_X];
                    const maxX = pos[pb + PositionIndex.MAX_X];
                    const minY = pos[pb + PositionIndex.MIN_Y];
                    const maxY = pos[pb + PositionIndex.MAX_Y];

                    if (maxX > 0 || maxY > 0) {
                        pos[pb + PositionIndex.X] = Cmath.clamp(
                            pos[pb + PositionIndex.X],
                            minX,
                            maxX
                        );
                        pos[pb + PositionIndex.Y] = Cmath.clamp(
                            pos[pb + PositionIndex.Y],
                            minY,
                            maxY
                        );
                    }

                    // should I zero the velocity if position is clamped?
                    // if (
                    //     pos[pb + PositionIndex.X] === minX ||
                    //     pos[pb + PositionIndex.X] === maxX
                    // ) {
                    //     vel[vb + VelocityIndex.X] = 0;
                    // }
                    // if (
                    //     pos[pb + PositionIndex.Y] === minY ||
                    //     pos[pb + PositionIndex.Y] === maxY
                    // ) {
                    //     vel[vb + VelocityIndex.Y] = 0;
                    // }
                }
            }
        );
    }
}
