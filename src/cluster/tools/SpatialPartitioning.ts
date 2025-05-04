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

/**
 * Quadtree: 2D recursive spatial index
 * @param boundary - the AABB of the enntire world
 * @param capacity - max items per node before subdividing
 * @param maxDepth - max depth of the tree
 * @param depth - current depth of the node (used for recursion)
 */
export class Quadtree<ID> implements SpatialIndex<ID> {
  private items: Array<{ id: ID; box: AABB }> = [];
  private divided = false;
  private nw!: Quadtree<ID>;
  private ne!: Quadtree<ID>;
  private sw!: Quadtree<ID>;
  private se!: Quadtree<ID>;

  constructor(
    private boundary: AABB,
    private capacity: number = 4,
    private maxDepth: number = 10,
    private depth: number = 0
  ) {}

  insert(id: ID, box: AABB): void {
    if (!intersectsAABB(this.boundary, box)) return;
    if (this.items.length < this.capacity || this.depth >= this.maxDepth) {
      this.items.push({ id, box });
    } else {
      if (!this.divided) this.subdivide();
      this.nw.insert(id, box);
      this.ne.insert(id, box);
      this.sw.insert(id, box);
      this.se.insert(id, box);
    }
  }

  remove(id: ID): void {
    // remove from this node
    this.items = this.items.filter((entry) => entry.id !== id);
    // propagate to children
    if (this.divided) {
      this.nw.remove(id);
      this.ne.remove(id);
      this.sw.remove(id);
      this.se.remove(id);
    }
  }

  update(id: ID, box: AABB): void {
    this.remove(id);
    this.insert(id, box);
  }

  // region is the AABB to query: for example the camera AABB
  queryRegion(region: AABB): ID[] {
    const found = new Set<ID>();
    if (!intersectsAABB(this.boundary, region)) return [];
    // check items at this node
    for (const { id, box } of this.items) {
      if (intersectsAABB(box, region)) {
        found.add(id);
      }
    }
    // recurse children
    if (this.divided) {
      for (const child of [this.nw, this.ne, this.sw, this.se]) {
        for (const id of child.queryRegion(region)) {
          found.add(id);
        }
      }
    }
    return Array.from(found);
  }

  private subdivide(): void {
    const { minX, minY, maxX, maxY } = this.boundary;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    this.nw = new Quadtree(
      { minX, minY: midY, maxX: midX, maxY },
      this.capacity,
      this.maxDepth,
      this.depth + 1
    );
    this.ne = new Quadtree(
      { minX: midX, minY: midY, maxX, maxY },
      this.capacity,
      this.maxDepth,
      this.depth + 1
    );
    this.sw = new Quadtree(
      { minX, minY, maxX: midX, maxY: midY },
      this.capacity,
      this.maxDepth,
      this.depth + 1
    );
    this.se = new Quadtree(
      { minX: midX, minY, maxX, maxY: midY },
      this.capacity,
      this.maxDepth,
      this.depth + 1
    );
    this.divided = true;
    // re-insert existing items into children
    for (const { id, box } of this.items) {
      this.nw.insert(id, box);
      this.ne.insert(id, box);
      this.sw.insert(id, box);
      this.se.insert(id, box);
    }
    this.items = [];
  }
}

/**
 * Loose Quadtree: like Quadtree but each node's region is expanded by a looseness factor
 * to reduce object churn when moving across cell boundaries.
 */
export class LooseQuadtree<ID> implements SpatialIndex<ID> {
  private items: Array<{ id: ID; box: AABB }> = [];
  private divided = false;
  private nw!: LooseQuadtree<ID>;
  private ne!: LooseQuadtree<ID>;
  private sw!: LooseQuadtree<ID>;
  private se!: LooseQuadtree<ID>;
  private looseBoundary: AABB;

  constructor(
    private boundary: AABB,
    private capacity: number = 4,
    private maxDepth: number = 10,
    private depth: number = 0,
    private looseness: number = 1.5
  ) {
    // expand boundary by looseness factor around center
    const w = boundary.maxX - boundary.minX;
    const h = boundary.maxY - boundary.minY;
    const ex = (w * (looseness - 1)) / 2;
    const ey = (h * (looseness - 1)) / 2;
    this.looseBoundary = {
      minX: boundary.minX - ex,
      minY: boundary.minY - ey,
      maxX: boundary.maxX + ex,
      maxY: boundary.maxY + ey,
    };
  }

  insert(id: ID, box: AABB): void {
    if (!intersectsAABB(this.looseBoundary, box)) return;
    if (this.divided) {
      const child = this.getFittingChild(box);
      if (child) {
        child.insert(id, box);
        return;
      }
    }
    this.items.push({ id, box });
    if (
      !this.divided &&
      this.items.length > this.capacity &&
      this.depth < this.maxDepth
    ) {
      this.subdivide();
      const old = this.items;
      this.items = [];
      for (const entry of old) {
        this.insert(entry.id, entry.box);
      }
    }
  }

  remove(id: ID): void {
    this.items = this.items.filter((e) => e.id !== id);
    if (this.divided) {
      this.nw.remove(id);
      this.ne.remove(id);
      this.sw.remove(id);
      this.se.remove(id);
    }
  }

