export type NumericType = "float" | "int" | "uint" | "bool";

export const BYTES_PER_TYPE: Record<NumericType, number> = {
    float: 4,
    int: 4,
    uint: 4,
    bool: 4,
} as const;

export interface FieldSchema {
    /** JS/GPU type: float, int, etc. */
    type: NumericType;

    /** Number of components: 1 = scalar, 2 = vec2, 3 = vec3, etc. */
    count: number;

    /** Default value when instantiating a component. */
    default?: number | number[] | boolean;

    /** Should WebGL normalize integer types to [0,1] or [–1,1]? */
    normalized?: boolean;

    /** GPU usage hints: divisor for instancing (0 = per-vertex, >0 = per-instance). */
    divisor?: number;

    /** GPU usage hints: WebGL buffer binding target: ARRAY_BUFFER, ELEMENT_ARRAY_BUFFER, etc. */
    target?: GLenum;

    /** Optional semantic name or attribute location index so you can auto‐wire to your shader’s `layout(location = X)`. */
    semantic?: string | number;

    /** Alignment/padding constraints, if you need manual control. Usually you’d compute this from `type` + `count`. */
    alignment?: number;
}

export interface Schema {
    /** name of the component e.g. "Transform" */
    name: string;

    /** bump when you add/remove fields so you can migrate old buffers. */
    version?: number;

    /** ordered list guarantees stable offsets across runs */
    fields: Record<string, FieldSchema>;
}
