"use strict";
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
 * new Mwbot(initOptions).init().then((mwbot) => {
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WikitextFactory = WikitextFactory;
const MwbotError_1 = require("./MwbotError");
const Util_1 = require("./Util");
const String_1 = require("./String");
/**
 * @internal
 */
function WikitextFactory(mw, ParsedTemplate, RawTemplate, ParsedParserFunction, ParsedWikilink, ParsedFileWikilink, ParsedRawWikilink) {
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
    const validTags = new Map([
        [
            'native',
            new Set([
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
            ])
        ],
        [
            'mediawiki',
            new Set([
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
            ])
        ]
    ]);
    class Wikitext {
        constructor(content, options = {}) {
            if (typeof content !== 'string') {
                throw new MwbotError_1.MwbotError('fatal', {
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
            const defaultSkipTags = options.overwriteSkipTags ?
                [] :
                // TODO: Cannot handle rare cases like "<nowiki>[[link<!--]]-->|display]]</nowiki>", where a comment tag is nested
                // inside a non-comment skip tag. To handle these, it'll be necessary to differentiate the types of skip tags.
                ['!--', 'nowiki', 'pre', 'syntaxhighlight', 'source', 'math'];
            if (options.skipTags) {
                defaultSkipTags.push(...options.skipTags.reduce((acc, el) => {
                    if (typeof el === 'string') {
                        acc.push(el.toLowerCase());
                    }
                    return acc;
                }, []));
            }
            this.skipTags = [...new Set(defaultSkipTags)];
        }
        static new(content, options = {}) {
            return new Wikitext(content, options);
        }
        static async newFromTitle(title, options = {}, requestOptions = {}) {
            const rev = await mw.read(title, requestOptions);
            return new Wikitext(rev.content, options);
        }
        static getValidTags() {
            return new Set([...validTags.values()].flatMap((set) => [...set]));
        }
        static isValidTag(tagName) {
            tagName = String(tagName).toLowerCase();
            return [...validTags.values()].some((set) => set.has(tagName));
        }
        get length() {
            return this.storage.content.length;
        }
        get byteLength() {
            return (0, String_1.byteLength)(this.storage.content);
        }
        get content() {
            return this.storageManager('content');
        }
        storageManager(key, valueOrClone, args) {
            var _a;
            // If retrieving a value
            if (typeof valueOrClone === 'boolean' || valueOrClone === undefined) {
                const clone = valueOrClone !== null && valueOrClone !== void 0 ? valueOrClone : true; // Default to true
                const val = ((_a = this.storage[key]) !== null && _a !== void 0 ? _a : (() => {
                    switch (key) {
                        case 'content': return this.storage.content;
                        case 'tags': return this._parseTags();
                        case 'parameters': return this._parseParameters();
                        case 'sections': return this._parseSections();
                        case 'wikilinks_fuzzy': return this._parseWikilinksFuzzy();
                        case 'templates': return this._parseTemplates(args);
                        case 'wikilinks': return this._parseWikilinks();
                    }
                })());
                if (key === 'content') {
                    return val;
                }
                else if (!Array.isArray(val)) {
                    throw new TypeError(`Expected an array for storage["${key}"], but got ${typeof val}.`);
                }
                this.storage[key] = val; // Save
                return clone
                    ? val.map((obj) => '_clone' in obj ? obj._clone(args) : (0, Util_1.isClassInstance)(obj) ? (0, Util_1.deepCloneInstance)(obj) : (0, Util_1.mergeDeep)(obj))
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
            }
            else if (key in this.storage) {
                // Set the passed array
                this.storage[key] = valueOrClone;
            }
            else {
                throw new ReferenceError(`Invalid key: ${key}.`);
            }
            return this;
        }
        modify(type, modificationPredicate) {
            // Validate the arguments
            if (typeof type !== 'string' || !['tags', 'parameters', 'sections', 'templates', 'wikilinks'].includes(type)) {
                throw new MwbotError_1.MwbotError('fatal', {
                    code: 'invalidtype',
                    info: `"${type}" is not a valid expression type for Wikitext.modify.`
                });
            }
            else if (typeof modificationPredicate !== 'function') {
                throw new MwbotError_1.MwbotError('fatal', {
                    code: 'typemismatch',
                    info: 'modificationPredicate must be a function.'
                });
            }
            // Retrieve expressions from storage and apply modificationPredicate
            let expressions = this.storageManager(type);
            const mods = expressions.map(modificationPredicate);
            expressions = // Refresh `expressions` because internal objects might have been mutated
                this.storageManager(type, false);
            let newContent = this.content;
            // Apply modifications to the content
            mods.forEach((text, i) => {
                if (typeof text !== 'string' && text !== null) {
                    throw new MwbotError_1.MwbotError('fatal', {
                        code: 'typemismatch',
                        info: 'modificationPredicate must return either a string or null.'
                    }, { modified: mods.map((val) => typeof val) });
                }
                if (typeof text === 'string') {
                    const initialEndIndex = expressions[i].endIndex;
                    const leadingPart = newContent.slice(0, expressions[i].startIndex);
                    let trailingPart = newContent.slice(initialEndIndex);
                    let m = null;
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
                            }
                            else if (obj.endIndex > initialEndIndex) {
                                obj.endIndex += lengthGap;
                            }
                        }
                    });
                }
            });
            // Update stored content and return result
            this.storageManager('content', newContent);
            return this.content;
        }
        /**
         * Parses the wikitext for HTML tags.
         *
         * @returns
         */
        _parseTags() {
            /**
             * Array to store unclosed start tags that need matching end tags
             */
            const startTags = [];
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
            const parsed = [];
            for (let i = 0; i < wikitext.length; i++) {
                let m;
                const wkt = wikitext.slice(i);
                // If a start tag is found
                if ((m = regex.start.exec(wkt))) {
                    const nodeName = (m[1] || m[2]).toLowerCase();
                    const selfClosing = regex.self.test(m[0]);
                    // Check if the tag is a void tag
                    let pseudoVoid = false;
                    if (regex.void.test(nodeName) || (pseudoVoid = (selfClosing && validTags.get('mediawiki').has(nodeName)))) {
                        // Add void and "pseudo-void" self-closing tags to the stack immediately
                        // For "pseudo-void" tags, see the comments in the definition of `validTags`
                        parsed.push(createVoidTagObject(nodeName, m[0], i, startTags.length, selfClosing, pseudoVoid, false));
                    }
                    else {
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
                }
                else if ((m = regex.end.exec(wkt))) {
                    // If an end tag is found, attempt to match it with the corresponding start tag
                    const nodeName = (m[1] || m[2]).toLowerCase();
                    const endTag = m[0];
                    // Different treatments for when this is the end of a void tag or a normal tag
                    if (regex.void.test(nodeName)) {
                        if (nodeName === 'br') {
                            // MediaWiki converts </br> to <br>
                            // Void start tags aren't stored in "startTags" (i.e. there's no need to look them up in the stack)
                            parsed.push(createVoidTagObject(nodeName, m[0], i, startTags.length, false, false, false));
                        }
                        else {
                            // Do nothing
                        }
                    }
                    else if (startTags.find(({ name }) => name === nodeName)) {
                        // Ensure there's a matching start tag stored; otherwise, skip this end tag
                        let closedTagCnt = 0;
                        // Check the collected start tags
                        startTags.some((start) => {
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
            startTags.forEach(({ name, startIndex, endIndex, selfClosing }, i, arr) => {
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
        parseTags(config = {}) {
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
        modifyTags(modificationPredicate) {
            return this.modify('tags', modificationPredicate);
        }
        addSkipTags(skipTags) {
            skipTags.forEach((el) => {
                if (typeof el === 'string' && !skipTags.includes((el = el.toLowerCase()))) {
                    this.skipTags.push(el);
                }
            });
            return this;
        }
        setSkipTags(skipTags) {
            this.skipTags = skipTags.reduce((acc, el) => {
                if (typeof el === 'string') {
                    acc.push(el.toLowerCase());
                }
                return acc;
            }, []);
            return this;
        }
        removeSkipTags(skipTags) {
            if (skipTags.join('')) {
                const rSkipTags = new RegExp(`^(?:${skipTags.join('|')})$`);
                this.skipTags = this.skipTags.filter((el) => rSkipTags.test(el));
            }
            return this;
        }
        getSkipTags() {
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
        getSkipPredicate(tags) {
            if (!this.skipTags.join('')) {
                return () => false;
            }
            const rSkipTags = new RegExp(`^(?:${this.skipTags.join('|')})$`);
            // Create an array to store the start and end indices of tags to skip
            tags = tags || this.storageManager('tags', false);
            const indexMap = tags.reduce((acc, tagObj) => {
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
            return (startIndex, endIndex) => {
                return indexMap.some(([skipStartIndex, skipEndIndex]) => skipStartIndex < startIndex && endIndex < skipEndIndex);
            };
        }
        /**
         * Parses sections in the wikitext.
         *
         * @returns An array of parsed sections.
         */
        _parseSections() {
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
            const headings = this.storageManager('tags', false).reduce((acc, tagObj) => {
                const m = regex.tag.exec(tagObj.name);
                if (m && !isInSkipRange(tagObj.startIndex, tagObj.endIndex)) {
                    acc.push({
                        text: tagObj.text,
                        // TODO: Should we deal with cases like "this <span>is</span> a heading" and "this [[is]] a heading"?
                        title: mw.Title.clean(removeComments(tagObj.content)),
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
            headings.unshift({ text: '', title: 'top', level: 1, index: 0 }); // Top section
            // Parse sections from the headings
            const sections = headings.map(({ text, title, level, index }, i, arr) => {
                const boundaryIdx = i === 0
                    ? (arr.length > 1 ? 1 : -1) // If top section, next heading or no boundary
                    : arr.findIndex((obj, j) => j > i && obj.level <= level); // Find the next non-subsection
                const content = wikitext.slice(index, boundaryIdx !== -1 ? arr[boundaryIdx].index : wikitext.length);
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
        parseSections(config = {}) {
            const { sectionPredicate } = config;
            let sections = this.storageManager('sections');
            if (typeof sectionPredicate === 'function') {
                sections = sections.filter((sec) => sectionPredicate(sec));
            }
            return sections;
        }
        modifySections(modificationPredicate) {
            return this.modify('sections', modificationPredicate);
        }
        identifySection(startIndex, endIndex) {
            const sections = this.storageManager('sections');
            let ret = null;
            for (const sect of sections) {
                if (sect.startIndex <= startIndex && endIndex <= sect.endIndex &&
                    // Ensure to pick up the deepest section
                    (ret === null || ret.level < sect.level)) {
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
        _parseParameters() {
            const isInSkipRange = this.getSkipPredicate();
            const params = [];
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
            let match;
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
                            }
                            else {
                                // If not, continue searching
                                pos += closingBraces - 1;
                                rightBraceCnt += closingBraces;
                            }
                        }
                    }
                }
                if (isValid) {
                    const param = {
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
                    }
                    else {
                        nestLevel = 0;
                    }
                }
            }
            return params;
        }
        parseParameters(config = {}) {
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
        modifyParameters(modificationPredicate) {
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
        getIndexMap(options = {}) {
            const indexMap = Object.create(null);
            // Process skipTags
            const rSkipTags = new RegExp(`^(?:${this.skipTags.join('|')})$`);
            this.storageManager('tags', false).forEach(({ text, startIndex, name, content }) => {
                // If this is a skip tag or a gallery tag whose content contains a pipe character
                if (rSkipTags.test(name) || name === 'gallery' && options.gallery && content && content.includes('|')) {
                    // `inner` is the innerHTML of the tag
                    const inner = (() => {
                        if (content === null) {
                            return null;
                        }
                        const innerStartIndex = startIndex + text.indexOf(content);
                        return { start: innerStartIndex, end: innerStartIndex + content.length };
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
                this.storageManager('parameters', false).forEach(({ text, startIndex }) => {
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
                this.storageManager('wikilinks_fuzzy', false).forEach(({ text, startIndex, endIndex }) => {
                    // `inner` is the inner text of the wikilink (the text without "[[" and "]]")
                    const inner = (() => {
                        const start = startIndex + 2;
                        const end = endIndex - 2;
                        return end - start > 1 ? { start, end } : null;
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
        _parseWikilinksFuzzy(
        // Must not include `{templates: true}` because `parseTemplates` uses the index map of `wikilinks_fuzzy`
        // If included, that will be circular
        indexMap = this.getIndexMap({ parameters: true }), isInSkipRange = this.getSkipPredicate(), wikitext = this.content) {
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
            const links = [];
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
                    const { inner } = indexMap[i];
                    if (inner && inner.end <= wikitext.length) {
                        const { start, end } = inner;
                        // innerHTML of a skip tag or the right operand of a parameter
                        // TODO: This can cause a bug if the left operand of the parameter contains a nested wikilink,
                        // but could there be any occurrence of `{{{ [[wikilink]] | right }}}`?
                        // Modify getIndexMap() in case it turns out that this needs to be handled
                        const text = wikitext.slice(start, end);
                        if (text.includes('[[') && text.includes(']]')) {
                            // Parse wikilinks inside the expressions
                            links.push(...this._parseWikilinksFuzzy(indexMap, isInSkipRange, '\x01'.repeat(start) + text));
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
                }
                else if (regex.end.test(wkt) && inLink) {
                    const endIndex = i + 2;
                    const text = wikitext.slice(startIndex, endIndex);
                    let right = null;
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
                }
                else if (inLink && !isLeftSealed) {
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
        _parseTemplates(options = {}, indexMap = this.getIndexMap({ gallery: true, parameters: true, wikilinks_fuzzy: true }), isInSkipRange = this.getSkipPredicate(), nestLevel = 0, wikitext = this.content, checkGallery = true) {
            let numUnclosed = 0;
            let startIndex = 0;
            let components = [];
            const regex = {
                templateStart: /^\{\{/,
                templateEnd: /^\}\}/
            };
            // Character-by-character loop
            const templates = [];
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
                        processTemplateFragment(components, indexMap[i].text, { nonNameComponent: true });
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
                        const { start, end } = inner;
                        const text = wikitext.slice(start, end);
                        if (text.includes('{{') && text.includes('}}')) {
                            templates.push(...this._parseTemplates(options, indexMap, isInSkipRange, nestLevel, '\x01'.repeat(inner.start) + text, false));
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
                }
                else if (numUnclosed === 2) {
                    // We are looking for closing braces
                    if (regex.templateStart.test(wkt)) {
                        // Found a nested template
                        numUnclosed += 2;
                        i++;
                        processTemplateFragment(components, '{{');
                    }
                    else if (regex.templateEnd.test(wkt)) {
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
                        }
                        else if (!/^\s+/.test(title)) {
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
                        let temp;
                        try {
                            temp = new ParsedParserFunction(initializer);
                        }
                        catch {
                            if (titlesMatch) {
                                // `title` and `rawTitle` are identical, and we verified that the {{template}} isn't a parser function
                                initializer.rawTitle = '\x01';
                            }
                            try {
                                temp = new ParsedTemplate(initializer, options);
                            }
                            catch {
                                temp = new RawTemplate(initializer, options);
                            }
                        }
                        templates.push(temp);
                        const inner = temp.text.slice(2, -2);
                        if (inner.includes('{{') && inner.includes('}}')) {
                            templates.push(...this._parseTemplates(options, indexMap, isInSkipRange, nestLevel + 1, '\x01'.repeat(startIndex + 2) + inner, false));
                        }
                        numUnclosed -= 2;
                        i++;
                    }
                    else {
                        // Just part of the template
                        processTemplateFragment(components, wkt[0], wkt[0] === '|' ? { isNew: true } : {});
                    }
                }
                else {
                    // We are in a nested template
                    let fragment;
                    if (regex.templateStart.test(wkt)) {
                        // Found another nested template
                        fragment = '{{';
                        numUnclosed += 2;
                        i++;
                    }
                    else if (regex.templateEnd.test(wkt)) {
                        // Found the end of the nested template
                        fragment = '}}';
                        numUnclosed -= 2;
                        i++;
                    }
                    else {
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
                const galleryIndexMap = Object.entries(indexMap).reduce((acc, [index, obj]) => {
                    if (obj.type === 'gallery') {
                        const startIndex = parseInt(index);
                        acc.push([startIndex, startIndex + obj.text.length]);
                    }
                    return acc;
                }, []);
                if (!galleryIndexMap.length) {
                    break;
                }
                const containsGallery = (startIndex, endIndex) => {
                    return galleryIndexMap.some(([galStartIndex, galEndIndex]) => startIndex < galStartIndex && galEndIndex < endIndex);
                };
                const inGallery = (index) => {
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
                    const { inner } = indexMap[temp.startIndex];
                    if (inner === null) {
                        continue;
                    }
                    // Get the param text with all pipes in it replaced with a control character
                    const paramText = wikitext.slice(inner.start, inner.end).replace(/\|/g, '\x02');
                    // `components[0]` represents the title part but this isn't what we're looking at here
                    const components = [{ key: '', value: '' }, { key: '', value: '' }];
                    for (let j = 0; j < paramText.length; j++) {
                        const realIndex = j + inner.start;
                        if (indexMap[realIndex] && indexMap[realIndex].type !== 'gallery') {
                            // Skip over skip tags, parameters, wikilinks, and templates
                            // No need to handle nested templates here because they're already in `templates`
                            // The outer `for` with `i` handles them recursively
                            processTemplateFragment(components, indexMap[realIndex].text, { nonNameComponent: true });
                            j += indexMap[realIndex].text.length - 1;
                        }
                        else if (inGallery(realIndex)) {
                            // If we're in a gallery tag, register this character without restoring pipes
                            processTemplateFragment(components, paramText[j]);
                        }
                        else if (paramText[j] === '\x02') {
                            // If we're NOT in a gallery tag and this is '\x02', restore the pipe
                            processTemplateFragment(components, '|', { isNew: true });
                        }
                        else {
                            // Just part of the parameter
                            processTemplateFragment(components, paramText[j]);
                        }
                    }
                    // Restore pipes in the newly parsed params
                    const params = components.slice(1).map(({ key, value }) => {
                        // eslint-disable-next-line no-control-regex
                        return { key: key.replace(/\x02/g, '|'), value: value.replace(/\x02/g, '|') };
                    });
                    // Hack: Update `params` in `_initializer` and recreate instance
                    if (temp instanceof mw.ParserFunction) {
                        // @ts-expect-error Modifying a private property
                        temp._initializer.params = [temp._initializer.params[0]].concat(params);
                        templates[i] = temp._clone();
                    }
                    else {
                        // @ts-expect-error Modifying a private property
                        temp._initializer.params = params;
                        templates[i] = temp._clone(options);
                    }
                }
                // eslint-disable-next-line no-constant-condition
            } while (false); // Always get out of the loop automatically
            return templates.sort((obj1, obj2) => obj1.startIndex - obj2.startIndex);
        }
        parseTemplates(config = {}) {
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
        modifyTemplates(modificationPredicate) {
            return this.modify('templates', modificationPredicate);
        }
        /**
         * Parses `[[wikilink]]` expressions in the wikitext.
         *
         * @returns An array of parsed wikilinks.
         */
        _parseWikilinks() {
            // Call _parseWikilinksFuzzy() with an index map including templates (this avoids circular calls)
            const indexMap = this.getIndexMap({ parameters: true, templates: true });
            return this._parseWikilinksFuzzy(indexMap).reduce((acc, obj) => {
                const { right, title, ...rest } = obj;
                // Process `rawTitle` and identify the insertion point of `title`
                let _rawTitle = rest.rawTitle;
                if (title === rest.rawTitle) {
                    _rawTitle = '\x01';
                }
                else {
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
                    const params = [];
                    // This is a [[File:...]] link
                    if (right === null) {
                        // This file link doesn't have any parameters
                        // Do nothing
                    }
                    else if (!right.includes('|')) {
                        // This file link is like [[File:...|param]]
                        params.push(mw.Title.clean(right));
                    }
                    else {
                        // This file link is like [[File:...|param1|param2]]
                        let text = '';
                        for (let i = 0; i < right.length; i++) {
                            // start index + [[ + rawTitle + | + i
                            const realIndex = rest.startIndex + 2 + rest.rawTitle.length + 1 + i;
                            let expr;
                            if (indexMap[realIndex] &&
                                // Ensure the param line doesn't overflow the end of this wikilink
                                // [[File:...| expr ]]
                                realIndex + (expr = indexMap[realIndex].text).length + 2 <= rest.endIndex) {
                                // Found the start of an expression (skip tag, parameter, or template)
                                text += expr;
                                i += expr.length - 1;
                            }
                            else if (right[i] === '|') {
                                // Found the start of a new file link parameter
                                params.push(mw.Title.clean(text));
                                text = '';
                            }
                            else {
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
                }
                else if (verifiedTitle) {
                    // This is a normal [[wikilink]], including [[:File:...]]
                    const initializer = {
                        display: right || undefined,
                        _rawTitle,
                        title: verifiedTitle,
                        ...rest
                    };
                    acc.push(new ParsedWikilink(initializer));
                }
                else {
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
        parseWikilinks(config = {}) {
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
        modifyWikilinks(modificationPredicate) {
            return this.modify('wikilinks', modificationPredicate);
        }
    }
    return Wikitext;
}
/**
 * Sanitize the tag name `--` to `!--`, or else return the input as is.
 * @param name
 * @returns
 */
function sanitizeNodeName(name) {
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
function createVoidTagObject(nodeName, startTag, startIndex, nestLevel, selfClosing, pseudoVoid, skip) {
    return {
        name: nodeName, // Not calling sanitizeNodeName because this is never a comment tag
        get text() {
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
// Interfaces and private members for "parseSections"
/**
 * Remove (all) `<!-- comment tags -->` from a string.
 * @param str
 * @returns
 */
function removeComments(str) {
    return str.replace(/<!--.*?-->/g, '');
}
/**
 * Internal function to generate the index map of a template.
 *
 * @param indexMap The index map to modify in place.
 * @param obj The template instance.
 */
function createTemplateIndexMap(indexMap, obj) {
    const { text, startIndex, endIndex } = obj;
    let rawTitle;
    let isTemplate = true;
    if ('rawTitle' in obj) {
        rawTitle = obj.rawTitle;
    }
    else {
        rawTitle = obj.rawHook;
        isTemplate = false;
    }
    // `inner` is, for templates, their right operand, and for parser functions, the text after their hook
    const inner = (() => {
        const start = startIndex + 2 + rawTitle.length + (isTemplate ? 1 : 0);
        const end = endIndex - 2;
        return end - start > 1 ? { start, end } : null;
    })();
    indexMap[startIndex] = {
        text,
        type: 'template',
        inner
    };
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
function processTemplateFragment(components, fragment, options = {}) {
    // Determine which element to modify: either a new element for a new parameter or an existing one
    const { nonNameComponent, isNew } = options;
    const i = isNew ? components.length : Math.max(components.length - 1, 0);
    // Initialize the element if it does not exist
    if (!(i in components)) {
        components[i] = { key: '', value: '' };
    }
    // Process the fragment and update the `components` array
    let equalIndex;
    if (i === 0 && nonNameComponent) {
        // `components[0]` handler (looking for a template title): extra characters
        components[i].value += fragment;
    }
    else if (i === 0) {
        // `components[0]` handler (looking for a template title): part of the title
        components[i].key += fragment;
        components[i].value += fragment;
    }
    else if (
    // `equalIndex` is basically 0 if found
    (equalIndex = fragment.indexOf('=')) !== -1 &&
        !components[i].key &&
        // Ignore {{=}}. `components[i].value` should end with "{{" when `equalIndex` is 0
        // TODO: This doesn't handle "<!--{{=}}-->"
        !/\{\{[\s_\u200E\u200F\u202A-\u202E]*$/.test(components[i].value) &&
        !nonNameComponent) {
        // Found `=` when `key` is empty, indicating the start of a named parameter.
        components[i].key = components[i].value + fragment.slice(0, equalIndex);
        components[i].value = components[i].value.slice(components[i].key.length + 1);
    }
    else {
        if (!components[i].value && fragment.startsWith('|')) {
            fragment = fragment.slice(1); // Exclude the pipe that starts a template parameter
        }
        components[i].value += fragment;
    }
}
