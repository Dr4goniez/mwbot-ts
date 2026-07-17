/**
 * This module defines the {@link WikitextStatic | Wikitext} class, accessible
 * via {@link Mwbot#Wikitext}, which provides methods for parsing and modifying wikitext.
 *
 * ## Core Class
 * - {@link WikitextStatic} (instance members: {@link Wikitext})
 *
 * **Usage**:
 * ```ts
 * import { Mwbot, MwbotInitOptions } from 'mwbot-ts';
 *
 * const initOptions: MwbotInitOptions = {...};
 * Mwbot.init(initOptions).then((mwbot) => {
 *   const wikitext = new mwbot.Wikitext('your wikitext');
 *   // Wikitext manipulations...
 * });
 * ```
 *
 * ## Object Types
 * The `Wikitext` class consists of both:
 * - **Plain objects**, which store parsed structures without additional behavior.
 * - **Classes**, which encapsulate certain wiki markups as structured instances.
 *
 * ### Plain Objects:
 * - {@link Tag}: Represents parsed HTML tags. This object is returned by {@link Wikitext.parseTags}.
 * - {@link Parameter}: Represents parsed `{{{parameter}}}` markups. This object is returned by {@link Wikitext.parseParameters}.
 * - {@link Section}: Represents parsed sections. This object is returned by {@link Wikitext.parseSections}.
 *
 * ### Classes:
 * **`{{double-braced}}` markups:**
 * - {@link TemplateStatic | Template}: Encapsulates `{{template}}` markups as objects.
 * Accessible via {@link Mwbot#Template}.
 *   - {@link ParsedTemplateStatic | ParsedTemplate}: A subclass of `Template`, whose
 *   instances are returned by {@link Wikitext.parseTemplates}. Its constructor is inaccessible.
 * - {@link ParserFunctionStatic | ParserFunction}: Encapsulates `{{#parserfunction:}}` markups.
 * Accessible via {@link Mwbot#ParserFunction}.
 *   - {@link ParsedParserFunctionStatic | ParsedParserFunction}: A subclass of `ParserFunction`,
 *   whose instances are returned by {@link Wikitext.parseTemplates}. Its constructor is inaccessible.
 * - {@link RawTemplateStatic | RawTemplate}: Encapsulates `{{template}}` markups with
 * an *unparsable* title. Instances are returned by {@link Wikitext.parseTemplates}.
 * Its constructor is inaccessible.
 *
 * **`[[double-bracketed]]` markups:**
 * - {@link WikilinkStatic | Wikilink}: Encapsulates `[[wikilink]]` markups with a *non-file* title.
 * Accessible via {@link Mwbot#Wikilink}.
 *   - {@link ParsedWikilinkStatic | ParsedWikilink}: A subclass of `Wikilink`, whose
 *   instances are returned by {@link Wikitext.parseWikilinks}. Its constructor is inaccessible.
 * - {@link FileWikilinkStatic | FileWikilink}: Encapsulates `[[File:...]]` markups.
 * Accessible via {@link Mwbot#FileWikilink}.
 *   - {@link ParsedFileWikilinkStatic | ParsedFileWikilink}: A subclass of `FileWikilink`, whose
 *   instances are returned by {@link Wikitext.parseWikilinks}. Its constructor is inaccessible.
 * - {@link RawWikilinkStatic | RawWikilink}: Encapsulates `[[wikilink]]` markups with an *unparsable* title.
 * Accessible via {@link Mwbot#RawWikilink}.
 *   - {@link ParsedRawWikilinkStatic | ParsedRawWikilink}: A subclass of `RawWikilink`, whose
 *   instances are returned by {@link Wikitext.parseWikilinks}. Its constructor is inaccessible.
 *
 * @module
 */

import { MwbotError } from './MwbotError.js';
import type { Mwbot, MwbotRequestConfig } from './Mwbot.js';
import { CloneConfig, cloneDeep, isObject } from './Util.js';
import { byteLength } from './String.js';
import type { Title } from './Title.js';
import type {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	TemplateStatic,
	ParsedTemplateStatic,
	ParsedTemplate,
	RawTemplateStatic,
	RawTemplate,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	ParserFunctionStatic,
	ParsedParserFunctionStatic,
	ParsedParserFunction,
	TemplateParameterHierarchies,
	ParsedTemplateOptions,
	ParsedTemplateInitializer,
} from './Template.js';
import type {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	WikilinkStatic,
	ParsedWikilinkStatic,
	ParsedWikilink,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	FileWikilinkStatic,
	ParsedFileWikilinkStatic,
	ParsedFileWikilink,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	RawWikilinkStatic,
	ParsedRawWikilinkStatic,
	ParsedRawWikilink,
	ParsedWikilinkInitializer,
	ParsedFileWikilinkInitializer,
	ParsedRawWikilinkInitializer,
} from './Wikilink.js';
import { formatType } from './internal/helpers.js';
import {
	addFuzzyWikilinkIndexMap,
	addParameterIndexMap,
	addTagIndexMap,
	addTemplateIndexMap,
	assignNestedKinships,
	IndexMap,
	IndexMapOptions,
	sortParseResults,
} from './internal/wikitext/sharedHelpers.js';
import {
	createNonVoidTag,
	createVoidTag,
	getParserExtensionTags,
	getRecognizedSkipTags,
	sanitizeNodeName,
	TAG_HTML,
	TAG_SINGLE_ALLOWED,
	TAG_SINGLE_ONLY,
	TAG_TRANSCLUSION,
	tagRegex,
} from './internal/wikitext/tagHelpers.js';
import {
	assignSectionKinships,
	CommentPlaceholderManager,
	headingRegex,
	removeComments,
} from './internal/wikitext/sectionHelpers.js';
import {
	countConsecutiveBraces,
	parameterRegex,
} from './internal/wikitext/parameterHelpers.js';
import {
	restoreLastTemplateComponent,
	findNextTemplateTokenIndex,
	PipePlaceholderManager,
	processTemplateFragment,
	TemplateComponent,
	templateRegex,
} from './internal/wikitext/templateHelpers.js';

/**
 * @expand
 * @private
 */
export type DoubleBracedClasses = ParsedTemplate | ParsedParserFunction | RawTemplate;
/**
 * @expand
 * @private
 */
export type DoubleBracketedClasses = ParsedWikilink | ParsedFileWikilink | ParsedRawWikilink;

/**
 * This interface defines the static members of the `Wikitext` class. For instance members,
 * see {@link Wikitext} (defined separately due to TypeScript limitations).
 *
 * This class is accesible via {@link Mwbot#Wikitext}.
 */
export interface WikitextStatic {
	/**
	 * Creates a new `Wikitext` instance.
	 *
	 * **Usage**:
	 * ```ts
	 * const wikitext = new mwbot.Wikitext('Some wikitext');
	 * ```
	 *
	 * @param content A wikitext content.
	 * @throws If `content` is not a string.
	 */
	new(content: string): Wikitext;
	/**
	 * Alias of the {@link WikitextStatic.constructor | constructor}.
	 *
	 * **Usage**:
	 * ```ts
	 * const wikitext = mwbot.Wikitext.new('Some wikitext');
	 * ```
	 *
	 * @param content A wikitext content.
	 * @throws If `content` is not a string.
	 */
	'new'(content: string): Wikitext;
	/**
	 * Creates a new instance by fetching the content of the given title.
	 *
	 * **Example**:
	 * ```ts
	 * const wikitext = await mwbot.Wikitext.newFromTitle('Foo').catch((err: MwbotError) => err);
	 * if (wikitext instanceof MwbotError) {
	 *   console.error(wikitext);
	 *   return;
	 * }
	 * // Example for parsing the sections of the page 'Foo'
	 * const sections = wikitext.parseSections();
	 * ```
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to a new `Wikitext` instance.
	 */
	newFromTitle(title: string | Title, requestOptions?: MwbotRequestConfig): Promise<Wikitext>;
	/**
	 * Returns the set of tag names recognized by MediaWiki.
	 *
	 * @param type The type of tags to retrieve.
	 * @returns Set of tag names (all elements are in lowercase).
	 */
	getValidTags(type?: TagType): ReadonlySet<string>;
	/**
	 * Checks whether a tag name is recognized by MediaWiki.
	 *
	 * @param tagName The tag name to check.
	 * @param type The type of tags to validate `tagName` against.
	 * @returns A boolean indicating whether the tag name is valid.
	 */
	isValidTag(tagName: string, type?: TagType): boolean;
}

/**
 * The instance members of the `Wikitext` class. For static members,
 * see {@link WikitextStatic} (defined separately due to TypeScript limitations).
 *
 * `Wikitext` instances primarily provide **parsing** and **modification** methods:
 *
 * - `<tag></tag>`: {@link parseTags}, {@link modifyTags}
 * - `== section ==`: {@link parseSections}, {@link modifySections}
 * - `{{{parameter}}}`: {@link parseParameters}, {@link modifyParameters}
 * - `{{template}}`: {@link parseTemplates}, {@link modifyTemplates}
 * - `[[wikilink]]`: {@link parseWikilinks}, {@link modifyWikilinks}
 *
 * The modification methods are centralized in {@link modify},
 * which applies a transformation callback to the output of a parser method.
 */
