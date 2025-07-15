import {
    ComponentDescriptor,
    ComponentValueMap,
    ComponentType,
    EntityMeta,
    EntityId,
} from "../types";
import { UpdateableSystem, RenderableSystem } from "./system";
import { Archetype, Signature } from "./archetype";
import { Storage } from "./storage";
import { Chunk } from "./chunk";
import { CommandBuffer } from "./cmd";
import { SparseSet, IDPool, DEBUG } from "../tools";

export class View {
    constructor(private readonly archetypeMap: Map<Signature, Storage<any>>) {}

    forEachChunkWith(
        comps: ComponentType[],
        cb: (chunk: Readonly<Chunk<any>>, chunkId: number) => void
    ) {
        const sig = Archetype.makeSignature(...comps);
        for (const [archSig, storage] of this.archetypeMap) {
            if ((archSig & sig) === sig) {
                storage.forEachChunk(cb);
            }
        }
    }
}

export class Scene {
    private entityMeta: SparseSet<EntityId, EntityMeta> = new SparseSet();
    private entityPool: IDPool<EntityId> = new IDPool();

    readonly archetypes: Map<Signature, Storage<any>> = new Map();
    readonly cmd: CommandBuffer;
    readonly view: View;
    readonly updateableSystems: UpdateableSystem[] = [];
    readonly renderableSystems: RenderableSystem[] = [];

    constructor(options: {
        updateableSystems: UpdateableSystem[];
        renderableSystems: RenderableSystem[];
    }) {
        this.updateableSystems = options.updateableSystems;
        this.renderableSystems = options.renderableSystems;

        this.view = new View(this.archetypes);
        this.cmd = new CommandBuffer(this);
    }

    initialize(): void {
        this.cmd.flush();
    }

    createEntity<S extends readonly ComponentDescriptor[]>(
        archetype: Archetype<S>,
        comps: ComponentValueMap
    ): EntityId {
        let storage = this.archetypes.get(archetype.signature) as
            | Storage<S>
            | undefined;

        if (!storage) {
            storage = new Storage(archetype);
            this.archetypes.set(archetype.signature, storage);
            // if (DEBUG) {
            //     console.log(
            //         `[SceneV2.createEntity] created storage for ${Archetype.format(
            //             archetype
            //         )}`
            //     );
            // }
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
        archetype: Archetype<S>,
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
                    `SceneV2.removeEntity: missing storage for ${Archetype.format(
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
