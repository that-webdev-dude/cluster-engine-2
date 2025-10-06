import {
    ECSUpdateSystem,
    CommandBuffer,
    Chunk,
    View,
    Store,
    Entity,
    UniformGrid,
    DebugOverlay,
    AABB,
    AABBTools,
} from "../../../cluster";
import { Component } from "../components";
import { DESCRIPTORS } from "../components/descriptors";
import { PositionIndex } from "../components/Position";
import { SizeIndex } from "../components/Size";
import { OffsetIndex } from "../components/Offset";
import { VelocityIndex } from "../components/Velocity";
import { AABBIndex } from "../components/AABB";
import { CollisionEvent, CollisionContact } from "../events";
import { ComponentType, EntityMeta } from "../../../cluster/types";
import { BigSparseSet } from "../../../cluster/tools/SparseSet";

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
    offset?: Float32Array;
    row: number;
}

const POSITION_STRIDE = DESCRIPTORS.Position.count;
const SIZE_STRIDE = DESCRIPTORS.Size.count;
const OFFSET_STRIDE = DESCRIPTORS.Offset.count;
const VELOCITY_STRIDE = DESCRIPTORS.Velocity.count;
const AABB_STRIDE = DESCRIPTORS.AABB.count;

const DEBUG_OVERLAY = false;
const DEBUG_COLOR_ACTIVE = "rgba(255, 180, 0, 0.9)";
const DEBUG_COLOR_AABB = "rgba(0, 255, 0, 0.8)";
const DEBUG_COLOR_TEXT = "rgba(250, 250, 250, 0.95)";

export class CollisionSystem extends ECSUpdateSystem {
    private collisionActiveRect: CollisionActiveRect | undefined = undefined;
    private readonly displayW: number;
    private readonly displayH: number;
    private readonly collisionMap: Map<string, CollisionContact[]> = new Map();
    private readonly targEntities: BigSparseSet<bigint, CollisionEntity> =
        new BigSparseSet();
    private db: DebugOverlay | undefined = undefined;
    private debugMainsProcessed = 0;
    private debugCandidatesTested = 0;
    private debugContactsFound = 0;

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

