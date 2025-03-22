/**
 * This module is attached to {@link Mwbot.Wikitext} as an instance member.
 *
 * @module
 */

import { MwbotError } from './MwbotError';
import type { Mwbot, MwbotRequestConfig, Revision } from './Mwbot';
import { deepCloneInstance, isClassInstance, mergeDeep } from './Util';
import { ApiEditPageParams, ApiResponse } from './api_types';
import type { Title } from './Title';
import type {
	ParsedTemplate,
	MalformedTemplate,
	ParserFunction,
	NewTemplateParameter,
	TemplateParameterHierarchies,
	ParsedTemplateOptions
} from './Template';

/**
 * @internal
 */
export function WikitextFactory(
	mw: Mwbot,
	ParsedTemplate: ParsedTemplate,
	MalformedTemplate: MalformedTemplate,
	ParserFunction: ParserFunction
) {

	const namespaceIds = mw.config.get('wgNamespaceIds');
	const NS_FILE = namespaceIds.file;
	// eslint-disable-next-line no-control-regex
	const rCtrlStart = /^\x01+/;

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
			templates: InstanceType<ParsedTemplate | MalformedTemplate | ParserFunction>[] | null;
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
		 * Alias of `new mwbot.Wikitext` (see also {@link Wikitext.constructor}).
		 *
		 * @param content A wikitext content.
		 * @param options Options for the initialization of the instance.
		 * @throws If `content` is not a string.
		 */
		static new(content: string, options: WikitextOptions = {}): Wikitext {
			return new Wikitext(content, options);
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
		private storageManager<K extends keyof typeof this.storage>(
			key: K,
			clone?: boolean,
			args?: StorageArgumentMap[K]
		): NonNullable<typeof this.storage[K]>;
		/**
		 * Updates `key` in {@link storage} with the provided `value`.
		 *
		 * - If `key` is `"content"`, all other storage properties are reset.
		 *
		 * @param key The storage key to update.
		 * @param value The new value to set.
		 * @returns The current instance for method chaining.
		 */
		private storageManager<K extends keyof typeof this.storage>(
			key: K,
			value: NonNullable<typeof this.storage[K]>
		): typeof this;
		private storageManager<K extends keyof typeof this.storage>(
			key: K,
			valueOrClone?: NonNullable<typeof this.storage[K]> | boolean,
			args?: StorageArgumentMap[K]
		) {

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
						case 'templates': return this._parseTemplates(args);
						case 'wikilinks': return this._parseWikilinks();
					}
				})()) as NonNullable<typeof this.storage[K]>;
				if (key === 'content') {
					return val;
				} else if (!Array.isArray(val)) {
					throw new TypeError(`Expected an array for storage["${key}"], but got ${typeof val}.`);
				}
				this.storage[key] = val; // Save
				return clone
					? val.map((obj) => '_clone' in obj ? obj._clone() : isClassInstance(obj) ? deepCloneInstance(obj) : mergeDeep(obj))
					: val;
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
		 * Modify a specific type of expressions in the wikitext content.
		 *
		 * This method extracts expressions of the given `type`, applies the `modificationPredicate`
		 * to transform them, and updates the wikitext accordingly.
		 *
		 * #### Example: Closing Unclosed Tags
		 * ```typescript
		 * const wkt = new mwbot.Wikitext('<span>a<div><del>b</span><span>c');
		 * const oldContent = wkt.content;
		 * const newContent = await wkt.modify('tags', async (tags) => {
		 *     return tags.map(obj => obj.unclosed ? obj.text + obj.end : null);
		 * });
		 *
		 * if (oldContent !== newContent) {
		 *     console.log(newContent);
		 *     // Output: <span>a<div><del>b</del></div></span><span>c</span>
		 * }
		 * ```
		 *
		 * **Important:** This method updates {@link content} and its associated expressions.
		 * Any copies initialized before calling this method should **not** be reused.
		 *
		 * @param type The type of expressions to modify.
		 * <table>
		 * 	<thead>
		 * 		<th>type</th>
		 * 		<th>First argument of modificationPredicate</th>
		 * 	</thead>
		 * 	<tbody>
		 * 		<tr>
		 * 			<td>tags</td>
		 * 			<td>An array of {@link Tag}</td>
		 * 		</tr>
		 * 		<tr>
		 * 			<td>parameters</td>
		 * 			<td>An array of {@link Parameter}</td>
		 * 		</tr>
		 * 		<tr>
		 * 			<td>sections</td>
		 * 			<td>An array of {@link Section}</td>
		 * 		</tr>
		 * 		<tr>
		 * 			<td>templates</td>
		 * 			<td>An array of {@link Template}</td>
		 * 		</tr>
		 * 		<tr>
		 * 			<td>wikilinks</td>
		 * 			<td>An array of {@link Wikilink} or {@link FileWikilink}</td>
		 * 		</tr>
		 * 	</tbody>
		 * </table>
		 * See also {@link ModificationMap} for the interface that defines this mapping.
		 *
		 * @param modificationPredicate
		 * A function that takes an array of expression objects and returns a Promise resolving
		 * to an array of strings or `null` values.
		 *
		 * - The input array consists of objects corresponding to the specified `type`.
		 * - The returned array must have the same length as the input array.
		 *   - Each string element represents the new content for the corresponding expression.
		 *   - `null` means no modification for that expression.
		 *
		 * @returns A Promise resolving to the modified wikitext content as a string.
		 *
		 * @throws {MwbotError}
		 * - If `type` is invalid.
		 * - If `modificationPredicate` is not a function.
		 * - If the returned array length does not match the input expressions array.
		 *
		 * @throws {Error} If `modificationPredicate` returns a rejected Promise.
		 */
		async modify<K extends keyof ModificationMap>(
			type: K,
			modificationPredicate: ModificationPredicate<ModificationMap[K]>
		): Promise<string> {

			// Validate the arguments
			if (typeof type !== 'string' || !['tags', 'parameters', 'sections', 'templates', 'wikilinks'].includes(type)) {
				throw new MwbotError({
					code: 'mwbot_fatal_invalidtype',
					info: `"${type}" is not a valid expression type for Wikitext.modify.`
				});
			} else if (typeof modificationPredicate !== 'function') {
				throw new MwbotError({
					code: 'mwbot_fatal_typemismatch',
					info: 'modificationPredicate must be a function.'
				});
			}

			// Get text modification settings
			let expressions = this.storageManager(type) as ModificationMap[K][];
			let mods: (string | null)[];
			// eslint-disable-next-line no-useless-catch
			try {
				mods = await modificationPredicate(expressions);
			} catch (err) {
				throw err;
			}
			if (mods.length !== expressions.length) {
				throw new MwbotError({
					code: 'mwbot_fatal_lengthmismatch',
					info: `The length of the array returned by modificationPredicate does not match that of the "${type}" array.`
				});
			} else if (!Array.isArray(mods)) {
				throw new MwbotError({
					code: 'mwbot_fatal_typemismatch',
					info: 'modificationPredicate must return an array.'
				});
			}

			// Apply the changes and update the entire wikitext content
			expressions = this.storageManager(type, false) as ModificationMap[K][]; // Reference storage again because the array might have been mutated
			let newContent = this.content;
			mods.some((text, i, arr) => {
				if (typeof text === 'string') {

					// Replace the old expression with a new one
					const initialEndIndex = expressions[i].endIndex;
					const firstPart = newContent.slice(0, expressions[i].startIndex);
					const secondPart = newContent.slice(initialEndIndex);
					newContent = firstPart + text + secondPart;

					// Exit early if this is the last loop iteration
					if (i === arr.length - 1) {
						return true;
					} // Otherwise we need to update the character indexes to continue the iteration

					// Adjust the end index of the modified expression based on new text length
					// (the start index doesn't change)
					const lengthGap = text.length - expressions[i].text.length;
					expressions[i].endIndex += lengthGap;

					// Adjust the start and end indices of all other expressions
					expressions.forEach((obj, j) => {
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

			this.storageManager('content', newContent); // Update the content
			return this.content;

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
			const regex = {
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
				if ((m = regex.start.exec(wkt))) {

					const nodeName = (m[1] || m[2]).toLowerCase();
					const selfClosing = regex.self.test(m[0]);

					// Check if the tag is a void tag
					if (regex.void.test(nodeName)) {
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

				} else if ((m = regex.end.exec(wkt))) {

					// If an end tag is found, attempt to match it with the corresponding start tag
					const nodeName = (m[1] || m[2]).toLowerCase();
					const endTag = m[0];

					// Different treatments for when this is the end of a void tag or a normal tag
					if (regex.void.test(nodeName)) {
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
		 * This is a shorthand method of {@link modify} with its first argument set as `tags`.
		 *
		 * @param modificationPredicate
		 * @returns
		 */
		modifyTags(modificationPredicate: ModificationPredicate<Tag>): Promise<string> {
			return this.modify('tags', modificationPredicate);
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

			/**
			 * Regular expressions to parse `<hN>` tags and `==heading==`s.
			 */
			const regex = {
				/**
				 * Capturing groups:
				 * * `$1`: Heading level (1 through 6)
				 */
				tag: /^h([1-6])$/,
				/**
				 * The wiki markup of headings:
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
				heading: /^(=+)(.+?)(=+)([^\n]*)\n?$/gm,
				whitespace: /[\t\u0020\u00a0]+/g
			};

			// Extract HTML-style headings (h1–h6)
			const headings = this.storageManager('tags', false).reduce((acc: Heading[], tagObj) => {
				const m = regex.tag.exec(tagObj.name);
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

			// Parse wikitext-style headings (==heading==)
			const wikitext = this.content;
			let m;
			while ((m = regex.heading.exec(wikitext))) {

				// If `$4` isn't empty or the heading is within a skip range, ignore it
				// See regex for capturing groups
				const m4 = removeComments(m[4]).replace(regex.whitespace, '');
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
					text: content
				};
			});

			return sections;

		}

		/**
		 * Parse sections in the wikitext.
		 * @param config Config to filter the output.
		 * @returns Array of parsed sections.
		 */
		parseSections(config: ParseSectionsConfig = {}): Section[] {
			let sections = this.storageManager('sections');
			if (typeof config.sectionPredicate === 'function') {
				sections = sections.filter((sec) => config.sectionPredicate!(sec));
			}
			return sections;
		}

		/**
		 * Modify sections in the wikitext content.
		 *
		 * This is a shorthand method of {@link modify} with its first argument set as `sections`.
		 *
		 * @param modificationPredicate
		 * @returns
		 */
		modifySections(modificationPredicate: ModificationPredicate<Section>): Promise<string> {
			return this.modify('sections', modificationPredicate);
		}

		/**
		 * Given the start and end indices of an expression, identify the section containing the expression.
		 *
		 * @param startIndex The start index of the expression.
		 * @param endIndex The end index of the expression (exclusive).
		 * @returns The deepest {@link Section} containing the expression, or `null` if none is found.
		 */
		identifySection(startIndex: number, endIndex: number): Section | null {
			const sections = this.storageManager('sections');
			let ret: Section | null = null;
			for (const sect of sections) {
				if (
					sect.startIndex <= startIndex && endIndex <= sect.endIndex &&
					// Ensure to pick up the deepest section
					(ret === null || ret.level < sect.level)
				) {
					ret = sect;
				}
			}
			return ret;
		}

		/**
		 * Parse `{{{parameter}}}` expressions in the wikitext.
		 * @returns Array of parsed parameters.
		 */
		private _parseParameters(): Parameter[]  {

			const isInSkipRange = this.getSkipPredicate();
			const params: Parameter[] = [];
			const regex = {
				/**
				 * Capturing groups:
				 * * `$1`: Parameter name
				 * * `$2`: Parameter value
				 */
				params: /\{{3}(?!{)([^|}]*)\|?([^}]*)\}{3}/g,
				twoOrMoreLeftBreaces: /\{{2,}/g,
				twoOrMoreRightBreaces: /\}{2,}/g,
				startWithTwoOrMoreRightBreaces: /^\}{2,}/,
				endWithThreeRightBraces: /\}{3}$/
			};
			const wikitext = this.content;
			let nestLevel = 0;

			let match: RegExpExecArray | null;
			while ((match = regex.params.exec(wikitext))) {

				// Skip parameters that don't satisfy the namePredicate
				const paramName = match[1].trim();
				let paramValue = match[2];
				let paramText = match[0];

				/**
				 * Parameters can contain nested templates (e.g., `{{{1|{{{page|{{PAGENAME}}}}}}}}`).
				 * In such cases, `exec` initially captures an incomplete parameter like `{{{1|{{{page|{{PAGENAME}}}`.
				 */
				const leftBraceCnt = (paramText.match(regex.twoOrMoreLeftBreaces) || []).join('').length;
				let rightBraceCnt = (paramText.match(regex.twoOrMoreRightBreaces) || []).join('').length;
				let isValid = true;

				// If the number of opening and closing braces is unbalanced
				if (leftBraceCnt > rightBraceCnt) {
					isValid = false;
					const rightBraceStartIndex = match.index + paramText.length - 3; // Get the end index of `{{{1|{{{page|{{PAGENAME` in `wikitext`
					rightBraceCnt -= 3;

					// Find the correct closing braces
					for (let pos = rightBraceStartIndex; pos < wikitext.length; pos++) {
						const closingMatch = wikitext.slice(pos).match(regex.startWithTwoOrMoreRightBreaces);
						if (closingMatch) {
							const closingBraces = closingMatch[0].length;
							if (leftBraceCnt <= rightBraceCnt + closingBraces) {
								// If the right braces close all the left braces
								const lastIndex = pos + (leftBraceCnt - rightBraceCnt);
								paramText = wikitext.slice(match.index, lastIndex); // Get the correct parameter
								paramValue += paramText.slice(rightBraceStartIndex - lastIndex).replace(regex.endWithThreeRightBraces, '');
								isValid = true;
								regex.params.lastIndex = lastIndex; // Update search position
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
						endIndex: regex.params.lastIndex,
						nestLevel,
						skip: isInSkipRange(match.index, regex.params.lastIndex)
					};
					params.push(param);

					// Handle nested parameters
					if (paramText.slice(3).includes('{{{')) {
						regex.params.lastIndex = match.index + 3;
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
		 * @param config Config to filter the output.
		 * @returns Array of parsed parameters.
		 */
		parseParameters(config: ParseParametersConfig = {}): Parameter[] {
			let parameters = this.storageManager('parameters');
			if (typeof config.namePredicate === 'function') {
				parameters = parameters.filter(({name}) => config.namePredicate!(name));
			}
			if (typeof config.parameterPredicate === 'function') {
				parameters = parameters.filter((param) => config.parameterPredicate!(param));
			}
			return parameters;
		}

		/**
		 * Modify parameters in the wikitext content.
		 *
		 * This is a shorthand method of {@link modify} with its first argument set as `parameters`.
		 *
		 * @param modificationPredicate
		 * @returns
		 */
		modifyParameters(modificationPredicate: ModificationPredicate<Parameter>): Promise<string> {
			return this.modify('parameters', modificationPredicate);
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
				const ctrlMatch = wkt.match(rCtrlStart);
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
							// Links like [[left|]] aren't expected to exist because of "pipe tricks",
							// and even if any, they aren't recognized as links but as raw texts.
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
			options: ParsedTemplateOptions = {},
			indexMap = this.getIndexMap({parameters: true, wikilinks_fuzzy: true}),
			nestLevel = 0,
			skip = false,
			wikitext = this.content
		): InstanceType<ParsedTemplate | MalformedTemplate | ParserFunction>[] {

			let numUnclosed = 0;
			let startIndex = 0;
			let components: Required<NewTemplateParameter>[] = [];
			const regex = {
				templateStart: /^\{\{/,
				templateEnd: /^\}\}/
			};

			// Character-by-character loop
			const templates: InstanceType<ParsedTemplate | MalformedTemplate | ParserFunction>[] = [];
			for (let i = 0; i < wikitext.length; i++) {

				const wkt = wikitext.slice(i);

				const ctrlMatch = wkt.match(rCtrlStart);
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
								...this._parseTemplates(options, indexMap, nestLevel, indexMap[i].type === 'tag', '\x01'.repeat(inner.start) + text)
							);
						}
					}
					i += indexMap[i].text.length - 1;
					continue;
				}

				if (numUnclosed === 0) {
					// We are not in a template
					if (regex.templateStart.test(wkt)) {
						// Found the start of a template
						startIndex = i;
						components = [];
						numUnclosed += 2;
						i++;
					}
				} else if (numUnclosed === 2) {
					// We are looking for closing braces
					if (regex.templateStart.test(wkt)) {
						// Found a nested template
						numUnclosed += 2;
						i++;
						processTemplateFragment(components, '{{');
					} else if (regex.templateEnd.test(wkt)) {
						// Found the end of the template
						const [titleObj, ...params] = components;
						const title = titleObj ? titleObj.key : '';
						const rawTitle = titleObj ? titleObj.value : '';
						const endIndex = i + 2;
						const text = wikitext.slice(startIndex, endIndex);
						const initializer = {
							title,
							rawTitle,
							text,
							params,
							startIndex,
							endIndex,
							nestLevel,
							skip
						};
						let temp: InstanceType<ParsedTemplate | MalformedTemplate | ParserFunction>;
						try {
							temp = new ParserFunction(initializer);
						} catch {
							try {
								temp = new ParsedTemplate(initializer, options);
							} catch {
								temp = new MalformedTemplate(initializer, options);
							}
						}
						templates.push(temp);
						const inner = temp.text.slice(2, -2);
						if (inner.includes('{{')) {
							templates.push(
								...this._parseTemplates(options, indexMap, nestLevel + 1, skip, '\x01'.repeat(startIndex + 2) + inner)
							);
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
					if (regex.templateStart.test(wkt)) {
						// Found another nested template
						fragment = '{{';
						numUnclosed += 2;
						i++;
					} else if (regex.templateEnd.test(wkt)) {
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
		 * @param config Config to filter the output.
		 * @returns
		 */
		parseTemplates(config: ParseTemplatesConfig = {}): InstanceType<ParsedTemplate | MalformedTemplate | ParserFunction>[] {
			const {hierarchies, titlePredicate, templatePredicate} = config;
			const options = {hierarchies};
			let templates = this.storageManager('templates', true, options);
			if (typeof titlePredicate === 'function') {
				templates = templates.filter(({title}) => titlePredicate(title));
			}
			if (typeof templatePredicate === 'function') {
				templates = templates.filter((template) => templatePredicate(template));
			}
			return templates;
		}

		/**
		 * Modify templates in the wikitext content.
		 *
		 * This is a shorthand method of {@link modify} with its first argument set as `templates`.
		 *
		 * @param modificationPredicate
		 * @returns
		 */
		modifyTemplates(modificationPredicate: ModificationPredicate<InstanceType<ParsedTemplate | MalformedTemplate | ParserFunction>>): Promise<string> {
			return this.modify('templates', modificationPredicate);
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
		 * @param config Config to filter the output.
		 * @returns Array of parsed wikilinks.
		 */
		parseWikilinks(config: ParseWikilinksConfig = {}): (Wikilink | FileWikilink)[] {
			let wikilinks = this.storageManager('wikilinks');
			if (typeof config.titlePredicate === 'function') {
				wikilinks = wikilinks.filter(({title}) => config.titlePredicate!(title));
			}
			if (typeof config.wikilinkPredicate === 'function') {
				wikilinks = wikilinks.filter((link) => config.wikilinkPredicate!(link));
			}
			return wikilinks;
		}

		/**
		 * Modify wikilinks in the wikitext content.
		 *
		 * This is a shorthand method of {@link modify} with its first argument set as `wikilinks`.
		 *
		 * @param modificationPredicate
		 * @returns
		 */
		modifyWikilinks(modificationPredicate: ModificationPredicate<Wikilink | FileWikilink>): Promise<string> {
			return this.modify('wikilinks', modificationPredicate);
		}

		/**
		 * Fetch the content of the latest revision of a title from the API.
		 *
		 * This method does the same as {@link Mwbot.read}.
		 *
		 * @param title
		 * @param requestOptions
		 * @returns
		 */
		static fetch(title: string | InstanceType<Title>, requestOptions: MwbotRequestConfig = {}): Promise<Revision> {
			return mw.read(title, requestOptions);
		}

		/**
		 * Edit an existing page by first fetching its latest revision and applying a transformation
		 * function to modify its content.
		 *
		 * This method does the same as {@link Mwbot.transform}.
		 *
		 * @param title
		 * @param transform
		 * @param requestOptions
		 * @returns
		 */
		static submit(
			title: string | InstanceType<Title>,
			transform: (wikitext: Wikitext, revision: Revision) => Promise<ApiEditPageParams>,
			requestOptions: MwbotRequestConfig = {}
		): Promise<ApiResponse> {
			return mw.transform(title, transform, requestOptions);
		}


	}

	return Wikitext;

}

/**
 * @internal
 */
export type Wikitext = ReturnType<typeof WikitextFactory>;

// Interfaces for constructor and the entire module

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

/**
 * A mapping of a storage key to parser methods' arguments, used to make it possible to pass
 * function arguments to storageManager.
 * @internal
 */
interface StorageArgumentMap {
	content: never;
	tags: never;
	parameters: never;
	sections: never;
	wikilinks_fuzzy: never;
	templates: ParsedTemplateOptions;
	wikilinks: never;
}

/**
 * Type of the callback function for {@link Wikitext.modify}.
 */
export type ModificationPredicate<T> = (expressions: T[]) => Promise<(string | null)[]>;

/**
 * A mapping of a type key to its object type, used in {@link Wikitext.modify}.
 */
export interface ModificationMap {
	tags: Tag;
	parameters: Parameter;
	sections: Section;
	templates: InstanceType<ParsedTemplate | MalformedTemplate | ParserFunction>;
	wikilinks: Wikilink | FileWikilink;
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
	text: string;
}

/**
 * Configuration options for {@link Wikitext.parseSections}.
 */
export interface ParseSectionsConfig {
	/**
	 * A predicate function to filter parsed sections.
	 * Only sections that satisfy this function will be included in the results.
	 *
	 * @param section The section object.
	 *
	 * @returns `true` if the section should be included, otherwise `false`.
	 */
	sectionPredicate?: (section: Section) => boolean;
}

// Interfaces and private members for "parseParameters"

/**
 * Object that holds information about a `{{{parameter}}}`, parsed from wikitext.
 */
export interface Parameter {
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
export interface ParseParametersConfig {
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
	title: InstanceType<Title> | null;
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
 *
 * This interface extends {@link BaseWikilink} and contains the additional {@link left} and
 * {@link right} properties.
 *
 * @private
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
 * @private
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
	 * A predicate function to filter templates by title.
	 * Only templates whose titles satisfy this function will be included in the results.
	 *
	 * @param title A Title object for ParsedTemplate, or a string for MalformedTemplate.
	 * @returns `true` if the template should be parsed, otherwise `false`.
	 */
	titlePredicate?: (title: InstanceType<Title> | string) => boolean;
	/**
	 * A predicate function to filter parsed templates.
	 * Only templates that satisfy this function will be included in the results.
	 *
	 * @param template The template object.
	 * @returns `true` if the template should be included, otherwise `false`.
	 */
	templatePredicate?: (template: InstanceType<ParsedTemplate | MalformedTemplate | ParserFunction>) => boolean;
	/**
	 * See {@link TemplateParameterHierarchies}.
	 */
	hierarchies?: TemplateParameterHierarchies;
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
function processTemplateFragment(components: Required<NewTemplateParameter>[], fragment: string, options: FragmentOptions = {}): void {

	// Determine which element to modify: either a new element for a new parameter or an existing one
	const {nonNameComponent, isNew} = options;
	const i = isNew ? components.length : Math.max(components.length - 1, 0);

	// Initialize the element if it does not exist
	if (!(i in components)) {
		components[i] = {key: '', value: ''};
	}

	// Process the fragment and update the `components` array
	let equalIndex;
	if (i === 0 && nonNameComponent) {
		// `components[0]` handler (looking for a template title): extra characters
		components[i].value += fragment;
	} else if (i === 0) {
		// `components[0]` handler (looking for a template title): part of the title
		components[i].key += fragment;
		components[i].value += fragment;
	} else if ((equalIndex = fragment.indexOf('=')) !== -1 && !components[i].key && !nonNameComponent) { // TODO: Handle {{=}}
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

// Interfaces and private members for "parseWikilinks"

/**
 * Object that holds information about a `[[wikilink]]`, parsed from wikitext.
 *
 * This interface extends {@link BaseWikilink} and contains the additional {@link display} property.
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
 *
 * This interface extends {@link BaseWikilink} and contains the additional {@link params} property.
 */
export interface FileWikilink extends BaseWikilink {
	/**
	 * The parameters of the file link (the part after `|`).
	 *
	 * These are the trimmed versions of `param(s)` in `[[file title|...params]]`.
	 */
	params: string[];
}

/**
 * Configuration options for {@link Wikitext.parseWikilinks}.
 */
export interface ParseWikilinksConfig {
	/**
	 * A predicate function to filter wikilinks by title.
	 * Only wikilinks whose titles satisfy this function will be included in the results.
	 *
	 * @param title A Title object representing the wikilink. Could be `null` if the title is invalid.
	 * @returns `true` if the wikilink should be parsed, otherwise `false`.
	 */
	titlePredicate?: (title: InstanceType<Title> | null) => boolean;
	/**
	 * A predicate function to filter parsed wikilinks.
	 * Only wikilinks that satisfy this function will be included in the results.
	 *
	 * @param wikilink The (file) wikilink object.
	 * @returns `true` if the wikilink should be included, otherwise `false`.
	 */
	wikilinkPredicate?: (wikilink: Wikilink | FileWikilink) => boolean;
}