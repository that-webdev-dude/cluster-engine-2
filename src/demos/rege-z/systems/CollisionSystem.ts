import {
    ECSUpdateSystem,
    CommandBuffer,
    Chunk,
    View,
    Store,
    Entity,
    UniformGrid,
} from "../../../cluster";
import { Component } from "../components";
import { CollisionEvent, CollisionContact } from "../events";
import { ComponentType, EntityMeta } from "../../../cluster/types";
import { BigSparseSet } from "../../../cluster/tools/SparseSet";
import { AABB, AABBTools } from "./AABB";

export interface CollisionPairs {
    main: ComponentType;
    targets: {
        target: ComponentType;
        eventType: string;
    }[];
}

export interface CollisionEntity {
    entityID: bigint;
    meta: EntityMeta;
    aabb: AABB;
    x: number;
    y: number;
    hw: number;
    hh: number;
    eventType?: string;
}

export interface CollisionActiveRect {
    position: Float32Array;
    size: Float32Array;
}

export class CollisionSystem extends ECSUpdateSystem {
    private collisionActiveRect: CollisionActiveRect | undefined = undefined;
    private readonly displayW: number;
    private readonly displayH: number;
    private readonly collisionMap: Map<string, CollisionContact[]> = new Map();
    private readonly targEntities: BigSparseSet<bigint, CollisionEntity> =
        new BigSparseSet();

    // spatial partitioning properties
    private readonly spatialGrid: UniformGrid<bigint> = new UniformGrid(64); // for now 64 is set as default cell size
    private readonly spatialGridQueryCache: bigint[] = [];

    public constructor(
        store: Store,
        private readonly config?: CollisionPairs[]
    ) {
        super(store);
        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");
    }

    /**
     * Retrieves the active collision rectangle for the current view.
     * This rectangle is determined by the first camera entity found (with Position and Size components).
     * If no camera is present, it falls back to the display dimensions.
     * @param view The ECS view to search for camera entities.
     * @returns The active collision rectangle, or undefined if not available.
     */
    private getCollisionActiveRect(
        view: View
    ): CollisionActiveRect | undefined {
        let activeRect = undefined;

        view.forEachChunkWith(
            [Component.Camera, Component.Position, Component.Size],
            (chunk) => {
                if (chunk.count > 1)
                    console.warn(
                        "[CollisionSystem] Multiple cameras found - using the first one"
                    );

                // Fix: Remove unnecessary loop and add bounds checking
                if (
                    chunk.count > 0 &&
                    chunk.views.Position &&
                    chunk.views.Size
                ) {
                    activeRect ??= {
                        position: chunk.views.Position,
                        size: chunk.views.Size,
                    };
                }
            }
        );

        // fallback to the display dimensions if no camera is found
        if (this.displayW && this.displayH) {
            activeRect ??= {
                position: new Float32Array([0, 0]),
                size: new Float32Array([this.displayW, this.displayH]),
            };
        }

        return activeRect;
    }

    private getCollisionEntity(
        chunk: Readonly<Chunk<any>>,
        chunkId: number,
        row: number
    ) {
        const meta: EntityMeta = {
            generation: chunk.getGeneration(row),
            archetype: chunk.archetype,
            chunkId,
            row: row,
        };

        let base = row * 2;
        const x = chunk.views.Position[base + 0];
        const y = chunk.views.Position[base + 1];
        const w = Math.abs(chunk.views.Size[base + 0]);
        const h = Math.abs(chunk.views.Size[base + 1]);
        const hw = w * 0.5;
        const hh = h * 0.5;

        const aabb: AABB = AABBTools.create(x, y, w, h);

        const entityID = Entity.createMetaID(meta);

        return {
            entityID,
            meta,
            x,
            y,
            hw,
            hh,
            aabb,
        };
    }

    private storeCollisionTarget(
        entity: CollisionEntity,
        entitySet: BigSparseSet<bigint, CollisionEntity>
    ) {
        if (this.testForActiveArea(entity)) {
            entitySet.insert(entity.entityID, entity);
        }
    }

