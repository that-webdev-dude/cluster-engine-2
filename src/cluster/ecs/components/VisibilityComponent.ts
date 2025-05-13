import { Schema } from "../Schema";
import { ComponentFactory } from "../Component";

export const VisibleComponentSchema = {
    name: "Visible",
    fields: {
        value: {
            type: "bool",
            count: 1,
            default: true,
        },
    },
} satisfies Schema;

export const VisibilityComponent = new ComponentFactory(VisibleComponentSchema);
