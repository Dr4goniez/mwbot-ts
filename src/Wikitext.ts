/**
 * This module is attached to {@link Mwbot.Wikitext} as an instance member.
 *
 * @module
 */

import { MwbotError } from './error';
import type { Mwbot } from './mwbot';
type Title = InstanceType<Mwbot['Title']>;

/**
 * @internal
 */
export default function(mw: Mwbot) {

	/**
	 * Regular expressions for matching HTML tags (including comment tags).
	 *
	 * Accepted formats:
	 * ```html
	 * <foo >	<!-- No whitespace between "<" and "foo" -->
	 * </foo >	<!-- No whitespace between "<" and "/" -->
	 * <foo />	<!-- No whitespace between "/" and ">" -->
	 * ```
	 */
	const tagRegex = {
		/**
		 * Matches a start tag.
		 * * `$0`: The full start tag (e.g. `<!--` or `<tag>`)
		 * * `$1`: `--` (undefined for normal tags)
		 * * `$2`: `tag` (undefined for comment tags)
		 *
		 * NOTE: This regex also matches self-closing tags.
		 */
		start: /^<!(--)|^<(?!\/)([^>\s]+)(?:\s[^>]*)?>/,
		/**
		 * Matches an end tag.
		 * * `$0`: The full end tag (e.g. `-->` or `</tag>`)
		 * * `$1`: `--` (undefined for normal tags)
		 * * `$2`: `tag` (undefined for comment tags)
		 */
		end: /^(--)>|^<\/([^>\s]+)(?:\s[^>]*)?>/,
		/**
		 * Matches the names of void tags. `<source>` is excluded because it is not considered void in wikitext.
		 * @see https://developer.mozilla.org/en-US/docs/Glossary/Void_element
		 */
		void: /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|track|wbr)$/,
		/**
		 * Matches a self-closing tag.
		 */
		self: /\/>$/,
	};
	/**
	 * Regular expressions to parse `==heading==`s.
	 *
	 * Notes on the wiki markup of headings:
	 * * `== 1 ===`: `<h2>1 =</h2>` (left equals: 2, right equals: 3)
	 * * `=== 1 ==`: `<h2>= 1</h2>` (left equals: 3, right equals: 2)
	 * * `== 1 ==\S+`: Not recognized as the beginning of a section (but see below)
	 * * `== 1 ==<!--string-->`: `<h2>1</h2>`
	 * * `======= 1 =======`: `<h6>= 1 =</h6>` (left equals: 7, right equals: 7)
	 *
	 * Capture groups:
	 * * `$1`: Left equals
	 * * `$2`: Heading text
	 * * `$3`: Right equals
	 * * `$4`: Remaining characters
	 *
	 * In `$4`, the only characters that can appear are:
	 * * `[\t\n\u0020\u00a0]` (i.e. tab, new line, space, and non-breaking space)
	 *
	 * Note that this is not the same as the JS `\s`, which is equivalent to
	 * `[\t\n\v\f\r\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]`.
	 */
	const sectionRegex = {
		heading: /^(=+)(.+?)(=+)([^\n]*)\n?$/gm,
		whitespace: /[\t\u0020\u00a0]+/g
	};

	/**
	 * TODO: Add documentation
	 */
	class Wikitext {

		/**
		 * The main wikitext content of a Wikitext instance.
		 *
		 * This should be read-only, but the class internally needs to be able to update it;
		 * hence the private property. Use {@link content} to get a copy of this property.
		 */
		private _content: string;
		/**
		 * Returns the wikitext content of the instance.
		 */
		get content(): string {
			return this._content;
		}
		/**
		 * HTML tags parsed from the wikitext.
		 *
		 * Use {@link tags} to get a deep copy of this property.
		 */
		private _tags: Tag[];
		/**
		 * Returns a deep copy of the parsed HTML tags.
		 */
		get tags(): Tag[] {
			return this._tags.map((obj) => Object.create(
				Object.getPrototypeOf(obj),
				Object.getOwnPropertyDescriptors(obj)
			));
		}
		/**
		 * The names of tags in which elements shouldn't be parsed.
		 *
		 * The default values are `!--`, `nowiki`, `pre`, `syntaxhighlight`, `source`, and `math`.
		 *
		 * See also {@link WikitextOptions}.
		 */
		private skipTags: string[];

		/**
		 * Create a `Wikitext` instance.
		 * @param content A wikitext content.
		 * @param options Options for the initialization of the instance.
		 */
		constructor(content: string, options: WikitextOptions = {}) {

			this._content = content;

			// Parse the wikitext for HTML tags as soon as the instance is initialized,
			// because they are necessary for other parsing operations
			this._tags = Wikitext.parseTags(content);

			// Initialize the names of tags in which elements shouldn't be parsed
			const defaultSkipTags =
				options.overwriteSkipTags ?
				[] :
				['!--', 'nowiki', 'pre', 'syntaxhighlight', 'source', 'math'];
			if (options.skipTags) {
				defaultSkipTags.push(
					...options.skipTags.reduce((acc: string[], el: unknown) => {
						if (typeof el === 'string') {
							acc.push(el.toLowerCase());
						}
						return acc;
					}, [])
				);
			}
			this.skipTags = [...new Set(defaultSkipTags)];

		}

		/**
		 * List of valid HTML tag names that can be used in wikitext.
		 * All tag names are in lowercase.
		 */
		private static readonly _validTags = [
			/**
			 * Standard HTML tags
			 * @see https://www.mediawiki.org/wiki/Help:HTML_in_wikitext
			 */
			'abbr', 'b', 'bdi', 'bdo', 'big', 'blockquote', 'br', 'caption', 'cite', 'code', 'data', 'dd', 'del',
			'dfn', 'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'ins', 'kbd', 'li',
			'link', 'mark', 'meta', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span',
			'strong', 'sub', 'sup', 'table', 'td', 'th', 'time', 'tr', 'u', 'ul', 'var', 'wbr',
			// Deprecated HTML tags
			'center', 'font', 'rb', 'rtc', 'strike', 'tt',
			/**
			 * MediaWiki parser extension tags
			 * @see https://www.mediawiki.org/wiki/Parser_extension_tags
			 */
			'categorytree', 'ce', 'chem', 'charinsert', 'gallery', 'graph', 'hiero', 'imagemap', 'indicator',
			'inputbox', 'langconvert', 'mapframe', 'maplink', 'math', 'nowiki', 'poem', /*'pre',*/ 'ref', 'references',
			'score', 'section', 'source', 'templatedata', 'timeline',
			// Other MediaWiki tags, added by extensions
			'dynamicpagelist', 'languages', 'rss', 'talkpage', 'thread', 'html',
			// Special MediaWiki inclusion/exclusion tags
			'includeonly', 'noinclude', 'onlyinclude',
			// Tags from Extension:Translate
			'translate', 'tvar',
			// Comment tag
			'!--'
		];

		/**
		 * Returns a list of valid HTML tag names that can be used in wikitext.
		 * @returns Array of tag names (all elements are in lowercase).
		 */
		static get validTags(): string[] {
			return Wikitext._validTags.slice();
		}

		/**
		 * Check whether a given tag name is valid in wikitext.
		 * @param tagName The tag name to check.
		 * @returns
		 */
		static isValidTag(tagName: string): boolean {
			return Wikitext._validTags.includes(String(tagName).toLowerCase());
		}

		/**
		 * Parse a wikitext for HTML tags.
		 * @param wikitext
		 * @returns
		 */
		private static parseTags(wikitext: string): Tag[] {

			/**
			 * Array to store unclosed start tags that need matching end tags
			 */
			const startTags: StartTag[] = [];

			// Parse the wikitext string by checking each character
			const parsed: Tag[] = [];
			for (let i = 0; i < wikitext.length; i++) {

				let m;
				const wkt = wikitext.slice(i);

				// If a start tag is found
				if ((m = tagRegex.start.exec(wkt))) {

					const nodeName = (m[1] || m[2]).toLowerCase();
					const selfClosing = tagRegex.self.test(m[0]);

					// Check if the tag is a void tag
					if (tagRegex.void.test(nodeName)) {
						// Add the void tag to the stack immediately
						// In this case it doesn't matter whether the tag closes itself or not
						parsed.push(
							createVoidTagObject(nodeName, m[0], i, startTags.length, selfClosing)
						);
					} else {
						// Store non-void start tags for later matching with end tags.
						// NOTE: Self-closing tags are invalid in HTML5, but MediaWiki seems to apply
						// some crazy conversions sometimes. At least, in a markup like:
						// <span style="color:blue;">aaa<span style="color:red;" />bbb</span>ccc</span>
						// "bbb" is colored red, indicating that the self-closure is ignored.
						startTags.unshift({
							name: nodeName,
							startIndex: i,
							endIndex: i + m[0].length,
							selfClosing
						});
					}

					// Skip ahead by the length of the matched tag to continue parsing
					i += m[0].length - 1;

				} else if ((m = tagRegex.end.exec(wkt))) {

					// If an end tag is found, attempt to match it with the corresponding start tag
					const nodeName = (m[1] || m[2]).toLowerCase();
					const endTag = m[0];

					// Different treatments for when this is the end of a void tag or a normal tag
					if (tagRegex.void.test(nodeName)) {
						if (nodeName === 'br') {
							// MediaWiki converts </br> to <br>
							// Void start tags aren't stored in "startTags" (i.e. there's no need to look them up in the array)
							parsed.push(
								createVoidTagObject(nodeName, m[0], i, startTags.length, false)
							);
						} else {
							// Do nothing
						}
					} else if (startTags.find(({name}) => name === nodeName)) {
						// Ensure there's a matching start tag stored; otherwise, skip this end tag

						let closedTagCnt = 0;

						// Check the collected start tags
						startTags.some((start) => { // The most recenly collected tag is at index 0 (because of unshift)

							// true when e.g. <span></span>, false when e.g. <span><div></span>
							const startTagMatched = start.name === nodeName;
							// Get the last index of this end tag ("</span>|") or that of the unclosed tag ("<div>|</span>")
							const endIndex = startTagMatched ? i + endTag.length : i;
							const startTagName = sanitizeNodeName(start.name); // Sanitize the tag name, "--" becomes "!--"

							parsed.push({
								name: startTagName, // Can be the name of an unclosed tag
								get text() {
									return this.start + (this.content || '') + (this.unclosed ? '' : this.end);
								},
								start: wikitext.slice(start.startIndex, start.endIndex),
								content: wikitext.slice(start.endIndex, endIndex - (startTagMatched ? endTag.length : 0)),
								// If we've found an unclosed tag, supplement an end tag for it
								// NOTE: No need to handle comment tags here because they aren't closed unless closed
								// But they nevertheless need to be handled when we get out of the iteration
								end: !startTagMatched ? `</${startTagName}>` : endTag,
								startIndex: start.startIndex,
								endIndex,
								// closedTagCnt being more than 0 means we forcibly closed unclosed tags in the previous loops.
								// But we have yet to remove the proccessed start tags, so we need to subtract the number of
								// the processed tags to calculate the nesting level properly
								nestLevel: startTags.length - 1 - closedTagCnt,
								void: false,
								unclosed: !startTagMatched,
								selfClosing: start.selfClosing
							});
							closedTagCnt++;

							// Exit the loop when we find a start-end pair
							if (startTagMatched) {
								return true;
							}
						});

						// Remove the matched start tags from the stack
						startTags.splice(0, closedTagCnt);

					}

					i += m[0].length - 1;

				}
			}

			// Handle any unclosed tags left in the stack
			startTags.forEach(({name, startIndex, endIndex, selfClosing}, i, arr) => {
				const startTagName = sanitizeNodeName(name);
				parsed.push({
					name: startTagName,
					get text() {
						return this.start + (this.content || '') + (this.unclosed ? '' : this.end);
					},
					start: wikitext.slice(startIndex, endIndex),
					content: wikitext.slice(endIndex, wikitext.length),
					// Supplement end tags for unclosed tags, including comment tags
					end: startTagName !== '!--' ? `</${startTagName}>` : '-->',
					startIndex,
					endIndex: wikitext.length,
					nestLevel: arr.length - 1 - i,
					void: false,
					unclosed: true,
					selfClosing
				});
			});

			// Sort the parsed tags based on their positions in the wikitext and return
			return parsed.sort((obj1, obj2) => {
				if (obj1.startIndex < obj2.startIndex) {
					return -1;
				} else if (obj2.endIndex < obj1.endIndex) {
					return 1;
				} else {
					return 0;
				}
			});

		}

		/**
		 * Parse the wikitext content for HTML tags.
		 * @param config Config to filter the output.
		 * @returns
		 */
		parseTags(config: ParseTagsConfig = {}): Tag[] {
			let tags = this.tags;
			if (typeof config.namePredicate === 'function') {
				tags = tags.filter(({name}) => config.namePredicate!(name));
			}
			if (typeof config.tagPredicate === 'function') {
				tags = tags.filter((obj) => config.tagPredicate!(obj));
			}
			return tags;
		}

		/**
		 * Modify tags in the wikitext content.
		 *
		 * For example:
		 * ```typescript
		 * // Close unclosed tags
		 * const wkt = new mwbot.Wikitext('<span>a<div><del>b</span><span>c');
		 * const oldContent = wkt.content;
		 * const newContent = wkt.modifyTags(
		 * 	(tags) => {
		 * 		return tags.reduce((acc: (string | null)[], obj) => {
		 * 			if (obj.unclosed) { // An end tag is missing
		 * 				acc.push(obj.text + obj.end); // Register the new tag text
		 * 			} else {
		 * 				acc.push(null); // Register null for no change
		 * 			}
		 * 			return acc;
		 * 		}, []);
		 * 	}
		 * );
		 * if (oldContent !== newContent) {
		 * 	console.log(newContent);
		 * 	// Output: <span>a<div><del>b</del></div></span><span>c</span>
		 * }
		 * ```
		 *
		 * Note that {@link content} and {@link tags} will be updated based on the modification.
		 * After running this method, **do not re-use copies of them initialized before running this method**.
		 *
		 * @param modificationPredicate
		 * A predicate that specifies how the tags should be modified. This is a function that takes an array of
		 * tag objects and returns an array of strings or `null`. Each string element represents the new content
		 * for the corresponding tag, while `null` means no modification for that tag.
		 * @param outputTags
		 * Whether to return (a deep copy of) an array of modified tag objects.
		 * @returns
		 * The modified wikitext content as a string, or an array of tag objects, depending on whether `outputTags` is true.
		 * @throws {MwbotError}
		 * If the length of the array returned by `modificationPredicate` does not match that of the "tags" array.
		 */
		modifyTags(modificationPredicate: TagModificationPredicate, outputTags?: false): string;
		modifyTags(modificationPredicate: TagModificationPredicate, outputTags: true): Tag[];
		modifyTags(modificationPredicate: TagModificationPredicate, outputTags = false): Tag[] | string {

			// Get text modification settings
			const tags = this.tags;
			const mods = modificationPredicate(tags);
			if (mods.length !== tags.length) {
				throw new MwbotError({
					code: 'mwbot_fatal_lengthmismatch',
					info: 'The length of the array returned by modificationPredicate does not match that of the "tags" array.'
				});
			} else if (!Array.isArray(mods)) {
				throw new MwbotError({
					code: 'mwbot_fatal_typemismatch',
					info: 'modificationPredicate must return an array.'
				});
			}

			// Apply the changes and update the entire wikitext content
			let newContent = this.content;
			mods.some((text, i, arr) => {
				if (typeof text === 'string') {

					// Replace the old tag content with a new one
					const initialEndIndex = this._tags[i].endIndex;
					const firstPart = newContent.slice(0, this._tags[i].startIndex);
					const secondPart = newContent.slice(initialEndIndex);
					newContent = firstPart + text + secondPart;

					// Exit early if this is the last loop iteration
					if (i === arr.length - 1) {
						return true;
					} // Otherwise we need to update the character indexes to continue the iteration

					// Adjust the end index of the modified tag based on new text length
					// (the start index doesn't change)
					const lengthGap = text.length - this._tags[i].text.length;
					this._tags[i].endIndex += lengthGap;

					// Adjust the start and end indices of all other tags
					this._tags.forEach((obj, j) => {
						if (i !== j) {
							if (obj.startIndex > initialEndIndex) {
								obj.startIndex += lengthGap;
								obj.endIndex += lengthGap;
							} else if (obj.endIndex > initialEndIndex) {
								obj.endIndex += lengthGap;
							}
						}
					});

				}
			});

			// Update the content and tags after the modifications
			this._content = newContent;
			this._tags = Wikitext.parseTags(newContent); // Re-parse to update tag properties (e.g. nestLevel)

			// Return the appropriate result based on the `outputTags` parameter
			if (outputTags) {
				return this.tags;
			} else {
				return this.content;
			}

		}

		/**
		 * Add tags in which elements shouldn't be parsed, if the tags are not already registered.
		 * @param skipTags Array of tag names to add.
		 * @returns The current Wikitext instance.
		 */
		addSkipTags(skipTags: string[]): Wikitext {
			skipTags.forEach((el: unknown) => {
				if (typeof el === 'string' && !skipTags.includes((el = el.toLowerCase()))) {
					this.skipTags.push(el as string);
				}
			});
			return this;
		}

		/**
		 * Set tags in which elements shouldn't be parsed, overwriting any existing settings.
		 * @param skipTags Array of tag names to set.
		 * @returns The current Wikitext instance.
		 */
		setSkipTags(skipTags: string[]): Wikitext {
			this.skipTags = skipTags.reduce((acc: string[], el: unknown) => {
				if (typeof el === 'string') {
					acc.push(el.toLowerCase());
				}
				return acc;
			}, []);
			return this;
		}

		/**
		 * Remove tags from the list of tags in which elements shouldn't be parsed.
		 * @param skipTags Array of tag names to remove.
		 * @returns The current Wikitext instance.
		 */
		removeSkipTags(skipTags: string[]): Wikitext {
			const rSkipTags = new RegExp(`^(?:${skipTags.join('|')})$`);
			this.skipTags = this.skipTags.filter((el) => rSkipTags.test(el));
			return this;
		}

		/**
		 * Get a copy of the names of currently registered tags in which elements shouldn't be parsed.
		 * @returns An array of the current tag names.
		 */
		getSkipTags(): string[] {
			return [...this.skipTags];
		}

		/**
		 * Generate a function that evaluates whether a string starting at an index and ending at another
		 * is inside a tag in which that string shouldn't be parsed.
		 * @returns A function that checks whether a given range is inside any tag to skip parsing.
		 */
		private getSkipPredicate(): (startIndex: number, endIndex: number) => boolean {

			const rSkipTags = new RegExp(`^(?:${this.skipTags.join('|')})$`);

			// Create an array to store the start and end indices of tags to skip
			const indexMap = this._tags.reduce((acc: number[][], tagObj) => {
				// If the tag is in the skip list and doesn't overlap with existing ranges, add its range
				if (rSkipTags.test(tagObj.name)) {
					// Check if the current range is already covered by an existing range
					const isCovered = acc.some(([startIndex, endIndex]) => startIndex < tagObj.startIndex && tagObj.endIndex < endIndex);
					if (!isCovered) {
						acc.push([tagObj.startIndex, tagObj.endIndex]);
					}
				}
				return acc;
			}, []);

			// Return a predicate function that checks if a given range is inside any of the skip tag ranges
			return (startIndex: number, endIndex: number) => {
				return indexMap.some(([skipStartIndex, skipEndIndex]) => skipStartIndex < startIndex && endIndex < skipEndIndex);
			};

		}

		/**
		 * Parse sections in the wikitext.
		 * @returns Array of parsed sections.
		 */
		parseSections(): Section[] {

			const isInSkipRange = this.getSkipPredicate();

			// Extract HTML-style headings (h1–h6)
			// TODO: Should we deal with cases like "this <span>is</span> a heading" and "this [[is]] a heading"?
			const headings = this._tags.reduce((acc: Heading[], tagObj) => {
				const m = /^h([1-6])$/.exec(tagObj.name);
				if (m && !isInSkipRange(tagObj.startIndex, tagObj.endIndex)) {
					acc.push({
						text: tagObj.text,
						title: mw.Title.clean(removeComments(tagObj.content!)),
						level: parseInt(m[1]),
						index: tagObj.startIndex
					});
				}
				return acc;
			}, []);

			// Parse wikitext-style headings (==heading==)
			const wikitext = this.content;
			let m;
			while ((m = sectionRegex.heading.exec(wikitext))) {

				// If `$4` isn't empty or the heading is within a skip range, ignore it
				// See sectionRegex for capturing groups
				const m4 = removeComments(m[4]).replace(sectionRegex.whitespace, '');
				if (m4 || isInSkipRange(m.index, m.index + m[0].length)) {
					continue;
				}

				// Determine heading level (up to 6)
				const level = Math.min(6, m[1].length, m[3].length);
				const overflowLeft = Math.max(0, m[1].length - level);
				const overflowRight = Math.max(0, m[3].length - level);
				const title = '='.repeat(overflowLeft) + m[2] + '='.repeat(overflowRight);

				headings.push({
					text: m[0].trim(),
					title: mw.Title.clean(removeComments(title)),
					level,
					index: m.index
				});

			}

			// Sort headings by index and add the top section
			headings.sort((a, b) => a.index - b.index);
			headings.unshift({text: '', title: 'top', level: 1, index: 0}); // Top section

			// Parse sections from the headings
			const sections: Section[] = headings.map(({text, title, level, index}, i, arr) => {
				const boundaryIdx = i === 0
					? (arr.length > 1 ? 1 : -1) // If top section, next heading or no boundary
					: arr.findIndex((obj, j) => j > i && obj.level <= level); // Find the next non-subsection

				const content = wikitext.slice(
					index,
					boundaryIdx !== -1 ? arr[boundaryIdx].index : wikitext.length
				);

				return {
					heading: text,
					title,
					level,
					index: i,
					startIndex: index,
					endIndex: index + content.length,
					content
				};
			});

			return sections;

		}

		/**
		 * Parse `{{{parameter}}}` expressions in the wikitext.
		 * @param config Configuration options for parameter parsing.
		 * @returns Array of parsed parameters.
		 */
		parseParameters(config: ParseParametersConfig = {recursive: true}): Parameter[] {

			const isInSkipRange = this.getSkipPredicate();
			const params: Parameter[] = [];
			const regex = /\{{3}(?!{)([^|}]*)\|?([^}]*)\}{3}/g; // $1: name, $2: value
			const wikitext = this.content;
			let nestLevel = 0;

			let match: RegExpExecArray | null;
			while ((match = regex.exec(wikitext))) {

				// Skip parameters that don't satisfy the namePredicate
				const paramName = match[1].trim();
				if (typeof config.namePredicate === 'function' && !config.namePredicate(paramName)) {
					continue;
				}
				let paramValue = match[2];
				let paramText = match[0];

				/**
				 * Parameters can contain nested templates (e.g., `{{{1|{{{page|{{PAGENAME}}}}}}}}`).
				 * In such cases, `exec` initially captures an incomplete parameter like `{{{1|{{{page|{{PAGENAME}}}`.
				 */
				const leftBraceCnt = (paramText.match(/\{{2,}/g) || []).join('').length;
				let rightBraceCnt = (paramText.match(/\}{2,}/g) || []).join('').length;
				let isValid = true;

				// If the number of opening and closing braces is unbalanced
				if (leftBraceCnt > rightBraceCnt) {
					isValid = false;
					const rightBraceStartIndex = match.index + paramText.length - 3; // Get the end index of `{{{1|{{{page|{{PAGENAME` in `wikitext`
					rightBraceCnt -= 3;

					// Find the correct closing braces
					for (let pos = rightBraceStartIndex; pos < wikitext.length; pos++) {
						const closingMatch = wikitext.slice(pos).match(/^\}{2,}/);
						if (closingMatch) {
							const closingBraces = closingMatch[0].length;
							if (leftBraceCnt <= rightBraceCnt + closingBraces) {
								// If the right braces close all the left braces
								const lastIndex = pos + (leftBraceCnt - rightBraceCnt);
								paramText = wikitext.slice(match.index, lastIndex); // Get the correct parameter
								paramValue += paramText.slice(rightBraceStartIndex - lastIndex).replace(/\}{3}$/, '');
								isValid = true;
								regex.lastIndex = lastIndex; // Update search position
								break;
							} else {
								// If not, continue searching
								pos += closingBraces - 1;
								rightBraceCnt += closingBraces;
							}
						}
					}
				}

				if (isValid) {

					const param: Parameter = {
						name: paramName,
						value: paramValue.trim(),
						text: paramText,
						startIndex: match.index,
						endIndex: regex.lastIndex,
						nestLevel,
						skip: isInSkipRange(match.index, regex.lastIndex)
					};
					if (!config.parameterPredicate || !config.parameterPredicate({...param})) {
						params.push(param);
					}

					// Handle nested parameters
					if (config.recursive && paramText.slice(3).includes('{{{')) {
						regex.lastIndex = match.index + 3;
						nestLevel++;
					} else {
						nestLevel = 0;
					}
				}

			}

			return params;

		}

		/**
		 * Parse `[[wikilink]]`s in the wikitext.
		 * @returns Array of parsed wikilinks.
		 */
		parseWikilinks(): Wikilink[] {

			const isInSkipRange = this.getSkipPredicate();
			const rWikilink = /\[{2}([^\]|]+)\|?([^\]]*)\]{2}/g; // $1: target, $2: displayed text
			const wikitext = this.content;
			const links: Wikilink[] = [];

			let match: RegExpExecArray | null;
			while ((match = rWikilink.exec(wikitext))) {
				const target = match[1];
				const startIndex = match.index;
				const endIndex = startIndex + match[0].length;
				links.push({
					title: mw.Title.newFromText(target),
					// TODO: [[File:]] links can contain multiple right operands
					// TODO: The right operand can contain {{template}}s and {{{parameters}}}
					display: match[2] ? mw.Title.clean(match[2]) : target,
					text: match[0],
					piped: !!match[2],
					startIndex,
					endIndex,
					skip: isInSkipRange(startIndex, endIndex)
				});
			}

			return links;

		}

		/**
		 * Generates a mapping from the start index of each parsed element to its text content and type.
		 *
		 * The mapping includes:
		 * * Skip tags (e.g., `<nowiki>`, `<!-- -->`)
		 * * Parameters (`{{{parameter}}}`)
		 * * Wikilinks (`[[wikilink]]`)
		 *
		 * @returns An object mapping start indices to their corresponding text content and type.
		 */
		private getIndexMap(): IndexMap {

			const indexMap: IndexMap = Object.create(null);

			// Process skipTags
			const rSkipTags = new RegExp(`^(?:${this.skipTags.join('|')})$`);
			this._tags.forEach(({name, text, startIndex}) => {
				if (rSkipTags.test(name)) {
					indexMap[startIndex] = {
						text,
						type: 'tag'
					};
				}
			});

			// Process {{{parameter}}}s
			this.parseParameters().forEach(({text, startIndex}) => {
				indexMap[startIndex] = {
					text,
					type: 'parameter'
				};
			});

			// Process [[wikilink]]s
			this.parseWikilinks().forEach(({text, startIndex}) => {
				indexMap[startIndex] = {
					text,
					type: 'wikilink'
				};
			});

			return indexMap;

		}

		// Asynchronous methods

		/**
		 * Fetch the content of the latest revision of a title from the API.
		 *
		 * @param title
		 * @returns Promise resolving to the revision information on success, or `null` on failure.
		 *
		 * *This method never rejects.*
		 */
		static fetch(title: string | Title) {
			if (title instanceof mw.Title) {
				title = title.toString();
			} else if (typeof title !== 'string') {
				throw new MwbotError({
					code: 'mwbot_fatal_typemismatch',
					info: `"${typeof title}" is not a valid type for fetch().`
				});
			}
			return mw.get({
				action: 'query',
				titles: title,
				prop: 'revisions',
				rvprop: 'ids|timestamp|user|content',
				rvslots: 'main',
				curtimestamp: true,
				formatversion: '2'
			}).then((res) => {
				const resPg = res.query?.pages?.[0];
				const resRv = resPg?.revisions?.[0];
				if (!resPg && res.query?.interwiki) {
					const err = new MwbotError({
						code: 'interwikititle',
						info: 'Cannot fetch the content of an interwiki title.'
					});
					err.title = res.query.interwiki[0].title;
					throw err;
				} else if (!resPg || !resRv) {
					const err = new MwbotError({
						code: 'empty',
						info: 'OK response but empty result.'
					});
					err.response = res;
					throw err;
				} else if (resPg.invalid) {
					const err = new MwbotError({
						code: 'invalidtitle',
						info: resPg.invalidreason || 'The requested page title is invalid.'
					});
					err.title = resPg.title;
					throw err;
				} else if (typeof resPg.pageid !== 'number' || resPg.missing) {
					const err = new MwbotError({
						code: 'pagemissing',
						info: 'The requested page does not exist.'
					});
					err.title = resPg.title;
					throw err;
				} else if (
					typeof resRv.revid !== 'number' ||
					typeof res.curtimestamp !== 'string' ||
					!resRv.timestamp ||
					typeof resRv.slots?.main.content !== 'string'
				) {
					const err = new MwbotError({
						code: 'empty',
						info: 'OK response but empty result.'
					});
					err.response = res;
					throw err;
				}
				return {
					pageid: resPg.pageid,
					ns: resPg.ns,
					title: resPg.title,
					revid: resRv.revid,
					user: resRv.user, // Could be missing if revdel'd
					basetimestamp: resRv.timestamp,
					starttimestamp: res.curtimestamp,
					content: resRv.slots.main.content
				};
			}).catch((err) => {
				console.warn(err);
				return null;
			});
		}

	}

	return Wikitext;
}

