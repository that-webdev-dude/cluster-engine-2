export class Container<T> {
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
}
