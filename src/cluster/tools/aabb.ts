/**
 * AABB.ts — tiny, fast 2D AABB collision & resolution library.
 *
 * Design goals:
 * - Minimal GC: no classes, no per-frame object churn; reuses caller-provided arrays where possible.
 * - Efficient math: branch-light, cache-friendly data layout, simple number fields.
 * - Comprehensive: overlap tests, MTV, swept AABB (TOI), slide/bounce resolvers, multi-hit stepping, broadphase (SAP).
 *
 * Units & conventions:
 * - Axis-aligned boxes with {minX,minY,maxX,maxY}. No width/height stored redundantly.
 * - Velocities in units per second; dt in seconds.
 * - All functions are side-effect free unless explicitly noted (e.g., resolvers that mutate positions/velocities you pass).
 */

//////////////////////////
// Core types & helpers //
//////////////////////////

export interface AABB {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface Vec2 {
    x: number;
    y: number;
}

export interface Hit {
    /** collision occurred in [0,1] of the sweep? */
    hit: boolean;
    /** normalized time of impact (0..1) */
    t: number;
    /** collision normal (unit axis-aligned) at impact */
    nx: number;
    ny: number;
    /** time when we exit the box (useful for tunneling guards) */
    tExit: number;
}

/** A tiny epsilon to push away from surfaces and avoid re-hits due to FP jitter. */
const EPS = 1e-8;
/** Clamp helper */
const clamp = (v: number, lo: number, hi: number) =>
    v < lo ? lo : v > hi ? hi : v;
/** Sign helper returning -1, 0 or 1 with EPS deadzone */
const sgn = (v: number) => (v > EPS ? 1 : v < -EPS ? -1 : 0);

/** Creates an AABB from center + half extents (no alloc if out provided). */
export function fromCenter(
    out: AABB,
    cx: number,
    cy: number,
    hx: number,
    hy: number
): AABB {
    out.minX = cx - hx;
    out.maxX = cx + hx;
    out.minY = cy - hy;
    out.maxY = cy + hy;
    return out;
}

/** Copy AABB (no alloc). */
export function copyAABB(out: AABB, a: AABB): AABB {
    out.minX = a.minX;
    out.minY = a.minY;
    out.maxX = a.maxX;
    out.maxY = a.maxY;
    return out;
}

/** Moves an AABB by dx,dy (no alloc). */
export function translateAABB(
    out: AABB,
    a: AABB,
    dx: number,
    dy: number
): AABB {
    out.minX = a.minX + dx;
    out.maxX = a.maxX + dx;
    out.minY = a.minY + dy;
    out.maxY = a.maxY + dy;
    return out;
}

/** Expand an AABB by margins (can be negative to shrink). */
export function expandAABB(out: AABB, a: AABB, mx: number, my: number): AABB {
    out.minX = a.minX - mx;
    out.maxX = a.maxX + mx;
    out.minY = a.minY - my;
    out.maxY = a.maxY + my;
    return out;
}

/** Width & height helpers */
export const width = (a: AABB) => a.maxX - a.minX;
export const height = (a: AABB) => a.maxY - a.minY;
export const center = (a: AABB, out: Vec2) => {
    out.x = (a.minX + a.maxX) * 0.5;
    out.y = (a.minY + a.maxY) * 0.5;
    return out;
};

/////////////////////////////
// Narrow-phase primitives //
/////////////////////////////

/** Returns true if two AABBs overlap (strict overlap; touching edges counts as overlap). */
export function overlaps(a: AABB, b: AABB): boolean {
    return !(
        a.maxX <= b.minX ||
        a.minX >= b.maxX ||
        a.maxY <= b.minY ||
        a.minY >= b.maxY
    );
}

/** Returns true if two AABBs intersect or touch (non-strict). */
export function touches(a: AABB, b: AABB): boolean {
    return !(
        a.maxX < b.minX ||
        a.minX > b.maxX ||
        a.maxY < b.minY ||
        a.minY > b.maxY
    );
}

/**
 * Compute Minimum Translation Vector (MTV) to separate two overlapping AABBs.
 * Writes the MTV into out (x,y). If not overlapping, returns out=(0,0).
 * The MTV points from A to outside of B.
 */
export function mtv(a: AABB, b: AABB, out: Vec2): Vec2 {
    const axC = (a.minX + a.maxX) * 0.5;
    const ayC = (a.minY + a.maxY) * 0.5;
    const bxC = (b.minX + b.maxX) * 0.5;
    const byC = (b.minY + b.maxY) * 0.5;

    const dx = bxC - axC;
    const px = (width(a) + width(b)) * 0.5 - Math.abs(dx);

    if (px <= 0) {
        out.x = 0;
        out.y = 0;
        return out;
    }

    const dy = byC - ayC;
    const py = (height(a) + height(b)) * 0.5 - Math.abs(dy);

    if (py <= 0) {
        out.x = 0;
        out.y = 0;
        return out;
    }

    if (px < py) {
        out.x = dx < 0 ? px : -px;
        out.y = 0;
    } else {
        out.x = 0;
        out.y = dy < 0 ? py : -py;
    }
    return out;
}

/**
 * Swept AABB vs AABB: computes first time of impact (TOI) in normalized time [0,1].
 * moving = AABB at time 0, moving by velocity v * dt against static target.
 * Returns Hit { hit, t, nx, ny, tExit }.
 *
 * Algorithm: classic ray–slab (per-axis entry/exit times) with care for zero velocity.
 */
export function sweptAABB(
    moving: AABB,
    vx: number,
    vy: number,
    dt: number,
    target: AABB,
    out: Hit
): Hit {
    // Relative motion scaled by dt
    const dx = vx * dt;
    const dy = vy * dt;

    let tEnterX: number,
        tExitX: number,
        nx = 0;
    if (Math.abs(dx) < EPS) {
        if (moving.maxX <= target.minX || moving.minX >= target.maxX) {
            out.hit = false;
            out.t = 1;
            out.tExit = 1;
            out.nx = 0;
            out.ny = 0;
            return out;
        }
        tEnterX = -Infinity;
        tExitX = Infinity;
    } else {
        const invDx = 1 / dx;
        const tx1 = (target.minX - moving.maxX) * invDx;
        const tx2 = (target.maxX - moving.minX) * invDx;
        tEnterX = Math.min(tx1, tx2);
        tExitX = Math.max(tx1, tx2);
        nx = tx1 < tx2 ? -1 : 1; // normal points opposite to motion on entry
    }

    let tEnterY: number,
        tExitY: number,
        ny = 0;
    if (Math.abs(dy) < EPS) {
        if (moving.maxY <= target.minY || moving.minY >= target.maxY) {
            out.hit = false;
            out.t = 1;
            out.tExit = 1;
            out.nx = 0;
            out.ny = 0;
            return out;
        }
        tEnterY = -Infinity;
        tExitY = Infinity;
    } else {
        const invDy = 1 / dy;
        const ty1 = (target.minY - moving.maxY) * invDy;
        const ty2 = (target.maxY - moving.minY) * invDy;
        tEnterY = Math.min(ty1, ty2);
        tExitY = Math.max(ty1, ty2);
        ny = ty1 < ty2 ? -1 : 1;
    }

    const tEnter = Math.max(tEnterX, tEnterY);
    const tExit = Math.min(tExitX, tExitY);

    if (tEnter > tExit || tExit < 0 || tEnter > 1) {
        out.hit = false;
        out.t = 1;
        out.tExit = tExit;
        out.nx = 0;
        out.ny = 0;
        return out;
    }

    // Select axis of impact by which tEnter dominated
    let nX = 0,
        nY = 0;
    if (tEnterX > tEnterY) {
        nX = nx;
        nY = 0;
    } else {
        nX = 0;
        nY = ny;
    }

    out.hit = true;
    out.t = clamp(tEnter, 0, 1);
    out.tExit = clamp(tExit, 0, 1);
    out.nx = nX;
    out.ny = nY;
    return out;
}

/////////////////////
// Penetration fix //
/////////////////////

/**
 * Resolves penetration by applying MTV to `move` so it no longer overlaps `other`.
 * Returns the (dx,dy) applied in outDelta. Mutates `moveAABB`.
 */
export function resolvePenetration(
    moveAABB: AABB,
    other: AABB,
    outDelta: Vec2
): Vec2 {
    mtv(moveAABB, other, outDelta);
    if (outDelta.x === 0 && outDelta.y === 0) return outDelta;
    moveAABB.minX += outDelta.x;
    moveAABB.maxX += outDelta.x;
    moveAABB.minY += outDelta.y;
    moveAABB.maxY += outDelta.y;
    // tiny bias to prevent re-colliding on next step
    if (outDelta.x !== 0) {
        const bias = EPS * sgn(outDelta.x);
        moveAABB.minX += bias;
        moveAABB.maxX += bias;
        outDelta.x += bias;
    }
    if (outDelta.y !== 0) {
        const bias = EPS * sgn(outDelta.y);
        moveAABB.minY += bias;
        moveAABB.maxY += bias;
        outDelta.y += bias;
    }
    return outDelta;
}

/////////////////////
// Slide & Bounce  //
/////////////////////

/** Projects velocity onto the tangent plane defined by normal (axis-aligned normal only). */
function slideVelocity(v: Vec2, nx: number, ny: number) {
    if (nx !== 0) v.x = 0;
    if (ny !== 0) v.y = 0;
}

/** Reflects velocity with restitution on the normal (axis-aligned normal only). */
function bounceVelocity(v: Vec2, nx: number, ny: number, restitution: number) {
    if (nx !== 0) v.x = -v.x * restitution;
    if (ny !== 0) v.y = -v.y * restitution;
}

/**
 * Continuous move with slide against a set of static obstacles.
 * Mutates positionAABB and velocity according to collisions.
 * Returns actual time consumed (<= dt) and number of hits processed.
 *
 * Notes:
 * - Uses swept AABB for TOI. On hit, moves to impact point minus EPS and zeroes velocity along normal (slide).
 * - Repeats up to maxIters or until remaining time is ~0.
 * - obstacles: array of AABBs (static). For best perf, pass potential hits from a broadphase.
 */
export function moveAndSlide(
    positionAABB: AABB,
    velocity: Vec2,
    dt: number,
    obstacles: readonly AABB[],
    maxIters = 4
): { timeUsed: number; hits: number } {
    let timeLeft = dt;
    let hits = 0;

    // Temporary hit cache (reused across loops)
    const hit: Hit = { hit: false, t: 1, nx: 0, ny: 0, tExit: 1 };

    for (
        let iter = 0;
        iter < maxIters &&
        timeLeft > EPS &&
        (Math.abs(velocity.x) > EPS || Math.abs(velocity.y) > EPS);
        iter++
    ) {
        // Find earliest hit
        let earliestT = 1;
        let nx = 0,
            ny = 0;
        let targetIdx = -1;

        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            sweptAABB(positionAABB, velocity.x, velocity.y, timeLeft, obs, hit);
            if (hit.hit && hit.t < earliestT) {
                earliestT = hit.t;
                nx = hit.nx;
                ny = hit.ny;
                targetIdx = i;
                if (earliestT <= 0) break; // already penetrating along path
            }
        }

        if (targetIdx === -1) {
            // No hit: move fully
            const dx = velocity.x * timeLeft;
            const dy = velocity.y * timeLeft;
            positionAABB.minX += dx;
            positionAABB.maxX += dx;
            positionAABB.minY += dy;
            positionAABB.maxY += dy;
            return { timeUsed: dt, hits };
        } else {
            // Move to TOI
            const moveTime = Math.max(0, earliestT - EPS);
            const dx = velocity.x * moveTime;
            const dy = velocity.y * moveTime;
            positionAABB.minX += dx;
            positionAABB.maxX += dx;
            positionAABB.minY += dy;
            positionAABB.maxY += dy;

            // Nudge off the surface
            const push = EPS;
            positionAABB.minX += nx * push;
            positionAABB.maxX += nx * push;
            positionAABB.minY += ny * push;
            positionAABB.maxY += ny * push;

            // Slide by zeroing the blocked velocity component
            slideVelocity(velocity, nx, ny);

            timeLeft -= moveTime;
            hits++;
        }
    }

