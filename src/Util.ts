/**
 * This module provides a collection of utility functions, accessible via {@link Mwbot.Util}.
 *
 * Note that `Mwbot.Util` is distinct from `mw.util`. It is a set of utility functions
 * used in the `mwbot-ts` framework, exposed to the user to facilitate common operations.
 *
 * @module
 */

import { Primitive } from './api_types.js';

// Imported only for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Mwbot } from './Mwbot.js';

// ********************************* SYNCHRONOUS FUNCTIONS *********************************

/**
 * Configuration object for {@link CloneConfig}.
 */
export interface CloneConfigOptions {
	/**
	 * Strategy for merging arrays:
	 * - `'concat'`: Appends elements to the existing array. (default)
	 * - `'replace'`: Overwrites the existing array with the new one.
	 * - `'mergeByIndex'`: Recursively merges elements at the same index.
	 */
	arrayStrategy?: 'concat' | 'replace' | 'mergeByIndex';
	/**
	 * Strategy for cloning Sets:
	 * - `'shallow'`: Creates a new Set but keeps references to the stored values.
	 * - `'deep'`: Deeply clones the values stored in the Set. (default)
	 */
	setStrategy?: 'shallow' | 'deep';
	/**
	 * Strategy for cloning Maps:
	 * - `'shallow'`: Creates a new Map but keeps references to the stored values.
	 * - `'deep'`: Deeply clones the values stored in the Map. (default)
	 * - `'deep-aggressive'`: Deeply clones both the keys and the values stored in the Map.
	 */
	mapStrategy?: 'shallow' | 'deep' | 'deep-aggressive';
	/**
     * Strategy for getters and setters:
     * - `'preserve'`: Copies the property descriptors (get/set). (default)
     * - `'resolve'`: Invokes the getter to obtain the computed value and clones it as a normal property.
     */
	getterSetterStrategy?: 'preserve' | 'resolve';
	/**
	 * Whether to deeply clone custom class instances. (Default: `false`)
	 */
	cloneClassInstances?: boolean;
}

/**
 * Class that dictates cloning strategies for {@link mergeDeep} and {@link cloneDeep}.
 *
 * See {@link CloneConfigOptions} for the default configuration.
 */
export class CloneConfig implements Required<CloneConfigOptions> {

	readonly arrayStrategy: 'concat' | 'replace' | 'mergeByIndex';
	readonly setStrategy: 'shallow' | 'deep';
	readonly mapStrategy: 'shallow' | 'deep' | 'deep-aggressive';
	readonly getterSetterStrategy: 'preserve' | 'resolve';
	readonly cloneClassInstances: boolean;

	/**
	 * @param options Clone config options to initialize the instance with.
	 */
	constructor(options: CloneConfigOptions = {}) {
		this.arrayStrategy = options.arrayStrategy ?? 'concat';
		this.setStrategy = options.setStrategy ?? 'deep';
		this.mapStrategy = options.mapStrategy ?? 'deep';
		this.getterSetterStrategy = options.getterSetterStrategy ?? 'preserve';
		this.cloneClassInstances = options.cloneClassInstances ?? false;
	}
}

const DEFAULT_CLONE_CONFIG = new CloneConfig();

/**
 * Performs a deep merge of objects and returns a new object, respecting {@link CloneConfig}
 * strategies.
 *
 * @param config A {@link CloneConfig} instance to dictate cloning strategies.
 * @param objects Objects to deep-merge. The returned object inherits the prototype
 * of the first valid object.
 * @returns The merged object.
 */
export function mergeDeep<T extends object[]>(config: CloneConfig, ...objects: T): UnionToIntersection<T[number]>;
/**
 * Performs a deep merge of objects and returns a new object.
 *
 * See also {@link CloneConfig} for the default merge behaviors.
 *
 * @param objects Objects to deep-merge. The returned object inherits the prototype
 * of the first valid object.
 * @returns The merged object.
 */
export function mergeDeep<T extends object[]>(...objects: T): UnionToIntersection<T[number]>;
export function mergeDeep(...args: any[]): any {
	let config: CloneConfig;
	let objects: any[];

	if (args[0] instanceof CloneConfig) {
		config = args[0];
		objects = args.slice(1);
	} else {
		config = DEFAULT_CLONE_CONFIG;
		objects = args;
	}

	return internalMerge(objects, config);
}