// Interfaces for constructor

/**
 * Options to initialize a {@link Wikitext} instance.
 */
export interface WikitextOptions {
	/**
	 * The names of HTML tags in which elements shouldn't be parsed.
	 *
	 * For example:
	 *
	 * `blah blah <!-- {{Template}} --> {{Template}} blah blah`
	 *
	 * In many cases, one would not want to parse the occurrence of `{{Template}}` in the comment tag.
	 * Specify such tags to obtain the desired parsing results.
	 *
	 * The default tags in which elements aren't parsed are:
	 * * `!--`, `nowiki`, `pre`, `syntaxhighlight`, `source`, and `math`.
	 *
	 * The tag names passed to this property will be merged into the default tags (unless {@link overwriteSkipTags})
	 * is specified as `true`.
	 */
	skipTags?: string[];
	/**
	 * Whether to overwrite the default skip tags. If `true`, the array of strings passed to {@link skipTags}
	 * will solely be used as the tags in which elements shouldn't be parsed (i.e. no merging with the default
	 * tags).
	 */
	overwriteSkipTags?: boolean;
}

// Interfaces and private members for "parseTags"

/**
 * Object that holds information about an HTML tag, parsed from wikitext.
 */
export interface Tag {
	/**
	 * The name of the tag (e.g. "div" for `<div></div>`). Comment tags (i.e. `<!-- -->`) are named "!--".
	 */
	name: string;
	/**
	 * The outerHTML of the tag.
	 */
	readonly text: string;
	/**
	 * The start tag.
	 *
	 * NOTE: The end tag of a void tag is considered to be an end tag. Try `</br>` in WikiEditor.
	 */
	start: string;
	/**
	 * The innerHTML of the tag. May be `null` if this is a void tag.
	 */
	content: string | null;
	/**
	 * The end tag.
	 *
	 * Be aware of the following cases:
	 * * If this tag is a void tag, this property is an empty string.
	 * * If this tag is unclosed even though it should be closed, this property is the expected end tag.
	 */
	end: string;
	/**
	 * The index at which this tag starts in the wikitext.
	 */
	startIndex: number;
	/**
	 * The index at which this tag ends in the wikitext.
	 */
	endIndex: number;
	/**
	 * The nesting level of this tag. `0` if not nested within another tag.
	 */
	nestLevel: number;
	/**
	 * Whether this tag is a void tag.
	 */
	void: boolean;
	/**
	 * Whether this tag is properly closed.
	 */
	unclosed: boolean;
	/**
	 * Whether this tag is a self-closing tag (which is invalid in HTML).
	 */
	selfClosing: boolean;
}

