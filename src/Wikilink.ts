/**
 * This module serves to parse `[[wikilink]]` markups into object structures.
 *
 * ### Classes:
 * - {@link WikilinkStatic | Wikilink}: Encapsulates `[[wikilink]]` markups with a *non-file* title
 * as objects. Accessible via {@link Mwbot.Wikilink}.
 * 	- {@link ParsedWikilinkStatic | ParsedWikilink}: A subclass of `Wikilink`, whose instances are
 * returned by {@link Wikitext.parseWikilinks}.
 * - {@link FileWikilinkStatic | FileWikilink}: Encapsulates `[[wikilink]]` markups with a *file* title
 * as objects. Accessible via {@link Mwbot.FileWikilink}.
 * 	- {@link ParsedFileWikilinkStatic | ParsedFileWikilink}: A subclass of `FileWikilink`, whose instances are
 * returned by {@link Wikitext.parseWikilinks}.
 * - {@link RawWikilinkStatic | RawWikilink}: Encapsulates `[[wikilink]]` markups with an *unparsable* title
 * as objects. Accessible via {@link Mwbot.RawWikilink}.
 * 	- {@link ParsedRawWikilinkStatic | ParsedRawWikilink}: A subclass of `RawWikilink`, whose instances are
 * returned by {@link Wikitext.parseWikilinks}.
 *
 * @module
 */

import { ParamBase } from './baseClasses';
import type { Mwbot } from './Mwbot';
import type { TitleStatic, Title } from './Title';

// Imported only for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Wikitext, WikitextOptions } from './Wikitext';

/**
 * The base class for {@link WikilinkStatic} and {@link RawWikilinkStatic}.
 *
 * This interface defines the static members of the `WikilinkBase` class. For instance members,
 * see {@link WikilinkBase} (defined separately due to TypeScript limitations).
 *
 * @protected
 */
export interface WikilinkBaseStatic<T extends string | Title> {
	/**
	 * Creates a new instance.
	 *
	 * @param title The title of the page that the wikilink links to.
	 * @param display An optional display text for the wikilink.
	 */
	new(title: T, display?: string): WikilinkBase<T>;
}

/**
 * The instance members of the `WikilinkBase` class. For static members,
 * see {@link WikilinkBaseStatic} (defined separately due to TypeScript limitations).
 *
 * @protected
 */
export interface WikilinkBase<T extends string | Title> {
	/**
	 * The title of the page that the wikilink links to.
	 *
	 * This property is read-only. To update it, use {@link setTitle}.
	 */
	readonly title: T;

	/**
	 * Gets the display text of the wikilink. If no display text is set,
	 * the title text is returned.
	 *
	 * Note that interlanguage links (which appear in the sidebar)
	 * are not resolved in terms of how they are displayed there.
	 *
	 * @returns The display text as a string.
	 */
	getDisplay(): string;
	/**
	 * Sets the display text of the wikilink.
	 *
	 * @param display The display text. To unset it, pass an empty string or `null`.
	 * @returns The current instance for chaining.
	 */
	setDisplay(display: string | null): this;
	/**
	 * Checks whether this wikilink has a display text (the part after `|`).
	 *
	 * @returns A boolean indicating whether the wikilink has a display text.
	 */
	hasDisplay(): boolean;
}

/**
 * This interface defines the static members of the `Wikilink` class. For instance members,
 * see {@link Wikilink} (defined separately due to TypeScript limitations).
 *
 * `Wikilink` is a class that serves to parse `[[wikilink]]` markups into an object structure,
 * which is accessible via {@link Mwbot.Wikilink}. Note that wikilinks with a `'File:'` title
 * are treated differently by the {@link FileWikilinkStatic | FileWikilink} class, and those
 * with an invalid title by the {@link RawWikilinkStatic | RawWikilink} class.
 *
 * @example
 * const foo = new mwbot.Wikilink('Foo');
 * foo.setDisplay('Bar');
 * foo.stringify(); // [[Foo|Bar]]
 */
export interface WikilinkStatic extends Omit<WikilinkBaseStatic<Title>, 'new'> {
	/**
	 * Creates a new instance.
	 *
	 * **Usage**:
	 * ```ts
	 * const wikilink = new mwbot.Wikilink('Page title');
	 * ```
	 *
	 * @param title The title of the (non-file) page that the wikilink links to.
	 * @param display An optional display text for the wikilink.
	 * @throws
	 * - If the title is invalid.
	 * - If the title is a file title. To objectify a `'[[File:...]]'` wikilink,
	 * use {@link FileWikilink} instead.
	 */
	new(title: string | Title, display?: string): Wikilink;
	/**
	 * Checks if the given object is an instance of the specified wikilink-related class.
	 *
	 * This method is an alternative of the `instanceof` operator, which cannot be used for
	 * non-exported classes.
	 *
	 * **Example**:
	 * ```ts
	 * const [foo] = new mwbot.Wikitext('[[Foo]]').parseWikilinks();
	 * foo instanceof mwbot.Wikilink; // true
	 * mwbot.Wikilink.is(foo, 'ParsedWikilink'); // true
	 * foo instanceof mwbot.FileWikilink; // false
	 * mwbot.Wikilink.is(foo, 'ParsedFileWikilink'); // false
	 * foo instanceof mwbot.RawWikilink; // false
	 * mwbot.Wikilink.is(foo, 'ParsedRawWikilink'); // false
	 * ```
	 *
	 * Be noted about the hierarchies of the wikilink-related classes:
	 * - {@link ParsedWikilinkStatic | ParsedWikilink} extends {@link WikilinkStatic | Wikilink}.
	 * - {@link ParsedFileWikilinkStatic | ParsedFileWikilink} extends {@link FileWikilinkStatic | FileWikilink}.
	 * - {@link ParsedRawWikilinkStatic | ParsedRawWikilink} extends {@link RawWikilinkStatic | RawWikilink}.
	 *
	 * @template T The type of wikilink to check for. Must be one of `'Wikilink'`, `'ParsedWikilink'`,
	 * `'FileWikilink'`, `'ParsedFileWikilink'`, `'RawWikilink'`, or `'ParsedRawWikilink'`.
	 * @param obj The object to check.
	 * @param type The wikilink type to compare against.
	 * @returns `true` if `obj` is an instance of the specified wikilink class, otherwise `false`.
	 * @throws {Error} If an invalid `type` is provided.
	 */
	is<T extends keyof WikilinkTypeMap>(obj: unknown, type: T): obj is WikilinkTypeMap[T];
}

