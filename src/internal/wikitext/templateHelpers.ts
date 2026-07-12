import { NewTemplateParameter } from '../../Template.js';

export const templateRegex = {
	/**
	 * Matches `^\s+`.
	 */
	leadingSpaces: /^\s+/,
};

/**
 * Finds the next template-related token in the wikitext.
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

/**
 * Processes fragments of template parameters and updates the `components` array in place.
 *
 * #### How `components` is structured:
 * - `components[0]` stores the **template title**.
 * 	- `key`: The clean title without extra characters.
 * 	- `value`: The full title, including any extra characters (e.g., `{{Template<!--1-->|arg1=}}`).
 *
 * - `components[1+]` store **template parameters**.
 * 	- `key`: The parameter key (e.g., `|1`), starting with a pipe (`|`).
 * 	- `value`: The assigned value.
 *
 * `components[1+].key` always starts with a pipe character to prevent misinterpretation
 * when an unnamed parameter has a value starting with `=` (e.g., `{{Template|=}}`).
 *
 * @param components The array storing parsed template parameters.
 * @param fragment The character(s) to add to the `components` array.
 * @param options Optional settings for handling the fragment.
 */
export function processTemplateFragment(
	components: Required<NewTemplateParameter>[],
	fragment: string,
	options: FragmentOptions = {}
): void {

	// Determine which element to modify: either a new element for a new parameter or an existing one
	const { isNonName, isNew } = options;
	const i = isNew ? components.length : Math.max(components.length - 1, 0);

	// Initialize the element if it does not exist
	if (!(i in components)) {
		components[i] = { key: '', value: '' };
	}

	// Process the fragment and update the `components` array
	let equalIndex;
	if (i === 0 && isNonName) {
		// `components[0]` handler (looking for a template title): extra characters
		components[i].value += fragment;
	} else if (i === 0) {
		// `components[0]` handler (looking for a template title): part of the title
		components[i].key += fragment;
		components[i].value += fragment;
	} else if (
		// `equalIndex` is basically 0 if found
		(equalIndex = fragment.indexOf('=')) !== -1 &&
		!components[i].key &&
		// Ignore {{=}}. `components[i].value` should end with "{{" when `equalIndex` is 0
		// TODO: This doesn't handle "<!--{{=}}-->"
		!/\{\{[\s_\u200E\u200F\u202A-\u202E]*$/.test(components[i].value) &&
		!isNonName
	) {
		// Found `=` when `key` is empty, indicating the start of a named parameter.
		components[i].key = components[i].value + fragment.slice(0, equalIndex);
		components[i].value = components[i].value.slice(components[i].key.length + 1);
	} else {
		if (!components[i].value && fragment.startsWith('|')) {
			fragment = fragment.slice(1); // Exclude the pipe that starts a template parameter
		}
		components[i].value += fragment;
	}
}