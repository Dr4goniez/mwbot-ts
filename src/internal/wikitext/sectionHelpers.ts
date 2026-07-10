import type { Section, Tag } from "../../Wikitext.js";

/**
 * Regular expressions to parse `<hN>` tags and `==heading==` markups.
 */
export const headingRegex = {
	/**
	 * Capturing groups:
	 * * `$1`: Heading level (1 through 6)
	 */
	tag: /^h([1-6])$/,
	/**
	 * Matches potential wikitext-style headings with comment placeholders.
	 *
	 * Examples of matched inputs:
	 * `\x01(1)\x02\x02\x02\x02\x02 == heading ==<extra chars>`
	 *
	 * Comment tags are replaced with control sequences like `\x01{n}\x02+`.
	 *
	 * Capturing groups:
	 * * `$1`: Leading equals or control chars (e.g. `==`, or `\x01...\x02`)
	 * * `$2`: Heading text (can include inline markup)
	 * * `$3`: Trailing equals or control chars
	 * * `$4`: Trailing space characters (must be [\t\n\u0020\u00a0])
	 *
	 * Notes on wiki heading parsing:
	 * * `== 1 ===` → `<h2>1 =</h2>` (left: 2, right: 3)
	 * * `=== 1 ==` → `<h2>= 1</h2>` (left: 3, right: 2)
	 * * `== 1 ==\S+` → Ignored as a valid heading (due to extra non-space characters)
	 * * `<!--string-->== 1 ==` → `<h2>1</h2>` (comment is ignored)
	 * * `== 1 ==<!--string-->` → `<h2>1</h2>`
	 * * `=<!--string-->= 1 ==` → `<h1>1</h1>`
	 * * `======= 1 =======` → `<h6>= 1 =</h6>` (left: 7, right: 7)
	 */
	candidate: /^([\x01\x02\d=]+)(.+?)([\x01\x02\d=]+)(.*)$/gm,
	/**
	 * Strict heading matcher, applied after restoring comments.
	 *
	 * Uses same capturing groups as `candidate`.
	 */
	heading: /^(=+)(.+?)(=+)(.*)$/,
	/**
	 * Matches whitespace characters allowed after a heading.
	 *
	 * This is not the same as the JavaScript `\s`, which is equivalent to
	 * `[\t\n\v\f\r\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]`.
	 */
	whitespace: /[\t\u0020\u00a0]+/g,
	/**
	 * Matches left-side heading markers interrupted by comment placeholders.
	 *
	 * Example: `=<!--c-->=`
	 */
	interruptedLeft: /^(=+)(?:\x01\d+\x02+)+=/,
	/**
	 * Matches right-side heading markers interrupted by comment placeholders.
	 *
	 * Example: `=<!--c-->=`
	 */
	interruptedRight: /=(?:\x01\d+\x02+)+(=+)$/,
};

const rComments = /<!--.*?-->/g;

/**
 * Removes (all) `<!-- comment tags -->` from a string.
 *
 * @param str
 * @returns
 */
export function removeComments(str: string): string {
	return str.replace(rComments, '');
}

interface CommentPlaceholderData {
	/**
	 * The generated placeholder.
	 */
	placeholder: string;
	/**
	 * The original HTML comment text.
	 */
	text: string;
	/**
	 * The cumulative length difference introduced by all preceding placeholders.
	 */
	cumulativeOffset: number;
	/**
	 * The start index of the placeholder in the wikitext with placeholders.
	 */
	index: number;
}

const rPlaceholdersAll = /\x01\d+\x02/g;

/**
 * Replaces HTML comment tags with temporary placeholders and provides utilities
 * to restore, remove, and map them back to their original positions.
 *
 * This allows section headings containing comments (e.g. `==<!--c-->A==`) to be
 * parsed without losing the original source positions.
 */
export class CommentPlaceholderManager {

	/**
	 * Maps placeholders (e.g. `\x010\x02`) to their original comments.
	 */
	private readonly map = new Map<string, CommentPlaceholderData>();
	/**
	 * Placeholder data in document order.
	 */
	private readonly placeholders: CommentPlaceholderData[] = [];
	/**
	 * The input wikitext where HTML comments are placed with placeholders.
	 */
	private wikitext: string;

