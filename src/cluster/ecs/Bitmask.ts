type TypeName = string;

type TypeIndex = bigint;

/**
 * The Registry class is used to store a mapping of component type names to their
 * corresponding indices. This is useful for creating bitmasks that represent
 * the components that an entity has.
 */
export class Registry {
  private static _next: bigint = BigInt(0);

  private static _registry: Map<TypeName, TypeIndex> = new Map();

  static register(componentType: TypeName): TypeName {
    if (!Registry._registry.has(componentType)) {
      Registry._registry.set(componentType, Registry._next++);
    }
    return componentType;
  }

  static indexOf(componentType: TypeName): TypeIndex {
    const index = Registry._registry.get(componentType);
    if (index === undefined) {
      throw new Error(
        `Component type "${componentType}" not found in registry`
      );
    }
    return index;
  }

  static typeOf(index: TypeIndex): TypeName {
    for (const [type, idx] of Registry._registry.entries()) {
      if (idx === index) {
        return type;
      }
    }
    throw new Error(`Index "${index}" not found in registry`);
  }

  static getIndex(componentType: TypeName): TypeIndex {
    return Registry.indexOf(componentType);
  } // Alias for indexOf

  static getType(index: TypeIndex): TypeName {
    return Registry.typeOf(index);
  } // Alias for typeOf

  static next(): TypeIndex {
    return Registry._next;
  }
}

/**
 * The Bitmask class is used to store a bitmask that represents the components
 * that an entity has. It provides methods for adding, removing, and checking
 * for the presence of component types in the bitmask.
 */
export class Bitmask {
  static typesToMask(componentTypes: TypeName[]): bigint {
    return componentTypes.reduce((mask, type) => {
      return mask | (BigInt(1) << Registry.indexOf(type));
    }, BigInt(0));
  }

  static maskToTypes(mask: bigint): TypeName[] {
    const types: TypeName[] = [];
    for (let i = BigInt(0); i < Registry.next(); i++) {
      if ((mask & (BigInt(1) << i)) !== BigInt(0)) {
        types.push(Registry.typeOf(i));
      }
    }
    return types;
  }

  // instance members and methods
  private _mask: bigint = BigInt(0);

  private _previous: bigint = BigInt(0);

  add(typeName: TypeName): Bitmask {
    this._previous = this._mask;
    this._mask |= BigInt(1) << Registry.indexOf(typeName);
    return this;
  }

  set(typeName: TypeName): Bitmask {
    return this.add(typeName);
  } // Alias for add

  remove(typeName: TypeName): Bitmask {
    this._previous = this._mask;
    this._mask &= ~(BigInt(1) << Registry.indexOf(typeName));
    return this;
  }

  delete(typeName: TypeName): Bitmask {
    return this.remove(typeName);
  } // Alias for remove

  addMask(mask: bigint): Bitmask {
    this._previous = this._mask;
    this._mask |= mask;
    return this;
  }

  setMask(mask: bigint): Bitmask {
    return this.addMask(mask);
  } // Alias for addMask

  removeMask(mask: bigint): Bitmask {
    this._previous = this._mask;
    this._mask &= ~mask;
    return this;
  }

  deleteMask(mask: bigint): Bitmask {
    return this.removeMask(mask);
  } // Alias for removeMask

  clear(): Bitmask {
    this._mask = BigInt(0);
    this._previous = BigInt(0);
    return this;
  }

  includesType(typeName: TypeName): boolean {
    return (
      (this._mask & (BigInt(1) << Registry.indexOf(typeName))) !== BigInt(0)
    );
  }

  includesMask(mask: bigint): boolean {
    return (this._mask & mask) === mask;
  }

  isEmtpy(): boolean {
    return this._mask === BigInt(0);
  }

  get value(): bigint {
    return this._mask;
  }

  get previous(): bigint {
    return this._previous;
  }
}

// bitmask check
// const bitmask = new Bitmask();
// bitmask.add(Position.name);
// bitmask.add(Velocity.name);

// const mask1 = new Bitmask();
// mask1.add(Position.name);
// mask1.add(Velocity.name);
// mask1.add(Dummy.name);

// console.log(
//   bitmask.includesMask(mask1.value),
//   Bitmask.maskToTypes(bitmask.value),
//   Bitmask.maskToTypes(mask1.value)
// );

// bitmask.addMask(mask1.value);

// console.log(
//   bitmask.includesMask(mask1.value),
//   Bitmask.maskToTypes(bitmask.value),
//   Bitmask.maskToTypes(mask1.value)
// );

// mask1.remove(Dummy.name);

// console.log(
//   bitmask.includesMask(mask1.value),
//   Bitmask.maskToTypes(bitmask.value),
//   Bitmask.maskToTypes(mask1.value)
// );

// bitmask.deleteMask(mask1.value);

// console.log(
//   bitmask.includesMask(mask1.value),
//   Bitmask.maskToTypes(bitmask.value),
//   Bitmask.maskToTypes(mask1.value)
// );

// bitmask.add(Position.name);
// bitmask.add(Velocity.name);

// console.log(
//   bitmask.includesMask(mask1.value),
//   Bitmask.maskToTypes(bitmask.value),
//   Bitmask.maskToTypes(mask1.value)
// );
