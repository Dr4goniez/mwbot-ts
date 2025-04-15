/**
 * This module defines the {@link WikitextStatic | Wikitext} class, accessible
 * via {@link Mwbot.Wikitext}, which provides methods for parsing and modifying wikitext.
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
import type { MwbotRequestConfig } from './Mwbot';
import type { Title } from './Title';
import type { ParsedTemplate, RawTemplate, ParsedParserFunction, TemplateParameterHierarchies } from './Template';
import type { ParsedWikilink, ParsedFileWikilink, ParsedRawWikilink } from './Wikilink';
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
    new (content: string, options?: WikitextOptions): Wikitext;
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
     * @returns Set of tag names (all elements are in lowercase).
     */
    getValidTags(): Set<string>;
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
     * - This method (and its shorthand variants) modifies and updates {@link content}
     *   and its associated expressions.
     * - Any copies of `content` or parsed expressions made before calling this
     *   method should **not** be reused, as properties such as `startIndex` will
     *   change after modification.
     *
     * @param type The type of expressions to modify.
     *
     * <table>
     * 	<thead>
     * 		<tr><th>Type</th><th>First argument of <code>modificationPredicate</code></th></tr>
     * 	</thead>
     * 	<tbody>
     * 		<tr><td>tags</td><td>{@link Tag}</td></tr>
     * 		<tr><td>parameters</td><td>{@link Parameter}</td></tr>
     * 		<tr><td>sections</td><td>{@link Section}</td></tr>
     * 		<tr><td>templates</td><td>{@link ParsedTemplate}, {@link ParsedParserFunction}, or {@link RawTemplate}</td></tr>
     * 		<tr><td>wikilinks</td><td>{@link ParsedWikilink}, {@link ParsedFileWikilink}, or {@link ParsedRawWikilink}</td></tr>
     * 	</tbody>
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
     * - If the array created from `modificationPredicate` contains values other than
     *   strings or `null`.
     */
    modify<K extends keyof ModificationMap>(type: K, modificationPredicate: ModificationPredicate<ModificationMap[K]>): string;
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
    modifyTags(modificationPredicate: ModificationPredicate<ModificationMap['tags']>): string;
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
    modifySections(modificationPredicate: ModificationPredicate<ModificationMap['sections']>): string;
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
    modifyParameters(modificationPredicate: ModificationPredicate<ModificationMap['parameters']>): string;
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
    modifyTemplates(modificationPredicate: ModificationPredicate<ModificationMap['templates']>): string;
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
    modifyWikilinks(modificationPredicate: ModificationPredicate<ModificationMap['wikilinks']>): string;
}
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
 * Type of the callback function for {@link Wikitext.modify}.
 *
 * This is used as the predicate function for
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map | Array.prototype.map}.
 *
 * @template T The type of expressions being modified. This corresponds to the values of
 * {@link ModificationMap} (e.g., `Tag`).
 *
 * @returns A `string` to replace the current `value`, or `null` to leave it unmodified.
 */
export type ModificationPredicate<T> = (value: T, index: number, array: T[]) => string | null;
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
     *
     * Note that {@link void} tags have this property set to `false` because they do not need to be closed.
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
//# sourceMappingURL=Wikitext.d.ts.map