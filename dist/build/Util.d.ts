/**
 * This module provides a collection of utility functions, accessible via {@link Mwbot.Util}.
 *
 * Note that `Mwbot.Util` is distinct from `mw.util`. It is a set of utility functions
 * used in the `mwbot-ts` framework, exposed to the user to facilitate common operations.
 *
 * @module
 */
/**
 * Performs a deep merge of objects and returns a new object.
 * - Arrays are concatenated.
 * - Plain objects are recursively merged.
 * - Class instances are cloned but overwritten by later instances.
 * (Note: This cloning is not perfect.)
 * - Getters and setters are preserved.
 * - `Map`, `Set`, and `Date` instances are correctly cloned.
 *
 * @param objects
 * @returns The merged object.
 */
export declare function mergeDeep<T extends object[]>(...objects: T): UnionToIntersection<T[number]>;
/**
 * Converts a union of objects into an intersection of their properties.
 *
 * @private
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
/**
 * Checks whether a value is an object. Arrays and `null` are not considered objects.
 *
 * @param value
 * @returns
 */
export declare function isObject(value: unknown): value is Record<string | number | symbol, unknown>;
/**
 * Checks whether a value is a plain object.
 *
 * @param value
 * @returns
 */
export declare function isPlainObject(value: unknown): value is Record<string | number | symbol, unknown>;
/**
 * Checks whether the given object is empty.
 *
 * @param object
 * @returns A boolean indicating whether the object has no properties. `null` if the input is not an object.
 */
export declare function isEmptyObject(object: unknown): boolean | null;
/**
 * Checks if a value is a class instance.
 *
 * @param value
 * @returns
 */
export declare function isClassInstance(value: unknown): boolean;
/**
 * Deeply clones a class instance, preserving its prototype, inherited properties,
 * and special object types like Map, Set, Date, and RegExp. Also handles cyclic references.
 *
 * **Features**:
 * - Retains the entire prototype chain, ensuring methods like `toString()` work as expected.
 * - Recursively clones objects, including nested structures.
 * - Supports special objects (`Date`, `RegExp`, `Map`, `Set`).
 * - Handles cyclic references to prevent infinite loops.
 * - Supports a custom `_clone(seen)` method if defined on the object. This allows classes to override
 *   the default cloning behavior and perform specialized cloning while still participating in cycle handling.
 *
 * **Limitations**:
 * - WeakMap & WeakSet: Cannot be cloned because their entries are weakly held.
 * - Functions & Closures: Functions are copied by reference; closures are not recreated.
 * - DOM Elements & Buffers: Not supported, as they require specialized handling.
 *
 * @param obj The class instance to clone.
 * @param seen (Internal) A WeakMap to track visited objects for cyclic reference handling.
 * @returns A deep-cloned instance of the given object.
 */
export declare function deepCloneInstance<T extends object>(obj: T, /** @private */ seen?: WeakMap<object, any>): T;
/**
 * A union of primitive types.
 */
export type primitive = string | number | boolean | bigint | symbol | undefined | null;
/**
 * Checks whether a value is a primitive type.
 * @param value
 * @returns
 */
export declare function isPrimitive(value: unknown): value is primitive;
/**
 * Escapes `\ { } ( ) | . ? * + - ^ $ [ ]` in a string for safe inclusion in regular expressions.
 * @param str
 * @returns
 */
export declare function escapeRegExp(str: string): string;
/**
 * Checks whether two arrays are equal. Neither array should contain non-primitive values as its elements.
 * @param array1
 * @param array2
 * @param orderInsensitive Default: `false`
 * @returns
 */
export declare function arraysEqual(array1: primitive[], array2: primitive[], orderInsensitive?: boolean): boolean;
/**
 * Pauses execution for the specified duration.
 *
 * @param milliseconds The duration to sleep, in milliseconds. Clamped to a minimum of `0`.
 * @returns A Promise that resolves after the specified duration.
 */
export declare function sleep(milliseconds: number): Promise<void>;
//# sourceMappingURL=Util.d.ts.map