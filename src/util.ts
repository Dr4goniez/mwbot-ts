/**
 * Perform a deep merge of objects and return a new object.
 *
 * The following two things should be noted:
 * * This does not modify the passed objects, and merges arrays via concatenation.
 * * Non-plain objects are passed by reference (mutable).
 *
 * @param objects
 * @returns
 */
export function mergeDeep(...objects: any[]): Record<string, any> {
	return objects.reduce((acc: Record<string, any>, obj) => {
		if (obj === undefined || obj === null) {
			// undefined and null cannot be passed to Object.keys
			return acc;
		}
		Object.keys(obj).forEach((key) => {
			const aVal = acc[key];
			const oVal = obj[key];
			if (Array.isArray(aVal) && Array.isArray(oVal)) {
				acc[key].push(...oVal);
			} else if (isPlainObject(aVal) && isPlainObject(oVal)) {
				acc[key] = mergeDeep(aVal, oVal);
			} else {
				acc[key] = oVal;
			}
		});
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
 * Pause execution for the specified duration.
 *
 * @param milliseconds The duration to sleep, in milliseconds. Clamped to a minimum of `0`.
 * @returns A Promise that resolves after the specified duration.
 */
export function sleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds)));
}