    // Consume leftover time with possibly single-axis motion (after slide)
    if (
        timeLeft > EPS &&
        (Math.abs(velocity.x) > EPS || Math.abs(velocity.y) > EPS)
    ) {
        const dx = velocity.x * timeLeft;
        const dy = velocity.y * timeLeft;
        positionAABB.minX += dx;
        positionAABB.maxX += dx;
        positionAABB.minY += dy;
        positionAABB.maxY += dy;
    }

    return { timeUsed: dt - timeLeft, hits };
}

/**
 * Continuous move with bounce against static obstacles.
 * restitution in [0,1]. Mutates positionAABB and velocity.
 */
export function moveAndBounce(
    positionAABB: AABB,
    velocity: Vec2,
    dt: number,
    obstacles: readonly AABB[],
    restitution = 0.0,
    maxIters = 6
): { timeUsed: number; hits: number } {
    let timeLeft = dt;
    let hits = 0;
    const hit: Hit = { hit: false, t: 1, nx: 0, ny: 0, tExit: 1 };

    for (let iter = 0; iter < maxIters && timeLeft > EPS; iter++) {
        let earliestT = 1,
            nx = 0,
            ny = 0,
            targetIdx = -1;
        for (let i = 0; i < obstacles.length; i++) {
            sweptAABB(
                positionAABB,
                velocity.x,
                velocity.y,
                timeLeft,
                obstacles[i],
                hit
            );
            if (hit.hit && hit.t < earliestT) {
                earliestT = hit.t;
                nx = hit.nx;
                ny = hit.ny;
                targetIdx = i;
                if (earliestT <= 0) break;
            }
        }

        if (targetIdx === -1) {
            // free move
            const dx = velocity.x * timeLeft,
                dy = velocity.y * timeLeft;
            positionAABB.minX += dx;
            positionAABB.maxX += dx;
            positionAABB.minY += dy;
            positionAABB.maxY += dy;
            return { timeUsed: dt, hits };
        }

        // move to impact
        const moveTime = Math.max(0, earliestT - EPS);
        const dx = velocity.x * moveTime,
            dy = velocity.y * moveTime;
        positionAABB.minX += dx;
        positionAABB.maxX += dx;
        positionAABB.minY += dy;
        positionAABB.maxY += dy;

        // collide: reflect velocity
        bounceVelocity(velocity, nx, ny, restitution);

        // Nudge off surface
        const push = EPS;
        positionAABB.minX += nx * push;
        positionAABB.maxX += nx * push;
        positionAABB.minY += ny * push;
        positionAABB.maxY += ny * push;

        timeLeft -= moveTime;
        hits++;
        // Early out if velocity is dead
        if (Math.abs(velocity.x) <= EPS && Math.abs(velocity.y) <= EPS) break;
    }

    // finalize leftover
    if (timeLeft > EPS) {
        const dx = velocity.x * timeLeft,
            dy = velocity.y * timeLeft;
        positionAABB.minX += dx;
        positionAABB.maxX += dx;
        positionAABB.minY += dy;
        positionAABB.maxY += dy;
    }

    return { timeUsed: dt - timeLeft, hits };
}