/**
 * Object that holds the information of unclosed start tags that need matching end tags.
 */
interface StartTag {
	name: string;
	startIndex: number;
	endIndex: number;
	selfClosing: boolean;
}

/**
 * Sanitize the tag name `--` to `!--`, or else return the input as is.
 * @param name
 * @returns
 */
function sanitizeNodeName(name: string): string {
	return name === '--' ? '!' + name : name;
}

/**
 * Create a {@link Tag} object from a parsed `<void>` tag.
 *
 * @param nodeName The node name of the void tag.
 * @param startTag The start void tag (i.e., the whole part of the void tag).
 * @param startIndex The start index of the void tag in the wikitext.
 * @param nestLevel The nesting level of the void tag.
 * @param selfClosing Whether the void tag closes itself.
 * @returns
 */
function createVoidTagObject(nodeName: string, startTag: string, startIndex: number, nestLevel: number, selfClosing: boolean): Tag {
	return {
		name: nodeName, // Not calling sanitizeNodeName because this is never a comment tag
		get text() { // The entire void tag (e.g. <br>)
			return this.start;
		},
		start: startTag,
		content: null, // Void tags have no content
		end: '',
		startIndex,
		endIndex: startIndex + startTag.length,
		nestLevel,
		void: true,
		unclosed: false,
		selfClosing
	};
}

