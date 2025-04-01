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

import type { Mwbot } from './Mwbot';
import { toUpperMap, toLowerMap } from './phpCharMap';
import * as mwString from './String';

/**
 * This interface defines the static members of the `Title` class. For instance members,
 * see {@link Title} (defined separately due to TypeScript limitations).
 *
 * **Example**:
 * ```
 * const title = mwbot.Title.newFromText('wikipedia talk:sandbox');
 * if (title) {
 *   console.log(title.getPrefixedDb());
 *   // Output: "Wikipedia_talk:Sandbox" (on enwiki)
 * }
 * ```
 *
 * ### Native specs
 *
 * When using the constructor directly, passing invalid titles will result in an exception.
 * Use {@link newFromText} instead to safely handle invalid titles, returning `null` instead
 * of throwing an error.
 *
 * In both the constructor and {@link newFromText}, `namespace` acts only as the **default**
 * namespace and can be overridden by a namespace prefix in `title`. If you want to enforce
 * the provided namespace, use {@link makeTitle} instead. Compare:
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
 * ```
 *
 * ### Mwbot enhancements
 *
 * In addition to the native `mediawiki.Title` features, `mwbot.Title` correctly parses
 * interwiki prefixes. Compare:
 *
 * - mediawiki.Title
 * ```js
 * new mw.Title('w:en:Main_page').getPrefixedDb();
 * // => 'W:en:Main_page'
 * // {namespace: 0, title: 'w:en:Main_page', fragment: null}
 * ```
 * - mwbot.Title
 * ```js
 * new mwbot.Title('w:en:Main_page').getPrefixedDb();
 * // => 'w:en:Main_page'
 * // {namespace: 0, title: 'Main_page', fragment: null, colon: '', interwiki: 'w:en', local_interwiki: false}
 * ```
 *
 * Here, `Main_page` is correctly extracted as the title in `mwbot.Title`. To check whether
 * a title contains an interwiki prefix, use {@link Title.isExternal}, and to retrieve the interwiki
 * prefixes, use {@link Title.getInterwiki}.
 *
 * **Interwiki Handling and Namespace Limitations**
 *
 * Titles with interwiki prefixes are always recognized as being in the main namespace,
 * since there is no guarantee that the interwiki target site has an equivalent namespace.
 * This also affects the casing of `title`, as the interwiki prefix is treated as part of
 * the title rather than a namespace. Example:
 *
 * ```js
 * const title = new mwbot.Title('mw:mediawiki:sidebar');
 * // {namespace: 0, title: 'mediawiki:sidebar', fragment: null, colon: '', interwiki: 'mw', local_interwiki: false}
 * title.getNamespaceId();
 * // => 0
 * title.getPrefixedDb({interwiki: true});
 * // => 'mw:mediawiki:sidebar'
 * ```
 *
 * The casing of the title depends on the input string. This ensures compatibility with
 * case-sensitive wikis — **do not assume** that `[[iw:foo]]` will be interpreted as `[[iw:Foo]]`
 * when dealing with interwiki titles. (This is how `TitleParser` in PHP works.)
 *
 * **Leading Colons**
 *
 * The handling of leading colons is improved in `mwbot.Title`. You can check if a title originally
 * had a leading colon using {@link Title.hadLeadingColon}, and you can enforce its presence in the output
 * of {@link Title.getPrefixedDb}. This makes it easier to differentiate e.g. pure links (`[[:cat]]`) and
 * category links (`[[cat]]`).
 *
 * ```js
 * const title = new mwbot.Title(':Category:CSD');
 * // {namespace: 14, title: 'CSD', fragment: null, colon: ':', interwiki: '', local_interwiki: false}
 * title.hadLeadingColon();
 * // => true
 * title.getPrefixedDb({colon: true});
 * // => ':Category:CSD'
 * ```
 */