/////////////////////////////////////////
// Dynamic vs Dynamic (relative sweep) //
/////////////////////////////////////////

/**
 * Swept AABB for two moving boxes via relative motion.
 * a moves by va*dt, b moves by vb*dt — internally, we move a by (va-vb) vs static b.
 */
export function sweptAABB2Dynamic(
    a: AABB,
    va: Vec2,
    b: AABB,
    vb: Vec2,
    dt: number,
    out: Hit
): Hit {
    const rvx = va.x - vb.x,
        rvy = va.y - vb.y;
    return sweptAABB(a, rvx, rvy, dt, b, out);
}

/**
 * Simple dynamic–dynamic resolver:
 * - compute TOI via relative sweep
 * - advance both to the TOI
 * - separate along normal with equal-and-opposite impulses by mass ratios
 * - zero normal relative velocity for slide-like behavior (or reflect for bounce if restitution>0)
 *
 * Mass=1 by default. Mutates AABBs and velocities.
 */
export function resolveDynamicDynamic(
    a: AABB,
    va: Vec2,
    ma: number,
    b: AABB,
    vb: Vec2,
    mb: number,
    dt: number,
    restitution = 0
): { collided: boolean; t: number; nx: number; ny: number } {
    const hit: Hit = { hit: false, t: 1, nx: 0, ny: 0, tExit: 1 };
    sweptAABB2Dynamic(a, va, b, vb, dt, hit);
    if (!hit.hit) return { collided: false, t: 1, nx: 0, ny: 0 };

    const t = Math.max(0, hit.t - EPS);
    // Advance both to TOI
    const ax = va.x * t * dt,
        ay = va.y * t * dt;
    const bx = vb.x * t * dt,
        by = vb.y * t * dt;
    translateAABB(a, a, ax, ay);
    translateAABB(b, b, bx, by);

    // Impulse-like separation (axis-aligned normal only)
    const nx = hit.nx,
        ny = hit.ny;
    const totalMass = ma + mb || 1;
    const sep = EPS * 2; // tiny separation
    const aSepX = -nx * sep * (mb / totalMass);
    const aSepY = -ny * sep * (mb / totalMass);
    const bSepX = nx * sep * (ma / totalMass);
    const bSepY = ny * sep * (ma / totalMass);
    translateAABB(a, a, aSepX, aSepY);
    translateAABB(b, b, bSepX, bSepY);

    // Velocity response
    if (restitution === 0) {
        // Zero relative component along normal
        if (nx !== 0) {
            const rel = va.x - vb.x;
            const corr = rel;
            va.x -= corr * (mb / totalMass);
            vb.x += corr * (ma / totalMass);
        }
        if (ny !== 0) {
            const rel = va.y - vb.y;
            const corr = rel;
            va.y -= corr * (mb / totalMass);
            vb.y += corr * (ma / totalMass);
        }
    } else {
        // Reflect relative velocity along normal with restitution and distribute
        if (nx !== 0) {
            const rel = va.x - vb.x;
            const refl = -rel * restitution;
            const delta = refl - rel;
            va.x += delta * (mb / totalMass);
            vb.x -= delta * (ma / totalMass);
        }
        if (ny !== 0) {
            const rel = va.y - vb.y;
            const refl = -rel * restitution;
            const delta = refl - rel;
            va.y += delta * (mb / totalMass);
            vb.y -= delta * (ma / totalMass);
        }
    }

    return { collided: true, t, nx, ny };
}

