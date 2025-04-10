"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateFactory = TemplateFactory;
const Util_1 = require("./Util");
const baseClasses_1 = require("./baseClasses");
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
 * @internal
 */
function TemplateFactory(config, info, Title) {
    const namespaceIds = config.get('wgNamespaceIds');
    const NS_MAIN = namespaceIds[''];
    const NS_TEMPLATE = namespaceIds.template;
    /**
     * Object that maps canonical parser function names to their validation regular expressions.
     * The validation includes the trailing colon, which can be a 2-byte character in some cases.
     */
    const parserFunctionMap = info.magicwords.reduce((acc, obj) => {
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
        const arrRegExp = keys.reduce((ret, key) => {
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
            }
            else {
                ret.push(`^${hash + key}$`);
            }
            return ret;
        }, []);
        const canonical = (noHash ? '' : '#') + obj.name + ':';
        acc[canonical] = new RegExp(arrRegExp.join('|'), caseSensitive ? '' : 'i');
        return acc;
    }, Object.create(null));
    class TemplateBase {
        constructor(title, params = [], hierarchies) {
            this.title = title;
            this.params = Object.create(null);
            this.paramOrder = new Set();
            this.hierarchies = Array.isArray(hierarchies) ? hierarchies.map((arr) => [...arr]) : [];
            // Register parameters
            params.forEach(({ key, value }) => {
                this.registerParam(key || '', value, { overwrite: true, position: 'end', listDuplicates: true });
            });
        }
        insertParam(key, value, overwrite, position) {
            return this.registerParam(key, value, { overwrite: !!overwrite, position });
        }
        updateParam(key, value) {
            return this.registerParam(key, value, { overwrite: 'must' });
        }
        getParam(key, resolveHierarchy = false) {
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
        hasParam(keyOrPred, value) {
            if (typeof keyOrPred !== 'string' &&
                !(keyOrPred instanceof RegExp) &&
                typeof keyOrPred !== 'function' ||
                keyOrPred === '') {
                return false;
            }
            // If `keyOrPred` is a function, check against each param
            if (typeof keyOrPred === 'function') {
                return Object.values(this.params).some((obj) => keyOrPred((0, Util_1.mergeDeep)(obj)));
            }
            // Convert string key to a strict RegExp match
            const keyPattern = typeof keyOrPred === 'string'
                ? new RegExp(`^${(0, Util_1.escapeRegExp)(keyOrPred)}$`)
                : keyOrPred;
            // Search for a matching key and validate its value
            return Object.entries(this.params).some(([k, obj]) => keyPattern.test(k) &&
                (value === undefined ||
                    (typeof value === 'string' && value === obj.value) ||
                    (value instanceof RegExp && value.test(obj.value))));
        }
        deleteParam(key, resolveHierarchy = false) {
            if (!(key in this.params) && resolveHierarchy) {
                const overrideStatus = this.checkKeyOverride(key);
                if (overrideStatus) {
                    if (overrideStatus.overrides) {
                        key = overrideStatus.overrides;
                    }
                    else if (overrideStatus.overridden) {
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
        static validateTitle(title, asHook = false) {
            if (typeof title !== 'string' && !(title instanceof Title)) {
                throw new TypeError(`Expected a string or Title instance for "title", but got ${typeof title}.`);
            }
            const hook = ParserFunction.verify(typeof title === 'string'
                ? title
                : title.getPrefixedDb({ colon: true, fragment: true }));
            if (hook && asHook) {
                return hook;
            }
            else if (hook) {
                throw new Error(`"${hook}" is a parser function hook.`);
            }
            else if (typeof title === 'string') {
                title = Title.clean(title);
                const namespace = title[0] === ':' ? NS_MAIN : NS_TEMPLATE; // TODO: Handle "/" (subpage) and "#" (in-page section)?
                title = new Title(title, namespace);
            }
            else {
                title = new Title(title.getPrefixedDb({ colon: true, fragment: true }));
            }
            if (!title.getMain()) {
                throw new Error('The empty title cannot be transcluded.');
            }
            else if (title.isExternal() && !title.isTrans()) {
                throw new Error('The interwiki title cannot be transcluded.');
            }
            return title;
        }
        /**
         * Find the first available numeric key for a template parameter.
         * @returns A string-cast numeric key.
         */
        findNumericKey() {
            const numericKeys = Object.keys(this.params).reduce((acc, key) => {
                if (/^[1-9]\d*$/.test(key)) {
                    acc.add(+key);
                }
                return acc;
            }, new Set());
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
        checkKeyOverride(key) {
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
                ? { overrides: registeredKey } // Input key overrides an existing key
                : { overridden: registeredKey }; // Input key is overridden by an existing key
        }
        createParam(key, value, unnamed, duplicates) {
            const ret = {
                key,
                value,
                get text() {
                    return '|' + (!this.unnamed ? this.key + '=' : '') + this.value;
                },
                unnamed
            };
            if (duplicates) {
                ret.duplicates = duplicates;
                return ret;
            }
            else {
                return ret;
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
        registerParam(key, value, options) {
            var _a;
            key = key.trim();
            const unnamed = key === '';
            if (unnamed) {
                key = this.findNumericKey();
            }
            else {
                value = value.trim(); // Trim value only if the key is named
            }
            const { overwrite, position, listDuplicates = false } = options;
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
            const findReferenceIndex = (order, ref) => {
                let i = order.indexOf(ref);
                if (i !== -1)
                    return i;
                const rel = this.checkKeyOverride(ref);
                if (typeof (rel === null || rel === void 0 ? void 0 : rel.overrides) === 'string' && (i = order.indexOf(rel.overrides)) !== -1)
                    return i;
                if (typeof (rel === null || rel === void 0 ? void 0 : rel.overridden) === 'string' && (i = order.indexOf(rel.overridden)) !== -1)
                    return i;
                return -1;
            };
            const order = [...this.paramOrder];
            if (existing) {
                // Handle updates for an existing key
                // The input key overrides another key (i.e., an alias), or it exists directly
                if ((overrideStatus === null || overrideStatus === void 0 ? void 0 : overrideStatus.overrides) || key in this.params) {
                    const targetKey = (_a = overrideStatus === null || overrideStatus === void 0 ? void 0 : overrideStatus.overrides) !== null && _a !== void 0 ? _a : key;
                    const { duplicates, ...previousParam } = this.params[targetKey];
                    if (listDuplicates) {
                        // If duplicate tracking is enabled, save the previous param state
                        duplicates.push(previousParam);
                    }
                    delete this.params[targetKey]; // Remove the old parameter before replacing
                    // Get the reference key if `position` is an object, ensuring that the ref key is a string
                    let refKey = null;
                    let isAfter = false;
                    if ((0, Util_1.isPlainObject)(position)) {
                        if ('before' in position && typeof position.before === 'string') {
                            refKey = position.before;
                        }
                        else if ('after' in position && typeof position.after === 'string') {
                            isAfter = true;
                            refKey = position.after;
                        }
                    }
                    // Self-reference should fall back to in-place update: Exclude such cases
                    if (!(refKey === targetKey || refKey === key)) {
                        // Remove the target from current order before reinserting
                        const targetKeyIndex = order.indexOf(targetKey);
                        order.splice(targetKeyIndex, 1);
                        if (refKey && (0, Util_1.isPlainObject)(position)) {
                            let insertIndex = findReferenceIndex(order, refKey);
                            if (insertIndex !== -1) {
                                insertIndex = isAfter ? insertIndex + 1 : insertIndex;
                                order.splice(insertIndex, 0, key);
                            }
                            else {
                                order.push(key);
                            }
                        }
                        else if (position === 'start') {
                            order.unshift(key);
                        }
                        else if (position === 'end') {
                            order.push(key);
                        }
                        else {
                            // Default: preserve original index
                            order.splice(targetKeyIndex, 0, key);
                        }
                    }
                    this.params[key] = this.createParam(key, value, unnamed, duplicates);
                    this.paramOrder = new Set(order);
                }
                // The input key is overridden by an existing parameter
                else if (overrideStatus === null || overrideStatus === void 0 ? void 0 : overrideStatus.overridden) {
                    if (listDuplicates) {
                        this.params[overrideStatus.overridden].duplicates.push(this.createParam(key, value, unnamed, null));
                    }
                    // Do not modify existing parameter or reorder
                }
            }
            else {
                // Handle a brand new parameter
                this.params[key] = this.createParam(key, value, unnamed, []);
                // Update the insertion order with respect to the position
                if ((0, Util_1.isPlainObject)(position)) {
                    const isBefore = 'before' in position;
                    const refKey = isBefore ? position.before : position.after;
                    if (typeof refKey === 'string') {
                        const refIndex = findReferenceIndex(order, refKey);
                        if (refIndex !== -1) {
                            const insertAt = isBefore ? refIndex : refIndex + 1;
                            order.splice(insertAt, 0, key);
                        }
                        else {
                            // If reference key is not found, append to end
                            order.push(key);
                        }
                    }
                    else {
                        order.push(key);
                    }
                }
                else if (position === 'start') {
                    order.unshift(key);
                }
                else {
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
        _stringify(title, options) {
            const order = [...this.paramOrder];
            const { append, sortPredicate = (param1, param2) => order.indexOf(param1.key) - order.indexOf(param2.key), brPredicateTitle = () => false, brPredicateParam = () => false } = options;
            const suppressKeys = (options.suppressKeys || []).filter((key) => /^[1-9]\d*$/.test(key));
            let { prepend } = options;
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
                const { key, value, unnamed } = param;
                const noKey = value.includes('=') ? false : // Always show key if value contains '='
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
    const _templateBaseCheck = TemplateBase;
    class Template extends TemplateBase {
        constructor(title, params = [], hierarchies) {
            title = Template.validateTitle(title);
            super(title, params, hierarchies);
        }
        static new(title, params = [], hierarchies) {
            try {
                return new this(title, params, hierarchies);
            }
            catch {
                return null;
            }
        }
        static is(obj, type) {
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
        setTitle(title, verbose = false) {
            try {
                // @ts-expect-error
                this.title = Template.validateTitle(title);
                return true;
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return false;
            }
        }
        stringify(options = {}) {
            const title = this.title.getNamespaceId() === NS_TEMPLATE
                ? this.title.getMain()
                : this.title.getPrefixedText({ colon: true });
            return this._stringify(title, options);
        }
        toString() {
            return this.stringify();
        }
    }
    const _templateCheckStatic = Template;
    // const _templateCheckInstance: Template = new Template('');
    class ParsedTemplate extends Template {
        constructor(initializer, options = {}) {
            const { title, rawTitle, text, params, startIndex, endIndex, nestLevel, skip } = initializer;
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
        toParserFunction(title, verbose = false) {
            title = typeof title === 'string' ? title : title.getPrefixedDb({ colon: true, fragment: true });
            try {
                Template.validateTitle(title, true);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
            const initializer = (0, Util_1.mergeDeep)(this._initializer);
            initializer.title = title;
            return new ParsedParserFunction(initializer);
        }
        stringify(options = {}) {
            const { rawTitle: optRawTitle, ...rawOptions } = options;
            let title = this.title.getNamespaceId() === NS_TEMPLATE
                ? this.title.getMain()
                : this.title.getPrefixedText({ colon: true });
            if (optRawTitle && this._rawTitle.includes('\x01')) {
                title = this._rawTitle.replace('\x01', title);
            }
            return this._stringify(title, rawOptions);
        }
        toString() {
            return this.stringify();
        }
        _clone(options = {}) {
            return new ParsedTemplate(this._initializer, options);
        }
    }
    const _parsedTemplateCheckStatic = ParsedTemplate;
    // const _parsedTemplateCheckInstance: ParsedTemplate = new ParsedTemplate(Object.create(null));
    class RawTemplate extends TemplateBase {
        constructor(initializer, options = {}) {
            const { title, rawTitle, text, params, startIndex, endIndex, nestLevel, skip } = initializer;
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
        setTitle(title) {
            // @ts-expect-error
            this.title = title;
            return this;
        }
        toTemplate(title, verbose = false) {
            title = typeof title === 'string' ? title : title.getPrefixedDb({ colon: true, fragment: true });
            try {
                Template.validateTitle(title);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
            const initializer = (0, Util_1.mergeDeep)(this._initializer);
            initializer.title = title;
            return new ParsedTemplate(initializer);
        }
        toParserFunction(title, verbose = false) {
            title = typeof title === 'string' ? title : title.getPrefixedDb({ colon: true, fragment: true });
            try {
                Template.validateTitle(title, true);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
            const initializer = (0, Util_1.mergeDeep)(this._initializer);
            initializer.title = title;
            return new ParsedParserFunction(initializer);
        }
        stringify(options = {}) {
            const { rawTitle: optRawTitle, ...rawOptions } = options;
            let title = this.title;
            if (optRawTitle && this._rawTitle.includes('\x01')) {
                title = this._rawTitle.replace('\x01', title);
            }
            return this._stringify(title, rawOptions);
        }
        toString() {
            return this.stringify();
        }
        _clone(options = {}) {
            return new RawTemplate(this._initializer, options);
        }
    }
    const _rawTemplateCheckStatic = RawTemplate;
    // const _rawTemplateCheckInstance: RawTemplate = new RawTemplate(Object.create(null));
    class ParserFunction extends baseClasses_1.ParamBase {
        constructor(hook, params = []) {
            const verified = ParserFunction.verify(hook);
            if (!verified) {
                throw new Error(`"${hook}" is not a valid function hook.`);
            }
            super(params);
            this.hook = verified.match;
            this.canonicalHook = verified.canonical;
        }
        static verify(hook) {
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
        setHook(hook) {
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
        _stringify(hook, options) {
            const { prepend = '', sortPredicate, brPredicate } = options;
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
        stringify(options = {}) {
            const hook = options.useCanonical ? this.canonicalHook : this.hook;
            return this._stringify(hook, options);
        }
        toString() {
            return this.stringify();
        }
    }
    const _parserFunctionCheckStatic = ParserFunction;
    // const _parserFunctionCheckInstance: ParserFunction = new ParserFunction('');
    class ParsedParserFunction extends ParserFunction {
        constructor(initializer) {
            const { title, rawTitle, text, params, startIndex, endIndex, nestLevel, skip } = initializer;
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
            }
            else {
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
            params.forEach(({ key, value }) => {
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
        toTemplate(title, verbose = false) {
            title = typeof title === 'string' ? title : title.getPrefixedDb({ colon: true, fragment: true });
            try {
                // @ts-expect-error Calling a protected method
                Template.validateTitle(title);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
            const initializer = (0, Util_1.mergeDeep)(this._initializer);
            initializer.title = title;
            return new ParsedTemplate(initializer);
        }
        stringify(options = {}) {
            const { rawHook: optRawHook, useCanonical, ...rawOptions } = options;
            let hook = useCanonical ? this.canonicalHook : this.hook;
            if (optRawHook && this._rawHook.includes('\x01')) {
                hook = this._rawHook.replace('\x01', hook);
            }
            return this._stringify(hook, rawOptions);
        }
        toString() {
            return this.stringify();
        }
        _clone() {
            return new ParsedParserFunction(this._initializer);
        }
    }
    const _parsedParserFunctionCheckStatic = ParsedParserFunction;
    // const _parsedParserFunctionCheckInstance: ParsedParserFunction = new ParsedParserFunction(Object.create(null));
    return {
        Template: Template,
        ParsedTemplate: ParsedTemplate,
        RawTemplate: RawTemplate,
        ParserFunction: ParserFunction,
        ParsedParserFunction: ParsedParserFunction
    };
}
