import {
	NewTemplateParameter,
	ParserFunctionStatic,
	VerifiedFunctionHook,
} from '../../Template.js';
import { WikitextStatic } from '../../Wikitext.js';
import { IndexMapEntry } from './sharedHelpers.js';

export const templateRegex = {
	/**
	 * Matches `^\s+`.
	 */
	leadingSpaces: /^\s+/,
};

/**
 * Finds the next template-related token in the wikitext (i.e., `{{`, `}}`, `|`, or `=`).
 *
 * Returns `-1` if no token exists at or after `start`.
 */
export function findNextTemplateTokenIndex(
	wikitext: string,
	start: number,
	end = wikitext.length
): number {

	for (let i = start; i < end; i++) {
		switch (wikitext.charCodeAt(i)) {
			case 123: // {
				if (i + 1 < end && wikitext.charCodeAt(i + 1) === 123) {
					return i;
				}
				break;

			case 125: // }
				if (i + 1 < end && wikitext.charCodeAt(i + 1) === 125) {
					return i;
				}
				break;

			case 124: // |
				return i;

			case 61: // =
				return i;
		}
	}

	return -1;
}

/**
 * Returns whether `'='` characters inside the given expression should be
 * ignored as template parameter key-value separators.
 *
 * In MediaWiki, `'='` is not treated as a separator when it appears inside:
 *
 * - parser extension tags (including skip tags)
 * - transclusion control tags (`<includeonly>`, `<noinclude>`, `<onlyinclude>`)
 * - `<translate>` and `<tvar>` tags provided by the Translate extension
 * - parameters
 * - wikilinks
 *
 * HTML tags do not fall into this category, so `'='` inside ordinary HTML
 * tags is still recognized as a template parameter separator.
 *
 * @param indexMapEntry An indexMap entry from
 *   `getIndexMap({ gallery: true, parameters: true, wikilinks_fuzzy: true })`.
 * @param isValidTag {@link WikitextStatic.isValidTag}.
 */
export function shouldIgnoreEquals(
	indexMapEntry: IndexMapEntry,
	isValidTag: WikitextStatic['isValidTag']
): boolean {

	if (indexMapEntry.type !== 'tag') {
		return true;
	}

	const tagName = indexMapEntry.tagName!;

	if (isValidTag(tagName, 'transclusion')) {
		return true;
	}
	if (
		(tagName === 'translate' || tagName === 'tvar') &&
		isValidTag(tagName, 'extension')
	) {
		return true;
	}

	// All remaining parser extension tags ignore '=' as key-value separators
	return isValidTag(tagName, 'skip') || isValidTag(tagName, 'extension');
}

/**
 * Used in {@link processTemplateFragment}.
 *
 * - `components[0]` stores the **template title**.
 *   - `key`: The clean title without extra characters.
 *   - `value`: The full title, including any extra characters (e.g., `{{Template<!--1-->|arg1=}}`).
 *   - `hook`: A verified parser function hook object if the title represents a function hook.
 *
 * - `components[1+]` store **template parameters**.
 *   - key: Parameter name.
 *     - For template parameters, this stores the parameter name (without "=").
 *     - For parser functions, this is always an empty string.
 *   - `value`: The assigned value.
 */
export type TemplateComponent = Required<NewTemplateParameter> & { hook?: VerifiedFunctionHook };

/**
 * Options for {@link processTemplateFragment}.
 */
interface FragmentOptions {
	/**
	 * Whether `'='` tokens should **not** be recognized as key-value separators.
	 */
	ignoreEquals?: boolean;
	/**
	 * Whether the fragment is a comment tag. If `true`, the fragment is not registered
	 * into the components for clean titles.
	 */
	isComment?: boolean;
	/**
	 * Whether the passed fragment starts a new template parameter.
	 * This is used when a fragment marks the beginning of a new parameter within the template.
	 */
	isNew?: boolean;
}

