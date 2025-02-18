import { System } from "../../ecs/System";
import { Entity } from "../../ecs/Entity";
import { Vector } from "../..//tools/Vector";
import { Cmath } from "../../tools/Cmath";
import * as Components from "../components";

type CollisionData = {
  area: number;
  entity: Entity;
  normal: Vector;
  vector: Vector;
  overlap: Vector;
};

type CollisionHitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CollisionResolver = {
  type: CollisionResolverType;
  mask: number;
};

type CollisionResolverType =
  | "bounce"
  | "die"
  | "stop"
  | "sleep"
  | "none"
  | "slide";

type EntityId = string;

/** Collision system
 * @required  Transform, Collision
 * @emits entityDestroyed, systemStarted, systemUpdated,
 */
export class CollisionSystem extends System {
  private _entityCache: Map<CollisionResolverType, Set<EntityId>>;

  constructor() {
    super(["Position", "Collision"]);
    this._entityCache = new Map();
  }

  private _getSecondaryCollision(
    collisions: CollisionData[],
    dominantCollision: CollisionData
  ): CollisionData | null {
    // Filter out the dominant collision from the list
    const remainingCollisions = collisions.filter(
      (collision) => collision !== dominantCollision
    );

    // If no remaining collisions exist, return null
    if (remainingCollisions.length === 0) return null;

    // Initialize the secondary collision as the first remaining collision
    let secondaryCollision = remainingCollisions[0];

    // Iterate through the remaining collisions to find the most significant one
    for (let i = 1; i < remainingCollisions.length; i++) {
      const currentCollision = remainingCollisions[i];

      // First, compare by Y overlap
      if (currentCollision.overlap.x > secondaryCollision.overlap.x) {
        secondaryCollision = currentCollision;
      } else if (currentCollision.overlap.x === secondaryCollision.overlap.x) {
        // If Y overlaps are equal, compare by area
        if (currentCollision.area > secondaryCollision.area) {
          secondaryCollision = currentCollision;
        }
      }
    }

    // Consider additional factors for determining secondary collision in the future,
    // such as velocity, collision priorities, or material properties.

    if (
      secondaryCollision.overlap.y === dominantCollision.overlap.y ||
      secondaryCollision.overlap.x === dominantCollision.overlap.x
    )
      return null;

    return secondaryCollision;
  }

  private _getPrimaryCollision(
    collisions: CollisionData[]
  ): CollisionData | null {
    if (collisions.length === 0) return null;

    let dominantCollision = collisions[0];

    for (let i = 1; i < collisions.length; i++) {
      const currentCollision = collisions[i];

      // First, compare by Y overlap
      if (currentCollision.overlap.y > dominantCollision.overlap.y) {
        dominantCollision = currentCollision;
      } else if (currentCollision.overlap.y === dominantCollision.overlap.y) {
        // If Y overlaps are equal, compare by area
        if (currentCollision.area > dominantCollision.area) {
          dominantCollision = currentCollision;
        }
      }
    }

    return dominantCollision;
  }

  private _processResolvers(
    resolvers: CollisionResolver[],
    collisionA: Components.Collision,
    collisionB: Components.Collision,
    entityA: Entity,
    entityB: Entity,
    normal: Vector,
    vector: Vector,
    overlap: Vector
  ) {
    resolvers.forEach((resolver) => {
      if (resolver.mask & collisionB.layer) {
        if (!collisionA.data.has(resolver.type)) {
          collisionA.data.set(resolver.type, []);
        }
        collisionA.data.get(resolver.type)?.push({
          entity: entityB,
          overlap,
          vector,
          normal: normal,
          area: overlap.x * overlap.y,
        });

        // cache the entity ids for later resolution
        if (!this._entityCache.has(resolver.type)) {
          this._entityCache.set(resolver.type, new Set());
        }
        this._entityCache.get(resolver.type)?.add(entityA.id);
      }
    });
  }

