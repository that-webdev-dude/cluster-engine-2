// src/ecs/buffer.ts

export type BufferInstance =
    | Float32Array
    | Int32Array
    | Uint32Array
    | Uint8Array;

export type BufferConstructor = {
    BYTES_PER_ELEMENT: number;
    new (
        buffer: ArrayBuffer,
        byteOffset: number,
        count: number
    ): BufferInstance;
};
