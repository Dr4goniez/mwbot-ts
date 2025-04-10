/**
 * This module serves to parse `{{template}}` markups into object structures.
 *
 * ### Classes:
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
 * @module
 */

import { XOR } from 'ts-xor';
import type { Mwbot } from './Mwbot';
import { escapeRegExp, isPlainObject, mergeDeep } from './Util';
import type { TitleStatic, Title } from './Title';
import { ParamBase } from './baseClasses';

// Imported only for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Wikitext, WikitextOptions, ParseTemplatesConfig } from './Wikitext';

/**
 * A list of no-hash functions. The listed members must not have a leading hash to function as a parser function.
 *
 * This is hard-coded in
 * https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/65e671bb809773bba40257288e890d8f24d824fd/includes/parser/CoreParserFunctions.php#81.
 */
const noHashFunctions = [
	'ns', 'nse', 'urlencode', 'lcfirst', 'ucfirst', 'lc', 'uc',
	'localurl', 'localurle', 'fullurl', 'fullurle', 'canonicalurl',
	'canonicalurle', 'formatnum', 'grammar', 'gender', 'plural', 'formal',
	'bidi', 'numberingroup', 'language',
	'padleft', 'padright', 'anchorencode', 'defaultsort', 'filepath',
	'pagesincategory', 'pagesize', 'protectionlevel', 'protectionexpiry',
	// The following are the "parser function" forms of magic
	// variables defined in CoreMagicVariables. The no-args form will
	// go through the magic variable code path (and be cached); the
	// presence of arguments will cause the parser function form to
	// be invoked. (Note that the actual implementation will pass
	// a Parser object as first argument, in addition to the
	// parser function parameters.)
	// For this group, the first parameter to the parser function is
	// "page title", and the no-args form (and the magic variable)
	// defaults to "current page title".
	'pagename', 'pagenamee',
	'fullpagename', 'fullpagenamee',
	'subpagename', 'subpagenamee',
	'rootpagename', 'rootpagenamee',
	'basepagename', 'basepagenamee',
	'talkpagename', 'talkpagenamee',
	'subjectpagename', 'subjectpagenamee',
	'pageid', 'revisionid', 'revisionday',
	'revisionday2', 'revisionmonth', 'revisionmonth1', 'revisionyear',
	'revisiontimestamp',
	'revisionuser',
	'cascadingsources',
	'namespace', 'namespacee', 'namespacenumber', 'talkspace', 'talkspacee',
	'subjectspace', 'subjectspacee',
	// More parser functions corresponding to CoreMagicVariables.
	// For this group, the first parameter to the parser function is
	// "raw" (uses the 'raw' format if present) and the no-args form
	// (and the magic variable) defaults to 'not raw'.
	'numberofarticles', 'numberoffiles',
	'numberofusers',
	'numberofactiveusers',
	'numberofpages',
	'numberofadmins',
	'numberofedits',
	// These magic words already contain the hash, and the no-args form
	// is the same as passing an empty first argument
	'bcp47',
	'dir',
	'interwikilink',
	'interlanguagelink',
];

/**
 * The base class for {@link TemplateStatic} and {@link RawTemplateStatic}.
 *
 * This interface defines the static members of the `TemplateBase` class. For instance members,
 * see {@link TemplateBase} (defined separately due to TypeScript limitations).
 *
 * @protected
 */
export interface TemplateBaseStatic<T extends string | Title> {
	/**
	 * Creates a new instance.
	 *
	 * @param title The title that the template transcludes.
	 * @param params Template parameters.
	 * @param hierarchies Optional template parameter hierarchies.
	 */
	new(
		title: T,
		params?: NewTemplateParameter[],
		hierarchies?: TemplateParameterHierarchies
	): TemplateBase<T>;
}

/**
 * The instance members of the `TemplateBase` class. For static members,
 * see {@link TemplateBaseStatic} (defined separately due to TypeScript limitations).
 *
 * @protected
 */
export interface TemplateBase<T extends string | Title> {

	/**
	 * The template's title.
	 *
	 * This property is read-only. To update it, use {@link setTitle}.
	 */
	readonly title: T;
	/**
	 * The template's parameters.
	 *
	 * This property is read-only. To update it, use {@link insertParam}, {@link updateParam},
	 * or {@link deleteParam} as per your needs.
	 */
	readonly params: Record<string, TemplateParameter>;

	/**
	 * Inserts a template parameter into the list.
	 *
	 * By default, if the parameter is new:
	 * - It is inserted at the end of the list.
	 * - If `position` is specified, the insertion position is controlled accordingly.
	 *
	 * If a parameter with the same `key` already exists:
	 * - If `overwrite` is `true` (default):
	 *   - If `position` is not specified, the parameter’s value is updated **in place** (its position remains unchanged).
	 *   - If `position` is specified, the parameter’s value is updated **and moved** to the specified position.
	 * - If `overwrite` is `false`, the existing parameter is left unchanged and no insertion occurs.
	 *
	 * If {@link TemplateParameterHierarchies | parameter hierarchies} are set, `key` is automatically
	 * resolved to the higher-priority key, if applicable.
	 *
	 * Note that the order of parameters in the final output can also be controlled via {@link stringify}, using
	 * {@link TemplateOutputConfig.sortPredicate}, regardless of the insertion order tracked by this instance.
	 *
	 * @param key The key of the parameter. This can be an empty string for unnamed parameters.
	 * @param value The value of the parameter.
	 * @param overwrite Whether to overwrite an existing parameter if it exists. (Default: `true`)
	 * @param position Where to insert or move the parameter:
	 * - `'start'`: Insert at the beginning.
	 * - `'end'`: Insert at the end (default for new parameters).
	 * - `{ before: referenceKey }`: Insert before the given key.
	 * - `{ after: referenceKey }`: Insert after the given key.
	 *
	 * If `referenceKey` does not exist:
	 * - For new parameters, insertion falls back to `'end'`.
	 * - For existing parameters, the value is updated in place without moving it (i.e., behaves as if `position`
	 *   is not specified).
	 *
	 * When specifying a `referenceKey`, it is best practice to verify its existence beforehand to ensure
	 * expected behavior. See {@link hasParam} for the relevant utility.
	 *
	 * @returns The current instance for chaining.
	 */
	insertParam(
		key: string,
		value: string,
		overwrite?: boolean,
		position?: 'start' | 'end' | {before: string} | {after: string}
	): this;
	/**
	 * Updates the value of an existing parameter without changing its position.
	 *
	 * - If no parameter with the given `key` exists, this method does nothing.
	 * - If {@link TemplateParameterHierarchies | parameter hierarchies} are set, `key` is automatically
	 *   resolved to the higher-priority key, if applicable.
	 *
	 * This is functionally equivalent to calling {@link insertParam} with `overwrite = true` and no `position`,
	 * **except** that it performs no operation if the parameter does not already exist.
	 *
	 * Use this method when you want to safely update a parameter **only if it exists**, without affecting the order
	 * of parameters or accidentally inserting new ones.
	 *
	 * @param key The key of the parameter. This can be an empty string for unnamed parameters.
	 * @param value The new value of the parameter.
	 *
	 * @returns The current instance for chaining.
	 */
	updateParam(key: string, value: string): this;
	/**
	 * Gets a parameter object by key.
	 *
	 * **Caution**: The returned object is mutable.
	 *
	 * @param key The parameter key.
	 * @param resolveHierarchy Whether to consider {@link TemplateParameterHierarchies | hierarchies} when
	 * searching for a matching parameter. If `true`, this method first checks whether `key` belongs to a hierarchy
	 * array. If {@link params} contains a parameter with a higher-priority key in that hierarchy, that parameter
	 * is returned instead. (Default: `false`).
	 *
	 * Example:
	 * - Given `key = '1'`, `hierarchies = [['1', 'user', 'User']]`, and `params` containing a parameter keyed `'user'`,
	 *   this method returns the `'user'` parameter.
	 *
	 * If `key` does not belong to any hierarchy array, the method behaves the same as when
	 * `resolveHierarchy` is `false`. This also applies if no template parameter hierarchies have been provided
	 * via the constructor or {@link ParseTemplatesConfig.hierarchies}.
	 *
	 * @returns The parameter object if found; otherwise, `null`.
	 */
	getParam(key: string, resolveHierarchy?: boolean): TemplateParameter | null;
	/**
	 * Checks if a template parameter with the specified key exists, optionally matching its value.
	 *
	 * @param key The parameter key to match, either as an exact string or a regular expression.
	 * @param value The optional value matcher.
	 * - If a string, checks for an exact value match.
	 * - If a regular expression, tests the parameter value against the pattern.
	 * - If omitted, only the parameter key is checked.
	 * @returns `true` if a matching parameter exists; otherwise, `false`.
	 *
	 * @example
	 * hasParam("user"); // Checks if a parameter named "user" exists.
	 * hasParam(/^data-/); // Checks for parameters starting with "data-".
	 * hasParam("id", "123"); // Checks if "id" exists and equals "123".
	 */
	hasParam(key: string | RegExp, value?: string | RegExp): boolean;
	/**
	 * Checks if a template parameter exists based on a custom predicate function.
	 *
	 * @param predicate A function that tests each parameter.
	 * @returns `true` if a matching parameter exists; otherwise, `false`.
	 *
	 * @example
	 * hasParam((param) => param.key.startsWith("meta") && param.value.length > 10);
	 */
	hasParam(predicate: (param: TemplateParameter) => boolean): boolean;
	/**
	 * Deletes a parameter from the template.
	 *
	 * @param key The parameter key to delete.
	 * @param resolveHierarchy Whether to consider {@link TemplateParameterHierarchies | hierarchies} when
	 * resolving the key. If `true`, this method checks the {@link params} object for any parameter whose key is
	 * an alias of `key` and deletes it if found. (Default: `false`)
	 * @returns `true` if a matching parameter was deleted; otherwise, `false`.
	 */
	deleteParam(key: string, resolveHierarchy?: boolean): boolean;
}

