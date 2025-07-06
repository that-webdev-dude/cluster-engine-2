import {
    ComponentDescriptor,
    ComponentValueMap,
    ComponentType,
    EntityId,
    // EntityMeta,
} from "../types";
import { ChunkV2 } from "./chunk";
import { StorageV2 } from "./storage";
import { CommandBuffer } from "./cmd";
import { IDPool, SparseSet } from "../tools";
import { Archetype, Signature } from "./archetype";
import { UpdateableSystem, RenderableSystem } from "./system";

// this should go in types
export type EntityMeta = {
    archetype: Archetype;
    chunkId: number;
    row: number;
    generation: number;
};

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

export class ViewV2 {
    constructor(
        private readonly archetypeMap: Map<
            Signature,
            StorageV2<ComponentDescriptor[]>
        >
    ) {}

    forEachChunkWith(
        comps: ComponentType[],
        cb: (
            chunk: Readonly<ChunkV2<ComponentDescriptor[]>>,
            chunkId: number
        ) => void
    ) {
        const componentSignature = Archetype.makeSignature(...comps);
        for (let [archetypeSignature, storage] of this.archetypeMap) {
            if (
                (archetypeSignature & componentSignature) ===
                componentSignature
            ) {
                storage.forEachChunk(cb);
            }
        }
    }
}

export class SceneV2 {
    private entityMeta: SparseSet<EntityId, EntityMeta> = new SparseSet();
    private entityPool: IDPool<EntityId> = new IDPool();
    readonly archetypes: Map<Signature, StorageV2<ComponentDescriptor[]>> =
        new Map();

    // readonly cmd: CommandBuffer;
    readonly view: ViewV2;
    readonly updateableSystems: UpdateableSystem[] = [];
    readonly renderableSystems: RenderableSystem[] = [];

    constructor(options: {
        updateableSystems: UpdateableSystem[];
        renderableSystems: RenderableSystem[];
    }) {
        this.updateableSystems = options.updateableSystems;
        this.renderableSystems = options.renderableSystems;

        this.view = new ViewV2(this.archetypes);
        // this.cmd = new CommandBuffer(this.archetypes, this.entityMeta, this);
    }

    initialize(): void {
        // this.cmd.flush();
        // ... and other init stuff
    }

    createEntity(archetype: Archetype, comps: ComponentValueMap) {
        let storage = this.archetypes.get(archetype.signature);
        if (storage === undefined) {
            const descriptors = archetype.types.map((c) =>
                Archetype.registry.get(c)
            ) as ComponentDescriptor[]; // archetype.types includes EntityId type so it's fine
            this.archetypes.set(
                archetype.signature,
                new StorageV2<typeof descriptors>(archetype)
            );

            if (DEBUG)
                console.log(
                    `[Scene.createEntity]: created storage for ${Archetype.format(
                        archetype
                    )}`
                );

            storage = this.archetypes.get(archetype.signature)!; // just created one
        }

        const entityId = this.entityPool.acquire();

        // 💥 this is done via cmd - DELETE THIS
        // this.cmd.allocate(entityId, comps);

        const { chunkId, row, generation } = storage.allocate(comps);
        this.entityMeta.insert(entityId, {
            archetype: storage.archetype,
            chunkId,
            row,
            generation,
        });
    }

    removeEntity(entityId: EntityId): boolean {
        const meta = this.entityMeta.get(entityId);
        if (!meta) {
            if (DEBUG)
                throw new Error(
                    `Scene.removeEntity: no such entity ${entityId}`
                );
            return false;
        }

        const { archetype, chunkId, row, generation } = meta;
        const storage = this.archetypes.get(archetype.signature);
        if (!storage) {
            if (DEBUG)
                throw new Error(
                    `Scene.removeEntity: missing storage for ${Archetype.format(
                        archetype
                    )}`
                );
            return false;
        }

        // 1) Delete from the chunk, get back the movedRow and its generation
        const { generation: movedGen, movedRow } = storage.delete(chunkId, row);

        // 2) Remove *this* entity’s metadata & free its ID
        this.entityMeta.remove(entityId);
        this.entityPool.release(entityId);

        // 3) If something got swapped into `row`, update its meta
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
                    // if (DEBUG) {
                    console.warn(
                        `Scene.removeEntity: stale entity metadata for entity ${otherId} — expected gen ${movedGen}, found ${otherMeta.generation}`
                    );
                    // }
                } else {
                    otherMeta.row = row;
                    otherMeta.generation = movedGen;
                }
            }
        }

        // 4) If that storage is now empty, drop it
        if (storage.isEmpty) {
            this.archetypes.delete(archetype.signature);
        }

        return true;
    }
}