    private getCollisionTargets(
        view: View,
        targetSpecs: { target: ComponentType; eventType: string }[]
    ): void {
        if (!this.config) return;

        this.targEntities.clear();
        this.spatialGrid.clear();

        for (const { target, eventType } of targetSpecs) {
            view.forEachChunkWith(
                [target, Component.AABB, Component.Position, Component.Size],
                (chunk, chunkId) => {
                    for (let i = 0; i < chunk.count; i++) {
                        const entity = this.getCollisionEntity(
                            chunk,
                            chunkId,
                            i
                        );

                        // store the targets
                        this.storeCollisionTarget(
                            { ...entity, eventType },
                            this.targEntities
                        );

                        // insert into spatial grid for spatial partitioning
                        this.spatialGrid.insert(entity.entityID, entity.aabb);
                    }
                }
            );
        }
    }

    private getCollisionCandidates(mainEntity: CollisionEntity) {
        const candidates = this.spatialGrid.queryRegion(mainEntity.aabb);

        // clear and reuse the cache array to avoid allocations
        this.spatialGridQueryCache.length = 0;
        this.spatialGridQueryCache.push(...candidates);

        return this.spatialGridQueryCache;
    }

    private getCollisionContact(
        main: CollisionEntity,
        target: CollisionEntity,
        chunk: Readonly<Chunk<any>>,
        row: number,
        dt: number
    ): CollisionContact {
        const mainAABB = main.aabb;
        const targAABB = target.aabb;

        // Velocity along normal: prefer explicit Velocity; else derive from PreviousPosition
        let vx = 0,
            vy = 0;
        const mv = (chunk.views as any).Velocity as Float32Array | undefined;
        const prev = (chunk.views as any).PreviousPosition as
            | Float32Array
            | undefined;
        if (mv) {
            vx = mv[row * 2 + 0];
            vy = mv[row * 2 + 1];
        } else if (prev && dt > 0) {
            vx = (main.x - prev[row * 2 + 0]) / dt;
            vy = (main.y - prev[row * 2 + 1]) / dt;
        }

        const collisionAttributes = AABBTools.getCollisionAttributes(
            mainAABB,
            targAABB,
            { x: vx, y: vy } // pass the targ vels for relative velocity computations
        );

        if (!collisionAttributes) throw new Error("the two aabb don't overlap");

        return {
            otherMeta: target.meta,
            otherAABB: targAABB,
            ...collisionAttributes,
        };
    }

    private testForActiveArea(entity: CollisionEntity) {
        // check if the entity falls into the collision active area (culling)
        // The collision active area represents the camera viewport in world coordinates
        // Camera position is the top-left corner of the viewport
        // Entity position is the center of the entity
        // We check if the entity's bounding box overlaps with the active area
        if (this.collisionActiveRect !== undefined) {
            const { aabb } = entity;

            const aX =
                this.collisionActiveRect.position[0] - this.displayW * 0.5;
            const aY =
                this.collisionActiveRect.position[1] - this.displayH * 0.5;
            const aW = this.collisionActiveRect.size[0];
            const aH = this.collisionActiveRect.size[1];

            // Check if entity's bounding box overlaps with the active area
            // Entity bounds: [aabb.minX, aabb.maxX] x [aabb.minY, aabb.maxY]
            // Active area bounds: [aX, aX+aW] x [aY, aY+aH]
            const activeLeft = aX;
            const activeRight = aX + aW;
            const activeTop = aY;
            const activeBottom = aY + aH;

            // Check for overlap using AABB intersection test
            if (
                aabb.maxX >= activeLeft &&
                aabb.minX <= activeRight &&
                aabb.maxY >= activeTop &&
                aabb.minY <= activeBottom
            ) {
                // Debug logging (uncomment to see culling in action)
                // console.log(`Entity ${entity.entityID} inside active area:`, {
                //     entity: { aabb, left: aabb.minX, right: aabb.maxX, top: aabb.minY, bottom: aabb.maxY },
                //     active: { x: aX, y: aY, w: aW, h: aH, left: activeLeft, right: activeRight, top: activeTop, bottom: activeBottom }
                // });

                return true;
            }
            return false;
        }

        return false;
    }

    private detectCollision(
        main: CollisionEntity,
        target: CollisionEntity
    ): boolean {
        const mainAABB = main.aabb;
        const targAABB = target.aabb;

        // AABB collision test: check if the boxes overlap
        return (
            mainAABB.minX < targAABB.maxX &&
            mainAABB.maxX > targAABB.minX &&
            mainAABB.minY < targAABB.maxY &&
            mainAABB.maxY > targAABB.minY
        );
    }