function internalMerge(
	objects: any[],
	config: CloneConfig,
	seen: WeakMap<any, any> = new WeakMap()
): any {
	// Inherit the prototype of the first valid object, or fall back to a null
	// prototype object. This ensures prototype parity between `mergeDeep(obj)`
	// and `cloneDeep(obj)`.
	const firstValidObj = objects.find(obj => obj && typeof obj === 'object');
	const result = firstValidObj
		? Object.create(Object.getPrototypeOf(firstValidObj))
		: Object.create(null);

	for (const obj of objects) {
		if (!obj || typeof obj !== 'object') {
			continue;
		}

		for (const key of Reflect.ownKeys(obj)) {
			const sourceDescriptor = Object.getOwnPropertyDescriptor(obj, key);

			// Check the entire prototype chain of the merge target to avoid
			// assigning to inherited getter-only properties, which would
			// otherwise throw a TypeError.
			const targetDescriptor = getPropertyDescriptorDeep(result, key);

			// Preserve getters and setters (if strategy is 'preserve')
			if (sourceDescriptor?.get || sourceDescriptor?.set) {
				if (config.getterSetterStrategy === 'preserve') {
					// Only define if the target doesn't already have a getter/setter
					// to prevent overwriting.
					if (!targetDescriptor?.get && !targetDescriptor?.set) {
						Object.defineProperty(result, key, sourceDescriptor);
					}
					continue;
				}
				// Fall through if strategy is 'resolve' (obj[key] ignites getter)
			}

			// If the target already has a getter/setter and the strategy is
			// 'preserve', skip normal property assignment to prevent throwing
			// a TypeError.
			if (targetDescriptor?.get || targetDescriptor?.set) {
				if (config.getterSetterStrategy === 'preserve') {
					continue;
				}
			}

			const aVal = result[key];
			const oVal = obj[key as keyof typeof obj];

			// Handle merging arrays
			if (Array.isArray(aVal) && Array.isArray(oVal)) {
				if (config.arrayStrategy === 'replace') {
					defineValue(result, key, internalClone(oVal, config, seen), sourceDescriptor);
				} else if (config.arrayStrategy === 'mergeByIndex') {
					const maxLen = Math.max(aVal.length, oVal.length);
					const mergedArr = [];
					for (let i = 0; i < maxLen; i++) {
						if (isPlainObject(aVal[i]) && isPlainObject(oVal[i])) {
							mergedArr.push(internalMerge([aVal[i], oVal[i]], config, seen));
						} else {
							mergedArr.push(
								oVal[i] !== undefined
									? internalClone(oVal[i], config, seen)
									: internalClone(aVal[i], config, seen)
							);
						}
					}
					defineValue(result, key, mergedArr, sourceDescriptor);
				} else {
					// Default strategy: 'concat'
					defineValue(result, key, [...aVal, ...internalClone(oVal, config, seen)], sourceDescriptor);
				}
				continue;
			}

			// Recursively merge plain objects
			if (isPlainObject(aVal) && isPlainObject(oVal)) {
				defineValue(result, key, internalMerge([aVal, oVal], config, seen), sourceDescriptor);
				continue;
			}

			// Handle other values (Deep clone using the internal engine)
			defineValue(result, key, internalClone(oVal, config, seen), sourceDescriptor);
		}
	}

	return result;
}

/**
 * Retrieves a property descriptor from an object or any object in its prototype chain.
 *
 * @param obj The object whose prototype chain to traverse.
 * @param key The property key to look up.
 * @returns The first matching property descriptor, or `undefined` if not found.
 */
function getPropertyDescriptorDeep(
	obj: object | null,
	key: string | symbol
): PropertyDescriptor | undefined {
	while (obj) {
		const descriptor = Object.getOwnPropertyDescriptor(obj, key);
		if (descriptor) {
			return descriptor;
		}
		obj = Object.getPrototypeOf(obj);
	}
	return undefined;
}

function defineValue(
	object: any,
	key: string | symbol,
	value: any,
	descriptor?: PropertyDescriptor
) {
	Object.defineProperty(object, key, {
		value,
		writable: descriptor?.writable ?? true,
		enumerable: descriptor?.enumerable ?? true,
		configurable: descriptor?.configurable ?? true,
	});
}

