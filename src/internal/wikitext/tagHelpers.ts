/*!
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
 */

// -------- Adapted from Sanitizer::getRecognizedTagData --------
// See https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/refs/heads/master/includes/Parser/Sanitizer.php
// See https://www.mediawiki.org/wiki/Help:HTML_in_wikitext

import { Mwbot } from '../../Mwbot.js';

/**
 * Set of HTML tag names that must be closed.
 */
// $htmlpairsStatic
export const TAG_PAIRS: ReadonlySet<string> = new Set([
	'b', 'bdi', 'del', 'i', 'ins', 'u', 'font', 'big', 'small', 'sub', 'sup', 'h1',
	'h2', 'h3', 'h4', 'h5', 'h6', 'cite', 'code', 'em', 's',
	'strike', 'strong', 'tt', 'var', 'div', 'center',
	'blockquote', 'ol', 'ul', 'dl', 'table', 'caption', /*'pre',*/
	'ruby', 'rb', 'rp', 'rt', 'rtc', 'p', 'span', 'abbr', 'dfn',
	'kbd', 'samp', 'data', 'time', 'mark',
]);

/**
 * Set of HTML tag names that must be self-closed.
 *
 * For tags not also in {@link TAG_SINGLE_ONLY}, a self-closed tag will be emitted
 * as an empty element (open-tag/close-tag pair).
 */
// $htmlsingle
export const TAG_SINGLE: ReadonlySet<string> = new Set([
	'br', 'wbr', 'hr', 'li', 'dt', 'dd', 'meta', 'link',
]);

/**
 * Set of HTML tag names that cannot have close tags.
 *
 * This is (not coincidentally) also the list of tags for which the HTML 5 parsing algorithm
 * requires you to "acknowledge the token's self-closing flag", i.e. a self-closing tag like
 * `<br/>` is not an HTML 5 parse error only for this list.
 */
// $htmlsingleonly
export const TAG_SINGLE_ONLY: ReadonlySet<string> = new Set([
	'br', 'wbr', 'hr', 'meta', 'link',
]);

/**
 * Set of HTML tag names that can be nested. (?)
 */
// $htmlnest
export const TAG_NEST: ReadonlySet<string> = new Set([
	'table', 'tr', 'td', 'th', 'div', 'blockquote', 'ol', 'ul',
	'li', 'dl', 'dt', 'dd', 'font', 'big', 'small', 'sub', 'sup', 'span',
	'var', 'kbd', 'samp', 'em', 'strong', 'q', 'ruby', 'bdo',
]);

/**
 * Set of HTML tag names that only appear inside `<table>`.
 */
// $tabletags
export const TAG_TABLE: ReadonlySet<string> = new Set([
	'td', 'th', 'tr',
]);

/**
 * Set of HTML tag names used to make list containers.
 */
// $htmllist
// export const TAG_LIST: ReadonlySet<string> = new Set([
// 	'ul', 'ol',
// ]);

/**
 * Set of HTML tag names that can appear in a list.
 */
// $listtags
// export const TAG_LISTITEM: ReadonlySet<string> = new Set([
// 	'li',
// ]);

/**
 * Set of HTML tag names that can be self-closed.
 */
// $htmlsingleallowed
export const TAG_SINGLE_ALLOWED: ReadonlySet<string> = new Set([...TAG_SINGLE, ...TAG_TABLE]);

/**
 * Set of HTML tag names recognized by MediaWiki.
 */
// $htmlelementsStatic
export const TAG_HTML: ReadonlySet<string> = new Set([...TAG_SINGLE, ...TAG_PAIRS, ...TAG_NEST]);

// -------- Adapted from Sanitizer::getRecognizedTagData end --------

/**
 * Returns a Set of parser extension tag names supported on the current wiki.
 *
 * Note that parser extension tags allow self-closure by specs.
 *
 * @param info
 * @returns
 */
export function getParserExtensionTags(info: Mwbot['_info']): ReadonlySet<string> {
	const list: string[] = [];

	// The following "skip tags" are defined in Core: ensure their existence
	// in case they are missing in `info.extensiontags`
	list.push('nowiki', 'pre');

	// Depends on whether $wgRawHtml is enabled
	// list.push('html');

	// Defined in Preprocessor_Hash::buildDomTreeArrayFromText
	// See https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/refs/heads/master/includes/Parser/Preprocessor_Hash.php
	list.push('includeonly', 'noinclude', 'onlyinclude');

	const rTag = /^<([^>]+)>$/;
	for (const extTag of info.extensiontags) {
		list.push(extTag.replace(rTag, '$1'));
	}

	const installedExtensions = new Set<string>();
	for (const { name } of info.extensions) {
		if (name) {
			installedExtensions.add(name);
		}
	}

	if (installedExtensions.has('Dynamicpagelist')) {
		list.push('dynamicpagelist');
	}
	if (installedExtensions.has('Translate')) {
		list.push('languages', 'translate', 'tvar');
	}
	if (installedExtensions.has('RSS')) {
		list.push('rss');
	}
	if (installedExtensions.has('LiquidThreads')) {
		list.push('talkpage', 'thread');
	}

	return new Set(list);
}

/**
 * Set of tag names inside which wikitext is not parsed.
 */
// TODO: Cannot handle rare cases like "<nowiki>[[link<!--]]-->|display]]</nowiki>",
// where a comment tag is nested inside a non-comment skip tag. To handle these,
// it'll be necessary to differentiate the types of skip tags.
export const TAG_SKIP: ReadonlySet<string> = new Set([
	'!--', 'nowiki', 'pre', 'syntaxhighlight', 'source', 'math',
]);

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
export const tagRegex = {
	/**
	 * Matches the next possible beginning of an HTML tag or comment end marker.
	 *
	 * Used to skip over plain text before attempting full tag matching.
	 */
	next: /<|-->/,
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
};