import {
    ComponentDescriptor,
    ComponentValueMap,
    ComponentType,
    EntityMeta,
} from "../types";
import {
    StorageUpdateSystem,
    StorageRenderSystem,
    GUIUpdateSystem,
    GUIRenderSystem,
} from "./system";
import { Archetype, Signature } from "./archetype";
import { Storage } from "./storage";
import { Chunk } from "./chunk";
import { CommandBuffer } from "./cmd";
import { DEBUG } from "../tools";
import { GUIContainer } from "../gui/GUIbuilders";

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
    readonly archetypes: Map<Signature, Storage<any>> = new Map();
    readonly cmd: CommandBuffer;
    readonly view: View;
    readonly storageUpdateSystems: StorageUpdateSystem[] = [];
    readonly storageRenderSystems: StorageRenderSystem[] = [];
    readonly guiUpdateSystems: GUIUpdateSystem[] = [];
    readonly guiRenderSystems: GUIRenderSystem[] = [];

    public gui: GUIContainer = new GUIContainer();
    public dialog: Scene | undefined = undefined;

    constructor(options: {
        storageUpdateSystems: StorageUpdateSystem[];
        storageRenderSystems: StorageRenderSystem[];
        guiUpdateSystems: GUIUpdateSystem[];
        guiRenderSystems: GUIRenderSystem[];
    }) {
        this.storageUpdateSystems = options.storageUpdateSystems;
        this.storageRenderSystems = options.storageRenderSystems;
        this.guiUpdateSystems = options.guiUpdateSystems;
        this.guiRenderSystems = options.guiRenderSystems;

        this.view = new View(this.archetypes);
        this.cmd = new CommandBuffer(this);
    }

    initialize(): void {
        this.cmd.flush();
    }

    destroy(): void {
        // Clear all storages
        for (const storage of this.archetypes.values()) {
            storage.clear(); // assume clear() releases all chunks and entities
        }
        this.archetypes.clear();

        // Clear GUI tree
        this.gui.clear();

        // Clear the cmd
        this.cmd.clear();

        // Clear all systems (optional if scene won't be reused)
        this.storageUpdateSystems.length = 0;
        this.storageRenderSystems.length = 0;
        this.guiUpdateSystems.length = 0;
        this.guiRenderSystems.length = 0;
    }

    createEntity<S extends readonly ComponentDescriptor[]>(
        archetype: Archetype<S>,
        comps: ComponentValueMap
    ): EntityMeta {
        let storage = this.archetypes.get(archetype.signature) as
            | Storage<S>
            | undefined;

        if (!storage) {
            storage = new Storage(archetype);
            this.archetypes.set(archetype.signature, storage);
        }

        const { chunkId, row, generation } = storage.allocate(comps);

        return {
            generation,
            archetype,
            chunkId,
            row,
        };
    }

    removeEntity(meta: EntityMeta): boolean {
        const { archetype, chunkId, row, generation } = meta;
        const storage = this.archetypes.get(archetype.signature);
        if (!storage) {
            if (DEBUG)
                console.warn(
                    `Scene.removeEntity: missing storage for ${Archetype.format(
                        archetype
                    )}`
                );
            return false;
        }

        const deletedMeta = storage.delete(chunkId, row, generation);

        return deletedMeta === undefined ? false : true;
    }
}
