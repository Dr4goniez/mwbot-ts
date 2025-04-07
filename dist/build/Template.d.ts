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
import type { Title } from './Title';
import { ParamBase } from './baseClasses';
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
    new (title: T, params?: NewTemplateParameter[], hierarchies?: TemplateParameterHierarchies): TemplateBase<T>;
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
    insertParam(key: string, value: string, overwrite?: boolean, position?: 'start' | 'end' | {
        before: string;
    } | {
        after: string;
    }): this;
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
    new (title: string | Title, params?: NewTemplateParameter[], hierarchies?: TemplateParameterHierarchies): Template;
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
    'new'(title: string | Title, params?: NewTemplateParameter[], hierarchies?: TemplateParameterHierarchies): Template | null;
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
    new (initializer: ParsedTemplateInitializer, options?: ParsedTemplateOptions): ParsedTemplate;
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
    new (initializer: ParsedTemplateInitializer, options?: ParsedTemplateOptions): RawTemplate;
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
    new (hook: string, params?: string[]): ParserFunction;
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
    new (initializer: ParsedTemplateInitializer): ParsedParserFunction;
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
export {};
//# sourceMappingURL=Template.d.ts.map