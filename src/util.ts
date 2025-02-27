/**
 * Perform a deep merge of objects and return a new object.
 * - Arrays are concatenated.
 * - Plain objects are recursively merged.
 * - Non-plain objects are passed by reference.
 *
 * @param objects
 * @returns
 */
export function mergeDeep(...objects: any[]): any {
	return objects.reduce((acc, obj) => {
		if (!obj) {
			return acc;
		}
		for (const key of Object.keys(obj)) {
			const aVal = acc[key];
			let oVal = obj[key];
			if (Array.isArray(oVal) && oVal.some(el => !isPrimitive(el))) {
				oVal = mergeDeep(oVal);
			}
			if (Array.isArray(aVal) && Array.isArray(oVal)) {
				acc[key] = [...aVal, ...oVal]; // Merge arrays
			} else if (isPlainObject(aVal) && isPlainObject(oVal)) {
				acc[key] = mergeDeep(aVal, oVal); // Recursively merge objects
			} else {
				// Handle the first iteration and non-plain objects
				acc[key] = Array.isArray(oVal) ? [...oVal] : isPlainObject(oVal) ? mergeDeep(oVal) : oVal;
			}
		}
		return acc;
	}, Object.create(null));
}

/**
 * Check whether an object is a plain object.
 *
 * Adapted from {@link https://github.com/sindresorhus/is-plain-obj/blob/master/index.js}.
 *
 * @param value
 * @returns
 */
export function isPlainObject(value: any): boolean {
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
	if (!isPlainObject(object)) {
		return false;
	}
	for (const _key in object) {
		return false;
	}
	return true;
}

/**
 * Check whether a value is a primitive type.
 * @param val
 * @returns
 */
export function isPrimitive(val: unknown): val is string | number | boolean | bigint | symbol | undefined | null {
    return val !== Object(val);
}

/**
 * Pause execution for the specified duration.
 *
 * @param milliseconds The duration to sleep, in milliseconds. Clamped to a minimum of `0`.
 * @returns A Promise that resolves after the specified duration.
 */
export function sleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds)));
}