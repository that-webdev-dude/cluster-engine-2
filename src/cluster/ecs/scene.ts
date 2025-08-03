import {
    ComponentDescriptor,
    ComponentValueMap,
    ComponentType,
    EntityMeta,
    Buffer,
} from "../types";
import {
    ECSUpdateSystem,
    ECSRenderSystem,
    GUIUpdateSystem,
    GUIRenderSystem,
} from "./system";
import { Archetype, Signature } from "./archetype";
import { Storage } from "./storage";
import { Chunk } from "./chunk";
import { CommandBuffer } from "./cmd";
import { DEBUG } from "../tools";
import { GUIContainer } from "../gui/GUIbuilders";

type SystemType = "update" | "render";

export class View {
    constructor(private readonly archetypeMap: Map<Signature, Storage<any>>) {}

    getEntityComponent<T extends Buffer>(
        meta: EntityMeta,
        descriptor: ComponentDescriptor
    ): T | undefined {
        const { archetype, chunkId, row, generation } = meta;

        const storage = this.archetypeMap.get(archetype.signature);
        if (!storage) {
            if (DEBUG) {
                console.warn(
                    `View.getEntityComponent: No storage found for archetype signature ${Archetype.format(
                        archetype
                    )}`
                );
            }
            return undefined;
        }

        const chunk = storage.getChunk(chunkId);
        if (!chunk) {
            if (DEBUG) {
                console.warn(
                    `View.getEntityComponent: No chunk found for chunkId ${chunkId} in archetype ${Archetype.format(
                        archetype
                    )}`
                );
            }
            return undefined;
        }

        if (generation !== chunk.getGeneration(row)) {
            if (DEBUG) {
                console.warn(
                    `View.getEntityComponent: Generation mismatch for entity at row ${row} in chunk ${chunkId}`
                );
            }
            return undefined;
        }

        const view = chunk.getView<T>(descriptor);
        if (!view) {
            if (DEBUG) {
                console.warn(
                    `View.getEntityComponent: No view found for descriptor ${descriptor.name} in chunk ${chunkId}`
                );
            }
            return undefined;
        }

        return view.subarray(row, row + descriptor.count) as T;
    }

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
    readonly storageUpdateSystems: ECSUpdateSystem[] = [];
    readonly storageRenderSystems: ECSRenderSystem[] = [];
    readonly guiUpdateSystems: GUIUpdateSystem[] = [];
    readonly guiRenderSystems: GUIRenderSystem[] = [];

    public gui: GUIContainer = new GUIContainer();
    public dialog: Scene | undefined = undefined;

    constructor(options?: {
        storageUpdateSystems: ECSUpdateSystem[];
        storageRenderSystems: ECSRenderSystem[];
        guiUpdateSystems: GUIUpdateSystem[];
        guiRenderSystems: GUIRenderSystem[];
    }) {
        if (options) {
            this.storageUpdateSystems = options.storageUpdateSystems;
            this.storageRenderSystems = options.storageRenderSystems;
            this.guiUpdateSystems = options.guiUpdateSystems;
            this.guiRenderSystems = options.guiRenderSystems;
        }

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

    useECSSystem(type: SystemType, system: ECSUpdateSystem | ECSRenderSystem) {
        if (type === "update" && system instanceof ECSUpdateSystem) {
            this.storageUpdateSystems.push(system);
        } else {
            if (system instanceof ECSRenderSystem) {
                this.storageRenderSystems.push(system);
            }
        }
    }

    useGUISystem(type: SystemType, system: GUIUpdateSystem | GUIRenderSystem) {
        if (type === "update" && system instanceof GUIUpdateSystem) {
            this.guiUpdateSystems.push(system);
        } else {
            if (system instanceof GUIRenderSystem) {
                this.guiRenderSystems.push(system);
            }
        }
    }
}
