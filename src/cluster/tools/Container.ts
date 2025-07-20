export class Container<T> {
    public children: (T | Container<T>)[];

    constructor() {
        this.children = [];
    }

    get length(): number {
        return this.children.length;
    }

    get empty(): boolean {
        return this.children.length > 0 ? false : true;
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

    clear(): void {
        for (const child of this.children) {
            if (child instanceof Container) {
                child.clear();
            }
        }
        this.children.length = 0;
    }

    forEach(fn: (child: T | Container<T>) => void) {
        this.children.forEach((child) => {
            if (child instanceof Container) {
                (child as Container<T>).forEach(fn);
            } else {
                fn(child);
            }
        });
    }

    map(f = () => {}) {
        return this.children.map(f);
    }
}
