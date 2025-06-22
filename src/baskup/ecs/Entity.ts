export type Entity = number;

export class EntityPool {
    private static nextEntityId = 0;
    private static freeEntityIds: Entity[] = [];

    public static create(): Entity {
        if (this.freeEntityIds.length > 0) {
            return this.freeEntityIds.pop()!;
        }
        return this.nextEntityId++;
    }

    public static destroy(entity: Entity): void {
        this.freeEntityIds.push(entity);
    }
}
