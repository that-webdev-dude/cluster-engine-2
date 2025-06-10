import {
    Signature,
    ComponentDescriptor,
    ComponentValueMap,
    ComponentType,
    EntityId,
} from "../types";
import { Storage } from "./storage";
import { Archetype } from "./archetype";
import { Chunk } from "./chunk";
import { CommandBuffer } from "./cmd";
import { EntityMetaSet, EntityPool } from "./entity";
import { UpdateableSystem, RenderableSystem } from "./system";

/**
 * Indicates whether debug mode is enabled based on the CLUSTER_ENGINE_DEBUG environment variable.
 */
const DEBUG: boolean = process.env.CLUSTER_ENGINE_DEBUG === "true";

export class WorldView {
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

export class World {
    private updateableSystems: UpdateableSystem[] = [];
    private renderableSystems: RenderableSystem[] = [];
    private entities: EntityMetaSet = new EntityMetaSet();
    private archetypes: Map<Signature, Storage<ComponentDescriptor[]>> =
        new Map();

    readonly cmd: CommandBuffer;
    readonly worldView: WorldView;

    constructor(options: {
        updateableSystems: UpdateableSystem[];
        renderableSystems: RenderableSystem[];
    }) {
        this.updateableSystems = options.updateableSystems;
        this.renderableSystems = options.renderableSystems;

        this.worldView = new WorldView(this.archetypes);
        this.cmd = new CommandBuffer(this.archetypes, this.entities);
    }

    initialize(): void {
        this.cmd.flush();
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
                new Storage<typeof descriptors>(archetype)
            );
            storage = this.archetypes.get(archetype.signature)!; // just created one
        }

        const entityId = EntityPool.acquire();

        // this is done via cmd
        this.cmd.allocate(entityId, comps);
    }

    removeEntity(entityId: EntityId): boolean {
        const meta = this.entities.get(entityId);
        if (meta === undefined) {
            if (DEBUG)
                throw new Error(
                    `World.removeEntity: entityId ${entityId} does not exists in the world`
                );
            return false;
        }

        const { archetype } = meta;
        const storage = this.archetypes.get(archetype.signature);
        if (storage === undefined) {
            if (DEBUG)
                throw new Error(
                    `World.removeEntity: entityId ${entityId} does not exists in the world`
                );
            return false;
        }

        EntityPool.release(entityId);

        // this is done via cmd
        this.cmd.delete(entityId);

        return true;
    }

    // ⚠️ these methods should be part of a Game class owning the world instance
    update(dt: number) {
        this.updateableSystems.forEach((system) =>
            system.update(this.worldView, this.cmd, dt)
        );
        this.cmd.flush();
    }

    render(alpha: number) {
        this.renderableSystems.forEach((system) =>
            system.render(this.worldView, alpha)
        );
    }

    done() {
        // console.log("events and flush");
    }
}