function internalClone(
	val: any,
	config: CloneConfig = DEFAULT_CLONE_CONFIG,
	seen: WeakMap<any, any> = new WeakMap()
): any {
	if (val === null || typeof val !== 'object') {
		return val;
	}

	// Handle cyclic references
	if (seen.has(val)) {
		return seen.get(val);
	}

	// Support custom _clone(seen) method if defined on the object
	if (typeof (val as any)._clone === 'function') {
		const customClone = (val as any)._clone(seen);
		seen.set(val, customClone);
		return customClone;
	}

	// Handle Built-in Objects
	if (val instanceof Date) {
		const cloned = new Date(val.getTime());
		seen.set(val, cloned);
		return cloned;
	}

	if (val instanceof RegExp) {
		const cloned = new RegExp(val.source, val.flags);
		seen.set(val, cloned);
		return cloned;
	}

	if (val instanceof Map) {
		const cloned = new Map();
		seen.set(val, cloned);
		for (const [k, v] of val.entries()) {
			const clonedKey = config.mapStrategy === 'deep-aggressive'
				? internalClone(k, config, seen)
				: k;
			const clonedVal = config.mapStrategy === 'shallow'
				? v
				: internalClone(v, config, seen);
			cloned.set(clonedKey, clonedVal);
		}
		return cloned;
	}

	if (val instanceof Set) {
		const cloned = new Set();
		seen.set(val, cloned);
		for (const v of val) {
			cloned.add(
				config.setStrategy === 'deep'
					? internalClone(v, config, seen)
					: v
			);
		}
		return cloned;
	}

	if (Array.isArray(val)) {
		const cloned: any[] = [];
		seen.set(val, cloned);
		for (const item of val) {
			cloned.push(internalClone(item, config, seen));
		}
		return cloned;
	}

	// Class Instance skipping check
	const isClass = !isPlainObject(val);
	if (isClass && !config.cloneClassInstances) {
		return val;
	}

	// Create a new instance preserving the exact prototype chain
	const cloned = Object.create(Object.getPrototypeOf(val));
	seen.set(val, cloned);

	// Deep clone ONLY own properties (prevents prototype flattening)
	const descriptors = Object.getOwnPropertyDescriptors(val);
	for (const key of Reflect.ownKeys(descriptors)) {
		const desc = descriptors[key as any];

		// Evaluate getter and assign a static value if strategy is 'resolve'
		if ((desc.get || desc.set) && config.getterSetterStrategy === 'resolve') {
			defineValue(cloned, key, internalClone(val[key], config, seen), desc);
			continue;
		}

		if ('value' in desc) {
			desc.value = internalClone(desc.value, config, seen);
		}

		Object.defineProperty(cloned, key, desc);
	}

	return cloned;
}

/**
 * Deeply clones plain objects, arrays, Maps, Sets, Dates, RegExps, and other supported
 * built-in types.
 *
 * NOTE: Custom class instances are preserved by reference unless
 * {@link CloneConfigOptions.cloneClassInstances | cloneClassInstances} is enabled.
 *
 * @param val The value to clone.
 *
 * If the value is an object and a `_clone` function is defined in it as a property,
 * it is used instead to perform the cloning.
 * @param config Optional {@link CloneConfig} instance to dictate cloning strategies.
 * @returns A deeply cloned instance.
 */
export function cloneDeep<T>(val: T, config?: CloneConfig): T {
	return internalClone(val, config);
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
 * Checks whether the given plain object has no own properties.
 *
 * String keys, symbol keys, and non-enumerable properties are all considered.
 * Values that are not plain objects return `null`.
 *
 * @param object
 * @returns `true` if the object has no own properties, `false` otherwise,
 * or `null` if the input is not a plain object.
 */
export function isEmptyObject(object: unknown): boolean | null {
	if (!isPlainObject(object)) {
		return null;
	}
	return Reflect.ownKeys(object).length === 0;
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
 * Checks whether the given value is a JavaScript primitive.
 *
 * This includes `string`, `number`, `boolean`, `bigint`, `symbol`, `undefined`, and `null`.
 *
 * @param value The value to test.
 * @returns `true` if the value is a primitive; otherwise, `false`.
 */
export function isPrimitive(value: unknown): value is Primitive {
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
export function arraysEqual(array1: Primitive[], array2: Primitive[], orderInsensitive = false): boolean {
	if (array1.length !== array2.length) {
		return false;
	}

	if (!orderInsensitive) {
		return array1.every((v, i) => Object.is(v, array2[i]));
	}

	/** @type {Map<Primitive, number>} */
	const counts = new Map();
	for (const v of array1) {
		counts.set(v, (counts.get(v) || 0) + 1);
	}

	for (const v of array2) {
		let count = counts.get(v);
		if (count === undefined) {
			return false;
		}
		if (--count === 0) {
			counts.delete(v);
		} else {
			counts.set(v, count);
		}
	}

	return counts.size === 0;
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