/**
 * This interface defines the static members of the `Template` class. For instance members,
 * see {@link Template} (defined separately due to TypeScript limitations).
 *
 * `Template` is a class that serves to parse `{{template}}` markups into an object structure,
 * which is accessible via {@link Mwbot.Template}. Note that `{{#parserfunction:}}` markups
 * are treated differently by the {@link ParserFunctionStatic | ParserFunction} class.
 *
 * @example
 * const foo = new mwbot.Template('Foo');
 * foo.insertParam('', 'bar').insertParam('user', 'baz');
 * foo.stringify(); // {{Foo|bar|user=baz}}
 */
export interface TemplateStatic extends TemplateBaseStatic<Title> {
	/**
	 * Creates a new instance.
	 *
	 * **Usage**:
	 * ```ts
	 * const template = new mwbot.Template('Template title');
	 * ```
	 *
	 * @param title The title that the template transcludes.
	 * @param params Template parameters.
	 * @param hierarchies Optional template parameter hierarchies.
	 */
	new(
		title: string | Title,
		params?: NewTemplateParameter[],
		hierarchies?: TemplateParameterHierarchies
	): Template;
	/**
	 * Error-proof constructor.
	 *
	 * **Usage**:
	 * ```ts
	 * const template = mwbot.Template.new('Template title');
	 * ```
	 *
	 * @param title The title that the template transcludes.
	 * @param params Template parameters.
	 * @param hierarchies Optional template parameter hierarchies.
	 * @returns `null` if initialization fails.
	 */
	'new'(
		title: string | Title,
		params?: NewTemplateParameter[],
		hierarchies?: TemplateParameterHierarchies
	): Template | null;
	/**
	 * Checks if the given object is an instance of the specified template-related class.
	 *
	 * This method is an alternative of the `instanceof` operator, which cannot be used for
	 * non-exported classes.
	 *
	 * **Example**:
	 * ```ts
	 * const [foo] = new mwbot.Wikitext('{{Foo}}').parseTemplates();
	 * foo instanceof mwbot.Template; // true
	 * mwbot.Template.is(foo, 'ParsedTemplate'); // true
	 * mwbot.Template.is(foo, 'RawTemplate'); // false
	 * foo instanceof mwbot.ParserFunction; // false
	 * mwbot.Template.is(foo, 'ParsedParserFunction'); // false
	 * ```
	 *
	 * Be noted about the hierarchies of the template-related classes:
	 * - {@link ParsedTemplateStatic | ParsedTemplate} extends {@link TemplateStatic | Template}.
	 * - {@link RawTemplateStatic | RawTemplate} extends nothing, meaning that its instances are
	 * ***not*** instances of {@link TemplateStatic | Template}, {@link ParsedTemplateStatic | ParsedTemplate},
	 * {@link ParserFunctionStatic | ParserFunction}, or {@link ParsedParserFunctionStatic | ParsedParserFunction}.
	 * - {@link ParsedParserFunctionStatic | ParsedParserFunction} extends {@link ParserFunctionStatic | ParserFunction}.
	 *
	 * @template T The type of template to check for. Must be one of `'Template'`, `'ParsedTemplate'`,
	 * `'RawTemplate'`, `'ParserFunction'`, or `'ParsedParserFunction'`.
	 * @param obj The object to check.
	 * @param type The template type to compare against.
	 * @returns `true` if `obj` is an instance of the specified template class, otherwise `false`.
	 * @throws {Error} If an invalid `type` is provided.
	 */
	is<T extends keyof TemplateTypeMap>(obj: unknown, type: T): obj is TemplateTypeMap[T];
}

/**
 * The instance members of the `Template` class. For static members,
 * see {@link TemplateStatic} (defined separately due to TypeScript limitations).
 */
export interface Template extends TemplateBase<Title> {
	/**
	 * Sets a new title to the instance.
	 *
	 * @param title The new title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A boolean indicating whether the new title was set.
	 */
	setTitle(title: string | Title, verbose?: boolean): boolean;
	/**
	 * Stringifies the instance.
	 *
	 * @param options Options to format the output.
	 * @returns The template as a string.
	 */
	stringify(options?: TemplateOutputConfig<Title>): string;
	/**
	 * Alias of {@link stringify} called without arguments.
	 *
	 * @returns The template as a string.
	 */
	toString(): string;
}

/**
 * This interface defines the static members of the `ParsedTemplate` class. For instance members,
 * see {@link ParsedTemplate} (defined separately due to TypeScript limitations).
 *
 * This class is exclusive to {@link Wikitext.parseTemplates}.
 * It represents a well-formed `{{template}}` markup with a valid title. For the class
 * that represents a malformed `{{template}}` markup with an invalid title, see {@link RawTemplateStatic}.
 *
 * This class differs from {@link RawTemplateStatic | RawTemplate} in that:
 * - It extends the {@link TemplateStatic | Template} class.
 * - The {@link ParsedTemplate.title | title} property is an instance of {@link Title} instead of a string.
 *
 * The constructor of this class is inaccessible, and instances can only be referenced
 * in the result of `parseTemplates`.
 *
 * To check if an object is an instance of this class, use {@link TemplateStatic.is}.
 *
 * **Important**:
 *
 * The instance properties of this class are pseudo-read-only, in the sense that altering them
 * does not affect the behaviour of {@link Wikitext.modifyTemplates}.
 *
 * @private
 */
export interface ParsedTemplateStatic extends Omit<TemplateStatic, 'new'> {
	/**
	 * @param initializer
	 * @param options
	 * @private
	 */
	new(initializer: ParsedTemplateInitializer, options?: ParsedTemplateOptions): ParsedTemplate;
}

/**
 * The instance members of the `ParsedTemplate` class. For static members,
 * see {@link ParsedTemplateStatic} (defined separately due to TypeScript limitations).
 */
export interface ParsedTemplate extends Template {
	/**
	 * The raw template title, as directly parsed from the first operand of a `{{template|...}}` expression.
	 */
	rawTitle: string;
	/**
	 * The original text of the template parsed from the wikitext.
	 * The value of this property is static.
	 */
	text: string;
	/**
	 * The starting index of this template in the wikitext.
	 */
	startIndex: number;
	/**
	 * The ending index of this template in the wikitext (exclusive).
	 */
	endIndex: number;
	/**
	 * The nesting level of this template. `0` if not nested within another double-braced expression.
	 */
	nestLevel: number;
	/**
	 * Whether the template appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;

	/**
	 * Converts the instance to a {@link ParsedParserFunction}.
	 *
	 * This method should only be used for `ParsedTemplate` instances that represent invalid
	 * parser functions (e.g., `{{if:1|1|2}}`, where `"if:"` is not a valid function hook
	 * and is therefore recognized as part of a template title).
	 *
	 * The conversion is based on the data used to initialize this instance, and any modifications
	 * made after initialization will be discarded. Therefore, this method should be called before
	 * making any changes to the instance properties.
	 *
	 * @param title The parser function hook to convert this title to, **including** a trailing
	 * colon character (e.g., `"#if:"`; see also {@link ParserFunctionStatic.verify}). If a `Title`
	 * instance is passed, the output of `title.getPrefixedDb({ colon: true, fragment: true })`
	 * is validated.
	 *
	 * When passing a string, it can (and should) include the function’s first parameter (e.g., `"#if:1"`).
	 * The second and subsequent parameters are initialized based on {@link params}.
	 *
	 * @param verbose Whether to log errors (default: `false`).
	 * @returns A new {@link ParsedParserFunction} instance on success; otherwise, `null`.
	 */
	toParserFunction(title: string | Title, verbose?: boolean): ParsedParserFunction | null;
	/**
	 * @inheritdoc
	 */
	stringify(options?: ParsedTemplateOutputConfig): string;
	/**
	 * @inheritdoc
	 */
	toString(): string;
	/**
	 * @hidden
	 */
	_clone(options?: ParsedTemplateOptions): ParsedTemplate;
}