export interface TitleStatic {
	/**
	 * Creates a new Title instance.
	 *
	 * **Usage**:
	 * ```ts
	 * const title = new mwbot.Title('Page title');
	 * ```
	 *
	 * @param title The title of the page. If no `namespace` is provided, this will be analyzed
	 * to determine if it includes a namespace prefix.
	 * @param namespace The default namespace to use for the given title. (Default: `NS_MAIN`)
	 * @throws {Error} If the provided title is invalid.
	 */
    new (title: string, namespace?: number): Title;
	/**
	 * Remove unicode bidirectional characters and trim a string.
	 *
	 * "Unicode bidirectional characters" are characters that can slip into cut-and-pasted texts,
	 * represented as red dots in WikiEditor.
	 *
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @param str Input string.
	 * @param trim Whether to trim the string. Defaults to `true`.
	 * @returns
	 */
	clean(str: string, trim?: boolean): string;
	/**
	 * Constructor for Title objects with a null return instead of an exception for invalid titles.
	 *
	 * Note that `namespace` is the **default** namespace only, and can be overridden by a namespace
	 * prefix in `title`. If you do not want this behavior, use {@link makeTitle}. See
	 * {@link TitleStatic | the class desciprtion} for details.
	 *
	 * @param title
	 * @param namespace Default namespace. (Default: `NS_MAIN`)
	 * @return A valid Title object or `null` if the title is invalid.
	 */
	newFromText(title: string, namespace?: number): Title | null;
	/**
	 * Constructor for Title objects with predefined namespace.
	 *
	 * Unlike {@link newFromText} or the constructor, this method doesn't allow the given `namespace`
	 * to be overridden by a namespace prefix in `title`. See {@link TitleStatic | the class desciprtion}
	 * for details about this behavior.
	 *
	 * The single exception to this is when `namespace` is `0`, indicating the main namespace.
	 * The function behaves like {@link newFromText} in that case.
	 *
	 * @param namespace Namespace to use for the title.
	 * @param title The unprefixed title.
	 * @param fragment The link fragment (after the "#").
	 *
	 * *This parameter is exclusive to `mwbot-ts`.*
	 * @param interwiki The interwiki prefix.
	 *
	 * *This parameter is exclusive to `mwbot-ts`.*
	 *
	 * @return A valid Title object or `null` if the title is invalid.
	 */
	makeTitle(namespace: number, title: string, fragment?: string, interwiki?: string): Title | null;
	/**
	 * Constructor for Title objects from user input altering that input to produce a title that
	 * MediaWiki will accept as legal.
	 *
	 * @param title The title, optionally namespace-prefixed (NOTE: interwiki prefixes are disallowed).
	 * @param defaultNamespace If given, used as default namespace for the given title.
	 * @param options Additional options.
	 * @param options.forUploading (Default: `true`)
	 *
	 * Makes sure that a file is uploadable under the title returned.
	 * There are pages in the file namespace under which file upload is impossible.
	 * Automatically assumed if the title is created in the Media namespace.
	 *
	 * @return A valid Title object or `null` if the input cannot be turned into a valid title.
	 */
	newFromUserInput(title: string, defaultNamespace?: number, options?: {forUploading?: true}): Title | null;
	/**
	 * Sanitizes a file name as supplied by the user, originating in the user's file system
	 * so it is most likely a valid MediaWiki title and file name after processing.
	 *
	 * @param uncleanName The unclean file name including file extension but without namespace.
	 * @return A valid Title object or `null` if the title is invalid.
	 */
	newFromFileName(uncleanName: string): Title | null;
	/**
	 * Get the file title from an image element.
	 *
	 * @param img The image to use as a base.
	 * @return The file title or null if unsuccessful.
	 */
	// newFromImg(img: HTMLElement | JQuery<HTMLImageElement>): Title | null;
	/**
	 * Check if a given namespace is a talk namespace.
	 *
	 * @param namespaceId The namespace ID.
	 * @return A boolean indicating whether the namespace is a talk namespace.
	 */
	isTalkNamespace(namespaceId: number): boolean;
	/**
	 * Check if signature buttons should be shown in a given namespace.
	 *
	 * @param namespaceId The namespace ID.
	 * @return A boolean indicating whether the namespace is a signature namespace.
	 */
	// wantSignaturesNamespace(namespaceId: number): boolean;
	/**
	 * Check whether this title exists on the wiki.
	 *
	 * @param title Prefixed DB title (string) or instance of Title.
	 * @return Boolean if the information is available, otherwise `null`.
	 * @throws {Error} If title is not a string or Title.
	 */
	exists(title: string | Title): boolean | null;
	/**
	 * Object used by {@link exists}.
	 */
	readonly exist: {
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
		 * @param titles Title(s) in strict prefixedDb title form.
		 * @param state State of the given titles.
		 * @returns
		 */
		set: (titles: string | string[], state?: boolean) => boolean;
	};
	/**
	 * Normalize a file extension to the common form, making it lowercase and checking some synonyms,
	 * and ensure it's clean. Extensions with non-alphanumeric characters will be discarded.
	 *
	 * @param extension File extension (without the leading dot).
	 * @return File extension in canonical form.
	 */
	normalizeExtension(extension: string): string;
	/**
	 * Capitalizes a character as in PHP.
	 *
	 * This method handles the difference between PHP's `strtoupper` and JS's `String.toUpperCase`
	 * (see {@link https://phabricator.wikimedia.org/T147646 | phab:T147646}).
	 *
	 * @param chr Unicode character.
	 * @return Unicode character, in upper case, according to the same rules as in PHP.
	 */
	phpCharToUpper(chr: string): string;
	/**
	 * De-capitalizes a character as in PHP.
	 *
	 * This method handles the difference between PHP's `strtolower` and JS's `String.toLowerCase`
	 * (see {@link https://phabricator.wikimedia.org/T147646 | phab:T147646}).
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @param chr Unicode character.
	 * @return Unicode character, in lower case, according to the same rules as in PHP.
	 */
	phpCharToLower(chr: string): string;
	/**
	 * Converts all the alphabetic characters in a string to uppercase, as in PHP.
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @param str
	 * @returns
	 */
	uc(str: string): string;
	/**
	 * Converts all the alphabetic characters in a string to lowercase, as in PHP.
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @param str
	 * @returns
	 */
	lc(str: string): string;
}

