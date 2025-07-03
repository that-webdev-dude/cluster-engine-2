import {
    ComponentDescriptor,
    ComponentValueMap,
    ComponentType,
    EntityId,
    EntityMeta,
} from "../types";
import { Chunk } from "./chunk";
import { Storage } from "./storage";
import { CommandBuffer } from "./cmd";
import { IDPool, SparseSet } from "../tools";
import { Archetype, Signature } from "./archetype";
import { UpdateableSystem, RenderableSystem } from "./system";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

export class View {
    constructor(
        private readonly archetypeMap: Map<
            Signature,
            Storage<ComponentDescriptor[]>
        >
    ) {}

    forEachChunkWith(
        comps: ComponentType[],
        cb: (
            chunk: Readonly<Chunk<ComponentDescriptor[]>>,
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

export class Scene {
    private entityMeta: SparseSet<EntityId, EntityMeta> = new SparseSet();
    private entityPool: IDPool<EntityId> = new IDPool();
    readonly components: Map<Signature, Storage<ComponentDescriptor[]>> =
        new Map();

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

        this.view = new View(this.components);
        this.cmd = new CommandBuffer(this.components, this.entityMeta, this);
    }

    initialize(): void {
        this.cmd.flush();
        // ... and other init stuff
    }

    createEntity(archetype: Archetype, comps: ComponentValueMap) {
        let storage = this.components.get(archetype.signature);
        if (storage === undefined) {
            const descriptors = archetype.types.map((c) =>
                Archetype.registry.get(c)
            ) as ComponentDescriptor[]; // archetype.types includes EntityId type so it's fine
            this.components.set(
                archetype.signature,
                new Storage<typeof descriptors>(archetype)
            );

            if (DEBUG)
                console.log(
                    `[Scene.createEntity]: created storage for ${Archetype.format(
                        archetype
                    )}`
                );

            storage = this.components.get(archetype.signature)!; // just created one
        }

        const entityId = this.entityPool.acquire();

        // 💥 this is done via cmd - DELETE THIS
        // this.cmd.allocate(entityId, comps);

        const { chunkId, row } = storage.allocate(entityId, comps);
        this.entityMeta.insert(entityId, {
            archetype: storage.archetype,
            chunkId,
            row,
        });
    }

    removeEntity(entityId: EntityId): boolean {
        const meta = this.entityMeta.get(entityId);
        if (meta === undefined) {
            if (DEBUG)
                throw new Error(
                    `Scene.removeEntity: entityId ${entityId} does not exists in the world`
                );
            return false;
        }

        const { archetype } = meta;
        const storage = this.components.get(archetype.signature);
        if (storage === undefined) {
            if (DEBUG)
                throw new Error(
                    `Scene.removeEntity: entityId ${entityId} does not exists in the world`
                );
            return false;
        }

        this.entityPool.release(entityId);

        // 💥 this is done via cmd - DELETE THIS
        // this.cmd.delete(entityId);

        storage.delete(entityId);
        this.entityMeta.remove(entityId);

        // console.log(this.entityMeta.ids);

        // remove the entire storage if there are no entities left
        if (storage.entityCount === 0) {
            this.components.delete(storage.archetype.signature);
        }

        return true;
    }
}