/**
 * This interface defines the static members of the `RawTemplate` class. For instance members,
 * see {@link RawTemplate} (defined separately due to TypeScript limitations).
 *
 * This class is exclusive to {@link Wikitext.parseTemplates}.
 * It represents a malformed `{{template}}` markup with an invalid title. For the class
 * that represents a well-formed `{{template}}` markup, see {@link ParsedTemplateStatic}
 * (and {@link ParsedParserFunctionStatic}).
 *
 * This class differs from {@link ParsedTemplateStatic | ParsedTemplate} in that:
 * - It does not extend any class (that the user can access).
 * - The {@link RawTemplate.title | title} property is a string instead of an instance of {@link Title}.
 *
 * The constructor of this class is inaccessible, and instances can only be referenced
 * in the result of `parseTemplates`.
 *
 * To check if an object is an instance of this class, use {@link TemplateStatic.is}.
 *
 * **Important**:
 *
 * The instance properties of this class are pseudo-read-only, in the sense that altering them
 * does not affect the behaviour of {@link Wikitext.modifyTemplates}.
 *
 * @private
 */
export interface RawTemplateStatic extends Omit<TemplateBaseStatic<string>, 'new'> {
	/**
	 * @param initializer
	 * @param options
	 * @private
	 */
	new(initializer: ParsedTemplateInitializer, options?: ParsedTemplateOptions): RawTemplate;
}

/**
 * The instance members of the `RawTemplate` class. For static members,
 * see {@link RawTemplateStatic} (defined separately due to TypeScript limitations).
 */
export interface RawTemplate extends TemplateBase<string> {
	/**
	 * The raw template title, as directly parsed from the first operand of a `{{template|...}}` expression.
	 */
	rawTitle: string;
	/**
	 * The original text of the template parsed from the wikitext.
	 * The value of this property is static.
	 */
	text: string;
	/**
	 * The starting index of this template in the wikitext.
	 */
	startIndex: number;
	/**
	 * The ending index of this template in the wikitext (exclusive).
	 */
	endIndex: number;
	/**
	 * The nesting level of this template. `0` if not nested within another double-braced expression.
	 */
	nestLevel: number;
	/**
	 * Whether the template appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;

	/**
	 * Sets a new title to the instance.
	 *
	 * This method simply updates the {@link RawTemplate.title | title} property of the instance.
	 * If the new title is an unambiguously valid title for MediaWiki, use {@link toTemplate} or
	 * {@link toParserFunction} instead.
	 *
	 * @param title The new title to set.
	 * @returns The current instance for chaining.
	 */
	setTitle(title: string): this;
	/**
	 * Sets a valid template title and converts the instance to a new {@link ParsedTemplate} instance.
	 *
	 * The conversion is based on the data used to initialize this instance, and any modifications
	 * made after initialization will be discarded. Therefore, this method should be called before
	 * making any changes to the instance properties.
	 *
	 * @param title The new template title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A new {@link ParsedTemplate} instance on success; otherwise, `null`.
	 */
	toTemplate(title: string | Title, verbose?: boolean): ParsedTemplate | null;
	/**
	 * Sets a valid function hook and converts the instance to a new {@link ParsedParserFunction} instance.
	 *
	 * The conversion is based on the data used to initialize this instance, and any modifications
	 * made after initialization will be discarded. Therefore, this method should be called before
	 * making any changes to the instance properties.
	 *
	 * @param title The parser function hook to convert this title to, **including** a trailing
	 * colon character (e.g., `"#if:"`; see also {@link ParserFunctionStatic.verify}). If a {@link Title}
	 * instance is passed, the output of `title.getPrefixedDb({ colon: true, fragment: true })`
	 * is validated.
	 *
	 * When passing a string, it can (and should) include the function’s first parameter (e.g., `'#if:1'`).
	 * The second and subsequent parameters are initialized based on {@link params}.
	 *
	 * @param verbose Whether to log errors (default: `false`).
	 * @returns A new {@link ParsedParserFunction} instance on success; otherwise, `null`.
	 */
	toParserFunction(title: string | Title, verbose: boolean): ParsedParserFunction | null;
	/**
	 * Stringifies the instance.
	 *
	 * @param options Options to format the output.
	 * @returns The template as a string.
	 */
	stringify(options?: RawTemplateOutputConfig): string;
	/**
	 * Alias of {@link stringify} called without arguments.
	 *
	 * @returns The template as a string.
	 */
	toString(): string;
	/**
	 * @hidden
	 */
	_clone(options?: ParsedTemplateOptions): RawTemplate;
}

/**
 * This interface defines the static members of the `ParserFunction` class. For instance members,
 * see {@link ParserFunction} (defined separately due to TypeScript limitations).
 *
 * `ParserFunction` is a class that serves to parse `{{#func:}}` markups into an object structure,
 * which is accessible via {@link Mwbot.ParserFunction}. Note that `{{template}}` markups
 * are treated differently by the {@link TemplateStatic | Template} class.
 *
 * @example
 * const func = new mwbot.ParserFunction('#if:', ['{{{1|}}}']);
 * func.addParam('{{{1}}}');
 * func.stringify(); // {{#if:{{{1|}}}|{{{1}}}}}
 */
export interface ParserFunctionStatic extends Omit<typeof ParamBase, 'prototype'> {
	/**
	 * Creates a new instance.
	 *
	 * **Usage**:
	 * ```ts
	 * const func = new mwbot.ParserFunction('#hook:');
	 * ```
	 *
	 * @param hook The function hook. This ***must*** end with a colon character.
	 * @param params Parameters of the parser function.
	 */
	new(hook: string, params?: string[]): ParserFunction;
	/**
	 * Verifies the given string as a parser function hook.
	 *
	 * **Usage**:
	 * ```ts
	 * const verifiedHook = mwbot.ParserFunction.verify('#hook:');
	 * ```
	 *
	 * @param hook A potential parser function hook as a string. This **must** end with a colon character.
	 * @returns An object representing the canonical function hook and the matched function hook, or `null`.
	 */
	verify(hook: string): VerifiedFunctionHook | null;
}

/**
 * The instance members of the `ParserFunction` class. For static members,
 * see {@link ParserFunctionStatic} (defined separately due to TypeScript limitations).
 */
export interface ParserFunction extends InstanceType<typeof ParamBase> {
	/**
	 * The parser function hook. This may be an alias of the canonical hook.
	 *
	 * This property is read-only. To update it, use {@link setHook}.
	 */
	readonly hook: string;
	/**
	 * The canonical parser function hook.
	 *
	 * This property is automatically set and updated on a successful call of {@link setHook}.
	 */
	readonly canonicalHook: string;

	/**
	 * Sets a new function hook, overwriting the current one.
	 *
	 * @param hook The new hook.
	 * @returns A boolean indicating whether the new hook was set.
	 */
	setHook(hook: string): boolean;
	/**
	 * Stringifies the instance.
	 *
	 * @param options Options to format the output.
	 * @returns The parser function as a string.
	 */
	stringify(options?: ParserFunctionOutputConfig): string;
	/**
	 * Alias of {@link stringify} called without arguments.
	 *
	 * @returns The parser function as a string.
	 */
	toString(): string;
}