/**
 * The instance members of the `Wikilink` class. For static members,
 * see {@link WikilinkStatic} (defined separately due to TypeScript limitations).
 */
export interface Wikilink extends WikilinkBase<Title> {
	/**
	 * Sets a new title to the instance.
	 *
	 * A `'File:...'` title (without a leading colon) is not allowed as the `title`
	 * argument. For file titles, use {@link toFileWikilink} instead.
	 *
	 * @param title The new title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A boolean indicating whether the new title was set.
	 */
	setTitle(title: string | Title, verbose?: boolean): boolean;
	/**
	 * Creates a new {@link FileWikilink} instance, inheriting the current instance's properties.
	 *
	 * @param title The file title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A new {@link FileWikilink} instance on success; otherwise, `null`.
	 */
	toFileWikilink(title: string | Title, verbose?: boolean): FileWikilink | null;
	/**
	 * Strigifies the instance.
	 *
	 * @param options Options to format the output.
	 * @returns The wikilink as a string.
	 */
	stringify(options?: WikilinkOutputConfig): string;
	/**
	 * Alias of {@link stringify}.
	 *
	 * @returns The wikilink as a string.
	 */
	toString(): string;
}

/**
 * This interface defines the static members of the `ParsedWikilink` class. For instance members,
 * see {@link ParsedWikilink} (defined separately due to TypeScript limitations).
 *
 * This class is exclusive to {@link Wikitext.parseWikilinks}.
 * It represents a well-formed `[[wikilink]]` markup with a valid *non-file* title.
 * For the class that represents a well-formed `[[wikilink]]` markup with a valid *file*
 * title, see {@link ParsedFileWikilinkStatic}, and for the class that represents a malformed
 * `[[wikilink]]` markup with an *invalid* title, see {@link ParsedRawWikilinkStatic}.
 *
 * This class differs from {@link ParsedFileWikilinkStatic | ParsedFileWikilink} and
 * {@link ParsedRawWikilinkStatic | ParsedRawWikilink} in that:
 * - It extends the {@link WikilinkStatic | Wikilink} class.
 * - (Compared to ParsedFileWikilink) its instances have methods related to the display text.
 * - (Compared to ParsedRawWikilink) the {@link ParsedWikilink.title | title} property is
 * an instace of {@link Title} instead of a string.
 *
 * The constructor of this class is inaccessible, and instances can only be referenced
 * in the result of `parseTemplates`.
 *
 * To check if an object is an instance of this class, use {@link WikilinkStatic.is}.
 *
 * **Important**:
 *
 * The instance properties of this class are pseudo-read-only, in the sense that altering them
 * does not affect the behaviour of {@link Wikitext.modifyWikilinks}.
 *
 * @private
 */
export interface ParsedWikilinkStatic extends Omit<WikilinkStatic, 'new'> {
	/**
	 * @param initializer
	 * @private
	 */
	new(initializer: ParsedWikilinkInitializer): ParsedWikilink;
}

/**
 * The instance members of the `ParsedWikilink` class. For static members,
 * see {@link ParsedWikilinkStatic} (defined separately due to TypeScript limitations).
 */
export interface ParsedWikilink extends Wikilink {
	/**
	 * The raw wikilink title, as directly parsed from the left part of a `[[wikilink|...]]` expression.
	 */
	rawTitle: string;
	/**
	 * The original text of the wikilink parsed from the wikitext.
	 * The value of this property is static.
	 */
	text: string;
	/**
	 * The starting index of this wikilink in the wikitext.
	 */
	startIndex: number;
	/**
	 * The ending index of this wikilink in the wikitext (exclusive).
	 */
	endIndex: number;
	/**
	 * Whether the wikilink appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;

	/**
	 * Creates a new {@link ParsedFileWikilink} instance, inheriting the current instance's properties.
	 *
	 * @param title The file title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A new {@link ParsedFileWikilink} instance on success; otherwise, `null`.
	 */
	toFileWikilink(title: string | Title, verbose?: boolean): ParsedFileWikilink | null;
	/**
	 * Strigifies the instance.
	 *
	 * @param options Options to format the output.
	 * @returns The wikilink as a string.
	 */
	stringify(options?: ParsedWikilinkOutputConfig): string;
	/**
	 * Alias of {@link stringify}.
	 *
	 * @returns The wikilink as a string.
	 */
	toString(): string;
	/**
	 * @hidden
	 */
	_clone(): ParsedWikilink;
}

