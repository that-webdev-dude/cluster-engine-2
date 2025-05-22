import { Schema } from "../Schema";
import { ComponentFactory, ComponentLayout } from "../Component";

export const RectComponentSchema = {
    name: "Rect",
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
        color: {
            type: "float",
            count: 4,
            default: [1, 1, 1, 1],
        },
    },
} satisfies Schema;

export const RectComponentLayout = new ComponentLayout(
    RectComponentSchema
).build();

export const RectComponent = new ComponentFactory(RectComponentSchema);
