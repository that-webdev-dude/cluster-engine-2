import { Entity } from "../World";
import { ColorComponent } from "../components";
import { TransformStorage } from "./TransformStorage";

const CHUNK_SIZE = 256;

export class ColorStorage {
  private chunks: Float32Array[] = [];

  constructor(private ts: TransformStorage) {
    // initially align with any existing transform–chunks
    this.ensureCapacity();
  }

  /** Make sure we have one color-array per transform-chunk */
  private ensureCapacity() {
    const needed = this.ts.chunkCount;
    while (this.chunks.length < needed) {
      this.chunks.push(new Float32Array(CHUNK_SIZE * 4));
    }
  }

  add(entity: Entity, comp: ColorComponent): void {
    this.ensureCapacity();
    const loc = this.ts.getLocation(entity);
    if (!loc) {
      throw new Error(
        `ColorStorage.add: no transform slot for entity ${entity}`
      );
    }
    const { chunk, index } = loc;
    const arr = this.chunks[chunk];
    const base = index * 4;
    arr[base + 0] = comp.color[0];
    arr[base + 1] = comp.color[1];
    arr[base + 2] = comp.color[2];
    arr[base + 3] = comp.color[3];
  }

  remove(entity: Entity): void {
    this.ensureCapacity();
    const loc = this.ts.getLocation(entity);
    if (!loc) return;
    const { chunk, index } = loc;
    const arr = this.chunks[chunk];
    const tchunk = this.ts.getChunk(chunk)!;
    const newLen = tchunk.length; // after TransformStorage.remove
    const lastIdx = newLen; // index of the slot that moved

    if (index !== lastIdx) {
      const from = lastIdx * 4;
      const to = index * 4;
      arr[to + 0] = arr[from + 0];
      arr[to + 1] = arr[from + 1];
      arr[to + 2] = arr[from + 2];
      arr[to + 3] = arr[from + 3];
    }
    // no need to clear the old slot
  }

  update(entity: Entity, comp: ColorComponent): void {
    this.ensureCapacity();
    const loc = this.ts.getLocation(entity);
    if (!loc) return;
    const { chunk, index } = loc;
    const arr = this.chunks[chunk];
    const base = index * 4;
    arr[base + 0] = comp.color[0];
    arr[base + 1] = comp.color[1];
    arr[base + 2] = comp.color[2];
    arr[base + 3] = comp.color[3];
  }

  /**
   * Return the raw RGBA array for the chunk containing `entity`.
   * Fall back to an empty array if something’s off.
   */
  getColorsForChunk(entity: Entity): Float32Array {
    this.ensureCapacity();
    const loc = this.ts.getLocation(entity);
    if (!loc) return new Float32Array(0);
    return this.chunks[loc.chunk];
  }
}