/**
 * The instance members of the `Title` class. For static members including the constructor
 * (defined separately due to TypeScript limitations) and the differences in feature from
 * the native `mediawiki.Title`, see {@link TitleStatic}.
 */
export interface Title {
	/**
	 * Check if the input title text had a leading colon (e.g., `:Category:CSD`).
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @returns
	 */
	hadLeadingColon(): boolean;
	/**
	 * Check whether this Title has an interwiki component.
	 *
	 * Adapted from {@link https://gerrit.wikimedia.org/g/mediawiki/services/parsoid/+/40363fbb76a630a803c7bf385b45b9f46be417bf/src/Core/LinkTargetTrait.php#78 | LinkTargetTrait::isExternal}.
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @return
	 */
	isExternal(): boolean;
	/**
	 * Determine whether the object refers to a page within this project (either this wiki or
	 * a wiki with a local interwiki).
	 * See https://www.mediawiki.org/wiki/Manual:Interwiki_table#iw_local for details.
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @return `true` if this is an in-project interwiki link or a wikilink, `false` otherwise.
	 */
	isLocal(): boolean;
	/**
	 * Get the interwiki prefix.
	 *
	 * Example: `mw:` for `mw:Main_page`.
	 *
	 * If an interwiki is set, interwiki prefix plus `:`, an empty string otherwise.
	 * Use {@link isExternal} to check if an interwiki is set.
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @return Interwiki prefix(es).
	 */
	getInterwiki(): string;
	/**
	 * Check if this Title had a local interwiki prefix (e.g., `en:Main_page` on enwiki).
	 *
	 * Such a prefix is erased on instance initialization (i.e., {@link getPrefixedDb} outputs `Main_page`).
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @return
	 */
	wasLocalInterwiki(): boolean;
	/**
	 * Determine whether the interwiki Title refers to a page within this project and is transcludable.
	 * If {@link isExternal} is `false`, this method always returns `false`.
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @return `true` if this is transcludable.
	 */
	isTrans(): boolean;
	/**
	 * Get the namespace number.
	 *
	 * Example: `6` for `File:Example_image.svg`.
	 *
	 * @return
	 */
	getNamespaceId(): number;
	/**
	 * Get the namespace prefix (in the content language).
	 *
	 * Example: `File:` for `File:Example_image.svg`.
	 * In `NS_MAIN` this is an empty string, otherwise namespace name plus `:`.
	 *
	 * @return
	 */
	getNamespacePrefix(): string;
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
	getFileNameWithoutExtension(): string;
	/**
	 * Get the page name as if it is a file name, without extension or namespace prefix,
	 * in the human-readable form with spaces instead of underscores. For example, the title
	 * `File:Example_image.svg` will be returned as `Example image`.
	 *
	 * Note that this method will work for non-file titles but probably give nonsensical results.
	 * A title like `User:Dr._J._Fail` will be returned as `Dr. J`! Use {@link getMainText} instead.
	 *
	 * @return
	 */
	getFileNameTextWithoutExtension(): string;
	/**
	 * Get the page name as if it is a file name, without extension or namespace prefix. Warning,
	 * this is usually not what you want! A title like `User:Dr._J._Fail` will be returned as
	 * `Dr. J`! Use {@link getMain} or {@link getMainText} for the actual page name.
	 *
	 * @return File name without file extension, in the canonical form with underscores
	 * instead of spaces. For example, the title `File:Example_image.svg` will be returned as
	 * `Example_image`.
	 * @deprecated since 1.40, use {@link getFileNameWithoutExtension} instead
	 */
	// getName(): string;
	/**
	 * Get the page name as if it is a file name, without extension or namespace prefix. Warning,
	 * this is usually not what you want! A title like `User:Dr._J._Fail` will be returned as
	 * `Dr. J`! Use {@link getMainText} for the actual page name.
	 *
	 * @return File name without file extension, formatted with spaces instead of
	 * underscores. For example, the title `File:Example_image.svg` will be returned as
	 * `Example image`.
	 * @deprecated since 1.40, use {@link getFileNameTextWithoutExtension} instead
	 */
	// getNameText(): string;
	/**
	 * Get the extension of the page name (if any).
	 *
	 * @return Name extension or `null` if there is none.
	 */
	getExtension(): string | null;
	/**
	 * Get the main page name.
	 *
	 * Example: `Example_image.svg` for `File:Example_image.svg`.
	 *
	 * @return
	 */
	getMain(): string;
	/**
	 * Get the main page name (with spaces instead of underscores).
	 *
	 * Example: `Example image.svg` for `File:Example_image.svg`.
	 *
	 * @return
	 */
	getMainText(): string;
	/**
	 * Get the full page name.
	 *
	 * Example: `File:Example_image.svg`.
	 * Most useful for API calls, anything that must identify the "title".
	 *
	 * @param options Title output options.
	 *
	 * *This parameter is exclusive to `mwbot-ts`.*
	 *
	 * @return
	 */
	getPrefixedDb(options?: TitleOutputOptions): string;
	/**
	 * Get the full page name, with all underscores replaced by spaces.
	 *
	 * Example: `File:Example image.svg` for `File:Example_image.svg`.
	 *
	 * @param options Title output options.
	 *
	 * *This parameter is exclusive to `mwbot-ts`.*
	 *
	 * @return
	 */
	getPrefixedText(options?: TitleOutputOptions): string;
	/**
	 * Get the page name relative to a namespace.
	 *
	 * Example:
	 *
	 * - `Foo:Bar` relative to the Foo namespace becomes `Bar`.
	 * - `Bar` relative to any non-main namespace becomes `:Bar`.
	 * - `Foo:Bar` relative to any namespace other than Foo stays `Foo:Bar`.
	 *
	 * @param namespace The namespace to be relative to.
	 * @return The page name relative to a namespace.
	 *
	 * NOTE: Interwiki prefixes (if any) are not included in the output.
	 */
	getRelativeText(namespace: number): string;
	/**
	 * Get the fragment (if any).
	 *
	 * Note that this method (by design) does not include the hash character and
	 * the value is *not* URL-encoded.
	 *
	 * @return
	 */
	getFragment(): string | null;
	/**
	 * Get the URL to this title.
	 *
	 * @param params A mapping of query parameter names to values, e.g. `{ action: 'edit' }`.
	 * @return
	 */
	// getUrl(params?: string[][] | Record<string, string> | string | URLSearchParams): string;
	/**
	 * Check if the title is in a talk namespace.
	 *
	 * @return Whether the title is in a talk namespace.
	 */
	isTalkPage(): boolean;
	/**
	 * Get the title for the associated talk page.
	 *
	 * @return The title for the associated talk page, `null` if not available.
	 *
	 * NOTE: If this Title is interwiki, this method always returns `null` because
	 * interwiki titles are always treated as being in the default namespace. Without
	 * this restriction, the method would simply return the current instance unchanged.
	 */
	getTalkPage(): Title | null;
	/**
	 * Get the title for the subject page of a talk page.
	 *
	 * @return The title for the subject page of a talk page, `null` if not available.
	 *
	 * NOTE: If this Title is interwiki, this method always returns `null` because
	 * interwiki titles are always treated as being in the default namespace. Without
	 * this restriction, the method would simply return the current instance unchanged.
	 */
	getSubjectPage(): Title | null;
	/**
	 * Check if the title can have an associated talk page.
	 *
	 * @return
	 */
	canHaveTalkPage(): boolean;
	/**
	 * Check whether this title exists on the wiki.
	 *
	 * This is an instance method that does the same as the static method {@link TitleStatic.exists}.
	 *
	 * @return Boolean if the information is available, otherwise `null`.
	 */
	exists(): boolean | null;
	/**
	 * Alias of {@link getPrefixedDb}.
	 *
	 * This method does not accept output options, meaning the output will always include
	 * interwiki prefixes but will exclude the fragment and leading colon, if present.
	 * See {@link TitleOutputOptions} for details.
	 *
	 * @return
	 */
	toString(): string;
	/**
	 * Alias of {@link getPrefixedText}.
	 *
	 * This method does not accept output options, meaning the output will always include
	 * interwiki prefixes but will exclude the fragment and leading colon, if present.
	 * See {@link TitleOutputOptions} for details.
	 *
	 * @return
	 */
	toText(): string;
	/**
	 * Checks if this Title is equal to a given title.
	 *
	 * *This method is exclusive to `mwbot-ts`.*
	 *
	 * @param title The title to compare against.
	 * @param evalFragment Whether to include the fragment in the comparison. (Default: `false`)
	 * @returns `true` if the titles are equal, `false` otherwise, or `null` if `title` is invalid.
	 */
	equals(title: string | Title, evalFragment?: boolean): boolean | null;
}

