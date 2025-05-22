// Storage.ts

import { Entity } from "./Entity"; // alias for `number`
import { Schema } from "./Schema";
import { ComponentLayout } from "./Component";

// Helpers for turning field names into “prevXxx”
type PrevFieldName<K extends string> = `prev${Capitalize<K>}`;

// A strongly-typed chunk: one Float32Array per field (and its “prev”)
export type Chunk<S extends Schema> = {
    entities: Entity[];
    length: number;
} & {
    [K in keyof S["fields"]]: Float32Array;
} & {
    [K in keyof S["fields"] as PrevFieldName<Extract<K, string>>]: Float32Array;
};

/**
 * Generic, chunked SoA storage driven by a Schema.
 */
export class Storage<S extends Schema> {
    private chunks: Array<Chunk<S>> = [];
    private entityToLocation = new Map<
        Entity,
        { chunk: number; index: number }
    >();
    private readonly fields: Array<keyof S["fields"] & string>;
    private readonly layout: {
        stride: number;
        layout: Record<string, { offset: number; size: number }>;
    };
    private currentChunk = 0;

    constructor(
        private readonly CHUNK_SIZE: number,
        private readonly schema: S
    ) {
        // Build byte-layout (offsets, total stride) once
        this.layout = new ComponentLayout(schema, "std140").build();
        // Field names in declaration order
        this.fields = Object.keys(this.layout.layout) as any;
    }

    get chunkCount(): number {
        return this.chunks.length;
    }

    add(entity: Entity, comp: { [K in keyof S["fields"]]: any }): void {
        // 1) grab or create the “current write” chunk
        let ci = this.currentChunk;
        let chunk = this.chunks[ci];
        if (!chunk || chunk.length >= this.CHUNK_SIZE) {
            ci = this.chunks.length;
            chunk = this.createEmptyChunk();
            this.chunks.push(chunk);
            this.currentChunk = ci;
        }

        // 2) assign entity → location
        const idx = chunk.length++;
        chunk.entities[idx] = entity;
        this.entityToLocation.set(entity, { chunk: ci, index: idx });

        // 3) copy component values into current & prev arrays
        for (const field of this.fields) {
            const { size } = this.layout.layout[field];
            const floatsPerEntity = size / 4;
            const base = idx * floatsPerEntity;
            const data = (comp as any)[field];

            const curArr = chunk[field];
            const prevArr = (chunk as any)[
                `prev${
                    field[0].toUpperCase() + field.slice(1)
                }` as PrevFieldName<typeof field>
            ];

            if (Array.isArray(data)) {
                for (let j = 0; j < floatsPerEntity; j++) {
                    curArr[base + j] = data[j];
                    prevArr[base + j] = data[j];
                }
            } else {
                // scalar
                curArr[base] = data;
                prevArr[base] = data;
            }
        }
    }

    remove(entity: Entity): void {
        const loc = this.entityToLocation.get(entity);
        if (!loc) return;

        const chunk = this.chunks[loc.chunk];
        const lastIdx = --chunk.length;
        const lastEnt = chunk.entities[lastIdx]!;

        // swap-remove if needed
        if (loc.index !== lastIdx) {
            for (const field of this.fields) {
                const { size } = this.layout.layout[field];
                const floatsPerEntity = size / 4;
                const srcOff = lastIdx * floatsPerEntity;
                const dstOff = loc.index * floatsPerEntity;

                chunk[field].copyWithin(
                    dstOff,
                    srcOff,
                    srcOff + floatsPerEntity
                );
                (chunk as any)[
                    `prev${field[0].toUpperCase() + field.slice(1)}`
                ].copyWithin(dstOff, srcOff, srcOff + floatsPerEntity);
            }
            // move entity id
            chunk.entities[loc.index] = lastEnt;
            this.entityToLocation.set(lastEnt, {
                chunk: loc.chunk,
                index: loc.index,
            });
        }

        this.entityToLocation.delete(entity);
    }

    update(entity: Entity, comp: { [K in keyof S["fields"]]: any }): void {
        const loc = this.entityToLocation.get(entity);
        if (!loc) return;
        const chunk = this.chunks[loc.chunk];
        const idx = loc.index;

        for (const field of this.fields) {
            const { size } = this.layout.layout[field];
            const floatsPerEntity = size / 4;
            const base = idx * floatsPerEntity;
            const data = (comp as any)[field];
            const arr = chunk[field];

            if (Array.isArray(data)) {
                for (let j = 0; j < floatsPerEntity; j++) {
                    arr[base + j] = data[j];
                }
            } else {
                arr[base] = data;
            }
        }
    }

    read(entity: Entity): { [K in keyof S["fields"]]: any } | undefined {
        const loc = this.entityToLocation.get(entity);
        if (!loc) return;

        const chunk = this.chunks[loc.chunk];
        const idx = loc.index;
        const result: { [K in keyof S["fields"]]: any } = {} as any;

        for (const field of this.fields) {
            const { size } = this.layout.layout[field];
            const floatsPerEntity = size / 4;
            const base = idx * floatsPerEntity;
            const arr = chunk[field];

            if (floatsPerEntity > 1) {
                result[field] = Array.from(
                    arr.subarray(base, base + floatsPerEntity)
                );
            } else {
                result[field] = arr[base];
            }
        }

        return result;
    }

    snapshotPrev(): void {
        for (const chunk of this.chunks) {
            const n = chunk.length;
            for (const field of this.fields) {
                const { size } = this.layout.layout[field];
                const floatsPerEntity = size / 4;
                const sliceEnd = n * floatsPerEntity;

                const curArr = chunk[field];
                const prevArr = (chunk as any)[
                    `prev${field[0].toUpperCase() + field.slice(1)}`
                ];
                prevArr.set(curArr.subarray(0, sliceEnd), 0);
            }
        }
    }

    forEachChunk(callback: (chunk: Chunk<S>) => void): void {
        for (const chunk of this.chunks) {
            if (chunk.length > 0) callback(chunk);
        }
    }

    getLocation(entity: Entity): { chunk: number; index: number } | undefined {
        return this.entityToLocation.get(entity);
    }

    getChunk(i: number): Chunk<S> | undefined {
        return this.chunks[i];
    }

    private createEmptyChunk(): Chunk<S> {
        const chunk = {
            entities: new Array<Entity>(this.CHUNK_SIZE),
            length: 0,
        } as unknown as Chunk<S>;

        // For each field, allocate its own SoA buffers
        for (const field of this.fields) {
            const { size } = this.layout.layout[field];
            const totalBytes = size * this.CHUNK_SIZE;
            const floatsPerEntity = size / 4;
            const totalFloats = floatsPerEntity * this.CHUNK_SIZE;

            const bufCur = new ArrayBuffer(totalBytes);
            const bufPrev = new ArrayBuffer(totalBytes);

            // assign the Float32Arrays
            (chunk as any)[field] = new Float32Array(bufCur, 0, totalFloats);
            (chunk as any)[`prev${field[0].toUpperCase() + field.slice(1)}`] =
                new Float32Array(bufPrev, 0, totalFloats);
        }

        return chunk;
    }
}
