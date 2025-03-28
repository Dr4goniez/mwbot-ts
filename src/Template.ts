/**
 * This module serves to parse `{{template}}` expressions into object structures.
 *
 * - Class {@link Template}: Attached to {@link Mwbot.Template} as an instance member.
 * - Class {@link ParsedTemplate}: Represents a well-formed template in the result of
 * {@link Mwbot.Wikitext.parseTemplates | Wikitext.parseTemplates}.
 * - Class {@link RawTemplate}: Represents a malformed template in the result of
 * {@link Mwbot.Wikitext.parseTemplates | Wikitext.parseTemplates}.
 * - Class {@link ParserFunction}: Attached to {@link Mwbot.ParserFunction} as an instance
 * member.
 * - Class {@link ParsedParserFunction}: Represents a parser function in the result of
 * {@link Mwbot.Wikitext.parseTemplates | Wikitext.parseTemplates}.
 *
 * @module
 */

import { XOR } from 'ts-xor';
import type { Mwbot } from './Mwbot';
import { escapeRegExp, mergeDeep } from './Util';
import type { Title } from './Title';
import { ParamBase } from './baseClasses';

// Imported only for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { WikitextOptions } from './Wikitext';

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
	// variables defined in CoreMagicVariables.  The no-args form will
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
 * @internal
 */
