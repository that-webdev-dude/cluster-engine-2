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

    static debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
        let timeoutId: ReturnType<typeof setTimeout>;
        return function (
            this: ThisParameterType<T>,
            ...args: Parameters<T>
        ): void {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    }
}
