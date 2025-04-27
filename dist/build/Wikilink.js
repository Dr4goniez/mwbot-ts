"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WikilinkFactory = WikilinkFactory;
const baseClasses_1 = require("./baseClasses");
/**
 * @internal
 */
function WikilinkFactory(config, Title) {
    const namespaceIds = config.get('wgNamespaceIds');
    const NS_FILE = namespaceIds.file;
    class WikilinkBase {
        title;
        /**
         * The display text of the wikilink (the part after `|`).
         *
         * This property is trimmed of leading and trailing whitespace.
         * It is `null` if no display text is set.
         */
        _display;
        constructor(title, display) {
            this.title = title;
            this._display = typeof display === 'string' ? Title.clean(display) : null;
        }
        getDisplay() {
            if (this.hasDisplay()) {
                return this._display;
            }
            else if (typeof this.title === 'string') {
                return Title.clean(this.title);
            }
            else {
                return this.title.getPrefixedText({ fragment: true });
            }
        }
        setDisplay(display) {
            if (typeof display === 'string' && (display = Title.clean(display))) {
                this._display = display;
                return this;
            }
            else if (display === null) {
                this._display = null;
                return this;
            }
            else {
                throw new TypeError(`Expected a string or null for "display", but got ${typeof display}.`);
            }
        }
        hasDisplay() {
            return !!this._display;
        }
        /**
         * Validates the given title as a wikilink title and returns a Title instance.
         * On failure, this method throws an error.
         *
         * @param title The prefixed title as a string or a Title instance to validate as a wikilink title.
         * @returns A Title instance. If the input title is an Title instance in itself, a clone is returned.
         */
        static validateTitle(title) {
            // Whenever updating this method, also update FileWikilink.validateTitle
            if (typeof title !== 'string' && !(title instanceof Title)) {
                throw new TypeError(`Expected a string or Title instance for "title", but got ${typeof title}.`);
            }
            if (typeof title === 'string') {
                // TODO: Handle "/" (subpage) and "#" (in-page section)?
                title = new Title(title);
            }
            else {
                title = new Title(title.getPrefixedDb({ colon: true, fragment: true }));
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
        _stringify(left, right) {
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
    const _wikilinkBaseCheck = WikilinkBase;
    class Wikilink extends WikilinkBase {
        constructor(title, display) {
            title = Wikilink.validateTitle(title);
            if (title.getNamespaceId() === NS_FILE && !title.hadLeadingColon()) {
                throw new Error('The provided title is a file title.');
            }
            super(title, display);
        }
        static is(obj, type) {
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
        setTitle(title, verbose = false) {
            try {
                title = Wikilink.validateTitle(title);
                // If `title` is a file title, throw an error.
                if (title.getNamespaceId() === NS_FILE && !title.hadLeadingColon()) {
                    throw new Error('A file title cannot be set with setTitle. Use toFileWikilink instead.');
                }
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return false;
            }
            // @ts-expect-error
            this.title = title;
            return true;
        }
        toFileWikilink(title, verbose = false) {
            try {
                title = Wikilink.validateTitle(title);
                return new FileWikilink(title, this._display ? [this._display] : []);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
        }
        stringify(options = {}) {
            const right = !options.suppressDisplay && this._display || undefined;
            return this._stringify(this.title.getPrefixedText({ colon: true, fragment: true }), right);
        }
        toString() {
            return this.stringify();
        }
    }
    const _wikilinkCheckStatic = Wikilink;
    // const _wikilinkCheckInstance: Wikilink = new Wikilink('');
    class ParsedWikilink extends Wikilink {
        rawTitle;
        text;
        index;
        startIndex;
        endIndex;
        nestLevel;
        skip;
        parent;
        children;
        /**
         * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
         */
        #rawTitle;
        /**
         * @hidden
         */
        #initializer;
        constructor(initializer) {
            const { display, title, rawTitle, _rawTitle, text, index, startIndex, endIndex, nestLevel, skip, parent, children } = initializer;
            super(title, display);
            this.#initializer = initializer;
            this.rawTitle = rawTitle;
            this.#rawTitle = _rawTitle;
            this.text = text;
            this.index = index;
            this.startIndex = startIndex;
            this.endIndex = endIndex;
            this.nestLevel = nestLevel;
            this.skip = skip;
            this.parent = parent;
            this.children = new Set([...children]);
        }
        toFileWikilink(title, verbose = false) {
            // ParsedWikilinkInitializer has a `display` property but ParsedFileWikilinkInitializer doesn't
            // and instead has an optional `params` property
            try {
                title = Wikilink.validateTitle(title);
                const { display: _display, ...initializer } = this.#initializer;
                initializer.title = title;
                if (this._display) {
                    // TODO: Should we use `this._display.split('|')`? But we must handle special wiki-markups in `display`
                    // e.g., if `display` is "{{{1|}}}", `params` will be `['{{{1', '}}}']`, which is obviously inaccurate
                    // For the time being, let the user decide whether they want to parse `params[0]` further to handle this
                    initializer.params = [this._display];
                }
                return new ParsedFileWikilink(initializer);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
        }
        stringify(options = {}) {
            const { suppressDisplay, rawTitle } = options;
            const right = !suppressDisplay && this._display || undefined;
            let title = this.title.getPrefixedText({ colon: true, fragment: true });
            if (rawTitle && this.#rawTitle.includes('\x01')) {
                title = this.#rawTitle.replace('\x01', title);
            }
            return this._stringify(title, right);
        }
        toString() {
            return this.stringify();
        }
        _clone() {
            return new ParsedWikilink(this.#initializer);
        }
        _setInitializer(obj) {
            for (const key in obj) {
                if (obj[key] !== undefined) {
                    this.#initializer[key] = obj[key];
                }
            }
            return this;
        }
    }
    const _parsedWikilinkCheckStatic = ParsedWikilink;
    // const _parsedWikilinkCheckInstance: ParsedWikilink = new ParsedWikilink(Object.create(null));
    class FileWikilink extends baseClasses_1.ParamBase {
        // Unlike Wikilink and RawWikilink, the right part of file links doesn't work as their display text
        // but as parameters. This class hence extends ParamBase instead of WikilinkBase. validateTitle()
        // and _stringify are neverthess the same as in WikilinkBase.
        title;
        constructor(title, params = []) {
            title = FileWikilink.validateTitle(title);
            if (title.isExternal()) {
                throw new Error('The title is interwiki.');
            }
            else if (title.hadLeadingColon()) {
                throw new Error('The title has a leading colon.');
            }
            else if (title.getNamespaceId() !== NS_FILE) {
                throw new Error('The title does not belong to the File namespace.');
            }
            super(params);
            this.title = title;
        }
        setTitle(title, verbose = false) {
            try {
                title = FileWikilink.validateTitle(title);
                // If `title` is a non-file title, throw an error.
                if (!(title.getNamespaceId() === NS_FILE && !title.hadLeadingColon())) {
                    throw new Error('A non-file title is not accepted unless true is passed as the second argument.');
                }
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return false;
            }
            // @ts-expect-error
            this.title = title;
            return true;
        }
        toWikilink(title, verbose = false) {
            try {
                const display = this.params.length ? this.params.join('|') : undefined;
                return new Wikilink(title, display);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
        }
        stringify(options = {}) {
            const { sortPredicate } = options;
            const params = this.params.slice();
            if (typeof sortPredicate === 'function') {
                params.sort(sortPredicate);
            }
            const right = params.length ? params.join('|') : undefined;
            // At this point, `title` shouldn't be interwiki and led by a colon
            // TODO: Include the fragment?
            return this._stringify(this.title.getPrefixedText({ interwiki: false }), right);
        }
        toString() {
            return this.stringify();
        }
        /**
         * Validates the given title as a wikilink title and returns a Title instance.
         * On failure, this method throws an error.
         *
         * @param title The prefixed title as a string or a Title instance to validate as a wikilink title.
         * @returns A Title instance. If the input title is an Title instance in itself, a clone is returned.
         */
        static validateTitle(title) {
            // Whenever updating this method, also update WikilinkBase.validateTitle
            if (typeof title !== 'string' && !(title instanceof Title)) {
                throw new TypeError(`Expected a string or Title instance for "title", but got ${typeof title}.`);
            }
            if (typeof title === 'string') {
                // TODO: Handle "/" (subpage) and "#" (in-page section)?
                title = new Title(title);
            }
            else {
                title = new Title(title.getPrefixedDb({ colon: true, fragment: true }));
            }
            return title;
        }
        /**
         * Internal stringification handler.
         *
         * @param left The left part of the wikilink.
         * @param right The right part of the wikilink.
         */
        _stringify(left, right) {
            // Whenever updating this method, also update WikilinkBase._stringify
            const ret = ['[[', left];
            if (typeof right === 'string') {
                ret.push(`|${right}`);
            }
            ret.push(']]');
            return ret.join('');
        }
    }
    const _fileWikilinkCheckStatic = FileWikilink;
    // const _fileWikilinkCheckInstance: FileWikilink = new FileWikilink('');
    class ParsedFileWikilink extends FileWikilink {
        rawTitle;
        text;
        index;
        startIndex;
        endIndex;
        nestLevel;
        skip;
        parent;
        children;
        /**
         * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
         */
        #rawTitle;
        /**
         * @hidden
         */
        #initializer;
        constructor(initializer) {
            const { params, title, rawTitle, _rawTitle, text, index, startIndex, endIndex, nestLevel, skip, parent, children } = initializer;
            super(title, params);
            this.#initializer = initializer;
            this.rawTitle = rawTitle;
            this.#rawTitle = _rawTitle;
            this.text = text;
            this.index = index;
            this.startIndex = startIndex;
            this.endIndex = endIndex;
            this.nestLevel = nestLevel;
            this.skip = skip;
            this.parent = parent;
            this.children = new Set([...children]);
        }
        toWikilink(title, verbose = false) {
            // ParsedFileWikilinkInitializer has a `params` property but ParsedWikilinkInitializer doesn't,
            // and has an additional `display` property (which is optional)
            try {
                title = FileWikilink.validateTitle(title);
                const { params: _params, ...initializer } = this.#initializer;
                initializer.title = title;
                if (this.params.length) {
                    // Set the missing (but optional) property of `display`
                    initializer.display = this.params.join('|');
                }
                return new ParsedWikilink(initializer);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
        }
        stringify(options = {}) {
            const { sortPredicate, rawTitle } = options;
            const params = this.params.slice();
            if (typeof sortPredicate === 'function') {
                params.sort(sortPredicate);
            }
            const right = params.length ? params.join('|') : undefined;
            // At this point, `title` shouldn't be interwiki and led by a colon
            // TODO: Include the fragment?
            let title = this.title.getPrefixedText({ interwiki: false });
            if (rawTitle && this.#rawTitle.includes('\x01')) {
                title = this.#rawTitle.replace('\x01', title);
            }
            return this._stringify(title, right);
        }
        toString() {
            return this.stringify();
        }
        _clone() {
            return new ParsedFileWikilink(this.#initializer);
        }
        _setInitializer(obj) {
            for (const key in obj) {
                if (obj[key] !== undefined) {
                    this.#initializer[key] = obj[key];
                }
            }
            return this;
        }
    }
    const _parsedFileWikilinkCheckStatic = ParsedFileWikilink;
    // const _parsedFileWikilinkCheckInstance: ParsedFileWikilink = new ParsedFileWikilink(Object.create(null));
    class RawWikilink extends WikilinkBase {
        constructor(title, display) {
            super(title, display);
        }
        setTitle(title) {
            if (typeof title === 'string') {
                // @ts-expect-error
                this.title = title;
                return this;
            }
            else {
                throw new TypeError(`Expected a string for "title", but got "${typeof title}".`);
            }
        }
        toWikilink(title, verbose = false) {
            try {
                return new Wikilink(title, this._display || undefined);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
        }
        toFileWikilink(title, verbose = false) {
            try {
                const params = typeof this._display === 'string' ? [this._display] : [];
                return new FileWikilink(title, params);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
        }
        stringify(options = {}) {
            const right = !options.suppressDisplay && this._display || undefined;
            return this._stringify(this.title, right);
        }
        toString() {
            return this.stringify();
        }
    }
    const _rawWikilinkCheckStatic = RawWikilink;
    // const _rawWikilinkCheckInstance: RawWikilink = new RawWikilink('');
    class ParsedRawWikilink extends RawWikilink {
        rawTitle;
        text;
        index;
        startIndex;
        endIndex;
        nestLevel;
        skip;
        parent;
        children;
        /**
         * {@link rawTitle} with the insertion point of {@link title} replaced with a control character.
         */
        #rawTitle;
        /**
         * @hidden
         */
        #initializer;
        constructor(initializer) {
            const { display, title, rawTitle, _rawTitle, text, index, startIndex, endIndex, nestLevel, skip, parent, children } = initializer;
            super(title, display);
            this.#initializer = initializer;
            this.rawTitle = rawTitle;
            this.#rawTitle = _rawTitle;
            this.text = text;
            this.index = index;
            this.startIndex = startIndex;
            this.endIndex = endIndex;
            this.nestLevel = nestLevel;
            this.skip = skip;
            this.parent = parent;
            this.children = new Set([...children]);
        }
        toWikilink(title, verbose = false) {
            // `initializer.title` is a string in ParsedRawWikilinkInitializer, a Title instance in ParsedWikilinkInitializer
            try {
                const { title: _title, ...initializerBase } = this.#initializer;
                const initializer = initializerBase;
                initializer.title = ParsedWikilink.validateTitle(title); // Set the missing property
                initializer.display = this._display || undefined; // Update the property
                return new ParsedWikilink(initializer);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
        }
        toFileWikilink(title, verbose = false) {
            // `initializer.title` is a string in ParsedRawWikilinkInitializer, a Title instance in ParsedWikilinkInitializer
            // ParsedFileWikilinkInitializer doesn't have a `_display` property, and instead has a `params` property
            try {
                const { title: _title, display: _display, ...initializerBase } = this.#initializer;
                const initializer = initializerBase;
                initializer.title = ParsedWikilink.validateTitle(title); // Set the missing property
                initializer.params = typeof this._display === 'string' ? [this._display] : []; // Set the missing property
                return new ParsedFileWikilink(initializer);
            }
            catch (err) {
                if (verbose) {
                    console.error(err);
                }
                return null;
            }
        }
        stringify(options = {}) {
            const { suppressDisplay, rawTitle } = options;
            const right = !suppressDisplay && this._display || undefined;
            let title = this.title;
            if (rawTitle && this.#rawTitle.includes('\x01')) {
                title = this.#rawTitle.replace('\x01', title);
            }
            return this._stringify(title, right);
        }
        toString() {
            return this.stringify();
        }
        _clone() {
            return new ParsedRawWikilink(this.#initializer);
        }
        _setInitializer(obj) {
            for (const key in obj) {
                if (obj[key] !== undefined) {
                    this.#initializer[key] = obj[key];
                }
            }
            return this;
        }
    }
    const _parsedRawWikilinkCheckStatic = ParsedRawWikilink;
    // const _parsedRawWikilinkCheckInstance: ParsedRawWikilink = new ParsedRawWikilink(Object.create(null));
    return {
        Wikilink: Wikilink,
        ParsedWikilink: ParsedWikilink,
        FileWikilink: FileWikilink,
        ParsedFileWikilink: ParsedFileWikilink,
        RawWikilink: RawWikilink,
        ParsedRawWikilink: ParsedRawWikilink
    };
}