  update(id: ID, box: AABB): void {
    this.remove(id);
    this.insert(id, box);
  }

  queryRegion(region: AABB): ID[] {
    const found = new Set<ID>();
    if (!intersectsAABB(this.looseBoundary, region)) return [];
    for (const { id, box } of this.items) {
      if (intersectsAABB(box, region)) found.add(id);
    }
    if (this.divided) {
      for (const child of [this.nw, this.ne, this.sw, this.se]) {
        for (const id of child.queryRegion(region)) {
          found.add(id);
        }
      }
    }
    return Array.from(found);
  }

  private subdivide(): void {
    const { minX, minY, maxX, maxY } = this.boundary;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    this.nw = new LooseQuadtree(
      { minX, minY: midY, maxX: midX, maxY },
      this.capacity,
      this.maxDepth,
      this.depth + 1,
      this.looseness
    );
    this.ne = new LooseQuadtree(
      { minX: midX, minY: midY, maxX, maxY },
      this.capacity,
      this.maxDepth,
      this.depth + 1,
      this.looseness
    );
    this.sw = new LooseQuadtree(
      { minX, minY, maxX: midX, maxY: midY },
      this.capacity,
      this.maxDepth,
      this.depth + 1,
      this.looseness
    );
    this.se = new LooseQuadtree(
      { minX: midX, minY, maxX, maxY: midY },
      this.capacity,
      this.maxDepth,
      this.depth + 1,
      this.looseness
    );
    this.divided = true;
  }

  private getFittingChild(box: AABB): LooseQuadtree<ID> | null {
    for (const child of [this.nw, this.ne, this.sw, this.se]) {
      if (containsAABB(child.looseBoundary, box)) return child;
    }
    return null;
  }
}

/**
 * Simple Bounding‑Volume Hierarchy (BVH)
 * Rebuilds tree on insert/remove/update (good for moderate entity counts).
 */
export class BVH<ID> implements SpatialIndex<ID> {
  private items: Array<{ id: ID; box: AABB }> = [];
  private root: BVHNode<ID> | null = null;

  insert(id: ID, box: AABB): void {
    this.items.push({ id, box });
    this.rebuild();
  }

  remove(id: ID): void {
    this.items = this.items.filter((e) => e.id !== id);
    this.rebuild();
  }

  update(id: ID, box: AABB): void {
    const entry = this.items.find((e) => e.id === id);
    if (entry) entry.box = box;
    this.rebuild();
  }

  queryRegion(region: AABB): ID[] {
    const result = new Set<ID>();
    if (!this.root) return [];
    this.searchNode(this.root, region, result);
    return Array.from(result);
  }

  /** Build a balanced BVH by splitting on longest axis */
  private rebuild(): void {
    this.root = this.buildNode(this.items.slice());
  }

  private buildNode(list: Array<{ id: ID; box: AABB }>): BVHNode<ID> | null {
    const len = list.length;
    if (len === 0) return null;
    if (len === 1) {
      const leaf = list[0];
      return { box: leaf.box, id: leaf.id, left: null, right: null };
    }
    // compute node bounds
    let nodeBox = { ...list[0].box };
    for (let i = 1; i < len; i++) {
      nodeBox = unionAABB(nodeBox, list[i].box);
    }
    // pick split axis (longer side)
    const dx = nodeBox.maxX - nodeBox.minX;
    const dy = nodeBox.maxY - nodeBox.minY;
    const axis = dx > dy ? "x" : "y";
    // sort and split median
    list.sort((a, b) => {
      const ca =
        axis === "x"
          ? (a.box.minX + a.box.maxX) / 2
          : (a.box.minY + a.box.maxY) / 2;
      const cb =
        axis === "x"
          ? (b.box.minX + b.box.maxX) / 2
          : (b.box.minY + b.box.maxY) / 2;
      return ca - cb;
    });
    const mid = Math.floor(len / 2);
    const left = this.buildNode(list.slice(0, mid))!;
    const right = this.buildNode(list.slice(mid))!;
    return { box: unionAABB(left.box, right.box), id: null, left, right };
  }

  private searchNode(node: BVHNode<ID>, region: AABB, result: Set<ID>): void {
    if (!intersectsAABB(node.box, region)) return;
    if (node.id !== null) {
      // leaf
      if (intersectsAABB(node.box, region)) result.add(node.id);
    } else {
      // internal
      if (node.left) this.searchNode(node.left, region, result);
      if (node.right) this.searchNode(node.right, region, result);
    }
  }
}

/** BVH node type */
interface BVHNode<ID> {
  box: AABB;
  id: ID | null;
  left: BVHNode<ID> | null;
  right: BVHNode<ID> | null;
}

/** merge two AABBs */
function unionAABB(a: AABB, b: AABB): AABB {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** reuse this helper from above */
function intersectsAABB(a: AABB, b: AABB): boolean {
  return !(
    b.minX > a.maxX ||
    b.maxX < a.minX ||
    b.minY > a.maxY ||
    b.maxY < a.minY
  );
}

/** returns true if A fully contains B */
function containsAABB(a: AABB, b: AABB): boolean {
  return (
    b.minX >= a.minX && b.maxX <= a.maxX && b.minY >= a.minY && b.maxY <= a.maxY
  );
}