export function TemplateFactory(config: Mwbot['config'], info: Mwbot['_info'], Title: Title) {

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

	/**
	 * @internal
	 */
	abstract class TemplateBase<T extends string | InstanceType<Title>> {

		/**
		 * The template's title.
		 *
		 * This property is read-only. To update it, use {@link setTitle}.
		 */
		readonly title: T;
		/**
		 * The template's parameters.
		 *
		 * This property is read-only. To update it, use {@link addParam}, {@link setParam},
		 * or {@link deleteParam} as per your needs.
		 */
		readonly params: Record<string, TemplateParameter>;
		/**
		 * The order of parameter registration.
		 */
		protected paramOrder: Set<string>;
		/**
		 * Template parameter hierarchies.
		 */
		protected hierarchies: TemplateParameterHierarchies;

		/**
		 * Creates a new instance.
		 *
		 * @param title The title that the template transcludes.
		 * @param params Template parameters.
		 * @param hierarchies Optional template parameter hierarchies.
		 */
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
				this.registerParam(key || '', value, {overwrite: true, append: true, listDuplicates: true});
			});

		}

		/**
		 * Validates the given title as a template title and returns a Title instance. The title must not be
		 * a parser function hook. On failure, this method throws an error.
		 *
		 * @param title The (prefixed) title to validate as a template title.
		 * @param asHook Whether to validate the title as a function hook.
		 * @returns
		 */
		protected static validateTitle(title: string | InstanceType<Title>, asHook?: false): InstanceType<Title>;
		/**
		 * Validates the given title as a function hook and returns a verified hook object. On failure, this method
		 * throws an error.
		 *
		 * @param title The (prefixed) title to validate as a function hook.
		 * @param asHook Whether to validate the title as a function hook.
		 * @returns
		 */
		protected static validateTitle(title: string | InstanceType<Title>, asHook: true): VerifiedFunctionHook;
		protected static validateTitle(title: string | InstanceType<Title>, asHook = false): InstanceType<Title> | VerifiedFunctionHook {
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
		 */
		protected registerParam(
			key: string,
			value: string,
			options: {
				/**
				 * Whether to overwrite existing parameters. If `false`, the new parameter is not registered
				 * if there is an existing parameter with the same `key`.
				 */
				overwrite: boolean;
				/**
				 * Whether to append the new parameter to the end of the list if there is an existing parameter
				 * with the same `key`. If `false`, the existing parameter value is replaced without changing
				 * its position in the list.
				 */
				append: boolean;
				/**
				 * Whether to list duplicate parameters. This option is for the constructor.
				 */
				listDuplicates?: true;
			}
		): this {

			key = key.trim();
			const unnamed = key === '';
			if (unnamed) {
				key = this.findNumericKey();
			} else {
				value = value.trim();
			}

			const {overwrite, append, listDuplicates = false} = options;
			const overrideStatus = this.checkKeyOverride(key);
			const existing = overrideStatus !== null || key in this.params;

			// If the key already exists but overwriting is disabled, do nothing
			if (existing && !overwrite) {
				return this;
			}

			if (existing) {
				if (overrideStatus) {
					if ('overrides' in overrideStatus) {
						// The input key overrides an already registered key
						const overriddenKey = overrideStatus.overrides as string;
						const {duplicates, ...rest} = this.params[overriddenKey];
						if (listDuplicates) {
							duplicates.push(rest);
						}
						delete this.params[overriddenKey];
						if (append) {
							this.paramOrder.delete(overriddenKey);
							this.paramOrder.add(key);
						} else {
							const orders = [...this.paramOrder];
							orders.splice(orders.indexOf(overriddenKey), 1, key);
							this.paramOrder = new Set(orders);
						}
						this.params[key] = this.createParam(key, value, unnamed, duplicates);
					} else {
						// The input key is overridden by an already registered key
						if (listDuplicates) {
							this.params[overrideStatus.overridden].duplicates.push(
								this.createParam(key, value, unnamed, null)
							);
						}
					}
				} else {
					// The input key is already registered
					const {duplicates, ...rest} = this.params[key];
					if (listDuplicates) {
						duplicates.push(rest);
					}
					if (append) {
						this.paramOrder.delete(key);
						this.paramOrder.add(key);
					}
					this.params[key] = this.createParam(key, value, unnamed, duplicates);
				}
			} else {
				// Register a new parameter
				this.params[key] = this.createParam(key, value, unnamed, []);
			}

			return this;

		}

		/**
		 * Adds a template parameter to the end of the list.
		 *
		 * If a parameter with the same `key` already exists:
		 * - If `overwrite` is `true`, it replaces the existing value and **moves it to the end** of the list.
		 *   - This may alter the position of the parameter, e.g., `|1=|2=|3=` could become `|1=|3=|2=`.
		 * - If `overwrite` is `false`, the parameter is not added, and the existing entry remains unchanged.
		 *
		 * This differs from {@link setParam}, which updates an existing key without changing its order.
		 *
		 * Note that the order of parameters in the final output can be controlled via {@link stringify}
		 * using {@link TemplateOutputConfig.sortPredicate}, regardless of the insertion order tracked by this instance.
		 *
		 * @param key The key of the parameter. This can be an empty string for unnamed parameters.
		 * @param value The value of the parameter.
		 * @param overwrite
		 * Whether to overwrite the existing value (`true`) or cancel the addition (`false`). (Default: `true`)
		 */
		addParam(key: string, value: string, overwrite = true): this {
			return this.registerParam(key, value, {overwrite, append: true});
		}

		/**
		 * Sets a template parameter while preserving its original position in the list.
		 *
		 * If a parameter with the same `key` already exists:
		 * - If `overwrite` is `true`, it replaces the existing value while **keeping its original position**.
		 *   - This ensures that the order remains unchanged, e.g., `|1=|2=|3=` stays the same.
		 * - If `overwrite` is `false`, the parameter remains unchanged.
		 *
		 * This differs from {@link addParam}, which moves the parameter to the end of the list.
		 *
		 * Note that the order of parameters in the final output can be controlled via {@link stringify}
		 * using {@link TemplateOutputConfig.sortPredicate}, regardless of the insertion order tracked by this instance.
		 *
		 * @param key The key of the parameter. This can be an empty string for unnamed parameters.
		 * @param value The new value of the parameter.
		 * @param overwrite
		 * Whether to overwrite the existing value (`true`) or cancel the update (`false`). (Default: `true`)
		 */
		setParam(key: string, value: string, overwrite = true): this {
			return this.registerParam(key, value, {overwrite, append: false});
		}

		/**
		 * Gets a parameter object by key.
		 *
		 * **Caution**: The returned object is mutable.
		 *
		 * @param key The parameter key.
		 * @param resolveHierarchy Whether to consider {@link hierarchies} when searching for a matching parameter.
		 * If `true`, this method first checks if `key` belongs to a hierarchy array. If {@link params} contains a
		 * parameter with a higher-priority key in that hierarchy, it returns that parameter instead.
		 * (Default: `false`).
		 *
		 * Example:
		 * - Given `key = '1'`, `hierarchies = [['1', 'user', 'User']]`, and `params` containing a parameter keyed `'user'`,
		 *   this method returns the `'user'` parameter.
		 *
		 * Note that if `key` does not belong to any hierarchy array, this method behaves the same as when
		 * `resolveHierarchy` is `false`.
		 *
		 * @returns The parameter object if found, otherwise `null`.
		 */
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
		 * hasParam((key, param) => key.startsWith("meta") && param.value.length > 10);
		 */
		hasParam(predicate: (key: string, param: TemplateParameter) => boolean): boolean;
		/** @inheritdoc */
		hasParam(
			keyOrPred: string | RegExp | ((key: string, param: TemplateParameter) => boolean),
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
				return Object.entries(this.params).some(([k, obj]) => keyOrPred(k, mergeDeep(obj)));
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

		/**
		 * Deletes a parameter from the template.
		 *
		 * @param key The parameter key to delete.
		 * @returns `true` if the parameter was deleted, otherwise `false`.
		 */
		deleteParam(key: string): boolean {
			if (!this.params[key]) {
				return false;
			}
			delete this.params[key];
			this.paramOrder.delete(key);
			return true;
		}

		/**
		 * Internal stringification handler.
		 * @param title The template title. This must be formatted to a string.
		 * @param options
		 * @returns
		 */
		protected _stringify(title: string, options: TemplateOutputConfig<T>): string {

			const orders = [...this.paramOrder];
			const {
				append,
				sortPredicate = (param1, param2) => orders.indexOf(param1.key) - orders.indexOf(param2.key),
				brPredicateTitle = () => false,
				brPredicateParam = () => false
			} = options;
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
				ret.push(param.text);
				if (brPredicateParam(param)) {
					ret.push('\n');
				}
			}

			ret.push('}}');
			return ret.join('');

		}

	}

	/**
	 * Parses templates into an object structure. This class is attached to {@link Mwbot.Template}
	 * as an instance member.
	 *
	 * @example
	 * const foo = new mwbot.Template('Foo');
	 * foo.addParam('', 'bar').addParam('user', 'baz');
	 * foo.stringify(); // {{Foo|bar|user=baz}}
	 */
	class Template extends TemplateBase<InstanceType<Title>> {

		/**
		 * Creates a new instance.
		 *
		 * @param title The title that the template transcludes.
		 * @param params Template parameters.
		 * @param hierarchies Optional template parameter hierarchies.
		 */
		constructor(
			title: string | InstanceType<Title>,
			params: NewTemplateParameter[] = [],
			hierarchies?: TemplateParameterHierarchies
		) {
			title = Template.validateTitle(title);
			super(title, params, hierarchies);
		}

		/**
		 * Error-proof constructor.
		 *
		 * @param title The title that the template transcludes.
		 * @param params Template parameters.
		 * @param hierarchies Optional template parameter hierarchies.
		 * @returns `null` if initialization fails.
		 */
		static new(
			title: string | InstanceType<Title>,
			params: NewTemplateParameter[] = [],
			hierarchies?: TemplateParameterHierarchies
		): Template | null {
			try {
				return new this(title, params, hierarchies);
			} catch {
				return null;
			}
		}

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
		 * - {@link ParsedTemplate} extends {@link Template}.
		 * - {@link RawTemplate} extends nothing, meaning that its instances are ***not*** instances of
		 * {@link Template}, {@link ParsedTemplate}, {@link ParserFunction}, or {@link ParsedParserFunction}.
		 * - {@link ParsedParserFunction} extends {@link ParserFunction}.
		 *
		 * @template T The type of template to check for. Must be one of `'Template'`, `'ParsedTemplate'`,
		 * `'RawTemplate'`, `'ParserFunction'`, or `'ParsedParserFunction'`.
		 * @param obj The object to check.
		 * @param type The template type to compare against.
		 * @returns `true` if `obj` is an instance of the specified template class, otherwise `false`.
		 * @throws {Error} If an invalid `type` is provided.
		 */
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

		/**
		 * Set a new title to the instance.
		 *
		 * @param title The new title to set.
		 * @param verbose Whether to log errors. (Default: `false`)
		 * @returns A boolean indicating whether the new title is set.
		 */
		setTitle(title: string | InstanceType<Title>, verbose = false): boolean {
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

		/**
		 * Stringifies the instance.
		 *
		 * @param options Options to format the output.
		 * @returns
		 */
		stringify(options: TemplateOutputConfig<InstanceType<Title>> = {}): string  {
			return this._stringify(this.title.getPrefixedText({colon: true}), options);
		}

		/**
		 * Alias of {@link stringify} called without arguments.
		 * @returns
		 */
		toString() {
			return this.stringify();
		}

	}

	/**
	 * Class for {@link Mwbot.Wikitext.parseTemplates | Wikitext.parseTemplates}. This class
	 * represents a well-formed `{{template}}` expression with a valid title. For the class
	 * that represents a malformed `{{template}}` expression, see {@link RawTemplate}.
	 *
	 * This class differs from {@link RawTemplate} in that:
	 * - It extends the {@link Template} class.
	 * - The {@link title} property is an instace of {@link Title} instead of a string.
	 * - {@link setTitle} is an in-place operation that only returns a boolean value
	 * (unless a `toHook` parameter is provided).
	 *
	 * The constructor of this class is inaccessible, and instances can only be referenced
	 * in the result of `parseTemplates`.
	 *
	 * To check if an object is an instace of this class, use {@link Template.is}.
	 *
	 * **Important**:
	 *
	 * The instance properties of this class are pseudo-read-only, in the sense that altering them
	 * does not affect the behaviour of {@link Mwbot.Wikitext.modifyTemplates | Wikitext.modifyTemplates}.
	 */
	class ParsedTemplate extends Template {

		/**
		 * The raw template title, as directly parsed from the first operand of a `{{template|...}}` expression.
		 */
		rawTitle: string;
		/**
		 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
		 */
		private _rawTitle: string;
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
		 * @hidden
		 */
		private _initializer: ParsedTemplateInitializer;

		/**
		 * @param initializer
		 * @param options
		 * @hidden
		 */
		constructor(initializer: ParsedTemplateInitializer, options: ParsedTemplateOptions = {}) {
			const {title, rawTitle, text, params, startIndex, endIndex, nestLevel, skip} = initializer;
			const t = Template.validateTitle(title);
			super(t, params, options.hierarchies);
			this._initializer = initializer;
			this.rawTitle = rawTitle.replace('\x01', title);
			this._rawTitle = rawTitle;
			this.text = text;
			this.startIndex = startIndex;
			this.endIndex = endIndex;
			this.nestLevel = nestLevel;
			this.skip = skip;
		}

		/**
		 * Sets a new title to the instance.
		 *
		 * @param title The new title to set.
		 * @param verbose Whether to log errors. (Default: `false`)
		 * @returns A boolean indicating whether the new title was set.
		 */
		setTitle(title: string | InstanceType<Title>, verbose?: boolean): boolean;
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
		 * colon character (e.g., `"#if:"`; see also {@link ParserFunction.verify}). If a `Title`
		 * instance is passed, the output of `title.getPrefixedDb({ colon: true, fragment: true })`
		 * is validated.
		 *
		 * When passing a string, it can include the function’s first parameter (e.g., `"#if:1"`).
		 * The second and subsequent parameters are initialized based on {@link params}.
		 *
		 * @param verbose Whether to log errors (default: `false`).
		 * @param toHook Whether to convert the instance to a parser function.
		 * @returns A new {@link ParsedParserFunction} instance on success; otherwise, `null`.
		 */
		setTitle(title: string | InstanceType<Title>, verbose: boolean, toHook: true): ParsedParserFunction | null;
		setTitle(title: string | InstanceType<Title>, verbose = false, toHook = false): boolean | ParsedParserFunction | null {
			if (toHook) {
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
			} else {
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
		}

		/** @inheritdoc */
		stringify(options: ParsedTemplateOutputConfig = {}): string {
			const {rawTitle: optRawTitle, ...rawOptions} = options;
			let title = this.title.getPrefixedText({colon: true});
			if (optRawTitle && this._rawTitle.includes('\x01')) {
				title = this._rawTitle.replace('\x01', title);
			}
			return this._stringify(title, rawOptions);
		}

		/** @inheritdoc */
		toString() {
			return this.stringify();
		}

		/** @hidden */
		_clone() {
			return new ParsedTemplate(this._initializer);
		}

	}

	/**
	 * Class for {@link Mwbot.Wikitext.parseTemplates | Wikitext.parseTemplates}. This class
	 * represents a malformed `{{template}}` expression with an invalid title (i.e., the title
	 * is empty or contains illegal characters). For the class that represents a well-formed
	 * `{{template}}` expression, see {@link ParsedTemplate} (and {@link ParsedParserFunction}).
	 *
	 * This class differs from {@link ParsedTemplate} in that:
	 * - It does not extend any class.
	 * - The {@link title} property is a string instead of an instace of {@link Title}.
	 * - {@link setTitle} returns a new {@link ParsedTemplate} instance (or a new
	 * {@link ParsedParserFunction} instance) when a valid title is provided.
	 *
	 * The constructor of this class is inaccessible, and instances can only be referenced
	 * in the result of `parseTemplates`.
	 *
	 * To check if an object is an instace of this class, use {@link Template.is}.
	 *
	 * **Important**:
	 *
	 * The instance properties of this class are pseudo-read-only, in the sense that altering them
	 * does not affect the behaviour of {@link Mwbot.Wikitext.modifyTemplates | Wikitext.modifyTemplates}.
	 */
	class RawTemplate extends TemplateBase<string> {

		/**
		 * The raw template title, as directly parsed from the first operand of a `{{template|...}}` expression.
		 */
		rawTitle: string;
		/**
		 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
		 */
		private _rawTitle: string;
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
		 * @hidden
		 */
		private _initializer: ParsedTemplateInitializer;

		/**
		 * @param initializer
		 * @param options
		 * @hidden
		 */
		constructor(initializer: ParsedTemplateInitializer, options: ParsedTemplateOptions = {}) {
			const {title, rawTitle, text, params, startIndex, endIndex, nestLevel, skip} = initializer;
			super(title, params, options.hierarchies);
			this._initializer = initializer;
			this.rawTitle = rawTitle.replace('\x01', title);
			this._rawTitle = rawTitle;
			this.text = text;
			this.startIndex = startIndex;
			this.endIndex = endIndex;
			this.nestLevel = nestLevel;
			this.skip = skip;
		}

		/**
		 * Sets a new template title and converts the instance to a new {@link ParsedTemplate} instance.
		 *
		 * The conversion is based on the data used to initialize this instance, and any modifications
		 * made after initialization will be discarded. Therefore, this method should be called before
		 * making any changes to the instance properties.
		 *
		 * @param title The new title to set.
		 * @param verbose Whether to log errors. (Default: `false`)
		 * @returns A new {@link ParsedTemplate} instance on success; otherwise, `null`.
		 */
		setTitle(title: string | InstanceType<Title>, verbose?: boolean): ParsedTemplate | null;
		/**
		 * Sets a new function hook and converts the instance to a new {@link ParsedParserFunction} instance.
		 *
		 * The conversion is based on the data used to initialize this instance, and any modifications
		 * made after initialization will be discarded. Therefore, this method should be called before
		 * making any changes to the instance properties.
		 *
		 * @param title The parser function hook to convert this title to, **including** a trailing
		 * colon character (e.g., `"#if:"`; see also {@link ParserFunction.verify}). If a `Title`
		 * instance is passed, the output of `title.getPrefixedDb({ colon: true, fragment: true })`
		 * is validated.
		 *
		 * When passing a string, it can include the function’s first parameter (e.g., `"#if:1"`).
		 * The second and subsequent parameters are initialized based on {@link params}.
		 *
		 * @param verbose Whether to log errors (default: `false`).
		 * @param toHook Whether to convert the instance to a parser function.
		 * @returns A new {@link ParsedParserFunction} instance on success; otherwise, `null`.
		 */
		setTitle(title: string | InstanceType<Title>, verbose: boolean, toHook: true): ParsedParserFunction | null;
		setTitle(title: string | InstanceType<Title>, verbose = false, toHook = false): ParsedTemplate | ParsedParserFunction | null {
			title = typeof title === 'string' ? title : title.getPrefixedDb({colon: true, fragment: toHook});
			try {
				// @ts-expect-error
				Template.validateTitle(title, toHook);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
			const initializer = mergeDeep(this._initializer);
			initializer.title = title;
			if (toHook) {
				return new ParsedParserFunction(initializer);
			} else {
				return new ParsedTemplate(initializer);
			}
		}

		/**
		 * Stringifies the instance.
		 *
		 * @param options Options to format the output.
		 * @returns
		 */
		stringify(options: RawTemplateOutputConfig = {}): string {
			const {rawTitle: optRawTitle, ...rawOptions} = options;
			let title = this.title;
			if (optRawTitle && this._rawTitle.includes('\x01')) {
				title = this._rawTitle.replace('\x01', title);
			}
			return this._stringify(title, rawOptions);
		}

		/**
		 * Alias of {@link stringify} called without arguments.
		 * @returns
		 */
		toString() {
			return this.stringify();
		}

		/** @hidden */
		_clone() {
			return new RawTemplate(this._initializer);
		}

	}

	/**
	 * Parses parser functions into an object structure. This class is attached to {@link Mwbot.ParserFunction}
	 * as an instance member.
	 */
	class ParserFunction extends ParamBase {

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
		 * Creates a new instance.
		 *
		 * @param hook The function hook. This ***must*** end with a colon character.
		 * @param params Parameters of the parser function.
		 */
		constructor(hook: string, params: string[] = []) {
			const verified = ParserFunction.verify(hook);
			if (!verified) {
				throw new Error(`"${hook}" is not a valid function hook.`);
			}
			super(params);
			this.hook = verified.match;
			this.canonicalHook = verified.canonical;
		}

		/**
		 * Verifies the given string as a parser function hook.
		 *
		 * @param hook A potential parser function hook as a string. This **must** end with a colon character.
		 * @returns An object representing the canonical function hook and the matched function hook, or `null`.
		 */
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

		/**
		 * Sets a new function hook, overwriting the current one.
		 *
		 * @param hook The new hook.
		 * @returns A boolean indicating whether the new hook has been set, after validation.
		 */
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

		/**
		 * Stringifies the instance.
		 *
		 * @param options Options to format the output.
		 * @returns
		 */
		stringify(options: ParserFunctionOutputConfig = {}): string {
			const hook = options.useCanonical ? this.canonicalHook : this.hook;
			return this._stringify(hook, options);
		}

		/**
		 * Alias of {@link stringify} called without arguments.
		 * @returns
		 */
		toString() {
			return this.stringify();
		}

	}

	/**
	 * Class for {@link Mwbot.Wikitext.parseTemplates | Wikitext.parseTemplates}. This class
	 * represents a `{{#parserfunction:...}}` expression.
	 *
	 * The constructor of this class is inaccessible, and instances can only be referenced
	 * in the result of `parseTemplates`.
	 *
	 * To check if an object is an instace of this class, use {@link Template.is}.
	 *
	 * **Important**:
	 *
	 * The instance properties of this class are pseudo-read-only, in the sense that altering them
	 * does not affect the behaviour of {@link Mwbot.Wikitext.modifyTemplates | Wikitext.modifyTemplates}.
	 */
	class ParsedParserFunction extends ParserFunction {

		/**
		 * The raw parser function hook, as directly parsed from the wikitext.
		 */
		rawHook: string;
		/**
		 * {@link rawHook} with the insertion point of {@link hook} replaced with a control character.
		 */
		private _rawHook: string;
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
		 * @hidden
		 */
		private _initializer: ParsedTemplateInitializer;

		/**
		 * @param initializer
		 * @hidden
		 */
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

			const initParams =  [paramPart];
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

		/** @inheritdoc */
		stringify(options: ParsedParserFunctionOutputConfig = {}): string {
			const {rawHook: optRawHook, useCanonical, ...rawOptions} = options;
			let hook = useCanonical ? this.canonicalHook : this.hook;
			if (optRawHook && this._rawHook.includes('\x01')) {
				hook = this._rawHook.replace('\x01', hook);
			}
			return this._stringify(hook, rawOptions);
		}

		/** @inheritdoc */
		toString() {
			return this.stringify();
		}

		/**
		 * @hidden
		 */
		_clone() {
			return new ParsedParserFunction(this._initializer);
		}

	}

	return {Template, ParsedTemplate, RawTemplate, ParserFunction, ParsedParserFunction};

}

/**
 * @internal
 */
export type Template = ReturnType<typeof TemplateFactory>['Template'];
/**
 * @internal
 */
export type ParsedTemplate = ReturnType<typeof TemplateFactory>['ParsedTemplate'];
/**
 * @internal
 */
export type RawTemplate = ReturnType<typeof TemplateFactory>['RawTemplate'];
/**
 * @internal
 */
export type ParserFunction = ReturnType<typeof TemplateFactory>['ParserFunction'];
/**
 * @internal
 */
export type ParsedParserFunction = ReturnType<typeof TemplateFactory>['ParsedParserFunction'];

/**
 * Object that is used to initialize template parameters in {@link Template.constructor}.
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
	 * See https://en.wikipedia.org/wiki/Help:Template#Whitespace_handling.
	 */
	value: string
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
 * Defines parameter hierarchies for templates.
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
 * Helper interface for {@link Template.is}.
 * @private
 */
interface TemplateTypeMap {
	Template: InstanceType<Template>;
	ParsedTemplate: InstanceType<ParsedTemplate>;
	RawTemplate: InstanceType<RawTemplate>;
	ParserFunction: InstanceType<ParserFunction>;
	ParsedParserFunction: InstanceType<ParsedParserFunction>;
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
export interface ParsedTemplateOutputConfig extends TemplateOutputConfig<InstanceType<Title>> {
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
 * @internal
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
	hierarchies?: TemplateParameterHierarchies;
}

/**
 * The return type of {@link ParserFunction.verify}.
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