/**
 * This interface defines the static members of the `FileWikilink` class. For instance members,
 * see {@link FileWikilink} (defined separately due to TypeScript limitations).
 *
 * `FileWikilink` is a class that serves to parse `[[File:...]]` markups into an object structure,
 * which is accessible via {@link Mwbot.FileWikilink}. Note that wikilinks with a non-file title
 * are treated differently by the {@link WikilinkStatic | Wikilink} class, and those
 * with an invalid title by the {@link RawWikilinkStatic | RawWikilink} class.
 *
 * @example
 * const foo = new mwbot.FileWikilink('File:Foo');
 * foo.addParam('thumb').addParam('300px');
 * foo.stringify(); // [[File:Foo|thumb|300px]]
 */
export interface FileWikilinkStatic extends Omit<typeof ParamBase, 'prototype'> {
	/**
	 * Creates a new instance.
	 *
	 * **Usage**:
	 * ```ts
	 * const filelink = new mwbot.FileWikilink('File:Foo');
	 * ```
	 *
	 * @param title The title of the file that the wikilink transcludes.
	 * @param params Optional parameters for the file link (e.g., `['thumb', '300px', ...]`).
	 * @throws
	 * - If the title is invalid.
	 * - If the title is a non-file title. To objectify a non-file `[[wikilink]]`,
	 * use {@link Wikilink} instead.
	 */
	new(title: string | Title, params?: string[]): FileWikilink;
}

/**
 * The instance members of the `FileWikilink` class. For static members,
 * see {@link FileWikilinkStatic} (defined separately due to TypeScript limitations).
 */
export interface FileWikilink extends InstanceType<typeof ParamBase> {
	/**
	 * The title of the file that the wikilink transcludes.
	 *
	 * This property is read-only. To update it, use {@link setTitle}.
	 */
	readonly title: Title;

	/**
	 * Sets a new file title to the instance.
	 *
	 * A non-file title is not allowed as the `title` argument. For `'File:...'` titles
	 * (without a leading colon), use {@link toWikilink} instead.
	 *
	 * @param title The new file title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A boolean indicating whether the new title was set.
	 */
	setTitle(title: string | Title, verbose?: boolean): boolean;
	/**
	 * Creates a new {@link Wikilink} instance, inheriting the current instance's properties.
	 *
	 * @param title The non-file title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A new {@link Wikilink} instance on success; otherwise, `null`.
	 */
	toWikilink(title: string | Title, verbose?: boolean): Wikilink | null;
	/**
	 * Stringifies the instance.
	 *
	 * @param options Options to format the output.
	 * @returns The file wikilink as a string.
	 */
	stringify(options?: FileWikilinkOutputConfig): string;
	/**
	 * Alias of {@link stringify} called without arguments.
	 *
	 * @returns The file wikilink as a string.
	 */
	toString(): string;
}

/**
 * This interface defines the static members of the `ParsedFileWikilink` class. For instance members,
 * see {@link ParsedFileWikilink} (defined separately due to TypeScript limitations).
 *
 * This class is exclusive to {@link Wikitext.parseWikilinks}.
 * It represents a well-formed `[[wikilink]]` markup with a valid *file* title.
 * For the class that represents a well-formed `[[wikilink]]` markup with a valid *non-file*
 * title, see {@link ParsedWikilinkStatic}, and for the class that represents a malformed
 * `[[wikilink]]` markup with an *invalid* title, see {@link ParsedRawWikilinkStatic}.
 *
 * This class differs from {@link ParsedWikilinkStatic | ParsedWikilink} and
 * {@link ParsedRawWikilinkStatic | ParsedRawWikilink} in that:
 * - It extends the {@link FileWikilinkStatic | FileWikilink} class.
 * - (Compared to ParsedWikilink) its instances have methods related to the parameter texts.
 * - (Compared to ParsedRawWikilink) the {@link ParsedFileWikilink.title | title} property is
 * an instace of {@link Title} instead of a string.
 *
 * The constructor of this class is inaccessible, and instances can only be referenced
 * in the result of `parseTemplates`.
 *
 * To check if an object is an instance of this class, use {@link WikilinkStatic.is}.
 *
 * **Important**:
 *
 * The instance properties of this class are pseudo-read-only, in the sense that altering them
 * does not affect the behaviour of {@link Wikitext.modifyWikilinks}.
 *
 * @private
 */
export interface ParsedFileWikilinkStatic extends Omit<FileWikilinkStatic, 'new'> {
	/**
	 * @param initializer
	 * @private
	 */
	new(initializer: ParsedFileWikilinkInitializer): ParsedFileWikilink;
}

/**
 * The instance members of the `ParsedFileWikilink` class. For static members,
 * see {@link ParsedFileWikilinkStatic} (defined separately due to TypeScript limitations).
 */
export interface ParsedFileWikilink extends FileWikilink {
	/**
	 * The raw wikilink title, as directly parsed from the left part of a `[[wikilink|...]]` expression.
	 */
	rawTitle: string;
	/**
	 * The original text of the wikilink parsed from the wikitext.
	 * The value of this property is static.
	 */
	text: string;
	/**
	 * The starting index of this wikilink in the wikitext.
	 */
	startIndex: number;
	/**
	 * The ending index of this wikilink in the wikitext (exclusive).
	 */
	endIndex: number;
	/**
	 * Whether the wikilink appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;

	/**
	 * Creates a new {@link ParsedWikilink} instance, inheriting the current instance's properties.
	 *
	 * @param title The non-file title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A new {@link ParsedWikilink} instance on success; otherwise, `null`.
	 */
	toWikilink(title: string | Title, verbose?: boolean): ParsedWikilink | null;
	/**
	 * @inheritdoc
	 */
	stringify(options?: ParsedFileWikilinkOutputConfig): string;
	/**
	 * @inheritdoc
	 */
	toString(): string;
	/**
	 * @hidden
	 */
	_clone(): ParsedFileWikilink;
}

