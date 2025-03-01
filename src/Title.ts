/**
 * This module is attached to {@link Mwbot.Title} as a static member of the class.
 *
 * Adapted from the `mediawiki.Title` module in MediaWiki core.
 * @see https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/2af1c3c901a6117fe062e1fd88c0146cffa1481d/resources/src/mediawiki.Title/Title.js
 */

import type { Mwbot } from './mwbot';
import toUpperMap from './phpCharToUpper';
import * as mwString from './String';

export default function(mw: Mwbot) {

	// Private members

	const config = mw.config;
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
	 * Example: On a German wiki this would return 6 for any of 'File', 'Datei', 'Image' or
	 * even 'Bild'.
	 *
	 * @param ns Namespace name (case insensitive, leading/trailing space ignored)
	 * @return Namespace id or false
	 */
	const getNsIdByName = function(ns: string): number | false {
		// Don't cast non-strings to strings, because null or undefined should not result in
		// returning the id of a potential namespace called "Null:" (e.g. on null.example.org/wiki)
		// Also, toLowerCase throws exception on null/undefined, because it is a String method.
		if (typeof ns !== 'string') {
			return false;
		}
		// TODO: Should just use the local variable namespaceIds here, but it
		// breaks test which modify the config
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
	const isKnownNamespace = function(namespace: number): boolean {
		return namespace === NS_MAIN || wgFormattedNamespaces[namespace] !== undefined;
	};
	/**
	 * @param namespace that is valid and known. Callers should call
	 *  `isKnownNamespace` before executing this method.
	 * @return
	 */
	const getNamespacePrefix = function(namespace: number): string {
		return namespace === NS_MAIN ?
			'' :
			(wgFormattedNamespaces[namespace].replace(/ /g, '_') + ':');
	};
	const rUnderscoreTrim = /^_+|_+$/g;
	const rSplit = /^(.+?)_*:_*(.*)$/;
	// See MediaWikiTitleCodec.php#getTitleInvalidRegex
	const rInvalid = new RegExp(
		'[^' + mw.config.get('wgLegalTitleChars') + ']' +
		// URL percent encoding sequences interfere with the ability
		// to round-trip titles -- you can't link to them consistently.
		'|%[\\dA-Fa-f]{2}' +
		// XML/HTML character references produce similar issues.
		'|&[\\dA-Za-z\u0080-\uFFFF]+;'
	);
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
		{ // TODO: Any way to fetch "wgIllegalFileChars" from the API?
			pattern: new RegExp('[' + (mw.config.get('wgIllegalFileChars') || ':/\\\\') + ']', 'g'),
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
	 * Internal helper for #constructor and #newFromText.
	 *
	 * Based on Title.php#secureAndSplit
	 *
	 * @method parse
	 * @param title
	 * @param defaultNamespace
	 * @return
	 */
	const parse = function(title: string, defaultNamespace = NS_MAIN)
		: {namespace: number; title: string; fragment: string | null;} | false
	{
		let namespace = defaultNamespace === undefined ? NS_MAIN : defaultNamespace;
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
		if (title !== '' && title[0] === ':') {
			// Initial colon means main namespace instead of specified default
			namespace = NS_MAIN;
			title = title
				// Strip colon
				.slice(1)
				// Trim underscores
				.replace(rUnderscoreTrim, '');
		}
		if (title === '') {
			return false;
		}
		// Process namespace prefix (if any)
		let m = title.match(rSplit);
		if (m) {
			const id = getNsIdByName(m[1]);
			if (id !== false) {
				// Ordinary namespace
				namespace = id;
				title = m[2];
				// For Talk:X pages, make sure X has no "namespace" prefix
				if (namespace === NS_TALK && (m = title.match(rSplit))) {
					// Disallow titles like Talk:File:x (subject should roundtrip: talk:file:x -> file:x -> file_talk:x)
					if (getNsIdByName(m[1]) !== false) {
						return false;
					}
				}
			}
		}
		// Process fragment
		const i = title.indexOf('#');
		let fragment;
		if (i === -1) {
			fragment = null;
		} else {
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
		if (
			title.indexOf('.') !== -1 && (
				title === '.' || title === '..' ||
				title.indexOf('./') === 0 ||
				title.indexOf('../') === 0 ||
				title.indexOf('/./') !== -1 ||
				title.indexOf('/../') !== -1 ||
				title.slice(-2) === '/.' ||
				title.slice(-3) === '/..'
			)
		) {
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
		if (namespace !== NS_SPECIAL && mwString.byteLength(title) > TITLE_MAX_BYTES ) {
			return false;
		}
		// Can't make a link to a namespace alone.
		if (title === '' && namespace !== NS_MAIN) {
			return false;
		}
		// Any remaining initial :s are illegal.
		if (title[0] === ':') {
			return false;
		}
		return {
			namespace: namespace,
			title: title,
			fragment: fragment
		};
	};
	/**
	 * Convert db-key to readable text.
	 *
	 * @param s
	 * @return
	 */
	const text = function(s: string): string {
		return s.replace(/_/g, ' ');
	};
	/**
	 * Sanitizes a string based on a rule set and a filter
	 *
	 * @param s
	 * @param filter
	 * @return
	 */
	const sanitize = function(s: string, filter: string[]): string {
		const rules = sanitationRules;
		for (let i = 0, ruleLength = rules.length; i < ruleLength; ++i) {
			const rule = rules[i];
			for (let m = 0, filterLength = filter.length; m < filterLength; ++m) {
				if (rule[filter[m] as keyof typeof rule]) {
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
	const trimToByteLength = function(s: string, length: number): string {
		return mwString.trimByteLength('', s, length).newVal;
	};
	/**
	 * Cuts a file name to a specific byte length
	 *
	 * @param name without extension
	 * @param extension file extension
	 * @return The full name, including extension
	 */
	const trimFileNameToByteLength = function(name: string, extension: string): string {
		// There is a special byte limit for file names and ... remember the dot
		return trimToByteLength(name, FILENAME_MAX_BYTES - extension.length - 1) + '.' + extension;
	};
	/**
	 * Encode page titles in a way that matches `wfUrlencode` in PHP.
	 *
	 * @param str
	 * @return
	 */
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
	/**
	 * Parse titles into an object structure. Note that when using the constructor
	 * directly, passing invalid titles will result in an exception.
	 * Use {@link newFromText} to use the logic directly and get null for invalid titles
	 * which is easier to work with.
	 *
	 * Note that in the constructor and {@link newFromText} method, `namespace` is the
	 * **default** namespace only, and can be overridden by a namespace prefix in `title`.
	 * If you do not want this behavior, use {@link makeTitle}. Compare:
	 *
	 * ```javascript
	 * new mwbot.Title('Foo', NS_TEMPLATE).getPrefixedText();
	 * // => 'Template:Foo'
	 * mwbot.Title.newFromText('Foo', NS_TEMPLATE).getPrefixedText();
	 * // => 'Template:Foo'
	 * mwbot.Title.makeTitle(NS_TEMPLATE, 'Foo').getPrefixedText();
	 * // => 'Template:Foo'
	 *
	 * new mwbot.Title('Category:Foo', NS_TEMPLATE).getPrefixedText();
	 * // => 'Category:Foo'
	 * mwbot.Title.newFromText('Category:Foo', NS_TEMPLATE).getPrefixedText();
	 * // => 'Category:Foo'
	 * mwbot.Title.makeTitle(NS_TEMPLATE, 'Category:Foo').getPrefixedText();
	 * // => 'Template:Category:Foo'
	 *
	 * new mwbot.Title('Template:Foo', NS_TEMPLATE).getPrefixedText();
	 * // => 'Template:Foo'
	 * mwbot.Title.newFromText('Template:Foo', NS_TEMPLATE).getPrefixedText();
	 * // => 'Template:Foo'
	 * mwbot.Title.makeTitle(NS_TEMPLATE, 'Template:Foo').getPrefixedText();
	 * // => 'Template:Template:Foo'
	 * ```
	 */
	class Title {
		private namespace: number;
		private title: string;
		private fragment: string | null;
		/**
		 * @param title Title of the page. If no second argument given,
		 * this will be searched for a namespace
		 * @param namespace If given, will used as default namespace for the given title
		 * @throws {Error} When the title is invalid
		 */
		constructor(title: string, namespace = NS_MAIN) {
			const parsed = parse(title, namespace);
			if (!parsed) {
				throw new Error('Unable to parse title');
			}
			this.namespace = parsed.namespace;
			this.title = parsed.title;
			this.fragment = parsed.fragment;
		}
		/* Static members */
		/**
		 * Constructor for Title objects with a null return instead of an exception for invalid titles.
		 *
		 * Note that `namespace` is the **default** namespace only, and can be overridden by a namespace
		 * prefix in `title`. If you do not want this behavior, use #makeTitle. See #constructor for
		 * details.
		 *
		 * @param title
		 * @param namespace Default namespace
		 * @return A valid Title object or null if the title is invalid
		 */
		static newFromText(title: string, namespace = NS_MAIN): Title | null {
			const parsed = parse(title, namespace);
			if (!parsed) {
				return null;
			}
			const t = Object.create(Title.prototype);
			t.namespace = parsed.namespace;
			t.title = parsed.title;
			t.fragment = parsed.fragment;
			return t;
		}
		/**
		 * Constructor for Title objects with predefined namespace.
		 *
		 * Unlike {@link newFromText} or the constructor, this function doesn't allow the given `namespace` to be
		 * overridden by a namespace prefix in `title`. See the constructor documentation for details about this behavior.
		 *
		 * The single exception to this is when `namespace` is 0, indicating the main namespace. The
		 * function behaves like {@link newFromText} in that case.
		 *
		 * @param namespace Namespace to use for the title
		 * @param title
		 * @return A valid Title object or null if the title is invalid
		 */
		static makeTitle(namespace: number, title: string): Title | null {
			if (!isKnownNamespace(namespace)) {
				return null;
			} else {
				return Title.newFromText(getNamespacePrefix(namespace) + title);
			}
		}
		/**
		 * Constructor for Title objects from user input altering that input to
		 * produce a title that MediaWiki will accept as legal.
		 *
		 * @param title
		 * @param defaultNamespace
		 *  If given, will used as default namespace for the given title.
		 * @param options additional options
		 * @param {boolean} [options.forUploading=true]
		 *  Makes sure that a file is uploadable under the title returned.
		 *  There are pages in the file namespace under which file upload is impossible.
		 *  Automatically assumed if the title is created in the Media namespace.
		 * @return A valid Title object or null if the input cannot be turned into a valid title
		 */
		static newFromUserInput(title: string, defaultNamespace = NS_MAIN, options = {forUploading : true}): Title | null {
			let namespace = parseInt(<never>defaultNamespace) || NS_MAIN;
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
			if (
				namespace === NS_MEDIA ||
				(options.forUploading && (namespace === NS_FILE))
			) {
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
			} else {
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
		/**
		 * Sanitizes a file name as supplied by the user, originating in the user's file system
		 * so it is most likely a valid MediaWiki title and file name after processing.
		 * Returns null on fatal errors.
		 *
		 * @param uncleanName The unclean file name including file extension but
		 * without namespace
		 * @return A valid Title object or null if the title is invalid
		 */
		static newFromFileName(uncleanName: string): Title | null {
			return Title.newFromUserInput('File:' + uncleanName);
		}
		// /**
		//  * Get the file title from an image element.
		//  *
		//  * @example
		//  * const title = Title.newFromImg(imageNode);
		//  *
		//  * @name Title.newFromImg
		//  * @method
		//  * @param {HTMLElement|jQuery} img The image to use as a base
		//  * @return {Title|null} The file title or null if unsuccessful
		//  */
		// Title.newFromImg = function(img) {
		// 	const src = img.jquery ? img[0].src : img.src,
		// 		data = mw.util.parseImageUrl(src);
		// 	return data ? Title.newFromText('File:' + data.name) : null;
		// };
		/**
		 * Check if a given namespace is a talk namespace.
		 *
		 * See NamespaceInfo::isTalk in PHP
		 *
		 * @param namespaceId Namespace ID
		 * @return Namespace is a talk namespace
		 */
		static isTalkNamespace(namespaceId: number): boolean {
			return namespaceId > NS_MAIN && namespaceId % 2 === 1;
		}
		// /**
		//  * Check if signature buttons should be shown in a given namespace.
		//  *
		//  * See NamespaceInfo::wantSignatures in PHP
		//  *
		//  * @name Title.wantSignaturesNamespace
		//  * @method
		//  * @param {number} namespaceId Namespace ID
		//  * @return {boolean} Namespace is a signature namespace
		//  */
		// Title.wantSignaturesNamespace = function(namespaceId) {
		// 	return Title.isTalkNamespace(namespaceId) ||
		// 		mw.config.get('wgExtraSignatureNamespaces').indexOf(namespaceId) !== -1;
		// };
		/**
		 * Whether this title exists on the wiki.
		 *
		 * @param title prefixed db-key name (string) or instance of Title
		 * @return Boolean if the information is available, otherwise null
		 * @throws {Error} If title is not a string or Title
		 */
		static exists(title: string | Title): boolean | null {
			const obj = Title.exist.pages;
			let match;
			if (typeof title === 'string') {
				match = obj[title];
			} else if (title instanceof Title) {
				match = obj[title.toString()];
			} else {
				throw new Error('Title.exists: title must be a string or an instance of Title');
			}
			if (typeof match !== 'boolean') {
				return null;
			}
			return match;
		}
		static readonly exist: {
			/**
			 * Keyed by title. Boolean true value indicates page does exist.
			 */
			pages: Record<string, boolean>;
			/**
			 * The setter function. Returns a boolean.
			 *
			 * Example to declare existing titles:
			 * ```
			 * Title.exist.set(['User:John_Doe', ...]);
			 * ```
			 *
			 * Example to declare titles nonexistent:
			 * ```
			 * Title.exist.set(['File:Foo_bar.jpg', ...], false);
			 * ```
			 * @param titles Title(s) in strict prefixedDb title form
			 * @param state State of the given titles
			 * @returns
			 */
			set: (titles: string | string[], state?: boolean) => boolean;
		} = {
			pages: {},
			set: function(titles, state) {
				const pages = this.pages;
				titles = Array.isArray(titles) ? titles : [titles];
				state = state === undefined ? true : !!state;
				for (let i = 0, len = titles.length; i < len; i++) {
					pages[titles[i]] = state;
				}
				return true;
			}
		};
		/**
		 * Normalize a file extension to the common form, making it lowercase and checking some synonyms,
		 * and ensure it's clean. Extensions with non-alphanumeric characters will be discarded.
		 * Keep in sync with File::normalizeExtension() in PHP.
		 *
		 * @param extension File extension (without the leading dot)
		 * @return File extension in canonical form
		 */
		static normalizeExtension(extension: string): string {
			const lower = extension.toLowerCase();
			const normalizations = {
				htm: 'html',
				jpeg: 'jpg',
				mpeg: 'mpg',
				tiff: 'tif',
				ogv: 'ogg'
			};
			if (Object.hasOwnProperty.call(normalizations, lower)) {
				return normalizations[lower as keyof typeof normalizations];
			} else if (/^[\da-z]+$/.test(lower)) {
				return lower;
			} else {
				return '';
			}
		}
		/**
		 * PHP's strtoupper differs from String.toUpperCase in a number of cases (T147646).
		 *
		 * @param chr Unicode character
		 * @return Unicode character, in upper case, according to the same rules as in PHP
		 */
		static phpCharToUpper(chr: string): string {
			const mapped = toUpperMap[chr as keyof typeof toUpperMap];
			if (mapped) {
				// Optimisation: When the override is to keep the character unchanged,
				// we use 0 in JSON. This reduces the data by 50%.
				return chr;
			}
			return mapped as string || chr.toUpperCase();
		}
		/**
		 * Get the namespace number.
		 *
		 * Example: 6 for "File:Example_image.svg".
		 *
		 * @return
		 */
		getNamespaceId(): number {
			return this.namespace;
		}
		/**
		 * Get the namespace prefix (in the content language).
		 *
		 * Example: "File:" for "File:Example_image.svg".
		 * In `NS_MAIN` this is '', otherwise namespace name plus ':'
		 *
		 * @return
		 */
		getNamespacePrefix(): string {
			return getNamespacePrefix(this.namespace);
		}
		/**
		 * Get the page name as if it is a file name, without extension or namespace prefix,
		 * in the canonical form with underscores instead of spaces. For example, the title
		 * `File:Example_image.svg` will be returned as `Example_image`.
		 *
		 * Note that this method will work for non-file titles but probably give nonsensical results.
		 * A title like `User:Dr._J._Fail` will be returned as `Dr._J`! Use {@link getMain} instead.
		 *
		 * @return
		 */
		getFileNameWithoutExtension(): string {
			const ext = this.getExtension();
			if (ext === null) {
				return this.getMain();
			}
			return this.getMain().slice(0, -ext.length - 1);
		}
		/**
		 * Get the page name as if it is a file name, without extension or namespace prefix,
		 * in the human-readable form with spaces instead of underscores. For example, the title
		 * `File:Example_image.svg` will be returned as "Example image".
		 *
		 * Note that this method will work for non-file titles but probably give nonsensical results.
		 * A title like `User:Dr._J._Fail` will be returned as `Dr. J`! Use {@link getMainText} instead.
		 *
		 * @return
		 */
		getFileNameTextWithoutExtension(): string {
			return text(this.getFileNameWithoutExtension());
		}
		// /**
		//  * Get the page name as if it is a file name, without extension or namespace prefix. Warning,
		//  * this is usually not what you want! A title like `User:Dr._J._Fail` will be returned as
		//  * `Dr. J`! Use {@link getMain} or {@link getMainText} for the actual page name.
		//  *
		//  * @return File name without file extension, in the canonical form with underscores
		//  *  instead of spaces. For example, the title `File:Example_image.svg` will be returned as
		//  *  `Example_image`.
		//  *  @deprecated since 1.40, use {@link getFileNameWithoutExtension} instead
		//  */
		// getName(): string {
		// 	return this.getFileNameWithoutExtension();
		// }
		// /**
		//  * Get the page name as if it is a file name, without extension or namespace prefix. Warning,
		//  * this is usually not what you want! A title like `User:Dr._J._Fail` will be returned as
		//  * `Dr. J`! Use {@link getMainText} for the actual page name.
		//  *
		//  * @return File name without file extension, formatted with spaces instead of
		//  *  underscores. For example, the title `File:Example_image.svg` will be returned as
		//  *  `Example image`.
		//  *  @deprecated since 1.40, use {@link getFileNameTextWithoutExtension} instead
		//  */
		// getNameText(): string {
		// 	return text(this.getFileNameTextWithoutExtension());
		// }
		/**
		 * Get the extension of the page name (if any).
		 *
		 * @return Name extension or null if there is none
		 */
		getExtension(): string | null {
			const lastDot = this.title.lastIndexOf('.');
			if (lastDot === -1) {
				return null;
			}
			return this.title.slice(lastDot + 1) || null;
		}
		/**
		 * Get the main page name.
		 *
		 * Example: `Example_image.svg` for `File:Example_image.svg`.
		 *
		 * @return
		 */
		getMain(): string {
			if (
				mw.config.get('wgCaseSensitiveNamespaces').indexOf(this.namespace) !== -1 ||
				!this.title.length
			) {
				return this.title;
			}
			const firstChar = mwString.charAt(this.title, 0);
			return Title.phpCharToUpper(firstChar) + this.title.slice(firstChar.length);
		}
		/**
		 * Get the main page name (transformed by text()).
		 *
		 * Example: `Example image.svg` for `File:Example_image.svg`.
		 *
		 * @return
		 */
		getMainText(): string {
			return text(this.getMain());
		}
		/**
		 * Get the full page name.
		 *
		 * Example: `File:Example_image.svg`.
		 * Most useful for API calls, anything that must identify the "title".
		 *
		 * @return
		 */
		getPrefixedDb(): string {
			return this.getNamespacePrefix() + this.getMain();
		}
		/**
		 * Get the full page name, with all underscores replaced by spaces.
		 *
		 * Example: `File:Example image.svg` for `File:Example_image.svg`.
		 *
		 * @return
		 */
		getPrefixedText(): string {
			return text(this.getPrefixedDb());
		}
		/**
		 * Get the page name relative to a namespace.
		 *
		 * Example:
		 *
		 * - "Foo:Bar" relative to the Foo namespace becomes "Bar".
		 * - "Bar" relative to any non-main namespace becomes ":Bar".
		 * - "Foo:Bar" relative to any namespace other than Foo stays "Foo:Bar".
		 *
		 * @param namespace The namespace to be relative to
		 * @return
		 */
		getRelativeText(namespace: number): string {
			if (this.getNamespaceId() === namespace) {
				return this.getMainText();
			} else if (this.getNamespaceId() === NS_MAIN) {
				return ':' + this.getPrefixedText();
			} else {
				return this.getPrefixedText();
			}
		}
		/**
		 * Get the fragment (if any).
		 *
		 * Note that this method (by design) does not include the hash character and
		 * the value is not url encoded.
		 *
		 * @return
		 */
		getFragment(): string | null {
			return this.fragment;
		}
		/**
		 * Get the URL to this title.
		 *
		 * @param params A mapping of query parameter names to values, e.g. `{ action: 'edit' }`.
		 * @return
		 */
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
				directory = mw.config.get('wgScript');
				return directory + '?title=' + wikiUrlencode(this.toString()) + '&' + params + fragment;
			} else {
				directory = mw.config.get('wgArticlePath').replace('$1', () => wikiUrlencode(this.toString()));
				return directory + fragment;
			}
		}
		/**
		 * Check if the title is in a talk namespace.
		 *
		 * @return Whether the title is in a talk namespace
		 */
		isTalkPage(): boolean {
			return Title.isTalkNamespace(this.getNamespaceId());
		}
		/**
		 * Get the title for the associated talk page.
		 *
		 * @return The title for the associated talk page, null if not available
		 */
		getTalkPage(): Title | null {
			if (!this.canHaveTalkPage()) {
				return null;
			}
			return this.isTalkPage() ?
				this :
				Title.makeTitle(this.getNamespaceId() + 1, this.getMainText());
		}
		/**
		 * Get the title for the subject page of a talk page.
		 *
		 * @return The title for the subject page of a talk page, null if not available
		 */
		getSubjectPage(): Title | null {
			return this.isTalkPage() ?
				Title.makeTitle(this.getNamespaceId() - 1, this.getMainText()) :
				this;
		}
		/**
		 * Check the title can have an associated talk page.
		 *
		 * @return The title can have an associated talk page
		 */
		canHaveTalkPage(): boolean {
			return this.getNamespaceId() >= NS_MAIN;
		}
		/**
		 * Whether this title exists on the wiki.
		 *
		 * This is an instance method that does the same as the static method {@link Title.exists}.
		 *
		 * @return Boolean if the information is available, otherwise null
		 */
		exists(): boolean | null {
			return Title.exists(this);
		}
		/**
		 * Alias of {@link getPrefixedDb}.
		 * @return
		 */
		toString(): string {
			return this.getPrefixedDb();
		}
		/**
		 * Alias of {@link getPrefixedText}.
		 * @return
		 */
		toText(): string {
			return this.getPrefixedText();
		}
	}

	return Title;
}