  private _getCollisionVector(
    hitboundsA: CollisionHitbox,
    hitboundsB: CollisionHitbox
  ) {
    const centerA = new Vector(
      hitboundsA.x + hitboundsA.width / 2,
      hitboundsA.y + hitboundsA.height / 2
    );
    const centerB = new Vector(
      hitboundsB.x + hitboundsB.width / 2,
      hitboundsB.y + hitboundsB.height / 2
    );
    return centerA.subtract(centerB);
  }

  private _getCollisionNormal(
    hitboundsA: CollisionHitbox,
    hitboundsB: CollisionHitbox,
    overlap: { x: number; y: number }
  ): Vector {
    // Assumption: Collision normal is determined based on the axis with the smaller overlap.
    // This is a common assumption for AABB collisions but may not hold for other collision types.
    if (overlap.x < overlap.y) {
      return new Vector(hitboundsA.x < hitboundsB.x ? -1 : 1, 0);
    } else {
      return new Vector(0, hitboundsA.y < hitboundsB.y ? -1 : 1);
    }
  }

  private _getCollisionOverlap(
    hitboundsA: CollisionHitbox,
    hitboundsB: CollisionHitbox
  ): Vector {
    const overlapX = Math.max(
      0,
      Math.min(
        hitboundsA.x + hitboundsA.width,
        hitboundsB.x + hitboundsB.width
      ) - Math.max(hitboundsA.x, hitboundsB.x)
    );
    const overlapY = Math.max(
      0,
      Math.min(
        hitboundsA.y + hitboundsA.height,
        hitboundsB.y + hitboundsB.height
      ) - Math.max(hitboundsA.y, hitboundsB.y)
    );

    // Note: This logic assumes axis-aligned bounding boxes (AABBs).
    // If you need to handle rotated bounding boxes or other shapes,
    // this method will need to be extended.
    return new Vector(overlapX, overlapY);
  }

  /** handles the sleep resolution making the entity inactive and emitting an event */
  // private _handleSleepResolution(
  //   entity: Cluster.Entity,
  //   resolvers: Types.CollisionResolver[],
  //   targetLayer: number
  // ) {
  //   const sleepResolverA = resolvers.find(
  //     (resolver) => resolver.type === "sleep"
  //   );
  //   if (sleepResolverA && sleepResolverA.mask & targetLayer) {
  //     entity.active = false;
  //   }
  // }

  /* handles the die resolution, marking the entity as dead and emitting an event. */
  // private _handleDieResolution(
  //   entity: Cluster.Entity,
  //   resolvers: Types.CollisionResolver[],
  //   targetLayer: number
  // ) {
  //   const dieResolverA = resolvers.find((resolver) => resolver.type === "die");
  //   if (dieResolverA && dieResolverA.mask & targetLayer) {
  //     entity.dead = true;
  //   }
  // }

  private _testCollision(
    hitboundsA: CollisionHitbox,
    hitboundsB: CollisionHitbox
  ): boolean {
    return (
      hitboundsA.x < hitboundsB.x + hitboundsB.width &&
      hitboundsA.x + hitboundsA.width > hitboundsB.x &&
      hitboundsA.y < hitboundsB.y + hitboundsB.height &&
      hitboundsA.y + hitboundsA.height > hitboundsB.y
    );
  }

  private _getHitbounds(
    position: Vector,
    hitbox: { x: number; y: number; width: number; height: number }
  ) {
    return {
      x: position.x + hitbox.x,
      y: position.y + hitbox.y,
      width: hitbox.width,
      height: hitbox.height,
    };
  }

  private _validCollision(
    collisionA: Components.Collision,
    collisionB: Components.Collision
  ) {
    return (
      collisionA.layer & collisionB.mask ||
      (collisionB.layer & collisionA.mask &&
        collisionA.detectable &&
        collisionB.detectable)
    );
  }

