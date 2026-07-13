import {
	NewTemplateParameter,
	ParsedParserFunction,
	ParsedTemplateOptions,
	ParserFunctionStatic,
	VerifiedFunctionHook,
} from '../../Template.js';
import { DoubleBracedClasses } from '../../Wikitext.js';
import { addTemplateIndexMap, IndexMap } from './sharedHelpers.js';

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
	 * Whether the fragment is **not** part of a template name or template parameter name.
	 * This applies when the fragment represents a value or another non-name component.
	 */
	isNonName?: boolean;
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

	// Determine which element to modify: either a new element for a new parameter or an existing one
	const { isNonName, isNew } = options;
	const i = isNew ? components.length : Math.max(components.length - 1, 0);
	components[i] ??= { key: '', value: '' };
	const component = components[i];

	const isTitleFragment = i === 0;
	if (isTitleFragment) {
		if (!isNonName) {
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

		// Locate the parser function hook within the raw title while preserving any skipped
		// characters (comments, etc.).
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

	// Parameter fragment
	let equalIndex = -1;
	if (
		!components[0].hook &&
		!isNonName &&
		!component.key &&
		// Ignore {{=}}. `component.value` should end with "{{" when `equalIndex` is 0
		// TODO: This doesn't handle "<!--{{=}}-->"
		!rOpeningDoubleBraceEnd.test(component.value)
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
 * Repairs parsed templates containing `<gallery>` tags.
 *
 * Gallery tags may contain pipe characters that are not template parameter separators.
 * This function reparses affected templates and recreates them with corrected parameter lists.
 *
 * @param indexMap Wikitext index map.
 * @param templates Parsed templates to repair in place.
 * @param wikitext Original wikitext.
 * @param verifyHook {@link ParserFunctionStatic#verify}.
 * @param options Template parsing options.
 */
export function repairGallery(
	indexMap: IndexMap,
	templates: DoubleBracedClasses[],
	wikitext: string,
	verifyHook: ParserFunctionStatic['verify'],
	options: ParsedTemplateOptions
) {

	// Collect the start and end indices of gallery tags containing "|"
	// Note: addTagIndexMap() has already filtered out gallery tags that don't contain any pipe
	const galleryRanges: { start: number; end: number }[] = [];
	for (const [index, obj] of Object.entries(indexMap)) {
		if (obj.type === 'gallery') {
			const start = Number(index);
			const end = start + obj.text.length;
			galleryRanges.push({ start, end });
		}
	}
	if (!galleryRanges.length) {
		return;
	}

	const templateIndexMap: IndexMap = Object.create(null);
	addTemplateIndexMap(templateIndexMap, templates);

	// Check each parsed template and if it contains a gallery tag, modify the parsing result
	let galleryRangePointer = 0;
	for (const [index, template] of templates.entries()) {

		while (
			galleryRangePointer < galleryRanges.length &&
			galleryRanges[galleryRangePointer].end <= template.startIndex
		) {
			galleryRangePointer++;
		}

		const range = galleryRanges[galleryRangePointer];
		if (!range) {
			break;
		}
		if (template.startIndex >= range.start || range.end >= template.endIndex) {
			continue;
		}

		// Replace all pipes with placeholders. Pipes outside gallery tags are restored later
		// and treated as parameter separators.
		const isParserFunction = isParsedParserFunction(template);
		let pipe: string;
		let titlePart: string;
		if (isParserFunction) {
			pipe = ''; // rawHook ends with ":"
			titlePart = template.rawHook;
		} else {
			pipe = '|';
			titlePart = template.rawTitle;
		}
		const paramRange = {
			start: template.startIndex + 2 /* {{ */ + titlePart.length + pipe.length,
			end: template.endIndex - 2,
		};
		let paramText = wikitext.slice(paramRange.start, paramRange.end);
		if (!paramText) {
			continue;
		}
		paramText = PipePlaceholderManager.replace(paramText);

		let inGalleryPointer = galleryRangePointer;
		const inGallery = (index: number) => {
			while (
				inGalleryPointer < galleryRanges.length &&
				galleryRanges[inGalleryPointer].end < index
			) {
				inGalleryPointer++;
			}

			const range = galleryRanges[inGalleryPointer];
			return !!range && range.start <= index && index < range.end;
		};

		// `components[0]` represents the title part but it's irrelevant here
		const components: TemplateComponent[] = [
			// For ParsedParserFunction instances, pretend this is a parser function
			// so processTemplateFragment() ignores "=" as a parameter-name delimiter
			{ key: '', value: '', hook: isParserFunction ? {} as VerifiedFunctionHook : undefined },
			{ key: '', value: '' },
		];
		for (let j = 0; j < paramText.length; j++) {
			const realIndex = j + paramRange.start;

			const indexMapEntry = indexMap[realIndex];
			if (indexMapEntry && indexMapEntry.type !== 'gallery') {
				// Skip over skip tags, parameters, and wikilinks
				const text = indexMapEntry.text;
				processTemplateFragment(components, text, verifyHook, { isNonName: true });
				j += text.length - 1;
				continue;
			}

			const templateIndexMapEntry = templateIndexMap[realIndex];
			if (templateIndexMapEntry) {
				// Skip over nested templates
				const text = templateIndexMapEntry.text;
				processTemplateFragment(components, text, verifyHook, { isNonName: true });

				// Advance the gallery pointer after skipping the nested template
				const nextIndex = realIndex + text.length;
				inGallery(nextIndex - 1);

				j += text.length - 1;
				continue;
			}

			const char = paramText[j];
			if (inGallery(realIndex)) {
				// If we're in a gallery tag, register this character without restoring pipes
				processTemplateFragment(components, char, verifyHook);
			} else if (PipePlaceholderManager.is(char)) {
				// If we're NOT in a gallery tag and if this is '\x02', restore the pipe
				processTemplateFragment(components, '|', verifyHook, { isNew: true });
			} else {
				// Just part of the parameter
				processTemplateFragment(components, char, verifyHook);
			}
		}

		// Restore pipes in the newly parsed params
		const params = components.slice(1).map(({ key, value }) => {
			return {
				key: PipePlaceholderManager.restore(key),
				value: PipePlaceholderManager.restore(value),
			};
		});

		// Update `params` in `_initializer` and recreate instance
		template._setInitializer({ params });
		const cloneOptions = isParserFunction ? undefined : options;
		templates[index] = template._clone(cloneOptions);
	}
}

function isParsedParserFunction(template: object): template is ParsedParserFunction {
	return 'rawHook' in template;
}

class PipePlaceholderManager {

	private static readonly rPipes = /\|/g;
	private static readonly rPlaceholders = /\x02/g;

	static replace(str: string): string {
		return str.replace(PipePlaceholderManager.rPipes, '\x02');
	}

	static restore(str: string): string {
		return str.replace(PipePlaceholderManager.rPlaceholders, '|');
	}

	static is(character: string): character is '\x02' {
		return character === '\x02';
	}
}