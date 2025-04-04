"use strict";
/**
 * This module serves to parse titles into an object structure.
 *
 * - For static members including the constructor, see {@link TitleStatic}. This
 * is the classes's wrapper accessible via {@link Mwbot.Title}.
 * - For instance members, see {@link Title}.
 *
 * ### Credits
 * This module is a substantial copy of the `mediawiki.Title` module in MediaWiki core (GNU General Public License v2).
 * * {@link https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/2af1c3c901a6117fe062e1fd88c0146cffa1481d/resources/src/mediawiki.Title/Title.js | mediawiki.Title} (original source code)
 * * {@link https://doc.wikimedia.org/mediawiki-core/master/js/mw.Title.html | Documentation in MediaWiki core}
 *
 * Some methods are adapted from {@link https://gerrit.wikimedia.org/g/mediawiki/core/+/92f2f6c4dcedb9ed4186d77923b8b89ae1b22efe/includes/title/Title.php | Title.php}
 * to incorporate interwiki functionality.
 *
 * @module
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TitleFactory = TitleFactory;
const phpCharMap_1 = require("./phpCharMap");
const mwString = __importStar(require("./String"));
/**
 * @internal
 */
function TitleFactory(config, info) {
    // Private members
    const namespaceIds = config.get('wgNamespaceIds');
    const wgFormattedNamespaces = config.get('wgFormattedNamespaces');
    const NS_MAIN = namespaceIds[''];
    const NS_TALK = namespaceIds.talk;
    const NS_SPECIAL = namespaceIds.special;
    const NS_MEDIA = namespaceIds.media;
    const NS_FILE = namespaceIds.file;
    const FILENAME_MAX_BYTES = 240;
    const TITLE_MAX_BYTES = 255;
    /**
     * Get the namespace id from a namespace name (either from the localized, canonical or alias
     * name).
     *
     * Example: On a German wiki this would return 6 for any of `File`, `Datei`, `Image` or
     * even `Bild`.
     *
     * @param ns Namespace name (case insensitive, leading/trailing space ignored)
     * @return Namespace id or false
     */
    const getNsIdByName = function (ns) {
        // Don't cast non-strings to strings, because null or undefined should not result in
        // returning the id of a potential namespace called "Null:" (e.g. on null.example.org/wiki)
        // Also, toLowerCase throws exception on null/undefined, because it is a String method.
        if (typeof ns !== 'string') {
            return false;
        }
        const id = namespaceIds[ns.toLowerCase()];
        if (id === undefined) {
            return false;
        }
        return id;
    };
    /**
     * @param namespace that may or may not exist
     * @return
     */
    const isKnownNamespace = function (namespace) {
        return namespace === NS_MAIN || wgFormattedNamespaces[namespace] !== undefined;
    };
    /**
     * @param namespace that is valid and known. Callers should call {@link isKnownNamespace}
     * before executing this method.
     * @return
     */
    const getNamespacePrefix = function (namespace) {
        return namespace === NS_MAIN ?
            '' :
            (wgFormattedNamespaces[namespace].replace(/ /g, '_') + ':');
    };
    const rUnderscoreTrim = /^_+|_+$/g;
    const rSplit = /^(.+?)_*:_*(.*)$/;
    // See MediaWikiTitleCodec.php#getTitleInvalidRegex
    const rInvalid = new RegExp(
    /**
     * `legaltitlechars` are representations of UTF-8 bytes (as used in PHP)...
     * It's so damn ridiculous that the data from <strong>JSON</strong> don't work for JS.
     * See https://phabricator.wikimedia.org/T253310.
     */
    // '[^' + config.get('wgLegalTitleChars') + ']' +
    '[^' + ' %!"$&\'()*,\\-./0-9:;=?@A-Z\\\\\\^_`a-z~+\\u0080-\\uFFFF' + ']' +
        // URL percent encoding sequences interfere with the ability
        // to round-trip titles -- you can't link to them consistently.
        '|%[\\dA-Fa-f]{2}' +
        // XML/HTML character references produce similar issues.
        '|&[\\dA-Za-z\u0080-\uFFFF]+;');
    // From MediaWikiTitleCodec::splitTitleString() in PHP
    // Note that this is not equivalent to /\s/, e.g. underscore is included, tab is not included.
    const rWhitespace = /[ _\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/g;
    // From MediaWikiTitleCodec::splitTitleString() in PHP
    const rUnicodeBidi = /[\u200E\u200F\u202A-\u202E]+/g;
    /**
     * Slightly modified from Flinfo. Credit goes to Lupo and Flominator.
     */
    const sanitationRules = [
        // "signature"
        {
            pattern: /~{3}/g,
            replace: '',
            generalRule: true
        },
        // control characters
        {
            // eslint-disable-next-line no-control-regex
            pattern: /[\x00-\x1f\x7f]/g,
            replace: '',
            generalRule: true
        },
        // URL encoding (possibly)
        {
            pattern: /%([\dA-Fa-f]{2})/g,
            replace: '% $1',
            generalRule: true
        },
        // HTML-character-entities
        {
            pattern: /&(([\dA-Za-z\x80-\xff]+|#\d+|#x[\dA-Fa-f]+);)/g,
            replace: '& $1',
            generalRule: true
        },
        // slash, colon (not supported by file systems like NTFS/Windows, Mac OS 9 [:], ext4 [/])
        {
            pattern: new RegExp('[' + (config.get('wgIllegalFileChars') || ':/\\\\') + ']', 'g'),
            replace: '-',
            fileRule: true
        },
        // brackets, greater than
        {
            pattern: /[}\]>]/g,
            replace: ')',
            generalRule: true
        },
        // brackets, lower than
        {
            pattern: /[{[<]/g,
            replace: '(',
            generalRule: true
        },
        // everything that wasn't covered yet
        {
            pattern: new RegExp(rInvalid.source, 'g'),
            replace: '-',
            generalRule: true
        },
        // directory structures
        {
            pattern: /^(\.|\.\.|\.\/.*|\.\.\/.*|.*\/\.\/.*|.*\/\.\.\/.*|.*\/\.|.*\/\.\.)$/g,
            replace: '',
            generalRule: true
        }
    ];
    /**
     * Check if an interwiki prefix is valid.
     *
     * *This function is exclusive to `mwbot-ts`.*
     *
     * @param prefix The interwiki prefix. The function internally lowercases it.
     * @returns
     */
    const isValidInterwiki = (prefix) => {
        prefix = Title.lc(prefix);
        return info.interwikimap.some((obj) => obj.prefix === prefix);
    };
    /**
     * An array of interwiki prefixes for the local project (e.g., `ja` for jawiki).
     *
     * *This variable is exclusive to `mwbot-ts`.*
     */
    const localInterwikis = info.interwikimap.reduce((acc, { prefix, localinterwiki }) => {
        if (localinterwiki) {
            acc.push(prefix);
        }
        return acc;
    }, []);
    /**
     * Get the subject namespace index for a given namespace.
     * Special namespaces (`NS_MEDIA`, `NS_SPECIAL`) are always the subject.
     *
     * *This function is exclusive to `mwbot-ts`.*
     *
     * @param index Namespace index
     * @return
     */
    const getSubject = (index) => {
        if (index < NS_MAIN) {
            return index;
        }
        return Title.isTalkNamespace(index)
            ? index - 1
            : index;
    };
    /**
     * An attemped copy of `MainConfigNames::CapitalLinkOverrides`.
     *
     * *This variable is exclusive to `mwbot-ts`.*
     */
    const CAPITAL_LINK_OVERRIDES = {};
    /**
     * Array of the IDs of namespaces whose first letters are always capitalized.
     *
     * *This variable is exclusive to `mwbot-ts`.*
     */
    const ALWAYS_CAPITALIZED_NAMESPACES = Object.values(info.namespaces).reduce((acc, obj) => {
        if (obj.case === 'first-letter') {
            acc.push(obj.id);
        }
        else { // "case-sensitive"
            CAPITAL_LINK_OVERRIDES[obj.id] = false; // TODO: In theory this can be true
        }
        return acc;
    }, []);
    /**
     * Is the namespace first-letter capitalized?
     *
     * *This function is exclusive to `mwbot-ts`.*
     *
     * @param index Index to check
     * @return
     */
    const isCapitalized = (index) => {
        // Turn NS_MEDIA into NS_FILE
        index = index === NS_MEDIA ? NS_FILE : index;
        // Make sure to get the subject of our namespace
        index = getSubject(index);
        // Some namespaces are special and should always be upper case
        if (ALWAYS_CAPITALIZED_NAMESPACES.includes(index)) {
            return true;
        }
        if (index in CAPITAL_LINK_OVERRIDES) {
            // CapitalLinkOverrides is explicitly set
            return CAPITAL_LINK_OVERRIDES[index];
        }
        // Default to the global setting
        return info.general.case === 'first-letter';
    };
    /**
     * Internal helper for #constructor and #newFromText.
     *
     * Based on {@link https://gerrit.wikimedia.org/g/mediawiki/core/+/1103f2b18aaa14050cdd9602daf21569fb9a4636/includes/title/TitleParser.php#183 | TitleParser::splitTitleString }.
     *
     * @param title
     * @param defaultNamespace
     * @return
     */
    const parse = function (title, defaultNamespace = NS_MAIN) {
        let namespace = parseInt(defaultNamespace) || NS_MAIN;
        title = title
            // Strip Unicode bidi override characters
            .replace(rUnicodeBidi, '')
            // Normalise whitespace to underscores and remove duplicates
            .replace(rWhitespace, '_')
            // Trim underscores
            .replace(rUnderscoreTrim, '');
        if (title.includes('\uFFFD')) {
            // Contained illegal UTF-8 sequences or forbidden Unicode chars.
            // Commonly occurs when the text was obtained using the `URL` API, and the 'title' parameter
            // was using a legacy 8-bit encoding, for example:
            // new URL('https://en.wikipedia.org/w/index.php?title=Apollo%96Soyuz').searchParams.get('title')
            return false;
        }
        // Process initial colon
        let colon = '';
        if (title !== '' && title[0] === ':') {
            // Initial colon means main namespace instead of specified default
            namespace = NS_MAIN;
            title = title
                // Strip colon
                .slice(1)
                // Trim underscores
                .replace(rUnderscoreTrim, '');
            colon = ':';
        }
        if (title === '') {
            return false;
        }
        // Process namespace or interwiki prefix (if any)
        const parts = title.split(/_*:_*/);
        let iw = [];
        let local_interwiki = false;
        if (parts.length > 1) {
            let ns = null;
            title = parts[parts.length - 1];
            for (let i = parts.length - 2; i >= 0; i--) { // Start from the second last
                const nsId = getNsIdByName(parts[i]);
                const iwPrefix = isValidInterwiki(parts[i]) && Title.lc(parts[i]);
                if (nsId !== false && iwPrefix !== false) {
                    // The prefix can be either a ns prefix or an iw prefix
                    if (ns !== null || iw.length) {
                        // If ns/iw prefix has previously been processed, that's an iw prefix
                        if (localInterwikis.includes(iwPrefix)) {
                            // Local interwiki should be erased
                            // e.g., on enwiki, "en:Main_page" is the same as "Main_page"
                            local_interwiki = true;
                        }
                        else {
                            // Interwiki resets the default namespace because there's no guarantee that
                            // the interwiki project has a specific namespace
                            ns = NS_MAIN;
                            // e.g., in "w:en:Main_page" and if we're parsing "w", "Main_page" is the title,
                            // where `parts = ['w', 'en', 'Main_page']` and iw = ['en']
                            title = parts.slice(i + iw.length + 1).join(':');
                            // Register the valid interwiki
                            iw.unshift(iwPrefix);
                        }
                    }
                    else {
                        // If no prefix has previously been processed, that's an ns prefix
                        ns = nsId;
                    }
                }
                else if (nsId !== false) {
                    if (nsId === NS_MAIN) {
                        // Empty string was passed to getNsIdByName
                        // This occurs when the title has a "::" sequence
                        title = ':' + title;
                    }
                    else if (ns === NS_TALK) {
                        // Found Talk: in a previous iteration
                        // Disallow titles like Talk:File:x
                        return false;
                    }
                    else {
                        if (iw.length) {
                            // Disallow titles like Talk:Interwiki:x
                            if (nsId === NS_TALK) {
                                return false;
                            }
                            // Ns prefix precedes interwiki: that resets the ns-title division
                            // e.g., "Wikipedia:en:Foo" is "en:Foo" in the Wikipedia namespace
                            iw = [];
                            local_interwiki = false;
                            title = parts.slice(i + 1).join(':');
                        }
                        else if (ns !== null) {
                            // Ns prefix was previously found: that resets the ns-title division
                            // e.g., "Category:Template:Foo" where "Template:Foo" is the new title
                            title = parts.slice(i + 1).join(':');
                        }
                        ns = nsId;
                    }
                }
                else if (iwPrefix !== false) {
                    if (localInterwikis.includes(iwPrefix)) {
                        local_interwiki = true;
                    }
                    else {
                        ns = NS_MAIN;
                        title = parts.slice(i + iw.length + 1).join(':');
                        iw.unshift(iwPrefix);
                    }
                }
                else if (ns === null && !iw.length) {
                    // Just a title containing ":"
                    title = parts[i] + ':' + title;
                }
            }
            namespace = ns !== null ? ns : NS_MAIN;
        }
        // Handle empty title
        const interwiki = iw.join(':');
        if (title === '') {
            if (iw.length) {
                // Empty iw-links should point to the Main Page
                // e.g., "mw:" is redirected to "mw:Main page"
                const ret = {
                    namespace: NS_MAIN,
                    title: 'Main page',
                    fragment: null,
                    colon,
                    interwiki,
                    local_interwiki: true
                };
                return ret;
            }
            else {
                // Namespace prefix only or entirely empty title; consistently invalid
                return false;
            }
        }
        // Process fragment
        const i = title.indexOf('#');
        let fragment;
        if (i === -1) {
            fragment = null;
        }
        else {
            fragment = title
                // Get segment starting after the hash
                .slice(i + 1)
                // Convert to text
                // NB: Must not be trimmed ("Example#_foo" is not the same as "Example#foo")
                .replace(/_/g, ' ');
            title = title
                // Strip hash
                .slice(0, i)
                // Trim underscores, again (strips "_" from "bar" in "Foo_bar_#quux")
                .replace(rUnderscoreTrim, '');
        }
        // Reject illegal characters
        if (rInvalid.test(title)) {
            return false;
        }
        // Disallow titles that browsers or servers might resolve as directory navigation
        if (title.indexOf('.') !== -1 && (title === '.' || title === '..' ||
            title.indexOf('./') === 0 ||
            title.indexOf('../') === 0 ||
            title.indexOf('/./') !== -1 ||
            title.indexOf('/../') !== -1 ||
            title.slice(-2) === '/.' ||
            title.slice(-3) === '/..')) {
            return false;
        }
        // Disallow magic tilde sequence
        if (title.indexOf('~~~') !== -1) {
            return false;
        }
        // Disallow titles exceeding the TITLE_MAX_BYTES byte size limit (size of underlying database field)
        // Except for special pages, e.g. [[Special:Block/Long name]]
        // Note: The PHP implementation also asserts that even in NS_SPECIAL, the title should
        // be less than 512 bytes.
        if (namespace !== NS_SPECIAL && mwString.byteLength(title) > TITLE_MAX_BYTES) {
            return false;
        }
        /*
        TODO: Need a function to validate IPv6 addresses
        // Allow IPv6 usernames to start with '::' by canonicalizing IPv6 titles.
        // IP names are not allowed for accounts, and can only be referring to
        // edits from the IP. Given '::' abbreviations and caps/lowercaps,
        // there are numerous ways to present the same IP. Having sp:contribs scan
        // them all is silly and having some show the edits and others not is
        // inconsistent. Same for talk/userpages. Keep them normalized instead.
        if ( $dbkey !== '' && ( $parts['namespace'] === NS_USER || $parts['namespace'] === NS_USER_TALK ) ) {
            $dbkey = IPUtils::sanitizeIP( $dbkey );
            // IPUtils::sanitizeIP return null only for bad input
            '@phan-var string $dbkey';
        }
        */
        // Any remaining initial :s are illegal.
        if (title[0] === ':') {
            return false;
        }
        return {
            namespace,
            title,
            fragment,
            colon,
            interwiki,
            local_interwiki
        };
    };
    /**
     * Convert db-key to readable text.
     *
     * @param s
     * @return
     */
    const text = function (s) {
        return s.replace(/_/g, ' ');
    };
    /**
     * Sanitizes a string based on a rule set and a filter
     *
     * @param s
     * @param filter
     * @return
     */
    const sanitize = function (s, filter) {
        const rules = sanitationRules;
        for (let i = 0, ruleLength = rules.length; i < ruleLength; ++i) {
            const rule = rules[i];
            for (let m = 0, filterLength = filter.length; m < filterLength; ++m) {
                if (rule[filter[m]]) {
                    s = s.replace(rule.pattern, rule.replace);
                }
            }
        }
        return s;
    };
    /**
     * Cuts a string to a specific byte length, assuming UTF-8
     * or less, if the last character is a multi-byte one
     *
     * @param s
     * @param length
     * @return
     */
    const trimToByteLength = function (s, length) {
        return mwString.trimByteLength('', s, length).newVal;
    };
    /**
     * Cuts a file name to a specific byte length
     *
     * @param name without extension
     * @param extension file extension
     * @return The full name, including extension
     */
    const trimFileNameToByteLength = function (name, extension) {
        // There is a special byte limit for file names and ... remember the dot
        return trimToByteLength(name, FILENAME_MAX_BYTES - extension.length - 1) + '.' + extension;
    };
    /**
     * Encode page titles in a way that matches `wfUrlencode` in PHP.
     *
     * *This function is exclusive to `mwbot-ts`.*
     *
     * @param str
     * @return
     */
    /* Disabled while Title.getUrl is disabled
    const wikiUrlencode = function(str: string): string {
        // https://gerrit.wikimedia.org/g/mediawiki/core/+/a0bb8b1f7e9d237026628906f7e61f1faee3af01/resources/src/mediawiki.base/mediawiki.base.js#282
        return encodeURIComponent(String(str))
            .replace(/'/g, '%27')
            .replace(/%20/g, '_')
            .replace(/%3B/g, ';')
            .replace(/%40/g, '@')
            .replace(/%24/g, '$')
            .replace(/%2C/g, ',')
            .replace(/%2F/g, '/')
            .replace(/%3A/g, ':');
    };
    */
    /**
     * Matches lowercase characters (including Greek and others) that have
     * different capitalization behavior in PHP's strtoupper.
     *
     * *This variable is exclusive to `mwbot-ts`.*
     */
    const rUpperPhpChars = new RegExp(`[${Object.keys(phpCharMap_1.toUpperMap).join('')}]`);
    /**
     * Matches uppercase characters (including Greek and others) that have
     * different capitalization behavior in PHP's strtolower.
     *
     * *This variable is exclusive to `mwbot-ts`.*
     */
    const rLowerPhpChars = new RegExp(`[${Object.keys(phpCharMap_1.toLowerMap).join('')}]`);
    class Title {
        constructor(title, namespace = NS_MAIN) {
            const parsed = parse(title, namespace);
            if (!parsed) {
                throw new Error('Unable to parse title.');
            }
            this.namespace = parsed.namespace;
            this.title = parsed.title;
            this.fragment = parsed.fragment;
            this.colon = parsed.colon;
            this.interwiki = parsed.interwiki;
            this.local_interwiki = parsed.local_interwiki;
        }
        static clean(str, trim = true) {
            str = str.replace(rUnicodeBidi, '');
            return trim ? str.trim() : str;
        }
        static newFromText(title, namespace = NS_MAIN) {
            const parsed = parse(title, namespace);
            if (!parsed) {
                return null;
            }
            const t = Object.create(Title.prototype);
            t.namespace = parsed.namespace;
            t.title = parsed.title;
            t.fragment = parsed.fragment;
            t.colon = parsed.colon;
            t.interwiki = parsed.interwiki;
            t.local_interwiki = parsed.local_interwiki;
            return t;
        }
        static makeTitle(namespace, title, fragment = '', interwiki = '') {
            if (!isKnownNamespace(namespace)) {
                return null;
            }
            else {
                if (fragment && fragment[0] !== '#') {
                    fragment = '#' + fragment;
                }
                if (interwiki && !/:[^\S\r\n]*$/.test(interwiki)) {
                    interwiki += ':';
                }
                return Title.newFromText(interwiki + getNamespacePrefix(namespace) + title + fragment);
            }
        }
        static newFromUserInput(title, defaultNamespace = NS_MAIN, options = { forUploading: true }) {
            let namespace = parseInt(defaultNamespace) || NS_MAIN;
            // Normalise additional whitespace
            title = title.replace(/\s/g, ' ').trim();
            // Process initial colon
            if (title !== '' && title[0] === ':') {
                // Initial colon means main namespace instead of specified default
                namespace = NS_MAIN;
                title = title
                    // Strip colon
                    .slice(1)
                    // Trim underscores
                    .replace(rUnderscoreTrim, '');
            }
            // Process namespace prefix (if any)
            const m = title.match(rSplit);
            if (m) {
                const id = getNsIdByName(m[1]);
                if (id !== false) {
                    // Ordinary namespace
                    namespace = id;
                    title = m[2];
                }
            }
            if (namespace === NS_MEDIA ||
                (options.forUploading && (namespace === NS_FILE))) {
                title = sanitize(title, ['generalRule', 'fileRule']);
                // Operate on the file extension
                // Although it is possible having spaces between the name and the ".ext" this isn't nice for
                // operating systems hiding file extensions -> strip them later on
                const lastDot = title.lastIndexOf('.');
                // No or empty file extension
                if (lastDot === -1 || lastDot >= title.length - 1) {
                    return null;
                }
                // Get the last part, which is supposed to be the file extension
                const ext = title.slice(lastDot + 1);
                // Remove whitespace of the name part (that without extension)
                title = title.slice(0, lastDot).trim();
                // Cut, if too long and append file extension
                title = trimFileNameToByteLength(title, ext);
            }
            else {
                title = sanitize(title, ['generalRule']);
                // Cut titles exceeding the TITLE_MAX_BYTES byte size limit
                // (size of underlying database field)
                if (namespace !== NS_SPECIAL) {
                    title = trimToByteLength(title, TITLE_MAX_BYTES);
                }
            }
            // Any remaining initial :s are illegal.
            title = title.replace(/^:+/, '');
            return Title.newFromText(title, namespace);
        }
        static newFromFileName(uncleanName) {
            return Title.newFromUserInput('File:' + uncleanName);
        }
        /*
        Title.newFromImg = function(img) {
            const src = img.jquery ? img[0].src : img.src,
                data = mw.util.parseImageUrl(src);
            return data ? Title.newFromText('File:' + data.name) : null;
        };
        */
        static isTalkNamespace(namespaceId) {
            return namespaceId > NS_MAIN && namespaceId % 2 === 1;
        }
        /*
        Title.wantSignaturesNamespace = function(namespaceId) {
            return Title.isTalkNamespace(namespaceId) ||
                config.get('wgExtraSignatureNamespaces').indexOf(namespaceId) !== -1;
        };
        */
        static exists(title) {
            const obj = Title.exist.pages;
            let match;
            if (typeof title === 'string') {
                match = obj[title];
            }
            else if (title instanceof Title) {
                match = obj[title.toString()];
            }
            else {
                throw new Error('Title.exists: title must be a string or an instance of Title');
            }
            if (typeof match !== 'boolean') {
                return null;
            }
            return match;
        }
        static normalizeExtension(extension) {
            const lower = extension.toLowerCase();
            const normalizations = {
                htm: 'html',
                jpeg: 'jpg',
                mpeg: 'mpg',
                tiff: 'tif',
                ogv: 'ogg'
            };
            if (Object.hasOwnProperty.call(normalizations, lower)) {
                return normalizations[lower];
            }
            else if (/^[\da-z]+$/.test(lower)) {
                return lower;
            }
            else {
                return '';
            }
        }
        static phpCharToUpper(chr) {
            const mapped = phpCharMap_1.toUpperMap[chr];
            if (mapped === 0) {
                // Optimisation: When the override is to keep the character unchanged,
                // we use 0 in JSON. This reduces the data by 50%.
                return chr;
            }
            return mapped || chr.toUpperCase();
        }
        static phpCharToLower(chr) {
            return phpCharMap_1.toLowerMap[chr] || chr.toLowerCase();
        }
        static uc(str) {
            if (rUpperPhpChars.test(str)) {
                return Array.from(str).reduce((acc, char) => acc += Title.phpCharToUpper(char), '');
            }
            return str.toUpperCase();
        }
        static lc(str) {
            if (rLowerPhpChars.test(str)) {
                return Array.from(str).reduce((acc, char) => acc += Title.phpCharToLower(char), '');
            }
            return str.toLowerCase();
        }
        hadLeadingColon() {
            return this.colon !== '';
        }
        isExternal() {
            return this.interwiki !== '';
        }
        isLocal() {
            if (this.isExternal()) {
                const prefixes = this.interwiki.split(':');
                const bools = [];
                for (const prefix of prefixes) {
                    // Title::isLocal only involves the code in this "for" block.
                    // Additional codes are necessary because we look at an array instead of a string
                    // In theory, if one of the interwikis is local, that IS local. But since the Title is user-defined,
                    // we might encounter cases where local and non-local interwikis are mixed;
                    // hence ensure that all the interwikis are local.
                    const iw = info.interwikimap.find((obj) => obj.prefix === prefix);
                    if (iw) {
                        bools.push(!!iw.local);
                    }
                }
                if (bools.length === prefixes.length) {
                    return bools.every(Boolean);
                }
            }
            return true;
        }
        getInterwiki() {
            return this.interwiki && this.interwiki + ':';
        }
        wasLocalInterwiki() {
            return this.local_interwiki;
        }
        isTrans() {
            if (!this.isExternal()) {
                return false;
            }
            const prefixes = this.interwiki.split(':');
            const bools = [];
            for (const prefix of prefixes) {
                /** See also comments in {@link isLocal}. */
                const iw = info.interwikimap.find((obj) => obj.prefix === prefix);
                if (iw) {
                    bools.push(!!iw.trans);
                }
            }
            if (bools.length === prefixes.length) {
                return bools.every(Boolean);
            }
            return false;
        }
        getNamespaceId() {
            return this.namespace;
        }
        getNamespacePrefix() {
            return getNamespacePrefix(this.namespace);
        }
        getFileNameWithoutExtension() {
            const ext = this.getExtension();
            if (ext === null) {
                return this.getMain();
            }
            return this.getMain().slice(0, -ext.length - 1);
        }
        getFileNameTextWithoutExtension() {
            return text(this.getFileNameWithoutExtension());
        }
        /*
        getName(): string {
            return this.getFileNameWithoutExtension();
        }
        */
        /*
        getNameText(): string {
            return text(this.getFileNameTextWithoutExtension());
        }
        */
        getExtension() {
            const lastDot = this.title.lastIndexOf('.');
            if (lastDot === -1) {
                return null;
            }
            return this.title.slice(lastDot + 1) || null;
        }
        getMain() {
            if (config.get('wgCaseSensitiveNamespaces').indexOf(this.namespace) !== -1 ||
                !this.title.length ||
                // Normally, all wiki links are forced to have an initial capital letter so [[foo]]
                // and [[Foo]] point to the same place. Don't force it for interwikis, since the
                // other site might be case-sensitive.
                !(this.interwiki === '' && isCapitalized(this.namespace))) {
                return this.title;
            }
            const firstChar = mwString.charAt(this.title, 0);
            return Title.phpCharToUpper(firstChar) + this.title.slice(firstChar.length);
        }
        getMainText() {
            return text(this.getMain());
        }
        getPrefixedDb(options = {}) {
            if (!('interwiki' in options)) {
                options.interwiki = true;
            }
            const colon = options.colon ? this.colon : '';
            const interwiki = options.interwiki ? this.getInterwiki() : '';
            let fragment = options.fragment ? this.getFragment() || '' : '';
            fragment = fragment && '#' + fragment;
            return colon + interwiki + this.getNamespacePrefix() + this.getMain() + fragment;
        }
        getPrefixedText(options = {}) {
            if (!('interwiki' in options)) {
                options.interwiki = true;
            }
            const colon = options.colon ? this.colon : '';
            const interwiki = options.interwiki ? this.getInterwiki() : '';
            let fragment = options.fragment ? this.getFragment() || '' : '';
            fragment = fragment && '#' + fragment;
            // NOTE: Interwiki prefixes might contain obligatory underscores
            return colon + interwiki + text(this.getNamespacePrefix() + this.getMain() + fragment);
        }
        getRelativeText(namespace) {
            if (this.getNamespaceId() === namespace) {
                return this.getMainText();
            }
            else if (this.getNamespaceId() === NS_MAIN) {
                return ':' + this.getPrefixedText({ interwiki: false });
            }
            else {
                return this.getPrefixedText({ interwiki: false });
            }
        }
        getFragment() {
            return this.fragment;
        }
        /* Disabled because this method can confuse the user regarding interwiki prefixes.
        getUrl(params: string[][] | Record<string, string> | string | URLSearchParams = {}): string {
            // This method is radically modified from the original because it internally calls mw.util.getUrl
            // https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/2af1c3c901a6117fe062e1fd88c0146cffa1481d/resources/src/mediawiki.Title/Title.js#973
            // https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/b714a10356cb3568516979edf51f9334901b8373/resources/src/mediawiki.util/util.js#282

            if (!(params instanceof URLSearchParams)) {
                params = new URLSearchParams(params); // Alternative to jQuery.params
            }

            // At line 315 in mediawiki.util, "fragment" is passed to "util.escapeIdForLink"
            // This simply replaces spaces to underscores without percent-encoding the fragment
            let fragment = this.getFragment() || '';
            fragment = fragment && ('#' + fragment).replace(/ /g, '_');

            // When there's a query parameter, use "/w/index.php"; otherwise, use "/wiki/$1"
            let directory;
            if (params.size) {
                // If the query parameters have a "title=" param, the output can include two of them as duplicates
                // This looks like a bug to me, but it's how mw.util.getUrl works
                directory = config.get('wgScript');
                return directory + '?title=' + wikiUrlencode(this.toString()) + '&' + params + fragment;
            } else {
                directory = config.get('wgArticlePath').replace('$1', () => wikiUrlencode(this.toString()));
                return directory + fragment;
            }
        }
        */
        isTalkPage() {
            return Title.isTalkNamespace(this.getNamespaceId());
        }
        getTalkPage() {
            if (!this.canHaveTalkPage() || this.isExternal()) {
                return null;
            }
            return this.isTalkPage() ?
                this :
                Title.makeTitle(this.getNamespaceId() + 1, this.getMainText(), '', this.interwiki);
        }
        getSubjectPage() {
            if (this.isExternal()) {
                return null;
            }
            return this.isTalkPage() ?
                Title.makeTitle(this.getNamespaceId() - 1, this.getMainText(), '', this.interwiki) :
                this;
        }
        canHaveTalkPage() {
            return this.getNamespaceId() >= NS_MAIN;
        }
        exists() {
            return Title.exists(this);
        }
        toString() {
            return this.getPrefixedDb();
        }
        toText() {
            return this.getPrefixedText();
        }
        equals(title, evalFragment = false) {
            if (!(title instanceof Title)) {
                const t = Title.newFromText(String(title));
                if (t === null) {
                    return null;
                }
                title = t;
            }
            const options = { fragment: evalFragment };
            return this.getPrefixedDb(options) === title.getPrefixedDb(options);
        }
    }
    Title.exist = {
        pages: {},
        set: function (titles, state) {
            const pages = this.pages;
            titles = Array.isArray(titles) ? titles : [titles];
            state = state === undefined ? true : !!state;
            for (let i = 0, len = titles.length; i < len; i++) {
                pages[titles[i]] = state;
            }
            return true;
        }
    };
    return Title;
}
