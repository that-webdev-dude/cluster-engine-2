import {
    ECSUpdateSystem,
    CommandBuffer,
    Chunk,
    View,
    Store,
    Vector,
    Entity,
    UniformGrid,
} from "../../../cluster";
import { Component } from "../components";
import { CollisionEvent, CollisionContact } from "../events";
import { ComponentType, EntityMeta } from "../../../cluster/types";
import { BigSparseSet } from "../../../cluster/tools/SparseSet";
import { AABB } from "../../../cluster/tools/Partitioner";

export interface CollisionPair {
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
    private readonly mainEntities: BigSparseSet<bigint, CollisionEntity> =
        new BigSparseSet();
    private readonly targEntities: BigSparseSet<bigint, CollisionEntity> =
        new BigSparseSet();
    private readonly collisionMap: Map<string, CollisionContact[]> = new Map();

    public constructor(
        store: Store,
        private readonly config?: CollisionPair[]
    ) {
        super(store);

        this.displayW = store.get("displayW");
        this.displayH = store.get("displayH");
    }

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

                for (let i = 0; i < 1; i++) {
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

        // Debug logging for collision active area
        // if (activeRect) {
        //     console.log("[CollisionSystem] Active area set:", {
        //         position: [activeRect.position[0], activeRect.position[1]],
        //         size: [activeRect.size[0], activeRect.size[1]],
        //         bounds: {
        //             left: activeRect.position[0],
        //             top: activeRect.position[1],
        //             right: activeRect.position[0] + activeRect.size[0],
        //             bottom: activeRect.position[1] + activeRect.size[1],
        //         },
        //     });
        // }

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

        base = row * 4;
        // update the AABB component to make sure is aligned with the entity position
        chunk.views.AABB[base + 0] = x - hw;
        chunk.views.AABB[base + 1] = y - hh;
        chunk.views.AABB[base + 2] = x + hw;
        chunk.views.AABB[base + 3] = y + hh;

        const aabb: AABB = {
            minX: chunk.views.AABB[base + 0],
            minY: chunk.views.AABB[base + 1],
            maxX: chunk.views.AABB[base + 2],
            maxY: chunk.views.AABB[base + 3],
        };

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

    private getCollisionTargets(view: View): void {
        if (!this.config) return;

        this.mainEntities.clear();
        this.targEntities.clear();

        for (const collisionSpec of this.config) {
            const { targets } = collisionSpec;

            for (const { target, eventType } of targets) {
                view.forEachChunkWith(
                    [
                        target,
                        Component.AABB,
                        Component.Position,
                        Component.Size,
                    ],
                    (chunk, chunkId) => {
                        for (let i = 0; i < chunk.count; i++) {
                            const entity = this.getCollisionEntity(
                                chunk,
                                chunkId,
                                i
                            );
                            this.storeCollisionTarget(
                                { ...entity, eventType },
                                this.targEntities
                            );
                        }
                    }
                );
            }
        }
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

        const overlapX =
            Math.min(mainAABB.maxX, targAABB.maxX) -
            Math.max(mainAABB.minX, targAABB.minX);
        const overlapY =
            Math.min(mainAABB.maxY, targAABB.maxY) -
            Math.max(mainAABB.minY, targAABB.minY);

        const useX = Math.abs(overlapX) < Math.abs(overlapY);
        const overlap = new Vector(overlapX, overlapY);
        const depth = useX ? overlapX : overlapY;
        const area = overlapX * overlapY;

        // collision normal
        const normal = useX
            ? new Vector(Math.sign(main.x - target.x), 0)
            : new Vector(0, Math.sign(main.y - target.y));

        // MTV to push 'main' out of 'target'
        const mtv = new Vector(normal.x * depth, normal.y * depth);

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
        const ndv = normal.x * vx + normal.y * vy;

        return {
            otherMeta: target.meta,
            overlap,
            normal,
            depth,
            mtv,
            ndv,
            area,
            axis: useX ? "x" : "y",
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

            const aX = this.collisionActiveRect.position[0];
            const aY = this.collisionActiveRect.position[1];
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

        // start the testing loop
        for (const collisionSpec of this.config) {
            const { main } = collisionSpec;

            // collects the targets for this main entity
            this.getCollisionTargets(view);

            // exit immediately if there are no targets
            if (this.targEntities.size() <= 0) return;

            view.forEachChunkWith(
                // loops on each main in the config
                [main, Component.AABB, Component.Position, Component.Size],
                (chunk, chunkId) => {
                    for (let i = 0; i < chunk.count; i++) {
                        // turn the main into a collision entity for processing
                        const mainEntity: CollisionEntity =
                            this.getCollisionEntity(chunk, chunkId, i);

                        // skip if the main is out of the active ares
                        if (!this.testForActiveArea(mainEntity)) continue;

                        this.collisionMap.clear();
                        this.targEntities.forEach((target) => {
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
                        });

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

                                const mainMeta: EntityMeta = mainEntity.meta;
                                const primary = contacts[0];
                                const secondary = contacts[1];
                                const tertiary = contacts[2];

                                // emits the event type
                                this.store.emit<CollisionEvent>({
                                    type: eventType,
                                    data: {
                                        cmd,
                                        mainMeta,
                                        primary,
                                        secondary,
                                        tertiary,
                                    },
                                });
                            });
                        }
                    }
                }
            );
        }
    }
}
