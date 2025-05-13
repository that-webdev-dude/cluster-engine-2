import { Schema } from "../Schema";
import { ComponentFactory } from "../Component";

export const TransformComponentSchema = {
    name: "Transform",
    fields: {
        position: {
            type: "float",
            count: 2,
            default: [0, 0],
        },
        scale: {
            type: "float",
            count: 2,
            default: [1, 1],
        },
        rotation: {
            type: "float",
            count: 1,
            default: 0,
        },
    },
} satisfies Schema;

export const TransformComponent = new ComponentFactory(
    TransformComponentSchema
);