    private emitCollisionEvent(
        mainEntity: CollisionEntity,
        view: View,
        cmd: CommandBuffer,
        dt: number
    ) {
        if (this.collisionMap.size > 0) {
            // Sort contacts for each event type by priority (collision ranking)
            this.collisionMap.forEach((contacts, eventType) => {
                contacts.sort((a, b) => {
                    if (Math.abs(b.depth - a.depth) > 0.001)
                        return b.depth - a.depth;
                    if (Math.abs(b.area - a.area) > 0.001)
                        return b.area - a.area;
                    return b.ndv - a.ndv;
                });

                const mainMeta = mainEntity.meta;
                const mainAABB = mainEntity.aabb;
                const primary = contacts[0];
                const secondary = contacts[1];
                const tertiary = contacts[2];

                // emits the event type
                this.store.emit<CollisionEvent>(
                    {
                        type: eventType,
                        data: {
                            view,
                            cmd,
                            dt,
                            mainMeta,
                            mainAABB,
                            primary,
                            secondary,
                            tertiary,
                        },
                    },
                    false
                );
            });
        }
    }

    private updateAllAABBs(view: View): void {
        view.forEachChunkWith(
            [Component.AABB, Component.Position, Component.Size],
            (chunk, chunkId) => {
                for (let i = 0; i < chunk.count; i++) {
                    let base = i * 2;
                    const x = chunk.views.Position[base + 0];
                    const y = chunk.views.Position[base + 1];
                    const w = Math.abs(chunk.views.Size[base + 0]);
                    const h = Math.abs(chunk.views.Size[base + 1]);
                    const hw = w * 0.5;
                    const hh = h * 0.5;

                    base = i * 4;
                    // update the AABB component to make sure is aligned with the entity position
                    chunk.views.AABB[base + 0] = x - hw;
                    chunk.views.AABB[base + 1] = y - hh;
                    chunk.views.AABB[base + 2] = x + hw;
                    chunk.views.AABB[base + 3] = y + hh;
                }
            }
        );
    }

    public update(view: View, cmd: CommandBuffer, dt: number) {
        if (!this.config) return;

        // cache the camera or display rect for culling
        this.collisionActiveRect ??= this.getCollisionActiveRect(view);
        if (!this.collisionActiveRect) {
            console.warn(
                "[CollisionSystem] No active rect found - exiting CollisionSystem"
            );
            return;
        }

        // update all AABB components to make sure they align with the entity positions before processing
        this.updateAllAABBs(view);

        // start the testing loop
        for (const collisionSpec of this.config) {
            const { main, targets } = collisionSpec;

            // collects the targets for this main entity
            this.getCollisionTargets(view, targets);

            // exit immediately if there are no targets
            if (this.targEntities.size() <= 0) continue;

            view.forEachChunkWith(
                // loops on each main in the config
                [main, Component.AABB, Component.Position, Component.Size],
                (chunk, chunkId) => {
                    for (let i = 0; i < chunk.count; i++) {
                        // turn the main into a collision entity for processing
                        const mainEntity: CollisionEntity =
                            this.getCollisionEntity(chunk, chunkId, i);

                        // skip if the main is out of the active area
                        if (!this.testForActiveArea(mainEntity)) continue;

                        this.collisionMap.clear();

                        // use the spatial grid to get the candidates to test against the main entity
                        const candidates =
                            this.getCollisionCandidates(mainEntity);

                        // skip if there are no candidates
                        if (candidates.length === 0) continue;

                        for (const candidateID of candidates) {
                            const target = this.targEntities.get(candidateID);
                            if (!target) continue;

                            // Skip self when main and target component are the same
                            if (target.entityID === mainEntity.entityID)
                                continue;

                            // AABB collision test: check if the boxes overlap
                            if (this.detectCollision(mainEntity, target)) {
                                // if there's a collision stores the contact into the collisionMap
                                const contact = this.getCollisionContact(
                                    mainEntity,
                                    target,
                                    chunk,
                                    i,
                                    dt
                                );

                                // in collisionMap we group contacts by event type directly
                                const eventType = target.eventType || "default";
                                if (!this.collisionMap.has(eventType)) {
                                    this.collisionMap.set(eventType, []);
                                }

                                this.collisionMap.get(eventType)!.push(contact);
                            }
                        }

                        this.emitCollisionEvent(mainEntity, view, cmd, dt);
                    }
                }
            );
        }
    }
}
