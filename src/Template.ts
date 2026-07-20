/**
 * This module serves to parse `{{template}}` markups into object structures.
 *
 * ### Classes:
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
 * @module
 */

import { DeepReadonly, XOR } from 'ts-essentials';
import type { Mwbot } from './Mwbot.js';
import { escapeRegExp, isPlainObject, cloneDeep } from './Util.js';
import type { TitleStatic, Title } from './Title.js';
import { ParamBase } from './internal/ParamBase.js';
import type {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	Wikitext,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	ParseTemplatesConfig,
	ParseResultBase,
} from './Wikitext.js';
import { MwbotError } from './MwbotError.js';
import { createParserFunctionMap } from './internal/parserFunctionData.js';
import { Logger } from './internal/Logger.js';
import { formatTemplateTitle, rawTitlePlaceholder, updateInitializerTitle } from './internal/wikitext/templateHelpers.js';

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
		params?: DeepReadonly<NewTemplateParameter[]>,
		hierarchies?: TemplateParameterHierarchies,
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
	 * Returns the template's title.
	 */
	get title(): T;
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
		position?: 'start' | 'end' | { before: string } | { after: string }
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
 * which is accessible via {@link Mwbot#Template}. Note that `{{#parserfunction:}}` markups
 * are treated differently by the {@link ParserFunctionStatic | ParserFunction} class.
 *
 * @example
 * const foo = new mwbot.Template('Foo');
 * foo.insertParam('', 'bar').insertParam('user', 'baz');
 * foo.stringify(); // {{Foo|bar|user=baz}}
 */
export interface TemplateStatic extends Omit<TemplateBaseStatic<Title>, 'new'> {
	/**
	 * Creates a new instance.
	 *
	 * **Usage**:
	 * ```ts
	 * const template = new mwbot.Template('Template title');
	 * ```
	 *
	 * @param title The title that the template transcludes.
	 *
	 * **NOTE**: Both string titles and `Title` instances are normalized using the same namespace rules.
	 * Titles without a namespace prefix are treated as belonging to the Template namespace unless they
	 * have a leading colon.
	 * @param params Template parameters.
	 * @param hierarchies Optional template parameter hierarchies.
	 * @throws {MwbotError} If title validation fails.
	 */
	new(
		title: string | Title,
		params?: DeepReadonly<NewTemplateParameter[]>,
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
	 *
	 * **NOTE**: Both string titles and `Title` instances are normalized using the same namespace rules.
	 * Titles without a namespace prefix are treated as belonging to the Template namespace unless they
	 * have a leading colon.
	 * @param params Template parameters.
	 * @param hierarchies Optional template parameter hierarchies.
	 * @returns `null` if initialization fails.
	 */
	'new'(
		title: string | Title,
		params?: DeepReadonly<NewTemplateParameter[]>,
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
	 * @throws {MwbotError} If:
	 * * An invalid `type` is provided. (`invalidinput`)
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
	 * @returns A boolean indicating whether the new title was set.
	 */
	setTitle(title: string | Title): boolean;
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
	 * @throws {MwbotError} If title validation fails.
	 * @private
	 */
	new(initializer: ParsedTemplateInitializer, options?: ParsedTemplateOptions): ParsedTemplate;
}

/**
 * The instance members of the `ParsedTemplate` class. For static members,
 * see {@link ParsedTemplateStatic} (defined separately due to TypeScript limitations).
 */
export interface ParsedTemplate extends Template, ParsedTemplateProps<ParsedTemplate> {
	/**
	 * The raw template title, as directly parsed from the first operand of a `{{template|...}}` expression.
	 *
	 * This property is dynamically updated on a successful call of {@link setTitle}.
	 */
	rawTitle: string;

	/**
	 * Converts the instance to a {@link ParsedParserFunction}.
	 *
	 * The use of this method should be limited to when the instance's title represents an unrecognized parser
	 * function hook (e.g., `{{if:1|1|2}}`, where `"if:"` is parsed as part of the template title).
	 *
	 * @param hook The parser function hook to convert this template to, including the trailing colon
	 * (e.g., `"#if:"`; see also {@link ParserFunctionStatic.verify}).
	 *
	 * The existing template parameters become the parser function parameters.
	 *
	 * @returns A new {@link ParsedParserFunction} instance on success; otherwise, `null`.
	 */
	toParserFunction(hook: string): ParsedParserFunction | null;
	/**
	 * @inheritdoc
	 */
	stringify(options?: ParsedTemplateOutputConfig): string;
	/**
	 * @inheritdoc
	 */
	toString(): string;
}

export interface ParsedTemplatePropsBase {
	/**
	 * The original text of the double-braced markup parsed from the wikitext.
	 * The value of this property is static.
	 */
	text: string;
	/**
	 * The nesting level of this double-braced markup. `0` if not nested within another double-braced expression.
	 */
	nestLevel: number;
}

export interface ParsedTemplateProps<CLS> extends ParsedTemplatePropsBase, ParseResultBase {
	/**
	 * @hidden
	 */
	_clone(options?: ParsedTemplateOptions): CLS;
	/**
	 * @hidden
	 */
	_setInitializer(obj: Partial<ParsedTemplateMutableInitializer>): CLS;
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
export interface RawTemplate extends TemplateBase<string>, ParsedTemplateProps<RawTemplate> {
	/**
	 * The raw template title, as directly parsed from the first operand of a `{{template|...}}` expression.
	 *
	 * This property is dynamically updated when {@link setTitle} is called.
	 */
	rawTitle: string;

	/**
	 * Sets a new title to the instance.
	 *
	 * This method updates the {@link RawTemplate.title | title} and {@link RawTemplate.rawTitle | rawTitle}
	 * properties of the instance. If the new title is an unambiguously valid title for MediaWiki, use
	 * {@link toTemplate} or {@link toParserFunction} instead.
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
	 * @returns A new {@link ParsedTemplate} instance on success; otherwise, `null`.
	 */
	toTemplate(title: string | Title): ParsedTemplate | null;
	/**
	 * Sets a valid function hook and converts the instance to a new {@link ParsedParserFunction} instance.
	 *
	 * @param hook The parser function hook to convert this template to, including the trailing colon
	 * (e.g., `"#if:"`; see also {@link ParserFunctionStatic.verify}).
	 *
	 * The existing template parameters become the parser function parameters.
	 *
	 * @returns A new {@link ParsedParserFunction} instance on success; otherwise, `null`.
	 */
	toParserFunction(hook: string): ParsedParserFunction | null;
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
}

/**
 * This interface defines the static members of the `ParserFunction` class. For instance members,
 * see {@link ParserFunction} (defined separately due to TypeScript limitations).
 *
 * `ParserFunction` is a class that serves to parse `{{#func:}}` markups into an object structure,
 * which is accessible via {@link Mwbot#ParserFunction}. Note that `{{template}}` markups
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
	 * @throws {MwbotError} If hook validation fails.
	 */
	new(hook: string, params?: ReadonlyArray<string>): ParserFunction;
	/**
	 * Verifies the given string as a parser function hook.
	 *
	 * **Usage**:
	 * ```ts
	 * const verifiedHook = mwbot.ParserFunction.verify('#hook:');
	 * ```
	 *
	 * @param hook A potential parser function hook as a string. This **must** end with a colon character.
	 * @returns An object containing the canonical function hook and the exact matched function hook,
	 * or `null` if the hook is invalid.
	 */
	verify(hook: string): VerifiedFunctionHook | null;
}

/**
 * The instance members of the `ParserFunction` class. For static members,
 * see {@link ParserFunctionStatic} (defined separately due to TypeScript limitations).
 */
export interface ParserFunction extends InstanceType<typeof ParamBase> {
	/**
	 * Returns the matched parser function hook, including a trailing colon.
	 *
	 * Unlike {@link canonicalHook}, this preserves the matched text.
	 */
	get hook(): string;
	/**
	 * Returns the canonical parser function hook, including a trailing colon.
	 */
	get canonicalHook(): string;

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
export interface ParsedParserFunction extends ParserFunction, ParsedTemplateProps<ParsedParserFunction> {
	/**
	 * The raw parser function hook, as directly parsed from the wikitext.
	 *
	 * This property is dynamically updated on a successful call of {@link setHook}.
	 */
	rawHook: string;

	/**
	 * Converts the instance to a {@link ParsedTemplate}.
	 *
	 * The conversion is based on the data used to initialize this instance, and any modifications
	 * made after initialization will be discarded. Therefore, this method should be called before
	 * making any changes to the instance properties.
	 *
	 * @param title The new template title to set.
	 * @returns A new {@link ParsedTemplate} instance on success; otherwise, `null`.
	 */
	toTemplate(title: string | Title): ParsedTemplate | null;
	/**
	 * @inheritdoc
	 */
	stringify(options?: ParsedParserFunctionOutputConfig): string;
	/**
	 * @inheritdoc
	 */
	toString(): string;
}

/**
 * @internal
 */
export function TemplateFactory(
	config: Mwbot['config'],
	info: Mwbot['_info'],
	Title: TitleStatic,
	logger: Logger
) {

	const namespaceIds = config.get('wgNamespaceIds');
	const NS_MAIN = namespaceIds[''];
	const NS_TEMPLATE = namespaceIds.template;
	const parserFunctionMap = createParserFunctionMap(info, Title);

	class TemplateBase<T extends string | Title> implements TemplateBase<T> {

		protected _title: T;

		get title(): T {
			return this._title;
		}

		readonly params: Record<string, TemplateParameter>;
		/**
		 * The order of parameter registration.
		 */
		protected _paramOrder: Set<string>;
		/**
		 * Template parameter hierarchies as a Map.
		 */
		protected _hierarchyMap: Map<string, { hierarchy: ReadonlyArray<string>; index: number }>;

		constructor(
			title: T,
			params: DeepReadonly<NewTemplateParameter[]> = [],
			hierarchies: TemplateParameterHierarchies = []
		) {
			this._title = title;
			this.params = Object.create(null);
			this._paramOrder = new Set();
			this._hierarchyMap = new Map();

			for (const hierarchy of hierarchies) {
				for (const [index, key] of hierarchy.entries()) {
					if (this._hierarchyMap.has(key)) {
						// TODO: Throw if a key belongs to multiple hierarchies
						continue;
					}
					this._hierarchyMap.set(key, { hierarchy, index });
				}
			}

			// Register parameters
			params.forEach(({ key, value }) => {
				this.registerParam(key || '', value, { overwrite: true, position: 'end', listDuplicates: true });
			});
		}

		/**
		 * Validates the given title as a template title and returns a Title instance.
		 *
		 * @param title The title to validate as a template title.
		 * @param asHook Whether to validate the title as a function hook.
		 * @returns
		 * @throws {MwbotError} If:
		 * * `title` is neither a string nor a Title instance. (`typemismatch`)
		 * * `title` is a function hook rather than a template title. (`invalidinput`)
		 * * The provided title is interwiki and cannot be transcluded. (`invalidtitle`)
		 */
		protected static validateTitle(title: string | Title): Title {
			if (typeof title !== 'string' && !(title instanceof Title)) {
				throw new MwbotError(
					'fatal',
					{
						code: 'typemismatch',
						info: `"title" must be either a string or a Title instance.`,
					},
					{ title }
				);
			}

			// TODO: Handle "/" (subpage) and "#" (in-page section)?
			const normalizedTitle = typeof title === 'string'
				? Title.clean(title.replace(/_/g, ' '))
				: title.getPrefixedDb({
					colon: true,
					fragment: true,
					interwiki: true,
				});

			if (ParserFunction.verify(normalizedTitle)) {
				// In transclusion markup (e.g. "{{title}}"), MediaWiki interprets parser
				// function hooks before template titles. Therefore, titles that are valid
				// function hooks cannot refer to templates.
				throw new MwbotError('fatal', {
					code: 'invalidinput',
					info: `"${normalizedTitle}" is a function hook and cannot be used as a template title.`,
				});
			}

			const namespace = normalizedTitle.startsWith(':')
				? NS_MAIN
				: NS_TEMPLATE;
			title = new Title(normalizedTitle, namespace);

			if (title.isExternal() && !title.isTrans()) {
				throw new MwbotError(
					'fatal',
					{
						code: 'invalidtitle',
						info: `The provided title is interwiki and cannot be transcluded.`,
					},
					{ title }
				);
			}

			return title;
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
				 * - `{ before: string }`: insert before the parameter with the given key,
				 * - `{ after: string }`: insert after the parameter with the given key.
				 */
				position?: 'start' | 'end' | { before: string } | { after: string };
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

			const { overwrite, position, listDuplicates = false } = options;
			const rel = this.checkKeyOverride(key);
			const existing = rel !== null || key in this.params;

			// Early exit conditions:
			// 1. If the key already exists and overwrite is not allowed.
			// 2. If the key doesn't exist and overwrite is required ('must').
			if ((existing && !overwrite) || (!existing && overwrite === 'must')) {
				return this;
			}

			const order = Array.from(this._paramOrder);

			// Handle a brand new parameter
			if (!existing) {
				this.params[key] = this.createParam(key, value, unnamed, []);

				// Update the insertion order with respect to the position
				this.insertIntoOrder(order, key, position);
				this._paramOrder = new Set(order);

				return this;
			}

			// Handle updates to an existing key
			if (rel?.overrides || key in this.params) {
				// The input key overrides another key (i.e., an alias), or it exists directly

				const targetKey = rel?.overrides ?? key;
				const { duplicates, ...previousParam } = this.params[targetKey];
				if (listDuplicates) {
					// If duplicate tracking is enabled, save the previous param state
					duplicates.push(previousParam);
				}
				delete this.params[targetKey]; // Remove the old parameter before replacing

				// Remove the target from current order before reinserting
				const targetKeyIndex = order.indexOf(targetKey);
				order.splice(targetKeyIndex, 1);

				this.insertIntoOrder(
					order,
					key,
					position,
					targetKeyIndex,
					[targetKey, key]
				);

				this.params[key] = this.createParam(key, value, unnamed, duplicates);
				this._paramOrder = new Set(order);
			} else if (rel?.overridden) {
				// The input key is overridden by an existing parameter

				if (listDuplicates) {
					this.params[rel.overridden].duplicates.push(
						this.createParam(key, value, unnamed, null)
					);
				}
				// Do not modify existing parameter or reorder
			}

			return this;
		}

		/**
		 * Find the first available numeric key for a template parameter.
		 * @returns A string-cast numeric key.
		 */
		protected findNumericKey(): string {
			const numericKeys = new Set<number>();
			for (const key in this.params) {
				if (/^[1-9]\d*$/.test(key)) {
					numericKeys.add(Number(key));
				}
			}

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
		 * - `{ overrides: string }` if the input key overrides an existing key.
		 * - `{ overridden: string }` if the input key is overridden by an existing key.
		 * - `null` if no override relationship exists.
		 *
		 * The returned key will always be different from the input key.
		 */
		protected checkKeyOverride(key: string): XOR<{ overrides: string }, { overridden: string }> | null {
			const info = this._hierarchyMap.get(key);
			if (!info) {
				return null;
			}

			const { hierarchy, index } = info;

			for (const [i, candidate] of hierarchy.entries()) {
				if (candidate === key || !(candidate in this.params)) {
					continue;
				}

				return index > i
					? { overrides: candidate } // Input key overrides an existing key
					: { overridden: candidate }; // Input key is overridden by an existing key
			}

			return null;
		}

		/**
		 * Creates a template parameter object.
		 */
		protected createParam(
			key: string,
			value: string,
			unnamed: boolean,
			duplicates: Omit<TemplateParameter, 'duplicates'>[]
		): TemplateParameter;
		/**
		 * Creates a duplicate template parameter object.
		 */
		protected createParam(
			key: string,
			value: string,
			unnamed: boolean,
			duplicates: null
		): Omit<TemplateParameter, 'duplicates'>;
		protected createParam(
			key: string,
			value: string,
			unnamed: boolean,
			duplicates: Omit<TemplateParameter, 'duplicates'>[] | null
		): TemplateParameter | Omit<TemplateParameter, 'duplicates'> {
			const ret: Partial<TemplateParameter> = {
				key,
				value,
				get text() {
					return '|' + (!this.unnamed ? this.key + '=' : '') + this.value;
				},
				unnamed,
			};
			if (duplicates) {
				ret.duplicates = duplicates;
				return ret as TemplateParameter;
			} else {
				return ret as Omit<TemplateParameter, 'duplicates'>;
			}
		}

		/**
		 * Inserts a parameter key into the given order array according to the specified position.
		 *
		 * If `position` references another parameter, hierarchy aliases are resolved automatically via
		 * {@link findReferenceIndex}. When the reference cannot be resolved, the key is appended to the end.
		 *
		 * @param order The current parameter order.
		 * @param key The parameter key to insert.
		 * @param position The requested insertion position.
		 * @param defaultIndex The index to use when `position` is `undefined`. This is typically the
		 * original index of an existing parameter being updated.
		 * @param selfReferenceKeys Parameter keys that should be treated as self-references when specified
		 * as `before`/`after` targets. In such cases, the key is inserted at `defaultIndex` instead of being
		 * moved relative to itself.
		 */
		protected insertIntoOrder(
			order: string[],
			key: string,
			position?: 'start' | 'end' | { before: string } | { after: string },
			defaultIndex?: number,
			selfReferenceKeys?: string[]
		): void {
			if (isPlainObject(position)) {
				const isBefore = 'before' in position;
				const refKey = isBefore ? position.before : position.after;

				if (typeof refKey === 'string') {
					if (selfReferenceKeys?.includes(refKey)) {
						// Preserve the original position for self-references
						order.splice(defaultIndex ?? order.length, 0, key);
						return;
					}

					const refIndex = this.findReferenceIndex(order, refKey);
					if (refIndex !== -1) {
						order.splice(isBefore ? refIndex : refIndex + 1, 0, key);
						return;
					}
				}

				order.push(key);
				return;
			}

			if (position === 'start') {
				order.unshift(key);
			} else if (position === 'end') {
				order.push(key);
			} else if (defaultIndex !== undefined) {
				// Preserve the original index if `position` is undefined and `defaultIndex` is specified
				order.splice(defaultIndex, 0, key);
			} else {
				// Fall back to `position === 'end'`
				order.push(key);
			}
		}

		/**
		 * Finds the index of a parameter in the given order array.
		 *
		 * If `key` itself is not present, this method also checks whether it overrides
		 * or is overridden by a registered key via the configured parameter hierarchies.
		 *
		 * @param order The current parameter order (an array-cast {@link _paramOrder}).
		 * @param key The reference parameter key.
		 * @returns The resolved index, or `-1` if no matching parameter exists.
		 */
		protected findReferenceIndex(order: string[], key: string): number {
			let index = order.indexOf(key);
			if (index !== -1) {
				return index;
			}

			const rel = this.checkKeyOverride(key);
			if (rel?.overrides) {
				index = order.indexOf(rel.overrides);
				if (index !== -1) {
					return index;
				}
			}
			if (rel?.overridden) {
				index = order.indexOf(rel.overridden);
				if (index !== -1) {
					return index;
				}
			}

			return -1;
		}

		insertParam(
			key: string,
			value: string,
			overwrite?: boolean,
			position?: 'start' | 'end' | { before: string } | { after: string }
		): this {
			return this.registerParam(key, value, { overwrite: overwrite ?? true, position });
		}

		updateParam(key: string, value: string): this {
			return this.registerParam(key, value, { overwrite: 'must' });
		}

		getParam(key: string, resolveHierarchy = false): TemplateParameter | null {
			const hierInfo = resolveHierarchy && this._hierarchyMap.get(key);
			if (hierInfo) {
				const hier = hierInfo.hierarchy;
				for (let i = hier.length - 1; i >= 0; i--) {
					if (hier[i] in this.params) {
						return this.params[hier[i]];
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
				(
					typeof keyOrPred !== 'string' &&
					!(keyOrPred instanceof RegExp) &&
					typeof keyOrPred !== 'function'
				) ||
				keyOrPred === ''
			) {
				return false;
			}

			// If `keyOrPred` is a function, check against each param
			if (typeof keyOrPred === 'function') {
				return Object.values(this.params).some((obj) => keyOrPred(cloneDeep(obj)));
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
				const rel = this.checkKeyOverride(key);
				if (rel) {
					if (rel.overrides) {
						key = rel.overrides;
					} else if (rel.overridden) {
						key = rel.overridden;
					}
				}
			}
			if (!this.params[key]) {
				return false;
			}
			delete this.params[key];
			this._paramOrder.delete(key);
			return true;
		}

		/**
		 * Internal stringification handler.
		 * @param title The template title. This must be formatted to a string.
		 * @param options
		 * @returns
		 */
		protected _stringify(title: string, options: TemplateOutputConfig<T>): string {

			const order = Array.from(this._paramOrder);
			const {
				append,
				sortPredicate = (param1, param2) => order.indexOf(param1.key) - order.indexOf(param2.key),
				brPredicateTitle = () => false,
				brPredicateParam = () => false,
			} = options;
			const suppressKeys = new Set(
				(options.suppressKeys || []).filter((key) => /^[1-9]\d*$/.test(key))
			);
			let { prepend } = options;
			const ret = ['{{'];

			// Process the title part
			if (typeof prepend === 'string') {
				const hasLeadingColon = typeof this._title === 'string'
					? this._title.startsWith(':')
					: this._title.hadLeadingColon();
				prepend = hasLeadingColon ? prepend.replace(/:$/, '') : prepend;
				ret.push(prepend);
			}
			ret.push(title);
			if (typeof append === 'string') {
				ret.push(append);
			}
			if (brPredicateTitle(this._title)) {
				ret.push('\n');
			}

			// Process params
			for (const param of Object.values(this.params).sort(sortPredicate)) {
				const { key, value, unnamed } = param;
				let noKey = unnamed;
				if (value.includes('=')) {
					// Always show key if value contains '='
					noKey = false;
				} else if (suppressKeys.has(key)) {
					// Suppress key if it's in the list
					noKey = true;
				}
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
			params: DeepReadonly<NewTemplateParameter[]> = [],
			hierarchies?: TemplateParameterHierarchies
		) {
			title = Template.validateTitle(title);
			super(title, params, hierarchies);
		}

		static new(
			title: string | Title,
			params: DeepReadonly<NewTemplateParameter[]> = [],
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
					throw new MwbotError('fatal', {
						code: 'invalidinput',
						info: `"${type}" is not a valid input to Template.is().`,
					});
			}
		}

		setTitle(title: string | Title): boolean {
			try {
				this._title = Template.validateTitle(title);
				return true;
			} catch (err) {
				logger.error(err as MwbotError);
				return false;
			}
		}

		stringify(options: TemplateOutputConfig<Title> = {}): string {
			return this._stringify(
				formatTemplateTitle(this._title, NS_TEMPLATE),
				options
			);
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

		// ParsedTemplate
		declare rawTitle: string;

		// ParsedTemplatePropsBase
		declare text: string;
		declare nestLevel: number;

		// ParseResultBase
		declare startIndex: number;
		declare endIndex: number;
		declare skip: boolean;
		declare index: number;
		declare parent: number | null;
		declare children: ReadonlySet<number>;

		// internal
		/**
		 * @hidden
		 */
		#initializer: ParsedTemplateInitializer;

		constructor(initializer: ParsedTemplateInitializer, options: ParsedTemplateOptions = {}) {
			const {
				title,
				rawTitleTemplate: _rawTitleTemplate, // Exclude from the instance properties
				isTitleAltered: _isTitleAltered,
				params,
				...parsedProps
			} = initializer;

			const t = Template.validateTitle(title);
			const titleStr = t.getPrefixedDb();

			super(t, params, options.hierarchies?.[titleStr]);

			this.#initializer = cloneDeep(initializer);
			Object.assign(this, cloneDeep(parsedProps));
		}

		override setTitle(title: string | Title): boolean {
			const success = super.setTitle(title);
			if (success) {
				updateInitializerTitle(
					this.#initializer,
					formatTemplateTitle(this._title, NS_TEMPLATE)
				);
				this.rawTitle = this.#initializer.rawTitle;
			}
			return success;
		}

		toParserFunction(hook: string): ParsedParserFunction | null {
			// Keep this in sync with RawTemplate#toParserFunction
			try {
				const initializer = cloneDeep(this.#initializer);
				updateInitializerTitle(initializer, hook.replace(/([:：]).*$/, '$1'));
				return new ParsedParserFunction(initializer);
			} catch (err) {
				logger.error(err as MwbotError);
				return null;
			}
		}

		override stringify(options: ParsedTemplateOutputConfig = {}): string {
			const { rawTitle: optRawTitle, ...rawOptions } = options;

			let title = formatTemplateTitle(this._title, NS_TEMPLATE);
			if (optRawTitle) {
				title = this.#initializer.isTitleAltered
					? this.#initializer.rawTitleTemplate.replace(rawTitlePlaceholder, title)
					: this.rawTitle;
			}

			return this._stringify(title, rawOptions);
		}

		override toString() {
			return this.stringify();
		}

		_clone(options: ParsedTemplateOptions = {}) {
			return new ParsedTemplate(this.#initializer, options);
		}

		_setInitializer<T extends ParsedTemplateMutableInitializer>(obj: Partial<T>): this {
			for (const key in obj) {
				if (obj[key] !== undefined) {
					(this.#initializer as any)[key] = cloneDeep(obj[key]);
				}
			}
			return this;
		}
	}

	// Check missing members
	type _CheckParsedTemplateStatic = ParsedTemplateStatic & { new (...args: any[]): ParsedTemplate };
	const _parsedTemplateCheckStatic: _CheckParsedTemplateStatic = ParsedTemplate;
	// const _parsedTemplateCheckInstance: ParsedTemplate = new ParsedTemplate(Object.create(null));

	class RawTemplate extends TemplateBase<string> implements RawTemplate {

		// RawTemplate
		declare rawTitle: string;

		// ParsedTemplatePropsBase
		declare text: string;
		declare nestLevel: number;

		// ParseResultBase
		declare startIndex: number;
		declare endIndex: number;
		declare skip: boolean;
		declare index: number;
		declare parent: number | null;
		declare children: ReadonlySet<number>;

		// internal
		/**
		 * @hidden
		 */
		#initializer: ParsedTemplateInitializer;

		constructor(initializer: ParsedTemplateInitializer, options: ParsedTemplateOptions = {}) {
			const {
				title,
				rawTitleTemplate: _rawTitleTemplate, // Exclude from the instance properties
				isTitleAltered: _isTitleAltered,
				params,
				...parsedProps
			} = initializer;

			super(title, params, options.hierarchies?.[title]);

			this.#initializer = cloneDeep(initializer);
			Object.assign(this, cloneDeep(parsedProps));
		}

		setTitle(title: string): this {
			this._title = title;
			updateInitializerTitle(this.#initializer, title);
			this.rawTitle = this.#initializer.rawTitleTemplate.replace(rawTitlePlaceholder, title);
			return this;
		}

		toTemplate(title: string | Title): ParsedTemplate | null {
			try {
				title = Template.validateTitle(title);
			} catch (err) {
				logger.error(err as MwbotError);
				return null;
			}
			const initializer = cloneDeep(this.#initializer);
			updateInitializerTitle(
				initializer,
				formatTemplateTitle(title, NS_TEMPLATE)
			);
			return new ParsedTemplate(initializer);
		}

		toParserFunction(hook: string): ParsedParserFunction | null {
			// Keep this in sync with ParsedTemplate#toParserFunction
			try {
				const initializer = cloneDeep(this.#initializer);
				updateInitializerTitle(initializer, hook.replace(/([:：]).*$/, '$1'));
				return new ParsedParserFunction(initializer);
			} catch (err) {
				logger.error(err as MwbotError);
				return null;
			}
		}

		stringify(options: RawTemplateOutputConfig = {}): string {
			const { rawTitle: optRawTitle, ...rawOptions } = options;

			let title = this._title;
			if (optRawTitle) {
				title = this.#initializer.isTitleAltered
					? this.#initializer.rawTitleTemplate.replace(rawTitlePlaceholder, title)
					: this.rawTitle;
			}

			return this._stringify(title, rawOptions);
		}

		override toString() {
			return this.stringify();
		}

		_clone(options: ParsedTemplateOptions = {}) {
			return new RawTemplate(this.#initializer, options);
		}

		_setInitializer<T extends ParsedTemplateMutableInitializer>(obj: Partial<T>): this {
			for (const key in obj) {
				if (obj[key] !== undefined) {
					(this.#initializer as any)[key] = cloneDeep(obj[key]);
				}
			}
			return this;
		}
	}

	// Check missing members
	type _CheckRawTemplateStatic = RawTemplateStatic & { new (...args: any[]): RawTemplate };
	const _rawTemplateCheckStatic: _CheckRawTemplateStatic = RawTemplate;
	// const _rawTemplateCheckInstance: RawTemplate = new RawTemplate(Object.create(null));

	class ParserFunction extends ParamBase implements ParserFunction {

		protected _verifiedHook: VerifiedFunctionHook;

		get hook(): string {
			return this._verifiedHook.match;
		}

		get canonicalHook(): string {
			return this._verifiedHook.canonical;
		}

		constructor(hook: string, params: ReadonlyArray<string> = []) {
			const verified = ParserFunction.verify(hook);
			if (!verified) {
				throw new MwbotError('fatal', {
					code: 'invalidinput',
					info: `"${hook}" is not a valid function hook.`,
				});
			}
			super(params);
			this._verifiedHook = verified;
		}

		static verify(hook: string): VerifiedFunctionHook | null {
			// Whitespace characters are illegal in a function hook, i.e. "#if:" is fine but not "# if:" or "#if :"
			const m = /^#?[^:：\s]+[:：]/.exec(hook.trim());
			if (!m) {
				return null;
			}

			const match = m[0];
			if (parserFunctionMap[match]) {
				return {
					canonical: match,
					match,
				};
			}

			for (const [canonical, regex] of Object.entries(parserFunctionMap)) {
				if (regex.test(match)) {
					return {
						canonical,
						match,
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
			this._verifiedHook = verified;
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
			const { prepend = '', sortPredicate, brPredicate } = options;
			const ret = [
				'{{',
				prepend,
				hook,
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

		// ParsedParserFunction
		rawHook: string;

		// ParsedTemplatePropsBase
		declare text: string;
		declare nestLevel: number;

		// ParseResultBase
		declare startIndex: number;
		declare endIndex: number;
		declare skip: boolean;
		declare index: number;
		declare parent: number | null;
		declare children: ReadonlySet<number>;

		// internal
		/**
		 * @hidden
		 */
		#initializer: ParsedTemplateInitializer;

		constructor(initializer: ParsedTemplateInitializer) {
			const {
				// For parser functions, `title` and `rawTitle` correspond to the hook
				title,
				rawTitle,
				rawTitleTemplate: _rawTitleTemplate, // Exclude from the instance properties
				isTitleAltered: _isTitleAltered,
				params,
				...parsedProps
			} = initializer;

			super(title, params.map((p) => p.value));

			this.rawHook = rawTitle;
			this.#initializer = cloneDeep(initializer);
			Object.assign(this, cloneDeep(parsedProps));
		}

		override setHook(hook: string): boolean {
			const success = super.setHook(hook);
			if (success) {
				updateInitializerTitle(this.#initializer, this._verifiedHook.match);
				this.rawHook = this.#initializer.rawTitle;
			}
			return success;
		}

		toTemplate(title: string | Title): ParsedTemplate | null {
			try {
				// @ts-expect-error Calling a protected method
				title = Template.validateTitle(title);
			} catch (err) {
				logger.error(err as MwbotError);
				return null;
			}
			const initializer = cloneDeep(this.#initializer);
			updateInitializerTitle(
				initializer,
				formatTemplateTitle(title, NS_TEMPLATE)
			);
			return new ParsedTemplate(initializer);
		}

		override stringify(options: ParsedParserFunctionOutputConfig = {}): string {
			const { rawHook: optRawHook, useCanonical, ...rawOptions } = options;

			let hook = useCanonical ? this.canonicalHook : this.hook;
			if (optRawHook) {
				hook = this.#initializer.isTitleAltered
					? this.#initializer.rawTitleTemplate.replace(rawTitlePlaceholder, hook)
					: this.rawHook;
			}

			return this._stringify(hook, rawOptions);
		}

		override toString() {
			return this.stringify();
		}

		_clone() {
			return new ParsedParserFunction(this.#initializer);
		}

		_setInitializer<T extends ParsedTemplateMutableInitializer>(obj: Partial<T>): this {
			for (const key in obj) {
				if (obj[key] !== undefined) {
					(this.#initializer as any)[key] = cloneDeep(obj[key]);
				}
			}
			return this;
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
		ParsedParserFunction: ParsedParserFunction as ParsedParserFunctionStatic,
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
	value: string;
}

/**
 * Object that holds information about a template parameter.
 *
 * This interface is used in:
 * - {@link TemplateBase.params}
 *   - {@link Template.params}
 *     - {@link ParsedTemplate.params}
 *   - {@link RawTemplate.params}
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
	get text(): string;
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
 *
 * Note that if a key appears in multiple hierarchy arrays, only the first occurrence is used and
 * subsequent occurrences are ignored.
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
	 * Whether to preserve the raw formatting surrounding the title, as found in
	 * {@link ParsedTemplate.rawTitle | rawTitle}.
	 *
	 * This preserves leading and trailing whitespace, bidirectional formatting characters,
	 * and HTML comments where possible. HTML comments that interrupt the title itself
	 * (e.g., `'F<!---->oo'`) cannot be preserved after the title is modified.
	 *
	 * Where possible, use {@link prepend} and/or {@link append} instead.
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
	 * Whether to preserve the raw formatting surrounding the title, as found in
	 * {@link RawTemplate.rawTitle | rawTitle}.
	 *
	 * This preserves leading and trailing whitespace, bidirectional formatting characters,
	 * and HTML comments where possible. HTML comments that interrupt the title itself
	 * (e.g., `'F<!---->oo'`) cannot be preserved after the title is modified.
	 *
	 * Where possible, use {@link prepend} and/or {@link append} instead.
	 */
	rawTitle?: boolean;
}

/**
 * The initializer object for ParsedTemplate, ParsedParserFunction and RawTemplate constructors.
 * @internal
 */
export interface ParsedTemplateInitializer extends ParsedTemplatePropsBase, ParseResultBase {
	title: string;
	rawTitle: string;
	/**
	 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
	 */
	rawTitleTemplate: string;
	isTitleAltered?: boolean;
	params: DeepReadonly<NewTemplateParameter[]>;
}

type ParsedTemplateMutableInitializer = Pick<
	ParsedTemplateInitializer,
	| 'index'
	| 'parent'
	| 'children'
>;

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
	 * The exact function hook matched from the input, including the trailing colon.
	 *
	 * Unlike {@link canonical}, this preserves the matched text instead of
	 * normalizing it to the canonical function hook.
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
	 * Whether to preserve the raw formatting preceding the parser-function hook, as found in
	 * {@link ParsedParserFunction.rawHook | rawHook}.
	 *
	 * This preserves leading whitespace, bidirectional formatting characters,
	 * and HTML comments where possible. HTML comments that interrupt the hook itself
	 * (e.g., `'#f<!---->oo:'`) cannot be preserved after the hook is modified.
	 *
	 * Where possible, use {@link prepend} instead.
	 */
	rawHook?: boolean;
}
