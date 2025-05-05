/**
 * Chunked Struct-of-Arrays storage for TransformComponent data.
 *
 * This storage holds all TransformComponent instances in contiguous TypedArrays,
 * partitioned into fixed-size chunks for cache-friendly iteration.
 * Each chunk stores current and previous transform values: position, scale, rotation.
 */
import { Entity } from "../World";
import { TransformComponent } from "../components";

// Number of entities per chunk (tunable based on cache-line size and scene dynamics)
const CHUNK_SIZE = 256;

interface TransformChunk {
  // current values
  positions: Float32Array; //    length = CHUNK_SIZE * 2
  scales: Float32Array; //       length = CHUNK_SIZE * 2
  rotations: Float32Array; //    length = CHUNK_SIZE
  // previous values (for interpolation)
  prevPositions: Float32Array;
  prevScales: Float32Array;
  prevRotations: Float32Array;
  // mapping back to entity IDs
  entities: Entity[]; // length = CHUNK_SIZE
  // number of active entries in this chunk
  length: number;
}

/**
 * Manages multiple TransformChunk blocks, allocates new chunks on demand,
 * and provides fast add/remove/update operations for TransformComponent data.
 */
export class TransformStorage {
  private chunks: TransformChunk[] = [];
  private entityToLocation = new Map<
    Entity,
    { chunk: number; index: number }
  >();

  constructor() {
    // allocate first chunk lazily when first entity is added
  }

  /**
   * Adds a new TransformComponent for an entity into storage.
   * Copies initial current & previous values from the component.
   */
  add(entity: Entity, comp: TransformComponent): void {
    // find or create a chunk with free slot
    let chunkIndex = this.chunks.findIndex((c) => c.length < CHUNK_SIZE);
    if (chunkIndex < 0) {
      chunkIndex = this.chunks.length;
      this.chunks.push(this.createEmptyChunk());
    }
    const chunk = this.chunks[chunkIndex];
    const i = chunk.length++;

    // store entity ID
    chunk.entities[i] = entity;
    this.entityToLocation.set(entity, { chunk: chunkIndex, index: i });

    // copy values into SoA arrays
    const { position, scale, rotation, prevPosition, prevScale, prevRotation } =
      comp;
    chunk.positions[2 * i + 0] = position[0];
    chunk.positions[2 * i + 1] = position[1];
    chunk.scales[2 * i + 0] = scale[0];
    chunk.scales[2 * i + 1] = scale[1];
    chunk.rotations[i] = rotation;

    chunk.prevPositions[2 * i + 0] = prevPosition[0];
    chunk.prevPositions[2 * i + 1] = prevPosition[1];
    chunk.prevScales[2 * i + 0] = prevScale[0];
    chunk.prevScales[2 * i + 1] = prevScale[1];
    chunk.prevRotations[i] = prevRotation;
  }

  /**
   * Removes an entity's transform by swapping with the last entry in its chunk.
   */
  remove(entity: Entity): void {
    const loc = this.entityToLocation.get(entity);
    if (!loc) return;
    const chunk = this.chunks[loc.chunk];
    const lastIdx = --chunk.length;
    const lastEnt = chunk.entities[lastIdx];

    // swap last slot into removed slot
    if (loc.index !== lastIdx) {
      // copy SoA values
      chunk.positions[2 * loc.index + 0] = chunk.positions[2 * lastIdx + 0];
      chunk.positions[2 * loc.index + 1] = chunk.positions[2 * lastIdx + 1];
      chunk.scales[2 * loc.index + 0] = chunk.scales[2 * lastIdx + 0];
      chunk.scales[2 * loc.index + 1] = chunk.scales[2 * lastIdx + 1];
      chunk.rotations[loc.index] = chunk.rotations[lastIdx];

      chunk.prevPositions[2 * loc.index + 0] =
        chunk.prevPositions[2 * lastIdx + 0];
      chunk.prevPositions[2 * loc.index + 1] =
        chunk.prevPositions[2 * lastIdx + 1];
      chunk.prevScales[2 * loc.index + 0] = chunk.prevScales[2 * lastIdx + 0];
      chunk.prevScales[2 * loc.index + 1] = chunk.prevScales[2 * lastIdx + 1];
      chunk.prevRotations[loc.index] = chunk.prevRotations[lastIdx];

      // entity ID swap
      chunk.entities[loc.index] = lastEnt;
      this.entityToLocation.set(lastEnt, {
        chunk: loc.chunk,
        index: loc.index,
      });
    }

    // cleanup removed entity
    this.entityToLocation.delete(entity);
  }

  /**
   * Updates an entity's current transform values in-place.
   */
  update(entity: Entity, comp: TransformComponent): void {
    const loc = this.entityToLocation.get(entity);
    if (!loc) return;
    const chunk = this.chunks[loc.chunk];
    const i = loc.index;
    // copy new current values
    chunk.positions[2 * i + 0] = comp.position[0];
    chunk.positions[2 * i + 1] = comp.position[1];
    chunk.scales[2 * i + 0] = comp.scale[0];
    chunk.scales[2 * i + 1] = comp.scale[1];
    chunk.rotations[i] = comp.rotation;
  }

  /**
   * Copies current values into previous values for all entities.
   * Call once per fixed‐update step, before render interpolation.
   */
  snapshotPrev(): void {
    for (const chunk of this.chunks) {
      const n = chunk.length;
      // copy vectors
      chunk.prevPositions.set(chunk.positions.subarray(0, n * 2), 0);
      chunk.prevScales.set(chunk.scales.subarray(0, n * 2), 0);
      chunk.prevRotations.set(chunk.rotations.subarray(0, n), 0);
    }
  }

  /**
   * Iterate all chunks and invoke a callback for each active index.
   * Two-phase: you get current pointers to the SoA arrays and the active length.
   */
  forEachChunk(
    callback: (
      positions: Float32Array,
      scales: Float32Array,
      rotations: Float32Array,
      prevPositions: Float32Array,
      prevScales: Float32Array,
      prevRotations: Float32Array,
      entities: Entity[],
      length: number
    ) => void
  ): void {
    for (const chunk of this.chunks) {
      if (chunk.length > 0) {
        callback(
          chunk.positions,
          chunk.scales,
          chunk.rotations,
          chunk.prevPositions,
          chunk.prevScales,
          chunk.prevRotations,
          chunk.entities,
          chunk.length
        );
      }
    }
  }

  /**
   * Allocate an empty chunk with all TypedArrays pre-sized.
   */
  private createEmptyChunk(): TransformChunk {
    return {
      positions: new Float32Array(CHUNK_SIZE * 2),
      scales: new Float32Array(CHUNK_SIZE * 2),
      rotations: new Float32Array(CHUNK_SIZE),
      prevPositions: new Float32Array(CHUNK_SIZE * 2),
      prevScales: new Float32Array(CHUNK_SIZE * 2),
      prevRotations: new Float32Array(CHUNK_SIZE),
      entities: new Array<Entity>(CHUNK_SIZE),
      length: 0,
    };
  }
}