	/**
	 * @param wikitext The original wikitext.
	 * @param tags Parsed tags from the same wikitext.
	 */
	constructor(wikitext: string, tags: ReadonlyArray<Tag>) {
		/**
		 * Indices of nested comments that should not be replaced separately.
		 */
		const nestedComments = new Set<number>();
		let cumulativeOffset = 0;

		for (const tag of tags) {
			// Replace comment tags with placeholders
			if (tag.name === '!--' && !nestedComments.has(tag.index)) {

				// Skip nested comments, which are replaced as part of their parent
				for (const index of tag.children) {
					if (tags[index].name === tag.name) {
						nestedComments.add(index);
					}
				}

				const comment = tag.text;
				const placeholder = '\x01' + this.map.size + '\x02';

				// Position of the placeholder in the placeholder-expanded wikitext
				const index = tag.startIndex + cumulativeOffset;

				const data: CommentPlaceholderData = {
					placeholder,
					text: comment,
					cumulativeOffset,
					index,
				};

				this.map.set(placeholder, data);
				this.placeholders.push(data);

				cumulativeOffset += placeholder.length - comment.length;

				wikitext =
					wikitext.slice(0, index) +
					placeholder +
					wikitext.slice(index + comment.length);
			}
		}

		this.wikitext = wikitext;
	}

	/**
	 * Gets the input wikitext where HTML comments are placed with placeholders.
	 */
	getText(): string {
		return this.wikitext;
	}

	/**
	 * Restores all comment placeholders in a string.
	 *
	 * @param str A string containing placeholders.
	 * @returns The string with original HTML comments restored.
	 */
	restore(str: string): string {
		rPlaceholdersAll.lastIndex = 0;

		let m: RegExpExecArray | null;
		while ((m = rPlaceholdersAll.exec(str))) {
			const placeholder = m[0];
			const content = this.map.get(placeholder)!.text;

			str =
				str.slice(0, m.index) +
				content +
				str.slice(m.index + placeholder.length);

			rPlaceholdersAll.lastIndex += (content.length - placeholder.length);
		}

		return str;
	}

	/**
	 * Removes all comment placeholders from a string.
	 *
	 * Unlike {@link restore}, this discards the corresponding comments rather than
	 * replacing them.
	 *
	 * @param str A string containing placeholders.
	 * @returns The string with placeholders removed.
	 */
	remove(str: string): string {
		rPlaceholdersAll.lastIndex = 0;

		let m: RegExpExecArray | null;
		while ((m = rPlaceholdersAll.exec(str))) {
			const placeholder = m[0];

			str = str.slice(0, m.index) + str.slice(m.index + placeholder.length);

			rPlaceholdersAll.lastIndex -= placeholder.length;
		}

		return str;
	}

	/**
	 * Converts an index in the placeholder-expanded wikitext to the corresponding
	 * index in the original wikitext.
	 *
	 * @param index The index in the placeholder-expanded wikitext.
	 * @returns The corresponding index in the original wikitext.
	 */
	getOriginalIndex(index: number): number {
		let last: CommentPlaceholderData | undefined;
		for (const data of this.placeholders) {
			if (data.index > index) {
				break;
			}
			last = data;
		}
		if (!last) {
			return index;
		}
		return index - last.cumulativeOffset;
	}
}

/**
 * Assigns the `parent` and `children` relationships for parsed sections.
 *
 * Section hierarchy is determined from heading levels. The top section
 * (`index = 0`) is treated as a virtual root and is never assigned as the
 * parent of another section.
 *
 * @param sections Parsed sections in document order.
 */
export function assignSectionKinships(sections: Section[]): void {
	const levelStack: (Section | undefined)[] = [];

	for (const sec of sections.slice(1)) { // Ignore the top section
		levelStack.length = sec.level;

		for (let i = sec.level - 1; i >= 1; i--) {
			const parent = levelStack[i];
			if (parent) {
				sec.parent = parent.index;
				(parent.children as Set<number>).add(sec.index);
				break;
			}
		}

		levelStack[sec.level] = sec;
	}
}