/**
 * @internal
 */
export function TitleFactory(config: Mwbot['config'], info: Mwbot['_info']): TitleStatic {

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
	const getNsIdByName = function(ns: string): number | false {
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
	const isKnownNamespace = function(namespace: number): boolean {
		return namespace === NS_MAIN || wgFormattedNamespaces[namespace] !== undefined;
	};
	/**
	 * @param namespace that is valid and known. Callers should call {@link isKnownNamespace}
	 * before executing this method.
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
	const isValidInterwiki = (prefix: string): boolean => {
		prefix = Title.lc(prefix);
		return info.interwikimap.some((obj) => obj.prefix === prefix);
	};
	/**
	 * An array of interwiki prefixes for the local project (e.g., `ja` for jawiki).
	 *
	 * *This variable is exclusive to `mwbot-ts`.*
	 */
	const localInterwikis = info.interwikimap.reduce((acc: string[], {prefix, localinterwiki}) => {
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
	const getSubject = (index: number): number => {
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
	const CAPITAL_LINK_OVERRIDES: {[id: number]: boolean} = {};
	/**
	 * Array of the IDs of namespaces whose first letters are always capitalized.
	 *
	 * *This variable is exclusive to `mwbot-ts`.*
	 */
	const ALWAYS_CAPITALIZED_NAMESPACES = Object.values(info.namespaces).reduce((acc: number[], obj) => {
		if (obj.case === 'first-letter') {
			acc.push(obj.id);
		} else { // "case-sensitive"
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
	const isCapitalized = (index: number): boolean => {
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
	interface ParsedTitle {
		namespace: number;
		title: string;
		fragment: string | null;
		colon: Colon,
		interwiki: string;
		local_interwiki: boolean;
	}
	type Colon = '' | ':';
	/**
	 * Internal helper for #constructor and #newFromText.
	 *
	 * Based on {@link https://gerrit.wikimedia.org/g/mediawiki/core/+/1103f2b18aaa14050cdd9602daf21569fb9a4636/includes/title/TitleParser.php#183 | TitleParser::splitTitleString }.
	 *
	 * @param title
	 * @param defaultNamespace
	 * @return
	 */
	const parse = function(title: string, defaultNamespace = NS_MAIN): ParsedTitle | false {
		let namespace = parseInt(<never>defaultNamespace) || NS_MAIN;
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
		let colon: Colon = '';
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
		let iw: string[] = [];
		let local_interwiki = false;
		if (parts.length > 1) {
			let ns: number | null = null;
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
						} else {
							// Interwiki resets the default namespace because there's no guarantee that
							// the interwiki project has a specific namespace
							ns = NS_MAIN;
							// e.g., in "w:en:Main_page" and if we're parsing "w", "Main_page" is the title,
							// where `parts = ['w', 'en', 'Main_page']` and iw = ['en']
							title = parts.slice(i + iw.length + 1).join(':');
							// Register the valid interwiki
							iw.unshift(iwPrefix);
						}
					} else {
						// If no prefix has previously been processed, that's an ns prefix
						ns = nsId;
					}
				} else if (nsId !== false) {
					if (nsId === NS_MAIN) {
						// Empty string was passed to getNsIdByName
						// This occurs when the title has a "::" sequence
						title = ':' + title;
					} else if (ns === NS_TALK) {
						// Found Talk: in a previous iteration
						// Disallow titles like Talk:File:x
						return false;
					} else {
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
						} else if (ns !== null) {
							// Ns prefix was previously found: that resets the ns-title division
							// e.g., "Category:Template:Foo" where "Template:Foo" is the new title
							title = parts.slice(i + 1).join(':');
						}
						ns = nsId;
					}
				} else if (iwPrefix !== false) {
					if (localInterwikis.includes(iwPrefix)) {
						local_interwiki = true;
					} else {
						ns = NS_MAIN;
						title = parts.slice(i + iw.length + 1).join(':');
						iw.unshift(iwPrefix);
					}
				} else if (ns === null && !iw.length) {
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
				const ret: ParsedTitle = {
					namespace: NS_MAIN,
					title: 'Main page',
					fragment: null,
					colon,
					interwiki,
					local_interwiki: true
				};
				return ret;
			} else {
				// Namespace prefix only or entirely empty title; consistently invalid
				return false;
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
	const rUpperPhpChars = new RegExp(`[${Object.keys(toUpperMap).join('')}]`);
	/**
	 * Matches uppercase characters (including Greek and others) that have
	 * different capitalization behavior in PHP's strtolower.
	 *
	 * *This variable is exclusive to `mwbot-ts`.*
	 */
	const rLowerPhpChars = new RegExp(`[${Object.keys(toLowerMap).join('')}]`);

	class Title implements Title {

		private namespace: number;
		private title: string;
		private fragment: string | null;
		private colon: Colon;
		private interwiki: string;
		private local_interwiki: boolean;

		constructor(title: string, namespace = NS_MAIN) {
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

		static clean(str: string, trim = true): string {
			str = str.replace(rUnicodeBidi, '');
			return trim ? str.trim() : str;
		}

		static newFromText(title: string, namespace = NS_MAIN): Title | null {
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

		static makeTitle(namespace: number, title: string, fragment = '', interwiki = ''): Title | null {
			if (!isKnownNamespace(namespace)) {
				return null;
			} else {
				if (fragment && fragment[0] !== '#') {
					fragment = '#' + fragment;
				}
				if (interwiki && !/:[^\S\r\n]*$/.test(interwiki)) {
					interwiki += ':';
				}
				return Title.newFromText(interwiki + getNamespacePrefix(namespace) + title + fragment);
			}
		}

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

		static newFromFileName(uncleanName: string): Title | null {
			return Title.newFromUserInput('File:' + uncleanName);
		}

		/*
		Title.newFromImg = function(img) {
			const src = img.jquery ? img[0].src : img.src,
				data = mw.util.parseImageUrl(src);
			return data ? Title.newFromText('File:' + data.name) : null;
		};
		*/

		static isTalkNamespace(namespaceId: number): boolean {
			return namespaceId > NS_MAIN && namespaceId % 2 === 1;
		}

		/*
		Title.wantSignaturesNamespace = function(namespaceId) {
			return Title.isTalkNamespace(namespaceId) ||
				config.get('wgExtraSignatureNamespaces').indexOf(namespaceId) !== -1;
		};
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
			pages: Record<string, boolean>;
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

		static phpCharToUpper(chr: string): string {
			const mapped = toUpperMap[chr as keyof typeof toUpperMap];
			if (mapped === 0) {
				// Optimisation: When the override is to keep the character unchanged,
				// we use 0 in JSON. This reduces the data by 50%.
				return chr;
			}
			return mapped as string || chr.toUpperCase();
		}

		static phpCharToLower(chr: string): string {
			return toLowerMap[chr as keyof typeof toLowerMap] || chr.toLowerCase();
		}

		static uc(str: string): string {
			if (rUpperPhpChars.test(str)) {
				return Array.from(str).reduce((acc, char) => acc += Title.phpCharToUpper(char), '');
			}
			return str.toUpperCase();
		}

		static lc(str: string): string {
			if (rLowerPhpChars.test(str)) {
				return Array.from(str).reduce((acc, char) => acc += Title.phpCharToLower(char), '');
			}
			return str.toLowerCase();
		}

		hadLeadingColon(): boolean {
			return this.colon !== '';
		}

		isExternal(): boolean {
			return this.interwiki !== '';
		}

		isLocal(): boolean {
			if (this.isExternal()) {
				const prefixes = this.interwiki.split(':');
				const bools: boolean[] = [];
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

		getInterwiki(): string {
			return this.interwiki && this.interwiki + ':';
		}

		wasLocalInterwiki(): boolean {
			return this.local_interwiki;
		}

		isTrans(): boolean {
			if (!this.isExternal()) {
				return false;
			}
			const prefixes = this.interwiki.split(':');
			const bools: boolean[] = [];
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

		getNamespaceId(): number {
			return this.namespace;
		}

		getNamespacePrefix(): string {
			return getNamespacePrefix(this.namespace);
		}

		getFileNameWithoutExtension(): string {
			const ext = this.getExtension();
			if (ext === null) {
				return this.getMain();
			}
			return this.getMain().slice(0, -ext.length - 1);
		}

		getFileNameTextWithoutExtension(): string {
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

		getExtension(): string | null {
			const lastDot = this.title.lastIndexOf('.');
			if (lastDot === -1) {
				return null;
			}
			return this.title.slice(lastDot + 1) || null;
		}

		getMain(): string {
			if (
				config.get('wgCaseSensitiveNamespaces').indexOf(this.namespace) !== -1 ||
				!this.title.length ||
				// Normally, all wiki links are forced to have an initial capital letter so [[foo]]
				// and [[Foo]] point to the same place. Don't force it for interwikis, since the
				// other site might be case-sensitive.
				!(this.interwiki === '' && isCapitalized(this.namespace))
			) {
				return this.title;
			}
			const firstChar = mwString.charAt(this.title, 0);
			return Title.phpCharToUpper(firstChar) + this.title.slice(firstChar.length);
		}

		getMainText(): string {
			return text(this.getMain());
		}

		getPrefixedDb(options: TitleOutputOptions = {}): string {
			if (!('interwiki' in options)) {
				options.interwiki = true;
			}
			const colon = options.colon ? this.colon : '';
			const interwiki = options.interwiki ? this.getInterwiki() : '';
			let fragment = options.fragment ? this.getFragment() || '' : '';
			fragment = fragment && '#' + fragment;
			return colon + interwiki + this.getNamespacePrefix() + this.getMain() + fragment;
		}

		getPrefixedText(options: TitleOutputOptions = {}): string {
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

		getRelativeText(namespace: number): string {
			if (this.getNamespaceId() === namespace) {
				return this.getMainText();
			} else if (this.getNamespaceId() === NS_MAIN) {
				return ':' + this.getPrefixedText({interwiki: false});
			} else {
				return this.getPrefixedText({interwiki: false});
			}
		}

		getFragment(): string | null {
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

		isTalkPage(): boolean {
			return Title.isTalkNamespace(this.getNamespaceId());
		}

		getTalkPage(): Title | null {
			if (!this.canHaveTalkPage() || this.isExternal()) {
				return null;
			}
			return this.isTalkPage() ?
				this :
				Title.makeTitle(this.getNamespaceId() + 1, this.getMainText(), '', this.interwiki);
		}

		getSubjectPage(): Title | null {
			if (this.isExternal()) {
				return null;
			}
			return this.isTalkPage() ?
				Title.makeTitle(this.getNamespaceId() - 1, this.getMainText(), '', this.interwiki) :
				this;
		}

		canHaveTalkPage(): boolean {
			return this.getNamespaceId() >= NS_MAIN;
		}

		exists(): boolean | null {
			return Title.exists(this);
		}

		toString(): string {
			return this.getPrefixedDb();
		}

		toText(): string {
			return this.getPrefixedText();
		}

		equals(title: string | Title, evalFragment = false): boolean | null {
			if (!(title instanceof Title)) {
				const t = Title.newFromText(String(title));
				if (t === null) {
					return null;
				}
				title = t;
			}
			const options: TitleOutputOptions = {fragment: evalFragment};
			return this.getPrefixedDb(options) === title.getPrefixedDb(options);
		}
	}

	return Title as TitleStatic;
}

/**
 * Options for {@link Title.getPrefixedDb} and {@link Title.getPrefixedText}.
 */
export interface TitleOutputOptions {
	/**
	 * Whether to include interwiki prefixes in the output. (Default: `true`)
	 */
	interwiki?: boolean;
	/**
	 * Whether to include the fragment in the output. (Default: `false`)
	 *
	 * This option has no effect if {@link Title.getFragment} returns `null`.
	 */
	fragment?: boolean;
	/**
	 * Whether to include a leading colon in the output. (Default: `false`)
	 *
	 * This option has no effect if {@link Title.hadLeadingColon} returns `false`.
	 */
	colon?: boolean;
}