export interface Wikitext {
	/**
	 * Returns the length of the wikitext.
	 *
	 * The same result can be obtained by using:
	 * ```ts
	 * wikitext.content.length;
	 * ```
	 */
	get length(): number;
	/**
	 * Returns the byte length of the wikitext.
	 *
	 * The same result can be obtained by using:
	 * ```ts
	 * Mwbot.String.byteLength(wikitext.content);
	 * ```
	 */
	get byteLength(): number;
	/**
	 * Returns the wikitext content of the instance.
	 */
	get content(): string;
	/**
	 * Parses the wikitext content for HTML tags.
	 *
	 * @param config Config to filter the output.
	 * @returns An array of {@link Tag} objects.
	 */
	parseTags(config?: ParseTagsConfig): Tag[];
	/**
	 * Modifies tags in the wikitext content.
	 *
	 * This is a shorthand method of {@link modify} with its first argument set as `tags`.
	 *
	 * @param modificationPredicate
	 * @returns
	 */
	modifyTags(
		modificationPredicate: ModificationPredicate<ModificationMap['tags']>
	): string;
	/**
	 * Parses the wikitext content for sections.
	 *
	 * @param config Config to filter the output.
	 * @returns An array of parsed sections.
	 */
	parseSections(config?: ParseSectionsConfig): Section[];
	/**
	 * Modifies sections in the wikitext content.
	 *
	 * This is a shorthand method of {@link modify} with its first argument set as `sections`.
	 *
	 * @param modificationPredicate
	 * @returns
	 */
	modifySections(
		modificationPredicate: ModificationPredicate<ModificationMap['sections']>
	): string;
	/**
	 * Identifies the section containing an expression based on its start and end indices.
	 *
	 * @param obj Any (markup) object containing `startIndex` and `endIndex` properties.
	 * @returns The deepest {@link Section} containing the expression, or `null` if none is found.
	 */
	identifySection(obj: { startIndex: number; endIndex: number } & Record<string, any>): Section | null;
	/**
	 * Identifies the section containing an expression based on its start and end indices.
	 *
	 * This method is intended to be used with expressions obtained from parser methods.
	 *
	 * @param startIndex The start index of the expression.
	 * @param endIndex The exclusive end index of the expression.
	 * @returns The deepest {@link Section} containing the expression, or `null` if none is found.
	 */
	identifySection(startIndex: number, endIndex: number): Section | null;
	/**
	 * Parses the wikitext content for `{{{parameter}}}` markups.
	 *
	 * @param config Config to filter the output.
	 * @returns An array of parsed parameters.
	 */
	parseParameters(config?: ParseParametersConfig): Parameter[];
	/**
	 * Modifies `{{{parameter}}}` markups in the wikitext content.
	 *
	 * This is a shorthand method of {@link modify} with its first argument set as `parameters`.
	 *
	 * @param modificationPredicate
	 * @returns
	 */
	modifyParameters(
		modificationPredicate: ModificationPredicate<ModificationMap['parameters']>
	): string;
	/**
	 * Parses the wikitext content for `{{template}}` markups.
	 *
	 * This method parses any double-braced markups, including magic words and parser functions.
	 *
	 * @param config Config to filter the output.
	 * @returns An array of parsed templates.
	 */
	parseTemplates(config?: ParseTemplatesConfig): DoubleBracedClasses[];
	/**
	 * Modifies `{{template}}` markups in the wikitext content.
	 *
	 * This is a shorthand method of {@link modify} with its first argument set as `templates`.
	 *
	 * @param modificationPredicate
	 * @returns
	 */
	modifyTemplates(
		modificationPredicate: ModificationPredicate<ModificationMap['templates']>
	): string;
	/**
	 * Parses the wikitext content for `[[wikilink]]` markups in the wikitext.
	 *
	 * @param config Config to filter the output.
	 * @returns An array of parsed wikilinks.
	 */
	parseWikilinks(config?: ParseWikilinksConfig): DoubleBracketedClasses[];
	/**
	 * Modifies `[[wikilink]]` markups in the wikitext content.
	 *
	 * This is a shorthand method of {@link modify} with its first argument set as `wikilinks`.
	 *
	 * @param modificationPredicate
	 * @returns
	 */
	modifyWikilinks(
		modificationPredicate: ModificationPredicate<ModificationMap['wikilinks']>
	): string;
	/**
	 * Modifies a specific type of expression in the wikitext content.
	 *
	 * This method extracts expressions of the given `type`, applies the `modificationPredicate`
	 * to transform them, and updates the wikitext accordingly.
	 *
	 * #### Example: Closing unclosed tags
	 * ```ts
	 * const wikitext = new mwbot.Wikitext('<span>a<div><del>b</span><span>c');
	 * const oldContent = wikitext.content;
	 * const newContent = wikitext.modify('tags', (tag) => {
	 *   if (tag.unclosed && !tag.skip) {
	 *     // If this tag is unclosed, append its expected end tag to the tag text.
	 *     // `Tag` objects with the `unclosed` property set to `true` have their
	 *     // expected end tag stored in the `end` property.
	 *     // In most cases, the `skip` property should be guaranteed to be `false`
	 *     // to ensure we're not modifying special cases such as
	 *     // "<nowiki><noinclude></nowiki>".
	 *     return tag.text + tag.end; // Returning a string applies the modification.
	 *   } else {
	 *     return null; // Returning `null` means no modification is made.
	 *   }
	 * });
	 *
	 * if (oldContent !== newContent) {
	 *   console.log(newContent);
	 *   // Output: <span>a<div><del>b</del></div></span><span>c</span>
	 * }
	 * ```
	 *
	 * #### Shorthand methods
	 * - {@link modifyTags}
	 * - {@link modifyParameters}
	 * - {@link modifySections}
	 * - {@link modifyTemplates}
	 * - {@link modifyWikilinks}
	 *
	 * #### Important notes
	 * - This method (and its shorthand variants) modifies and updates {@link content} and its
	 *   associated expressions.
	 * - Any copies of `content` or parsed expressions made before calling this method should **not**
	 *   be reused, as properties such as `startIndex` will change after modification.
	 *
	 * @param type The type of expressions to modify.
	 *
	 * <table>
	 *   <thead>
	 *     <tr><th>Type</th><th>First argument of <code>modificationPredicate</code></th></tr>
	 *   </thead>
	 *   <tbody>
	 *     <tr><td>tags</td><td>{@link Tag}</td></tr>
	 *     <tr><td>parameters</td><td>{@link Parameter}</td></tr>
	 *     <tr><td>sections</td><td>{@link Section}</td></tr>
	 *     <tr><td>templates</td><td>{@link ParsedTemplate}, {@link ParsedParserFunction}, or {@link RawTemplate}</td></tr>
	 *     <tr><td>wikilinks</td><td>{@link ParsedWikilink}, {@link ParsedFileWikilink}, or {@link ParsedRawWikilink}</td></tr>
	 *   </tbody>
	 * </table>
	 * See also {@link ModificationMap} for the interface that defines this mapping.
	 *
	 * @param modificationPredicate
	 * A function that processes expression objects and returns a string or `null`.
	 * - Each returned string replaces the corresponding expression.
	 * - Returning `null` means no modification is applied to that expression.
	 *
	 * @returns The modified wikitext content.
	 *
	 * @throws {MwbotError}
	 * - If `type` is invalid.
	 * - If `modificationPredicate` is not a function.
	 * - If the array created from `modificationPredicate` contains values other than strings or `null`.
	 */
	modify<K extends keyof ModificationMap>(
		type: K,
		modificationPredicate: ModificationPredicate<ModificationMap[K]>
	): string;
}

/**
 * @internal
 */
