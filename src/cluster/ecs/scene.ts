import { ComponentDescriptor, ComponentValueMap, EntityMeta } from "../types";
import { Archetype, Signature } from "./archetype";
import { CommandBuffer } from "./cmd";
import { Storage } from "./storage";
import { DEBUG } from "../tools";
import { View } from "./view";
import { GUIContainer } from "../gui/GUIbuilders";
import {
    ECSUpdateSystem,
    ECSRenderSystem,
    GUIUpdateSystem,
    GUIRenderSystem,
} from "./system";

type SystemType = "update" | "render";

export class Scene {
    readonly ECSStorage: Map<Signature, Storage<any>> = new Map();
    readonly cmd: CommandBuffer;
    readonly view: View;
    readonly ECSUpdateSystems: ECSUpdateSystem[] = [];
    readonly ECSRenderSystems: ECSRenderSystem[] = [];
    readonly GUIUpdateSystems: GUIUpdateSystem[] = [];
    readonly GUIRenderSystems: GUIRenderSystem[] = [];

    public gui: GUIContainer = new GUIContainer();
    public dialog: Scene | undefined = undefined;

    constructor(options?: {
        storageUpdateSystems: ECSUpdateSystem[];
        storageRenderSystems: ECSRenderSystem[];
        guiUpdateSystems: GUIUpdateSystem[];
        guiRenderSystems: GUIRenderSystem[];
    }) {
        if (options) {
            this.ECSUpdateSystems = options.storageUpdateSystems;
            this.ECSRenderSystems = options.storageRenderSystems;
            this.GUIUpdateSystems = options.guiUpdateSystems;
            this.GUIRenderSystems = options.guiRenderSystems;
        }

        this.view = new View(this.ECSStorage);
        this.cmd = new CommandBuffer(this);
    }

    initialize(): void {
        this.cmd.flush();
    }

    destroy(): void {
        // Clear all storages
        for (const storage of this.ECSStorage.values()) {
            storage.clear(); // assume clear() releases all chunks and entities
        }
        this.ECSStorage.clear();

        // Clear GUI tree
        this.gui.clear();

        // Clear the cmd
        this.cmd.clear();

        // Dispose all systems
        for (const system of this.ECSUpdateSystems) {
            system.dispose();
        }

        // Clear all systems (optional if scene won't be reused)
        this.ECSUpdateSystems.length = 0;
        this.ECSRenderSystems.length = 0;
        this.GUIUpdateSystems.length = 0;
        this.GUIRenderSystems.length = 0;
    }

    createEntity<S extends readonly ComponentDescriptor[]>(
        archetype: Archetype<S>,
        comps: ComponentValueMap
    ): EntityMeta {
        let storage = this.ECSStorage.get(archetype.signature) as
            | Storage<S>
            | undefined;

        if (!storage) {
            storage = new Storage(archetype);
            this.ECSStorage.set(archetype.signature, storage);
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
        const storage = this.ECSStorage.get(archetype.signature);
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

        return deletedMeta !== undefined;
    }

    updateEntity(meta: EntityMeta, comps: ComponentValueMap) {
        const { archetype, chunkId, row, generation } = meta;
        const storage = this.ECSStorage.get(archetype.signature);
        if (!storage) {
            if (DEBUG)
                console.warn(
                    `Scene.updateEntity: missing storage for ${Archetype.format(
                        archetype
                    )}`
                );
            return false;
        }

        const updatedMeta = storage.assign(chunkId, row, generation, comps);

        return updatedMeta !== undefined;
    }

    useECSSystem(type: SystemType, system: ECSUpdateSystem | ECSRenderSystem) {
        if (type === "update" && system instanceof ECSUpdateSystem) {
            this.ECSUpdateSystems.push(system);
        } else if (system instanceof ECSRenderSystem) {
            this.ECSRenderSystems.push(system);
        }
    }

    useGUISystem(type: SystemType, system: GUIUpdateSystem | GUIRenderSystem) {
        if (type === "update" && system instanceof GUIUpdateSystem) {
            this.GUIUpdateSystems.push(system);
        } else if (system instanceof GUIRenderSystem) {
            this.GUIRenderSystems.push(system);
        }
    }
}
