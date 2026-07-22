import { MwbotError } from '../../MwbotError.js';
import { Title, TitleStatic } from '../../Title.js';

/**
 * Validates the given wikilink title and returns it as a Title instance.
 *
 * @param title The title as a string or a Title instance to validate as a wikilink title.
 * @param Title The lazy-loaded Title class.
 * @returns A Title instance. If `title` is already a Title instance, a clone is returned.
 * @throws {MwbotError} If:
 * * `title` is neither a string nor a Title instance. (`typemismatch`)
 */
export function validateWikilinkTitle(title: string | Title, Title: TitleStatic): Title {
	if (typeof title === 'string') {
		// TODO: Handle "/" (subpage) and "#" (in-page section)?
		title = new Title(title);
	} else if (title instanceof Title) {
		title = title._clone(new WeakMap());
	} else {
		throw new MwbotError(
			'fatal',
			{
				code: 'typemismatch',
				info: `"title" must be either a string or a Title instance.`,
			},
			{ title }
		);
	}
	return title;
}

/**
 * Serializes a wikilink from its parts.
 *
 * **This function does not validate or normalize either part.** The only exception
 * is that an empty string passed as `right` is treated as if it were omitted.
 *
 * @param left The left part of the wikilink.
 * @param right The optional right part of the wikilink. An empty string is ignored.
 * @returns A serialized wikilink (e.g., `[[Foo|Bar]]`).
 */
export function serializeWikilink(left: string, right?: string): string {
	const ret = ['[[', left];
	if (right) {
		ret.push(`|${right}`);
	}
	ret.push(']]');
	return ret.join('');
}