/**
 * This interface defines the static members of the `ParsedParserFunction` class. For instance members,
 * see {@link ParsedParserFunction} (defined separately due to TypeScript limitations).
 *
 * This class is exclusive to {@link Wikitext.parseTemplates}.
 * It represents a well-formed `{{#parserfunction:...}}` markup with a valid title. For the class
 * that represents a well-formed `{{template}}` markup, see {@link ParsedTemplateStatic}.
 * (and also {@link RawTemplateStatic}).
 *
 * This class differs from {@link ParsedTemplateStatic | ParsedTemplate} in that:
 * - It extends the {@link ParserFunctionStatic | ParserFunction} class.
 *
 * The constructor of this class is inaccessible, and instances can only be referenced
 * in the result of `parseTemplates`.
 *
 * To check if an object is an instance of this class, use {@link TemplateStatic.is}.
 *
 * **Important**:
 *
 * The instance properties of this class are pseudo-read-only, in the sense that altering them
 * does not affect the behaviour of {@link Wikitext.modifyTemplates}.
 *
 * @private
 */
export interface ParsedParserFunctionStatic extends Omit<ParserFunctionStatic, 'new'> {
	/**
	 * @param initializer
	 * @private
	 */
	new(initializer: ParsedTemplateInitializer): ParsedParserFunction;
}

/**
 * The instance members of the `ParsedParserFunction` class. For static members,
 * see {@link ParsedParserFunctionStatic} (defined separately due to TypeScript limitations).
 */
export interface ParsedParserFunction extends ParserFunction {
	/**
	 * The raw parser function hook, as directly parsed from the wikitext.
	 */
	rawHook: string;
	/**
	 * The original text of the parser function parsed from the wikitext.
	 * The value of this property is static.
	 */
	text: string;
	/**
	 * The starting index of this parser function in the wikitext.
	 */
	startIndex: number;
	/**
	 * The ending index of this parser function in the wikitext (exclusive).
	 */
	endIndex: number;
	/**
	 * The nesting level of this parser function. `0` if not nested within another double-braced expression.
	 */
	nestLevel: number;
	/**
	 * Whether the parser function appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;

	/**
	 * Converts the instance to a {@link ParsedTemplate}.
	 *
	 * The conversion is based on the data used to initialize this instance, and any modifications
	 * made after initialization will be discarded. Therefore, this method should be called before
	 * making any changes to the instance properties.
	 *
	 * @param title The new template title to set.
	 * @param verbose Whether to log errors (default: `false`).
	 * @returns A new {@link ParsedTemplate} instance on success; otherwise, `null`.
	 */
	toTemplate(title: string | Title, verbose?: boolean): ParsedTemplate | null;
	/**
	 * @inheritdoc
	 */
	stringify(options?: ParsedParserFunctionOutputConfig): string;
	/**
	 * @inheritdoc
	 */
	toString(): string;
	/**
	 * @hidden
	 */
	_clone(): ParsedParserFunction;
}

/**
 * @internal
 */