//////////////////////
// Tunneling guards //
//////////////////////

/**
 * Clamp motion so that a moving AABB cannot skip entirely past a thin obstacle.
 * Useful for very high speeds: shrinks dt if needed to keep max displacement <= maxPenetration.
 */
export function clampTimeStepForSpeed(
    velocity: Vec2,
    dt: number,
    maxDisplacement: number
): number {
    const md = Math.max(Math.abs(velocity.x), Math.abs(velocity.y)) * dt;
    return md > maxDisplacement && maxDisplacement > 0
        ? dt * (maxDisplacement / md)
        : dt;
}

///////////////////////////////
// Broadphase: Sweep & Prune //
///////////////////////////////

/**
 * Sweep-and-Prune (SAP) along X axis. Sorts by minX, then scans to produce potential pairs.
 * Memory-aware: operates in-place over indices; reuses outPairs if provided.
 */
export function sapBroadphase(
    boxes: readonly AABB[],
    outPairs: number[] = [],
    scratchOrder: number[] = []
): number[] {
    const n = boxes.length;
    // Fill order
    scratchOrder.length = n;
    for (let i = 0; i < n; i++) scratchOrder[i] = i;

    // Sort indices by minX (simple TimSort via JS engine; stable & fast in practice)
    scratchOrder.sort((i, j) => boxes[i].minX - boxes[j].minX);

    outPairs.length = 0;

    // Active set scan
    for (let i = 0; i < n; i++) {
        const ai = scratchOrder[i];
        const a = boxes[ai];
        const aMaxX = a.maxX;
        for (let j = i + 1; j < n; j++) {
            const bi = scratchOrder[j];
            const b = boxes[bi];
            if (b.minX > aMaxX) break; // no more possible overlaps along X
            // Check Y overlap quickly
            if (!(a.maxY <= b.minY || a.minY >= b.maxY)) {
                outPairs.push(ai, bi);
            }
        }
    }
    return outPairs;
}

