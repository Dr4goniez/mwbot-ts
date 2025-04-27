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
    newFromUserInput(title: string, defaultNamespace?: number, options?: {
        forUploading?: true;
    }): Title | null;
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
    /**
     * Normalizes a title to its canonical form.
     *
     * This capitalizes the first character of the base (unprefixed) title and localizes the
     * namespace according to the wiki’s configuration.
     *
     * *This method is exclusive to `mwbot-ts`.*
     *
     * @param title The title to normalize.
     * @param options Options that control how the title is normalized.
     * @returns The normalized title as a string, or `null` if the input is not a valid title.
     * @throws If `title` is not a string.
     */
    normalize(title: string, options?: TitleNormalizeOptions): string | null;
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
     * Get the fragment (if any), with all underscores replaced by spaces.
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
    /**
     * @hidden
     */
    _clone(seen: WeakMap<object, any>): Title;
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
     * All underscores are replaced by spaces.
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
/**
 * Options for {@link TitleStatic.normalize}.
 */
export interface TitleNormalizeOptions extends TitleOutputOptions {
    /**
     * The default namespace to use for the given title. (Default: `NS_MAIN`)
     */
    namespace?: number;
    /**
     * The normalization format to apply. (Default: `'db'`)
     *
     * - `'db'`: Replaces all spaces with underscores.
     * - `'api'`: Replaces all underscores with spaces.
     */
    format?: 'db' | 'api';
}
//# sourceMappingURL=Title.d.ts.map