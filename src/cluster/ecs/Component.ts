import { Schema, FieldSchema, BYTES_PER_TYPE } from "./Schema";
import { Storage } from "./Storage";

// 1) A little helper type to turn a readonly tuple → mutable array
type MutableDefault<D> = D extends readonly (infer U)[] ? U[] : D;

// 2) Given a schema S, this builds the “instance” shape
export type Component<S extends Schema> = {
    name: S["name"];
} & {
    [K in keyof S["fields"]]: S["fields"][K]["count"] extends 1
        ? number // or MutableDefault<…> if you really need defaults
        : number[]; // fixed-length by convention
};

/**
 * A registry of all component schemas and their factories.
 * This is a singleton, so you can access it from anywhere.
 */
export class ComponentRegistry {
    public static readonly components = new Map<
        string,
        ComponentFactory<any>
    >();
}

/**
 * ComponentLayout is a utility class that computes the byte layout of a
 * component schema. It takes into account the alignment and packing
 * rules for different types of data.
 * It is used by the Storage class to allocate memory for component
 * instances.
 */
export class ComponentLayout {
    constructor(
        private schema: Schema,
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

/**
 * Central utility schema driven for creating component instances and storage.
 */
export class ComponentFactory<S extends Schema> {
    constructor(public readonly schema: S) {
        // Register this factory in the global registry
        ComponentRegistry.components.set(schema.name, this);
    }

    /**
     * Create a new instance of this component, with default values.
     * This is a shallow copy of the default values, so if you modify
     * the instance, it won't affect the schema.
     * @returns a new instance of this component, with default values
     */
    create(): Component<S> {
        const inst = {} as Component<S>;

        inst.name = this.schema.name; // tag the instance with the schema name

        // inst.active = true; // default to active

        // force TS to see entries as [key, field] tuples
        const entries = Object.entries(this.schema.fields) as Array<
            [
                keyof S["fields"],
                FieldSchema & { default: number | boolean | number[] }
            ]
        >;

        for (const [key, field] of entries) {
            const def = field.default!;

            if (Array.isArray(def)) {
                inst[key] = [...def] as Component<S>[typeof key];
            } else {
                inst[key] = def as Component<S>[typeof key];
            }
        }

        Object.seal(inst); // immutable instance

        return inst;
    }

    /**
     * Spin up a brand-new chunked SoA storage for this schema.
     * @param chunkSize how many entities per chunk
     */
    createStorage(chunkSize: number): Storage<S> {
        return new Storage<S>(chunkSize, this.schema);
    }
}
