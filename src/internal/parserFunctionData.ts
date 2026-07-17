import { Mwbot } from '../Mwbot.js';
import { TitleStatic } from '../Title.js';
import { escapeRegExp } from '../Util.js';

/**
 * Parser functions whose canonical hooks do not begin with a hash character.
 *
 * See `CoreParserFunctions::register` in
 * https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/refs/heads/master/includes/Parser/CoreParserFunctions.php
 */
export const noHashFunctions: ReadonlySet<string> = new Set([
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
	'contentmodel',
	'isbn',
	// The following are handled by dedicated internal functions.
	'int',
	'displaytitle',
	'pagesinnamespace',
]);

/**
 * Creates a map of parser function hooks to their validation regular expressions.
 *
 * The returned object is keyed by canonical parser function hooks (e.g. `"#if:"`
 * or `"plural:"`), and each value is a regular expression that matches all valid
 * aliases of that hook, taking MediaWiki's case-sensitivity rules into account.
 *
 * @param info Site information obtained from the MediaWiki API.
 * @param Title The {@link Title} class, used for locale-aware case conversion.
 * @returns A parser function validation map.
 */
export function createParserFunctionMap(
	info: Mwbot['_info'],
	Title: TitleStatic
): Record<string, RegExp> {
	const functionHooks = new Set(info.functionhooks);
	/**
	 * Maps canonical parser function hooks to their validation regular expressions.
	 *
	 * The regular expressions include the trailing colon, which may be a full-width
	 * colon in some languages.
	 */
	const parserFunctionMap: Record<string, RegExp> = Object.create(null);

	for (const obj of info.magicwords) {
		if (!functionHooks.has(obj.name)) {
			continue;
		}

		const sensitive = obj['case-sensitive'];
		const keys = new Set([obj.name]);
		const noHash = noHashFunctions.has(obj.name);

		for (const alias of obj.aliases) {
			if (!/^[_＿].+[_＿]$/.test(alias)) {
				keys.add(alias);
			}
		}

		const regexSources: string[] = [];

		for (let key of keys) {
			let hash = noHash ? '' : '#';
			if (key.startsWith('#')) {
				hash = '#';
				key = key.slice(1);
			}
			if (!/[:：]$/.test(key)) {
				key += ':';
			}

			if (sensitive) {
				// The first letter is case-insensitive even if the function hook itself is case-sensitive
				const first = key.charAt(0);
				let source = `${hash}[`;
				source += escapeRegExp(Title.uc(first));
				source += escapeRegExp(Title.lc(first));
				source += ']';

				const rest = key.slice(1);
				if (rest) {
					source += escapeRegExp(rest);
				}

				regexSources.push(source);
			} else {
				regexSources.push(hash + escapeRegExp(key));
			}
		}

		const canonical = (noHash ? '' : '#') + obj.name + ':';
		const flag = sensitive ? '' : 'i';
		parserFunctionMap[canonical] = new RegExp(`^(?:${regexSources.join('|')})$`, flag);
	}

	return parserFunctionMap;
}
