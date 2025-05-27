// /**
//  * Recursive type to build a tuple of a given size.
//  *
//  * @template Element - The type of the elements in the tuple.
//  * @template Size - The desired size of the tuple.
//  * @template Result - The accumulator for the recursive type, defaulting to an empty array.
//  */
// type BuildTuple<
//     Element,
//     Size extends number,
//     Result extends Element[] = []
// > = Result["length"] extends Size
//     ? Result
//     : BuildTuple<Element, Size, [...Result, Element]>;

// type Tuple<Element, Size extends number> = BuildTuple<Element, Size>;

// function createTuple<const Size extends number>(
//     size: Size
// ): BuildTuple<number, Size> {
//     return new Array(size).fill(0) as BuildTuple<number, Size>;
// }

// type SchemaFieldType = "float32" | "int32" | "uint8" | "uint32";

// interface Schema {
//     name: string;
//     fields: Record<
//         string,
//         {
//             type: SchemaFieldType;
//             size: number;
//         }
//     >;
// }

// /**
//  * Recursively builds a tuple of `Element` repeated `Size` times.
//  */
// type BuildTuple<
//     Element,
//     Size extends number,
//     Acc extends Element[] = []
// > = Acc["length"] extends Size
//     ? Acc
//     : BuildTuple<Element, Size, [...Acc, Element]>;

// /**
//  * If `Size` is the literal `0` → `number`, otherwise → tuple of length `Size`.
//  */
// type FieldValue<Size extends number> = Size extends 0
//     ? number
//     : BuildTuple<number, Size>;

// /**
//  * Take any object whose `fields` values have a literal `size: number`.
//  * We infer that shape as `F`, then build the return type from it.
//  */
// function createObject<
//     const F extends Record<string, { type: SchemaFieldType; size: number }>
// >(schema: {
//     name: string;
//     fields: F;
// }): {
//     name: string;
//     fields: {
//         [K in keyof F]: FieldValue<F[K]["size"]>;
//     };
// } {
//     const out: any = { name: schema.name, fields: {} };
//     for (const key in schema.fields) {
//         const { size } = schema.fields[key];
//         out.fields[key] =
//             size <= 0
//                 ? 0
//                 : (new Array(size).fill(0) as BuildTuple<number, typeof size>);
//     }
//     return out;
// }

// const mySchema: Schema = {
//     name: "MySchema",
//     fields: {
//         x: {
//             type: "float32",
//             size: 1,
//         },
//         y: {
//             type: "uint8",
//             size: 1,
//         },
//         visible: {
//             type: "int32",
//             size: 2,
//         },
//     },
// } as const;

// const myComponent = createObject(mySchema);
// console.log(" myComponent:", myComponent.fields.visible);
// myComponent.fields.visible[0] = 1; // Type '1' is not assignable to type 'undefined'.ts(2322)
// myComponent.fields.visible[1] = 2; // Type '2' is not assignable to type 'undefined'.ts(2322)
// myComponent.fields.visible[2] = 3; // Type '3' is not assignable to type 'undefined'.ts(2322)

// export default () => {};
