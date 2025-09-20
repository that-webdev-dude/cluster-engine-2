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

// Mutator sketch
// // utils/MutatorFactory.ts
// import type { ComponentDescriptor } from "../../cluster/types";
// type FieldAccess<D extends ComponentDescriptor> = {
//     /** Read: f(i) -> number;  Write: f(i, value) -> void */
//     [K in D["fields"][number]]: (i: number, value?: number) => number | void;
// };
// export type Mutator<D extends ComponentDescriptor> = FieldAccess<D> & {
//     /** Bind the underlying typed array view for this chunk */
//     bind(view: InstanceType<D["buffer"]>): Mutator<D>;
//     /** Returns the bound view (for advanced ops) */
//     view(): InstanceType<D["buffer"]> | null;
//     /** Read all fields at row i as a dense array (allocates) */
//     get(i: number): number[];
//     /** Set one or more fields at row i (partial updates allowed) */
//     setRow(i: number, data: Partial<Record<D["fields"][number], number>>): void;
//     /** Copy all fields from src row → dst row */
//     copy(dst: number, src: number): void;
// };
// export function MutatorFactory<D extends ComponentDescriptor>(desc: D) {
//     type ViewT = InstanceType<D["buffer"]>;
//     let view: ViewT | null = null;
//     const stride = desc.count;
//     // Precompute name->index map once (no enums)
//     const indexOf: Record<string, number> = Object.create(null);
//     for (let i = 0; i < desc.fields.length; i++) indexOf[desc.fields[i]] = i;
//     const mut: any = {
//         bind(v: ViewT) {
//             view = v;
//             return mut;
//         },
//         view() {
//             return view;
//         },
//         get(i: number): number[] {
//             if (!view) throw new Error("Mutator: no view bound");
//             const base = i * stride;
//             const out = new Array<number>(stride);
//             for (let k = 0; k < stride; k++) out[k] = view[base + k];
//             return out;
//         },
//         setRow(i: number, data: Partial<Record<string, number>>) {
//             if (!view) throw new Error("Mutator: no view bound");
//             const base = i * stride;
//             for (const k in data) {
//                 const idx = indexOf[k];
//                 if (idx !== undefined) view[base + idx] = data[k] as number;
//             }
//         },
//         copy(dst: number, src: number) {
//             if (!view) throw new Error("Mutator: no view bound");
//             if (dst === src) return;
//             const s = src * stride;
//             const d = dst * stride;
//             for (let k = 0; k < stride; k++) view[d + k] = view[s + k];
//         },
//     };
//     // Per-field accessors: f(i) -> read, f(i, v) -> write
//     for (let f = 0; f < desc.fields.length; f++) {
//         const fname = desc.fields[f];
//         mut[fname] = (i: number, v?: number) => {
//             if (!view) throw new Error("Mutator: no view bound");
//             const idx = i * stride + f;
//             if (v === undefined) return view[idx];
//             view[idx] = v;
//         };
//     }
//     return mut as Mutator<D>;
// }
