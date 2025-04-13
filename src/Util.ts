/**
 * This module provides a collection of utility functions, accessible via {@link Mwbot.Util}.
 *
 * Note that `Mwbot.Util` is distinct from `mw.util`. It is a set of utility functions
 * used in the `mwbot-ts` framework, exposed to the user to facilitate common operations.
 *
 * @module
 */

// Imported only for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Mwbot } from './Mwbot';

// ********************************* SYNCHRONOUS FUNCTIONS *********************************

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
export function mergeDeep<T extends object[]>(...objects: T): UnionToIntersection<T[number]> {
	const result = Object.create(null) as any;

	for (const obj of objects) {
		if (!obj) continue;

		for (const key of Reflect.ownKeys(obj)) {
			const descriptor = Object.getOwnPropertyDescriptor(obj, key); // Get full descriptor
			const aVal = result[key];
			let oVal = (obj as any)[key];

			// Preserve getters/setters
			if (descriptor?.get || descriptor?.set) {
				Object.defineProperty(result, key, descriptor);
				continue;
			}

			// Handle special cases
			if (oVal instanceof Date) {
				oVal = new Date(oVal.getTime());
			} else if (oVal instanceof Map) {
				oVal = new Map([...oVal.entries()].map(([k, v]) => [k, isObject(v) ? mergeDeep(v) : v]));
			} else if (oVal instanceof Set) {
				oVal = new Set([...oVal].map(v => (isObject(v) ? mergeDeep(v) : v)));
			} else if (isClassInstance(oVal)) {
				oVal = deepCloneInstance(oVal);
			}

			if (Array.isArray(oVal)) {
				result[key] = Array.isArray(aVal)
					? [...aVal, ...oVal.map(el => (isObject(el) ? mergeDeep(el) : el))]
					: oVal.map(el => (isObject(el) ? mergeDeep(el) : el));
			} else if (isPlainObject(aVal) && isPlainObject(oVal)) {
				result[key] = mergeDeep(aVal, oVal);
			} else {
				result[key] = oVal;
			}
		}
	}

	return result;
}

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
export function isObject(value: unknown): value is Record<string | number | symbol, unknown> {
	return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

/**
 * Checks whether a value is a plain object.
 *
 * @param value
 * @returns
 */
export function isPlainObject(value: unknown): value is Record<string | number | symbol, unknown> {
	if (
		typeof value !== 'object' ||
		value === null ||
		Object.prototype.toString.call(value) !== '[object Object]'
	) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
}

/**
 * Checks whether the given object is empty.
 *
 * @param object
 * @returns A boolean indicating whether the object has no properties. `null` if the input is not an object.
 */
export function isEmptyObject(object: unknown): boolean | null {
	if (!isObject(object)) {
		return null;
	}
	for (const _key in object) {
		return false;
	}
	return true;
}

/**
 * Checks if a value is a class instance.
 *
 * @param value
 * @returns
 */
export function isClassInstance(value: unknown): boolean {
	if (!isObject(value)) {
		return false;
	}
	const proto = Object.getPrototypeOf(value);
	// Ensure it has a prototype that is neither null nor Object.prototype
	return proto !== null && proto !== Object.prototype && typeof value.constructor === 'function';
}

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
export function deepCloneInstance<T extends object>(obj: T, /** @private */ seen = new WeakMap<object, any>()): T {
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}

	// Handle cyclic references
	if (seen.has(obj)) {
		return seen.get(obj) as T;
	}

	// Use custom _clone(seen) method if defined
	if (typeof (obj as any)._clone === 'function') {
		const customClone = (obj as any)._clone(seen);
		seen.set(obj, customClone);
		return customClone;
	}

	// Handle built-in objects
	if (obj instanceof Date) {
		return new Date(obj.getTime()) as T;
	}
	if (obj instanceof RegExp) {
		return new RegExp(obj.source, obj.flags) as T;
	}
	if (obj instanceof Map) {
		const mapClone = new Map();
		seen.set(obj, mapClone);
		obj.forEach((value, key) => {
			mapClone.set(deepCloneInstance(key, seen), deepCloneInstance(value, seen));
		});
		return mapClone as T;
	}
	if (obj instanceof Set) {
		const setClone = new Set();
		seen.set(obj, setClone);
		obj.forEach((value) => {
			setClone.add(deepCloneInstance(value, seen));
		});
		return setClone as T;
	}

	// Create a new instance preserving the prototype
	const clone = Object.create(Object.getPrototypeOf(obj));
	seen.set(obj, clone);

	// Collect property descriptors from the entire prototype chain
	let currentObj: object | null = obj;
	const descriptors: PropertyDescriptorMap = {};
	while (currentObj !== null) {
		Object.assign(descriptors, Object.getOwnPropertyDescriptors(currentObj));
		currentObj = Object.getPrototypeOf(currentObj);
	}

	// Deep clone properties
	for (const key of Object.keys(descriptors)) {
		const desc = descriptors[key];
		if ('value' in desc) {
			desc.value = deepCloneInstance(desc.value, seen);
		}
	}

	// Apply descriptors to clone
	Object.defineProperties(clone, descriptors);

	// Ensure prototype methods like toString() remain intact
	Object.setPrototypeOf(clone, Object.getPrototypeOf(obj));

	return clone as T;
}

/**
 * A union of primitive types.
 */
export type primitive = string | number | boolean | bigint | symbol | undefined | null;

/**
 * Checks whether a value is a primitive type.
 * @param value
 * @returns
 */
export function isPrimitive(value: unknown): value is primitive {
	return value !== Object(value);
}

/**
 * Escapes `\ { } ( ) | . ? * + - ^ $ [ ]` in a string for safe inclusion in regular expressions.
 * @param str
 * @returns
 */
export function escapeRegExp(str: string): string {
	// eslint-disable-next-line no-useless-escape
	return str.replace(/([\\{}()|.?*+\-^$\[\]])/g, '\\$1');
}

/**
 * Checks whether two arrays are equal. Neither array should contain non-primitive values as its elements.
 * @param array1
 * @param array2
 * @param orderInsensitive Default: `false`
 * @returns
 */
export function arraysEqual(array1: primitive[], array2: primitive[], orderInsensitive = false): boolean {
	if (orderInsensitive) {
		return array1.length === array2.length && array1.every(el => array2.includes(el));
	} else {
		return array1.length === array2.length && array1.every((el, i) => array2[i] === el);
	}
}

// ********************************* ASYNCHRONOUS FUNCTIONS *********************************

/**
 * Pauses execution for the specified duration.
 *
 * @param milliseconds The duration to sleep, in milliseconds. Clamped to a minimum of `0`.
 * @returns A Promise that resolves after the specified duration.
 */
export function sleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds)));
}