        if (DEBUG_OVERLAY) {
            this.db = new DebugOverlay(
                this.displayW,
                this.displayH,
                300,
                DEBUG_OVERLAY
            );
        }
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
            [
                Component.Camera,
                Component.Position,
                Component.Offset,
                Component.Size,
            ],
            (chunk) => {
                if (chunk.count > 1)
                    console.warn(
                        "[CollisionSystem] Multiple cameras found - using the first one"
                    );

                // Fix: Remove unnecessary loop and add bounds checking
                if (
                    chunk.count > 0 &&
                    chunk.views.Position &&
                    chunk.views.Offset &&
                    chunk.views.Size
                ) {
                    activeRect ??= {
                        position: chunk.views.Position,
                        offset: chunk.views.Offset,
                        size: chunk.views.Size,
                        row: 0,
                    };
                }
            }
        );

        // fallback to the display dimensions if no camera is found
        if (this.displayW && this.displayH) {
            activeRect ??= {
                position: (() => {
                    const arr = new Float32Array(POSITION_STRIDE);
                    arr[PositionIndex.X] = this.displayW * 0.5;
                    arr[PositionIndex.Y] = this.displayH * 0.5;
                    arr[PositionIndex.PREV_X] = arr[PositionIndex.X];
                    arr[PositionIndex.PREV_Y] = arr[PositionIndex.Y];
                    return arr;
                })(),
                size: (() => {
                    const arr = new Float32Array(SIZE_STRIDE);
                    arr[SizeIndex.WIDTH] = this.displayW;
                    arr[SizeIndex.HEIGHT] = this.displayH;
                    return arr;
                })(),
                offset: new Float32Array(OFFSET_STRIDE),
                row: 0,
            };
        }

        return activeRect;
    }

    private getActiveAreaBounds():
        | { left: number; top: number; width: number; height: number }
        | undefined {
        if (!this.collisionActiveRect) return undefined;

        const { position, size, offset, row } = this.collisionActiveRect;

        const posBase = row * POSITION_STRIDE;
        const cx = position[posBase + PositionIndex.X] || 0;
        const cy = position[posBase + PositionIndex.Y] || 0;

        const sizeBase = row * SIZE_STRIDE;
        const viewW = size[sizeBase + SizeIndex.WIDTH] || this.displayW;
        const viewH = size[sizeBase + SizeIndex.HEIGHT] || this.displayH;

        let offX = 0;
        let offY = 0;
        if (offset) {
            const offsetBase = row * OFFSET_STRIDE;
            offX = offset[offsetBase + OffsetIndex.X] || 0;
            offY = offset[offsetBase + OffsetIndex.Y] || 0;
        }

        const halfW = viewW * 0.5;
        const halfH = viewH * 0.5;

        return {
            left: cx - (halfW - offX),
            top: cy - (halfH - offY),
            width: viewW,
            height: viewH,
        };
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

        const posBase = row * POSITION_STRIDE;
        const x = chunk.views.Position[posBase + PositionIndex.X];
        const y = chunk.views.Position[posBase + PositionIndex.Y];

        const aabbBase = row * AABB_STRIDE;
        const minX = chunk.views.AABB[aabbBase + AABBIndex.MIN_X];
        const minY = chunk.views.AABB[aabbBase + AABBIndex.MIN_Y];
        const maxX = chunk.views.AABB[aabbBase + AABBIndex.MAX_X];
        const maxY = chunk.views.AABB[aabbBase + AABBIndex.MAX_Y];
        const w = Math.abs(maxX - minX);
        const h = Math.abs(maxY - minY);
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
        const prev = (chunk.views as any).Position as Float32Array | undefined;

        if (mv) {
            const mvBase = row * VELOCITY_STRIDE;
            vx = mv[mvBase + VelocityIndex.X];
            vy = mv[mvBase + VelocityIndex.Y];
        } else if (prev && dt > 0) {
            const prevBase = row * POSITION_STRIDE;
            vx = (main.x - prev[prevBase + PositionIndex.PREV_X]) / dt;
            vy = (main.y - prev[prevBase + PositionIndex.PREV_Y]) / dt;
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
        const bounds = this.getActiveAreaBounds();
        if (!bounds) return false;

        const { aabb } = entity;
        const activeLeft = bounds.left;
        const activeRight = bounds.left + bounds.width;
        const activeTop = bounds.top;
        const activeBottom = bounds.top + bounds.height;

        if (
            aabb.maxX >= activeLeft &&
            aabb.minX <= activeRight &&
            aabb.maxY >= activeTop &&
            aabb.minY <= activeBottom
        ) {
            return true;
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
                    const posBase = i * POSITION_STRIDE;
                    const x = chunk.views.Position[posBase + PositionIndex.X];
                    const y = chunk.views.Position[posBase + PositionIndex.Y];

                    const aabbBase = i * AABB_STRIDE;
                    const aabbW = Math.abs(
                        chunk.views.AABB[aabbBase + AABBIndex.MAX_X] -
                            chunk.views.AABB[aabbBase + AABBIndex.MIN_X]
                    );
                    const aabbH = Math.abs(
                        chunk.views.AABB[aabbBase + AABBIndex.MAX_Y] -
                            chunk.views.AABB[aabbBase + AABBIndex.MIN_Y]
                    );

                    // update the AABB component to make sure is aligned with the entity position
                    chunk.views.AABB[aabbBase + AABBIndex.MIN_X] =
                        x - aabbW * 0.5;
                    chunk.views.AABB[aabbBase + AABBIndex.MIN_Y] =
                        y - aabbH * 0.5;
                    chunk.views.AABB[aabbBase + AABBIndex.MAX_X] =
                        x + aabbW * 0.5;
                    chunk.views.AABB[aabbBase + AABBIndex.MAX_Y] =
                        y + aabbH * 0.5;
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

        this.debugMainsProcessed = 0;
        this.debugCandidatesTested = 0;
        this.debugContactsFound = 0;

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
                (chunk, chunkId) =>
                    this.processMainCollisionChunk(
                        view,
                        cmd,
                        dt,
                        chunk,
                        chunkId
                    )
            );
        }

        if (this.db?.enabled) {
            this.renderDebugOverlay(view);
        }
    }

    private processMainCollisionChunk(
        view: View,
        cmd: CommandBuffer,
        dt: number,
        chunk: Readonly<Chunk<any>>,
        chunkId: number
    ): void {
        for (let i = 0; i < chunk.count; i++) {
            this.processMainEntity(view, cmd, dt, chunk, chunkId, i);
        }
    }

    private processMainEntity(
        view: View,
        cmd: CommandBuffer,
        dt: number,
        chunk: Readonly<Chunk<any>>,
        chunkId: number,
        row: number
    ): void {
        const mainEntity = this.getCollisionEntity(chunk, chunkId, row);
        if (!this.testForActiveArea(mainEntity)) return;

        this.collisionMap.clear();
        this.debugMainsProcessed++;

        const hasContacts = this.collectContacts(mainEntity, chunk, row, dt);

        if (hasContacts) {
            this.emitCollisionEvent(mainEntity, view, cmd, dt);
        }
    }

    private collectContacts(
        mainEntity: CollisionEntity,
        chunk: Readonly<Chunk<any>>,
        row: number,
        dt: number
    ): boolean {
        const candidates = this.getCollisionCandidates(mainEntity);
        this.debugCandidatesTested += candidates.length;
        if (candidates.length === 0) return false;

        let recordedContact = false;
        for (const candidateID of candidates) {
            const contactRecorded = this.tryRecordCollision(
                mainEntity,
                chunk,
                row,
                dt,
                candidateID
            );
            recordedContact ||= contactRecorded;
        }

        return recordedContact;
    }

    private tryRecordCollision(
        mainEntity: CollisionEntity,
        chunk: Readonly<Chunk<any>>,
        row: number,
        dt: number,
        candidateID: bigint
    ): boolean {
        const target = this.targEntities.get(candidateID);
        if (!target) return false;
        if (target.entityID === mainEntity.entityID) return false;
        if (!this.detectCollision(mainEntity, target)) return false;

        const contact = this.getCollisionContact(
            mainEntity,
            target,
            chunk,
            row,
            dt
        );

        const eventType = target.eventType || "default";
        if (!this.collisionMap.has(eventType)) {
            this.collisionMap.set(eventType, []);
        }

        this.collisionMap.get(eventType)!.push(contact);
        this.debugContactsFound++;
        return true;
    }

    private renderDebugOverlay(view: View): void {
        if (!this.db?.enabled) return;

        const bounds = this.getActiveAreaBounds();
        if (!bounds) return;

        this.db.clear();

        const toScreenX = (worldX: number) => worldX - bounds.left;
        const toScreenY = (worldY: number) => worldY - bounds.top;

        const viewportWidth = Math.min(bounds.width, this.displayW);
        const viewportHeight = Math.min(bounds.height, this.displayH);

        this.drawRect(
            0,
            0,
            viewportWidth,
            viewportHeight,
            DEBUG_COLOR_ACTIVE,
            2,
            6
        );

        view.forEachChunkWith([Component.AABB], (chunk) => {
            const count = chunk.count;
            if (count === 0) return;

            const aabb = chunk.views.AABB;

            for (let i = 0; i < count; i++) {
                const base = i * AABB_STRIDE;
                const minX = toScreenX(aabb[base + AABBIndex.MIN_X]);
                const minY = toScreenY(aabb[base + AABBIndex.MIN_Y]);
                const maxX = toScreenX(aabb[base + AABBIndex.MAX_X]);
                const maxY = toScreenY(aabb[base + AABBIndex.MAX_Y]);

                if (
                    maxX < 0 ||
                    maxY < 0 ||
                    minX > this.displayW ||
                    minY > this.displayH
                ) {
                    continue;
                }

                this.drawRect(minX, minY, maxX, maxY, DEBUG_COLOR_AABB, 1, 0);
            }
        });

        this.renderDebugText(bounds);
    }

    private drawRect(
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
        color: string,
        width: number,
        dash: number
    ) {
        if (!this.db) return;
        this.db.line(minX, minY, maxX, minY, width, color, dash);
        this.db.line(maxX, minY, maxX, maxY, width, color, dash);
        this.db.line(maxX, maxY, minX, maxY, width, color, dash);
        this.db.line(minX, maxY, minX, minY, width, color, dash);
    }

    private renderDebugText(bounds: {
        left: number;
        top: number;
        width: number;
        height: number;
    }): void {
        if (!this.db) return;

        const boxWidth = 192;
        const boxHeight = 128;
        const margin = 16;
        const left = this.displayW - boxWidth - margin;
        const top = this.displayH - boxHeight - margin;
        const right = left + boxWidth;
        const bottom = top + boxHeight;

        this.drawRect(left, top, right, bottom, DEBUG_COLOR_ACTIVE, 1, 4);

        const textLines = [
            "CollisionSystem Debug",
            `Camera: (${bounds.left.toFixed(1)}, ${bounds.top.toFixed(1)})`,
            `Viewport: ${bounds.width.toFixed(1)} x ${bounds.height.toFixed(
                1
            )}`,
            `Mains processed: ${this.debugMainsProcessed}`,
            `Candidates tested: ${this.debugCandidatesTested}`,
            `Contacts found: ${this.debugContactsFound}`,
            `Targets cached: ${this.targEntities.size()}`,
        ];

        let textY = top + 20;
        for (const line of textLines) {
            this.db.text(
                line,
                left + 12,
                textY,
                "12px monospace",
                DEBUG_COLOR_TEXT
            );
            textY += 16;
        }
    }

    public dispose(): void {
        this.collisionActiveRect = undefined;
        this.collisionMap.clear();
        this.targEntities.clear();
        this.spatialGrid.clear();
        this.spatialGridQueryCache.length = 0;
        this.debugMainsProcessed = 0;
        this.debugCandidatesTested = 0;
        this.debugContactsFound = 0;
        this.db?.dispose();
        this.db = undefined;
    }
}