export function WikitextFactory(
	mwbot: Mwbot,
	info: Mwbot['_info'],
	ParsedTemplate: ParsedTemplateStatic,
	RawTemplate: RawTemplateStatic,
	ParsedParserFunction: ParsedParserFunctionStatic,
	ParsedWikilink: ParsedWikilinkStatic,
	ParsedFileWikilink: ParsedFileWikilinkStatic,
	ParsedRawWikilink: ParsedRawWikilinkStatic
) {

	const namespaceIds = mwbot.config.get('wgNamespaceIds');
	const NS_FILE = namespaceIds.file;

	const TAG_EXT = getParserExtensionTags(info);
	const TAG_VALID: ReadonlySet<string> = new Set([
		...TAG_HTML, ...TAG_TRANSCLUSION, ...TAG_EXT,
	]);
	const TAG_CLOSEABLE: ReadonlySet<string> = new Set(
		Array.from(TAG_VALID).filter((tag) => !TAG_SINGLE_ONLY.has(tag))
	);
	const TAG_SELF_CLOSEABLE: ReadonlySet<string> = new Set([
		...TAG_SINGLE_ALLOWED, ...TAG_TRANSCLUSION, ...TAG_EXT,
	]);
	const TAG_SKIP_RECOGNIZED = getRecognizedSkipTags(TAG_EXT);

	const getTagsByType = (type: TagType = 'any'): ReadonlySet<string> => {
		switch (type) {
			case 'void':
				return TAG_SINGLE_ONLY;
			case 'extension':
				return TAG_EXT;
			case 'selfClosing':
				return TAG_SELF_CLOSEABLE;
			case 'closeable':
				return TAG_CLOSEABLE;
			case 'skip':
				return TAG_SKIP_RECOGNIZED;
			case 'transclusion':
				return TAG_TRANSCLUSION;
			default:
				return TAG_VALID;
		}
	};

	const CLONE_INSTANCE_CONFIG = new CloneConfig({ cloneClassInstances: true });

	const MODIFICATION_TYPES: Set<keyof ModificationMap> = new Set(
		['tags', 'parameters', 'sections', 'templates', 'wikilinks']
	);

	const verifyHook = ParsedParserFunction.verify.bind(ParsedParserFunction);

	class Wikitext implements Wikitext {

		/**
		 * Storage of the content and parsed entries. Used for the efficiency of parsing methods.
		 */
		private storage: {
			content: string;
			tags: Tag[] | null;
			parameters: Parameter[] | null;
			sections: Section[] | null;
			wikilinks_fuzzy: FuzzyWikilink[] | null;
			templates: DoubleBracedClasses[] | null;
			wikilinks: DoubleBracketedClasses[] | null;
		};

		constructor(content: string) {
			if (typeof content !== 'string') {
				throw new MwbotError('fatal', {
					code: 'typemismatch',
					info: `Expected a string for "content", but got "${formatType(content)}".`,
				});
			}

			this.storage = {
				content,
				tags: null,
				parameters: null,
				sections: null,
				wikilinks_fuzzy: null,
				templates: null,
				wikilinks: null,
			};
		}

		static new(content: string): Wikitext {
			return new Wikitext(content);
		}

		static async newFromTitle(title: string | Title, requestOptions?: MwbotRequestConfig): Promise<Wikitext> {
			const rev = await mwbot.read(title, requestOptions);
			return new Wikitext(rev.content);
		}

		/**
		 * Retrieves the value of `key` from {@link storage}.
		 *
		 * - If the stored value is `null`, the wikitext is parsed and the result is stored.
		 * - If `clone` is `true` (default), a deep copy of the value is returned.
		 *
		 * @param key The storage key to retrieve.
		 * @param clone Whether to return a deep copy of the value (default: `true`).
		 * @param args Arguments to pass to the relevant parser method.
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
					throw new MwbotError('fatal', {
						code: 'internal',
						info: `Expected an array for storage["${key}"], but got ${formatType(val)}.`,
					});
				}
				this.storage[key] = val; // Save
				return clone ? val.map((obj) => cloneDeep(obj, CLONE_INSTANCE_CONFIG)) : val;
			}

			// If setting a value
			if (key === 'content') {
				if (typeof valueOrClone !== 'string') {
					throw new MwbotError('fatal', {
						code: 'internal',
						info: `Expected a string for storage.content, but got ${formatType(valueOrClone)}.`,
					});
				}
				// Content update should reset parsing results
				this.storage = {
					content: valueOrClone,
					tags: null,
					parameters: null,
					sections: null,
					wikilinks_fuzzy: null,
					templates: null,
					wikilinks: null,
				};
			} else if (key in this.storage) {
				// Set the passed array
				this.storage[key] = valueOrClone;
			} else {
				throw new MwbotError('fatal', {
					code: 'internal',
					info: `Invalid key: ${key}.`,
				});
			}

			return this;
		}

		get length(): number {
			return this.storage.content.length;
		}

		get byteLength(): number {
			return byteLength(this.storage.content);
		}

		get content(): string {
			return this.storage.content;
		}

		static getValidTags(type?: TagType): ReadonlySet<string> {
			return new Set([...getTagsByType(type)]);
		}

		static isValidTag(tagName: string, type?: TagType): boolean {
			tagName = String(tagName).toLowerCase();
			return getTagsByType(type).has(tagName);
		}

		/**
		 * Generates a function that evaluates whether a string starting at an index and ending at another
		 * is inside a tag in which that string shouldn't be parsed.
		 *
		 * @param tags Use these {@link Tag} objects to create the function rather than calling
		 * {@link storageManager}. Passed only from {@link _parseTags}.
		 * @returns A function that checks whether a given range is inside any tag to skip parsing.
		 */
		private getSkipPredicate(tags?: Tag[]): (startIndex: number, endIndex: number) => boolean {
			tags ??= this.storageManager('tags', false);

			// Create an array to store the start and end indices of tags to skip
			const indexMap: [number, number][] = [];

			for (const tag of tags) {
				if (!Wikitext.isValidTag(tag.name, 'skip')) {
					continue;
				}

				const last = indexMap.at(-1);
				if (!last || !(last[0] < tag.startIndex && tag.endIndex < last[1])) {
					indexMap.push([tag.startIndex, tag.endIndex]);
				}
			}

			// Return a predicate function that checks if a given range is inside any of the skip tag ranges
			return (startIndex: number, endIndex: number) => {
				for (const [skipStart, skipEnd] of indexMap) {
					if (skipStart >= startIndex) {
						break;
					}
					if (endIndex < skipEnd) {
						return true;
					}
				}
				return false;
			};
		}

		/**
		 * Parses the wikitext content for HTML tags.
		 *
		 * @returns
		 */
		private _parseTags(): Tag[] {

			/**
			 * Array to store unclosed start tags that need matching end tags
			 */
			const startTags: StartTag[] = [];

			// Parse the wikitext string by checking each character
			const wikitext = this.content;
			const parsed: Tag[] = [];
			for (let i = 0; i < wikitext.length; i++) {

				const wkt = wikitext.slice(i);

				if (wkt[0] !== '<' && !wkt.startsWith('-->')) {
					const nextIndex = wkt.search(tagRegex.next);
					if (nextIndex === -1) {
						break;
					}
					i += nextIndex - 1;
					continue;
				}

				let m: RegExpExecArray | null;

				// If a start tag is found
				if ((m = tagRegex.start.exec(wkt))) {

					const startTag = m[0];
					const nodeName = (m[1] || m[2]).toLowerCase();
					const selfClosing = startTag.endsWith('/>');

					if (Wikitext.isValidTag(nodeName, 'void')) {
						// This is a "void" tag.
						// MediaWiki disallows tags like <br> to have a closing tag. If there's one
						// (e.g., "<br></br>"), the sequence is recognized as two <br> tags.
						const tag = createVoidTag({
							name: nodeName,
							start: startTag,
							startIndex: i,
							nestLevel: startTags.length,
							selfClosing,
						});
						parsed.push(tag);
					} else if (selfClosing && Wikitext.isValidTag(nodeName, 'selfClosing')) {
						// This is a non-void tag that can be self-closed.
						const tag = createNonVoidTag({
							name: nodeName,
							start: startTag,
							content: null,
							end: '',
							startIndex: i,
							endIndex: i + startTag.length,
							nestLevel: startTags.length,
							unclosed: false,
							selfClosing: true,
						});
						parsed.push(tag);
					} else {
						// Store non-void start tags for later matching with end tags.
						startTags.unshift({
							name: nodeName,
							startIndex: i,
							endIndex: i + startTag.length,
							selfClosing,
						});
					}

					// Skip ahead by the length of the matched tag to continue parsing
					i += startTag.length - 1;
					continue;
				}

				// If an end tag is found
				if ((m = tagRegex.end.exec(wkt))) {

					const endTag = m[0];
					const nodeName = (m[1] || m[2]).toLowerCase();

					if (Wikitext.isValidTag(nodeName, 'void')) {
						// Handle tags like </br> that are recognized as start tags
						const tag = createVoidTag({
							name: nodeName,
							start: endTag,
							startIndex: i,
							nestLevel: startTags.length,
							selfClosing: false,
						});
						parsed.push(tag);
					} else {
						// Attempt to match the end tag with the corresponding start tag

						let closedTagCnt = 0;

						for (const startTag of startTags) {
							// The most recently collected tag is at index 0 (because of unshift())

							const startTagName = sanitizeNodeName(startTag.name);
							/**
							 * `true` when e.g. `<span></span>`, `false` when e.g. `<span><div></span>`
							 */
							const startTagMatched = startTag.name === nodeName;
							/**
							 * The last index of this end tag (`</span>|`), or that of an unclosed tag
							 * (`<div>|</span>`)
							 */
							const endIndex = startTagMatched ? i + endTag.length : i;

							const tag = createNonVoidTag({
								name: startTagName, // Can be the name of an unclosed tag
								start: wikitext.slice(startTag.startIndex, startTag.endIndex),
								content: wikitext.slice(startTag.endIndex, endIndex - (startTagMatched ? endTag.length : 0)),
								// If we've found an unclosed tag, supplement an end tag for it
								// NOTE: No need to handle comment tags here because they aren't closed unless closed
								// But they nevertheless need to be handled when we get out of the iteration
								end: !startTagMatched ? `</${startTagName}>` : endTag,
								startIndex: startTag.startIndex,
								endIndex,
								// closedTagCnt being more than 0 means we forcibly closed unclosed tags in the previous loops.
								// But we have yet to remove the proccessed start tags, so we need to subtract the number of
								// the processed tags to calculate the nesting level properly
								nestLevel: startTags.length - 1 - closedTagCnt,
								unclosed: !startTagMatched,
								selfClosing: startTag.selfClosing,
							});
							parsed.push(tag);
							closedTagCnt++;

							// Bail the loop when we find a start-end pair
							if (startTagMatched) {
								break;
							}
						}

						// Remove the matched start tags from the stack
						startTags.splice(0, closedTagCnt);
					}

					i += m[0].length - 1;
				}
			}

			// Handle any unclosed tags left in the stack
			for (const [i, startTag] of startTags.entries()) {
				const startTagName = sanitizeNodeName(startTag.name);
				const tag = createNonVoidTag({
					name: startTagName, // Can be the name of an unclosed tag
					start: wikitext.slice(startTag.startIndex, startTag.endIndex),
					content: wikitext.slice(startTag.endIndex, wikitext.length),
					// Supplement end tags for unclosed tags, including comment tags
					end: startTagName !== '!--' ? `</${startTagName}>` : '-->',
					startIndex: startTag.startIndex,
					endIndex: wikitext.length,
					nestLevel: startTags.length - 1 - i,
					unclosed: true,
					selfClosing: startTag.selfClosing,
				});
				parsed.push(tag);
			}

			sortParseResults(parsed);
			const isInSkipRange = this.getSkipPredicate(parsed);
			parsed.forEach((tag) => {
				tag.skip = isInSkipRange(tag.startIndex, tag.endIndex);
			});
			assignNestedKinships(parsed);

			return parsed;
		}

		parseTags(config: ParseTagsConfig = {}): Tag[] {
			const { namePredicate, tagPredicate } = config;
			let tags = this.storageManager('tags');
			if (typeof namePredicate === 'function') {
				tags = tags.filter(({ name }) => namePredicate(name));
			}
			if (typeof tagPredicate === 'function') {
				tags = tags.filter((obj) => tagPredicate(obj));
			}
			return tags;
		}

		modifyTags(
			modificationPredicate: ModificationPredicate<ModificationMap['tags']>
		): string | Promise<string> {
			return this.modify('tags', modificationPredicate);
		}

		/**
		 * Parses the wikitext content for sections.
		 *
		 * @returns An array of parsed sections.
		 */
		private _parseSections(): Section[] {

			const isInSkipRange = this.getSkipPredicate();

			// Extract HTML-style headings (<h1>–<h6>)
			const tags = this.storageManager('tags', false);
			const headings: Heading[] = [];

			for (const tag of tags) {
				const match = headingRegex.tag.exec(tag.name);
				if (match && !isInSkipRange(tag.startIndex, tag.endIndex)) {
					headings.push({
						text: tag.text,
						// TODO: Should we handle tags like <span> or [[wikilinks]] within headings?
						title: mwbot.Title.clean(removeComments(tag.content ?? '')),
						level: +match[1],
						index: tag.startIndex,
					});
				}
			}

			// Parse wikitext-style headings (== heading ==)
			const placeholderManager = new CommentPlaceholderManager(this.content, tags);
			const wikitextWithPlaceholders = placeholderManager.getText();
			const wikitext = this.content;
			let mPlaceholder: RegExpExecArray | null;

			while ((mPlaceholder = headingRegex.candidate.exec(wikitextWithPlaceholders))) {

				const [
					placeholderHeading,
					placeholderLeft,
					_placeholderText,
					placeholderRight,
					_placeholderExtra,
				] = mPlaceholder;

				// Ensure the `== heading ==` markup is valid even after removing comment placeholders
				const mNoComment = headingRegex.heading.exec(placeholderManager.remove(placeholderHeading));
				if (!mNoComment) {
					continue;
				}
				const [
					_cleanHeading,
					cleanLeft,
					cleanText,
					cleanRight,
					cleanExtra,
				] = mNoComment;

				// Check for a non-empty `$4`, which invalidates the heading
				if (cleanExtra.replace(headingRegex.whitespace, '')) {
					continue;
				}

				// Retrieve the real index of the heading
				const startIndex = placeholderManager.getOriginalIndex(mPlaceholder.index);
				const endIndex = startIndex + placeholderManager.restore(placeholderHeading).length;

				// Check if the heading is within a skip range
				if (isInSkipRange(startIndex, endIndex)) {
					continue;
				}

				// If either of the left or right equals are interrupted, get the correct level for this section.
				// Beware of edge cases like the following:
				// 1. <!--c-->== H ==
				// 2. =<!--c-->= H ==
				// 3. ==<!--c--> H ==
				// 4. == H <!--c-->==
				// 5. == H =<!--c-->=
				// 6. == H ==<!--c-->
				// Patterns #2 and #5, where a comment tag interrupts equal signs, are tricky in that the section
				// level is determined based on the number of equals before/after the interruption. For #2, the
				// level is 1 because 1 equal sign precedes the comment; For #5, the level is 1 because 1 equal
				// sign follows the comment.
				let eq;
				let maxLevel = -1;
				if ((eq = headingRegex.interruptedLeft.exec(placeholderLeft))) {
					maxLevel = eq[1].length;
				}
				if ((eq = headingRegex.interruptedRight.exec(placeholderRight)) && maxLevel < eq[1].length) {
					maxLevel = eq[1].length;
				}
				if (maxLevel === -1) {
					maxLevel = 6;
				}

				// Determine heading level (up to 6)
				const level = Math.min(maxLevel, cleanLeft.length, cleanRight.length);
				const overflowLeft = Math.max(0, cleanLeft.length - level);
				const overflowRight = Math.max(0, cleanRight.length - level);
				const title = '='.repeat(overflowLeft) + cleanText + '='.repeat(overflowRight);

				// Include trailing newline if it directly follows the heading
				const newline = wikitext.charAt(endIndex) === '\n' ? '\n' : '';

				headings.push({
					text: wikitext.slice(startIndex, endIndex) + newline,
					title: mwbot.Title.clean(title),
					level,
					index: startIndex,
				});
			}

			// Sort headings by index and add the top section
			headings.sort((a, b) => a.index - b.index);
			headings.unshift({ text: '', title: 'top', level: 1, index: 0 }); // Top section

			// Build sections from the sorted headings
			const sections: Section[] = headings.map(({ text, title, level, index }, i, arr) => {
				const boundaryIdx = i === 0
					? (arr.length > 1 ? 1 : -1) // For the top section: next heading or no boundary
					: arr.findIndex((obj, j) => j > i && obj.level <= level); // Find the next non-subsection

				const content = wikitext.slice(
					index + text.length,
					boundaryIdx !== -1 ? arr[boundaryIdx].index : wikitext.length
				);

				return {
					heading: text,
					title,
					level,
					index: i,
					startIndex: index,
					endIndex: index + text.length + content.length,
					content,
					get text() {
						return this.heading + this.content;
					},
					parent: null, // Lazy-loaded
					children: new Set(), // Lazy-loaded
				};
			});
			assignSectionKinships(sections);

			return sections;
		}

		parseSections(config: ParseSectionsConfig = {}): Section[] {
			const { sectionPredicate } = config;
			let sections = this.storageManager('sections');
			if (typeof sectionPredicate === 'function') {
				sections = sections.filter((sec) => sectionPredicate(sec));
			}
			return sections;
		}

		modifySections(
			modificationPredicate: ModificationPredicate<ModificationMap['sections']>
		): string | Promise<string> {
			return this.modify('sections', modificationPredicate);
		}

		identifySection(
			startIndexOrObj: number | { startIndex: number; endIndex: number },
			endIndex?: number
		): Section | null {
			let startIndex;
			if (isObject(startIndexOrObj)) {
				startIndex = startIndexOrObj.startIndex;
				endIndex = startIndexOrObj.endIndex;
			} else {
				startIndex = startIndexOrObj;
			}
			if (typeof startIndex !== 'number') {
				throw new MwbotError('fatal', {
					code: 'typemismatch',
					info: `Expected a number for "startIndex", but got ${formatType(startIndex)}.`,
				});
			}
			if (typeof endIndex !== 'number') {
				throw new MwbotError('fatal', {
					code: 'typemismatch',
					info: `Expected a number for "endIndex", but got ${formatType(endIndex)}.`,
				});
			}

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
		 * Parses the wikitext content for `{{{parameter}}}` markups.
		 *
		 * @returns An array of parsed parameters.
		 */
		private _parseParameters(): Parameter[] {

			const isInSkipRange = this.getSkipPredicate();
			const params: Parameter[] = [];
			const wikitext = this.content;
			let nestLevel = 0;

			let match: RegExpExecArray | null;
			const {
				params: rParams,
				leadingClosingBraces: rLeadingClosingBraces,
				trailingTripleClosingBraces: rTrailingTripleClosingBraces,
			} = parameterRegex;

			while ((match = rParams.exec(wikitext))) {

				// Skip parameters that don't satisfy the namePredicate
				const paramName = match[1].trim();
				let paramValue = (match[2] ?? null) as string | null;
				let paramText = match[0];

				// Parameters can contain nested templates (e.g., `{{{1|{{{page|{{PAGENAME}}}}}}}}`).
				// In such cases, `exec` initially captures an incomplete parameter like `{{{1|{{{page|{{PAGENAME}}}`.
				const openingBraceCount = countConsecutiveBraces(paramText, 'opening');
				let closingBraceCount = countConsecutiveBraces(paramText, 'closing');
				let isValid = true;

				// If the number of opening and closing braces is unbalanced
				if (openingBraceCount > closingBraceCount) {
					isValid = false;

					// Get the end index of `{{{1|{{{page|{{PAGENAME` in `wikitext`
					const unmatchedClosingStart = match.index + paramText.length - 3;
					closingBraceCount -= 3;

					// Find the correct closing braces
					for (let pos = unmatchedClosingStart; pos < wikitext.length; pos++) {

						const nextIndex = wikitext.indexOf('}}', pos);
						if (nextIndex === -1) {
							break;
						}
						if (nextIndex !== pos) {
							// Skip ahead to the next occurrence of '}}' if wikitext.slice(pos) doesn't start
							// with double braces
							pos = nextIndex - 1;
							continue;
						}

						const closingBraces = wikitext
							.slice(pos)
							.match(rLeadingClosingBraces)![0]
							.length;
						if (openingBraceCount <= closingBraceCount + closingBraces) {
							// If the right braces close all the left braces
							const lastIndex = pos + (openingBraceCount - closingBraceCount);
							paramText = wikitext.slice(match.index, lastIndex); // Get the correct parameter
							if (paramValue !== null) {
								paramValue += paramText
									.slice(unmatchedClosingStart - lastIndex)
									.replace(rTrailingTripleClosingBraces, '');
							}
							isValid = true;
							rParams.lastIndex = lastIndex; // Update search position
							break;
						} else {
							// If not, continue searching
							pos += closingBraces - 1;
							closingBraceCount += closingBraces;
						}
					}
				}

				if (isValid) {
					params.push({
						key: paramName,
						value: paramValue,
						text: paramText,
						index: params.length,
						startIndex: match.index,
						endIndex: rParams.lastIndex,
						nestLevel,
						skip: isInSkipRange(match.index, rParams.lastIndex),
						parent: null,
						children: new Set(),
					});

					// Handle nested parameters
					if (paramText.slice(3).includes('{{{')) {
						rParams.lastIndex = match.index + 3;
						nestLevel++;
					} else {
						nestLevel = 0;
					}
				}
			}

			assignNestedKinships(params);

			return params;
		}

		parseParameters(config: ParseParametersConfig = {}): Parameter[] {
			const { keyPredicate, parameterPredicate } = config;
			let parameters = this.storageManager('parameters');
			if (typeof keyPredicate === 'function') {
				parameters = parameters.filter(({ key }) => keyPredicate(key));
			}
			if (typeof parameterPredicate === 'function') {
				parameters = parameters.filter((param) => parameterPredicate(param));
			}
			return parameters;
		}

		modifyParameters(
			modificationPredicate: ModificationPredicate<ModificationMap['parameters']>
		): string | Promise<string> {
			return this.modify('parameters', modificationPredicate);
		}

		/**
		 * Generates a mapping from the start index of each parsed element to its text content and type.
		 *
		 * The mapping includes:
		 * * Skip tags (e.g., `<nowiki>`, `<!-- -->`)
		 * * Gallery tags (`<gallery>`; not included by default)
		 * * Parameters (`{{{parameter}}}`; not included by default)
		 * * Fuzzy wikilinks (`[[wikilink]]`; not included by default)
		 * * Templates (`{{tempalte}}`; not included by default)
		 *
		 * @param options Options to index additional expressions.
		 * @returns An object mapping start indices to their corresponding text content and type.
		 */
		private getIndexMap(options: IndexMapOptions = {}): IndexMap {

			const indexMap: IndexMap = Object.create(null);

			const tags = this.storageManager('tags', false);
			addTagIndexMap(indexMap, tags, options, (name) => Wikitext.isValidTag(name, 'skip'));

			if (options.parameters) {
				const parameters = this.storageManager('parameters', false);
				addParameterIndexMap(indexMap, parameters);
			}

			if (options.wikilinks_fuzzy) {
				const fuzzyWikilinks = this.storageManager('wikilinks_fuzzy', false);
				addFuzzyWikilinkIndexMap(indexMap, fuzzyWikilinks);
			}

			if (options.templates) {
				const templates = this.storageManager('templates', false);
				addTemplateIndexMap(indexMap, templates);
			}

			return indexMap;
		}

		/**
		 * Fuzzily parses the wikitext content for `[[wikilink]]` markups. The right operand
		 * (i.e., `[[left|right]]`) will be incomplete.
		 *
		 * @param indexMap Optional index map to re-use.
		 * @param isInSkipRange A function that evaluates whether parsed wikilinks are within a skip range.
		 * Only passed from inside this method.
		 * @param offset Restricts parsing to a subsection of the wikitext. This is used internally when
		 * recursively parsing the contents of skip tags, parameters, and similar expressions.
		 * @returns An array of fuzzily parsed wikilinks.
		 */
		private _parseWikilinksFuzzy(
			// Must not include `{ templates: true }` because `parseTemplates` uses the index map of `wikilinks_fuzzy`
			// If included, that will be circular
			indexMap = this.getIndexMap({ parameters: true }),
			isInSkipRange = this.getSkipPredicate(),
			offset?: { start: number; end: number }
		): FuzzyWikilink[] {

			const wikitext = this.content;
			offset ??= {
				start: 0,
				end: wikitext.length,
			};

			let inLink = false;
			let startIndex = 0;
			let title = '';
			let rawTitle = '';
			let isLeftSealed = false;

			const links: FuzzyWikilink[] = [];
			const parentStack: number[] = [];

			for (let i = offset.start; i < offset.end; i++) {

				// Skip or deep-parse certain expressions
				const indexMapEntry = indexMap[i];
				if (indexMapEntry) {
					const { inner, text } = indexMapEntry;
					if (inner && inner.end <= wikitext.length) {
						// The inner content of a skip tag, or the right operand of a parameter.
						// TODO: This can cause a bug if the left operand of the parameter contains a nested wikilink,
						// but could there be any occurrence of `{{{ [[wikilink]] | right }}}`?
						// Modify getIndexMap() in case it turns out that this needs to be handled.
						const chunk = wikitext.slice(inner.start, inner.end);
						if (chunk.includes('[[') && chunk.includes(']]')) {
							// Recursively parse wikilinks inside the expression
							links.push(
								...this._parseWikilinksFuzzy(indexMap, isInSkipRange, inner)
							);
						}
					}
					if (inLink && !isLeftSealed) {
						rawTitle += text;
					}
					i += text.length - 1;
					continue;
				}

				if (wikitext.startsWith('[[', i) && wikitext[i + 2] !== '[') {
					// Treat every occurrence of "[[" as the potential start of a wikilink
					if (inLink) {
						// If this is the start of a wikilink nested inside another, store the start index of
						// the parent wikilink to return to after processing this one
						parentStack.unshift(startIndex);
					}
					inLink = true;
					startIndex = i;
					title = '';
					rawTitle = '';
					isLeftSealed = false;
					i++;
				} else if (wikitext.startsWith(']]', i) && inLink) {
					const endIndex = i + 2;
					const text = wikitext.slice(startIndex, endIndex);

					let right: string | null = null;
					if (title.endsWith('|')) {
						right = wikitext.slice(startIndex + 2 + rawTitle.length, endIndex - 2) ||
							// Let empty strings fall back to null
							// Links like [[title|]] aren't expected to exist because of "pipe tricks",
							// and even if any, they aren't recognized as links but as raw texts.
							// See https://en.wikipedia.org/wiki/Help:Pipe_trick
							null;

						// Remove the pipe delimiter retained to distinguish [[title]] from [[title|display]]
						title = title.slice(0, -1);
						rawTitle = rawTitle.slice(0, -1);
					}

					const nestLevel = parentStack.length;
					links.push({
						right,
						title,
						rawTitle,
						text,
						startIndex,
						endIndex,
						nestLevel,
						skip: isInSkipRange(startIndex, endIndex),
					});
					if (nestLevel) {
						// If this was a nested wikilink, resume parsing from the parent wikilink's start index
						// Also register this nested link in the indexMap so it won't be parsed again
						indexMap[startIndex] = {
							text,
							type: 'wikilink_fuzzy',
							inner: null, // If `inner` is `null`, its content won't be parsed recursively
						};
						i = parentStack.shift()! - 1; // Go back to the start of the nesting wikilink in the next iteration
					} else {
						i++;
					}
					inLink = false;
				} else if (inLink && !isLeftSealed) {
					const char = wikitext[i];
					if (char === '|') {
						isLeftSealed = true;
					}
					title += char; // A sealed title ends with a pipe
					rawTitle += char;
				}
			}

			sortParseResults(links);

			return links;
		}

		/**
		 * Parses the wikitext content for `{{template}}` markups.
		 *
		 * @param options Parser options.
		 * @param recurseOptions Data to reuse; Used only by the method itself.
		 * @param recurseOptions.indexMap An index map.
		 * @param recurseOptions.indexMapIndexes An array of number-cast `indexMap` keys.
		 * @param recurseOptions.isInSkipRange A function that evaluates whether parsed templates are within a skip range.
		 * @param recurseOptions.nestLevel Nesting level of the parsing templates.
		 * @param recurseOptions.offset Range of the original wikitext to parse.
		 * @returns An array of parsed templates.
		 */
		private _parseTemplates(
			options: ParsedTemplateOptions = {},
			recurseOptions: {
				indexMap?: IndexMap;
				indexMapIndexes?: number[];
				isInSkipRange?: ReturnType<Wikitext['getSkipPredicate']>;
				nestLevel?: number;
				offset?: { start: number; end: number };
			} = {}
		): DoubleBracedClasses[] {

			const wikitext = this.content;

			const {
				indexMap = this.getIndexMap({ gallery: true, parameters: true, wikilinks_fuzzy: true }),
				indexMapIndexes = Object.keys(indexMap).map(Number),
				isInSkipRange = this.getSkipPredicate(),
				nestLevel = 0,
				offset = { start: 0, end: wikitext.length },
			} = recurseOptions;

			let nextIndexMapPointer = indexMapIndexes.findIndex((n) => n >= offset.start);
			let numUnclosed = 0;
			let startIndex = 0;
			const components: TemplateComponent[] = [];
			const templates: DoubleBracedClasses[] = [];

			for (let i = offset.start; i < offset.end; i++) {

				// Skip or deep-parse certain expressions
				const indexMapEntry = indexMap[i];
				if (indexMapEntry) {

					let text = indexMapEntry.text;
					if (numUnclosed !== 0) {
						if (indexMapEntry.type === 'gallery') {
							// <gallery> tags may contain pipe characters that are not template
							// parameter separators. Replace them with placeholders temporarily.
							text = PipePlaceholderManager.replace(text);
						}
						// TODO: Should this `isNonName` include all the indexMap expressions?
						// Maybe we should limit it to the skip tags only.
						processTemplateFragment(components, text, verifyHook, { isNonName: true });
					}

					/**
					 * Parse the inner content of this expression only if `nestLevel` is 0.
					 *
					 * Given a structure like "{{ temp | [[{{PAGENAME}}]] }}":
					 * - The inner content of "{{temp}}" is parsed again for nested templates when "{{temp}}" is fully processed.
					 * - However, "{{PAGENAME}}" is already parsed within this block.
					 *
					 * We cannot simply remove the `if` block below, as that would cause `indexMap` expressions to be skipped
					 * entirely, preventing their inner contents from being parsed.
					 */
					const inner = indexMapEntry.inner;
					if (nestLevel === 0 && inner && inner.end <= wikitext.length) {
						const chunk = wikitext.slice(inner.start, inner.end);
						if (chunk.includes('{{') && chunk.includes('}}')) {
							templates.push(
								...this._parseTemplates(options, {
									indexMap,
									indexMapIndexes,
									isInSkipRange,
									nestLevel,
									offset: inner,
								})
							);
						}
					}

					i += text.length - 1;
					continue;
				}

				// Skip ahead to the next index where there is a template-related character
				while (
					nextIndexMapPointer < indexMapIndexes.length &&
					indexMapIndexes[nextIndexMapPointer] <= i
				) {
					nextIndexMapPointer++;
				}

				const nextTokenIndex = findNextTemplateTokenIndex(wikitext, i, offset.end);
				if (nextTokenIndex === i) {
					// Already at a template token
				} else {

					const nextMapIndex = indexMapIndexes[nextIndexMapPointer] ?? -1;
					let nextIndex: number;

					if (nextTokenIndex === -1 && nextMapIndex === -1) {
						if (numUnclosed !== 0) {
							processTemplateFragment(components, wikitext.slice(i), verifyHook);
						}
						break;
					} else if (nextTokenIndex === -1) {
						nextIndex = nextMapIndex;
					} else if (nextMapIndex === -1) {
						nextIndex = nextTokenIndex;
					} else {
						nextIndex = Math.min(nextTokenIndex, nextMapIndex);
					}

					processTemplateFragment(components, wikitext.slice(i, nextIndex), verifyHook);
					i = nextIndex - 1;
					continue;
				}

				// Process the character at the current index
				const startsTemplate = wikitext.startsWith('{{', i);
				const endsTemplate = wikitext.startsWith('}}', i);

				if (numUnclosed === 0) {
					// We are not in a template
					if (startsTemplate) {
						// Found the start of a template
						startIndex = i;
						components.length = 0;
						numUnclosed += 2;
						i++;
					}
				} else if (numUnclosed === 2) {
					// We are looking for closing braces
					if (startsTemplate) {
						// Found a nested template
						numUnclosed += 2;
						i++;
						processTemplateFragment(components, '{{', verifyHook);
					} else if (endsTemplate) {
						// Found the end of the template
						restoreLastTemplateComponent(components);
						const [titleObj, ...params] = components;
						const title = titleObj ? titleObj.key : '';
						let rawTitle = titleObj ? titleObj.value : '';
						let titlesMatch = false;
						if (rawTitle !== title) {
							// If `rawTitle` contains redundant characters, replace `title` in `rawTitle` with a control character.
							// This makes it easy to identify the insertion point of `title` in `rawTitle`.
							for (let n = 0; n < rawTitle.length; n++) {
								const realIndex = n + startIndex;
								if (indexMap[realIndex]) {
									n += indexMap[realIndex].text.length - 1;
									continue;
								}
								const tempWkt = rawTitle.slice(n);
								if (tempWkt.startsWith(title)) {
									rawTitle = rawTitle.slice(0, n) + tempWkt.replace(title, '\x01');
									break;
								}
							}
						} else if (!templateRegex.leadingSpaces.test(title)) {
							// If `title` and `rawTitle` are identical, we just want to replace `rawTitle` with "\x01".
							// But this isn't always so for parser functions, which must be parsed again for the function
							// hook and the first argument. For example:
							// `title` & `rawTitle` = "\n #switch: {{FULLPAGENAME}} \n"
							// In this case, `rawHook` and `_rawHook`, which are properties of ParsedParserFunction, should be:
							// `rawHook` = "\n #switch:", `_rawHook` = "\n \x01" (not "\x01")
							// We therefore defer the replacement to when we've tried to make a PPF instance.
							// Here, substitute `rawTitle` with "\x01" only if it doesn't have leading whitespace.
							titlesMatch = true;
							rawTitle = '\x01';
						}
						const endIndex = i + 2;
						const text = wikitext.slice(startIndex, endIndex);
						const initializer: ParsedTemplateInitializer = {
							title,
							rawTitle,
							params,
							text,
							nestLevel,
							startIndex,
							endIndex,
							skip: isInSkipRange(startIndex, endIndex),
							index: -1,
							parent: null,
							children: new Set(),
						};
						let temp: DoubleBracedClasses;
						if (titleObj.hook) {
							temp = new ParsedParserFunction(initializer, titleObj.hook);
						} else {
							if (titlesMatch) {
								// `title` and `rawTitle` are identical, and we verified that the {{template}} isn't a parser function
								initializer.rawTitle = '\x01';
							}
							try {
								temp = new ParsedTemplate(initializer, options);
							} catch {
								temp = new RawTemplate(initializer, options);
							}
						}
						templates.push(temp);
						const inner = temp.text.slice(2, -2);
						if (inner.includes('{{') && inner.includes('}}')) {
							templates.push(
								...this._parseTemplates(options, {
									indexMap,
									indexMapIndexes,
									isInSkipRange,
									nestLevel: nestLevel + 1,
									offset: {
										start: startIndex + 2,
										end: endIndex - 2,
									},
								})
							);
						}
						numUnclosed -= 2;
						i++;
					} else {
						// Just part of the template (effectively "|" or "=")
						const char = wikitext[i];
						processTemplateFragment(components, char, verifyHook, { isNew: char === '|' });
					}
				} else {
					// We are in a nested template
					let fragment: string;
					if (startsTemplate) {
						// Found another nested template
						fragment = '{{';
						numUnclosed += 2;
						i++;
					} else if (endsTemplate) {
						// Found the end of the nested template
						fragment = '}}';
						numUnclosed -= 2;
						i++;
					} else {
						// Just part of the nested template (effectively "|" or "=")
						fragment = wikitext[i];
					}
					processTemplateFragment(components, fragment, verifyHook);
				}
			}

			if (nestLevel === 0) {
				sortParseResults(templates);
				assignNestedKinships(templates);
				templates.forEach((temp, index) => {
					temp._setInitializer({
						index,
						parent: temp.parent,
						children: temp.children,
					});
				});
			}

			return templates;
		}

		parseTemplates(config: ParseTemplatesConfig = {}): DoubleBracedClasses[] {
			const { hierarchies, titlePredicate, templatePredicate } = config;
			const options = { hierarchies };
			let templates = this.storageManager('templates', true, options);
			if (typeof titlePredicate === 'function') {
				templates = templates.filter((template) => titlePredicate('title' in template ? template.title : template.canonicalHook));
			}
			if (typeof templatePredicate === 'function') {
				templates = templates.filter((template) => templatePredicate(template));
			}
			return templates;
		}

		modifyTemplates(
			modificationPredicate: ModificationPredicate<ModificationMap['templates']>
		): string | Promise<string> {
			return this.modify('templates', modificationPredicate);
		}

		/**
		 * Parses the wikitext content for `[[wikilink]]` markups.
		 *
		 * @returns An array of parsed wikilinks.
		 */
		private _parseWikilinks(): DoubleBracketedClasses[] {
			// Call _parseWikilinksFuzzy() with an index map including templates (this avoids circular calls)
			const indexMap = this.getIndexMap({ parameters: true, templates: true });
			const links = this._parseWikilinksFuzzy(indexMap).map((obj, index) => {

				const { right, title, ...rest } = obj;

				// Process `rawTitle` and identify the insertion point of `title`
				let _rawTitle = rest.rawTitle;
				if (title === rest.rawTitle) {
					_rawTitle = '\x01';
				} else {
					for (let n = 0; n < rest.rawTitle.length; n++) {
						const realIndex = n + rest.startIndex;
						if (indexMap[realIndex]) {
							n += indexMap[realIndex].text.length - 1;
							continue;
						}
						const tempWkt = rest.rawTitle.slice(n);
						if (tempWkt.startsWith(title)) {
							_rawTitle = rest.rawTitle.slice(0, n) + tempWkt.replace(title, '\x01');
							break;
						}
					}
				}

				// Verify the title, process the right part, and create an instance
				const verifiedTitle = mwbot.Title.newFromText(title);
				if (verifiedTitle && verifiedTitle.getNamespaceId() === NS_FILE && !verifiedTitle.hadLeadingColon()) {
					const params: string[] = [];
					// This is a [[File:...]] link
					if (right === null) {
						// This file link doesn't have any parameters
						// Do nothing
					} else if (!right.includes('|')) {
						// This file link is like [[File:...|param]]
						params.push(mwbot.Title.clean(right));
					} else {
						// This file link is like [[File:...|param1|param2]]
						let text = '';
						for (let i = 0; i < right.length; i++) {
							// start index + [[ + rawTitle + | + i
							const realIndex = rest.startIndex + 2 + rest.rawTitle.length + 1 + i;
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
								params.push(mwbot.Title.clean(text));
								text = '';
							} else {
								// Just part of a file link parameter
								text += right[i];
							}
						}
						params.push(text); // Push the remaining file link parameter
					}
					const initializer: ParsedFileWikilinkInitializer = {
						params,
						_rawTitle,
						title: verifiedTitle,
						index,
						parent: null,
						children: new Set(),
						...rest,
					};
					return new ParsedFileWikilink(initializer);
				} else if (verifiedTitle) {
					// This is a normal [[wikilink]], including [[:File:...]]
					const initializer: ParsedWikilinkInitializer = {
						display: right || undefined,
						_rawTitle,
						title: verifiedTitle,
						index,
						parent: null,
						children: new Set(),
						...rest,
					};
					return new ParsedWikilink(initializer);
				} else {
					// `title` is invalid or unparsable
					const initializer: ParsedRawWikilinkInitializer = {
						display: right || undefined,
						_rawTitle,
						title,
						index,
						parent: null,
						children: new Set(),
						...rest,
					};
					return new ParsedRawWikilink(initializer);
				}
			});

			assignNestedKinships(links);
			links.forEach((link) => {
				link._setInitializer({
					parent: link.parent,
					children: link.children,
				});
			});

			return links;
		}

		parseWikilinks(config: ParseWikilinksConfig = {}): DoubleBracketedClasses[] {
			const { titlePredicate, wikilinkPredicate } = config;
			let wikilinks = this.storageManager('wikilinks');
			if (typeof titlePredicate === 'function') {
				wikilinks = wikilinks.filter(({ title }) => titlePredicate(title));
			}
			if (typeof wikilinkPredicate === 'function') {
				wikilinks = wikilinks.filter((link) => wikilinkPredicate(link));
			}
			return wikilinks;
		}

		modifyWikilinks(
			modificationPredicate: ModificationPredicate<ModificationMap['wikilinks']>
		): string | Promise<string> {
			return this.modify('wikilinks', modificationPredicate);
		}

		modify<K extends keyof ModificationMap>(
			type: K,
			modificationPredicate: ModificationPredicate<ModificationMap[K]>
		): string {
			// Validate arguments
			if (!MODIFICATION_TYPES.has(type)) {
				throw new MwbotError('fatal', {
					code: 'invalidinput',
					info: `"${type}" is not a valid expression type for Wikitext.modify.`,
				});
			}
			if (typeof modificationPredicate !== 'function') {
				throw new MwbotError('fatal', {
					code: 'typemismatch',
					info: `Expected a function for "modificationPredicate", but got ${formatType(modificationPredicate)}.`,
				});
			}

			// Apply modifications to the content
			let newContent = this.content;
			const clonedMarkups = this.storageManager(type) as ModificationMap[K][];
			const touched = new Set<number>();
			(this.storageManager(type, false) as ModificationMap[K][]).forEach((expr, i, markups) => {

				// Expose the cloned objects to the user to prevent mutation
				const mod = modificationPredicate(clonedMarkups[i], i, clonedMarkups, { touched: touched.has(i), content: newContent });
				if (typeof mod !== 'string' && mod !== null) {
					throw new MwbotError(
						'fatal',
						{
							code: 'typemismatch',
							info: 'modificationPredicate must return either a string or null.',
						},
						{ modified: { [i]: mod } }
					);
				}

				if (typeof mod === 'string') {
					const initialEndIndex = expr.endIndex;
					const leadingPart = newContent.slice(0, expr.startIndex);
					let trailingPart = newContent.slice(initialEndIndex);
					let m: RegExpExecArray | null = null;
					if (mod === '' && /(^|\n)[^\S\r\n]*$/.test(leadingPart) && (m = /^[^\S\r\n]*\n/.exec(trailingPart))) {
						// If the modification removes the expression and that creates an empty line,
						// also remove a trailing newline
						trailingPart = trailingPart.slice(m[0].length);
					}
					newContent = leadingPart + mod + trailingPart;

					// Update character indexes for subsequent modifications
					const lengthGap = mod.length - (m ? m[0].length : 0) - expr.text.length;
					expr.endIndex += lengthGap;
					markups.forEach((obj, j) => {
						if (j !== i) {
							if (obj.startIndex >= initialEndIndex) {
								obj.startIndex += lengthGap;
								obj.endIndex += lengthGap;
							} else if (obj.endIndex >= initialEndIndex) {
								obj.endIndex += lengthGap;
							}
						}
					});

					// If the modification touched a nested markup, remember its index
					for (const index of expr.children) {
						const { startIndex, text } = markups[index];
						if (!newContent.slice(startIndex).startsWith(text)) {
							touched.add(index);
						}
					}
				}
			});

			// Update stored content and return result
			return this.storageManager('content', newContent).content;
		}
	}

	return Wikitext as WikitextStatic;
}

