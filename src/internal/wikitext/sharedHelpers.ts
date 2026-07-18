import type { DoubleBracedClasses, FuzzyWikilink, Parameter, ParseResultBase, Tag } from '../../Wikitext.js';

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

	if (!arr.some((obj) => 'index' in obj)) {
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

/**
 * A mapping of expression start indexes to their corresponding details.
 *
 * This type is used to track expressions while skipping over tags, parameters, and wikilinks.
 * Each entry includes:
 * - `text`: The raw text of the expression.
 * - `type`: The type of the expression.
 * - `inner`: The start and end indexes of the inner content, or `null` if not applicable.
 * - `tagName`: The name of the `<tag>`; present only when `type` is `'tag'`.
 *
 * @private
 */
export interface IndexMap {
	[startIndex: number]: IndexMapEntry;
}

/**
 * See {@link IndexMap}.
 */
export interface IndexMapEntry {
	text: string;
	type: 'tag' | 'parameter' | 'wikilink_fuzzy' | 'template';
	inner: { start: number; end: number } | null;
	tagName?: string;
}

/**
 * @private
 */
export interface IndexMapOptions {
	gallery?: boolean;
	parameters?: boolean;
	wikilinks_fuzzy?: boolean;
	templates?: boolean;
}

/**
 * Adds tag entries to an index map.
 *
 * Skip tags are always indexed. Gallery tags are indexed only when enabled
 * and their content contains a pipe character.
 *
 * @param map The index map to modify in place.
 * @param tags Parsed tags.
 * @param options Index map options.
 * @param isSkipTag Predicate that determines whether a tag should be treated as a skip tag.
 */
export function addTagIndexMap(
	map: IndexMap,
	tags: ReadonlyArray<Tag>,
	options: IndexMapOptions,
	isSkipTag: (name: string) => boolean
): void {
	for (const { text, startIndex, name, content } of tags) {
		// If this is a skip tag or a gallery tag whose content contains a pipe character
		if (
			isSkipTag(name) ||
			(name === 'gallery' && options.gallery && content?.includes('|'))
		) {
			// `inner` is the innerHTML of the tag
			let inner = null;
			if (content !== null) {
				const innerStartIndex = startIndex + text.indexOf(content);
				inner = {
					start: innerStartIndex,
					end: innerStartIndex + content.length,
				};
			}
			map[startIndex] = {
				text,
				type: 'tag',
				inner,
				tagName: name,
			};
		}
	}
}

/**
 * * `$1` - Opening triple braces, the parameter name, and a delimiter pipe character
 *   (e.g., `{{{foo|` in `{{{foo|bar}}}`).
 * * `$2` - The parameter content (e.g., `bar` in `{{{foo|bar}}}`).
 */
const rParameterContent = /^(\{{3}[^|}]*\|)(.+)\}{3}$/;

/**
 * Adds parameter entries to an index map.
 *
 * @param map The index map to modify in place.
 * @param parameters Parsed parameters.
 */
export function addParameterIndexMap(
	map: IndexMap,
	parameters: ReadonlyArray<Parameter>
): void {
	for (const { text, startIndex } of parameters) {
		const m = rParameterContent.exec(text);
		// `inner` is the right operand of the parameter
		const inner = m && {
			start: startIndex + m[1].length,
			end: startIndex + m[1].length + m[2].length,
		};
		map[startIndex] = {
			text,
			type: 'parameter',
			inner,
		};
	}
}

/**
 * Adds fuzzy wikilink entries to an index map.
 *
 * @param map The index map to modify in place.
 * @param fuzzyWikilinks Parsed fuzzy wikilinks.
 */
export function addFuzzyWikilinkIndexMap(
	map: IndexMap,
	fuzzyWikilinks: ReadonlyArray<FuzzyWikilink>
): void {
	for (const { text, startIndex, endIndex } of fuzzyWikilinks) {
		// `inner` is the inner text of the wikilink (the text without "[[" and "]]")
		const start = startIndex + 2;
		const end = endIndex - 2;
		map[startIndex] = {
			text,
			type: 'wikilink_fuzzy',
			inner: end - start > 1 ? { start, end } : null,
		};
	}
}

/**
 * Adds template and parser function entries to an index map.
 *
 * @param map The index map to modify in place.
 * @param templates Parsed templates and parser functions.
 */
export function addTemplateIndexMap(
	map: IndexMap,
	templates: ReadonlyArray<DoubleBracedClasses>
): void {
	for (const template of templates) {
		let rawTitle;
		let isTemplate = true;
		if ('rawTitle' in template) {
			rawTitle = template.rawTitle;
		} else {
			rawTitle = template.rawHook;
			isTemplate = false;
		}

		// `inner` is, for templates, their right operand, and for parser functions, the text after their hook
		const { text, startIndex, endIndex } = template;
		const start = startIndex + 2 + rawTitle.length + (isTemplate ? 1 : 0);
		const end = endIndex - 2;
		map[startIndex] = {
			text,
			type: 'template',
			inner: end - start > 1 ? { start, end } : null,
		};
	}
}
