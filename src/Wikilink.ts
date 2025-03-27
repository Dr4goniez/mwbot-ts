/**
 * This module serves to parse `[[wikilink]]` expressions into object structures.
 *
 * - Class {@link Wikilink}: Attached to {@link Mwbot.Wikilink} as an instance member.
 * - Class {@link ParsedWikilink}: Represents a well-formed non-file wikilink in the result of
 * {@link Mwbot.Wikitext.parseWikilinks | Wikitext.parseWikilinks}.
 * - Class {@link FileWikilink}: Attached to {@link Mwbot.FileWikilink} as an instance member.
 * - Class {@link ParsedFileWikilink}: Represents a well-formed file wikilink in the result of
 * {@link Mwbot.Wikitext.parseWikilinks | Wikitext.parseWikilinks}.
 * - Class {@link RawWikilink}: Represents a malformed wikilink and attached to
 * {@link Mwbot.RawWikilink} as an instance member.
 * - Class {@link ParsedRawWikilink}: Represents a malformed wikilink in the result of
 * {@link Mwbot.Wikitext.parseWikilinks | Wikitext.parseWikilinks}.
 *
 * @module
 */

import { ParamBase } from './baseClasses';
import type { Mwbot } from './Mwbot';
import type { Title } from './Title';

// Imported only for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { WikitextOptions } from './Wikitext';

/**
 * @internal
 */
