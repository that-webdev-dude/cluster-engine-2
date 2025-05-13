import { Entity, EntityPool } from "./Entity";
import { Storage } from "./Storage";
import { Schema } from "./Schema";
import { ComponentRegistry, ComponentInstance } from "./Component";

// WORLD
/**
 * The central registry and manager for all entities and their components.
 */
export class World {
    private storages = new Map<string, Storage<any>>();

    /**
     * Create a new entity ID (reusing freed IDs if available).
     */
    createEntity(): Entity {
        return EntityPool.create();
    }

    /**
     * Destroy an entity, removing it from all component storages and
     * recycling its ID.
     */
    destroyEntity(id: Entity): void {
        for (const storage of this.storages.values()) {
            storage.remove(id);
        }
        EntityPool.destroy(id);
    }

    /**
     * Add a component instance to an entity.
     * @param name Component name (must have been registered)
     * @param entity The entity ID to attach to
     * @param component The component data (object matching the schema)
     * @throws Error if the component storage is not registered
     * @throws Error if the component instance does not match the schema
     */
    addEntityComponent<S extends Schema>(
        entity: Entity,
        component: ComponentInstance<S>
    ): void {
        if (!this.storages.has(component.name)) {
            // register the component if it doesn't exist
            const factory = ComponentRegistry.components.get(component.name);
            if (!factory) {
                throw new Error(
                    `Component "${component.name}" not registered in the registry`
                );
            }
            this.storages.set(component.name, factory.createStorage(256));
        }
        this.getComponentStorage<S>(component.name).add(entity, component);
    }

    /**
     * Remove a component from an entity.
     * @param entity The entity ID to remove from
     * @param componentName The name of the component to remove
     * @throws Error if the component storage is not registered
     */
    removeEntityComponent<S extends Schema>(
        entity: Entity,
        componentName: string
    ): void {
        const storage = this.getComponentStorage<S>(componentName);
        if (!storage) {
            throw new Error(
                `No storage registered for component "${componentName}"`
            );
        }
        storage.remove(entity);
    }

    /**
     * Retrieve the storage instance for a given component name.
     */
    getComponentStorage<S extends Schema>(name: string): Storage<S> {
        const storage = this.storages.get(name);
        if (!storage) {
            throw new Error(`No storage registered for component "${name}"`);
        }
        return storage as Storage<S>;
    }
}
