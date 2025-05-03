/**
 * here there's a collection of spatial partitioning algorithms
 * that can be used to optimize the process of determining which entities are within a certain area.
 */

/**
 * Axis‐aligned bounding box
 */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Common interface for any spatial index
 */
export interface SpatialIndex<ID> {
  insert(id: ID, box: AABB): void;
  remove(id: ID): void;
  update(id: ID, box: AABB): void;
  queryRegion(region: AABB): ID[];
}

/**
 * Uniform Grid: fixed cell size, hash only occupied cells.
 */
export class UniformGrid<ID> implements SpatialIndex<ID> {
  private cells = new Map<string, Set<ID>>();
  private idToCells = new Map<ID, string[]>();

  constructor(private cellSize: number) {}

  insert(id: ID, box: AABB): void {
    const keys = this.getCellKeys(box);
    this.idToCells.set(id, keys);
    for (const key of keys) {
      let set = this.cells.get(key);
      if (!set) {
        set = new Set();
        this.cells.set(key, set);
      }
      set.add(id);
    }
  }

  remove(id: ID): void {
    const keys = this.idToCells.get(id);
    if (!keys) return;
    for (const key of keys) {
      const set = this.cells.get(key);
      set?.delete(id);
      if (set && set.size === 0) {
        this.cells.delete(key);
      }
    }
    this.idToCells.delete(id);
  }

  update(id: ID, box: AABB): void {
    this.remove(id);
    this.insert(id, box);
  }

  queryRegion(region: AABB): ID[] {
    const keys = this.getCellKeys(region);
    const result = new Set<ID>();
    for (const key of keys) {
      const set = this.cells.get(key);
      if (set) {
        for (const id of set) {
          result.add(id);
        }
      }
    }
    return Array.from(result);
  }

  private getCellKeys(box: AABB): string[] {
    const x0 = Math.floor(box.minX / this.cellSize);
    const x1 = Math.floor(box.maxX / this.cellSize);
    const y0 = Math.floor(box.minY / this.cellSize);
    const y1 = Math.floor(box.maxY / this.cellSize);

    const keys: string[] = [];
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        keys.push(`${x},${y}`);
      }
    }
    return keys;
  }
}

/**
 * Sparse (Hash) Grid: like UniformGrid but uses a 2‑level Map<number,Map<number,Set>>
 * to avoid string‑key allocations and only stores occupied cells.
 */
export class SparseGrid<ID> implements SpatialIndex<ID> {
  // grid.get(ix).get(iy) => Set of IDs in cell (ix, iy)
  private grid = new Map<number, Map<number, Set<ID>>>();
  // tracks which cells an ID occupies: array of [ix, iy]
  private idToCells = new Map<ID, [number, number][]>();

  constructor(private cellSize: number) {}

  insert(id: ID, box: AABB): void {
    const cells = this.getCellCoords(box);
    this.idToCells.set(id, cells);
    for (const [ix, iy] of cells) {
      let col = this.grid.get(ix);
      if (!col) {
        col = new Map<number, Set<ID>>();
        this.grid.set(ix, col);
      }
      let cellSet = col.get(iy);
      if (!cellSet) {
        cellSet = new Set<ID>();
        col.set(iy, cellSet);
      }
      cellSet.add(id);
    }
  }

  remove(id: ID): void {
    const cells = this.idToCells.get(id);
    if (!cells) return;
    for (const [ix, iy] of cells) {
      const col = this.grid.get(ix);
      const cellSet = col?.get(iy);
      cellSet?.delete(id);
      // cleanup empty cell
      if (cellSet && cellSet.size === 0) {
        col!.delete(iy);
        if (col!.size === 0) {
          this.grid.delete(ix);
        }
      }
    }
    this.idToCells.delete(id);
  }

  update(id: ID, box: AABB): void {
    this.remove(id);
    this.insert(id, box);
  }

  queryRegion(region: AABB): ID[] {
    const cells = this.getCellCoords(region);
    const result = new Set<ID>();
    for (const [ix, iy] of cells) {
      const cellSet = this.grid.get(ix)?.get(iy);
      if (cellSet) {
        for (const id of cellSet) {
          result.add(id);
        }
      }
    }
    return Array.from(result);
  }

  /** returns all [ix,iy] cells overlapped by box */
  private getCellCoords(box: AABB): [number, number][] {
    const x0 = Math.floor(box.minX / this.cellSize);
    const x1 = Math.floor(box.maxX / this.cellSize);
    const y0 = Math.floor(box.minY / this.cellSize);
    const y1 = Math.floor(box.maxY / this.cellSize);
    const out: [number, number][] = [];
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        out.push([ix, iy]);
      }
    }
    return out;
  }
}