export function WikilinkFactory(config: Mwbot['config'], Title: Title) {

	const namespaceIds = config.get('wgNamespaceIds');
	const NS_FILE = namespaceIds.file;

	/**
	 * Base class for {@link Wikilink} and {@link RawWikilink}. This class handles
	 * the `title` and `display` properties. This also means that {@link FileWikilink}
	 * cannot extend this class because the latter property is irrelevant to it.
	 * @internal
	 */
	abstract class WikilinkBase<T extends string | InstanceType<Title>> {

		/**
		 * The title of the page that the wikilink links to.
		 *
		 * This property is read-only. To update it, use {@link setTitle}.
		 */
		readonly title: T;
		/**
		 * The display text of the wikilink (the part after `|`).
		 *
		 * This property is trimmed of leading and trailing whitespace.
		 * It is `null` if no display text is set.
		 */
		protected display: string | null;

		/**
		 * Creates a new instance.
		 *
		 * @param title The title of the page that the wikilink links to.
		 * @param display An optional display text for the wikilink.
		 */
		constructor(title: T, display?: string) {
			this.title = title;
			this.display = typeof display === 'string' ? Title.clean(display) : null;
		}

		/**
		 * Validates the given title as a wikilink title and returns a Title instance.
		 * On failure, this method throws an error.
		 *
		 * @param title The prefixed title as a string or a Title instance to validate as a wikilink title.
		 * @returns A Title instance. If the input title is an Title instance in itself, a clone is returned.
		 */
		protected static validateTitle(title: string | InstanceType<Title>): InstanceType<Title> {
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
		 * Gets the display text of the wikilink. If no display text is set,
		 * the title text is returned.
		 *
		 * Note that interlanguage links (which appear in the sidebar)
		 * are not resolved in terms of how they are displayed there.
		 *
		 * @returns The display text as a string.
		 */
		getDisplay(): string {
			if (this.hasDisplay()) {
				return this.display as string;
			} else if (typeof this.title === 'string') {
				return Title.clean(this.title);
			} else {
				return this.title.getPrefixedText({fragment: true});
			}
		}

		/**
		 * Sets the display text of the wikilink.
		 *
		 * @param display The display text. To unset it, pass an empty string or `null`.
		 * @returns The current instance for chaining.
		 */
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

		/**
		 * Checks whether this wikilink has a display text (the part after `|`).
		 *
		 * @returns A boolean indicating whether the wikilink has a display text.
		 */
		hasDisplay(): boolean {
			return !!this.display;
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

	/**
	 * Parses wikilinks into an object structure. This class is attached to {@link Mwbot.Wikilink}
	 * as an instance member.
	 *
	 * This class represents a well-formed `[[wikilink]]` expression with a valid non-file title.
	 * For the class that represents a well-formed `[[wikilink]]` expression with a valid file
	 * title, see {@link FileWikilink}, and for the class that represents a malformed
	 * `[[wikilink]]` expression, see {@link RawWikilink}.
	 */
	class Wikilink extends WikilinkBase<InstanceType<Title>> {

		/**
		 * Creates a new instance.
		 *
		 * @param title The title of the (non-file) page that the wikilink links to.
		 * @param display An optional display text for the wikilink.
		 * @throws
		 * - If the title is invalid.
		 * - If the title is a file title. To objectify a `'[[File:...]]'` wikilink,
		 * use {@link FileWikilink} instead.
		 */
		constructor(title: string | InstanceType<Title>, display?: string) {
			title = Wikilink.validateTitle(title);
			if (title.getNamespaceId() === NS_FILE && !title.hadLeadingColon()) {
				throw new Error('The provided title is a file title.');
			}
			super(title, display);
		}

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
		 * - {@link ParsedWikilink} extends {@link Wikilink}.
		 * - {@link ParsedFileWikilink} extends {@link FileWikilink}.
		 * - {@link ParsedRawWikilink} extends {@link RawWikilink}.
		 *
		 * @template T The type of wikilink to check for. Must be one of `'Wikilink'`, `'ParsedWikilink'`,
		 * `'FileWikilink'`, `'ParsedFileWikilink'`, `'RawWikilink'`, or `'ParsedRawWikilink'`.
		 * @param obj The object to check.
		 * @param type The wikilink type to compare against.
		 * @returns `true` if `obj` is an instance of the specified wikilink class, otherwise `false`.
		 * @throws {Error} If an invalid `type` is provided.
		 */
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

		/**
		 * Sets a new title to the instance.
		 *
		 * `'File:...'` titles (without a leading colon) are not accepted
		 * unless `true` is passed as the second argument.
		 *
		 * @param title The new title to set.
		 * @returns The current instance for chaining.
		 * @throws If the new title is invalid or if it is a file title.
		 */
		setTitle(title: string | InstanceType<Title>): this;
		/**
		 * Sets a new file title and converts this instance to a {@link FileWikilink}.
		 *
		 * @param title The new file title to set.
		 * @param file Whether to validate the title as a file's.
		 * @returns A new {@link FileWikilink} instance on success.
		 * @throws If the new title is not a valid file title.
		 */
		setTitle(title: string | InstanceType<Title>, file: true): InstanceType<typeof FileWikilink>;
		setTitle(title: string | InstanceType<Title>, file = false): this | InstanceType<typeof FileWikilink> {
			title = Wikilink.validateTitle(title);
			if (file) {
				return new FileWikilink(title, this.display ? [this.display] : []);
			}
			// If `file` is false but the title is a file title, throw an error.
			if (title.getNamespaceId() === NS_FILE && !title.hadLeadingColon()) {
				throw new Error('A file title is not accepted unless true is passed as the second argument.');
			}
			// @ts-expect-error
			this.title = title;
			return this;
		}

		/**
		 * Strigifies the instance.
		 *
		 * @param options Options to format the output.
		 * @returns The wikilink as a string.
		 */
		stringify(options: WikilinkOutputConfig = {}): string {
			const right = !options.suppressDisplay && this.display || undefined;
			return this._stringify(this.title.getPrefixedText({colon: true, fragment: true}), right);
		}

		/**
		 * Alias of {@link stringify}.
		 *
		 * @returns The wikilink as a string.
		 */
		toString() {
			return this.stringify();
		}

	}

	/**
	 * Class for {@link Mwbot.Wikitext.parseWikilinks | Wikitext.parseWikilinks}.
	 *
	 * This class represents a well-formed `[[wikilink]]` expression with a valid non-file title.
	 * For the class that represents a well-formed `[[wikilink]]` expression with a valid file
	 * title, see {@link ParsedFileWikilink}, and for the class that represents a malformed
	 * `[[wikilink]]` expression, see {@link ParsedRawWikilink}.
	 *
	 * This class differs from {@link ParsedFileWikilink} and {@link ParsedRawWikilink} in that:
	 * - It extends the {@link Wikilink} class.
	 * - (Compared to ParsedFileWikilink) its instances have methods related to the display text.
	 * - (Compared to ParsedRawWikilink) the {@link title} property is an instace of {@link Title}
	 * instead of a string.
	 *
	 * The constructor of this class is inaccessible, and instances can only be obtained from
	 * the result of `parseWikilinks`.
	 *
	 * To check if an object is an instace of this class, use {@link Wikilink.is}.
	 *
	 * **Important**:
	 *
	 * The instance properties of this class are pseudo-read-only, in the sense that altering them
	 * does not affect the behaviour of {@link Mwbot.Wikitext.modifyWikilinks | Wikitext.modifyWikilinks}.
	 */
	class ParsedWikilink extends Wikilink {

		/**
		 * The raw wikilink title, as directly parsed from the left part of a `[[wikilink|...]]` expression.
		 */
		rawTitle: string;
		/**
		 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
		 */
		private _rawTitle: string;
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
		 * @hidden
		 */
		private _initializer: ParsedWikilinkInitializer;

		/**
		 * @param initializer
		 * @param options
		 * @hidden
		 */
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

		/**
		 * Sets a new title to the instance.
		 *
		 * `'File:...'` titles (without a leading colon) are not accepted
		 * unless `true` is passed as the second argument.
		 *
		 * @param title The new title to set.
		 * @returns The current instance for chaining.
		 * @throws If the new title is invalid or if it is a file title.
		 */
		setTitle(title: string | InstanceType<Title>): this;
		/**
		 * Sets a new file title and converts this instance to a {@link ParsedFileWikilink}.
		 *
		 * @param title The new file title to set.
		 * @param file Whether to validate the title as a file's.
		 * @returns A new {@link ParsedFileWikilink} instance on success.
		 * @throws If the new title is not a valid file title.
		 */
		setTitle(title: string | InstanceType<Title>, file: true): InstanceType<typeof ParsedFileWikilink>;
		setTitle(title: string | InstanceType<Title>, file = false): this | InstanceType<typeof ParsedFileWikilink> {
			title = Wikilink.validateTitle(title);
			if (file) {
				const {display, ...initializer} = this._initializer;
				initializer.title = title;
				if (typeof display === 'string') {
					(initializer as ParsedFileWikilinkInitializer).params = [display];
				}
				return new ParsedFileWikilink(initializer);
			}
			// If `file` is false but the title is a file title, throw an error.
			if (title.getNamespaceId() === NS_FILE && !title.hadLeadingColon()) {
				throw new Error('A file title is not accepted unless true is passed as the second argument.');
			}
			// @ts-expect-error
			this.title = title;
			return this;
		}

		/**
		 * Strigifies the instance.
		 *
		 * @param options Options to format the output.
		 * @returns The wikilink as a string.
		 */
		stringify(options: ParsedWikilinkOutputConfig = {}): string {
			const {suppressDisplay, rawTitle} = options;
			const right = !suppressDisplay && this.display || undefined;
			let title = this.title.getPrefixedText({colon: true, fragment: true});
			if (rawTitle && this._rawTitle.includes('\x01')) {
				title = this._rawTitle.replace('\x01', title);
			}
			return this._stringify(title, right);
		}

		/**
		 * Alias of {@link stringify}.
		 *
		 * @returns The wikilink as a string.
		 */
		toString() {
			return this.stringify();
		}

		/**
		 * @hidden
		 */
		_clone() {
			return new ParsedWikilink(this._initializer);
		}

	}

	/**
	 * Parses file wikilinks into an object structure. This class is attached to {@link Mwbot.FileWikilink}
	 * as an instance member.
	 *
	 * This class represents a well-formed `[[File:...]]` expression with a valid file title. For the class
	 * that represents a well-formed non-file `[[wikilink]]` expression, see {@link Wikilink}, and for the
	 * class that represents a malformed `[[wikilink]]` expression, see {@link RawWikilink}.
	 */
	class FileWikilink extends ParamBase {
		// Unlike Wikilink and RawWikilink, the right part of file links doesn't work as their display text
		// but as parameters. This class hence extends ParamBase instead of WikilinkBase. validateTitle()
		// and _stringify are neverthess the same as in WikilinkBase.

		/**
		 * The title of the file that the wikilink links to.
		 *
		 * This property is read-only. To update it, use {@link setTitle}.
		 */
		readonly title: InstanceType<Title>;

		/**
		 * Creates a new instance.
		 *
		 * @param title The title of the file that the wikilink transcludes.
		 * @param params Optional parameters for the file link (e.g., `['thumb', '300px', ...]`).
		 * @throws
		 * - If the title is invalid.
		 * - If the title is a non-file title. To objectify a non-file `[[wikilink]]`,
		 * use {@link Wikilink} instead.
		 */
		constructor(title: string | InstanceType<Title>, params: string[] = []) {
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

		/**
		 * Validates the given title as a wikilink title and returns a Title instance.
		 * On failure, this method throws an error.
		 *
		 * @param title The prefixed title as a string or a Title instance to validate as a wikilink title.
		 * @returns A Title instance. If the input title is an Title instance in itself, a clone is returned.
		 */
		protected static validateTitle(title: string | InstanceType<Title>): InstanceType<Title> {
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
		 * Sets a new file title to the instance.
		 *
		 * Non-file titles are not accepted unless `true` is passed as the second argument.
		 *
		 * @param title The new file title to set.
		 * @returns The current instance for chaining.
		 * @throws If the new title is invalid or if it is a non-file title.
		 */
		setTitle(title: string | InstanceType<Title>): this;
		/**
		 * Sets a new non-file title and converts this instance to a {@link Wikilink}.
		 *
		 * @param title The new non-file title to set.
		 * @param nonfile Whether to validate the title as a non-file's.
		 * @returns A new {@link Wikilink} instance on success.
		 * @throws If the new title is not a valid file title.
		 */
		setTitle(title: string | InstanceType<Title>, nonfile: true): InstanceType<typeof Wikilink>;
		setTitle(title: string | InstanceType<Title>, nonfile = false): this | InstanceType<typeof Wikilink> {
			title = FileWikilink.validateTitle(title);
			if (nonfile) {
				const display = this.params.length ? this.params.join('') : undefined;
				return new Wikilink(title, display);
			}
			// If `nonfile` is false but the title is a non-file title, throw an error.
			if (!(title.getNamespaceId() === NS_FILE && !title.hadLeadingColon())) {
				throw new Error('A non-file title is not accepted unless true is passed as the second argument.');
			}
			// @ts-expect-error
			this.title = title;
			return this;
		}

		/**
		 * Internal stringification handler.
		 *
		 * @param left The left part of the wikilink.
		 * @param right The right part of the wikilink.
		 */
		_stringify(left: string, right?: string): string {
			// Whenever updating this method, also update WikilinkBase._stringify
			const ret = ['[[', left];
			if (typeof right === 'string') {
				ret.push(`|${right}`);
			}
			ret.push(']]');
			return ret.join('');
		}

		/**
		 * Stringifies the instance.
		 *
		 * @param options Options to format the output.
		 * @returns The file wikilink as a string.
		 */
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

		/**
		 * Alias of {@link stringify} called without arguments.
		 * @returns The file wikilink as a string.
		 */
		toString() {
			return this.stringify();
		}

	}

	/**
	 * Class for {@link Mwbot.Wikitext.parseWikilinks | Wikitext.parseWikilinks}.
	 *
	 * This class represents a well-formed `[[File:...]]` expression with a valid file title. For the class
	 * that represents a well-formed non-file `[[wikilink]]` expression, see {@link ParsedWikilink}, and for the
	 * class that represents a malformed `[[wikilink]]` expression, see {@link ParsedRawWikilink}.
	 *
	 * This class differs from {@link ParsedWikilink} and {@link ParsedRawWikilink} in that:
	 * - It extends the {@link FileWikilink} class.
	 * - (Compared to ParsedWikilink) its instances have methods related to the parameter texts.
	 * - (Compared to ParsedRawWikilink) the {@link title} property is an instace of {@link Title}
	 * instead of a string.
	 *
	 * The constructor of this class is inaccessible, and instances can only be obtained from
	 * the result of `parseWikilinks`.
	 *
	 * To check if an object is an instace of this class, use {@link Wikilink.is}.
	 *
	 * **Important**:
	 *
	 * The instance properties of this class are pseudo-read-only, in the sense that altering them
	 * does not affect the behaviour of {@link Mwbot.Wikitext.modifyWikilinks | Wikitext.modifyWikilinks}.
	 */
	class ParsedFileWikilink extends FileWikilink {

		/**
		 * The raw wikilink title, as directly parsed from the left part of a `[[wikilink|...]]` expression.
		 */
		rawTitle: string;
		/**
		 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
		 */
		private _rawTitle: string;
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
		 * @hidden
		 */
		private _initializer: ParsedFileWikilinkInitializer;

		/**
		 * @param initializer
		 * @param options
		 * @hidden
		 */
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

		/**
		 * Sets a new file title to the instance.
		 *
		 * Non-file titles are not accepted unless `true` is passed as the second argument.
		 *
		 * @param title The new file title to set.
		 * @returns The current instance for chaining.
		 * @throws If the new title is invalid or if it is a non-file title.
		 */
		setTitle(title: string | InstanceType<Title>): this;
		/**
		 * Sets a new non-file title and converts this instance to a {@link ParsedWikilink}.
		 *
		 * @param title The new non-file title to set.
		 * @param nonfile Whether to validate the title as a non-file's.
		 * @returns A new {@link ParsedWikilink} instance on success.
		 * @throws If the new title is not a valid non-file title.
		 */
		setTitle(title: string | InstanceType<Title>, nonfile: true): InstanceType<typeof ParsedWikilink>;
		setTitle(title: string | InstanceType<Title>, nonfile = false): this | InstanceType<typeof ParsedWikilink> {
			title = FileWikilink.validateTitle(title);
			if (nonfile) {
				const {params, ...initializer} = this._initializer;
				initializer.title = title;
				if (Array.isArray(params)) {
					(initializer as ParsedWikilinkInitializer).display = params.join('');
				}
				return new ParsedWikilink(initializer);
			}
			// If `nonfile` is false but the title is a non-file title, throw an error.
			if (!(title.getNamespaceId() === NS_FILE && !title.hadLeadingColon())) {
				throw new Error('A non-file title is not accepted unless true is passed as the second argument.');
			}
			// @ts-expect-error
			this.title = title;
			return this;
		}

		/** @inheritdoc */
		stringify(options: ParsedFileWikilinkOutputConfig = {}): string {
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

		/** @inheritdoc */
		toString() {
			return this.stringify();
		}

		/**
		 * @hidden
		 */
		_clone() {
			return new ParsedFileWikilink(this._initializer);
		}

	}

	/**
	 * Parses wikilinks with an unparsable title into an object structure. This class is attached to
	 * {@link Mwbot.RawWikilink} as an instance member.
	 *
	 * This class represents a `[[wikilink]]` expression with an **invalid** title. For the class that
	 * represents a well-formed non-file `[[wikilink]]` expression, see {@link Wikilink}, and for the
	 * class that represents a well-formed file `[[wikilink]]` expression, see {@link FileWikilink}.
	 */
	class RawWikilink extends WikilinkBase<string> {

		/**
		 * Creates a new instance.
		 *
		 * The `title` property of this class is not validated as a {@link Title} instance.
		 * The class is to construct a wikilink object whose title has to include invalid
		 * characters, e.g., `'[[{{{1}}}]]'`. When objectifying a wikilink with a valid title,
		 * use {@link Wikilink} or {@link FileWikilink} instead.
		 *
		 * @param title The title of the page that the wikilink links to.
		 * @param display An optional display text for the wikilink.
		 */
		constructor(title: string, display?: string) {
			super(title, display);
		}

		/**
		 * Sets a new title to the instance.
		 *
		 * If the new title is a valid MediaWiki title, specify `validateAs` as the second argument
		 * to convert this instance to either {@link Wikilink} or {@link FileWikilink}.
		 *
		 * @param title The new title. This must be a string.
		 * @returns The current instance for chaining.
		 */
		setTitle(title: string): this;
		/**
		 * Sets a new non-file title and converts this instance to a {@link Wikilink}.
		 *
		 * @param title The new non-file title to set.
		 * @param validateAs `'nonfile'`
		 * @returns A new {@link Wikilink} instance on success.
		 * @throws If the new title is not a valid non-file title.
		 */
		setTitle(title: string | InstanceType<Title>, validateAs: 'nonfile'): InstanceType<typeof Wikilink>;
		/**
		 * Sets a new file title and converts this instance to a {@link FileWikilink}.
		 *
		 * @param title The new file title to set.
		 * @param validateAs `'file'`
		 * @returns A new {@link FileWikilink} instance on success.
		 * @throws If the new title is not a valid file title.
		 */
		setTitle(title: string | InstanceType<Title>, validateAs: 'file'): InstanceType<typeof FileWikilink>;
		setTitle(title: string | InstanceType<Title>, validateAs?: 'nonfile' | 'file')
			: this | InstanceType<typeof Wikilink | typeof FileWikilink>
		{
			if (validateAs === undefined) {
				if (typeof title === 'string') {
					// @ts-expect-error
					this.title = title;
					return this;
				} else {
					throw new TypeError(`Expected a string for "title", but got "${typeof title}".`);
				}
			} else if (validateAs === 'nonfile') {
				return new Wikilink(title, this.display || undefined);
			} else if (validateAs === 'file') {
				const params = typeof this.display === 'string' ? [this.display] : [];
				return new FileWikilink(title, params);
			} else {
				throw new Error(`Encountered an invalid value for "validateAs": ${validateAs}`);
			}
		}

		/** @inheritdoc */
		stringify(options: RawWikilinkOutputConfig = {}): string {
			const right = !options.suppressDisplay && this.display || undefined;
			return this._stringify(this.title, right);
		}

		/** @inheritdoc */
		toString() {
			return this.stringify();
		}

	}

	/**
	 * Class for {@link Mwbot.Wikitext.parseWikilinks | Wikitext.parseWikilinks}.
	 *
	 * This class represents a `[[wikilink]]` expression with an **invalid** title. For the class that
	 * represents a well-formed non-file `[[wikilink]]` expression, see {@link ParsedWikilink}, and for the
	 * class that represents a well-formed file `[[wikilink]]` expression, see {@link ParsedFileWikilink}.
	 *
	 * This class differs from {@link ParsedWikilink} and {@link ParsedFileWikilink} in that:
	 * - It extends the {@link RawWikilink} class.
	 * - (Compared to ParsedFileWikilink) its instances have methods related to the display text.
	 * - The {@link title} property is a string instead of an instace of {@link Title}.
	 *
	 * The constructor of this class is inaccessible, and instances can only be obtained from
	 * the result of `parseWikilinks`.
	 *
	 * To check if an object is an instace of this class, use {@link Wikilink.is}.
	 *
	 * **Important**:
	 *
	 * The instance properties of this class are pseudo-read-only, in the sense that altering them
	 * does not affect the behaviour of {@link Mwbot.Wikitext.modifyWikilinks | Wikitext.modifyWikilinks}.
	 */
	class ParsedRawWikilink extends RawWikilink {

		/**
		 * The raw wikilink title, as directly parsed from the left part of a `[[wikilink|...]]` expression.
		 */
		rawTitle: string;
		/**
		 * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
		 */
		private _rawTitle: string;
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
		 * @hidden
		 */
		private _initializer: ParsedRawWikilinkInitializer;

		/**
		 * @param initializer
		 * @param options
		 * @hidden
		 */
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

		/**
		 * Sets a new title to the instance.
		 *
		 * If the new title is a valid MediaWiki title, specify `validateAs` as the second argument
		 * to convert this instance to either {@link ParsedWikilink} or {@link ParsedFileWikilink}.
		 *
		 * @param title The new title. This must be a string.
		 * @returns The current instance for chaining.
		 */
		setTitle(title: string): this;
		/**
		 * Sets a new non-file title and converts this instance to a {@link ParsedWikilink}.
		 *
		 * @param title The new non-file title to set.
		 * @param validateAs `'nonfile'`
		 * @returns A new {@link ParsedWikilink} instance on success.
		 * @throws If the new title is not a valid non-file title.
		 */
		setTitle(title: string | InstanceType<Title>, validateAs: 'nonfile'): InstanceType<typeof ParsedWikilink>;
		/**
		 * Sets a new file title and converts this instance to a {@link ParsedFileWikilink}.
		 *
		 * @param title The new file title to set.
		 * @param validateAs `'file'`
		 * @returns A new {@link ParsedFileWikilink} instance on success.
		 * @throws If the new title is not a valid file title.
		 */
		setTitle(title: string | InstanceType<Title>, validateAs: 'file'): InstanceType<typeof ParsedFileWikilink>;
		setTitle(title: string | InstanceType<Title>, validateAs?: 'nonfile' | 'file')
			: this | InstanceType<typeof ParsedWikilink | typeof ParsedFileWikilink>
		{
			if (!validateAs) {
				super.setTitle(title as string);
				return this;
			}

			const {title: _title, ...initializerBase} = this._initializer;
			switch (validateAs) {
				case 'nonfile': {
					const initializer = initializerBase as ParsedWikilinkInitializer;
					initializer.title = ParsedWikilink.validateTitle(title);
					initializer.display = this.display || undefined;
					return new ParsedWikilink(initializer);
				}
				case 'file': {
					const initializer = initializerBase as ParsedFileWikilinkInitializer;
					initializer.title = ParsedWikilink.validateTitle(title);
					initializer.params = typeof this.display === 'string' ? [this.display] : [];
					return new ParsedFileWikilink(initializer);
				}
				default:
					throw new Error(`Invalid value for "validateAs": ${validateAs}`);
			}
		}

		/** @inheritdoc */
		stringify(options: ParsedRawWikilinkOutputConfig = {}): string {
			const {suppressDisplay, rawTitle} = options;
			const right = !suppressDisplay && this.display || undefined;
			let title = this.title;
			if (rawTitle && this._rawTitle.includes('\x01')) {
				title = this._rawTitle.replace('\x01', title);
			}
			return this._stringify(title, right);
		}

		/** @inheritdoc */
		toString() {
			return this.stringify();
		}

		/**
		 * @hidden
		 */
		_clone() {
			return new ParsedRawWikilink(this._initializer);
		}

	}

	return {Wikilink, ParsedWikilink, FileWikilink, ParsedFileWikilink, RawWikilink, ParsedRawWikilink};

}

/**
 * @internal
 */
export type Wikilink = ReturnType<typeof WikilinkFactory>['Wikilink'];
/**
 * @internal
 */
export type ParsedWikilink = ReturnType<typeof WikilinkFactory>['ParsedWikilink'];
/**
 * @internal
 */
export type FileWikilink = ReturnType<typeof WikilinkFactory>['FileWikilink'];
/**
 * @internal
 */
export type ParsedFileWikilink = ReturnType<typeof WikilinkFactory>['ParsedFileWikilink'];
/**
 * @internal
 */
export type RawWikilink = ReturnType<typeof WikilinkFactory>['RawWikilink'];
/**
 * @internal
 */
export type ParsedRawWikilink = ReturnType<typeof WikilinkFactory>['ParsedRawWikilink'];

/**
 * Helper interface for {@link Wikilink.is}.
 * @private
 */
interface WikilinkTypeMap {
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
 * @internal
 */
interface ParsedWikilinkInitializerBase<T extends string | InstanceType<Title>> {
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
 * @internal
 */
interface ParsedWikilinkInitializer extends ParsedWikilinkInitializerBase<InstanceType<Title>> {
	display?: string;
}

/**
 * The initializer object for {@link ParsedFileWikilink}.
 * @internal
 */
interface ParsedFileWikilinkInitializer extends ParsedWikilinkInitializerBase<InstanceType<Title>> {
	params?: string[];
}

/**
 * The initializer object for {@link ParsedRawWikilink}.
 * @internal
 */
interface ParsedRawWikilinkInitializer extends ParsedWikilinkInitializerBase<string> {
	display?: string;
}