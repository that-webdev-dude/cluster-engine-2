// import { EntityManager } from "./EntityManager";
// import { Entity } from "./Entity";

// export class Query {
//   private entityManager: EntityManager;

//   constructor(entityManager: EntityManager) {
//     this.entityManager = entityManager;
//   }

//   getEntities(requiredSignature: number): Entity[] {
//     const matchedEntities: Entity[] = [];

//     for (const entity of this.entityManager.getEntities()) {
//       const signature = this.entityManager.getSignature(entity);
//       if ((signature & requiredSignature) === requiredSignature) {
//         matchedEntities.push(entity);
//       }
//     }

//     return matchedEntities;
//   }
// }
