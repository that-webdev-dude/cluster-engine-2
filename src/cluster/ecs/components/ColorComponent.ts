import { Schema } from "../Schema";
import { ComponentFactory } from "../Component";

export const ColorComponentSchema = {
    name: "Color",
    fields: {
        r: {
            type: "float",
            count: 1,
            default: 0,
        },
        g: {
            type: "float",
            count: 1,
            default: 0,
        },
        b: {
            type: "float",
            count: 1,
            default: 0,
        },
        a: {
            type: "float",
            count: 1,
            default: 1,
        },
    },
} as const satisfies Schema;

export const ColorComponent = new ComponentFactory(ColorComponentSchema);
