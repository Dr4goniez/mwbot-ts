export const parameterRegex = {
	/**
	 * Capturing groups:
	 * * `$1`: Parameter name
	 * * `$2`: Parameter value (possibly undefined)
	 */
	params: /\{{3}(?!{)([^|}]*)(?:\|([^}]*))?\}{3}/g,
	leadingClosingBraces: /^\}{2,}/,
	trailingTripleClosingBraces: /\}{3}$/,
};

const rConsecutiveBraces = {
	opening: /\{{2,}/g,
	closing: /\}{2,}/g,
};

/**
 * Counts the total number of consecutive opening or closing braces in a string.
 *
 * @param str The string to inspect.
 * @param direction Which type of braces to count.
 * @returns The total number of matched brace characters.
 */
export function countConsecutiveBraces(str: string, direction: 'opening' | 'closing'): number {
	return (str.match(rConsecutiveBraces[direction]) ?? []).join('').length;
}