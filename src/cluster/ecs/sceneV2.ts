import { ArchetypeV2, Signature } from "./archetypeV2";
import { StorageV2 } from "./storageV2";
import {
    ComponentDescriptor,
    ComponentType,
    ComponentValueMap,
    EntityId,
} from "../types";
import { ChunkV2 } from "./chunkV2";
import { SparseSet, IDPool } from "../tools";
import { CommandBufferV2 } from "./cmdV2";
import { UpdateableSystemV2, RenderableSystemV2 } from "./system";

export type EntityMeta = {
    archetype: ArchetypeV2<any>;
    chunkId: number;
    row: number;
    generation: number;
};

const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

export class ViewV2 {
    constructor(
        private readonly archetypeMap: Map<Signature, StorageV2<any>>
    ) {}

    forEachChunkWith(
        comps: ComponentType[],
        cb: (chunk: Readonly<ChunkV2<any>>, chunkId: number) => void
    ) {
        const sig = ArchetypeV2.makeSignature(...comps);
        for (const [archSig, storage] of this.archetypeMap) {
            if ((archSig & sig) === sig) {
                storage.forEachChunk(cb);
            }
        }
    }
}

export class SceneV2 {
    private entityMeta: SparseSet<EntityId, EntityMeta> = new SparseSet();
    private entityPool: IDPool<EntityId> = new IDPool();
    readonly archetypes: Map<Signature, StorageV2<any>> = new Map();

    readonly cmd: CommandBufferV2;
    readonly view: ViewV2;

    readonly updateableSystems: UpdateableSystemV2[] = [];
    readonly renderableSystems: RenderableSystemV2[] = [];

    constructor(options: {
        updateableSystems: UpdateableSystemV2[];
        renderableSystems: RenderableSystemV2[];
    }) {
        this.updateableSystems = options.updateableSystems;
        this.renderableSystems = options.renderableSystems;

        this.view = new ViewV2(this.archetypes);
        this.cmd = new CommandBufferV2(this);
    }

    initialize(): void {
        this.cmd.flush();
    }

    createEntity<S extends readonly ComponentDescriptor[]>(
        archetype: ArchetypeV2<S>,
        comps: ComponentValueMap
    ): EntityId {
        let storage = this.archetypes.get(archetype.signature) as
            | StorageV2<S>
            | undefined;

        if (!storage) {
            storage = new StorageV2(archetype);
            this.archetypes.set(archetype.signature, storage);
            if (DEBUG) {
                console.log(
                    `[SceneV2.createEntity] created storage for ${ArchetypeV2.format(
                        archetype
                    )}`
                );
            }
        }

        const entityId = this.entityPool.acquire();
        const { chunkId, row, generation } = storage.allocate(comps);

        this.entityMeta.insert(entityId, {
            archetype,
            chunkId,
            row,
            generation,
        });

        return entityId;
    }

    findEntityId<S extends readonly ComponentDescriptor[]>(
        archetype: ArchetypeV2<S>,
        ChunkId: number,
        row: number
    ) {
        return this.entityMeta.find((v) => {
            return (
                v.archetype === archetype &&
                v.chunkId === ChunkId &&
                v.row === row
            );
        });
    }

    removeEntity(entityId: EntityId): boolean {
        const meta = this.entityMeta.get(entityId);
        if (!meta) {
            if (DEBUG)
                console.warn(
                    `SceneV2.removeEntity: no such entity ${entityId}`
                );
            return false;
        }

        const { archetype, chunkId, row, generation } = meta;
        const storage = this.archetypes.get(archetype.signature);
        if (!storage) {
            if (DEBUG)
                console.warn(
                    `SceneV2.removeEntity: missing storage for ${ArchetypeV2.format(
                        archetype
                    )}`
                );
            return false;
        }

        const { generation: movedGen, movedRow } = storage.delete(chunkId, row);
        this.entityMeta.remove(entityId);
        this.entityPool.release(entityId);

        if (movedRow !== undefined) {
            const found = this.entityMeta.find(
                (otherMeta, otherId) =>
                    otherMeta.archetype === archetype &&
                    otherMeta.chunkId === chunkId &&
                    otherMeta.row === movedRow
            );
            if (found) {
                const [otherId, otherMeta] = found;
                if (otherMeta.generation !== movedGen) {
                    console.warn(
                        `SceneV2.removeEntity: stale entity metadata for entity ${otherId} — expected gen ${movedGen}, found ${otherMeta.generation}`
                    );
                } else {
                    otherMeta.row = row;
                    otherMeta.generation = movedGen;
                }
            }
        }

        if (storage.isEmpty) {
            this.archetypes.delete(archetype.signature);
        }

        return true;
    }
}
