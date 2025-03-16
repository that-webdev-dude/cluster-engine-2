import { System } from "../../ecs/System";
import { Vector } from "../..//tools/Vector";
import { Cmath } from "../../tools/Cmath";
import { Storage } from "../../ecs/Storage";
import * as Components from "../components";
import {
  CollisionData,
  CollisionHitbox,
  CollisionResolver,
  CollisionResolverType,
  EntityID,
} from "../types";

/** Collision system
 * @required  Transform, Collision
 * @emits entityDestroyed, systemStarted, systemUpdated,
 */
export class CollisionSystem extends System {
  private _entityCache: Map<CollisionResolverType, Set<EntityID>>;

  constructor() {
    super([]);
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
    entityA: EntityID,
    entityB: EntityID,
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
          done: resolver.done || (() => {}),
        });

        // cache the entity ids for later resolution
        if (!this._entityCache.has(resolver.type)) {
          this._entityCache.set(resolver.type, new Set());
        }
        this._entityCache.get(resolver.type)?.add(entityA);
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

  private _testAABBCollision(
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

  private _testCircleCollision(
    positionA: Vector,
    radiusA: number,
    positionB: Vector,
    radiusB: number
  ): boolean {
    Cmath.distance(positionA, positionB);
    return Cmath.distance(positionA, positionB) < radiusA + radiusB;
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
      (collisionA.layer & collisionB.mask) !== 0 ||
      ((collisionB.layer & collisionA.mask) !== 0 &&
        collisionA.detectable &&
        collisionB.detectable)
    );
  }

  update(layer: Storage, dt: number, t: number) {
    const activeEntities = layer.getEntityBatch(["Collision", "Position"]);

    if (activeEntities.length < 2) return;

    for (let i = 0; i < activeEntities.length; i++) {
      for (let j = i + 1; j < activeEntities.length; j++) {
        const entityA = activeEntities[i];
        const entityB = activeEntities[j];

        if (!layer.hasEntity(entityA) || !layer.hasEntity(entityB)) continue;

        const collisionA = layer.getEntityComponent<Components.Collision>(
          entityA,
          "Collision"
        )!;

        const collisionB = layer.getEntityComponent<Components.Collision>(
          entityB,
          "Collision"
        )!;

        if (!this._validCollision(collisionA, collisionB)) {
          continue;
        }

        const positionA = layer.getEntityComponent<Components.Position>(
          entityA,
          "Position"
        )!.vector;

        const positionB = layer.getEntityComponent<Components.Position>(
          entityB,
          "Position"
        )!.vector;

        // if an hitbox is provided we test for AABB collision
        if (collisionA.hitbox && collisionB.hitbox) {
          console.log("is an AABB collision");
          const hitboxA = collisionA.hitbox;
          const hitboxB = collisionB.hitbox;

          const hitboundsA = this._getHitbounds(positionA, hitboxA);
          const hitboundsB = this._getHitbounds(positionB, hitboxB);

          // if an actual collision is detected
          if (this._testAABBCollision(hitboundsA, hitboundsB)) {
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
          // if no hitbox is provided we test for circle collision if the collision.radius is provided
        } else if (collisionA.radius && collisionB.radius) {
          const radiusA = Math.abs(collisionA.radius);
          const radiusB = Math.abs(collisionB.radius);

          // test for circle collision
          if (
            this._testCircleCollision(positionA, radiusA, positionB, radiusB)
          ) {
            // emit the entity-hit event?

            // no need to resolve collisions if there are no resolvers
            const resolversA = collisionA.resolvers;
            const resolversB = collisionB.resolvers;

            if (resolversA.length === 0 && resolversB.length === 0) continue;

            const penetration =
              radiusA + radiusB - Cmath.distance(positionA, positionB);

            if (resolversA.length) {
              const vectorA = Vector.connect(positionA, positionB);
              const normalA = Vector.reverse(vectorA).normalize();
              const overlap = Vector.scale(normalA, penetration);
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
              const vectorB = Vector.connect(positionB, positionA);
              const normalB = Vector.reverse(vectorB).normalize();
              const overlap = Vector.scale(normalB, penetration);
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
          // if either a hitbox or a radius is provided we throw an error
        } else {
          throw new Error(
            "CollisionSystem: invalid collision configuration, either a hitbox or a radius must be provided"
          );
        }
      }

      // resolve the collisions
      this._entityCache.forEach((entityIds, resolverType) => {
        const resolutionEntities = activeEntities.filter((entity) => {
          return entityIds.has(entity);
        });

        resolutionEntities.forEach((entity) => {
          // if (!layer.hasEntity(entity)) return;

          const collision = layer.getEntityComponent<Components.Collision>(
            entity,
            "Collision"
          )!;

          const position = layer.getEntityComponent<Components.Position>(
            entity,
            "Position"
          )!.vector;

          const velocity = layer.getEntityComponent<Components.Velocity>(
            entity,
            "Velocity"
          )?.vector;

          // if (!collision || !position) return;

          const data = collision.data.get(resolverType);
          if (!data || data.length === 0) return;

          // resolve the AABB collision
          if (collision.hitbox) {
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
                if (!velocity) return;

                if (primaryCollision.normal.x !== 0) {
                  velocity.x *= -1;
                }
                if (primaryCollision.normal.y !== 0) {
                  const vx = Cmath.clamp(
                    primaryCollision.vector.normalize().x,
                    -0.5,
                    0.5
                  );
                  velocity.x = vx;
                  velocity.y *= -1;
                }
                break;

              case "die":
                layer.destroyEntity(entity);
                // emit here?
                break;

              case "sleep":
                // entity.active = false;
                // emit here?
                break;

              case "none":
                break;

              case "slide":
                if (!velocity) return;

                if (primaryCollision.normal.x !== 0) {
                  velocity.x = 0;
                }
                if (primaryCollision.normal.y !== 0) {
                  velocity.y = 0;
                }
                break;

              default:
                break;
            }
          } else if (collision.radius) {
            // in the case of a circle collision the primary collision is the only one that matters
            // the primary collision is the one with the largest overlap
            const primaryCollision = data.sort(
              (a, b) => b.overlap.magnitude - a.overlap.magnitude
            )[0];

            if (!primaryCollision) return;

            // const penetration = primaryCollision.overlap.magnitude;

            position.x += primaryCollision.overlap.x;
            position.y += primaryCollision.overlap.y;

            switch (resolverType) {
              case "bounce":
                if (!velocity) return;

                const normal = primaryCollision.normal;
                const dot = Vector.dot(velocity, normal);
                velocity.x -= 2 * dot * normal.x;
                velocity.y -= 2 * dot * normal.y;
                break;

              case "die":
                layer.destroyEntity(entity);
                primaryCollision.done();

                break;

              case "sleep":
                // entity.active = false;
                // emit here?
                break;

              case "none":
                break;

              case "slide":
                if (!velocity) return;

                const normalSlide = primaryCollision.normal;
                const dotSlide = Vector.dot(velocity, normalSlide);
                velocity.x -= dotSlide * normalSlide.x;
                velocity.y -= dotSlide * normalSlide.y;
                break;

              default:
                break;
            }
          }

          collision.data.clear();
        });
      });

      this._entityCache.clear();
    }
  }
}