//////////////////////////////
// Multi-collision steppers //
//////////////////////////////

/**
 * Step a kinematic AABB with slide against many obstacles using a broadphase provider.
 * - getCandidates: returns indices of potential colliders (avoid scanning all).
 * - obstacles: pool of AABBs to reference by index.
 */
export function stepKinematic(
    position: AABB,
    velocity: Vec2,
    dt: number,
    obstacles: readonly AABB[],
    getCandidates: (
        mover: AABB,
        vx: number,
        vy: number,
        dt: number,
        outIdx: number[]
    ) => number[],
    maxIters = 4
): { timeUsed: number; hits: number } {
    const candidates: number[] = [];
    const list: AABB[] = [];
    let hits = 0;
    let timeUsed = 0;

    for (let iter = 0; iter < maxIters && dt - timeUsed > EPS; iter++) {
        candidates.length = 0;
        getCandidates(
            position,
            velocity.x,
            velocity.y,
            dt - timeUsed,
            candidates
        );
        list.length = 0;
        for (let i = 0; i < candidates.length; i++)
            list.push(obstacles[candidates[i]]);
        const res = moveAndSlide(position, velocity, dt - timeUsed, list, 1);
        hits += res.hits;
        timeUsed += res.timeUsed;
        if (
            res.timeUsed <= EPS ||
            (Math.abs(velocity.x) <= EPS && Math.abs(velocity.y) <= EPS)
        )
            break;
    }
    return { timeUsed, hits };
}