/**
 * This interface defines the static members of the `RawWikilink` class. For instance members,
 * see {@link RawWikilink} (defined separately due to TypeScript limitations).
 *
 * `RawWikilink` is a class that serves to parse `[[wikilink]]` markups with an **invalid** title into an object structure,
 * which is accessible via {@link Mwbot.RawWikilink}. Note that wikilinks with a valid non-file title
 * are treated differently by the {@link WikilinkStatic | Wikilink} class, and those
 * with a valid file title by the {@link FileWikilinkStatic | FileWikilink} class.
 */
export interface RawWikilinkStatic extends Omit<WikilinkBaseStatic<string>, 'new'> {
	/**
	 * Creates a new instance.
	 *
	 * The `title` property of this class is not validated as a {@link Title} instance.
	 * The class is to construct a wikilink object whose title has to include invalid
	 * characters, e.g., `'[[{{{1}}}]]'`. When objectifying a wikilink with a valid title,
	 * use {@link WikilinkStatic | Wikilink} or {@link FileWikilinkStatic | FileWikilink} instead.
	 *
	 * **Usage**:
	 * ```ts
	 * const rawlink = new mwbot.RawWikilink('{{{1}}}');
	 * ```
	 *
	 * @param title The title of the page that the wikilink links to.
	 * @param display An optional display text for the wikilink.
	 */
	new(title: string, display?: string): RawWikilink;
}

/**
 * The instance members of the `RawWikilink` class. For static members,
 * see {@link RawWikilinkStatic} (defined separately due to TypeScript limitations).
 */
export interface RawWikilink extends WikilinkBase<string> {
	/**
	 * Sets a new title to the instance.
	 *
	 * If the new title is a valid MediaWiki title, use {@link toWikilink} or {@link toFileWikilink} instead.
	 *
	 * @param title The new title. This must be a string.
	 * @returns The current instance for chaining.
	 */
	setTitle(title: string): this;
	/**
	 * Creates a new {@link Wikilink} instance, inheriting the current instance's properties.
	 *
	 * @param title The non-file title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A new {@link Wikilink} instance on success; otherwise, `null`.
	 */
	toWikilink(title: string | Title, verbose?: boolean): Wikilink | null;
	/**
	 * Creates a new {@link FileWikilink} instance, inheriting the current instance's properties.
	 *
	 * @param title The file title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A new {@link FileWikilink} instance on success; otherwise, `null`.
	 */
	toFileWikilink(title: string | Title, verbose?: boolean): FileWikilink | null;
	/**
	 * @inheritdoc
	 */
	stringify(options?: RawWikilinkOutputConfig): string;
	/**
	 * @inheritdoc
	 */
	toString(): string;
}

/**
 * This interface defines the static members of the `ParsedRawWikilink` class. For instance members,
 * see {@link ParsedRawWikilink} (defined separately due to TypeScript limitations).
 *
 * This class is exclusive to {@link Wikitext.parseWikilinks}.
 * It represents a malformed `[[wikilink]]` markup with an *invalid* title.
 * For the class that represents a well-formed `[[wikilink]]` markup with a valid *non-file*
 * title, see {@link ParsedWikilinkStatic}, and for the class that represents a well-formed
 * `[[wikilink]]` markup with a valid *file* title, see {@link ParsedFileWikilinkStatic}.
 *
 * This class differs from {@link ParsedWikilinkStatic | ParsedWikilink} and
 * {@link ParsedFileWikilinkStatic | ParsedFileWikilink} in that:
 * - It extends the {@link RawWikilinkStatic | RawWikilink} class.
 * - (Compared to ParsedFileWikilink) its instances have methods related to the display text.
 * - The {@link ParsedRawWikilink.title | title} property is a string instead of
 * an instace of {@link Title}.
 *
 * The constructor of this class is inaccessible, and instances can only be referenced
 * in the result of `parseTemplates`.
 *
 * To check if an object is an instance of this class, use {@link WikilinkStatic.is}.
 *
 * **Important**:
 *
 * The instance properties of this class are pseudo-read-only, in the sense that altering them
 * does not affect the behaviour of {@link Wikitext.modifyWikilinks}.
 *
 * @private
 */
export interface ParsedRawWikilinkStatic extends Omit<RawWikilinkStatic, 'new'> {
	/**
	 * @param initializer
	 * @private
	 */
	new(initializer: ParsedRawWikilinkInitializer): ParsedRawWikilink;
}

/**
 * The instance members of the `ParsedRawWikilink` class. For static members,
 * see {@link ParsedRawWikilinkStatic} (defined separately due to TypeScript limitations).
 */
export interface ParsedRawWikilink extends RawWikilink {
	/**
	 * The raw wikilink title, as directly parsed from the left part of a `[[wikilink|...]]` expression.
	 */
	rawTitle: string;
	/**
	 * The original text of the wikilink parsed from the wikitext.
	 * The value of this property is static.
	 */
	text: string;
	/**
	 * The starting index of this wikilink in the wikitext.
	 */
	startIndex: number;
	/**
	 * The ending index of this wikilink in the wikitext (exclusive).
	 */
	endIndex: number;
	/**
	 * Whether the wikilink appears inside an HTML tag specified in {@link WikitextOptions.skipTags}.
	 */
	skip: boolean;