/**
 * The base schema of parser results.
 */
export interface ParseResultBase {
	/**
	 * The index at which this markup starts in the wikitext.
	 */
	startIndex: number;
	/**
	 * The index at which this markup ends in the wikitext.
	 */
	endIndex: number;
	/**
	 * Whether the markup is enclosed in "skip tags", inside which wikitext is not parsed.
	 */
	skip: boolean;
	/**
	 * The index of this markup within the parser result array.
	 */
	index: number;
	/**
	 * The index of the parent markup within the parser result array, or `null` if there is no parent.
	 */
	parent: number | null;
	/**
	 * The indices of the child markups within the parser result array.
	 */
	children: ReadonlySet<number>;
}

/**
 * A mapping of a storage key to parser methods' arguments, used to make it possible to pass
 * function arguments to storageManager.
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

// --------------- Interfaces for tag-related methods ---------------

/**
 * Categories of tags supported by {@link WikitextStatic.getValidTags} and
 * {@link WikitextStatic.isValidTag}.
 *
 * * `'any'` (default) - Any tags recognized by MediaWiki.
 * * `'void'` - Tags that must not have a closing tag (e.g., `<br>`).
 * * `'extension'` - Parser extension tags recognized on the current wiki.
 * * `'selfClosing'` - Tags that may be written using self-closing syntax (e.g., `<ref />` or `<br />`).
 * * `'closeable'` - Tags that can have a closing tag (i.e., not void).
 * * `'skip'` - Tags inside which wikitext is not parsed.
 * * `'transclusion'` - MediaWiki tags that manipulate transclusion strategies.
 */
