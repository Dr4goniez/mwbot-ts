/**
 * This module defines the {@link WikitextStatic | Wikitext} class, accessible
 * via {@link Mwbot.Wikitext}, which provides methods for parsing and modifying wikitext.
 *
 * ## Core Class
 * - {@link WikitextStatic} (instance members: {@link Wikitext})
 *
 * **Usage**:
 * ```ts
 * import { Mwbot } from 'mwbot-ts';
 * (async () => {
 *   const mwbot = await new Mwbot(options).init();
 *   if (!mwbot) return;
 *   const wikitext = new mwbot.Wikitext('your wikitext');
 *   // Wikitext manipulations...
 * })();
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
 * Accessible via {@link Mwbot.Template}.
 * 	- {@link ParsedTemplateStatic | ParsedTemplate}: A subclass of `Template`, whose
 * 	instances are returned by {@link Wikitext.parseTemplates}. Its constructor is inaccessible.
 * - {@link ParserFunctionStatic | ParserFunction}: Encapsulates `{{#parserfunction:}}` markups.
 * Accessible via {@link Mwbot.ParserFunction}.
 * 	- {@link ParsedParserFunctionStatic | ParsedParserFunction}: A subclass of `ParserFunction`,
 * 	whose instances are returned by {@link Wikitext.parseTemplates}. Its constructor is inaccessible.
 * - {@link RawTemplateStatic | RawTemplate}: Encapsulates `{{template}}` markups with
 * an *unparsable* title. Instances are returned by {@link Wikitext.parseTemplates}.
 * Its constructor is inaccessible.
 *
 * **`[[double-bracketed]]` markups:**
 * - {@link WikilinkStatic | Wikilink}: Encapsulates `[[wikilink]]` markups with a *non-file* title.
 * Accessible via {@link Mwbot.Wikilink}.
 * 	- {@link ParsedWikilinkStatic | ParsedWikilink}: A subclass of `Wikilink`, whose
 * 	instances are returned by {@link Wikitext.parseWikilinks}. Its constructor is inaccessible.
 * - {@link FileWikilinkStatic | FileWikilink}: Encapsulates `[[File:...]]` markups.
 * Accessible via {@link Mwbot.FileWikilink}.
 * 	- {@link ParsedFileWikilinkStatic | ParsedFileWikilink}: A subclass of `FileWikilink`, whose
 * 	instances are returned by {@link Wikitext.parseWikilinks}. Its constructor is inaccessible.
 * - {@link RawWikilinkStatic | RawWikilink}: Encapsulates `[[wikilink]]` markups with an *unparsable* title.
 * Accessible via {@link Mwbot.RawWikilink}.
 * 	- {@link ParsedRawWikilinkStatic | ParsedRawWikilink}: A subclass of `RawWikilink`, whose
 * 	instances are returned by {@link Wikitext.parseWikilinks}. Its constructor is inaccessible.
 *
 * @module
 */

import { MwbotError } from './MwbotError';
import type { Mwbot, MwbotRequestConfig } from './Mwbot';
import { deepCloneInstance, isClassInstance, mergeDeep } from './Util';
import { byteLength } from './String';
import type { Title } from './Title';
import type {
	ParsedTemplateStatic,
	ParsedTemplate,
	RawTemplateStatic,
	RawTemplate,
	ParsedParserFunctionStatic,
	ParsedParserFunction,
	NewTemplateParameter,
	TemplateParameterHierarchies,
	ParsedTemplateOptions
} from './Template';
import type {
	ParsedWikilinkStatic,
	ParsedWikilink,
	ParsedFileWikilinkStatic,
	ParsedFileWikilink,
	ParsedRawWikilinkStatic,
	ParsedRawWikilink
} from './Wikilink';

