/**
 * This module is attached to Mwbot.Util as a static member.
 *
 * Note that `Mwbot.Util` is different from `mw.util`. It is a collection of utility functions
 * used in the `mwbot-ts` framework, exposed to the user to facilitate common operations.
 *
 * @module Util
 */

// ********************************* SYNCHRONOUS FUNCTIONS *********************************

/**
 * Perform a deep merge of objects and return a new object.
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
 */
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Check whether a value is an object. Arrays and `null` are not considered objects.
 * @param value
 * @returns
 */
export function isObject(value: any): boolean {
	return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

/**
 * Check whether an object is a plain object.
 * @param value
 * @returns
 */
export function isPlainObject(value: any): boolean {
	// Adapted from https://github.com/sindresorhus/is-plain-obj/blob/master/index.js
	if (Object.prototype.toString.call(value) !== '[object Object]') {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
}

/**
 * Check whether the given object is empty.

 * @param object
 * @returns `true` if the object has no properties; otherwise `false`.
 *
 * NOTE: Unlike `jQuery.isEmptyObject`, this function always returns `false` if the input is not an object.
 */
export function isEmptyObject(object: any): boolean {
	if (!isObject(object)) {
		return false;
	}
	for (const _key in object) {
		return false;
	}
	return true;
}

/**
 * Check if a value is a class instance (i.e., not a plain object but an instance of a class).
 */
export function isClassInstance(value: any): boolean {
	return isObject(value) && !isPlainObject(value);
}

/**
 * Deeply clones a class instance, preserving its prototype and inherited properties.
 *
 * - Retains methods and properties from the entire prototype chain.
 *
 * @param obj The class instance to clone.
 * @returns A deep-cloned instance of the given object.
 */
function deepCloneInstance<T extends object>(obj: T): T {
	if (obj === null || typeof obj !== 'object') {
		return obj;
	}

	// Create a new instance preserving the prototype
	const clone = Object.create(Object.getPrototypeOf(obj));

	// Collect property descriptors from the entire prototype chain
	let currentObj: object | null = obj;
	const descriptors: PropertyDescriptorMap = {};
	while (currentObj !== null) {
		Object.assign(descriptors, Object.getOwnPropertyDescriptors(currentObj));
		currentObj = Object.getPrototypeOf(currentObj);
	}

	// Apply descriptors to clone
	Object.defineProperties(clone, descriptors);

	return mergeDeep(clone, obj) as T;
}

/**
 * A disjunctive union type for primitive types.
 */
export type primitive = string | number | boolean | bigint | symbol | undefined | null;

/**
 * Check whether a value is a primitive type.
 * @param value
 * @returns
 */
export function isPrimitive(value: unknown): value is primitive {
    return value !== Object(value);
}

/**
 * Escape `\ { } ( ) | . ? * + - ^ $ [ ]` in a string for safe inclusion in regular expressions.
 * @param str
 * @returns
 */
export function escapeRegExp(str: string): string {
	// eslint-disable-next-line no-useless-escape
	return str.replace(/([\\{}()|.?*+\-^$\[\]])/g, '\\$1');
}

/**
 * Check whether two arrays are equal. Neither array should contain non-primitive values as its elements.
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
 * Pause execution for the specified duration.
 *
 * @param milliseconds The duration to sleep, in milliseconds. Clamped to a minimum of `0`.
 * @returns A Promise that resolves after the specified duration.
 */
export function sleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds)));
}