export type TagType =
	| 'any'
	| 'void'
	| 'extension'
	| 'selfClosing'
	| 'closeable'
	| 'skip'
	| 'transclusion';

/**
 * Object that holds information about an HTML tag, parsed from wikitext.
 *
 * This object is returned by {@link Wikitext.parseTags}.
 */
export interface Tag extends ParseResultBase {
	/**
	 * The name of the tag (e.g., `'div'`). Comment tags are named `'!--'`.
	 */
	name: string;
	/**
	 * Returns the outerHTML of the tag.
	 *
	 * For unclosed tags, this may return a string like `'<span>content'`.
	 */
	get text(): string;
	/**
	 * The opening token of the tag.
	 *
	 * For {@link void} tags, this may be a syntactic end tag such as `'</br>'`,
	 * since MediaWiki treats it as another occurrence of the same void tag.
	 */
	start: string;
	/**
	 * The innerHTML of the tag.
	 *
	 * For {@link void} tags, this may be `null`.
	 */
	content: string | null;
	/**
	 * The ending token of the tag.
	 *
	 * * For {@link void} tags, this is an empty string.
	 * * For {@link unclosed} non-void tags, this is a supplemented end tag.
	 */
	end: string;
	/**
	 * The nesting level of this tag. `0` if not nested within another tag.
	 */
	nestLevel: number;
	/**
	 * Whether this is a "void" tag under MediaWiki's specification.
	 *
	 * This slightly differs from void tags as defined in HTML5:
	 * * MediaWiki's void tags are tags that must not have a closing tag,
	 *   namely `'br'`, `'wbr'`, `'hr'`, `'meta'`, and `'link'`.
	 * * If a closing tag is supplied (e.g., `'</br>'`), it is treated as another
	 *   occurrence of the corresponding void tag rather than the end of the
	 *   previous one.
	 */
	void: boolean;
	/**
	 * Whether the tag is unclosed.
	 *
	 * A tag is considered unclosed only if MediaWiki requires a closing tag but
	 * none is found. For {@link void} tags and tags that MediaWiki recognizes as
	 * self-closing (e.g., parser extension tags such as `<ref />`), this property
	 * is `false`.
	 */
	unclosed: boolean;
	/**
	 * Whether the source tag uses self-closing syntax (e.g., `'<br />'` or
	 * `'<ref />'`).
	 *
	 * This property reflects only the original markup and does not indicate
	 * whether the tag is considered closed. For example:
	 * * `'<br />'` is {@link void} and closed.
	 * * `'<ref />'` is not {@link void} but is recognized by MediaWiki as closed.
	 * * `'<span />'` is not recognized as closed and therefore has
	 *   {@link unclosed} set to `true`.
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

// --------------- Interfaces for section-related methods ---------------

/**
 * Object that holds information about a `==heading==`, parsed from wikitext.
 */
interface Heading {
	/**
	 * The raw `== heading ==`, as directly parsed from the wikitext.
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
 *
 * This object is returned by {@link Wikitext.parseSections}.
 */
export interface Section extends Omit<ParseResultBase, 'skip'> {
	/**
	 * `==heading==` or the outerHTML of a heading element, as directly parsed from the wikitext.
	 * This may include comment tags and a trailing newline.
	 *
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
	 * The body content of the section, with leading and trailing whitespace preserved.
	 */
	content: string;
	/**
	 * The full text of the section, including the heading.
	 *
	 * This is a getter that returns the concatenation of {@link heading} and {@link content}.
	 */
	get text(): string;
	/**
	 * The index number of the section.
	 *
	 * This is the same as the `section` parameter of {@link https://www.mediawiki.org/wiki/API:Edit | the edit API}.
	 * For the top section, the value is `0`.
	 *
	 * This property also matches the index of this Section object within the parser result array.
	 *
	 * @override
	 */
	index: number;
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

// --------------- Interfaces for parameter-related methods ---------------

/**
 * Object that holds information about a `{{{parameter}}}`, parsed from wikitext.
 *
 * This object is returned by {@link Wikitext.parseParameters}.
 */
export interface Parameter extends ParseResultBase {
	/**
	 * The parameter key (i.e. the left operand of `{{{key|value}}}`).
	 */
	key: string;
	/**
	 * The parameter value (i.e., the right operand of `{{{key|value}}}`).
	 *
	 * If the parameter is not pipe-separated, this property is `null`.
	 */
	value: string | null;
	/**
	 * The full wikitext representation of the parameter.
	 */
	text: string;
	/**
	 * The nesting level of the parameter.
	 * * `0` for parameters that are not nested inside another parameter.
	 * * Increments with deeper nesting.
	 */
	nestLevel: number;
}

/**
 * Configuration options for {@link Wikitext.parseParameters}.
 */
export interface ParseParametersConfig {
	/**
	 * A predicate function to filter parameters by key.
	 * Only parameters whose keys satisfy this function will be parsed.
	 *
	 * @param key The key of the parameter.
	 * @returns `true` if the parameter should be parsed, otherwise `false`.
	 */
	keyPredicate?: (key: string) => boolean;
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

// --------------- Interfaces for template-related methods ---------------

/**
 * Configuration options for {@link Wikitext.parseTemplates}.
 */
export interface ParseTemplatesConfig {
	/**
	 * A predicate function to filter templates by title.
	 * Only templates whose titles satisfy this function will be included in the results.
	 *
	 * @param title A Title object for ParsedTemplate, or a string for RawTemplate and ParsedParserFunction.
	 * @returns `true` if the template should be parsed, otherwise `false`.
	 */
	titlePredicate?: (title: Title | string) => boolean;
	/**
	 * A predicate function to filter parsed templates.
	 * Only templates that satisfy this function will be included in the results.
	 *
	 * @param template The template object.
	 * @returns `true` if the template should be included, otherwise `false`.
	 */
	templatePredicate?: (template: DoubleBracedClasses) => boolean;
	/**
	 * Object mapping canonical template titles to arrays of {@link TemplateParameterHierarchies}.
	 *
	 * - For {@link ParsedTemplate} instances, keys are matched against the output of {@link Title.getPrefixedDb}.
	 * - For {@link RawTemplate} instances, keys are matched against {@link RawTemplate.title} as a string.
	 * - This option is ignored for {@link ParsedParserFunction} instances.
	 *
	 * **Example**:
	 * ```ts
	 * const hierarchies = {
	 *   // Overwrite `1=` with `user=` for ParsedTemplate instances of `Template:Foo_bar`
	 *   'Template:Foo_bar': [['1', 'user']],
	 *   // Overwrite `2=` with `type=` for RawTemplate instances of `{{{1}}}`
	 *   '{{{1}}}': [['2', 'type']]
	 * };
	 * mwbot.Wikitext.parseTemplates({ hierarchies });
	 * ```
	 */
	hierarchies?: Record<string, TemplateParameterHierarchies>;
}

// --------------- Interfaces for wikilink-related methods ---------------

/**
 * Object that holds information about a fuzzily parsed `[[wikilink]]`.
 * The right operand of the link needs to be parsed for the object to be a complete construct.
 *
 * @internal
 */
export interface FuzzyWikilink extends Omit<ParseResultBase, 'index' | 'parent' | 'children'> {
	/**
	 * The right operand.
	 */
	right: string | null;
	/**
	 * The target title of the wikilink (the part before the `|`). This is a string that is ready to be
	 * passed to the Title constructor.
	 */
	title: string;
	/**
	 * The raw target title, as directly parsed from the first operand of a `[[wikilink|...]]` expression.
	 */
	rawTitle: string;
	/**
	 * The full wikitext representation of the wikilink (e.g., `[[target|display]]`).
	 */
	text: string;
	/**
	 * The nesting level of this wikilink. `0` if it is not nested within another wikilink.
	 *
	 * A value of `1` or greater indicates that the wikilink is either incorrectly embedded
	 * within another wikilink, or that it serves as part of the thumb text of a file wikilink.
	 */
	nestLevel: number;
}

/**
 * Configuration options for {@link Wikitext.parseWikilinks}.
 */
export interface ParseWikilinksConfig {
	/**
	 * A predicate function to filter wikilinks by title.
	 * Only wikilinks whose titles satisfy this function will be included in the results.
	 *
	 * @param title A Title object for {@link ParsedWikilink} and {@link ParsedFileWikilink}
	 * instances, or a string for {@link ParsedRawWikilink} instances.
	 * @returns `true` if the wikilink should be parsed, otherwise `false`.
	 */
	titlePredicate?: (title: string | Title) => boolean;
	/**
	 * A predicate function to filter parsed wikilinks.
	 * Only wikilinks that satisfy this function will be included in the results.
	 *
	 * @param wikilink The (file) wikilink object.
	 * @returns `true` if the wikilink should be included, otherwise `false`.
	 */
	wikilinkPredicate?: (wikilink: DoubleBracketedClasses) => boolean;
}

// --------------- Interfaces for modify() ---------------

/**
 * Type of the callback function used by {@link Wikitext.modify} and its shorthand variants.
 * This function is called once for each expression of the specified type and determines
 * whether the expression should be modified.
 *
 * @template T The type of markup expressions being modified. This corresponds to the values
 * of {@link ModificationMap}, such as {@link Tag} for `"tags"` or {@link Parameter} for `"parameters"`.
 *
 * @param value The current expression object under consideration for modification.
 *
 * Note: The object's `startIndex` and `endIndex` values (but not others) are **updated in-place**
 * as modifications are applied.
 *
 * @param index The position of this expression in the array of parsed expressions.
 *
 * @param array
 * The current array of all expressions of this type, as returned by the corresponding parsing method.
 *
 * Note: As with `value`, the `startIndex` and `endIndex` values of the objects in the array are dynamically
 * updated.
 *
 * @param context Dynamic modification-related information.
 *
 * @param context.touched
 * A boolean indicating whether this expression is a **nested child** of a previously modified expression.
 * This typically occurs when markup structures are nested (e.g., a `<b>` inside a `<div>`), and the parent
 * has already been replaced or modified. In such cases, the expression itself may be invalidated or contextually
 * incorrect in the new content, and the predicate can use this flag to skip or handle it differently.
 *
 * @param context.content
 * The current state of the full wikitext content. This string is updated after every successful modification
 * (i.e., whenever the predicate returns a string). It reflects the content as it exists *at the time* this predicate
 * is called for this expression. This is useful for context-sensitive changes, such as inspecting neighboring characters
 * or avoiding redundant edits.
 *
 * @returns
 * A `string` to replace the current expression, or `null` to leave it unchanged. Returning `null` ensures that
 * the original text is preserved.
 */
export type ModificationPredicate<T> = (
	value: T,
	index: number,
	array: T[],
	context: {
		touched: boolean;
		content: string;
	}
) => string | null;

/**
 * A mapping of a type key to its object type, used in {@link Wikitext.modify}.
 * @private
 */
export interface ModificationMap {
	tags: Tag;
	parameters: Parameter;
	sections: Section;
	templates: DoubleBracedClasses;
	wikilinks: DoubleBracketedClasses;
}