// Imported only for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TemplateStatic, ParserFunctionStatic } from './Template';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { WikilinkStatic, FileWikilinkStatic, RawWikilinkStatic } from './Wikilink';

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
 * This class is accesible via {@link Mwbot.Wikitext}.
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
	 * @param options Options for the initialization of the instance.
	 * @throws If `content` is not a string.
	 */
	new(content: string, options?: WikitextOptions): Wikitext;
	/**
	 * Alias of the {@link WikitextStatic.constructor | constructor}.
	 *
	 * **Usage**:
	 * ```ts
	 * const wikitext = mwbot.Wikitext.new('Some wikitext');
	 * ```
	 *
	 * @param content A wikitext content.
	 * @param options Options for the initialization of the instance.
	 * @throws If `content` is not a string.
	 */
	'new'(content: string, options?: WikitextOptions): Wikitext;
	/**
	 * Creates a new instance by fetching the content of the given title.
	 *
	 * **Example**:
	 * ```ts
	 * const wikitext = await mwbot.Wikitext.newFromTitle('Foo').catch((err) => err);
	 * if (wikitext instanceof Error) {
	 *   console.log(wikitext);
	 *   return;
	 * }
	 * // Example for parsing the sections of the page 'Foo'
	 * const sections = wikitext.parseSections();
	 * ```
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param options Options for the initialization of the instance.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to a new `Wikitext` instance.
	 */
	newFromTitle(title: string | Title, options?: WikitextOptions, requestOptions?: MwbotRequestConfig): Promise<Wikitext>;
	/**
	 * Returns a list of valid HTML tag names that can be used in wikitext.
	 *
	 * @returns Array of tag names (all elements are in lowercase).
	 */
	getValidTags(): string[];
	/**
	 * Checks whether a given tag name is valid in wikitext.
	 *
	 * @param tagName The tag name to check.
	 * @returns A boolean indicating whether the tag name is valid.
	 */
	isValidTag(tagName: string): boolean;
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
	 * const len = wikitext.content.length;
	 * // (`wikitext` is an instance of the Wikitext class)
	 * ```
	 */
	get length(): number;
	/**
	 * Returns the byte length of the wikitext.
	 *
	 * The same result can be obtained by using:
	 * ```ts
	 * const byteLen = Mwbot.String.byteLength(wikitext.content);
	 * // (`wikitext` is an instance of the Wikitext class)
	 * ```
	 */
	get byteLength(): number;
	/**
	 * Returns the wikitext content of the instance.
	 */
	get content(): string;
	/**
	 * Modifies a specific type of expression in the wikitext content.
	 *
	 * This method extracts expressions of the given `type`, applies the `modificationPredicate`
	 * to transform them, and updates the wikitext accordingly.
	 *
	 * #### Example: Closing unclosed tags
	 * ```typescript
	 * const wkt = new mwbot.Wikitext('<span>a<div><del>b</span><span>c');
	 * const oldContent = wkt.content;
	 * const newContent = wkt.modify('tags', (tags) => {
	 *   return tags.map((obj) => {
	 *     if (obj.unclosed) {
	 *       // If this tag is unclosed, append its expected end tag to the tag text.
	 *       // `Tag` objects with the `unclosed` property set to `true` have their
	 *       // expected end tag stored in the `end` property.
	 *       return obj.text + obj.end; // Returning a string applies the modification.
	 *     } else {
	 *       return null; // Returning `null` means no modification is made.
	 *     }
	 *   });
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
	 * - This method (and its shorthand versions) modifies and updates {@link content}
	 * and its associated expressions.
	 * - Any copies of `content` and parsed expressions made before calling this
	 * method should **not** be reused, because properties such as `startIndex` will
	 * be different after the modification.
	 *
	 * @param type The type of expressions to modify.
	 *
	 * <table>
	 * 	<thead>
	 * 		<th>Type</th>
	 * 		<th>First Argument of <code>modificationPredicate</code></th>
	 * 	</thead>
	 * 	<tbody>
	 * 		<tr><td>tags</td><td>Array of {@link Tag}</td></tr>
	 * 		<tr><td>parameters</td><td>Array of {@link Parameter}</td></tr>
	 * 		<tr><td>sections</td><td>Array of {@link Section}</td></tr>
	 * 		<tr><td>templates</td><td>Array of {@link ParsedTemplate}, {@link ParsedParserFunction}, or {@link RawTemplate}</td></tr>
	 * 		<tr><td>wikilinks</td><td>Array of {@link ParsedWikilink}, {@link ParsedFileWikilink}, or {@link ParsedRawWikilink}</td></tr>
	 * 	</tbody>
	 * </table>
	 * See also {@link ModificationMap} for the interface that defines this mapping.
	 *
	 * @param modificationPredicate
	 * A function that processes an array of expression objects and returns an array of
	 * strings or `null` values. It may also return a Promise resolving to such an array
	 * if asynchronous operations are required.
	 *
	 * - The input array consists of objects corresponding to the specified `type`.
	 * - The returned array **must** have the same length as the input array.
	 * 	- Each string element replaces the corresponding expression.
	 * 	- `null` means no modification for that expression.
	 *
	 * @returns The modified wikitext content. If `modificationPredicate` is asynchronous,
	 * returns a Promise resolving to the modified content.
	 *
	 * @throws {MwbotError}
	 * - If `type` is invalid.
	 * - If `modificationPredicate` is not a function.
	 * - If the returned array length does not match the input array.
	 *
	 * @throws {Error} If `modificationPredicate` returns a rejected Promise.
	 */
	modify<K extends keyof ModificationMap>(
		type: K,
		modificationPredicate: (expressions: ModificationMap[K][]) => (string | null)[]
	): string;
	/**
	 * @inheritDoc
	 */
	modify<K extends keyof ModificationMap>(
		type: K,
		modificationPredicate: (expressions: ModificationMap[K][]) => Promise<(string | null)[]>
	): Promise<string>;
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
		modificationPredicate: (expressions: ModificationMap['tags'][]) => (string | null)[]
	): string;
	/**
	 * @inheritDoc
	 */
	modifyTags(
		modificationPredicate: (expressions: ModificationMap['tags'][]) => Promise<(string | null)[]>
	): Promise<string>;
	/**
	 * Adds tags in which elements shouldn't be parsed, if the tags are not already registered.
	 *
	 * CAUTION: This may lead to inconsistent parsing results.
	 *
	 * @param skipTags Array of tag names to add.
	 * @returns The current Wikitext instance.
	 */
	addSkipTags(skipTags: string[]): this;
	/**
	 * Sets tags in which elements shouldn't be parsed, overwriting any existing settings.
	 *
	 * CAUTION: This may lead to inconsistent parsing results.
	 *
	 * @param skipTags Array of tag names to set.
	 * @returns The current Wikitext instance.
	 */
	setSkipTags(skipTags: string[]): this;
	/**
	 * Removes tags from the list of tags in which elements shouldn't be parsed.
	 *
	 * CAUTION: This may lead to inconsistent parsing results.
	 *
	 * @param skipTags Array of tag names to remove.
	 * @returns The current Wikitext instance.
	 */
	removeSkipTags(skipTags: string[]): this;
	/**
	 * Gets a copy of the names of currently registered tags in which elements shouldn't be parsed.
	 *
	 * @returns An array of the current skip tag names.
	 */
	getSkipTags(): string[];
	/**
	 * Parses sections in the wikitext.
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
		modificationPredicate: (expressions: ModificationMap['sections'][]) => (string | null)[]
	): string;
	/**
	 * @inheritDoc
	 */
	modifySections(
		modificationPredicate: (expressions: ModificationMap['sections'][]) => Promise<(string | null)[]>
	): Promise<string>;
	/**
	 * Identifies the section containing an expression based on its start and end indices.
	 *
	 * **Example**:
	 * ```ts
	 * const text =
	 * `== Foo ==
	 * === Bar ===
	 * [[Main page]]
	 * == Baz ==
	 * [[Another page]]`;
	 *
	 * const wikitext = new mwbot.Wikitext(text);
	 * const [main] = wikitext.parseWikilinks();
	 * console.log(wikitext.identifySection(main.startIndex, main.endIndex));
	 * // Output:
	 * // {
	 * //   heading: '=== Bar ===',
	 * //   title: 'Bar',
	 * //   level: 3,
	 * //   index: 2,
	 * //   startIndex: 10,
	 * //   endIndex: 36,
	 * //   text: '=== Bar ===\n[[Main page]]\n'
	 * // }
	 * ```
	 *
	 * This method is intended to be used with expressions obtained from parser methods.
	 *
	 * @param startIndex The start index of the expression.
	 * @param endIndex The exclusive end index of the expression.
	 * @returns The deepest {@link Section} containing the expression, or `null` if none is found.
	 */
	identifySection(startIndex: number, endIndex: number): Section | null;
	/**
	 * Parses `{{{parameter}}}` expressions in the wikitext.
	 *
	 * @param config Config to filter the output.
	 * @returns An array of parsed parameters.
	 */
	parseParameters(config?: ParseParametersConfig): Parameter[];
	/**
	 * Modifies `{{{parameter}}}` expressions in the wikitext content.
	 *
	 * This is a shorthand method of {@link modify} with its first argument set as `parameters`.
	 *
	 * @param modificationPredicate
	 * @returns
	 */
	modifyParameters(
		modificationPredicate: (expressions: ModificationMap['parameters'][]) => (string | null)[]
	): string;
	/**
	 * @inheritDoc
	 */
	modifyParameters(
		modificationPredicate: (expressions: ModificationMap['parameters'][]) => Promise<(string | null)[]>
	): Promise<string>;
	/**
	 * Parses `{{template}}` expressions in the wikitext.
	 *
	 * This method parses any double-braced markups, including magic words and parser functions.
	 *
	 * @param config Config to filter the output.
	 * @returns An array of parsed templates.
	 */
	parseTemplates(config?: ParseTemplatesConfig): DoubleBracedClasses[];
	/**
	 * Modifies `{{template}}` expressions in the wikitext content.
	 *
	 * This is a shorthand method of {@link modify} with its first argument set as `templates`.
	 *
	 * @param modificationPredicate
	 * @returns
	 */
	modifyTemplates(
		modificationPredicate: (expressions: ModificationMap['templates'][]) => (string | null)[]
	): string;
	/**
	 * @inheritDoc
	 */
	modifyTemplates(
		modificationPredicate: (expressions: ModificationMap['templates'][]) => Promise<(string | null)[]>
	): Promise<string>;
	/**
	 * Parses `[[wikilink]]` expressions in the wikitext.
	 *
	 * @param config Config to filter the output.
	 * @returns An array of parsed wikilinks.
	 */
	parseWikilinks(config?: ParseWikilinksConfig): DoubleBracketedClasses[];
	/**
	 * Modifies `[[wikilink]]` expressions in the wikitext content.
	 *
	 * This is a shorthand method of {@link modify} with its first argument set as `wikilinks`.
	 *
	 * @param modificationPredicate
	 * @returns
	 */
	modifyWikilinks(
		modificationPredicate: (expressions: ModificationMap['wikilinks'][]) => (string | null)[]
	): string;
	/**
	 * @inheritDoc
	 */
	modifyWikilinks(
		modificationPredicate: (expressions: ModificationMap['wikilinks'][]) => Promise<(string | null)[]>
	): Promise<string>;
}

