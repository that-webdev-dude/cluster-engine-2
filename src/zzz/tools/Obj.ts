export class Obj {
    static deepFreze(obj: any) {
        Object.freeze(obj);
        Object.getOwnPropertyNames(obj).forEach((prop) => {
            const value = obj[prop];
            if (
                value !== null &&
                (typeof value === "object" || typeof value === "function") &&
                !Object.isFrozen(value)
            ) {
                Obj.deepFreze(value);
            }
        });
        return obj;
    }
}
