/**
 * This module is attached to {@link Mwbot.Wikitext} as an instance member.
 *
 * @module
 */

import { MwbotError } from './MwbotError';
import type { Mwbot } from './Mwbot';
import { mergeDeep } from './util';
/**
 * @internal
 */
type Title = InstanceType<Mwbot['Title']>;

/**
 * @internal
 */
export default function(mw: Mwbot) {

	const namespaceIds = mw.config.get('wgNamespaceIds');
	const NS_MAIN = namespaceIds[''];
	const NS_FILE = namespaceIds.file;
	const NS_TEMPLATE = namespaceIds.template;

	/**
	 * TODO: Add documentation
	 */
	class Wikitext {

		/**
		 * Storage of the content and parsed entries. Used for the efficiency of parsing methods.
		 */
		private storage: {
			content: string;
			tags: Tag[] | null;
			parameters: Parameter[] | null;
			sections: Section[] | null;
			wikilinks_fuzzy: FuzzyWikilink[] | null;
			templates: Template[] | null;
			wikilinks: (Wikilink | FileWikilink)[] | null;
		};
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
		 * @throws If `content` is not a string.
		 */
		constructor(content: string, options: WikitextOptions = {}) {

			if (typeof content !== 'string') {
				throw new MwbotError({
					code: 'mwbot_fatal_typemismatch',
					info: `"${typeof content}" is not a valid type for Wikitext.constructor.`
				});
			}
			this.storage = {
				content,
				tags: null,
				parameters: null,
				sections: null,
				wikilinks_fuzzy: null,
				templates: null,
				wikilinks: null
			};

			// Initialize the names of tags in which elements shouldn't be parsed
			const defaultSkipTags =
				options.overwriteSkipTags ?
				[] :
				// TODO: Cannot handle rare cases like "<nowiki>[[link<!--]]-->|display]]</nowiki>", where a comment tag is nested
				// inside a non-comment skip tag. To handle these, it'll be necessary to differentiate the types of skip tags.
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
		 * Retrieves the value of `key` from {@link storage}.
		 *
		 * - If the stored value is `null`, the wikitext is parsed and the result is stored.
		 * - If `clone` is `true` (default), a deep copy of the value is returned.
		 *
		 * @param key The storage key to retrieve.
		 * @param clone Whether to return a deep copy of the value (default: `true`).
		 * @returns The stored or parsed value.
		 */
		private storageManager<K extends keyof typeof this.storage>(key: K, clone?: boolean): NonNullable<typeof this.storage[K]>;
		/**
		 * Updates `key` in {@link storage} with the provided `value`.
		 *
		 * - If `key` is `"content"`, all other storage properties are reset.
		 *
		 * @param key The storage key to update.
		 * @param value The new value to set.
		 * @returns The current instance for method chaining.
		 */
		private storageManager<K extends keyof typeof this.storage>(key: K, value: NonNullable<typeof this.storage[K]>): typeof this;
		private storageManager<K extends keyof typeof this.storage>(key: K, valueOrClone?: NonNullable<typeof this.storage[K]> | boolean) {

			// If retrieving a value
			if (typeof valueOrClone === 'boolean' || valueOrClone === undefined) {
				const clone = valueOrClone ?? true; // Default to true
				const val = (this.storage[key] ?? (() => {
					switch (key) {
						case 'content': return this.storage.content;
						case 'tags': return this._parseTags();
						case 'parameters': return this._parseParameters();
						case 'sections': return this._parseSections();
						case 'wikilinks_fuzzy': return this._parseWikilinksFuzzy();
						case 'templates': return this._parseTemplates();
						case 'wikilinks': return this._parseWikilinks();
					}
				})()) as NonNullable<typeof this.storage[K]>;
				if (key === 'content') {
					return val;
				} else if (!Array.isArray(val)) {
					throw new TypeError(`Expected an array for storage["${key}"], but got ${typeof val}.`);
				}
				this.storage[key] = val; // Save
				return clone ? val.map((obj) => mergeDeep(obj)) : val;
			}

			// If setting a value
			if (key === 'content') {
				if (typeof valueOrClone !== 'string') {
					throw new TypeError(`Expected a string for storage.content, but got ${typeof valueOrClone}.`);
				}
				// Content update should reset parsing results
				this.storage = {
					content: valueOrClone,
					tags: null,
					parameters: null,
					sections: null,
					wikilinks_fuzzy: null,
					templates: null,
					wikilinks: null
				};
			} else if (key in this.storage) {
				// Set the passed array
				this.storage[key] = valueOrClone;
			} else {
				throw new ReferenceError(`Invalid key: ${key}.`);
			}
			return this;

		}

		/**
		 * Returns the wikitext content of the instance.
		 */
		get content(): string {
			return this.storageManager('content');
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
		static getValidTags(): string[] {
			return this._validTags.slice();
		}

		/**
		 * Check whether a given tag name is valid in wikitext.
		 * @param tagName The tag name to check.
		 * @returns
		 */
		static isValidTag(tagName: string): boolean {
			return this._validTags.includes(String(tagName).toLowerCase());
		}

		/**
		 * Parse the wikitext for HTML tags.
		 * @returns
		 */
		private _parseTags(): Tag[] {

			/**
			 * Array to store unclosed start tags that need matching end tags
			 */
			const startTags: StartTag[] = [];

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

			// Parse the wikitext string by checking each character
			const wikitext = this.content;
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
							// Void start tags aren't stored in "startTags" (i.e. there's no need to look them up in the stack)
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
						startTags.some((start) => { // The most recently collected tag is at index 0 (because of unshift)

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
			let tags = this.storageManager('tags');
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
		 * Note that {@link content} and tags will be updated based on the modification.
		 * After running this method, **do not re-use copies of them initialized beforehands**.
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
			let tags = this.storageManager('tags');
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
			tags = this.storageManager('tags', false); // Get the tags again because the passed "tags" might have been mutated
			let newContent = this.content;
			mods.some((text, i, arr) => {
				if (typeof text === 'string') {

					// Replace the old tag content with a new one
					const initialEndIndex = tags[i].endIndex;
					const firstPart = newContent.slice(0, tags[i].startIndex);
					const secondPart = newContent.slice(initialEndIndex);
					newContent = firstPart + text + secondPart;

					// Exit early if this is the last loop iteration
					if (i === arr.length - 1) {
						return true;
					} // Otherwise we need to update the character indexes to continue the iteration

					// Adjust the end index of the modified tag based on new text length
					// (the start index doesn't change)
					const lengthGap = text.length - tags[i].text.length;
					tags[i].endIndex += lengthGap;

					// Adjust the start and end indices of all other tags
					tags.forEach((obj, j) => {
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

			// Update the content
			this.storageManager('content', newContent);

			// Return the appropriate result based on the `outputTags` parameter
			if (outputTags) {
				return this.storageManager('tags'); // Must parse again because nesting levels and so on might have changed
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
			const indexMap = this.storageManager('tags', false).reduce((acc: number[][], tagObj) => {
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
		private _parseSections(): Section[] {

			const isInSkipRange = this.getSkipPredicate();

			// Extract HTML-style headings (h1–h6)
			const headings = this.storageManager('tags', false).reduce((acc: Heading[], tagObj) => {
				const m = /^h([1-6])$/.exec(tagObj.name);
				if (m && !isInSkipRange(tagObj.startIndex, tagObj.endIndex)) {
					acc.push({
						text: tagObj.text,
						// TODO: Should we deal with cases like "this <span>is</span> a heading" and "this [[is]] a heading"?
						title: mw.Title.clean(removeComments(tagObj.content!)),
						level: parseInt(m[1]),
						index: tagObj.startIndex
					});
				}
				return acc;
			}, []);

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
			 * Capturing groups:
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
		 * Parse sections in the wikitext.
		 * @returns Array of parsed sections.
		 */
		parseSections(): Section[] {
			return this.storageManager('sections');
		}

		/**
		 * Parse `{{{parameter}}}` expressions in the wikitext.
		 * @returns Array of parsed parameters.
		 */
		private _parseParameters(): Parameter[]  {

			const isInSkipRange = this.getSkipPredicate();
			const params: Parameter[] = [];
			const regex = /\{{3}(?!{)([^|}]*)\|?([^}]*)\}{3}/g; // $1: name, $2: value
			const wikitext = this.content;
			let nestLevel = 0;

			let match: RegExpExecArray | null;
			while ((match = regex.exec(wikitext))) {

				// Skip parameters that don't satisfy the namePredicate
				const paramName = match[1].trim();
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
					params.push(param);

					// Handle nested parameters
					if (paramText.slice(3).includes('{{{')) {
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
		 * Parse `{{{parameter}}}` expressions in the wikitext.
		 * @param config Configuration options for parameter parsing.
		 * @returns Array of parsed parameters.
		 */
		parseParameters(config: ParseParametersConfig = {recursive: true}): Parameter[] {
			let parameters = this.storageManager('parameters');
			if (!config.recursive) {
				parameters = parameters.filter(({nestLevel}) => nestLevel === 0);
			}
			if (typeof config.namePredicate === 'function') {
				parameters = parameters.filter(({name}) => config.namePredicate!(name));
			}
			if (typeof config.parameterPredicate === 'function') {
				parameters = parameters.filter((param) => config.parameterPredicate!(param));
			}
			return parameters;
		}

		/**
		 * Generates a mapping from the start index of each parsed element to its text content and type.
		 *
		 * The mapping includes:
		 * * Skip tags (e.g., `<nowiki>`, `<!-- -->`)
		 * * Parameters (`{{{parameter}}}`; not included by default)
		 * * Fuzzy wikilinks (`[[wikilink]]`; not included by default)
		 * * Templates (`{{tempalte}}`; not included by default)
		 *
		 * @param options Options to index additional expressions.
		 * @returns An object mapping start indices to their corresponding text content and type.
		 */
		private getIndexMap(options: {parameters?: boolean; wikilinks_fuzzy?: boolean, templates?: boolean} = {}): IndexMap {

			const indexMap: IndexMap = Object.create(null);

			// Process skipTags
			const rSkipTags = new RegExp(`^(?:${this.skipTags.join('|')})$`);
			this.storageManager('tags', false).forEach(({text, startIndex, name, content}) => {
				if (rSkipTags.test(name)) {
					const inner = (() => {
						if (content === null) {
							return null;
						}
						const innerStartIndex = startIndex + text.indexOf(content);
						return {start: innerStartIndex, end: innerStartIndex + content.length};
					})();
					indexMap[startIndex] = {
						text,
						type: 'tag',
						inner
					};
				}
			});

			// Process {{{parameter}}}s
			if (options.parameters) {
				this.storageManager('parameters', false).forEach(({text, startIndex}) => {
					// Wish we could use the d flag from ES2022!
					const m = /^(\{{3}[^|}]*\|)([^}]+)\}{3}$/.exec(text);
					const inner = m && {
						start: startIndex + m[1].length,
						end: startIndex + m[1].length + m[2].length
					};
					indexMap[startIndex] = {
						text,
						type: 'parameter',
						inner
					};
				});
			}

			// Process fuzzy [[wikilink]]s
			if (options.wikilinks_fuzzy) {
				this.storageManager('wikilinks_fuzzy', false).forEach(({text, startIndex, left, right}) => {
					const innerStartIndex = startIndex + 2 + left.length + 1;
					indexMap[startIndex] = {
						text,
						type: 'wikilink_fuzzy',
						inner: right === null ? null : {
							start: innerStartIndex,
							end: innerStartIndex + right.length
						}
					};
				});
			}

			// Process fuzzy {{template}}s
			if (options.templates) {
				this.storageManager('templates', false).forEach(({text, startIndex, params, rawTitle, endIndex}) => {
					indexMap[startIndex] = {
						text,
						type: 'template',
						inner: !params.length ? null : { // TODO: Not used anywhere
							start: startIndex + 2 + rawTitle.length + 1,
							end: endIndex - 2
						}
					};
				});
			}

			return indexMap;

		}

		/**
		 * Fuzzily parse `[[wikilink]]`s in the wikitext. The right operand (i.e., `[[left|right]]`) will be incomplete.
		 * @param indexMap Optional index map to re-use.
		 * @param skip Whether we are parsing wikilinks inside skip tags. (Default: `false`)
		 * @param wikitext Alternative wikitext to parse. Should be passed when parsing nested wikilinks.
		 * All characters before the range where there can be nested wikilinks should be replaced with `\x01`.
		 * This method skips sequences of this control character, to reach the range early and efficiently.
		 * @returns Array of fuzzily parsed wikilinks.
		 */
		private _parseWikilinksFuzzy(indexMap = this.getIndexMap(), skip = false, wikitext = this.content): FuzzyWikilink[] {

			/**
			 * Regular expressions to parse `[[wikilink]]`s.
			 *
			 * Usually, wikilinks are easy to parse, just with a `g`-flagged regex and a `while` loop.
			 * However, the following unusual cases (and the like) should be accounted for:
			 *
			 * - `<!--[[-->[[wikilink]]`
			 * - `[[wikilink<!--]]-->]]`
			 *
			 * That is, cases where a double bracket appears in a skip tag (which the g-regex approach can't handle).
			 */
			const regex = {
				start: /^\[{2}(?!\[)/,
				end: /^\]{2}/,
				leftEndsWithPipe: /\|$/
			};
			const links: FuzzyWikilink[] = [];
			let inLink = false;
			let startIndex = 0;
			let left = '';
			let rawTitle = '';
			let isLeftSealed = false;

			for (let i = 0; i < wikitext.length; i++) {

				const wkt = wikitext.slice(i);

				// Skip sequences of "\x01", prepended instead of the usual text
				// This makes it easy to retrieve the start indices of nested wikilinks
				// eslint-disable-next-line no-control-regex
				const ctrlMatch = wkt.match(/^\x01+/);
				if (ctrlMatch) {
					i += ctrlMatch[0].length - 1;
					continue;
				}

				// Skip over skip tags
				if (indexMap[i]) {
					const {inner} = indexMap[i]; // The index map of skip tags (only)
					if (inner && inner.end <= wikitext.length) {
						const {start, end} = inner;
						const text = wikitext.slice(start, end); // innerHTML of the skip tag
						if (text.includes('[[') && text.includes(']]')) {
							// Parse wikilinks inside the skip tag
							links.push(
								...this._parseWikilinksFuzzy(indexMap, true, '\x01'.repeat(start) + text)
							);
						}
					}
					if (inLink && !isLeftSealed) {
						rawTitle += indexMap[i].text;
					}
					i += indexMap[i].text.length - 1;
					continue;
				}

				if (regex.start.test(wkt)) {
					// Regard any occurrence of "[[" as the potential start of a wikilink
					inLink = true;
					startIndex = i;
					left = '';
					rawTitle = '';
					isLeftSealed = false;
					i++;
				} else if (regex.end.test(wkt) && inLink) {
					const endIndex = i + 2;
					const text = wikitext.slice(startIndex, endIndex);
					let right: string | null = null;
					if (regex.leftEndsWithPipe.test(left)) {
						right = wikitext.slice(startIndex + 2 + rawTitle.length, endIndex - 2) ||
							// Let empty strings fall back to null
							// Links like [[left|]] aren't expected to exist because of "pipe tricks"
							// See https://en.wikipedia.org/wiki/Help:Pipe_trick
							null;
						left = left.slice(0, -1);
					}
					links.push({
						left,
						right,
						title: mw.Title.newFromText(left),
						rawTitle: rawTitle.replace(regex.leftEndsWithPipe, ''),
						text,
						piped: right !== null,
						startIndex,
						endIndex,
						skip
					});
					inLink = false;
					i++;
				} else if (inLink && !isLeftSealed) {
					if (wkt[0] === '|') {
						isLeftSealed = true;
					}
					left += wkt[0]; // A sealed "left" ends with a pipe
					rawTitle += wkt[0];
				}

			}

			return links.sort((obj1, obj2) => obj1.startIndex - obj2.startIndex);

		}

		/**
		 * Parse `{{template}}`s in the wikitext.
		 * @param indexMap Optional index map to re-use.
		 * @param nestLevel Nesting level of the parsing templates. Only passed from inside this method.
		 * @param skip Whether we are parsing templates inside skip tags. (Default: `false`)
		 * @param wikitext Alternative wikitext to parse. Should be passed when parsing nested templates.
		 * All characters before the range where there can be nested templates should be replaced with `\x01`.
		 * This method skips sequences of this control character, to reach the range early and efficiently.
		 * @returns
		 */
		private _parseTemplates(
			indexMap = this.getIndexMap({parameters: true, wikilinks_fuzzy: true}),
			nestLevel = 0,
			skip = false,
			wikitext = this.content
		): Template[] {

			let numUnclosed = 0;
			let startIndex = 0;
			let components: TemplateFragment[] = [];

			// Character-by-character loop
			const templates: Template[] = [];
			for (let i = 0; i < wikitext.length; i++) {

				const wkt = wikitext.slice(i);

				// Skip sequences of "\x01", prepended instead of the usual text
				// This makes it easy to retrieve the start indices of nested templates
				// eslint-disable-next-line no-control-regex
				const ctrlMatch = wkt.match(/^\x01+/);
				if (ctrlMatch) {
					i += ctrlMatch[0].length - 1;
					continue;
				}

				// Skip or deep-parse certain expressions
				if (indexMap[i]) {
					if (numUnclosed !== 0) {
						processTemplateFragment(components, indexMap[i].text, {nonNameComponent: true});
					}
					const inner = indexMap[i].inner;
					if (inner && inner.end <= wikitext.length) {
						// Parse templates inside the expressions
						const {start, end} = inner;
						const text = wikitext.slice(start, end);
						if (text.includes('{{')) {
							templates.push(
								...this._parseTemplates(indexMap, nestLevel, indexMap[i].type === 'tag', '\x01'.repeat(inner.start) + text)
							);
						}
					}
					i += indexMap[i].text.length - 1;
					continue;
				}

				if (numUnclosed === 0) {
					// We are not in a template
					if (/^\{\{/.test(wkt)) {
						// Found the start of a template
						startIndex = i;
						components = [];
						numUnclosed += 2;
						i++;
					}
				} else if (numUnclosed === 2) {
					// We are looking for closing braces
					if (/^\{\{/.test(wkt)) {
						// Found a nested template
						numUnclosed += 2;
						i++;
						processTemplateFragment(components, '{{');
					} else if (/^\}\}/.test(wkt)) {
						// Found the end of the template
						const [nameObj, ...rawParams] = components;
						const name = nameObj ? nameObj.name : '';
						const rawName = nameObj ? nameObj.text : '';
						const endIndex = i + 2;
						const text = wikitext.slice(startIndex, endIndex);
						const temp = createTemplateObject({
							// TODO: Handle parser functions
							name,
							rawName,
							text,
							rawParams,
							startIndex,
							endIndex,
							nestLevel,
							skip
						});
						if (temp) {
							templates.push(temp);
							const inner = temp.text.slice(2, -2);
							if (inner.includes('{{')) {
								templates.push(
									...this._parseTemplates(indexMap, nestLevel + 1, skip, '\x01'.repeat(startIndex + 2) + inner)
								);
							}
						}
						numUnclosed -= 2;
						i++;
					} else {
						// Just part of the template
						processTemplateFragment(components, wkt[0], wkt[0] === '|' ? {isNew: true} : {});
					}
				} else {
					// We are in a nested template
					let fragment;
					if (/^\{\{/.test(wkt)) {
						// Found another nested template
						fragment = '{{';
						numUnclosed += 2;
						i++;
					} else if (/^\}\}/.test(wkt)) {
						// Found the end of the nested template
						fragment = '}}';
						numUnclosed -= 2;
						i++;
					} else {
						// Just part of the nested template
						fragment = wkt[0];
					}
					processTemplateFragment(components, fragment);
				}

			}

			return templates.sort((obj1, obj2) => obj1.startIndex - obj2.startIndex);

		}

		/**
		 * Parse `{{template}}`s in the wikitext.
		 * @param config
		 * @returns
		 */
		parseTemplates(config: ParseTemplatesConfig = {}): Template[] {
			let templates = this.storageManager('templates');
			if (typeof config.titlePredicate === 'function') {
				templates = templates.filter(({title}) => config.titlePredicate!(title));
			}
			if (typeof config.templatePredicate === 'function') {
				templates = templates.filter((template) => config.templatePredicate!(template));
			}
			return templates;
		}

		/**
		 * Parse `[[wikilink]]`s in the wikitext.
		 * @returns Array of parsed wikilinks.
		 */
		private _parseWikilinks(): (Wikilink | FileWikilink)[] {
			const indexMap = this.getIndexMap({parameters: true, templates: true});
			// Deep copy with storageManager to handle Title instances
			const wikilinks = this.storageManager('wikilinks_fuzzy').reduce((acc: (Wikilink | FileWikilink)[], obj) => {
				const {left, right, ...rest} = obj;
				if (rest.title && rest.title.getNamespaceId() === NS_FILE && !rest.title.hadLeadingColon()) {
					// This is a [[File:...]] link
					if (right === null) {
						// This file link doesn't have any parameters
						acc.push({
							...rest,
							params: []
						});
					} else if (!right.includes('|')) {
						// This file link is like [[File:...|param]]
						acc.push({
							...rest,
							params: [mw.Title.clean(right)]
						});
					} else {
						// This file link is like [[File:...|param1|param2]]
						const params: string[] = [];
						let text = '';
						for (let i = 0; i < right.length; i++) {
							// start index + [[ + left + | + i
							const realIndex = rest.startIndex + 2 + left.length + 1 + i;
							let expr;
							if (indexMap[realIndex] &&
								// Ensure the param line doesn't overflow the end of this wikilink
								// [[File:...| expr ]]
								realIndex + (expr = indexMap[realIndex].text).length + 2 <= rest.endIndex
							) {
								// Found the start of an expression (skip tag, parameter, or template)
								text += expr;
								i += expr.length - 1;
							} else if (right[i] === '|') {
								// Found the start of a new file link parameter
								params.push(mw.Title.clean(text));
								text = '';
							} else {
								// Just part of a file link parameter
								text += right[i];
							}
						}
						params.push(text); // Push the remaining file link parameter
						acc.push({
							...rest,
							params
						});
					}
				} else {
					// This is a normal [[wikilink]], including [[:File:...]]
					acc.push({
						...rest,
						display: mw.Title.clean(right ?? left)
					});
				}
				return acc;
			}, []);
			return wikilinks;
		}

		/**
		 * Parse `[[wikilink]]`s in the wikitext.
		 * @returns Array of parsed wikilinks.
		 */
		parseWikilinks(): (Wikilink | FileWikilink)[] {
			return this.storageManager('wikilinks');
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

	function createTemplateObject(initializer: {
		name: string;
		rawName: string;
		text: string;
		rawParams: TemplateFragment[];
		startIndex: number;
		endIndex: number;
		nestLevel: number;
		skip: boolean;
	}): Template | null {
		let name = initializer.name;
		const {rawName, text, rawParams, startIndex, endIndex, nestLevel, skip} = initializer;

		// Validate the template title
		name = mw.Title.clean(name);
		if (name.includes('\n')) {
			return null;
		}
		const namespace = name[0] === ':' ? NS_MAIN : NS_TEMPLATE; // TODO: Handle "/" (subpage) and "#" (in-page section)?

		// Format template parameters
		const numeralKeys: number[] = [];
		let hasUnnamedKeys = false;
		const params: TemplateParameter[] = rawParams.reduce((acc: TemplateParameter[], p) => {
			const key = mw.Title.clean(p.name.replace(/^\|/, ''));
			if (/^\d+$/.test(key) && !numeralKeys.includes(+key)) {
				numeralKeys.push(+key);
			}
			const unnamed = !key;
			hasUnnamedKeys = hasUnnamedKeys || unnamed;
			let value = p.value.replace(/^\|/, '');
			if (!unnamed) {
				value = value.trim();
			}
			const duplicateIndex = unnamed ? -1 : acc.findIndex((obj) => obj.key === key);
			if (duplicateIndex !== -1) {
				acc.splice(duplicateIndex, 1);
			}
			acc.push({key, value, text: p.text, unnamed});
			return acc;
		}, []);

		// Index unnamed parameters
		if (hasUnnamedKeys) {
			params.forEach((obj) => {
				if (obj.unnamed) {
					for (let i = 1; ; i++) {
						if (!numeralKeys.includes(i)) {
							obj.key = i.toString();
							numeralKeys.push(i);
							break;
						}
					}
				}
			});
		}

		return {
			title: mw.Title.newFromText(name, namespace),
			rawTitle: rawName,
			text,
			params,
			startIndex,
			endIndex,
			nestLevel,
			skip
		};
	}
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

// Interfaces and private members for "parseWikilinksFuzzy"

/**
 * Object that holds basic information about a `[[wikilink]]`, parsed from wikitext.
 */
export interface BaseWikilink {
	/**
	 * The target title of the wikilink (the part before the `|`).
	 * This can be `null` if the title is invalid.
	 *
	 * NOTE: Wikilinks with an invalid title aren't rendered as links (e.g., `[[{|foo]]`).
	 * However, they could be valid after applying rendering transformations (e.g., `[[{{{paremeter}}}]]`).
	 */
	title: Title | null;
	/**
	 * The raw target title, as directly parsed from the first operand of a `[[wikilink|...]]` expression.
	 */
	rawTitle: string;
	/**
	 * The full wikitext representation of the wikilink (e.g., `[[target|display]]`).
	 */
	text: string;
	/**
	 * The starting index of the wikilink in the wikitext.
	 */
	startIndex: number;
	/**
	 * The ending index of the wikilink in the wikitext (exclusive).
	 */
	endIndex: number;
	/**
	 * Whether the wikilink contains a pipe (`|`) separator.
	 */
	piped: boolean;
	/**
	 * Whether the wikilink appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;
}

/**
 * Object that holds information about a fuzzily parsed `[[wikilink]]`.
 * The right operand of the link needs to be parsed for the object to be a complete construct.
 */
export interface FuzzyWikilink extends BaseWikilink {
	/**
	 * The left operand.
	 */
	left: string;
	/**
	 * The right operand.
	 */
	right: string | null;
}

// Interfaces and private members for "parseTemplates"

/**
 * A mapping of expression start indexes to their corresponding details.
 *
 * This type is used to track expressions while skipping over tags, parameters, and wikilinks.
 * Each entry includes:
 * - `text`: The raw text of the expression.
 * - `type`: The type of the expression.
 * - `inner`: The start and end indexes of the inner content, or `null` if not applicable.
 */
type IndexMap = {
	[startIndex: number]: {
		text: string;
		type: 'tag' | 'parameter' | 'wikilink_fuzzy' | 'template';
		inner: {start: number; end: number} | null;
	};
};

/**
 * Configuration options for {@link Wikitext.parseTemplates}.
 */
export interface ParseTemplatesConfig {
	/**
	 * Template parameter hierarchies.
	 *
	 * Module-invoking templates may have nested parameters. For example, `{{#invoke:module|user={{{1|{{{user|}}}}}}}}`
	 * can be transcluded as `{{template|user=value|1=value}}`. In this case, `|1=` and `|user=` should be treated as
	 * instantiating the same template parameter. Any non-empty `|user=` parameter should override `|1=` if present.
	 * To specify such parameter hierarchies, pass an array like `[['1', 'user'], [...]]`. When this hierarchy is set,
	 * `|1=` will be overridden by `|user=` whenever both are present.
	 */
	hierarchy?: string[][]; // TODO: Not used anywhere
	/**
	 * A predicate function to filter templates by title.
	 * Only templates whose titles satisfy this function will be included in the results.
	 *
	 * @param title A Title object representing the template. Could be `null` if the title is invalid.
	 * @returns `true` if the template should be parsed, otherwise `false`.
	 */
	titlePredicate?: (title: Title | null) => boolean;
	/**
	 * A predicate function to filter parsed templates.
	 * Only templates that satisfy this function will be included in the results.
	 *
	 * @param template The template object.
	 * @returns `true` if the template should be included, otherwise `false`.
	 */
	templatePredicate?: (template: Template) => boolean;
}

/**
 * Template fragments processed by {@link processTemplateFragment}.
 */
interface TemplateFragment {
	/**
	 * The entire text of the template parameter, starting with a pipe character (e.g., `|1=value`).
	 */
	text: string;
	/**
	 * The name of the template parameter, if any (e.g., `1`). If the parameter isn't named, this property will be an empty string.
	 * This property directly reflects the parsing result and is always prefixed by a pipe character for named parameters.
	 */
	name: string;
	/**
	 * The value assigned to the template parameter (without a leading pipe character).
	 */
	value: string;
}

/**
 * Options for {@link processTemplateFragment}.
 */
interface FragmentOptions {
	/**
	 * Whether the fragment is **not** part of a template name or template parameter name.
	 * This applies when the fragment represents a value or another non-name component.
	 */
	nonNameComponent?: boolean;
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
 * - `components[0]` stores the **template name**.
 *   - `text`: The full name, including any extra characters (e.g., `{{Template<!--1-->|arg1=}}`).
 *   - `name`: The clean name without extra characters.
 * - `components[1+]` store **template parameters**, each starting with a pipe (`|`).
 *   - `text`: The full parameter (e.g., `|1=value`).
 *   - `name`: The parameter key (e.g., `|1`).
 *   - `value`: The assigned value.
 *
 * `components[1+].text` and `components[1+].name` always start with a pipe character to prevent misinterpretation
 * when an unnamed parameter has a value starting with `=` (e.g., `{{Template|=}}`).
 *
 * @param components The array storing parsed template parameters.
 * @param fragment The character(s) to add to the `components` array.
 * @param options Optional settings for handling the fragment.
 */
function processTemplateFragment(components: TemplateFragment[], fragment: string, options: FragmentOptions = {}): void {

	// Determine which element to modify: either a new element for a new parameter or an existing one
	const {nonNameComponent, isNew} = options;
	const i = isNew ? components.length : Math.max(components.length - 1, 0);

	// Initialize the element if it does not exist
	if (!(i in components)) {
		components[i] = {text: '', name: '', value: ''};
	}

	// Process the fragment and update the `components` array
	let equalIndex;
	if (i === 0 && nonNameComponent) {
		// `components[0]` handler (looking for a template name): extra characters
		components[i].text += fragment;
	} else if (i === 0) {
		// `components[0]` handler (looking for a template name): part of the name
		components[i].text += fragment;
		components[i].name += fragment;
	} else if ((equalIndex = fragment.indexOf('=')) !== -1 && !components[i].name && !nonNameComponent) {
		// Found `=` when `name` is empty, indicating the start of a named parameter.
		components[i].name = components[i].text + fragment.slice(0, equalIndex);
		components[i].text += fragment;
		components[i].value = components[i].text.slice(components[i].name.length + 1);
	} else {
		components[i].text += fragment;
		components[i].value += fragment;
	}

}

/**
 * Object that holds information about a template, parsed from wikitext.
 */
export interface Template {
	/**
	 * A {@link Title} instance representing the transcluded target.
	 * This is `null` if the title is invalid.
	 *
	 * NOTE: `{{template}}`, when used without a namespace prefix, transcludes a page from the Template namespace.
	 * Thus, `title.getNamespaceId()` typically returns `10` for both `{{template}}` and `{{Template:template}}`.
	 *
	 * To distinguish `{{template}}` (template transclusion) from `{{:title}}` (page transclusion),
	 * use {@link Title.hadLeadingColon}.
	 */
	title: Title | null;
	/**
	 * The raw template title, as directly parsed from the first operand of a `{{template|...}}` expression.
	 */
	rawTitle: string;
	/**
	 * The full wikitext of the template, including `{{` and `}}`.
	 */
	text: string;
	/**
	 * The parameters of the template.
	 */
	params: TemplateParameter[];
	/**
	 * The starting index of this template in the wikitext.
	 */
	startIndex: number;
	/**
	 * The ending index of this template in the wikitext (exclusive).
	 */
	endIndex: number;
	/**
	 * The nesting level of this template. `0` if not nested within another template.
	 */
	nestLevel: number;
	/**
	 * Whether the template appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;
}

/**
 * Object that holds information about a template parameter.
 */
export interface TemplateParameter {
	/**
	 * The parameter key with leading and trailing spaces removed.
	 *
	 * This property is never an empty string, even for unnamed parameters.
	 */
	key: string;
	/**
	 * The parameter value.
	 *
	 * Trimming behavior depends on whether the parameter is named:
	 * - Named parameters collapse leading and trailing spaces.
	 * - Unnamed parameters retain leading and trailing spaces.
	 * See https://en.wikipedia.org/wiki/Help:Template#Whitespace_handling.
	 *
	 * Regardless, trailing linebreak characters are always removed.
	 */
	value: string;
	/**
	 * The parameter text, starting with a pipe character (`|`).
	 *
	 * For unnamed parameters, the key is not rendered.
	 */
	text: string;
	/**
	 * Whether the parameter is unnamed.
	 */
	unnamed: boolean;
}

// Interfaces and private members for "parseWikilinks"

/**
 * Object that holds information about a `[[wikilink]]`, parsed from wikitext.
 */
export interface Wikilink extends BaseWikilink {
	/**
	 * The displayed text of the wikilink (the part after `|`).
	 *
	 * This is the trimmed version of `display` in `[[display]]` or `[[target|display]]`.
	 */
	display: string;
}

/**
 * Object that holds information about a `[[filelink]]`, parsed from wikitext.
 */
export interface FileWikilink extends BaseWikilink {
	/**
	 * The parameters of the file link (the part after `|`).
	 *
	 * These are the trimmed versions of `param(s)` in `[[file title|...params]]`.
	 */
	params: string[];
}