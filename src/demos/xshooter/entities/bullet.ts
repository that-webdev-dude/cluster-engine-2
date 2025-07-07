import { ArchetypeV2 } from "../../../cluster/ecs/archetypeV2";
import { DESCRIPTORS } from "../components";

export const bulletSchema = ArchetypeV2.register(
    DESCRIPTORS.Bullet,
    DESCRIPTORS.Position,
    DESCRIPTORS.Angle,
    DESCRIPTORS.Pivot,
    DESCRIPTORS.Size,
    DESCRIPTORS.Color
);

export const bulletArchetype = ArchetypeV2.create("bullet", bulletSchema);