export function TemplateFactory(config: Mwbot['config'], info: Mwbot['_info'], Title: TitleStatic) {

	const namespaceIds = config.get('wgNamespaceIds');
	const NS_MAIN = namespaceIds[''];
	const NS_TEMPLATE = namespaceIds.template;

	/**
	 * Object that maps canonical parser function names to their validation regular expressions.
	 * The validation includes the trailing colon, which can be a 2-byte character in some cases.
	 */
	const parserFunctionMap = info.magicwords.reduce((acc: Record<string, RegExp>, obj) => {
		if (!info.functionhooks.includes(obj.name)) {
			return acc;
		}
		const caseSensitive = obj['case-sensitive'];
		const keys = [obj.name];
		const noHash = noHashFunctions.includes(obj.name);
		obj.aliases.forEach((alias) => {
			if (alias !== obj.name && !/^[_＿].+[_＿]$/.test(alias)) {
				keys.push(alias);
			}
		});
		const arrRegExp = keys.reduce((ret: string[], key) => {
			let hash = noHash ? '' : '#';
			if (key.startsWith('#')) {
				hash = '#';
				key = key.slice(1);
			}
			if (!/[:：]$/.test(key)) {
				key += ':';
			}
			if (caseSensitive) {
				// The first letter is not case-sensitive even if this function hook is case-sensitive
				ret.push(`^${hash}[${key[0].toLowerCase() + key[0].toUpperCase()}]${key.slice(1)}$`);
			} else {
				ret.push(`^${hash + key}$`);
			}
			return ret;
		}, []);
		const canonical = (noHash ? '' : '#') + obj.name + ':';
		acc[canonical] = new RegExp(arrRegExp.join('|'), caseSensitive ? '' : 'i');
		return acc;
	}, Object.create(null));

	class TemplateBase<T extends string | Title> implements TemplateBase<T> {

		readonly title: T;
		readonly params: Record<string, TemplateParameter>;
		/**
		 * The order of parameter registration.
		 */
		protected paramOrder: Set<string>;
		/**
		 * Template parameter hierarchies.
		 */
		protected hierarchies: TemplateParameterHierarchies;

		constructor(
			title: T,
			params: NewTemplateParameter[] = [],
			hierarchies?: TemplateParameterHierarchies
		) {

			this.title = title;
			this.params = Object.create(null);
			this.paramOrder = new Set();
			this.hierarchies = Array.isArray(hierarchies) ? hierarchies.map((arr) => [...arr]) : [];

			// Register parameters
			params.forEach(({key, value}) => {
				this.registerParam(key || '', value, {overwrite: true, position: 'end', listDuplicates: true});
			});

		}

		insertParam(
			key: string,
			value: string,
			overwrite?: boolean,
			position?: 'start' | 'end' | {before: string} | {after: string}
		): this {
			return this.registerParam(key, value, {overwrite: !!overwrite, position});
		}

		updateParam(key: string, value: string): this {
			return this.registerParam(key, value, {overwrite: 'must'});
		}

		getParam(key: string, resolveHierarchy = false): TemplateParameter | null {
			if (resolveHierarchy) {
				const hier = this.hierarchies.find((arr) => arr.includes(key));
				if (hier) {
					for (let i = hier.length - 1; i >= 0; i--) {
						if (hier[i] in this.params) {
							return this.params[hier[i]];
						}
					}
				}
			}
			return this.params[key] || null;
		}

		hasParam(
			keyOrPred: string | RegExp | ((param: TemplateParameter) => boolean),
			value?: string | RegExp
		): boolean {
			if (
				typeof keyOrPred !== 'string' &&
				!(keyOrPred instanceof RegExp) &&
				typeof keyOrPred !== 'function' ||
				keyOrPred === ''
			) {
				return false;
			}

			// If `keyOrPred` is a function, check against each param
			if (typeof keyOrPred === 'function') {
				return Object.values(this.params).some((obj) => keyOrPred(mergeDeep(obj)));
			}

			// Convert string key to a strict RegExp match
			const keyPattern = typeof keyOrPred === 'string'
				? new RegExp(`^${escapeRegExp(keyOrPred)}$`)
				: keyOrPred;

			// Search for a matching key and validate its value
			return Object.entries(this.params).some(([k, obj]) =>
				keyPattern.test(k) &&
				(
					value === undefined ||
					(typeof value === 'string' && value === obj.value) ||
					(value instanceof RegExp && value.test(obj.value))
				)
			);
		}

		deleteParam(key: string, resolveHierarchy = false): boolean {
			if (!(key in this.params) && resolveHierarchy) {
				const overrideStatus = this.checkKeyOverride(key);
				if (overrideStatus) {
					if (overrideStatus.overrides) {
						key = overrideStatus.overrides;
					} else if (overrideStatus.overridden) {
						key = overrideStatus.overridden;
					}
				}
			}
			if (!this.params[key]) {
				return false;
			}
			delete this.params[key];
			this.paramOrder.delete(key);
			return true;
		}

		/**
		 * Validates the given title as a template title and returns a Title instance. The title must not be
		 * a parser function hook. On failure, this method throws an error.
		 *
		 * @param title The (prefixed) title to validate as a template title.
		 * @param asHook Whether to validate the title as a function hook.
		 * @returns
		 */
		protected static validateTitle(title: string | Title, asHook?: false): Title;
		/**
		 * Validates the given title as a function hook and returns a verified hook object. On failure, this method
		 * throws an error.
		 *
		 * @param title The (prefixed) title to validate as a function hook.
		 * @param asHook Whether to validate the title as a function hook.
		 * @returns
		 */
		protected static validateTitle(title: string | Title, asHook: true): VerifiedFunctionHook;
		protected static validateTitle(title: string | Title, asHook = false): Title | VerifiedFunctionHook {
			if (typeof title !== 'string' && !(title instanceof Title)) {
				throw new TypeError(`Expected a string or Title instance for "title", but got ${typeof title}.`);
			}
			const hook = ParserFunction.verify(
				typeof title === 'string'
				? title
				: title.getPrefixedDb({colon: true, fragment: true})
			);
			if (hook && asHook) {
				return hook;
			} else if (hook) {
				throw new Error(`"${hook}" is a parser function hook.`);
			} else if (typeof title === 'string') {
				title = Title.clean(title);
				const namespace = title[0] === ':' ? NS_MAIN : NS_TEMPLATE; // TODO: Handle "/" (subpage) and "#" (in-page section)?
				title = new Title(title, namespace);
			} else {
				title = new Title(title.getPrefixedDb({colon: true, fragment: true}));
			}
			if (!title.getMain()) {
				throw new Error('The empty title cannot be transcluded.');
			} else if (title.isExternal() && !title.isTrans()) {
				throw new Error('The interwiki title cannot be transcluded.');
			}
			return title;
		}

		/**
		 * Find the first available numeric key for a template parameter.
		 * @returns A string-cast numeric key.
		 */
		protected findNumericKey(): string {
			const numericKeys = Object.keys(this.params).reduce((acc, key) => {
				if (/^[1-9]\d*$/.test(key)) {
					acc.add(+key);
				}
				return acc;
			}, new Set<number>());
			let i = 1;
			while (numericKeys.has(i)) {
				i++;
			}
			return String(i);
		}

		/**
		 * Determines whether a given template parameter key overrides another key
		 * or is itself overridden based on parameter hierarchies.
		 *
		 * @param key The parameter key to check.
		 * @returns An object describing the override relationship:
		 * - `{overrides: string}` if the input key overrides an existing key.
		 * - `{overridden: string}` if the input key is overridden by an existing key.
		 * - `null` if no override relationship exists.
		 *
		 * The returned key will always be different from the input key.
		 */
		protected checkKeyOverride(key: string): XOR<{overrides: string}, {overridden: string}> | null {
			if (!this.hierarchies.length) {
				return null;
			}

			// Locate the hierarchy that includes the input key
			const hier = this.hierarchies.find((arr) => arr.includes(key));
			if (!hier) {
				return null;
			}

			// Find an already registered key within the same hierarchy (excluding the input key)
			const registeredKey = Object.keys(this.params).find((k) => hier.includes(k) && k !== key);
			if (!registeredKey) {
				return null;
			}

			// Compare their positions in the hierarchy to determine precedence
			return hier.indexOf(key) > hier.indexOf(registeredKey)
				? {overrides: registeredKey} // Input key overrides an existing key
				: {overridden: registeredKey}; // Input key is overridden by an existing key
		}

		/**
		 * Creates a template parameter object.
		 */
		protected createParam(
			key: string,
			value: string,
			unnamed: boolean,
			duplicates: Omit<TemplateParameter, "duplicates">[]
		): TemplateParameter;
		/**
		 * Creates a duplicate template parameter object.
		 */
		protected createParam(
			key: string,
			value: string,
			unnamed: boolean,
			duplicates: null
		): Omit<TemplateParameter, "duplicates">;
		protected createParam(
			key: string,
			value: string,
			unnamed: boolean,
			duplicates: Omit<TemplateParameter, "duplicates">[] | null
		): TemplateParameter | Omit<TemplateParameter, "duplicates"> {
			const ret: Partial<TemplateParameter> = {
				key,
				value,
				get text() {
					return '|' + (!this.unnamed ? this.key + '=' : '') + this.value;
				},
				unnamed
			};
			if (duplicates) {
				ret.duplicates = duplicates;
				return ret as TemplateParameter;
			} else {
				return ret as Omit<TemplateParameter, "duplicates">;
			}
		}

		/**
		 * Registers a template parameter.
		 *
		 * @param key The key of the parameter. This can be an empty string if the parameter should be unnamed.
		 * @param value The new value of the parameter.
		 * @param options Options to register the parameter.
		 * @returns The current instance for chaining.
		 */
		protected registerParam(
			key: string,
			value: string,
			options: {
				/**
				 * Whether to overwrite existing parameters. If `false`, the new parameter is not registered
				 * if there is an existing parameter with the same `key`. If `'must'`, the method ensures that
				 * it overwrites an existing parameter and does nothing if it would not.
				 */
				overwrite: boolean | 'must';
				/**
				 * Where to insert the parameter in the internal ordering. Can be:
				 * - `'start'`: insert at the beginning,
				 * - `'end'`: insert at the end (default),
				 * - `{before: string}`: insert before the parameter with the given key,
				 * - `{after: string}`: insert after the parameter with the given key.
				 */
				position?: 'start' | 'end' | {before: string} | {after: string};
				/**
				 * Whether to list duplicate parameters. This applies to overwrites and
				 * will store previous values in the `duplicates` array.
				 */
				listDuplicates?: true;
			}
		): this {

			key = key.trim();
			const unnamed = key === '';
			if (unnamed) {
				key = this.findNumericKey();
			} else {
				value = value.trim(); // Trim value only if the key is named
			}

			const {overwrite, position, listDuplicates = false} = options;
			const overrideStatus = this.checkKeyOverride(key);
			const existing = overrideStatus !== null || key in this.params;

			// Early exit conditions:
			// 1. If the key already exists and overwrite is not allowed.
			// 2. If the key doesn't exist and overwrite is required ('must').
			if ((existing && !overwrite) || (!existing && overwrite === 'must')) {
				return this;
			}

			/**
			 * Helper function to resolve the index of a reference key inside paramOrder.
			 * Handles possible override relationships by checking both overriding and overridden keys.
			 */
			const findReferenceIndex = (order: string[], ref: string): number => {
				let i = order.indexOf(ref);
				if (i !== -1) return i;
				const rel = this.checkKeyOverride(ref);
				if (typeof rel?.overrides === 'string' && (i = order.indexOf(rel.overrides)) !== -1) return i;
				if (typeof rel?.overridden === 'string' && (i = order.indexOf(rel.overridden)) !== -1) return i;
				return -1;
			};

			const order = [...this.paramOrder];
			if (existing) {
				// Handle updates for an existing key

				// The input key overrides another key (i.e., an alias), or it exists directly
				if (overrideStatus?.overrides || key in this.params) {

					const targetKey = overrideStatus?.overrides ?? key;
					const {duplicates, ...previousParam} = this.params[targetKey];
					if (listDuplicates) {
						// If duplicate tracking is enabled, save the previous param state
						duplicates.push(previousParam);
					}
					delete this.params[targetKey]; // Remove the old parameter before replacing

					// Get the reference key if `position` is an object, ensuring that the ref key is a string
					let refKey: string | null = null;
					let isAfter = false;
					if (isPlainObject(position)) {
						if ('before' in position && typeof position.before === 'string') {
							refKey = position.before;
						} else if ('after' in position && typeof position.after === 'string') {
							isAfter = true;
							refKey = position.after;
						}
					}

					// Self-reference should fall back to in-place update: Exclude such cases
					if (!(refKey === targetKey || refKey === key)) {

						// Remove the target from current order before reinserting
						const targetKeyIndex = order.indexOf(targetKey);
						order.splice(targetKeyIndex, 1);

						if (refKey && isPlainObject(position)) {
							let insertIndex = findReferenceIndex(order, refKey);
							if (insertIndex !== -1) {
								insertIndex = isAfter ? insertIndex + 1 : insertIndex;
								order.splice(insertIndex, 0, key);
							} else {
								order.push(key);
							}
						} else if (position === 'start') {
							order.unshift(key);
						} else if (position === 'end') {
							order.push(key);
						} else {
							// Default: preserve original index
							order.splice(targetKeyIndex, 0, key);
						}
					}

					this.params[key] = this.createParam(key, value, unnamed, duplicates);
					this.paramOrder = new Set(order);
				}

				// The input key is overridden by an existing parameter
				else if (overrideStatus?.overridden) {
					if (listDuplicates) {
						this.params[overrideStatus.overridden].duplicates.push(
							this.createParam(key, value, unnamed, null)
						);
					}
					// Do not modify existing parameter or reorder
				}
			} else {
				// Handle a brand new parameter

				this.params[key] = this.createParam(key, value, unnamed, []);

				// Update the insertion order with respect to the position
				if (isPlainObject(position)) {
					const isBefore = 'before' in position;
					const refKey = isBefore ? position.before : position.after;
					if (typeof refKey === 'string') {
						const refIndex = findReferenceIndex(order, refKey);
						if (refIndex !== -1) {
							const insertAt = isBefore ? refIndex : refIndex + 1;
							order.splice(insertAt, 0, key);
						} else {
							// If reference key is not found, append to end
							order.push(key);
						}
					} else {
						order.push(key);
					}
				} else if (position === 'start') {
					order.unshift(key);
				} else {
					// Default to inserting at the end (position === 'end' or undefined)
					order.push(key);
				}
				this.paramOrder = new Set(order);
			}

			return this;
		}

		/**
		 * Internal stringification handler.
		 * @param title The template title. This must be formatted to a string.
		 * @param options
		 * @returns
		 */
		protected _stringify(title: string, options: TemplateOutputConfig<T>): string {

			const order = [...this.paramOrder];
			const {
				append,
				sortPredicate = (param1, param2) => order.indexOf(param1.key) - order.indexOf(param2.key),
				brPredicateTitle = () => false,
				brPredicateParam = () => false
			} = options;
			const suppressKeys = (options.suppressKeys || []).filter((key) => /^[1-9]\d*$/.test(key));
			let {prepend} = options;
			const ret = ['{{'];

			// Process the title part
			if (typeof prepend === 'string') {
				const hasLeadingColon = typeof this.title === 'string'
					? this.title.startsWith(':')
					: this.title.hadLeadingColon();
				prepend = hasLeadingColon ? prepend.replace(/:$/, '') : prepend;
				ret.push(prepend);
			}
			ret.push(title);
			if (typeof append === 'string') {
				ret.push(append);
			}
			if (brPredicateTitle(this.title)) {
				ret.push('\n');
			}

			// Process params
			for (const param of Object.values(this.params).sort(sortPredicate)) {
				const {key, value, unnamed} = param;
				const noKey =
					value.includes('=') ? false : // Always show key if value contains '='
					suppressKeys.includes(key) ? true : // Suppress key if it's in the list
					unnamed; // Fallback to the original setting
				ret.push('|' + (noKey ? '' : key + '=') + value);
				if (brPredicateParam(param)) {
					ret.push('\n');
				}
			}

			ret.push('}}');
			return ret.join('');

		}

	}

	// Check missing members
	const _templateBaseCheck: TemplateBaseStatic<string> = TemplateBase;

	class Template extends TemplateBase<Title> implements Template {

		constructor(
			title: string | Title,
			params: NewTemplateParameter[] = [],
			hierarchies?: TemplateParameterHierarchies
		) {
			title = Template.validateTitle(title);
			super(title, params, hierarchies);
		}

		static new(
			title: string | Title,
			params: NewTemplateParameter[] = [],
			hierarchies?: TemplateParameterHierarchies
		): Template | null {
			try {
				return new this(title, params, hierarchies);
			} catch {
				return null;
			}
		}

		static is<T extends keyof TemplateTypeMap>(obj: unknown, type: T): obj is TemplateTypeMap[T] {
			switch (type) {
				case 'Template':
					return obj instanceof Template;
				case 'ParsedTemplate':
					return obj instanceof ParsedTemplate;
				case 'RawTemplate':
					return obj instanceof RawTemplate;
				case 'ParserFunction':
					return obj instanceof ParserFunction;
				case 'ParsedParserFunction':
					return obj instanceof ParsedParserFunction;
				default:
					throw new Error(`"${type}" is not a valid input to Template.is().`);
			}
		}

		setTitle(title: string | Title, verbose = false): boolean {
			try {
				// @ts-expect-error
				this.title = Template.validateTitle(title);
				return true;
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return false;
			}
		}

		stringify(options: TemplateOutputConfig<Title> = {}): string {
			const title = this.title.getNamespaceId() === NS_TEMPLATE
				? this.title.getMain()
				: this.title.getPrefixedText({colon: true});
			return this._stringify(title, options);
		}

		override toString() {
			return this.stringify();
		}

	}

	// Check missing members
	type _CheckTemplateStatic = TemplateStatic & { new (...args: any[]): Template };
	const _templateCheckStatic: _CheckTemplateStatic = Template;
	// const _templateCheckInstance: Template = new Template('');

	class ParsedTemplate extends Template implements ParsedTemplate {

		rawTitle: string;
		text: string;
		startIndex: number;
		endIndex: number;
		nestLevel: number;
		skip: boolean;
		/**
		 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
		 */
		private _rawTitle: string;
		/**
		 * @hidden
		 */
		private _initializer: ParsedTemplateInitializer;

		constructor(initializer: ParsedTemplateInitializer, options: ParsedTemplateOptions = {}) {
			const {title, rawTitle, text, params, startIndex, endIndex, nestLevel, skip} = initializer;
			const t = Template.validateTitle(title);
			const titleStr = t.getPrefixedDb();
			const hierarchies = options.hierarchies && titleStr in options.hierarchies
				? options.hierarchies[titleStr].map((arr) => arr.slice())
				: [];
			super(t, params, hierarchies);
			this._initializer = initializer;
			this.rawTitle = rawTitle.replace('\x01', title);
			this._rawTitle = rawTitle;
			this.text = text;
			this.startIndex = startIndex;
			this.endIndex = endIndex;
			this.nestLevel = nestLevel;
			this.skip = skip;
		}

		toParserFunction(title: string | Title, verbose = false): ParsedParserFunction | null {
			title = typeof title === 'string' ? title : title.getPrefixedDb({colon: true, fragment: true});
			try {
				Template.validateTitle(title, true);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
			const initializer = mergeDeep(this._initializer);
			initializer.title = title;
			return new ParsedParserFunction(initializer);
		}

		override stringify(options: ParsedTemplateOutputConfig = {}): string {
			const {rawTitle: optRawTitle, ...rawOptions} = options;
			let title = this.title.getNamespaceId() === NS_TEMPLATE
				? this.title.getMain()
				: this.title.getPrefixedText({colon: true});
			if (optRawTitle && this._rawTitle.includes('\x01')) {
				title = this._rawTitle.replace('\x01', title);
			}
			return this._stringify(title, rawOptions);
		}

		override toString() {
			return this.stringify();
		}

		_clone(options: ParsedTemplateOptions = {}) {
			return new ParsedTemplate(this._initializer, options);
		}

	}

	// Check missing members
	type _CheckParsedTemplateStatic = ParsedTemplateStatic & { new (...args: any[]): ParsedTemplate };
	const _parsedTemplateCheckStatic: _CheckParsedTemplateStatic = ParsedTemplate;
	// const _parsedTemplateCheckInstance: ParsedTemplate = new ParsedTemplate(Object.create(null));

	class RawTemplate extends TemplateBase<string> implements RawTemplate {

		rawTitle: string;
		text: string;
		startIndex: number;
		endIndex: number;
		nestLevel: number;
		skip: boolean;
		/**
		 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
		 */
		private _rawTitle: string;
		/**
		 * @hidden
		 */
		private _initializer: ParsedTemplateInitializer;

		constructor(initializer: ParsedTemplateInitializer, options: ParsedTemplateOptions = {}) {
			const {title, rawTitle, text, params, startIndex, endIndex, nestLevel, skip} = initializer;
			const hierarchies = options.hierarchies && title in options.hierarchies
				? options.hierarchies[title].map((arr) => arr.slice())
				: [];
			super(title, params, hierarchies);
			this._initializer = initializer;
			this.rawTitle = rawTitle.replace('\x01', title);
			this._rawTitle = rawTitle;
			this.text = text;
			this.startIndex = startIndex;
			this.endIndex = endIndex;
			this.nestLevel = nestLevel;
			this.skip = skip;
		}

		setTitle(title: string): this {
			// @ts-expect-error
			this.title = title;
			return this;
		}

		toTemplate(title: string | Title, verbose = false): ParsedTemplate | null {
			title = typeof title === 'string' ? title : title.getPrefixedDb({colon: true, fragment: true});
			try {
				Template.validateTitle(title);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
			const initializer = mergeDeep(this._initializer);
			initializer.title = title;
			return new ParsedTemplate(initializer);
		}

		toParserFunction(title: string | Title, verbose = false): ParsedParserFunction | null {
			title = typeof title === 'string' ? title : title.getPrefixedDb({colon: true, fragment: true});
			try {
				Template.validateTitle(title, true);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
			const initializer = mergeDeep(this._initializer);
			initializer.title = title;
			return new ParsedParserFunction(initializer);
		}

		stringify(options: RawTemplateOutputConfig = {}): string {
			const {rawTitle: optRawTitle, ...rawOptions} = options;
			let title = this.title;
			if (optRawTitle && this._rawTitle.includes('\x01')) {
				title = this._rawTitle.replace('\x01', title);
			}
			return this._stringify(title, rawOptions);
		}

		override toString() {
			return this.stringify();
		}

		_clone(options: ParsedTemplateOptions = {}) {
			return new RawTemplate(this._initializer, options);
		}

	}

	// Check missing members
	type _CheckRawTemplateStatic = RawTemplateStatic & { new (...args: any[]): RawTemplate };
	const _rawTemplateCheckStatic: _CheckRawTemplateStatic = RawTemplate;
	// const _rawTemplateCheckInstance: RawTemplate = new RawTemplate(Object.create(null));

	class ParserFunction extends ParamBase implements ParserFunction {

		readonly hook: string;
		readonly canonicalHook: string;

		constructor(hook: string, params: string[] = []) {
			const verified = ParserFunction.verify(hook);
			if (!verified) {
				throw new Error(`"${hook}" is not a valid function hook.`);
			}
			super(params);
			this.hook = verified.match;
			this.canonicalHook = verified.canonical;
		}

		static verify(hook: string): VerifiedFunctionHook | null {
			// Whitespace characters are illegal in a function hook, i.e. "#if:" is fine but not "# if:" or "#if :"
			const m = /^#?[^:：\s]+[:：]/.exec(hook.trim());
			if (!m) {
				return null;
			}
			for (const [canonical, regex] of Object.entries(parserFunctionMap)) {
				if (regex.test(m[0])) {
					return {
						canonical,
						match: m[0],
					};
				}
			}
			return null;
		}

		setHook(hook: string): boolean {
			const verified = ParserFunction.verify(hook);
			if (!verified) {
				return false;
			}
			// @ts-expect-error
			this.hook = verified.match;
			// @ts-expect-error
			this.canonicalHook = verified.canonical;
			return true;
		}

		/**
		 * Internal stringification handler.
		 *
		 * @param hook The function hook.
		 * @param options Options to format the output. Note that this method does not reference the
		 * {@link ParserFunctionOutputConfig.useCanonical | useCanonical} option, meaning that it must
		 * be processed beforehands.
		 * @returns
		 */
		protected _stringify(hook: string, options: ParserFunctionOutputConfig): string {
			const {prepend = '', sortPredicate, brPredicate} = options;
			const ret = [
				'{{',
				prepend,
				hook
			];
			const params = this.params.slice();
			if (params.length) {
				if (typeof sortPredicate === 'function') {
					params.sort(sortPredicate);
				}
				if (typeof brPredicate === 'function') {
					for (let i = 0; i < params.length; i++) {
						if (brPredicate(params[i], i)) {
							params[i] += '\n';
						}
					}
				}
				ret.push(params.join('|'));
			}
			ret.push('}}');
			return ret.join('');
		}

		stringify(options: ParserFunctionOutputConfig = {}): string {
			const hook = options.useCanonical ? this.canonicalHook : this.hook;
			return this._stringify(hook, options);
		}

		override toString() {
			return this.stringify();
		}

	}

	// Check missing members
	type _CheckParserFunctionStatic = ParserFunctionStatic & { new (...args: any[]): ParserFunction };
	const _parserFunctionCheckStatic: _CheckParserFunctionStatic = ParserFunction;
	// const _parserFunctionCheckInstance: ParserFunction = new ParserFunction('');

	class ParsedParserFunction extends ParserFunction implements ParsedParserFunction {

		rawHook: string;
		text: string;
		startIndex: number;
		endIndex: number;
		nestLevel: number;
		skip: boolean;
		/**
		 * {@link rawHook} with the insertion point of {@link hook} replaced with a control character.
		 */
		private _rawHook: string;
		/**
		 * @hidden
		 */
		private _initializer: ParsedTemplateInitializer;

		constructor(initializer: ParsedTemplateInitializer) {

			const {title, rawTitle, text, params, startIndex, endIndex, nestLevel, skip} = initializer;
			const verified = ParserFunction.verify(title);
			if (!verified) {
				throw new Error(`"${title}" is not a valid function hook.`);
			}

			// Separate the function hook and the first argument
			const titleIndex = rawTitle.indexOf('\x01');
			let rawHook, _rawHook, paramPart;
			if (titleIndex !== -1) {
				// `rawTitle` contains a control character: we already know where to insert `title`
				// Here, '\x01' = verified.match + paramPart
				const leadingPart = rawTitle.slice(0, titleIndex);
				const trailingParamPart = rawTitle.slice(titleIndex + 1);
				paramPart = title.replace(verified.match, '').trim() + trailingParamPart;
				rawHook = leadingPart + verified.match;
				_rawHook = leadingPart + '\x01';
			} else {
				// We don't know the insertion point. This block is reached if redundant characters interrupt the title,
				// e.g., title = "#if:", rawTitle = "#<!---->if:", or if the parser skipped indexMap expressions and
				// generated unmatching title and rawTitle, e.g., title = "\n #if: \n", rawTitle = "\n #if: {{{1}}} \n"
				let j = 0; // Pointer for `title`
				let hookEnd = -1; // Track where `verified.match` ends in `rawTitle`
				for (let i = 0; i < rawTitle.length; i++) {
					if (rawTitle[i] === verified.match[j]) {
						j++;
						if (j === verified.match.length) { // Full match found
							hookEnd = i + 1;
							const potentialHookStart = hookEnd - j;
							if (rawTitle.slice(potentialHookStart, hookEnd) === verified.match) {
								_rawHook = rawTitle.slice(0, potentialHookStart) + '\x01';
							}
							break;
						}
					}
				}
				if (hookEnd === -1) {
					// TODO: setTitle might reach here because there's no guarantee that `rawTitle` includes the new title
					console.warn('[Warning] ParsedParserFunction.contructor encountered an unparsable "rawTitle".');
					console.warn({
						title,
						rawTitle,
						hook: verified.match
					});
					throw new Error('Unable to parse rawTitle.');
				}
				paramPart = rawTitle.slice(hookEnd);
				const hook = rawTitle.slice(0, hookEnd);
				rawHook = hook;
				_rawHook = _rawHook || hook;
			}

			const initParams = [paramPart];
			params.forEach(({key, value}) => {
				initParams.push((key ? key + '=' : '') + value);
			});
			super(title, initParams);
			this._initializer = initializer;

			this.rawHook = rawHook;
			this._rawHook = _rawHook;
			this.text = text;
			this.startIndex = startIndex;
			this.endIndex = endIndex;
			this.nestLevel = nestLevel;
			this.skip = skip;

		}

		toTemplate(title: string | Title, verbose = false): ParsedTemplate | null {
			title = typeof title === 'string' ? title : title.getPrefixedDb({colon: true, fragment: true});
			try {
				// @ts-expect-error Calling a protected method
				Template.validateTitle(title);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
			const initializer = mergeDeep(this._initializer);
			initializer.title = title;
			return new ParsedTemplate(initializer);
		}

		override stringify(options: ParsedParserFunctionOutputConfig = {}): string {
			const {rawHook: optRawHook, useCanonical, ...rawOptions} = options;
			let hook = useCanonical ? this.canonicalHook : this.hook;
			if (optRawHook && this._rawHook.includes('\x01')) {
				hook = this._rawHook.replace('\x01', hook);
			}
			return this._stringify(hook, rawOptions);
		}

		override toString() {
			return this.stringify();
		}

		_clone() {
			return new ParsedParserFunction(this._initializer);
		}

	}

	// Check missing members
	type _CheckParsedParserFunctionStatic = ParsedParserFunctionStatic & { new (...args: any[]): ParsedParserFunction };
	const _parsedParserFunctionCheckStatic: _CheckParsedParserFunctionStatic = ParsedParserFunction;
	// const _parsedParserFunctionCheckInstance: ParsedParserFunction = new ParsedParserFunction(Object.create(null));

	return {
		Template: Template as TemplateStatic,
		ParsedTemplate: ParsedTemplate as ParsedTemplateStatic,
		RawTemplate: RawTemplate as RawTemplateStatic,
		ParserFunction: ParserFunction as ParserFunctionStatic,
		ParsedParserFunction: ParsedParserFunction as ParsedParserFunctionStatic
	};

}

/**
 * Object that is used to initialize template parameters in {@link TemplateStatic.constructor}.
 */
export interface NewTemplateParameter {
	/**
	 * The key of the new template parameter. This is automatically trimmed of
	 * leading and trailing whitespace.
	 *
	 * If omitted, a numeric key is internally assigned.
	 */
	key?: string;
	/**
	 * The value of the new template parameter.
	 *
	 * If the parameter has a name (i.e., `key` is set), its value will be trimmed of
	 * leading and trailing whitespace.
	 *
	 * See https://en.wikipedia.org/wiki/Help:Template#Whitespace_handling.
	 */
	value: string
}

/**
 * Object that holds information about a template parameter.
 *
 * This interface is used in:
 * - {@link TemplateBase.params}
 * 	- {@link Template.params}
 * 		- {@link ParsedTemplate.params}
 * 	- {@link RawTemplate.params}
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
	 *
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
	readonly text: string;
	/**
	 * Whether the parameter is unnamed.
	 */
	unnamed: boolean;
	/**
	 * Duplicate, overriden template parameters, if any.
	 */
	duplicates: Omit<TemplateParameter, 'duplicates'>[];
}

/**
 * Defines parameter hierarchies for templates, via {@link TemplateStatic.constructor} or
 * {@link ParseTemplatesConfig.hierarchies}.
 *
 * Some templates, especially those invoking modules, may have nested parameters. For example:
 * `{{#invoke:module|user={{{1|{{{user|}}}}}}}}}` can be transcluded as `{{template|user=value|1=value}}`.
 * In this case, `|1=` and `|user=` refer to the same template parameter, and `|user=` should override `|1=`
 * if both are provided.
 *
 * To specify such hierarchies, use `[['1', 'user'], [...]]`, meaning `|1=` will be overridden by `|user=`
 * whenever a parameter registration detects a lower-hierarchy parameter in the {@link Template} instance.
 */
export type TemplateParameterHierarchies = string[][];

/**
 * Helper interface for {@link TemplateStatic.is}.
 * @private
 */
export interface TemplateTypeMap {
	Template: Template;
	ParsedTemplate: ParsedTemplate;
	RawTemplate: RawTemplate;
	ParserFunction: ParserFunction;
	ParsedParserFunction: ParsedParserFunction;
}

/**
 * Options for {@link Template.stringify}.
 *
 * @template T For {@link Template} and {@link ParsedTemplate}, this is an instance of {@link Title}.
 * For {@link RawTemplate}, this is a string.
 */
export interface TemplateOutputConfig<T> {
	/**
	 * Optional text to add before the template title (e.g., `subst:`).
	 *
	 * If this would end up in a double colon before the template title, it will be
	 * automatically sanitized to a single colon.
	 */
	prepend?: string;
	/**
	 * Optional text to add after the template title.
	 */
	append?: string;
	/**
	 * By default, `stringify()` outputs all numeric keys (e.g., `'1='`), unless they were registered
	 * without an explicit key and were internally assigned numeric keys. However, it is best practice
	 * to explicitly name all keys when registering parameters via {@link Template.insertParam}, to avoid
	 * unintentionally assigning different numeric keys.
	 *
	 * In such cases, you can use this option to suppress specific numeric keys from the output by
	 * providing an array of keys (e.g., `{ suppressKeys: ['1'] }`). The specified keys will be excluded
	 * from the result.
	 *
	 * Note that this option has no effect if a parameter value contains an `'='`. To ensure correct rendering,
	 * `mwbot-ts` will always include the key for such parameters.
	 */
	suppressKeys?: string[];
	/**
	 * Callback function to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort | Array.prototype.sort},
	 * called on an array-cast {@link Template.params} before stringifying the template parameters.
	 *
	 * @param obj1
	 * @param obj2
	 */
	sortPredicate?: (obj1: TemplateParameter, obj2: TemplateParameter) => number;
	/**
	 * A predicate function to determine whether there should be a line break after the title.
	 *
	 * @param title A Title instance for a well-formed template, or a string for an ill-formed template.
	 * @returns `true` to add a trailing line break, or `false` otherwise.
	 */
	brPredicateTitle?: (title: T) => boolean;
	/**
	 * A predicate function to determine whether there should be a line break after each template parameter.
	 *
	 * This predicate is called on every parameter if provided. If {@link sortPredicate} is also provided,
	 * the predicate is evaluated against the reordered array.
	 *
	 * @param param A template parameter object.
	 * @returns `true` to add a trailing line break, or `false` otherwise.
	 */
	brPredicateParam?: (param: TemplateParameter) => boolean;
}

/**
 * Options for {@link ParsedTemplate.stringify}.
 *
 * This interface differs from {@link RawTemplateOutputConfig} in that the argument of
 * {@link brPredicateTitle} is an instance of {@link Title} instead of a string.
 */
export interface ParsedTemplateOutputConfig extends TemplateOutputConfig<Title> {
	/**
	 * Whether to preserve redundant characters surrounding the title, as found in
	 * {@link ParsedTemplate.rawTitle | rawTitle}.
	 *
	 * Where possible, use {@link prepend} and {@link append} instead.
	 *
	 * This option is ignored if such characters interrupt the title itself (e.g., `'F<!---->oo'`).
	 */
	rawTitle?: boolean;
}

/**
 * Options for {@link RawTemplate.stringify}.
 *
 * This interface differs from {@link ParsedTemplateOutputConfig} in that the argument of
 * {@link brPredicateTitle} is a string instead of an instance of {@link Title}.
 */
export interface RawTemplateOutputConfig extends TemplateOutputConfig<string> {
	/**
	 * Whether to preserve redundant characters surrounding the title, as found in
	 * {@link RawTemplate.rawTitle | rawTitle}.
	 *
	 * Where possible, use {@link prepend} and {@link append} instead.
	 *
	 * This option is ignored if such characters interrupt the title itself (e.g., `'F<!---->oo'`).
	 */
	rawTitle?: boolean;
}

/**
 * The initializer object for ParsedTemplate and RawTemplate constructors.
 */
interface ParsedTemplateInitializer {
	title: string;
	rawTitle: string;
	text: string;
	params: NewTemplateParameter[];
	startIndex: number;
	endIndex: number;
	nestLevel: number;
	skip: boolean;
}

/**
 * @internal
 */
export interface ParsedTemplateOptions {
	hierarchies?: Record<string, TemplateParameterHierarchies>;
}

/**
 * The return type of {@link ParserFunctionStatic.verify}.
 */
export interface VerifiedFunctionHook {
	/**
	 * The canonical name of the parser function, including the trailing colon
	 * (e.g., `"#if:"`).
	 *
	 * This usually starts with a hash character (`#`) but may not if the hook
	 * cannot start with it.
	 */
	canonical: string;
	/**
	 * The matched name of the parser function, including the trailing colon.
	 */
	match: string;
}

/**
 * Options for {@link ParserFunction.stringify}.
 */
export interface ParserFunctionOutputConfig {
	/**
	 * Optional text to add before the function hook (e.g., `subst:`).
	 */
	prepend?: string;
	/**
	 * Whether to use the canonical function hook.
	 */
	useCanonical?: boolean;
	/**
	 * Callback function to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort | Array.prototype.sort},
	 * called on a deep copy of {@link ParserFunction.params} (i.e., the original array is not mutated).
	 *
	 * @param param1
	 * @param param2
	 */
	sortPredicate?: (param1: string, param2: string) => number;
	/**
	 * A predicate function to determine whether there should be a line break after each function parameter.
	 *
	 * This predicate is called on every parameter if provided. If {@link sortPredicate} is also provided,
	 * the predicate is evaluated against the reordered array.
	 *
	 * @param param A function parameter string.
	 * @param index The parameter index.
	 * @returns `true` to add a trailing line break, or `false` otherwise.
	 */
	brPredicate?: (param: string, index: number) => boolean;
}

/**
 * Options for {@link ParsedParserFunction.stringify}.
 */
export interface ParsedParserFunctionOutputConfig extends ParserFunctionOutputConfig {
	/**
	 * Whether to preserve redundant characters before the hook, as found in
	 * {@link ParsedParserFunction.rawHook | rawHook}.
	 *
	 * Where possible, use {@link prepend} instead.
	 *
	 * This option is ignored if such characters interrupt the hook itself (e.g., `'#f<!---->oo:'`).
	 */
	rawHook?: boolean;
}