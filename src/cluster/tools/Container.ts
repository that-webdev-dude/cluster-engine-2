interface Updateable {
    update?(dt: number, t: number): void;
}

export class Container<T extends Updateable> implements Updateable {
    public children: (T | Container<T>)[];
    public position: { x: number; y: number };
    constructor(position?: { x: number; y: number }) {
        this.position = position || {
            x: 0,
            y: 0,
        };
        this.children = [];
    }

    get length(): number {
        return this.children.length;
    }

    /** methods */
    map(f = () => {}) {
        return this.children.map(f);
    }

    add(child: T | Container<T>) {
        this.children.push(child);
        return child;
    }

    remove(child: T | Container<T>) {
        this.children = this.children.filter(
            (currentChild) => currentChild !== child
        );
        return child;
    }

    forEach(fn: (child: T | Container<T>) => void) {
        this.children.forEach((child) => {
            fn(child);
            if (child instanceof Container) {
                (child as Container<T>).forEach(fn);
            }
        });
    }

    update(dt: number, t: number) {
        this.children = this.children.filter((child) => {
            if (child instanceof Container) {
                child.update(dt, t);
                return true;
            } else if (typeof (child as T).update === "function") {
                if (child !== undefined && child.update !== undefined) {
                    child.update(dt, t);
                    return !(child as any).dead;
                }
            }
            return true;
        });
    }
}
