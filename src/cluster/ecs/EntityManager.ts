import { Entity, INVALID_ENTITY } from "./Entity";
import { MAX_COMPONENTS } from "./Component";
import { Graph } from "../tools/Graph";

// --- Archetype structure stores the bitmask and a set of entity IDs --- //
interface Archetype {
  mask: number;
  entities: Set<number>;
}

export class EntityManager {
  private nextEntityId: Entity = 0; // Next available entity ID.

  private recycledEntities: Entity[] = []; // Stack of recycled entity IDs.

  private invalidCache: boolean = false; // Flag to indicate if the cache is invalidated.

  private archetypes: Map<number, Archetype> = new Map(); // Map from archetype bitmask to Archetype data.

  private entityArchetypes: Map<number, number> = new Map(); // Mapping from entity ID to its current archetype's bitmask.

  private archetypeGraph: Graph<number, number> = new Graph(); // The archetype graph: vertices are bitmasks, edges indicate one component difference.

  private archetypeCache: Map<number, number[]> = new Map(); // cache to store frequent queries

  /**
   * For a newly created archetype (bitmask), update the graph by checking all possible one-component differences.
   */
  private updateArchetypeGraph(newMask: number): void {
    for (let c = 0; c < MAX_COMPONENTS; c++) {
      const bit = 1 << c;
      // --- Addition edge: if newMask does NOT have the component, check if adding it yields an existing archetype.
      if ((newMask & bit) === 0) {
        const neighborMask = newMask | bit;
        if (this.archetypes.has(neighborMask)) {
          // Add an edge from newMask to neighborMask labeled with component c.
          this.archetypeGraph.addEdge(newMask, neighborMask, c);
          // Also add the reverse (removal) edge.
          this.archetypeGraph.addEdge(neighborMask, newMask, c);
        }
      } else {
        // --- Removal edge: if newMask HAS the component, check if removing it yields an existing archetype.
        const neighborMask = newMask & ~bit;
        if (this.archetypes.has(neighborMask)) {
          this.archetypeGraph.addEdge(newMask, neighborMask, c);
          this.archetypeGraph.addEdge(neighborMask, newMask, c);
        }
      }
    }
  }

  create(): Entity {
    // invalidate the cache on entity creation.
    this.invalidCache = true;

    // Check if there are recycled entities available.
    const entityId = this.recycledEntities.pop() ?? this.nextEntityId++;

    let mask = 0; // Default mask for a new entity.
    // Convert newMask to unsigned.
    mask = mask >>> 0;
    let archetype = this.archetypes.get(mask);
    if (!archetype) {
      archetype = { mask, entities: new Set<number>() };
      this.archetypes.set(mask, archetype);
      // Register the new archetype as a vertex in the graph.
      this.archetypeGraph.addVertex(mask);
      // Connect it to any already existing neighboring archetypes.
      this.updateArchetypeGraph(mask);
    }
    archetype.entities.add(entityId);

    this.entityArchetypes.set(entityId, mask);

    return entityId;
  }

  destroy(entityId: Entity): void {
    // Invalidate the cache for this entity.
    this.invalidCache = true;

    // Retrieve the entity's current archetype mask.
    const mask = this.entityArchetypes.get(entityId);

    // If the entity exists in the system:
    if (mask !== undefined) {
      // Get the archetype associated with the mask.
      const archetype = this.archetypes.get(mask);

      // Remove the entity from the archetype.
      archetype?.entities.delete(entityId);

      // If the archetype becomes empty, remove it from the ECS and the graph.
      if (archetype && archetype.entities.size === 0) {
        this.archetypes.delete(mask);
        this.archetypeGraph.removeVertex(mask);
      }

      // Finally, remove the entity from the mapping.
      this.entityArchetypes.delete(entityId);
    }

    this.recycledEntities.push(entityId);
  }

  update(entityId: number, newMask: number): void {
    // Invalidate the cache for this entity.
    this.invalidCache = true;

    // Check if the entity exists in the system.
    const oldMask = this.entityArchetypes.get(entityId);

    // Remove the entity from its old archetype if it exists.
    if (oldMask !== undefined) {
      const oldArchetype = this.archetypes.get(oldMask);
      oldArchetype?.entities.delete(entityId);
      // Optionally, remove empty archetypes and update the graph.
      if (oldArchetype && oldArchetype.entities.size === 0) {
        this.archetypes.delete(oldMask);
        this.archetypeGraph.removeVertex(oldMask);
      }
    }

    // Get or create the new archetype for the new mask.
    let archetype = this.archetypes.get(newMask);
    if (!archetype) {
      archetype = { mask: newMask, entities: new Set<number>() };
      this.archetypes.set(newMask, archetype);
      this.archetypeGraph.addVertex(newMask);
      this.updateArchetypeGraph(newMask);
    }

    // Add the entity to the new archetype and update its mask mapping.
    archetype.entities.add(entityId);
    this.entityArchetypes.set(entityId, newMask);
  }

  query(queryMask: number): number[] {
    // Check if the query mask is cached.
    if (this.archetypeCache.has(queryMask)) {
      return this.archetypeCache.get(queryMask)!;
    }

    // If not cached, perform the query and store the result in the cache.
    const result = new Set<number>();

    // If an archetype exactly matching the query exists, use graph search.
    if (this.archetypes.has(queryMask)) {
      const visited = new Set<number>();
      const stack: number[] = [queryMask];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        visited.add(current);
        // By construction, starting from queryMask and only following addition edges,
        // each visited archetype is guaranteed to be a superset of the query.
        const archetype = this.archetypes.get(current);
        if (archetype) {
          archetype.entities.forEach((e) => result.add(e));
        }
        // Traverse neighbors: only follow edges that represent adding a component.
        const neighbors = this.archetypeGraph.getNeighbors(current);
        for (const { target, label } of neighbors) {
          // Only follow if this edge represents an addition.
          if ((current & (1 << label)) === 0 && (target & (1 << label)) !== 0) {
            // Sanity check: the target must be a superset of the query.
            if ((target & queryMask) === queryMask) {
              stack.push(target);
            }
          }
        }
      }

      // Cache the result for future queries.
      this.archetypeCache.set(queryMask, Array.from(result));
      // Return the result as an array.
      return Array.from(result);
    } else {
      // Fall back: if no archetype exactly matches the query mask, scan all archetypes.
      console.warn(
        `No exact archetype found for mask ${queryMask}. Falling back to full scan.`
      );
      for (const [mask, archetype] of this.archetypes) {
        if ((mask & queryMask) === queryMask) {
          archetype.entities.forEach((e) => result.add(e));
        }
      }
      // Cache the result for future queries.
      this.archetypeCache.set(queryMask, Array.from(result));
      // Return the result as an array.
      return Array.from(result);
    }
  }

  getMask(entityId: Entity): number {
    return this.entityArchetypes.get(entityId) ?? 0;
  }

  lazyCleanup(): void {
    this.archetypeGraph.cleanupRemovedVertices();
    // If the cache is invalidated, clear it.
    if (this.invalidCache) {
      this.archetypeCache.clear();
      this.invalidCache = false;
    }
  }
}
