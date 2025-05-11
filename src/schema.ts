type NumericType = "float" | "int" | "uint" | "bool";

const BYTES_PER_TYPE: Record<NumericType, number> = {
    float: 4,
    int: 4,
    uint: 4,
    bool: 4,
} as const;

interface FieldSchema {
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

interface ComponentSchema {
    /** name of the component e.g. "Transform" */
    name: string;

    /** bump when you add/remove fields so you can migrate old buffers. */
    version?: number;

    /** ordered list guarantees stable offsets across runs */
    fields: Record<string, FieldSchema>;
}

class SchemaBuilder {
    constructor(
        private schema: ComponentSchema,
        private mode: "std140" | "std430" | "packed" = "std140"
    ) {}

    build() {
        let offset = 0;
        const layout: Record<string, { offset: number; size: number }> = {};

        for (let [key, f] of Object.entries(this.schema.fields)) {
            const bytes = f.count * BYTES_PER_TYPE[f.type]; // e.g. 4 * 4 = 16 bytes for vec4
            const alignment = this.getAlignment(bytes, f); // e.g. 16 for vec4

            offset = this.alignTo(offset, alignment); // align to 16 bytes for vec4 or 8 for vec2
            layout[key] = { offset, size: bytes };
            offset += bytes;
        }

        const structAlign = Math.max(
            ...Object.entries(this.schema.fields).map(([key, f]) =>
                this.getAlignment(f.count * BYTES_PER_TYPE[f.type], f)
            )
        );
        const paddedStride = this.alignTo(offset, structAlign);

        return { stride: paddedStride, layout };
    }

    private getAlignment(bytes: number, f: FieldSchema): number {
        if (f.alignment != null) {
            return f.alignment;
        }
        switch (this.mode) {
            case "std140":
                // scalars & vec2 align to 8, vec3/vec4 to 16
                if (bytes === 4) return 4; // scalars (float/int/bool)
                if (bytes === 8) return 8; // vec2
                return 16;
            case "std430":
                // like std140 but vec3 can pack to 12
                return Math.min(16, bytes);
            case "packed":
            default:
                // natural alignment = its own size
                return bytes;
        }
    }

    private alignTo(offset: number, alignment: number): number {
        return (offset + alignment - 1) & ~(alignment - 1);
    }
}

// make these available for external modules
export {
    ComponentSchema,
    SchemaBuilder,
    FieldSchema,
    NumericType,
    BYTES_PER_TYPE,
};

function Component<S extends ComponentSchema>(schema: S) {
    return function <C extends new (...args: any[]) => any>(Base: C) {
        // 1) Build a factory that returns a class named exactly schema.name
        const factory = new Function(
            "Base",
            `
            return class ${schema.name} extends Base {
                constructor(...args) { 
                    super(...args); 
               }
            }
            `
        );

        // 2) Invoke it, passing in the original constructor
        const NamedClass = factory(Base) as C;

        // 3) Copy any static props from Base → NamedClass
        for (const key of Object.getOwnPropertyNames(Base)) {
            if (key !== "prototype" && key !== "name" && key !== "length") {
                Object.defineProperty(
                    NamedClass,
                    key,
                    Object.getOwnPropertyDescriptor(Base, key)!
                );
            }
        }

        // World.registerComponentSchema(schema, NamedClass);

        return NamedClass;
    };
}

const TransformSchema = {
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
        visible: {
            type: "bool",
            count: 1,
            default: true,
        },
    },
} as const satisfies ComponentSchema;

@Component(TransformSchema)
class Transform {
    constructor(
        public position: [number, number] = TransformSchema.fields.position
            .default as [number, number],
        public scale: [number, number] = TransformSchema.fields.scale
            .default as [number, number],
        public rotation: number = TransformSchema.fields.rotation
            .default as number,
        public visible: boolean = TransformSchema.fields.visible
            .default as boolean
    ) {}
}

const TransformInstance = new Transform();

console.log(TransformInstance.scale); // [0, 0]

console.log(new SchemaBuilder(TransformSchema).build());

export default () => {};