  update(entities: Entity, dt: number, t: number) {
    const activeEntities = [...entities.getBatch(this.mask)].filter(
      (entity) => !entity.dead && entity.active
    );

    for (let i = 0; i < activeEntities.length; i++) {
      for (let j = i + 1; j < activeEntities.length; j++) {
        const entityA = activeEntities[i];
        const entityB = activeEntities[j];

        const collisionA =
          entityA.getComponent<Components.Collision>("Collision");
        const collisionB =
          entityB.getComponent<Components.Collision>("Collision");

        if (!collisionA || !collisionB) continue;

        if (!this._validCollision(collisionA, collisionB)) {
          continue;
        }

        const hitboxA = collisionA.hitbox;
        const hitboxB = collisionB.hitbox;

        const positionA =
          entityA.getComponent<Components.Position>("Position")?.vector;
        const positionB =
          entityB.getComponent<Components.Position>("Position")?.vector;

        if (!positionA || !positionB) continue;

        const hitboundsA = this._getHitbounds(positionA, hitboxA);
        const hitboundsB = this._getHitbounds(positionB, hitboxB);

        // if an actual collision is detected
        if (this._testCollision(hitboundsA, hitboundsB)) {
          // emit the entity-hit event?

          // no need to resolve collisions if there are no resolvers
          const resolversA = collisionA.resolvers;
          const resolversB = collisionB.resolvers;

          if (resolversA.length === 0 && resolversB.length === 0) continue;

          // at this point we start collecting data
          const overlap = this._getCollisionOverlap(hitboundsA, hitboundsB);

          if (resolversA.length) {
            const vectorA = this._getCollisionVector(hitboundsA, hitboundsB);
            const normalA = this._getCollisionNormal(
              hitboundsA,
              hitboundsB,
              overlap
            );
            this._processResolvers(
              resolversA,
              collisionA,
              collisionB,
              entityA,
              entityB,
              normalA,
              vectorA,
              overlap
            );
          }

          if (resolversB.length) {
            const vectorB = this._getCollisionVector(hitboundsB, hitboundsA);
            const normalB = this._getCollisionNormal(
              hitboundsB,
              hitboundsA,
              overlap
            );
            this._processResolvers(
              resolversB,
              collisionB,
              collisionA,
              entityB,
              entityA,
              normalB,
              vectorB,
              overlap
            );
          }
        }
      }
    }

    // resolve the collisions
    this._entityCache.forEach((entityIds, resolverType) => {
      const resolutionEntities = activeEntities.filter((entity) => {
        return entityIds.has(entity.id);
      });

      resolutionEntities.forEach((entity) => {
        const collision =
          entity.getComponent<Components.Collision>("Collision");

        const position =
          entity.getComponent<Components.Position>("Position")?.vector;

        if (!collision || !position) return;

        const data = collision.data.get(resolverType);
        if (!data || data.length === 0) return;

        // here first we separate the entities
        // then we resolve the collision for each entity
        const primaryCollision = this._getPrimaryCollision(data);
        if (!primaryCollision) return;

        let totalAdjustmentX =
          primaryCollision.normal.x * primaryCollision.overlap.x;
        let totalAdjustmentY =
          primaryCollision.normal.y * primaryCollision.overlap.y;

        // note: this is a simple resolution method that only considers the primary collision.
        // In a more complex system, you may want to consider multiple collisions
        // and resolve them in order of significance.
        const secondaryCollision = this._getSecondaryCollision(
          data,
          primaryCollision
        );
        if (secondaryCollision) {
          totalAdjustmentX +=
            secondaryCollision.normal.x * secondaryCollision.overlap.x;
          totalAdjustmentY +=
            secondaryCollision.normal.y * secondaryCollision.overlap.y;
        }

        position.x += totalAdjustmentX;
        position.y += totalAdjustmentY;

        switch (resolverType) {
          case "bounce":
            const velocity =
              entity.getComponent<Components.Velocity>("Velocity");
            if (!velocity) return;

            if (primaryCollision.normal.x !== 0) {
              velocity.vector.x *= -1;
            }
            if (primaryCollision.normal.y !== 0) {
              const vx = Cmath.clamp(
                primaryCollision.vector.normalize().x,
                -0.5,
                0.5
              );
              velocity.vector.x = vx;
              velocity.vector.y *= -1;
            }
            break;

          case "die":
            entity.dead = true;

            // emit here?

            break;

          case "sleep":
            entity.active = false;
            break;

          case "none":
            break;

          default:
            break;
        }

        collision.data.clear();
      });
    });

    this._entityCache.clear();
  }
}
