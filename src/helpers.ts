export function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && !!value;
}

/**
 * Returns a human-readable type name for the given value.
 *
 * Unlike `typeof`, this distinguishes arrays, `null`, and class instances
 * by returning their constructor names where available.
 *
 * @param value The value whose type should be determined.
 * @returns A normalized type name (e.g. `"string"`, `"array"`, `"null"`,
 * `"Object"`, `"MwbotError"`).
 */
export function formatType(value: unknown): string {
	if (Array.isArray(value)) return 'array';
	if (value === null) return 'null';

	// Prioritize primitive types
	const primitiveType = typeof value;
	if (primitiveType !== 'object' && primitiveType !== 'function') {
		return primitiveType;
	}

	// Return a class name for objects and custom class instances.
	// Functions are normalized to 'function'.
	const typeName = value?.constructor?.name || primitiveType;
	return typeName === 'Function' ? 'function' : typeName;
}