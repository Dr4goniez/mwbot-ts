import { DeepReadonly } from 'ts-essentials';
import {
	NewTemplateParameter,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	ParsedTemplate,
	ParsedTemplateInitializer,
	ParserFunctionStatic,
	VerifiedFunctionHook,
} from '../../Template.js';
import { Title, TitleOutputOptions } from '../../Title.js';
import { WikitextStatic } from '../../Wikitext.js';
import { IndexMapEntry } from './sharedHelpers.js';

/**
 * Finds the next template-related token (i.e., `{{`, `}}`, `|`, or `=`), or
 * parser-function-related token (i.e., `:` or `：`) in the wikitext.
 *
 * Returns `-1` if no token exists at or after `start`.
 */
export function findNextTemplateTokenIndex(
	wikitext: string,
	start: number,
	end = wikitext.length,
	components: DeepReadonly<TemplateComponent[]>
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

			case 61: // =
			case 124: // |
				return i;

			// Title-param separator of a parser function
			case 58: // : (1-byte colon)
			case 65306: // ： (2-byte colon)
				if (components.length < 2) {
					return i;
				}
		}
	}

	return -1;
}

const TEMPLATE_TITLE_OUTPUT_OPTIONS: TitleOutputOptions = {
	colon: true,
};

/**
 * Formats a {@link Title} for use as a template title.
 *
 * Titles in the Template namespace are emitted without their namespace prefix
 * (e.g. `Template:Foo` → `Foo`), while titles in other namespaces retain their
 * fully prefixed form.
 *
 * @param title The title to format.
 * @param NS_TEMPLATE The namespace ID of the Template namespace.
 * @returns The title formatted for template transclusion.
 */
export function formatTemplateTitle(title: Title, NS_TEMPLATE: number): string {
	return title.getNamespaceId() === NS_TEMPLATE
		? title.getMain()
		: title.getPrefixedText(TEMPLATE_TITLE_OUTPUT_OPTIONS);
}

/**
 * Updates the title-related fields of a parsed template initializer.
 *
 * `rawTitle` is regenerated from `rawTitleTemplate` by replacing the title
 * placeholder with `newTitle`, and the initializer is marked as having an
 * altered title.
 *
 * @param initializer The initializer object to update in place.
 * @param newTitle The new template title or parser function hook.
 */
export function updateInitializerTitle(initializer: ParsedTemplateInitializer, newTitle: string): void {
	initializer.title = newTitle;
	initializer.rawTitle = initializer.rawTitleTemplate.replace(rawTitlePlaceholder, newTitle);
	initializer.isTitleAltered = true;
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
 *   - `fragments`: The original title fragments in parsing order. These are later used to reconstruct
*       `rawTitleTemplate`.
 *
 * - `components[1+]` store **template parameters**.
 *   - `key`: Parameter name.
 *     - For template parameters, this stores the parameter name (without "=").
 *     - For parser functions, this is always an empty string.
 *   - `value`: The assigned value.
 */
export interface TemplateComponent extends Required<NewTemplateParameter> {
	hook?: VerifiedFunctionHook;
	/**
	 * Title fragments. Present only for `components[0]`.
	 */
	fragments?: TitleFragment[];
}

/**
 * A contiguous fragment of the original template title.
 *
 * Fragments preserve the original ordering and HTML comments so that {@link ParsedTemplateInitializer.rawTitleTemplate}
 * can later be reconstructed without consulting the original wikitext.
 */
interface TitleFragment {
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
			component.key += fragment;
		}
		component.value += fragment;

		// Preserve the original title fragments so that `rawTitleTemplate` can later be reconstructed
		component.fragments ??= [];
		component.fragments.push({
			text: fragment,
			isComment,
		});

		if (!component.key) {
			return;
		}

		const hook = verifyHook(component.key.trim());
		if (!hook) {
			return;
		}

		// ":" and "：" (potential hook-param separators) are specified in findNextTemplateTokenIndex(),
		// meaning that _parsedTemplates passes these tokens one by one without any trailing content.
		components[0].hook = hook;
		components[1] = { key: '', value: '' };
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
 * Splits a template title into leading whitespace/bidi characters, the core text,
 * and trailing whitespace/bidi characters.
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

const rawTitlePlaceholder = '\x01';

/**
 * Finalizes parsed template components.
 *
 * Besides extracting the normalized title and parameters, this function reconstructs `rawTitleTemplate`
 *  which preserves the original raw title formatting while replacing the title itself with a placeholder.
 *
 * The placeholder allows an updated title or parser-function hook to be reinserted during stringification.
 *
 * #### Example 1: Full match
 * - `title`: `' Foo '`
 * - `rawTitle`: `' Foo '`
 * - `rawTitleTemplate`: `' \x01 '`
 *
 * In {@link ParsedTemplate.stringify}, `rawTitle` is used to stringify the instance in the raw output mode.
 * Once `title` is updated in the instance, `rawTitleTemplate` is used and the new title is inserted into
 * the position of the control character to retain the original raw formatting.
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
 * Any HTML comments that interrupt the title text become part of the placeholder region and are therefore
 * not preserved independently.
 *
 * @param components Parsed template components.
 * @returns Normalized title information together with a template used to reconstruct the original raw title
 * after the title has been modified.
 */
export function parseFinalizedTemplateComponents(
	components: DeepReadonly<TemplateComponent[]>
): {
	title: string;
	rawTitle: string;
	rawTitleTemplate: string;
	hook?: VerifiedFunctionHook;
	params: Required<NewTemplateParameter>[];
} {
	const [
		// Handle edge cases where `components` is never handled by processTemplateFragment(),
		// i.e., when the template markup is "{{}}"
		titleObj = { key: '', value: '', fragments: [] },
		...params
	] = components;

	const title = titleObj.key;
	const rawTitle = titleObj.value;
	const fragments = titleObj.fragments!;

	// Full match
	if (title === rawTitle) {
		const { leading, core, trailing } = trimTitle(title);

		const rawTitleTemplate = core === ''
			// Edge case: the title consists solely of whitespace and/or HTML comments,
			// so there is no stable insertion point for the placeholder
			? rawTitle + rawTitlePlaceholder
			: leading + rawTitlePlaceholder + trailing;

		return {
			title,
			rawTitle,
			rawTitleTemplate,
			hook: titleObj.hook,
			params: params as Required<NewTemplateParameter>[],
		};
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

	const rawTitleTemplate = trimTitle(title).core === ''
		? rawTitle + rawTitlePlaceholder
		: leading + rawTitlePlaceholder + trailing;

	return {
		title,
		rawTitle,
		rawTitleTemplate,
		hook: titleObj.hook,
		params: params as Required<NewTemplateParameter>[],
	};
}