/**
 * Configuration options for {@link Wikitext.parseTags}.
 */
export interface ParseTagsConfig {
	/**
	 * A predicate function to filter tags by name.
	 * Only tags whose names satisfy this function will be parsed.
	 *
	 * @param name The name of the tag.
	 * @returns `true` if the tag should be parsed, otherwise `false`.
	 */
	namePredicate?: (name: string) => boolean;
	/**
	 * A predicate function to filter parsed tags.
	 * Only tags that satisfy this function will be included in the results.
	 *
	 * @param tag The tag object.
	 * @returns `true` if the tag should be included, otherwise `false`.
	 */
	tagPredicate?: (tag: Tag) => boolean;
}

/**
 * See {@link Wikitext.modifyTags}.
 */
export type TagModificationPredicate = (tags: Tag[]) => (string | null)[];

// Interfaces and private members for "parseSections"

/**
 * Remove (all) `<!-- comment tags -->` from a string.
 * @param str
 * @returns
 */
function removeComments(str: string): string {
	return str.replace(/<!--.*?-->/g, '');
}

/**
 * Object that holds information about a `==heading==`, parsed from wikitext.
 */
interface Heading {
	/**
	 * The entire line of the heading, starting with `=` and ending with the right-most `=`.
	 * Any leading/trailing whitespace characters are trimmed.
	 */
	text: string;
	/**
	 * The inner text of the heading (i.e., the content between the equal signs).
	 * This could be different from the result of `action=parse` if it contains HTML tags or templates.
	 */
	title: string;
	/**
	 * The level of the heading, based on the number of `=` symbols.
	 * For example, `==` is level 2, `===` is level 3, etc.
	 */
	level: number;
	/**
	 * The index (position) to the start of the heading in the wikitext.
	 * This is the position of the first character of the heading line in the original text.
	 */
	index: number;
}

