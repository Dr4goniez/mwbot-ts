import { DeepReadonly } from 'ts-essentials';
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

		// `inner` is, for templates, their right operand, and for parser functions,
		// the text after their hook
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

// Essentially the same as regular expressions used in Title
const whitespace = ' _\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000';
const bidi = '\u200E\u200F\u202A-\u202E';
const whitespaceBidi = `[${whitespace}${bidi}]*`;

const rWhitespaceBidi = new RegExp(
	`^(${whitespaceBidi})(.*?)(${whitespaceBidi})$`
);
const rWhitespaceBidiLead = new RegExp(
	`^${whitespaceBidi}`
);
const rWhitespaceBidiTrail = new RegExp(
	`${whitespaceBidi}$`
);

/**
 * Splits a title into leading whitespace/bidi characters, the core text, and
 * trailing whitespace/bidi characters.
 *
 * This follows the same whitespace and bidi definitions used by the title parser,
 * but does not perform any title normalization.
 *
 * @param title The title to split.
 * @returns The original match together with its leading, core, and trailing parts.
 */
function trimTitle(title: string) {
	const [
		match,
		leading,
		core,
		trailing,
	] = title.match(rWhitespaceBidi) ?? ['', '', '', ''];

	return { match, leading, core, trailing };
}

/**
 * A contiguous fragment of a parsed title.
 *
 * Fragments preserve the original ordering and HTML comments so that `rawTitleTemplate`
 * can later be reconstructed without consulting the original wikitext.
 */
export interface TitleFragment {
	/**
	 * The original fragment text.
	 */
	text: string;
	/**
	 * Whether this fragment is an HTML comment.
	 */
	isComment: boolean;
}

/**
 * Placeholder inserted into a raw-title template to mark the position
 * where the normalized title should be reinserted.
 */
export const rawTitlePlaceholder = '\x01';

/**
 * Builds a raw-title template from title fragments.
 *
 * The returned string contains {@link rawTitlePlaceholder} at the position where the normalized
 * title should later be reinserted.
 *
 * #### Example 1: Full match
 * - `title`: `' Foo '`
 * - `rawTitle`: `' Foo '`
 * - `rawTitleTemplate`: `' \x01 '`
 *
 * `rawTitle` is used to stringify a parsed instance in the raw output mode. Once `title` is
 * updated in the instance, `rawTitleTemplate` is used and the new title is inserted into
 * the position of the placeholder to retain the original raw formatting.
 *
 * #### Example 2: Comment tags on the left
 * - `title`: `'  Foo '`
 * - `rawTitle`: `' <!-- --> Foo '`
 * - `rawTitleTemplate`: `' <!-- --> \x01 '`
 *
 * #### Example 3: Comment tags on the right
 * - `title`: `' Foo  '`
 * - `rawTitle`: `' Foo <!-- --> '`
 * - `rawTitleTemplate`: `' \x01 <!-- --> '`
 *
 * #### Example 4: Intervening comment tags
 * - `title`: `' Foo '`
 * - `rawTitle`: `' Fo<!-- -->o '`
 * - `rawTitleTemplate`: `' \x01 '`
 *
 * Any HTML comments that interrupt the title text become part of the placeholder region and are
 * therefore not preserved independently.
 *
 * @param fragments Parsed title fragments.
 * @param titleData Optional precomputed title strings to avoid reconstructing them from `fragments`.
 * @returns A raw-title template suitable for reconstructing the original raw title after the title
 * has been modified.
 */
export function buildRawTitleTemplateFromFragments(
	fragments: DeepReadonly<TitleFragment[]>,
	titleData?: { title: string; rawTitle: string }
): string {
	if (!titleData) {
		titleData = { title: '', rawTitle: '' };

		for (const { text, isComment } of fragments) {
			if (!isComment) {
				titleData.title += text;
			}
			titleData.rawTitle += text;
		}
	}
	const { title, rawTitle } = titleData;

	// Full match
	if (title === rawTitle) {
		const { leading, core, trailing } = trimTitle(title);

		return core === ''
			// Edge case: the title consists solely of whitespace and/or HTML comments,
			// so there is no stable insertion point for the placeholder
			? rawTitle + rawTitlePlaceholder
			: leading + rawTitlePlaceholder + trailing;
	}

	// Collect leading whitespace/bidi characters and HTML comments
	let leading = '';
	for (const fragment of fragments) {
		if (fragment.isComment) {
			leading += fragment.text;
		} else {
			const ws = fragment.text.match(rWhitespaceBidiLead)![0];
			if (ws.length === fragment.text.length) {
				// `text` is whitespace only: add it to `leading` and continue
				leading += fragment.text;
			} else {
				// Found non-whitespace in `text`: only add whitespace to `leading` and stop
				leading += ws;
				break;
			}
		}
	}

	// Collect trailing whitespace/bidi characters and HTML comments
	let trailing = '';
	for (let i = fragments.length - 1; i >= 0; i--) {
		const fragment = fragments[i];
		if (fragment.isComment) {
			trailing = fragment.text + trailing;
		} else {
			const ws = fragment.text.match(rWhitespaceBidiTrail)![0];
			if (ws.length === fragment.text.length) {
				trailing = fragment.text + trailing;
			} else {
				trailing = ws + trailing;
				break;
			}
		}
	}

	return trimTitle(title).core === ''
		? rawTitle + rawTitlePlaceholder
		: leading + rawTitlePlaceholder + trailing;
}