	/**
	 * Creates a new {@link ParsedWikilink} instance, inheriting the current instance's properties.
	 *
	 * @param title The non-file title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A new {@link ParsedWikilink} instance on success; otherwise, `null`.
	 */
	toWikilink(title: string | Title, verbose?: boolean): ParsedWikilink | null;
	/**
	 * Creates a new {@link ParsedFileWikilink} instance, inheriting the current instance's properties.
	 *
	 * @param title The file title to set.
	 * @param verbose Whether to log errors. (Default: `false`)
	 * @returns A new {@link ParsedFileWikilink} instance on success; otherwise, `null`.
	 */
	toFileWikilink(title: string | Title, verbose?: boolean): ParsedFileWikilink | null;
	/**
	 * @inheritdoc
	 */
	stringify(options?: ParsedRawWikilinkOutputConfig): string;
	/**
	 * @inheritdoc
	 */
	toString(): string;
	/**
	 * @hidden
	 */
	_clone(): ParsedRawWikilink;
}

/**
 * @internal
 */
export function WikilinkFactory(config: Mwbot['config'], Title: TitleStatic) {

	const namespaceIds = config.get('wgNamespaceIds');
	const NS_FILE = namespaceIds.file;

	class WikilinkBase<T extends string | Title> implements WikilinkBase<T> {

		readonly title: T;
		/**
		 * The display text of the wikilink (the part after `|`).
		 *
		 * This property is trimmed of leading and trailing whitespace.
		 * It is `null` if no display text is set.
		 */
		protected display: string | null;

		constructor(title: T, display?: string) {
			this.title = title;
			this.display = typeof display === 'string' ? Title.clean(display) : null;
		}

		getDisplay(): string {
			if (this.hasDisplay()) {
				return this.display as string;
			} else if (typeof this.title === 'string') {
				return Title.clean(this.title);
			} else {
				return this.title.getPrefixedText({fragment: true});
			}
		}

		setDisplay(display: string | null): this {
			if (typeof display === 'string' && (display = Title.clean(display))) {
				this.display = display;
				return this;
			} else if (display === null) {
				this.display = null;
				return this;
			} else {
				throw new TypeError(`Expected a string or null for "display", but got ${typeof display}.`);
			}
		}

		hasDisplay(): boolean {
			return !!this.display;
		}

		/**
		 * Validates the given title as a wikilink title and returns a Title instance.
		 * On failure, this method throws an error.
		 *
		 * @param title The prefixed title as a string or a Title instance to validate as a wikilink title.
		 * @returns A Title instance. If the input title is an Title instance in itself, a clone is returned.
		 */
		protected static validateTitle(title: string | Title): Title {
			// Whenever updating this method, also update FileWikilink.validateTitle
			if (typeof title !== 'string' && !(title instanceof Title)) {
				throw new TypeError(`Expected a string or Title instance for "title", but got ${typeof title}.`);
			}
			if (typeof title === 'string') {
				// TODO: Handle "/" (subpage) and "#" (in-page section)?
				title = new Title(title);
			} else {
				title = new Title(title.getPrefixedDb({colon: true, fragment: true}));
			}
			return title;
		}

		/**
		 * Internal stringification handler.
		 *
		 * @param left The left part of the wikilink.
		 * @param right The right part of the wikilink.
		 * @returns
		 */
		protected _stringify(left: string, right?: string): string {
			// Whenever updating this method, also update FileWikilink._stringify
			const ret = ['[[', left];
			if (typeof right === 'string') {
				ret.push(`|${right}`);
			}
			ret.push(']]');
			return ret.join('');
		}

	}

	// Check missing members
	const _wikilinkBaseCheck: WikilinkBaseStatic<string> = WikilinkBase;

	class Wikilink extends WikilinkBase<Title> implements Wikilink {

		constructor(title: string | Title, display?: string) {
			title = Wikilink.validateTitle(title);
			if (title.getNamespaceId() === NS_FILE && !title.hadLeadingColon()) {
				throw new Error('The provided title is a file title.');
			}
			super(title, display);
		}

		static is<T extends keyof WikilinkTypeMap>(obj: unknown, type: T): obj is WikilinkTypeMap[T] {
			switch (type) {
				case 'Wikilink':
					return obj instanceof Wikilink;
				case 'ParsedWikilink':
					return obj instanceof ParsedWikilink;
				case 'FileWikilink':
					return obj instanceof FileWikilink;
				case 'ParsedFileWikilink':
					return obj instanceof ParsedFileWikilink;
				case 'RawWikilink':
					return obj instanceof RawWikilink;
				case 'ParsedRawWikilink':
					return obj instanceof ParsedRawWikilink;
				default:
					throw new Error(`"${type}" is not a valid input to Wikilink.is().`);
			}
		}

		setTitle(title: string | Title, verbose = false): boolean {
			try {
				title = Wikilink.validateTitle(title);
				// If `title` is a file title, throw an error.
				if (title.getNamespaceId() === NS_FILE && !title.hadLeadingColon()) {
					throw new Error('A file title cannot be set with setTitle. Use toFileWikilink instead.');
				}
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return false;
			}
			// @ts-expect-error
			this.title = title;
			return true;
		}

		toFileWikilink(title: string | Title, verbose = false): FileWikilink | null {
			try {
				title = Wikilink.validateTitle(title);
				return new FileWikilink(title, this.display ? [this.display] : []);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
		}

		stringify(options: WikilinkOutputConfig = {}): string {
			const right = !options.suppressDisplay && this.display || undefined;
			return this._stringify(this.title.getPrefixedText({colon: true, fragment: true}), right);
		}

		override toString(): string {
			return this.stringify();
		}

	}

	// Check missing members
	type _CheckWikilinkStatic = WikilinkStatic & { new (...args: any[]): Wikilink };
	const _wikilinkCheckStatic: _CheckWikilinkStatic = Wikilink;
	// const _wikilinkCheckInstance: Wikilink = new Wikilink('');

	class ParsedWikilink extends Wikilink implements ParsedWikilink {

		rawTitle: string;
		text: string;
		startIndex: number;
		endIndex: number;
		skip: boolean;
		/**
		 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
		 */
		private _rawTitle: string;
		/**
		 * @hidden
		 */
		private _initializer: ParsedWikilinkInitializer;

		constructor(initializer: ParsedWikilinkInitializer) {
			const {display, title, rawTitle, _rawTitle, text, startIndex, endIndex, skip} = initializer;
			super(title, display);
			this._initializer = initializer;
			this.rawTitle = rawTitle;
			this._rawTitle = _rawTitle;
			this.text = text;
			this.startIndex = startIndex;
			this.endIndex = endIndex;
			this.skip = skip;
		}

		override toFileWikilink(title: string | Title, verbose = false): ParsedFileWikilink | null {
			// ParsedWikilinkInitializer has a `display` property but ParsedFileWikilinkInitializer doesn't
			// and instead has an optional `params` property
			try {
				title = Wikilink.validateTitle(title);
				const {display: _display, ...initializer} = this._initializer;
				initializer.title = title;
				if (this.display) {
					// TODO: Should we use `this.display.split('|')`? But we must handle special wiki-markups in `display`
					// e.g., if `display` is "{{{1|}}}", `params` will be `['{{{1', '}}}']`, which is obviously inaccurate
					// For the time being, let the user decide whether they want to parse `params[0]` further to handle this
					(initializer as ParsedFileWikilinkInitializer).params = [this.display];
				}
				return new ParsedFileWikilink(initializer);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
		}

		override stringify(options: ParsedWikilinkOutputConfig = {}): string {
			const {suppressDisplay, rawTitle} = options;
			const right = !suppressDisplay && this.display || undefined;
			let title = this.title.getPrefixedText({colon: true, fragment: true});
			if (rawTitle && this._rawTitle.includes('\x01')) {
				title = this._rawTitle.replace('\x01', title);
			}
			return this._stringify(title, right);
		}

		override toString(): string {
			return this.stringify();
		}

		_clone(): ParsedWikilink {
			return new ParsedWikilink(this._initializer);
		}

	}

	// Check missing members
	type _CheckParsedWikilinkStatic = ParsedWikilinkStatic & { new (...args: any[]): ParsedWikilink };
	const _parsedWikilinkCheckStatic: _CheckParsedWikilinkStatic = ParsedWikilink;
	// const _parsedWikilinkCheckInstance: ParsedWikilink = new ParsedWikilink(Object.create(null));

	class FileWikilink extends ParamBase implements FileWikilink {
		// Unlike Wikilink and RawWikilink, the right part of file links doesn't work as their display text
		// but as parameters. This class hence extends ParamBase instead of WikilinkBase. validateTitle()
		// and _stringify are neverthess the same as in WikilinkBase.

		readonly title: Title;

		constructor(title: string | Title, params: string[] = []) {
			title = FileWikilink.validateTitle(title);
			if (title.isExternal()) {
				throw new Error('The title is interwiki.');
			} else if (title.hadLeadingColon()) {
				throw new Error('The title has a leading colon.');
			} else if (title.getNamespaceId() !== NS_FILE) {
				throw new Error('The title does not belong to the File namespace.');
			}
			super(params);
			this.title = title;
		}

		setTitle(title: string | Title, verbose = false): boolean {
			try {
				title = FileWikilink.validateTitle(title);
				// If `title` is a non-file title, throw an error.
				if (!(title.getNamespaceId() === NS_FILE && !title.hadLeadingColon())) {
					throw new Error('A non-file title is not accepted unless true is passed as the second argument.');
				}
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return false;
			}
			// @ts-expect-error
			this.title = title;
			return true;
		}

		toWikilink(title: string | Title, verbose = false): Wikilink | null {
			try {
				const display = this.params.length ? this.params.join('|') : undefined;
				return new Wikilink(title, display);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
		}

		stringify(options: FileWikilinkOutputConfig = {}): string {
			const {sortPredicate} = options;
			const params = this.params.slice();
			if (typeof sortPredicate === 'function') {
				params.sort(sortPredicate);
			}
			const right = params.length ? params.join('|') : undefined;
			// At this point, `title` shouldn't be interwiki and led by a colon
			// TODO: Include the fragment?
			return this._stringify(this.title.getPrefixedText({interwiki: false}), right);
		}

		override toString(): string {
			return this.stringify();
		}

		/**
		 * Validates the given title as a wikilink title and returns a Title instance.
		 * On failure, this method throws an error.
		 *
		 * @param title The prefixed title as a string or a Title instance to validate as a wikilink title.
		 * @returns A Title instance. If the input title is an Title instance in itself, a clone is returned.
		 */
		protected static validateTitle(title: string | Title): Title {
			// Whenever updating this method, also update WikilinkBase.validateTitle
			if (typeof title !== 'string' && !(title instanceof Title)) {
				throw new TypeError(`Expected a string or Title instance for "title", but got ${typeof title}.`);
			}
			if (typeof title === 'string') {
				// TODO: Handle "/" (subpage) and "#" (in-page section)?
				title = new Title(title);
			} else {
				title = new Title(title.getPrefixedDb({colon: true, fragment: true}));
			}
			return title;
		}

		/**
		 * Internal stringification handler.
		 *
		 * @param left The left part of the wikilink.
		 * @param right The right part of the wikilink.
		 */
		protected _stringify(left: string, right?: string): string {
			// Whenever updating this method, also update WikilinkBase._stringify
			const ret = ['[[', left];
			if (typeof right === 'string') {
				ret.push(`|${right}`);
			}
			ret.push(']]');
			return ret.join('');
		}

	}

	// Check missing members
	type _CheckFileWikilinkStatic = FileWikilinkStatic & { new (...args: any[]): FileWikilink };
	const _fileWikilinkCheckStatic: _CheckFileWikilinkStatic = FileWikilink;
	// const _fileWikilinkCheckInstance: FileWikilink = new FileWikilink('');

	class ParsedFileWikilink extends FileWikilink implements ParsedFileWikilink {

		rawTitle: string;
		text: string;
		startIndex: number;
		endIndex: number;
		skip: boolean;
		/**
		 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
		 */
		private _rawTitle: string;
		/**
		 * @hidden
		 */
		private _initializer: ParsedFileWikilinkInitializer;

		constructor(initializer: ParsedFileWikilinkInitializer) {
			const {params, title, rawTitle, _rawTitle, text, startIndex, endIndex, skip} = initializer;
			super(title, params);
			this._initializer = initializer;
			this.rawTitle = rawTitle;
			this._rawTitle = _rawTitle;
			this.text = text;
			this.startIndex = startIndex;
			this.endIndex = endIndex;
			this.skip = skip;
		}

		override toWikilink(title: string | Title, verbose = false): ParsedWikilink | null{
			// ParsedFileWikilinkInitializer has a `params` property but ParsedWikilinkInitializer doesn't,
			// and has an additional `display` property (which is optional)
			try {
				title = FileWikilink.validateTitle(title);
				const {params: _params, ...initializer} = this._initializer;
				initializer.title = title;
				if (this.params.length) {
					// Set the missing (but optional) property of `display`
					(initializer as ParsedWikilinkInitializer).display = this.params.join('|');
				}
				return new ParsedWikilink(initializer);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
		}

		override stringify(options: ParsedFileWikilinkOutputConfig = {}): string {
			const {sortPredicate, rawTitle} = options;
			const params = this.params.slice();
			if (typeof sortPredicate === 'function') {
				params.sort(sortPredicate);
			}
			const right = params.length ? params.join('|') : undefined;
			// At this point, `title` shouldn't be interwiki and led by a colon
			// TODO: Include the fragment?
			let title = this.title.getPrefixedText({interwiki: false});
			if (rawTitle && this._rawTitle.includes('\x01')) {
				title = this._rawTitle.replace('\x01', title);
			}
			return this._stringify(title, right);
		}

		override toString() {
			return this.stringify();
		}

		_clone() {
			return new ParsedFileWikilink(this._initializer);
		}

	}

	// Check missing members
	type _CheckParsedFileWikilinkStatic = ParsedFileWikilinkStatic & { new (...args: any[]): ParsedFileWikilink };
	const _parsedFileWikilinkCheckStatic: _CheckParsedFileWikilinkStatic = ParsedFileWikilink;
	// const _parsedFileWikilinkCheckInstance: ParsedFileWikilink = new ParsedFileWikilink(Object.create(null));

	class RawWikilink extends WikilinkBase<string> implements RawWikilink {

		constructor(title: string, display?: string) {
			super(title, display);
		}

		setTitle(title: string): this {
			if (typeof title === 'string') {
				// @ts-expect-error
				this.title = title;
				return this;
			} else {
				throw new TypeError(`Expected a string for "title", but got "${typeof title}".`);
			}
		}

		toWikilink(title: string | Title, verbose = false): Wikilink | null {
			try {
				return new Wikilink(title, this.display || undefined);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
		}

		toFileWikilink(title: string | Title, verbose = false): FileWikilink | null {
			try {
				const params = typeof this.display === 'string' ? [this.display] : [];
				return new FileWikilink(title, params);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
		}

		stringify(options: RawWikilinkOutputConfig = {}): string {
			const right = !options.suppressDisplay && this.display || undefined;
			return this._stringify(this.title, right);
		}

		override toString() {
			return this.stringify();
		}

	}

	// Check missing members
	type _CheckRawWikilinkStatic = RawWikilinkStatic & { new (...args: any[]): RawWikilink };
	const _rawWikilinkCheckStatic: _CheckRawWikilinkStatic = RawWikilink;
	// const _rawWikilinkCheckInstance: RawWikilink = new RawWikilink('');

	class ParsedRawWikilink extends RawWikilink implements ParsedRawWikilink {

		rawTitle: string;
		text: string;
		startIndex: number;
		endIndex: number;
		skip: boolean;
		/**
		 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
		 */
		private _rawTitle: string;
		/**
		 * @hidden
		 */
		private _initializer: ParsedRawWikilinkInitializer;

		constructor(initializer: ParsedRawWikilinkInitializer) {
			const {display, title, rawTitle, _rawTitle, text, startIndex, endIndex, skip} = initializer;
			super(title, display);
			this._initializer = initializer;
			this.rawTitle = rawTitle;
			this._rawTitle = _rawTitle;
			this.text = text;
			this.startIndex = startIndex;
			this.endIndex = endIndex;
			this.skip = skip;
		}

		override toWikilink(title: string | Title, verbose = false): ParsedWikilink | null {
			// `initializer.title` is a string in ParsedRawWikilinkInitializer, a Title instance in ParsedWikilinkInitializer
			try {
				const {title: _title, ...initializerBase} = this._initializer;
				const initializer = initializerBase as ParsedWikilinkInitializer;
				initializer.title = ParsedWikilink.validateTitle(title); // Set the missing property
				initializer.display = this.display || undefined; // Update the property
				return new ParsedWikilink(initializer);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
		}

		override toFileWikilink(title: string | Title, verbose = false): ParsedFileWikilink | null {
			// `initializer.title` is a string in ParsedRawWikilinkInitializer, a Title instance in ParsedWikilinkInitializer
			// ParsedFileWikilinkInitializer doesn't have a `display` property, and instead has a `params` property
			try {
				const {title: _title, display: _display, ...initializerBase} = this._initializer;
				const initializer = initializerBase as ParsedFileWikilinkInitializer;
				initializer.title = ParsedWikilink.validateTitle(title); // Set the missing property
				initializer.params = typeof this.display === 'string' ? [this.display] : []; // Set the missing property
				return new ParsedFileWikilink(initializer);
			} catch (err) {
				if (verbose) {
					console.error(err);
				}
				return null;
			}
		}

		override stringify(options: ParsedRawWikilinkOutputConfig = {}): string {
			const {suppressDisplay, rawTitle} = options;
			const right = !suppressDisplay && this.display || undefined;
			let title = this.title;
			if (rawTitle && this._rawTitle.includes('\x01')) {
				title = this._rawTitle.replace('\x01', title);
			}
			return this._stringify(title, right);
		}

		override toString() {
			return this.stringify();
		}

		_clone() {
			return new ParsedRawWikilink(this._initializer);
		}

	}

	// Check missing members
	type _CheckParsedRawWikilinkStatic = ParsedRawWikilinkStatic & { new (...args: any[]): ParsedRawWikilink };
	const _parsedRawWikilinkCheckStatic: _CheckParsedRawWikilinkStatic = ParsedRawWikilink;
	// const _parsedRawWikilinkCheckInstance: ParsedRawWikilink = new ParsedRawWikilink(Object.create(null));

	return {
		Wikilink: Wikilink as WikilinkStatic,
		ParsedWikilink: ParsedWikilink as ParsedWikilinkStatic,
		FileWikilink: FileWikilink as FileWikilinkStatic,
		ParsedFileWikilink: ParsedFileWikilink as ParsedFileWikilinkStatic,
		RawWikilink: RawWikilink as RawWikilinkStatic,
		ParsedRawWikilink: ParsedRawWikilink as ParsedRawWikilinkStatic
	};

}

/**
 * Helper interface for {@link WikilinkStatic.is}.
 * @private
 */
export interface WikilinkTypeMap {
	Wikilink: Wikilink;
	ParsedWikilink: ParsedWikilink;
	FileWikilink: FileWikilink;
	ParsedFileWikilink: ParsedFileWikilink;
	RawWikilink: RawWikilink;
	ParsedRawWikilink: ParsedRawWikilink;
}

/**
 * Options for {@link Wikilink.stringify}.
 */
export interface WikilinkOutputConfig {
	/**
	 * Whether to suppress the display text even if the wikilink has it.
	 */
	suppressDisplay?: boolean;
}

/**
 * Options for {@link ParsedWikilink.stringify}.
 */
export interface ParsedWikilinkOutputConfig extends WikilinkOutputConfig {
	/**
	 * Whether to preserve redundant characters surrounding the title, as found in
	 * {@link ParsedWikilink.rawTitle | rawTitle}.
	 *
	 * This option is ignored if such characters interrupt the title itself (e.g., `'F<!---->oo'`).
	 */
	rawTitle?: boolean;
}

/**
 * Options for {@link FileWikilink.stringify}.
 */
export interface FileWikilinkOutputConfig {
	/**
	 * Callback function to {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort | Array.prototype.sort},
	 * called on a deep copy of {@link FileWikilink.params} (i.e., the original array is not mutated).
	 *
	 * @param param1
	 * @param param2
	 */
	sortPredicate?: (param1: string, param2: string) => number;
}

/**
 * Options for {@link ParsedFileWikilink.stringify}.
 */
export interface ParsedFileWikilinkOutputConfig extends FileWikilinkOutputConfig {
	/**
	 * Whether to preserve redundant characters surrounding the title, as found in
	 * {@link ParsedFileWikilink.rawTitle | rawTitle}.
	 *
	 * This option is ignored if such characters interrupt the title itself (e.g., `'F<!---->oo'`).
	 */
	rawTitle?: boolean;
}

/**
 * Options for {@link RawWikilink.stringify}.
 */
export interface RawWikilinkOutputConfig {
	/**
	 * Whether to suppress the display text even if the wikilink has it.
	 */
	suppressDisplay?: boolean;
}

/**
 * Options for {@link ParsedRawWikilink.stringify}.
 */
export interface ParsedRawWikilinkOutputConfig extends RawWikilinkOutputConfig {
	/**
	 * Whether to preserve redundant characters surrounding the title, as found in
	 * {@link ParsedRawWikilink.rawTitle | rawTitle}.
	 *
	 * This option is ignored if such characters interrupt the title itself (e.g., `'F<!---->oo'`).
	 */
	rawTitle?: boolean;
}

/**
 * The base initializer object for ParsedWikilink-related constructors.
 */
interface ParsedWikilinkInitializerBase<T extends string | Title> {
	title: T;
	rawTitle: string;
	/** Potentially includes a control character. */
	_rawTitle: string;
	text: string;
	startIndex: number;
	endIndex: number;
	skip: boolean;
}

/**
 * The initializer object for {@link ParsedWikilink}.
 */
interface ParsedWikilinkInitializer extends ParsedWikilinkInitializerBase<Title> {
	display?: string;
}

/**
 * The initializer object for {@link ParsedFileWikilink}.
 */
interface ParsedFileWikilinkInitializer extends ParsedWikilinkInitializerBase<Title> {
	params?: string[];
}

/**
 * The initializer object for {@link ParsedRawWikilink}.
 */
interface ParsedRawWikilinkInitializer extends ParsedWikilinkInitializerBase<string> {
	display?: string;
}