/**
 * Object that holds information about a section, parsed from wikitext.
 */
export interface Section {
	/**
	 * `==heading==` or the outerHTML of a heading element. Any leading/trailing `\s`s are trimmed.
	 * For the top section, the value is empty.
	 */
	heading: string;
	/**
	 * The title of the section. Could be different from the result of `action=parse` if it contains HTML tags or templates.
	 * For the top section, the value is `top`.
	 */
	title: string;
	/**
	 * The level of the section (1 to 6). For the top section, the value is `1`.
	 */
	level: number;
	/**
	 * The index number of the section. This is the same as the `section` parameter of {@link https://www.mediawiki.org/wiki/API:Edit | the edit API}.
	 * For the top section, the value is `0`.
	 */
	index: number;
	/**
	 * The index to the start of the section in the wikitext.
	 */
	startIndex: number;
	/**
	 * The index up to, but not including, the end of the section in the wikitext.
	 */
	endIndex: number;
	/**
	 * The content of the section including the heading.
	 */
	content: string;
}

// Interfaces and private members for "parseParameters"

/**
 * Object that holds information about a `{{{parameter}}}`, parsed from wikitext.
 */
interface Parameter {
	/**
	 * The parameter name (i.e. the left operand of `{{{name|value}}}`).
	 */
	name: string;
	/**
	 * The parameter value (i.e., the right operand of `{{{name|value}}}`).
	 */
	value: string;
	/**
	 * The full wikitext representation of the parameter.
	 */
	text: string;
	/**
	 * The starting index of the parameter in the wikitext.
	 */
	startIndex: number;
	/**
	 * The ending index of the parameter in the wikitext (exclusive).
	 */
	endIndex: number;
	/**
	 * The nesting level of the parameter.
	 * * `0` for parameters that are not nested inside another parameter.
	 * * Increments with deeper nesting.
	 */
	nestLevel: number;
	/**
	 * Whether the parameter appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;
}

/**
 * Configuration options for {@link Wikitext.parseParameters}.
 */
interface ParseParametersConfig {
	/**
	 * Whether to parse `{{{parameter}}}` expressions inside other `{{{parameter}}}` expressions.
	 *
	 * Default: `true`
	 */
	recursive?: boolean;
	/**
	 * A predicate function to filter parameters by name.
	 * Only parameters whose names satisfy this function will be parsed.
	 *
	 * @param name The name of the parameter.
	 * @returns `true` if the parameter should be parsed, otherwise `false`.
	 */
	namePredicate?: (name: string) => boolean;
	/**
	 * A predicate function to filter parsed parameters.
	 * Only parameters that satisfy this function will be included in the results.
	 *
	 * @param parameter The parameter object.
	 *
	 * @returns `true` if the parameter should be included, otherwise `false`.
	 */
	parameterPredicate?: (parameter: Parameter) => boolean;
}

// Interfaces and private members for "parseWikilinks"

/**
 * Object that holds information about a `[[wikilink]]`, parsed from wikitext.
 */
export interface Wikilink {
	/**
	 * The target title of the wikilink (the part before the `|`).
	 *
	 * This can be `null` if the title is invalid.
	 */
	title: Title | null;
	/**
	 * The displayed text of the wikilink (the part after `|`).
	 *
	 * This is the raw text of `[[display]]` or `[[target|display]]`.
	 */
	display: string;
	/**
	 * The full wikitext representation of the wikilink (e.g., `[[target|display]]`).
	 */
	text: string;
	/**
	 * Whether the wikilink contains a pipe (`|`) separator.
	 */
	piped: boolean;
	/**
	 * The starting index of the wikilink in the wikitext.
	 */
	startIndex: number;
	/**
	 * The ending index of the wikilink in the wikitext (exclusive).
	 */
	endIndex: number;
	/**
	 * Whether the wikilink appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;
}

// Interfaces and private members for "parseTemplates"

type IndexMap = Record<number, {text: string; type: 'tag' | 'parameter' | 'wikilink';}>;