const rOpeningDoubleBraceEnd = /\{\{[\s_\u200E\u200F\u202A-\u202E]*$/;

/**
 * Processes fragments of template parameters and updates the `components` array in place.
 *
 * @param components The array storing parsed template parameters. See {@link TemplateComponent}.
 * @param fragment The character(s) to add to the `components` array.
 * @param verifyHook {@link ParserFunctionStatic#verify}.
 * @param options Optional settings for handling the fragment.
 */
export function processTemplateFragment(
	components: TemplateComponent[],
	fragment: string,
	verifyHook: ParserFunctionStatic['verify'],
	options: FragmentOptions = {}
): void {
	const {
		isComment = false,
		isNew = false,
		ignoreEquals = false,
	} = options;

	// Determine which element to modify: either a new element for a new parameter or an existing one
	const i = isNew ? components.length : Math.max(components.length - 1, 0);
	const isNewComponent = components[i] === undefined;
	components[i] ??= { key: '', value: '' };
	const component = components[i];

	if (isNewComponent && i >= 2) {
		const last = components[i - 1];
		last.key = PipePlaceholderManager.restore(last.key);
		last.value = PipePlaceholderManager.restore(last.value);
	}

	const isTitleFragment = i === 0;
	if (isTitleFragment) {
		if (!isComment) {
			component.key += fragment; // Clean title
		}
		component.value += fragment; // Full title

		if (!component.key) {
			return;
		}

		// Check whether components[0].key (clean title) represents a parser function.
		// If it does, separate the hook and the first argument (e.g., "#if:1" -> "#if:" + "1")
		// because the argument delimiter is not a pipe character in this case.
		const { key, value } = component;
		const hook = verifyHook(key.trim());
		if (!hook) {
			return;
		}

		// Locate the parser function hook within the raw title while preserving
		// skipped fragments (such as HTML comments)
		let matchIndex = 0;
		for (let i = 0; i < value.length; i++) {
			if (value[i] === hook.match[matchIndex]) {
				matchIndex++;
				if (hook.match[matchIndex + 1] === undefined) {
					break;
				}
			}
		}

		components[0] = {
			key: hook.match,
			value: value.slice(0, matchIndex + 1),
			hook,
		};
		components[1] = {
			key: '',
			value: value.slice(matchIndex + 1),
		};
		return;
	}

	// Parameter fragment (title has already been parsed)
	let equalIndex = -1;
	if (
		!components[0].hook &&
		!isComment &&
		!ignoreEquals &&
		!component.key &&
		!rOpeningDoubleBraceEnd.test(component.value) // Ignore {{=}} transclusions
	) {
		equalIndex = fragment.indexOf('=');
	}
	if (equalIndex !== -1) {
		// Found `=` when `key` is empty, indicating the start of a named parameter.
		component.key = component.value + fragment.slice(0, equalIndex);
		component.value = component.value.slice(component.key.length + 1);
	} else {
		if (!component.value && fragment.startsWith('|')) {
			// Exclude the pipe that starts a template parameter
			fragment = fragment.slice(1);
		}
		component.value += fragment;
	}
}

/**
 * Restores pipe placeholders in the last template component.
 *
 * This is intended for incremental template parsing, where only the current
 * component needs to be finalized before a new parameter begins.
 *
 * @param components Template components being constructed.
 */
export function restoreLastTemplateComponent(components: TemplateComponent[]): void {
	if (components.length < 2) {
		return;
	}
	const last = components.at(-1)!;
	last.key = PipePlaceholderManager.restore(last.key);
	last.value = PipePlaceholderManager.restore(last.value);
}

export class PipePlaceholderManager {

	private static readonly pipe = '|';
	private static readonly rPipes = /\|/g;
	private static readonly placeholder = '\x02';
	private static readonly rPlaceholders = /\x02/g;

	static replace(str: string): string {
		return str.replace(this.rPipes, this.placeholder);
	}

	static restore(str: string): string {
		return str.replace(this.rPlaceholders, this.pipe);
	}
}