/**
 * @internal
 */
export function WikitextFactory(
	mw: Mwbot,
	ParsedTemplate: ParsedTemplateStatic,
	RawTemplate: RawTemplateStatic,
	ParsedParserFunction: ParsedParserFunctionStatic,
	ParsedWikilink: ParsedWikilinkStatic,
	ParsedFileWikilink: ParsedFileWikilinkStatic,
	ParsedRawWikilink: ParsedRawWikilinkStatic
) {

	const namespaceIds = mw.config.get('wgNamespaceIds');
	const NS_FILE = namespaceIds.file;
	// eslint-disable-next-line no-control-regex
	const rCtrlStart = /^\x01+/;

	/**
	 * List of valid HTML tag names that can be used in wikitext. All tag names are in lowercase.
	 *
	 * #### Behaviour of self-closure
	 *
	 * In HTML5, self-closure isn't a valid markup. For example:
	 * ```html
	 * <span style="color:red;" />foo</span>
	 * ```
	 * In this case, `'foo'` will be coloured red because the self-closed `span` tag isn't recognized
	 * as closed. However, this doesn't apply to tags that are void by nature: `'<br />'` is ok in
	 * wiki markup, and recognized as closed.
	 *
	 * On the other hand, MediaWiki-defined parser extension tags are "pseudo-void" in the sense that
	 * they allow both self-closure and content-wrapping. Thus, both of the following are fine, and
	 * the former self-closing tag is recognized as closed:
	 * ```html
	 * foo<pre />bar	<!-- "bar" won't be wrapped in the pre element (i.e., pre is closed) -->
	 * <pre>foo</pre>	<!-- This is also a valid markup -->
	 * ```
	 * Note further that some of these tags aren't even parsed if self-closed. For example, the self-closing
	 * tag in the following markup is displayed as raw text:
	 * ```html
	 * foo<tvar />bar
	 * ```
	 */
	const validTags = {
		native: [
			/**
			 * Standard HTML tags
			 * @see https://www.mediawiki.org/wiki/Help:HTML_in_wikitext
			 */
			'abbr', 'b', 'bdi', 'bdo', 'big', 'blockquote', 'br', 'caption', 'cite', 'code', 'data', 'dd', 'del',
			'dfn', 'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'ins', 'kbd', 'li',
			'link', 'mark', 'meta', 'ol', 'p', /*'pre',*/ 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'small', 'span',
			'strong', 'sub', 'sup', 'table', 'td', 'th', 'time', 'tr', 'u', 'ul', 'var', 'wbr',
			// Deprecated HTML tags
			'center', 'font', 'rb', 'rtc', 'strike', 'tt',
			// Comment tag, used in mwbot-ts
			'!--'
		],
		mediawiki: [
			/**
			 * MediaWiki parser extension tags
			 * @see https://www.mediawiki.org/wiki/Parser_extension_tags
			 */
			'categorytree', 'ce', 'chem', 'charinsert', 'gallery', 'graph', 'hiero', 'imagemap', 'indicator',
			'inputbox', 'langconvert', 'mapframe', 'maplink', 'math', 'nowiki', 'poem', 'pre', 'ref', 'references',
			'score', 'section', 'source', 'syntaxhighlight', 'templatedata', 'timeline',
			// Other MediaWiki tags, added by extensions
			'dynamicpagelist', 'languages', 'rss', 'talkpage', 'thread', 'html',
			// Special MediaWiki inclusion/exclusion tags
			'includeonly', 'noinclude', 'onlyinclude',
			// Tags from Extension:Translate
			'translate', 'tvar'
		]
	};

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
		/**
		 * The names of tags in which elements shouldn't be parsed.
		 *
		 * The default values are `!--`, `nowiki`, `pre`, `syntaxhighlight`, `source`, and `math`.
		 *
		 * See also {@link WikitextOptions}.
		 */
		private skipTags: string[];

		constructor(content: string, options: WikitextOptions = {}) {

			if (typeof content !== 'string') {
				throw new MwbotError('fatal', {
					code: 'typemismatch',
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

		static new(content: string, options: WikitextOptions = {}): Wikitext {
			return new Wikitext(content, options);
		}

		static async newFromTitle(title: string | Title, options: WikitextOptions = {}, requestOptions: MwbotRequestConfig = {}): Promise<Wikitext> {
			const rev = await mw.read(title, requestOptions);
			return new Wikitext(rev.content, options);
		}

		static getValidTags(): string[] {
			return Object.values(validTags).flat();
		}

		static isValidTag(tagName: string): boolean {
			tagName = String(tagName).toLowerCase();
			return Object.values(validTags).some((arr) => arr.includes(tagName));
		}

		get length(): number {
			return this.storage.content.length;
		}

		get byteLength(): number {
			return byteLength(this.storage.content);
		}

		get content(): string {
			return this.storageManager('content');
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
					? val.map((obj) => '_clone' in obj ? obj._clone(args) : isClassInstance(obj) ? deepCloneInstance(obj) : mergeDeep(obj))
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

		modify<K extends keyof ModificationMap>(
			type: K,
			modificationPredicate: ModificationPredicate<ModificationMap[K]>
		): string | Promise<string> {

			// Validate the arguments
			if (typeof type !== 'string' || !['tags', 'parameters', 'sections', 'templates', 'wikilinks'].includes(type)) {
				throw new MwbotError('fatal', {
					code: 'invalidtype',
					info: `"${type}" is not a valid expression type for Wikitext.modify.`
				});
			} else if (typeof modificationPredicate !== 'function') {
				throw new MwbotError('fatal', {
					code: 'typemismatch',
					info: 'modificationPredicate must be a function.'
				});
			}

			const applyModification = (mods: (string | null)[], expressions: ModificationMap[K][]) => {
				if (!Array.isArray(mods)) {
					throw new MwbotError('fatal', {
						code: 'typemismatch',
						info: 'modificationPredicate must return an array.'
					});
				}
				if (mods.length !== expressions.length) {
					throw new MwbotError('fatal', {
						code: 'lengthmismatch',
						info: `The returned array length from modificationPredicate does not match the length of "${type}".`
					});
				}

				// Apply modifications to the content
				expressions = this.storageManager(type, false) as ModificationMap[K][]; // Refresh expressions
				let newContent = this.content;

				mods.forEach((text, i) => {
					if (typeof text === 'string') {
						const initialEndIndex = expressions[i].endIndex;
						const leadingPart = newContent.slice(0, expressions[i].startIndex);
						let trailingPart = newContent.slice(initialEndIndex);
						let m: RegExpExecArray | null = null;
						if (text === '' && /(^|\n)[^\S\r\n]*$/.test(leadingPart) && (m = /^[^\S\r\n]*\n/.exec(trailingPart))) {
							// If the modification removes the expression and that creates an empty line,
							// also remove a trailing newline
							trailingPart = trailingPart.slice(m[0].length);
						}
						newContent = leadingPart + text + trailingPart;

						// Update character indexes for subsequent modifications
						const lengthGap = text.length - (m ? m[0].length : 0) - expressions[i].text.length;
						expressions[i].endIndex += lengthGap;
						expressions.forEach((obj, j) => {
							if (j !== i) {
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

				// Update stored content and return result
				this.storageManager('content', newContent);
				return this.content;
			};

			// Retrieve expressions from storage
			const expressions = this.storageManager(type) as ModificationMap[K][];
			const mods = modificationPredicate(expressions);
			return mods instanceof Promise
				? mods.then((modified) => applyModification(modified, expressions))
				: applyModification(mods, expressions);

		}

		/**
		 * Parses the wikitext for HTML tags.
		 *
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
					let pseudoVoid = false;
					if (regex.void.test(nodeName) || (pseudoVoid = (selfClosing && validTags.mediawiki.includes(nodeName)))) {
						// Add void and "pseudo-void" self-closing tags to the stack immediately
						// For "pseudo-void" tags, see the comments in the definition of `validTags`
						parsed.push(
							createVoidTagObject(nodeName, m[0], i, startTags.length, selfClosing, pseudoVoid, false)
						);
					} else {
						// Store non-void start tags for later matching with end tags.
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
								createVoidTagObject(nodeName, m[0], i, startTags.length, false, false, false)
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
								selfClosing: start.selfClosing,
								skip: false
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
					selfClosing,
					skip: false
				});
			});

			// Sort the parsed tags based on their positions in the wikitext and return
			parsed.sort((obj1, obj2) => obj1.startIndex - obj2.startIndex);

			// Set up the `skip` property and return the result
			const isInSkipRange = this.getSkipPredicate(parsed);
			return parsed.map((tag) => {
				tag.skip = isInSkipRange(tag.startIndex, tag.endIndex);
				return tag;
			});

		}

		parseTags(config: ParseTagsConfig = {}): Tag[] {
			const {namePredicate, tagPredicate} = config;
			let tags = this.storageManager('tags');
			if (typeof namePredicate === 'function') {
				tags = tags.filter(({name}) => namePredicate(name));
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

		addSkipTags(skipTags: string[]): Wikitext {
			skipTags.forEach((el: unknown) => {
				if (typeof el === 'string' && !skipTags.includes((el = el.toLowerCase()))) {
					this.skipTags.push(el as string);
				}
			});
			return this;
		}

		setSkipTags(skipTags: string[]): Wikitext {
			this.skipTags = skipTags.reduce((acc: string[], el: unknown) => {
				if (typeof el === 'string') {
					acc.push(el.toLowerCase());
				}
				return acc;
			}, []);
			return this;
		}

		removeSkipTags(skipTags: string[]): Wikitext {
			if (skipTags.join('')) {
				const rSkipTags = new RegExp(`^(?:${skipTags.join('|')})$`);
				this.skipTags = this.skipTags.filter((el) => rSkipTags.test(el));
			}
			return this;
		}

		getSkipTags(): string[] {
			return [...this.skipTags];
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

			if (!this.skipTags.join('')) {
				return () => false;
			}
			const rSkipTags = new RegExp(`^(?:${this.skipTags.join('|')})$`);

			// Create an array to store the start and end indices of tags to skip
			tags = tags || this.storageManager('tags', false);
			const indexMap = tags.reduce((acc: number[][], tagObj) => {
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
		 * Parses sections in the wikitext.
		 *
		 * @returns An array of parsed sections.
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

		parseSections(config: ParseSectionsConfig = {}): Section[] {
			const {sectionPredicate} = config;
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
		 * Parses `{{{parameter}}}` expressions in the wikitext.
		 *
		 * @returns An array of parsed parameters.
		 */
		private _parseParameters(): Parameter[] {

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
						key: paramName,
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

		parseParameters(config: ParseParametersConfig = {}): Parameter[] {
			const {keyPredicate, parameterPredicate} = config;
			let parameters = this.storageManager('parameters');
			if (typeof keyPredicate === 'function') {
				parameters = parameters.filter(({key}) => keyPredicate(key));
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
		 * * Parameters (`{{{parameter}}}`; not included by default)
		 * * Fuzzy wikilinks (`[[wikilink]]`; not included by default)
		 * * Templates (`{{tempalte}}`; not included by default)
		 *
		 * @param options Options to index additional expressions.
		 * @returns An object mapping start indices to their corresponding text content and type.
		 */
		private getIndexMap(
			options: {gallery?: boolean; parameters?: boolean; wikilinks_fuzzy?: boolean, templates?: boolean} = {}
		): IndexMap {

			const indexMap: IndexMap = Object.create(null);

			// Process skipTags
			const rSkipTags = new RegExp(`^(?:${this.skipTags.join('|')})$`);
			this.storageManager('tags', false).forEach(({text, startIndex, name, content}) => {
				// If this is a skip tag or a gallery tag whose content contains a pipe character
				if (rSkipTags.test(name) || name === 'gallery' && options.gallery && content && content.includes('|')) {
					// `inner` is the innerHTML of the tag
					const inner = (() => {
						if (content === null) {
							return null;
						}
						const innerStartIndex = startIndex + text.indexOf(content);
						return {start: innerStartIndex, end: innerStartIndex + content.length};
					})();
					indexMap[startIndex] = {
						text,
						type: name === 'gallery' ? 'gallery' : 'tag',
						inner
					};
				}
			});

			// Process {{{parameter}}}s
			if (options.parameters) {
				this.storageManager('parameters', false).forEach(({text, startIndex}) => {
					const m = /^(\{{3}[^|}]*\|)(.+)\}{3}$/.exec(text);
					// `inner` is the right operand of the parameter
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
				this.storageManager('wikilinks_fuzzy', false).forEach(({text, startIndex, endIndex}) => {
					// `inner` is the inner text of the wikilink (the text without "[[" and "]]")
					const inner = (() => {
						const start = startIndex + 2;
						const end = endIndex - 2;
						return end - start > 1 ? {start, end} : null;
					})();
					indexMap[startIndex] = {
						text,
						type: 'wikilink_fuzzy',
						inner
					};
				});
			}

			// Process {{template}}s
			if (options.templates) {
				this.storageManager('templates', false).forEach((obj) => createTemplateIndexMap(indexMap, obj));
			}

			return indexMap;

		}

		/**
		 * Fuzzily parses `[[wikilink]]`s in the wikitext. The right operand (i.e., `[[left|right]]`) will be incomplete.
		 *
		 * @param indexMap Optional index map to re-use.
		 * @param isInSkipRange A function that evaluates whether parsed wikilinks are within a skip range.
		 * Only passed from inside this method.
		 * @param wikitext Alternative wikitext to parse. Should be passed when parsing nested wikilinks.
		 * All characters before the range where there can be nested wikilinks should be replaced with `\x01`.
		 * This method skips sequences of this control character, to reach the range early and efficiently.
		 * @returns An array of fuzzily parsed wikilinks.
		 */
		private _parseWikilinksFuzzy(
			// Must not include `{templates: true}` because `parseTemplates` uses the index map of `wikilinks_fuzzy`
			// If included, that will be circular
			indexMap = this.getIndexMap({parameters: true}),
			isInSkipRange = this.getSkipPredicate(),
			wikitext = this.content
		): FuzzyWikilink[] {

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
				end: /^\]{2}/
			};
			const links: FuzzyWikilink[] = [];
			let inLink = false;
			let startIndex = 0;
			let title = '';
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

				// Skip or deep-parse certain expressions
				if (indexMap[i]) {
					const {inner} = indexMap[i];
					if (inner && inner.end <= wikitext.length) {
						const {start, end} = inner;
						// innerHTML of a skip tag or the right operand of a parameter
						// TODO: This can cause a bug if the left operand of the parameter contains a nested wikilink,
						// but could there be any occurrence of `{{{ [[wikilink]] | right }}}`?
						// Modify getIndexMap() in case it turns out that this needs to be handled
						const text = wikitext.slice(start, end);
						if (text.includes('[[') && text.includes(']]')) {
							// Parse wikilinks inside the expressions
							links.push(
								...this._parseWikilinksFuzzy(indexMap, isInSkipRange, '\x01'.repeat(start) + text)
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
					title = '';
					rawTitle = '';
					isLeftSealed = false;
					i++;
				} else if (regex.end.test(wkt) && inLink) {
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
						title = title.slice(0, -1); // Remove the trailing pipe
						rawTitle = rawTitle.slice(0, -1);
					}
					links.push({
						right,
						title,
						rawTitle,
						text,
						startIndex,
						endIndex,
						skip: isInSkipRange(startIndex, endIndex)
					});
					inLink = false;
					i++;
				} else if (inLink && !isLeftSealed) {
					if (wkt[0] === '|') {
						isLeftSealed = true;
					}
					title += wkt[0]; // A sealed "title" ends with a pipe
					rawTitle += wkt[0];
				}

			}

			return links.sort((obj1, obj2) => obj1.startIndex - obj2.startIndex);

		}

		/**
		 * Parses `{{template}}` expressions in the wikitext.
		 *
		 * @param options Parser options.
		 * @param indexMap Optional index map to re-use.
		 * @param isInSkipRange A function that evaluates whether parsed templates are within a skip range.
		 * Only passed from inside this method.
		 * @param nestLevel Nesting level of the parsing templates. Only passed from inside this method.
		 * @param wikitext Alternative wikitext to parse. Should be passed when parsing nested templates.
		 * All characters before the range where there can be nested templates should be replaced with `\x01`.
		 * This method skips sequences of this control character, to reach the range early and efficiently.
		 * @param checkGallery Whether to check gallery tags.
		 * @returns An array of parsed templates.
		 */
		private _parseTemplates(
			options: ParsedTemplateOptions = {},
			indexMap = this.getIndexMap({gallery: true, parameters: true, wikilinks_fuzzy: true}),
			isInSkipRange = this.getSkipPredicate(),
			nestLevel = 0,
			wikitext = this.content,
			checkGallery = true
		): DoubleBracedClasses[] {

			let numUnclosed = 0;
			let startIndex = 0;
			let components: Required<NewTemplateParameter>[] = [];
			const regex = {
				templateStart: /^\{\{/,
				templateEnd: /^\}\}/
			};

			// Character-by-character loop
			const templates: DoubleBracedClasses[] = [];
			for (let i = 0; i < wikitext.length; i++) {

				const wkt = wikitext.slice(i);

				const ctrlMatch = wkt.match(rCtrlStart);
				if (ctrlMatch) {
					i += ctrlMatch[0].length - 1;
					continue;
				}

				// Skip or deep-parse certain expressions
				if (indexMap[i] && indexMap[i].type !== 'gallery') {
					if (numUnclosed !== 0) {
						// TODO: Should this `nonNameComponent` include all the indexMap expressions?
						// Maybe we should limit it to the skip tags only.
						processTemplateFragment(components, indexMap[i].text, {nonNameComponent: true});
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
					let inner;
					if (nestLevel === 0 && (inner = indexMap[i].inner) && inner.end <= wikitext.length) {
						const {start, end} = inner;
						const text = wikitext.slice(start, end);
						if (text.includes('{{') && text.includes('}}')) {
							templates.push(
								...this._parseTemplates(options, indexMap, isInSkipRange, nestLevel, '\x01'.repeat(inner.start) + text, false)
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
						} else if (!/^\s+/.test(title)) {
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
						const initializer = {
							title,
							rawTitle,
							text,
							params,
							startIndex,
							endIndex,
							nestLevel,
							skip: isInSkipRange(startIndex, endIndex)
						};
						let temp: DoubleBracedClasses;
						try {
							temp = new ParsedParserFunction(initializer);
						} catch {
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
								...this._parseTemplates(options, indexMap, isInSkipRange, nestLevel + 1, '\x01'.repeat(startIndex + 2) + inner, false)
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
						// TODO: Can we make this more efficient by registering multiple characters, not just one?
						fragment = wkt[0];
					}
					processTemplateFragment(components, fragment);
				}

			}

			// <gallery> tags might contain pipe characters and can cause inaccuracy in the parsing results
			do { // Just creating a block to prevent deep nests

				if (!checkGallery) {
					break;
				}

				// Collect the start and end indices of gallery tags containing "|"
				// Note: getIndexMap() has already filtered out gallery tags that don't contain any pipe
				const galleryIndexMap = Object.entries(indexMap).reduce((acc: number[][], [index, obj]) => {
					if (obj.type === 'gallery') {
						const startIndex = parseInt(index);
						acc.push([startIndex, startIndex + obj.text.length]);
					}
					return acc;
				}, []);
				if (!galleryIndexMap.length) {
					break;
				}

				const containsGallery = (startIndex: number, endIndex: number) => {
					return galleryIndexMap.some(([galStartIndex, galEndIndex]) => startIndex < galStartIndex && galEndIndex < endIndex);
				};
				const inGallery = (index: number) => {
					return galleryIndexMap.some(([galStartIndex, galEndIndex]) => galStartIndex <= index && index <= galEndIndex);
				};

				// Update indexMap to include parsed templates
				// Note that this can't be done at the beginning of this method because that'll be circular
				templates.forEach((obj) => createTemplateIndexMap(indexMap, obj));

				// Check each parsed template and if it contains a gallery tag, modify the parsing result
				for (let i = 0; i < templates.length; i++) {
					const temp = templates[i];

					// We have nothing to do with templates not containing <gallery>
					if (!containsGallery(temp.startIndex, temp.endIndex)) {
						continue;
					}

					// Get the param part of the template
					// This always works because we updated indexMap for the parsed templates
					const {inner} = indexMap[temp.startIndex];
					if (inner === null) {
						continue;
					}

					// Get the param text with all pipes in it replaced with a control character
					const paramText = wikitext.slice(inner.start, inner.end).replace(/\|/g, '\x02');

					// `components[0]` represents the title part but this isn't what we're looking at here
					const components: Required<NewTemplateParameter>[] = [{key: '', value: ''}, {key: '', value: ''}];
					for (let j = 0; j < paramText.length; j++) {
						const realIndex = j + inner.start;
						if (indexMap[realIndex] && indexMap[realIndex].type !== 'gallery') {
							// Skip over skip tags, parameters, wikilinks, and templates
							// No need to handle nested templates here because they're already in `templates`
							// The outer `for` with `i` handles them recursively
							processTemplateFragment(components, indexMap[realIndex].text, {nonNameComponent: true});
							j += indexMap[realIndex].text.length - 1;
						} else if (inGallery(realIndex)) {
							// If we're in a gallery tag, register this character without restoring pipes
							processTemplateFragment(components, paramText[j]);
						} else if (paramText[j] === '\x02') {
							// If we're NOT in a gallery tag and this is '\x02', restore the pipe
							processTemplateFragment(components, '|', {isNew: true});
						} else {
							// Just part of the parameter
							processTemplateFragment(components, paramText[j]);
						}
					}

					// Restore pipes in the newly parsed params
					const params = components.slice(1).map(({key, value}) => {
						// eslint-disable-next-line no-control-regex
						return {key: key.replace(/\x02/g, '|'), value: value.replace(/\x02/g, '|')};
					});

					// Hack: Update `params` in `_initializer` and recreate instance
					if (temp instanceof mw.ParserFunction) {
						// @ts-expect-error Modifying a private property
						temp._initializer.params = [temp._initializer.params[0]].concat(params);
						templates[i] = temp._clone();
					} else {
						// @ts-expect-error Modifying a private property
						temp._initializer.params = params;
						templates[i] = temp._clone(options);
					}
				}

			// eslint-disable-next-line no-constant-condition
			} while (false); // Always get out of the loop automatically

			return templates.sort((obj1, obj2) => obj1.startIndex - obj2.startIndex);

		}

		parseTemplates(config: ParseTemplatesConfig = {}): DoubleBracedClasses[] {
			const {hierarchies, titlePredicate, templatePredicate} = config;
			const options = {hierarchies};
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
		 * Parses `[[wikilink]]` expressions in the wikitext.
		 *
		 * @returns An array of parsed wikilinks.
		 */
		private _parseWikilinks(): DoubleBracketedClasses[] {
			// Call _parseWikilinksFuzzy() with an index map including templates (this avoids circular calls)
			const indexMap = this.getIndexMap({parameters: true, templates: true});
			return this._parseWikilinksFuzzy(indexMap).reduce((acc: DoubleBracketedClasses[], obj) => {

				const {right, title, ...rest} = obj;

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
				const verifiedTitle = mw.Title.newFromText(title);
				if (verifiedTitle && verifiedTitle.getNamespaceId() === NS_FILE && !verifiedTitle.hadLeadingColon()) {
					const params: string[] = [];
					// This is a [[File:...]] link
					if (right === null) {
						// This file link doesn't have any parameters
						// Do nothing
					} else if (!right.includes('|')) {
						// This file link is like [[File:...|param]]
						params.push(mw.Title.clean(right));
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
								params.push(mw.Title.clean(text));
								text = '';
							} else {
								// Just part of a file link parameter
								text += right[i];
							}
						}
						params.push(text); // Push the remaining file link parameter
					}
					const initializer = {
						params,
						_rawTitle,
						title: verifiedTitle,
						...rest
					};
					acc.push(new ParsedFileWikilink(initializer));
				} else if (verifiedTitle) {
					// This is a normal [[wikilink]], including [[:File:...]]
					const initializer = {
						display: right || undefined,
						_rawTitle,
						title: verifiedTitle,
						...rest
					};
					acc.push(new ParsedWikilink(initializer));
				} else {
					// `title` is invalid or unparsable
					const initializer = {
						display: right || undefined,
						_rawTitle,
						title,
						...rest
					};
					acc.push(new ParsedRawWikilink(initializer));
				}
				return acc;
			}, []);
		}

		parseWikilinks(config: ParseWikilinksConfig = {}): DoubleBracketedClasses[] {
			const {titlePredicate, wikilinkPredicate} = config;
			let wikilinks = this.storageManager('wikilinks');
			if (typeof titlePredicate === 'function') {
				wikilinks = wikilinks.filter(({title}) => titlePredicate(title));
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

	}

	return Wikitext as WikitextStatic;

}

// Interfaces for constructor and the entire module

/**
 * Options for initializing a {@link Wikitext} instance.
 */
export interface WikitextOptions {
	/**
	 * HTML tags in which elements shouldn't be parsed.
	 *
	 * NOTE: This option is usually unnecessary.
	 *
	 * Example:
	 * ```
	 * blah blah <!-- {{Template}} --> {{Template}} blah blah
	 * ```
	 * In many cases, `{{Template}}` inside a comment tag shouldn't be parsed.
	 * Specify such tags to control parsing behavior.
	 *
	 * By default, elements inside the following tags (referred to as "skip tags" in this framework)
	 * are parsed with `{skip: true}`:
	 * * `!--`, `nowiki`, `pre`, `syntaxhighlight`, `source`, and `math`.
	 *
	 * The specified tags will be merged with the defaults unless {@link overwriteSkipTags} is `true`.
	 */
	skipTags?: string[];
	/**
	 * Whether to overwrite the default skip tags. If `true`, {@link skipTags} replaces the default list
	 * instead of merging with it.
	 *
	 * NOTE: This may lead to inconsistent parsing results.
	 */
	overwriteSkipTags?: boolean;
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

/**
 * Type of the callback function for {@link Wikitext.modify}.
 *
 * The function takes an array of expressions and returns a transformed array
 * where each element is either a modified string or `null` (indicating no modification).
 *
 * It supports both synchronous and asynchronous implementations.
 *
 * - Synchronous version: Returns `(string | null)[]`.
 * - Asynchronous version: Returns `Promise<(string | null)[]>`.
 *
 * @template T The type of expressions being modified. This corresponds to the values of
 * {@link ModificationMap} (e.g., `Tag`).
 */
export type ModificationPredicate<T> =
	| ((expressions: T[]) => (string | null)[])
	| ((expressions: T[]) => Promise<(string | null)[]>);

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

// Interfaces and private members for "parseTags"

/**
 * Object that holds information about an HTML tag, parsed from wikitext.
 *
 * This object is returned by {@link Wikitext.parseTags}.
 */
export interface Tag {
	/**
	 * The name of the tag (e.g. `'div'` for `<div></div>`). Comment tags (i.e. `<!-- -->`) are named `'!--'`.
	 */
	name: string;
	/**
	 * The outerHTML of the tag.
	 */
	readonly text: string;
	/**
	 * The start tag.
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
	 *
	 * See {@link https://developer.mozilla.org/en-US/docs/Glossary/Void_element |MDN Web Docs}
	 * for a list of void elements.
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
	/**
	 * Whether the tag appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;
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
 * @param pseudoVoid Whether this is a pseudo-void tag. Such tags are marked `{void: false}`.
 * @returns
 */
function createVoidTagObject(
	nodeName: string,
	startTag: string,
	startIndex: number,
	nestLevel: number,
	selfClosing: boolean,
	pseudoVoid: boolean,
	skip: boolean
): Tag {
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
		void: !pseudoVoid,
		unclosed: false,
		selfClosing,
		skip
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
 *
 * This object is returned by {@link Wikitext.parseSections}.
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
 *
 * This object is returned by {@link Wikitext.parseParameters}.
 */
export interface Parameter {
	/**
	 * The parameter key (i.e. the left operand of `{{{key|value}}}`).
	 */
	key: string;
	/**
	 * The parameter value (i.e., the right operand of `{{{key|value}}}`).
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

// Interfaces and private members for "parseWikilinksFuzzy"

/**
 * Object that holds information about a fuzzily parsed `[[wikilink]]`.
 * The right operand of the link needs to be parsed for the object to be a complete construct.
 */
interface FuzzyWikilink {
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
		type: 'tag' | 'gallery' | 'parameter' | 'wikilink_fuzzy' | 'template';
		inner: {start: number; end: number} | null;
	};
};

/**
 * Internal function to generate the index map of a template.
 *
 * @param indexMap The index map to modify in place.
 * @param obj The template instance.
 */
function createTemplateIndexMap(indexMap: IndexMap, obj: DoubleBracedClasses): void {
	const {text, startIndex, endIndex} = obj;
	let rawTitle;
	let isTemplate = true;
	if ('rawTitle' in obj) {
		rawTitle = obj.rawTitle;
	} else {
		rawTitle = obj.rawHook;
		isTemplate = false;
	}
	// `inner` is, for templates, their right operand, and for parser functions, the text after their hook
	const inner = (() => {
		const start = startIndex + 2 + rawTitle.length + (isTemplate ? 1 : 0);
		const end = endIndex - 2;
		return end - start > 1 ? {start, end} : null;
	})();
	indexMap[startIndex] = {
		text,
		type: 'template',
		inner
	};
}

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
	} else if (
		// `equalIndex` is basically 0 if found
		(equalIndex = fragment.indexOf('=')) !== -1 &&
		!components[i].key &&
		// Ignore {{=}}. `components[i].value` should end with "{{" when `equalIndex` is 0
		// TODO: This doesn't handle "<!--{{=}}-->"
		!/\{\{[\s_\u200E\u200F\u202A-\u202E]*$/.test(components[i].value) &&
		!nonNameComponent
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

// Interfaces and private members for "parseWikilinks"

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