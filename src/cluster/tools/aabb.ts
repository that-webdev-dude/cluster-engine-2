import { Vector } from "./Vector";

// TODO:
// Scratch objects / object pools for Vector
// Still returns Vector instances for compatibility, but the helpers accept out‑params so you can easily make a zero‑alloc variant later (or we can refactor to plain {x,y} literals).
// Structure of Arrays for AABBs if you compute many per frame (xs[], ys[], ws[], hs[]) to vectorise overlap checks
// Broadphase: your uniform grid is fine; if entity counts grow, add sweep‑and‑prune along the dominant axis before narrowphase

export interface AABB {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

const EPS = 1e-6; // to stabilise axis selection and avoid oscillation due to floating-point precision

function create(cx: number, cy: number, w: number, h: number): AABB {
    if (w <= 0 || h <= 0) {
        throw new Error(`[AABB] the provided w & h must be positive, non zero`);
    }
    return {
        minX: cx - w * 0.5,
        minY: cy - h * 0.5,
        maxX: cx + w * 0.5,
        maxY: cy + h * 0.5,
    };
}

function refresh(a: AABB, cx: number, cy: number, w: number, h: number) {
    a.minX = cx - w * 0.5;
    a.minY = cy - h * 0.5;
    a.maxX = cx + w * 0.5;
    a.maxY = cy + h * 0.5;
}

function getW(a: AABB) {
    return Math.abs(a.maxX - a.minX);
}

function getH(a: AABB) {
    return Math.abs(a.maxY - a.minY);
}

function getPosX(a: AABB) {
    return a.minX + getW(a) * 0.5;
}

function getPosY(a: AABB) {
    return a.minY + getH(a) * 0.5;
}

/** Returns true if two AABBs overlap (strict; touching edges does NOT count). */
function overlaps(a: AABB, b: AABB): boolean {
    return !(
        a.maxX <= b.minX ||
        a.minX >= b.maxX ||
        a.maxY <= b.minY ||
        a.minY >= b.maxY
    );
}

/** Returns true if two AABBs intersect or touch (non-strict). */
function touches(a: AABB, b: AABB): boolean {
    return !(
        a.maxX < b.minX ||
        a.minX > b.maxX ||
        a.maxY < b.minY ||
        a.minY > b.maxY
    );
}

/** Returns true if a contains b */
function contains(a: AABB, b: AABB) {
    return (
        a.minX <= b.minX &&
        a.maxX >= b.maxX &&
        a.minY <= b.minY &&
        a.maxY >= b.maxY
    );
}

function getOverlap(a: AABB, b: AABB, out = new Vector()): Vector {
    const x = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
    const y = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
    out.set(x, y);
    return out;
}

function axisIsX(overlap: Vector): boolean {
    // Choose axis of least penetration; break near-ties stably.
    const dx = overlap.x; // >= 0
    const dy = overlap.y; // >= 0
    if (Math.abs(dx - dy) <= EPS) return true; // deterministic bias to X on tie
    return dx < dy;
}

function getDepth(overlap: Vector, useX: boolean): number {
    return Math.abs(useX ? overlap.x : overlap.y);
}

function getArea(overlap: Vector) {
    // overlaps are already guarded so this is always >= 0
    return overlap.x * overlap.y;
}

/** normal points from B → A along the chosen axis */
function getNormal(
    a: AABB,
    b: AABB,
    useX: boolean,
    out: Vector = new Vector()
): Vector {
    let ax = getPosX(a);
    let ay = getPosY(a);
    let bx = getPosX(b);
    let by = getPosY(b);
    if (useX) {
        let s = Math.sign(ax - bx);
        if (s === 0) {
            const lGap = Math.abs(a.minX - b.minX);
            const rGap = Math.abs(a.maxX - b.maxX);
            s = rGap < lGap ? -1 : 1;
        }
        out.set(s, 0);
    } else {
        let s = Math.sign(ay - by);
        if (s === 0) {
            const tGap = Math.abs(a.minY - b.minY);
            const bGap = Math.abs(a.maxY - b.maxY);
            s = bGap < tGap ? -1 : 1;
        }
        out.set(0, s);
    }
    return out;
}

function getMTV(normal: Vector, depth: number, out = new Vector()): Vector {
    return out.set(normal.x * depth, normal.y * depth);
}

/**
 * since N points from B → A
 * if a is approaching b, the ndv is negative
 * if a is moving away from b, ndv is positive
 */
function getNDV(
    normal: Vector,
    velA?: { x: number; y: number },
    velB?: { x: number; y: number }
) {
    const vx = (velA?.x ?? 0) - (velB?.x ?? 0);
    const vy = (velA?.y ?? 0) - (velB?.y ?? 0);
    const dot = normal.x * vx + normal.y * vy; // < 0 => approaching
    // Return approaching speed (positive magnitude), 0 otherwise:
    return dot < 0 ? -dot : 0;
}

function getCollisionAttributes(
    a: AABB,
    b: AABB,
    velA?: { x: number; y: number },
    velB?: { x: number; y: number }
) {
    if (!overlaps(a, b)) return undefined; // **fast out**

    const overlap = getOverlap(a, b);
    const useX = axisIsX(overlap);
    const normal = getNormal(a, b, useX);
    const depth = getDepth(overlap, useX);
    const mtv = getMTV(normal, depth);
    const ndv = getNDV(normal, velA, velB);
    const area = getArea(overlap);
    const axis: "x" | "y" = useX ? "x" : "y";

    return {
        overlap,
        normal,
        depth,
        area,
        mtv,
        ndv,
        axis,
    };
}

export const AABBTools = {
    create,
    overlaps,
    touches,
    contains,
    getCollisionAttributes,
};
