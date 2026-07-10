
import type { ParseResultBase } from '../../Wikitext.js';

/**
 * Sorts parser results by their `startIndex` in ascending order.
 *
 * If the objects define an `index` property, it is reassigned to match the
 * new order.
 *
 * The input array is sorted in place.
 *
 * @param arr Parser results to sort.
 */
export function sortParseResults(
	arr: { startIndex: number; index?: number }[]
): void {
	arr.sort((a, b) => a.startIndex - b.startIndex);

	if (!arr.some(obj => 'index' in obj)) {
		return;
	}

	arr.forEach((obj, i) => {
		obj.index = i;
	});
}

/**
 * Assigns the `parent` and `children` relationships for nested parser results.
 *
 * The array must be sorted by `startIndex`, and each object's `index` property
 * must already be initialized.
 *
 * @param arr Parser results sorted by source position.
 */
export function assignNestedKinships(arr: ParseResultBase[]): void {
	const stack: ParseResultBase[] = [];

	for (const obj of arr) {
		while (
			stack.length &&
			stack.at(-1)!.endIndex <= obj.startIndex
		) {
			stack.pop();
		}

		if (stack.length) {
			const parent = stack.at(-1)!;
			obj.parent = parent.index;
			(parent.children as Set<number>).add(obj.index);
		}

		stack.push(obj);
	}
}