/////////////////////
// Scratch objects //
/////////////////////

// Tiny reusable temps (optional: use to avoid allocating Vec2/Hit on hot paths)
export const TMP_VEC: Vec2 = { x: 0, y: 0 };
export const TMP_HIT: Hit = { hit: false, t: 1, nx: 0, ny: 0, tExit: 1 };

///////////////////////
// Example (comment) //
///////////////////////
/*
const player: AABB = {minX:0, minY:0, maxX:1, maxY:2};
const vel: Vec2 = {x: 5, y: -2};
const walls: AABB[] = [
  {minX: 3, minY:-10, maxX:4, maxY:10},
  {minX:-2, minY:  1, maxX:6, maxY: 2}
];

// Broadphase (optional): in a real game, provide candidates per mover
const pairs = sapBroadphase(walls); // for demo only

// Slide resolver over dt=0.016s
moveAndSlide(player, vel, 1/60, walls);

// If you need bounce:
moveAndBounce(player, vel, 1/60, walls, 0.2);

// Dynamic vs dynamic:
const boxA: AABB = {minX:0,minY:0,maxX:1,maxY:1};
const boxB: AABB = {minX:2,minY:0,maxX:3,maxY:1};
const vA = {x:3,y:0}, vB = {x:-1,y:0};
resolveDynamicDynamic(boxA, vA, 1, boxB, vB, 1, 0);
*/

//////////////////////////
// Minimal documentation //
//////////////////////////

/**
 * Public API quick reference
 *
 * Types:
 *   - AABB { minX,minY,maxX,maxY }, Vec2 {x,y}, Hit {hit,t,nx,ny,tExit}
 *
 * Creation/transform:
 *   fromCenter(out,cx,cy,hx,hy) -> AABB
 *   copyAABB(out,a) -> AABB
 *   translateAABB(out,a,dx,dy) -> AABB
 *   expandAABB(out,a,mx,my) -> AABB
 *   width(a), height(a), center(a,out)
 *
 * Narrow phase:
 *   overlaps(a,b): boolean
 *   touches(a,b): boolean
 *   mtv(a,b,outVec): Vec2  // zero if no overlap
 *   sweptAABB(moving, vx, vy, dt, target, outHit): Hit
 *   sweptAABB2Dynamic(a,va,b,vb,dt,outHit): Hit
 *
 * Resolvers:
 *   resolvePenetration(moveAABB, other, outDelta) -> Vec2 (and mutates moveAABB)
 *   moveAndSlide(positionAABB, velocity, dt, obstacles, maxIters=4) -> {timeUsed,hits}
 *   moveAndBounce(positionAABB, velocity, dt, obstacles, restitution=0, maxIters=6) -> {timeUsed,hits}
 *   resolveDynamicDynamic(a,va,ma,b,vb,mb,dt,restitution=0) -> {collided,t,nx,ny}
 *   clampTimeStepForSpeed(vel, dt, maxDisplacement) -> dt'
 *
 * Broadphase:
 *   sapBroadphase(boxes, outPairs?, scratchOrder?) -> number[]  // returns flat pairs [i0,j0,i1,j1,...]
 *
 * Higher-level step:
 *   stepKinematic(position, velocity, dt, obstacles, getCandidates, maxIters=4)
 *     - getCandidates(mover, vx, vy, dt, outIdx) -> number[]  // fill indices of obstacles to test
 *
 * Performance tips:
 *   - Use sapBroadphase per frame to cull obstacle candidates for each mover.
 *   - Reuse arrays: pass preallocated outPairs/scratchOrder/candidate arrays to avoid GC.
 *   - Keep dt bounded (e.g., clamp to 1/30) to improve stability.
 *   - Use moveAndSlide for platformer/TopDown; use moveAndBounce for arcade physics.
 */
