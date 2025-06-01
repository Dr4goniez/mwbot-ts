/**
 * This module includes interfaces and types for API-related functionality.
 *
 * @module
 */

import { XOR } from 'ts-xor';

// ************************************** General types **************************************

/**
 * Constructs a type in which the properties specified in `K` are optional.
 *
 * Equivalent to `Partial<Record<K, T>>`.
 */
export type PartialRecord<K extends keyof any, T> = {
	[P in K]?: T;
};

/**
 * Constructs a type in which only one key in `K` can have the value in `V`.
 * ```
 * // Error
 * const ex1: OnlyOneRecord<'a' | 'b', { 1: 1 }> = {
 *   a: { 1: 1 },
 *   b: { 1: 1 }
 * };
 * // Ok
 * const ex2: OnlyOneRecord<'a' | 'b', { 1: 1 }> = {
 *   b: { 1: 1 }
 * };
 * ```
 */
export type OnlyOneRecord<K extends string, V = any> = {
	[P in K]: (Record<P, V> & Partial<Record<Exclude<K, P>, never>>) extends infer O
	? { [Q in keyof O]: O[Q] }
	: never
}[K];

/**
 * Utility type that makes a subset of properties in an object type required. Use this when certain properties
 * in a generally optional object type are known to be present.
 *
 * For example, the `linkshere` property in the response from
 * {@link https://en.wikipedia.org/w/api.php?action=query&formatversion=2&titles=Main_page&prop=linkshere&lhprop= | titles=Main_page&prop=linkshere&lhprop=}
 * will be an array of empty objects because `lhprop=` is left empty. However, specifying
 * {@link https://en.wikipedia.org/w/api.php?action=query&formatversion=2&titles=Main_page&prop=linkshere&lhprop=pageid | lhprop=pageid}
 * guarantees that each object will contain a `pageid` property. In such cases, you can do:
 *
 * ```ts
 * import { PartiallyRequired, ApiResponseQueryPagesPropLinkshere } from 'mwbot-ts';
 * type ApiResponseQueryPagesPropLinkshereVerified = PartiallyRequired<ApiResponseQueryPagesPropLinkshere, 'pageid'>;
 * ```
 *
 * This creates a type where the `pageid` property is non-optional, without modifying the rest of the type.
 *
 * @template T The base object type.
 * @template K The keys of `T` to make required.
 */
export type PartiallyRequired<T extends Record<string, any>, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

/**
 * Represents a value that can be either a single item of type `T` or an array of `T`.
 *
 * Useful for API inputs or configurations that accept both a single value and multiple values.
 *
 * @template T The base type.
 */
export type MultiValue<T> = T | T[];

// ************************************** Parameter types **************************************

/**
 * The API query parameters.
 * @see https://www.mediawiki.org/wiki/API:Main_page
 */
export interface ApiParams {
	action?: ApiParamsAction;

	// Copied from https://github.com/wikimedia-gadgets/types-mediawiki/blob/main/api_params/index.d.ts

	format?: "json" | "jsonfm" | "xml" | "xmlfm" | "php" | "none";
	maxlag?: number;
	smaxage?: number;
	maxage?: number;
	assert?: "user" | "bot" | "anon";
	assertuser?: string;
	requestid?: string;
	servedby?: boolean;
	curtimestamp?: boolean;
	responselanginfo?: boolean;
	origin?: string;
	uselang?: string;
	errorformat?: "bc" | "html" | "none" | "plaintext" | "raw" | "wikitext";
	errorlang?: string;
	errorsuselocal?: boolean;
	centralauthtoken?: string;

	// format=json
	callback?: string;
	utf8?: boolean;
	ascii?: boolean;
	formatversion?: "1" | "2" | "latest";

	// ------ Copy end ------

	// For action-specific parameters
	[param: string]:
		| string
		| number
		| boolean
		| (string | number)[]
		| undefined
		| Date;
}

export type ApiParamsAction =
	| 'abusefiltercheckmatch'
	| 'abusefilterchecksyntax'
	| 'abusefilterevalexpression'
	| 'abusefilterunblockautopromote'
	| 'abuselogprivatedetails'
	| 'acquiretempusername'
	| 'aggregategroups'
	| 'antispoof'
	| 'block'
	| 'centralauthtoken'
	| 'centralnoticecdncacheupdatebanner'
	| 'centralnoticechoicedata'
	| 'centralnoticequerycampaign'
	| 'changeauthenticationdata'
	| 'changecontentmodel'
	| 'checktoken'
	| 'cirrus-config-dump'
	| 'cirrus-mapping-dump'
	| 'cirrus-profiles-dump'
	| 'cirrus-settings-dump'
	| 'clearhasmsg'
	| 'clientlogin'
	| 'communityconfigurationedit'
	| 'compare'
	| 'createaccount'
	| 'createlocalaccount'
	| 'delete'
	| 'deleteglobalaccount'
	| 'discussiontoolsedit'
	| 'discussiontoolsfindcomment'
	| 'discussiontoolsgetsubscriptions'
	| 'discussiontoolssubscribe'
	| 'discussiontoolsthank'
	| 'echocreateevent'
	| 'echomarkread'
	| 'echomarkseen'
	| 'echomute'
	| 'edit'
	| 'editmassmessagelist'
	| 'emailuser'
	| 'expandtemplates'
	| 'featuredfeed'
	| 'feedcontributions'
	| 'feedrecentchanges'
	| 'feedthreads'
	| 'feedwatchlist'
	| 'filerevert'
	| 'flow-parsoid-utils'
	| 'flow'
	| 'flowthank'
	| 'globalblock'
	| 'globalpreferenceoverrides'
	| 'globalpreferences'
	| 'globaluserrights'
	| 'groupreview'
	| 'help'
	| 'imagerotate'
	| 'import'
	| 'jsonconfig'
	| 'languagesearch'
	| 'linkaccount'
	| 'login'
	| 'logout'
	| 'managetags'
	| 'markfortranslation'
	| 'massmessage'
	| 'mergehistory'
	| 'move'
	| 'newslettersubscribe'
	| 'opensearch'
	| 'options'
	| 'paraminfo'
	| 'parse'
	| 'patrol'
	| 'protect'
	| 'purge'
	| 'query'
	| 'removeauthenticationdata'
	| 'resetpassword'
	| 'revisiondelete'
	| 'rollback'
	| 'rsd'
	| 'searchtranslations'
	| 'setglobalaccountstatus'
	| 'setnotificationtimestamp'
	| 'setpagelanguage'
	| 'shortenurl'
	| 'sitematrix'
	| 'spamblacklist'
	| 'streamconfigs'
	| 'strikevote'
	| 'tag'
	| 'templatedata'
	| 'thank'
	| 'threadaction'
	| 'titleblacklist'
	| 'torblock'
	| 'transcodereset'
	| 'translationaids'
	| 'translationreview'
	| 'translationstats'
	| 'ttmserver'
	| 'unblock'
	| 'undelete'
	| 'unlinkaccount'
	| 'upload'
	| 'userrights'
	| 'validatepassword'
	| 'watch'
	| 'webapp-manifest'
	| 'webauthn'
	| 'wikilove';

/** */
export interface ApiParamsActionBlock extends ApiParams {
	// Adapted from https://github.com/wikimedia-gadgets/types-mediawiki-api/blob/main/index.d.ts
	id?: number;
	user?: string;
	/** @deprecated */
	userid?: number;
	expiry?: string;
	reason?: string;
	anononly?: boolean;
	nocreate?: boolean;
	autoblock?: boolean;
	noemail?: boolean;
	hidename?: boolean;
	allowusertalk?: boolean;
	reblock?: boolean;
	newblock?: boolean;
	watchuser?: boolean;
	watchlistexpiry?: string;
	tags?: string | string[];
	partial?: boolean;
	pagerestrictions?: string | string[];
	namespacerestrictions?: number | number[];
	actionrestrictions?: ApiActionRestrictions | ApiActionRestrictions[];
	token?: string;
}

/** */
export interface ApiParamsActionDelete extends ApiParams {
	// Adapted from https://github.com/wikimedia-gadgets/types-mediawiki-api/blob/main/index.d.ts
	title?: string;
	pageid?: number;
	reason?: string;
	tags?: string | string[];
	deletetalk?: boolean;
	/** @deprecated */
	watch?: boolean;
	watchlist?: "nochange" | "preferences" | "unwatch" | "watch";
	watchlistexpiry?: string;
	/** @deprecated */
	unwatch?: boolean;
	oldimage?: string;
	token?: string;
}

/** */
export interface ApiParamsActionEdit extends ApiParams {
	// Adapted from https://github.com/wikimedia-gadgets/types-mediawiki/blob/main/api_params/index.d.ts
	title?: string;
	pageid?: number;
	section?: number | string;
	sectiontitle?: string;
	text?: string;
	summary?: string;
	tags?: string | string[];
	minor?: boolean;
	notminor?: boolean;
	bot?: boolean;
	baserevid?: number;
	basetimestamp?: string | Date;
	starttimestamp?: string | Date;
	recreate?: boolean;
	createonly?: boolean;
	nocreate?: boolean;
	watch?: boolean;
	unwatch?: boolean;
	watchlist?: "nochange" | "preferences" | "unwatch" | "watch";
	watchlistexpiry?: string;
	md5?: string;
	prependtext?: string;
	appendtext?: string;
	undo?: number;
	undoafter?: number;
	redirect?: boolean;
	contentformat?:
		| "application/json"
		| "application/octet-stream"
		| "application/unknown"
		| "application/x-binary"
		| "text/css"
		| "text/javascript"
		| "text/plain"
		| "text/unknown"
		| "text/x-wiki"
		| "unknown/unknown";
	contentmodel?:
		| "GadgetDefinition"
		| "JsonSchema"
		| "MassMessageListContent"
		| "Scribunto"
		| "SecurePoll"
		| "css"
		| "javascript"
		| "json"
		| "sanitized-css"
		| "text"
		| "unknown"
		| "wikitext";
	token?: string;
	returnto?: string;
	returntoquery?: string;
	returntoanchor?: string;
	captchaword?: string;
	captchaid?: string;
}

/** */
export interface ApiParamsActionMove extends ApiParams {
	// Adapted from https://github.com/wikimedia-gadgets/types-mediawiki-api/blob/main/index.d.ts
	from?: string;
	fromid?: number;
	to: string;
	reason?: string;
	movetalk?: boolean;
	movesubpages?: boolean;
	noredirect?: boolean;
	watchlist?: "nochange" | "preferences" | "unwatch" | "watch";
	watchlistexpiry?: string;
	ignorewarnings?: boolean;
	tags?: string | string[];
	token?: string;
}

/** */
export interface ApiParamsActionParse extends ApiParams {
	// Adapted from https://github.com/wikimedia-gadgets/types-mediawiki-api/blob/main/index.d.ts
	title?: string;
	text?: string;
	revid?: number;
	summary?: string;
	page?: string;
	pageid?: number;
	redirects?: boolean;
	oldid?: number;
	prop?: MultiValue<
		| "categories"
		| "categorieshtml"
		| "displaytitle"
		| "encodedjsconfigvars"
		| "externallinks"
		| "headhtml"
		| "images"
		| "indicators"
		| "iwlinks"
		| "jsconfigvars"
		| "langlinks"
		| "limitreportdata"
		| "limitreporthtml"
		| "links"
		| "modules"
		| "parsetree"
		| "parsewarnings"
		| "parsewarningshtml"
		| "properties"
		| "revid"
		| "sections"
		| "subtitle"
		| "templates"
		| "text"
		| "wikitext"
		| "headitems"
	>;
	wrapoutputclass?: string;
	parsoid?: boolean;
	pst?: boolean;
	onlypst?: boolean;
	effectivelanglinks?: boolean;
	section?: string;
	sectiontitle?: string;
	disablepp?: boolean;
	disablelimitreport?: boolean;
	disableeditsection?: boolean;
	disablestylededuplication?: boolean;
	showstrategykeys?: boolean;
	generatexml?: boolean;
	preview?: boolean;
	sectionpreview?: boolean;
	disabletoc?: boolean;
	useskin?:
		| "apioutput"
		| "cologneblue"
		| "contenttranslation"
		| "fallback"
		| "minerva"
		| "modern"
		| "monobook"
		| "timeless"
		| "vector"
		| "vector-2022";
	contentformat?:
		| "application/json"
		| "application/octet-stream"
		| "application/unknown"
		| "application/x-binary"
		| "text/css"
		| "text/javascript"
		| "text/plain"
		| "text/unknown"
		| "text/x-wiki"
		| "unknown/unknown";
	contentmodel?:
		| "GadgetDefinition"
		| "JsonSchema"
		| "MassMessageListContent"
		| "Scribunto"
		| "SecurePoll"
		| "css"
		| "javascript"
		| "json"
		| "sanitized-css"
		| "text"
		| "unknown"
		| "wikitext";
	mobileformat?: boolean;
	templatesandboxprefix?: string | string[];
	templatesandboxtitle?: string;
	templatesandboxtext?: string;
	templatesandboxcontentmodel?:
		| "GadgetDefinition"
		| "JsonSchema"
		| "MassMessageListContent"
		| "Scribunto"
		| "SecurePoll"
		| "css"
		| "javascript"
		| "json"
		| "sanitized-css"
		| "text"
		| "unknown"
		| "wikitext";
	templatesandboxcontentformat?:
		| "application/json"
		| "application/octet-stream"
		| "application/unknown"
		| "application/x-binary"
		| "text/css"
		| "text/javascript"
		| "text/plain"
		| "text/unknown"
		| "text/x-wiki"
		| "unknown/unknown";
}

/** */
export interface ApiParamsActionProtect extends ApiParams {
	// Adapted from https://github.com/wikimedia-gadgets/types-mediawiki-api/blob/main/index.d.ts
	title?: string;
	pageid?: number;
	protections: string | string[];
	expiry?: string | string[];
	reason?: string;
	tags?: string | string[];
	cascade?: boolean;
	/** @deprecated */
	watch?: boolean;
	watchlist?: "nochange" | "preferences" | "unwatch" | "watch";
	watchlistexpiry?: string;
	token?: string;
}

/** */
export interface ApiParamsActionRollback extends ApiParams {
	// Adapted from https://github.com/wikimedia-gadgets/types-mediawiki-api/blob/main/index.d.ts
	title?: string;
	pageid?: number;
	tags?: string | string[];
	user: string;
	summary?: string;
	markbot?: boolean;
	watchlist?: "nochange" | "preferences" | "unwatch" | "watch";
	watchlistexpiry?: string;
	token?: string;
}

/** */
export interface ApiParamsActionUnblock extends ApiParams {
	// Adapted from https://github.com/wikimedia-gadgets/types-mediawiki-api/blob/main/index.d.ts
	id?: number;
	user?: string;
	/** @deprecated */
	userid?: number;
	reason?: string;
	tags?: string | string[];
	watchuser?: boolean;
	watchlistexpiry?: string;
	token?: string;
}

/** */
export interface ApiParamsActionUndelete extends ApiParams {
	// Adapted from https://github.com/wikimedia-gadgets/types-mediawiki-api/blob/main/index.d.ts
	title: string;
	reason?: string;
	tags?: string | string[];
	timestamps?: string | string[];
	fileids?: number | number[];
	undeletetalk?: boolean;
	watchlist?: "nochange" | "preferences" | "unwatch" | "watch";
	watchlistexpiry?: string;
	token?: string;
}

// ************************************** Response types **************************************

export interface ApiResponse {

	[key: string]: any;

	// ********************** General properties **********************

	batchcomplete?: boolean;
	continue?: Record<string, string>;
	curtimestamp?: string;
	docref?: string; // Present when "errors" is present
	error?: ApiResponseError;
	errorlang?: string;
	errors?: ApiResponseErrors[];
	limits?: Record<string, string>;
	normalized?: ApiResponseNormalizedTitle[];
	requestid?: string;
	servedby?: string;
	uselang?: string;
	warnings?: XOR<ApiResponseWarningsLegacy, ApiResponseWarnings[]>;

	// ********************** Action-specific properties **********************

	// abusefiltercheckmatch?: ApiResponseAbusefiltercheckmatch;
	// abusefilterchecksyntax?: ApiResponseAbusefilterchecksyntax;
	// abusefilterevalexpression?: ApiResponseAbusefilterevalexpression;
	// abusefilterunblockautopromote?: ApiResponseAbusefilterunblockautopromote;
	// abuselogprivatedetails?: ApiResponseAbuselogprivatedetails;
	// acquiretempusername?: ApiResponseAcquiretempusername;
	// aggregategroups?: ApiResponseAggregategroups;
	// antispoof?: ApiResponseAntispoof;
	block?: ApiResponseBlock;
	// centralauthtoken?: ApiResponseCentralauthtoken;
	// centralnoticecdncacheupdatebanner?: ApiResponseCentralnoticecdncacheupdatebanner;
	// centralnoticechoicedata?: ApiResponseCentralnoticechoicedata;
	// centralnoticequerycampaign?: ApiResponseCentralnoticequerycampaign;
	// changeauthenticationdata?: ApiResponseChangeauthenticationdata;
	// changecontentmodel?: ApiResponseChangecontentmodel;
	// checktoken?: ApiResponseChecktoken;
	// 'cirrus-config-dump'?: ApiResponseCirrusconfigdump;
	// 'cirrus-mapping-dump'?: ApiResponseCirrusmappingdump;
	// 'cirrus-profiles-dump'?: ApiResponseCirrusprofilesdump;
	// 'cirrus-settings-dump'?: ApiResponseCirrussettingsdump;
	// clearhasmsg?: ApiResponseClearhasmsg;
	// clientlogin?: ApiResponseClientlogin;
	// communityconfigurationedit?: ApiResponseCommunityconfigurationedit;
	// compare?: ApiResponseCompare;
	// createaccount?: ApiResponseCreateaccount;
	// createlocalaccount?: ApiResponseCreatelocalaccount;
	delete?: ApiResponseDelete;
	// deleteglobalaccount?: ApiResponseDeleteglobalaccount;
	// discussiontoolsedit?: ApiResponseDiscussiontoolsedit;
	// discussiontoolsfindcomment?: ApiResponseDiscussiontoolsfindcomment;
	// discussiontoolsgetsubscriptions?: ApiResponseDiscussiontoolsgetsubscriptions;
	// discussiontoolssubscribe?: ApiResponseDiscussiontoolssubscribe;
	// discussiontoolsthank?: ApiResponseDiscussiontoolsthank;
	// echocreateevent?: ApiResponseEchocreateevent;
	// echomarkread?: ApiResponseEchomarkread;
	// echomarkseen?: ApiResponseEchomarkseen;
	// echomute?: ApiResponseEchomute;
	edit?: ApiResponseEdit;
	// editmassmessagelist?: ApiResponseEditmassmessagelist;
	// emailuser?: ApiResponseEmailuser;
	// expandtemplates?: ApiResponseExpandtemplates;
	// featuredfeed?: ApiResponseFeaturedfeed;
	// feedcontributions?: ApiResponseFeedcontributions;
	// feedrecentchanges?: ApiResponseFeedrecentchanges;
	// feedthreads?: ApiResponseFeedthreads;
	// feedwatchlist?: ApiResponseFeedwatchlist;
	// filerevert?: ApiResponseFilerevert;
	// flow-parsoid-utils?: ApiResponseFlowparsoidutils;
	// flow?: ApiResponseFlow;
	// flowthank?: ApiResponseFlowthank;
	// globalblock?: ApiResponseGlobalblock;
	// globalpreferenceoverrides?: ApiResponseGlobalpreferenceoverrides;
	// globalpreferences?: ApiResponseGlobalpreferences;
	// globaluserrights?: ApiResponseGlobaluserrights;
	// groupreview?: ApiResponseGroupreview;
	// help?: ApiResponseHelp;
	// imagerotate?: ApiResponseImagerotate;
	// import?: ApiResponseImport;
	// jsonconfig?: ApiResponseJsonconfig;
	// languagesearch?: ApiResponseLanguagesearch;
	// linkaccount?: ApiResponseLinkaccount;
	login?: ApiResponseLogin;
	// logout?: ApiResponseLogout;
	// managetags?: ApiResponseManagetags;
	// markfortranslation?: ApiResponseMarkfortranslation;
	// massmessage?: ApiResponseMassmessage;
	// mergehistory?: ApiResponseMergehistory;
	move?: ApiResponseMove;
	// newslettersubscribe?: ApiResponseNewslettersubscribe;
	// opensearch?: ApiResponseOpensearch;
	// options?: ApiResponseOptions;
	paraminfo?: ApiResponseParaminfo;
	parse?: ApiResponseParse;
	// patrol?: ApiResponsePatrol;
	protect?: ApiResponseProtect;
	purge?: ApiResponsePurge[];
	query?: ApiResponseQuery;
	// removeauthenticationdata?: ApiResponseRemoveauthenticationdata;
	// resetpassword?: ApiResponseResetpassword;
	// revisiondelete?: ApiResponseRevisiondelete;
	rollback?: ApiResponseRollback;
	// rsd?: ApiResponseRsd;
	// searchtranslations?: ApiResponseSearchtranslations;
	// setglobalaccountstatus?: ApiResponseSetglobalaccountstatus;
	// setnotificationtimestamp?: ApiResponseSetnotificationtimestamp;
	// setpagelanguage?: ApiResponseSetpagelanguage;
	// shortenurl?: ApiResponseShortenurl;
	sitematrix?: ApiResponseSitematrix;
	// spamblacklist?: ApiResponseSpamblacklist;
	// streamconfigs?: ApiResponseStreamconfigs;
	// strikevote?: ApiResponseStrikevote;
	// tag?: ApiResponseTag;
	// templatedata?: ApiResponseTemplatedata;
	// thank?: ApiResponseThank;
	// threadaction?: ApiResponseThreadaction;
	// titleblacklist?: ApiResponseTitleblacklist;
	// torblock?: ApiResponseTorblock;
	// transcodereset?: ApiResponseTranscodereset;
	// translationaids?: ApiResponseTranslationaids;
	// translationreview?: ApiResponseTranslationreview;
	// translationstats?: ApiResponseTranslationstats;
	// ttmserver?: ApiResponseTtmserver;
	unblock?: ApiResponseUnblock;
	undelete?: ApiResponseUndelete;
	// unlinkaccount?: ApiResponseUnlinkaccount;
	// upload?: ApiResponseUpload;
	// userrights?: ApiResponseUserrights;
	// validatepassword?: ApiResponseValidatepassword;
	// watch?: ApiResponseWatch;
	// webapp-manifest?: ApiResponseWebappmanifest;
	// webauthn?: ApiResponseWebauthn;
	// wikilove?: ApiResponseWikilove;

}

/**
 * Represents an empty PHP array (`[]`).
 *
 * Unlike JavaScript, which distinguishes between indexed arrays and objects, PHP uses the same internal structure
 * for both indexed and associative arrays. As a result, when the API returns an empty PHP array, it is interpreted
 * in JavaScript as an empty array (`[]`), not an empty object (`{}`).
 *
 * This typically occurs when an API module accepts a `**prop=` query parameter and the user explicitly overrides
 * its default value by specifying it as empty.
 *
 * See https://phabricator.wikimedia.org/T395188.
 */
export type ApiResponseEmptyPhpArray = [];

// ************************************** General response properties **************************************

export interface ApiResponseError { // errorformat=bc
	code: string;
	info: string;
	docref?: string;
}

export type ApiResponseErrors = {
	code: string;
	module: string;
	data?: unknown[];
} & XOR<
	{ '*': string }, // formatversion=1
	{ html: string }, // errorformat=html
	{ text: string }, // errorformat=wikitext, errorformat=plaintext
	{ key: string; params: string[] } // errorformat=raw
>;

/**
 * Generated by `ApiPageSet::getMissingRevisionIDsAsResult`.
 */
export interface ApiResponseBadrevids {
	[revid: string]: _PageSetMissingRevisionIDs;
}
/**
 * Generated by `ApiPageSet::getConvertedTitlesAsResult`.
 */
export interface ApiResponseConvertedTitle {
	from: string; // Defined separately from ApiResponseNormalizedTitle
	to: string;
}
/**
 * Generated by `ApiPageSet::getInterwikiTitlesAsResult`.
 */
export interface ApiResponseInterwikiTitle {
	title: string;
	iw: string;
	url?: string;
}
/**
 * Generated by `ApiPageSet::getNormalizedTitlesAsResult`.
 */
export interface ApiResponseNormalizedTitle {
	fromencoded: boolean;
	from: string;
	to: string;
}
/**
 * Generated by `ApiPageSet::getRedirectTitlesAsResult`.
 */
export interface ApiResponseRedirectTitle {
	from: string;
	to: string;
	tofragment?: string;
	tointerwiki?: string;
	// Could have additional properties from `ApiPageSet::$mGeneratorData`
	index?: number;
	[datakey: string]: unknown;
}

export interface ApiResponseWarnings {
	code: string;
	module: string;
	data: {
		values: string[];
	};
	'*'?: string; // formatversion=1
	html?: string; // errorformat=html
	text?: string; // errorformat=wikitext, errorformat=plaintext
	key?: string; // errorformat=raw
	params?: string[]; // errorformat=raw
}

export type ApiResponseWarningsLegacy = PartialRecord<ApiParamsAction, XOR< // errorformat=bc
	{
		'*': string; // formatversion=1
	},
	{
		warnings: string; // formatversion=2, latest
	}>
>;

export type ApiActionRestrictions = 'upload' | 'move' | 'create' | 'thanks';

/**
 * Generated by `ApiQueryBase::addTitleInfo`.
 *
 * Note: This is used as a utility to define an object that includes `ns` and `title` properties,
 * even if the object is not actually created by `ApiQueryBase::addTitleInfo`.
 */
export interface ApiResponseTitleInfo {
	ns: number;
	title: string;
}
/**
 * Use {@link ApiResponseTitleInfo} instead.
 * @deprecated
 */
export interface _TitleInfo extends ApiResponseTitleInfo {}

/**
 * Block details of a user, generated by `ApiBlockInfoHelper::getBlockDetails`.
 */
export interface ApiResponseBlockDetails {
	blockid?: number;
	blockedby?: string;
	blockedbyid?: number;
	blockreason?: string;
	blockedtimestamp?: string;
	blockexpiry?: string;
	blockpartial?: boolean;
	blocknocreate?: boolean;
	blockanononly?: boolean;
	blockemail?: boolean;
	blockowntalk?: boolean;
	blockedtimestampformatted?: string;
	blockexpiryformatted?: string; // Omitted if infinite
	blockexpiryrelative?: string; // Omitted if infinite
	systemblocktype?: string | null;
	blockcomponents?: ApiResponseBlockDetails[];
}
/**
 * Use {@link ApiResponseBlockDetails} instead.
 * @deprecated
 */
export interface _BlockDetails extends ApiResponseBlockDetails {}

/**
 * Generated by `UserGroupManager::getGroupsChangeableBy`.
 */
export interface ApiResponseGroupsChangeableBy {
	add: string[];
	remove: string[];
	'add-self': string[];
	'remove-self': string[];
}
/**
 * Use {@link ApiResponseGroupsChangeableBy} instead.
 * @deprecated
 */
export interface _GroupsChangeableBy extends ApiResponseGroupsChangeableBy {}

/**
 * Generated by `ApiQueryUserInfo::getCentralUserInfo`.
 */
export interface ApiResponseCentralUserInfo {
	centralids?: {
		[provider: string]: number;
	};
	attachedlocal?: {
		[provider: string]: boolean;
	};
	attachedwik?: {
		[provider: string]: boolean;
	};
}
/**
 * Use {@link ApiResponseCentralUserInfo} instead.
 * @deprecated
 */
export interface _CentralUserInfo extends ApiResponseCentralUserInfo {}

// ************************************** Private types and interfaces **************************************

/**
 * Flags generated by `ApiBase::getHelpFlags`.
 * @private
 */
export type _HelpFlags =
	| 'deprecated'
	| 'internal'
	| 'readrights'
	| 'writerights'
	| 'mustbeposted';

/**
 * Generated by `ApiPageSet::getInvalidTitlesAndRevisions`.
 *
 * This is a flattened version of all possible fields in:
 * * {@link _PageSetInvalidTitlesAndReasons}
 * * {@link _PageSetInvalidSpecialPages}
 * * {@link _PageSetMissingPageIDs}
 * * {@link _PageSetMissingRevisionIDs}
 * * {@link _PageSetMissingTitles}
 * * {@link ApiResponseInterwikiTitle}
 *
 * @private
 */
export interface _PageSetInvalidTitlesAndRevisions {
	title?: string;
	ns?: number;
	invalidreason?: string;
	invalid?: true;
	special?: true;
	missing?: true;
	pageid?: number;
	revid?: number;
	known?: true;
	iw?: string;
	url?: string;
}

/**
 * Generated by `ApiPageSet::getInvalidTitlesAndReasons`.
 * @private
 */
export interface _PageSetInvalidTitlesAndReasons {
	title: string;
	invalidreason: string;
	invalid: true;
}
/**
 * @private
 */
export interface _PageSetInvalidSpecialPages extends ApiResponseTitleInfo {
	special: true;
	missing?: true;
}
/**
 * Generated by `ApiPageSet::getMissingPageIDs`.
 * @private
 */
export interface _PageSetMissingPageIDs {
	pageid: number;
	missing: true;
}
/**
 * Generated by `ApiPageSet::getMissingRevisionIDs`.
 * @private
 */
export interface _PageSetMissingRevisionIDs {
	revid: number;
	missing: true;
}
/**
 * @private
 */
export interface _PageSetMissingTitles extends ApiResponseTitleInfo {
	missing: true;
	known?: true;
}

/**
 * Response type for {@link https://gerrit.wikimedia.org/g/mediawiki/core/+/d8b82b8f7590c71163eb760f4cd3a50e9106dc53/includes/api/ApiQueryBacklinks.php | ApiQueryBacklinks.php}. Used for:
 * - `list=backlinks`
 * - `list=embeddedin`
 * - `list=imageusage`
 * @private
 */
export interface _ApiQueryBacklinks extends ApiResponseTitleInfo {
	pageid: number;
	redirect?: true;
}
/**
 * Response type for {@link https://gerrit.wikimedia.org/g/mediawiki/core/+/d8b82b8f7590c71163eb760f4cd3a50e9106dc53/includes/api/ApiQueryBacklinksprop.php | ApiQueryBacklinksprop.php}. Used for:
 * - `prop=fileusage`
 * - `prop=linkshere`
 * - `prop=redirects`
 * - `prop=transcludedin`
 *
 * The `pageid`, `ns`, and `title` properties are present by default due to default parameters,
 * but they may be omitted if explicitly disabled; for example, by using `prop=linkshere&lhprop=`,
 * which sets an empty value for the parameter.
 * @private
 */
export interface _ApiQueryBacklinksprop extends Partial<Omit<_ApiQueryBacklinks, 'redirect'>> {
	// Unlike the `list=` modules, `pageid`, `ns`, and `title` are optional, and `redirect` can be `false`
	redirect?: boolean;
	// fragment?: string; // Handle this separately because it's used only by "prop=redirects"
}
/**
 * @private
 */
export interface _ApiQueryBacklinkspropFragment {
	fragment?: string;
}

// ************************************** action=somthing **************************************

// export interface ApiResponseAbusefiltercheckmatch {}
// export interface ApiResponseAbusefilterchecksyntax {}
// export interface ApiResponseAbusefilterevalexpression {}
// export interface ApiResponseAbusefilterunblockautopromote {}
// export interface ApiResponseAbuselogprivatedetails {}
// export interface ApiResponseAggregategroups {}
// export interface ApiResponseAntispoof {}

export interface ApiResponseBlock { // Fully checked (source code level)
	user: string;
	userID: number;
	expiry: string;
	id: number;
	reason: string;
	anononly: boolean;
	nocreate: boolean;
	autoblock: boolean;
	noemail: boolean;
	hidename: boolean;
	allowusertalk: boolean;
	watchuser: boolean;
	partial: boolean;
	pagerestrictions: string[] | null;
	namespacerestrictions: number[] | null;
	actionrestrictions: ApiActionRestrictions[] | null;
}

// export interface ApiResponseCentralauthtoken {}
// export interface ApiResponseCentralnoticecdncacheupdatebanner {}
// export interface ApiResponseCentralnoticechoicedata {}
// export interface ApiResponseCentralnoticequerycampaign {}
// export interface ApiResponseChangeauthenticationdata {}
// export interface ApiResponseChangecontentmodel {}
// export interface ApiResponseChecktoken {}
// export interface ApiResponseCirrus_config_dump {}
// export interface ApiResponseCirrus_mapping_dump {}
// export interface ApiResponseCirrus_profiles_dump {}
// export interface ApiResponseCirrus_settings_dump {}
// export interface ApiResponseClearhasmsg {}
// export interface ApiResponseClientlogin {}
// export interface ApiResponseCompare {}
// export interface ApiResponseCreateaccount {}
// export interface ApiResponseCreatelocalaccount {}

export type ApiResponseDelete = { // Fully checked (source code level)
	title: string;
	reason: string;
} & XOR<
	{ scheduled: true },
	{ logid: number }
>;

// export interface ApiResponseDeleteglobalaccount {}
// export interface ApiResponseEchomarkread {}
// export interface ApiResponseEchomarkseen {}
// export interface ApiResponseEchomute {}

export interface ApiResponseEdit { // Fully checked (source code level)
	result: 'Success' | 'Failure';
	new?: true;
	pageid?: number;
	title?: string;
	contentmodel?: string;
	nochange?: true;
	oldrevid?: number;
	newrevid?: number;
	newtimestamp?: string;
	watched?: true;
	watchlistexpiry?: string;
	tempusercreated?: true;
	tempusercreatedredirect?: string;
}

// export interface ApiResponseEditmassmessagelist {}
// export interface ApiResponseEmailuser {}
// export interface ApiResponseExpandtemplates {}
// export interface ApiResponseFancycaptchareload {}
// export interface ApiResponseFeaturedfeed {}
// export interface ApiResponseFeedcontributions {}
// export interface ApiResponseFeedrecentchanges {}
// export interface ApiResponseFeedthreads {}
// export interface ApiResponseFeedwatchlist {}
// export interface ApiResponseFilerevert {}
// export interface ApiResponseFlow {}
// export interface ApiResponseFlow_parsoid_utils {}
// export interface ApiResponseFlowthank {}
// export interface ApiResponseGlobalblock {}
// export interface ApiResponseGlobalpreferenceoverrides {}
// export interface ApiResponseGlobalpreferences {}
// export interface ApiResponseGlobaluserrights {}
// export interface ApiResponseGraph {}
// export interface ApiResponseGroupreview {}
// export interface ApiResponseHelp {}
// export interface ApiResponseImagerotate {}
// export interface ApiResponseImport {}
// export interface ApiResponseJsonconfig {}
// export interface ApiResponseLanguagesearch {}
// export interface ApiResponseLinkaccount {}

export type ApiResponseLogin = XOR< // Fully checked (source code level)
	{
		result: 'Success';
		lguserid: number;
		lgusername: string;
	},
	{
		result: 'NeedToken';
		/** @deprecated */
		token: string;
	},
	{
		result: 'WrongToken';
	},
	{
		result: 'Failed';
		reason: string;
	},
	{
		result: 'Aborted';
		reason: string;
	}
>;

// export interface ApiResponseLogout {}
// export interface ApiResponseManagetags {}
// export interface ApiResponseMassmessage {}
// export interface ApiResponseMergehistory {}

export interface ApiResponseMove { // Fully checked (source code level)
	from: string;
	to: string;
	reason: string;
	redirectcreated: boolean;
	moveoverredirect: boolean;
	talkfrom?: string;
	talkto?: string;
	talkmoveoverredirect?: boolean;
	'talkmove-errors'?: Record<string, unknown>; // Probably the same as ApiResponseErrors
	subpages?: ApiResponseMoveSubpages[];
	'subpages-talk'?: ApiResponseMoveSubpages[];
}
export interface ApiResponseMoveSubpages {
	from: string;
	to?: string;
	errors?: Record<string, unknown>;
}

// export interface ApiResponseNewslettersubscribe {}
// export interface ApiResponseOpensearch {}
// export interface ApiResponseOptions {}

export interface ApiResponseParaminfo { // TODO: Check source code
	helpformat: string;
	modules: ApiResponseParaminfoModules[];
}
/** */
export interface ApiResponseParaminfoModules extends PartialRecord<_HelpFlags, true> { // Source code check midway
	name: string;
	classname: string;
	path: string;
	group?: string; // Can be null?
	prefix: string;
	source?: string;
	sourcename?: string;
	licensetag?: string;
	licenselink?: string;
	description?:
		| string // helpformat=wikitext, html
		| ApiResponseParaminfoModulesDescription[]; // helpformat=raw
	helpurls: string[];
	examples?: ApiResponseParaminfoModulesExamples[];
	parameters: { // TODO: Recheck this prop and subsequent ones
		index: number;
		name: string;
		description?: string | ApiResponseParaminfoModulesDescription[];
		type: string | string[];
		required: boolean;
		sensitive?: boolean;
		default?: string;
		multi: boolean;
		lowlimit?: number;
		highlimit?: number;
		limit?: number;
		tokentype?: string;
	}[];
	templatedparameters: unknown[]; // TODO: Update
	dynamicparameters:
		| boolean // helpformat=none
		| string // helpformat=html, wikitext
		| ApiResponseParaminfoModulesDescription[]; // helpformat=raw
}
export interface ApiResponseParaminfoModulesDescription { // helpformat=raw
	key: string;
	params: string[];
}
export interface ApiResponseParaminfoModulesExamples {
	query: string;
	description?: string | ApiResponseParaminfoModulesDescription[];
}

export interface ApiResponseParse { // Fully checked (source code level)
	title: string;
	pageid: number;
	textdeleted?: true;
	textsuppressed?: true;
	revid?: number;
	/**
	 * `redirects=true`
	 */
	redirects?: ApiResponseRedirectTitle[];
	/**
	 * `prop=text`, `onlypst=true`
	 */
	text?: string;
	/**
	 * `summary=**`, `sectiontitle=**`, `section=new`
	 */
	parsedsummary?: string;
	/**
	 * `prop=langlinks`
	 */
	langlinks?: ApiResponseParsePropLanglinks[];
	/**
	 * `prop=categories`
	 */
	categories?: ApiResponseParsePropCategories[];
	/**
	 * `prop=categorieshtml`
	 */
	categorieshtml?: string;
	/**
	 * `prop=links`
	 */
	links?: ApiResponseParsePropLinks[];
	/**
	 * `prop=templates`
	 */
	templates?: ApiResponseParsePropTemplates[];
	/**
	 * `prop=images`
	 */
	images?: string[];
	/**
	 * `prop=externallinks`
	 */
	externallinks?: string[];
	/**
	 * `prop=sections`
	 */
	sections?: ApiResponseParsePropSections[];
		showtoc?: boolean;
	/**
	 * `prop=parsewarnings`
	 */
	parsewarnings?: string[];
	/**
	 * `prop=parsewarningshtml`
	 */
	parsewarningshtml?: string[];
	/**
	 * `prop=displaytitle`
	 */
	displaytitle?: string;
	/**
	 * `prop=subtitle`
	 */
	subtitle?: string;
	/**
	 * `prop=headitems`
	 * @deprecated
	 */
	headitems?: ApiResponseParsePropHeaditems[];
	/**
	 * `prop=headhtml`
	 */
	headhtml?: string;
	/**
	 * `prop=modules`
	 */
	modules?: string[];
		/** @deprecated */
		modulescripts?: never[];
		modulestyles?: string[];
	/**
	 * `prop=jsconfigvars`
	 */
	jsconfigvars?: ApiResponseParsePropJsconfigvars;
	/**
	 * `prop=encodedjsconfigvars`
	 */
	encodedjsconfigvars?: string | false;
	/**
	 * `prop=indicators`
	 */
	indicators?: ApiResponseParsePropIndicators;
	/**
	 * `prop=iwlinks`
	 */
	iwlinks?: ApiResponseParsePropIwlinks[];
	/**
	 * `prop=wikitext`
	 */
	wikitext?: string;
		psttext?: string;
	/**
	 * `prop=properties`
	 */
	properties?: ApiResponseParsePropProperties;
	/**
	 * `prop=limitreportdata`
	 */
	limitreportdata?: ApiResponseParsePropLimitreportdata;
	/**
	 * `prop=limitreporthtml`
	 */
	limitreporthtml?: string;
	/**
	 * `prop=parsetree`
	 */
	parsetree?: string;
}
export interface ApiResponseParsePropLanglinks {
	lang: string;
	url?: string;
	langname?: string;
	autonym?: string;
	title: string;
}
export interface ApiResponseParsePropCategories {
	sortkey: string;
	category: string;
	missing?: true;
	known?: true;
	hidden?: true;
}
/** */
export interface ApiResponseParsePropLinks extends ApiResponseTitleInfo {
	// Note: Not using ApiQueryBase::addTitleInfo
	exists: boolean;
}
/** */
export interface ApiResponseParsePropTemplates extends ApiResponseParsePropLinks {}
export interface ApiResponseParsePropSections {
	// Generated by `SectionMetadata::toLegacy`
	toclevel: number;
	level: string;
	line: string;
	number: string;
	index: string;
	fromtitle: string | false;
	byteoffset: number | null;
	anchor: string;
	linkAnchor: string;
	extensionData: {
		[key: string]: unknown;
	};
}
/** @deprecated */
export interface ApiResponseParsePropHeaditems {
	tag: string;
	content: string;
}
export interface ApiResponseParsePropJsconfigvars {
	[key: string]: unknown;
}
export interface ApiResponseParsePropIndicators {
	[key: string]: string;
}
export interface ApiResponseParsePropIwlinks {
	prefix: string;
	url?: string;
	title?: string;
}
export interface ApiResponseParsePropProperties {
	[key: string]: unknown;
}
export interface ApiResponseParsePropLimitreportdata {
	name: string;
	[number: string]: string;
}

// export interface ApiResponsePatrol {}

export interface ApiResponseProtect { // Fully checked (source code level)
	title: string;
	reason: string;
	cascade?: true;
	protections: ApiResponseProtectProtections[];
}
export interface ApiResponseProtectProtections {
	[action: string]: string;
	expiry: string;
}

/** */
export interface ApiResponsePurge extends _PageSetInvalidTitlesAndRevisions { // Fully checked (source code level)
	purged?: true;
	linkupdate?: true;
}

// export interface ApiResponseQuery {} // Defined below
// export interface ApiResponseRemoveauthenticationdata {}
// export interface ApiResponseResetpassword {}
// export interface ApiResponseRevisiondelete {}

export interface ApiResponseRollback { // Fully checked (source code level)
	title: string;
	pageid: number;
	summary: string;
	revid: number;
	old_revid: number;
	last_revid: number;
}

// export interface ApiResponseRsd {}
// export interface ApiResponseSearchtranslations {}
// export interface ApiResponseSetglobalaccountstatus {}
// export interface ApiResponseSetnotificationtimestamp {}
// export interface ApiResponseSetpagelanguage {}
// export interface ApiResponseShortenurl {}

export type ApiResponseSitematrix = { // Fully checked (source code level)
	[index: string]: {
		code?: string;
		name?: string;
		site?: ApiResponseSitematrixSite[];
		dir?: string;
		localname?: string;
	};
} & {
	count: number;
	specials?: ApiResponseSitematrixSiteSpecial[];
};
export interface ApiResponseSitematrixSite {
	url?: string;
	dbname?: string;
	code?: string;
	lang?: string;
	sitename?: string;
	closed?: true;
}
/** */
export interface ApiResponseSitematrixSiteSpecial extends ApiResponseSitematrixSite {
	private?: true;
	fishbowl?: true;
	nonglobal?: true;
}

// export interface ApiResponseSpamblacklist {}
// export interface ApiResponseStreamconfigs {}
// export interface ApiResponseStrikevote {}
// export interface ApiResponseTag {}
// export interface ApiResponseTemplatedata {}
// export interface ApiResponseThank {}
// export interface ApiResponseThreadaction {}
// export interface ApiResponseTitleblacklist {}
// export interface ApiResponseTorblock {}
// export interface ApiResponseTranscodereset {}
// export interface ApiResponseTranslationaids {}
// export interface ApiResponseTranslationreview {}
// export interface ApiResponseTranslationstats {}
// export interface ApiResponseTtmserver {}

export interface ApiResponseUnblock { // Fully checked (source code level)
	id: number;
	user: string;
	userid: number;
	reason: string;
	watchuser: boolean;
	watchlistexpiry?: string;
}

export interface ApiResponseUndelete { // Fully checked (source code level)
	title: string;
	revisions: number;
	fileversions: number;
	reason: string;
}

// export interface ApiResponseUnlinkaccount {}
// export interface ApiResponseUpload {}
// export interface ApiResponseUserights {}
// export interface ApiResponseValidatepassword {}
// export interface ApiResponseWatch {}
// export interface ApiResponseWebapp_manifest {}
// export interface ApiResponseWebauthn {}
// export interface ApiResponseWikilove {}

// ************************************** action=query **************************************

export interface ApiResponseQuery { // Check completed

	[key: string]: unknown;

	// ********************** General properties **********************

	badrevids?: ApiResponseBadrevids;
	converted?: ApiResponseConvertedTitle[];
	interwiki?: ApiResponseInterwikiTitle[];
	normalized?: ApiResponseNormalizedTitle[];
	/**
	 * `redirects=true`, `action=parse`, `action=purge`, `action=templatedata`
	 */
	redirects?: ApiResponseRedirectTitle[];

	pages?: ApiResponseQueryPages[];
	/**
	 * `indexpageids=true`
	 */
	pageids?: string[];
	/**
	 * `export=true`
	 */
	export?: string;

	// ********************** Meta properties **********************

	allmessages?: ApiResponseQueryMetaAllmessages[];
	authmanagerinfo?: ApiResponseQueryMetaAuthmanagerinfo;
	babel?: ApiResponseQueryMetaBabel;
	communityconfiguration?: ApiResponseQueryMetaCommunityconfiguration;
	featureusage?: ApiResponseQueryMetaFeatureusage;
	filerepoinfo?: ApiResponseQueryMetaFilerepoinfo[];
	globalpreferences?: ApiResponseQueryMetaGlobalpreferences;
	globalrenamestatus?: { [user: string]: ApiResponseQueryMetaGlobalrenamestatus };
	globaluserinfo?: ApiResponseQueryMetaGlobaluserinfo;
	languageinfo?: ApiResponseQueryMetaLanguageinfo;
	languagestats?: ApiResponseQueryMetaLanguagestats[];
	linterstats?: ApiResponseQueryMetaLinterstats;
	managemessagegroups?: ApiResponseQueryMetaManagemessagegroups[];
	messagegroups?: (ApiResponseEmptyPhpArray | ApiResponseQueryMetaMessagegroups)[];
	messagegroupstats?: ApiResponseQueryMetaMessagegroupstats[];
	messagetranslations?: ApiResponseQueryMetaMessagetranslations[];
	notifications?: ApiResponseQueryMetaNotifications;
	// ----- meta=siteinfo -----
	autocreatetempuser?: ApiResponseQueryMetaSiteinfoAutocreatetempuser;
	dbrepllag?: ApiResponseQueryMetaSiteinfoDbrepllag[];
	defaultoptions?: ApiResponseQueryMetaSiteinfoDefaultoptions;
	extensions?: ApiResponseQueryMetaSiteinfoExtensions[];
	extensiontags?: ApiResponseQueryMetaSiteinfoExtensiontags[]; // string[]
	fileextensions?: ApiResponseQueryMetaSiteinfoFileextensions[];
	functionhooks?: ApiResponseQueryMetaSiteinfoFunctionhooks[]; // string[]
	general?: ApiResponseQueryMetaSiteinfoGeneral;
	interwikimap?: ApiResponseQueryMetaSiteinfoInterwikimap[];
	languages?: ApiResponseQueryMetaSiteinfoLanguages[];
	languagevariants?: ApiResponseQueryMetaSiteinfoLanguagevariants;
	libraries?: ApiResponseQueryMetaSiteinfoLibraries[];
	magicwords?: ApiResponseQueryMetaSiteinfoMagicwords[];
	namespacealiases?: ApiResponseQueryMetaSiteinfoNamespacealiases[];
	namespaces?: ApiResponseQueryMetaSiteinfoNamespaces;
	restrictions?: ApiResponseQueryMetaSiteinfoRestrictions;
	rightsinfo?: ApiResponseQueryMetaSiteinfoRightsinfo;
	showhooks?: ApiResponseQueryMetaSiteinfoShowhooks[];
	skins?: ApiResponseQueryMetaSiteinfoSkins[];
	specialpagealiases?: ApiResponseQueryMetaSiteinfoSpecialpagealiases[];
	statistics?: ApiResponseQueryMetaSiteinfoStatistics;
	uploaddialog?: ApiResponseQueryMetaSiteinfoUploaddialog;
	usergroups?: ApiResponseQueryMetaSiteinfoUsergroups[];
	variables?: ApiResponseQueryMetaSiteinfoVariables[]; // string[]
	// ----- meta=siteinfo end -----
	siteviews?: ApiResponseQueryMetaSiteviews;
	tokens?: ApiResponseQueryMetaTokens;
	unreadnotificationpages?: ApiResponseQueryMetaUnreadnotificationpages;
	userinfo?: ApiResponseQueryMetaUserinfo;
	wikibase?: ApiResponseEmptyPhpArray | ApiResponseQueryMetaWikibase;

	// ********************** List properties **********************

	abusefilters?: ApiResponseQueryListAbusefilters[];
	abuselog?: ApiResponseQueryListAbuselog[];
	allcategories?: ApiResponseQueryListAllcategories[];
	alldeletedrevisions?: ApiResponseQueryListAlldeletedrevisions[];
	allfileusages?: ApiResponseQueryListAllfileusages[];
	allimages?: ApiResponseQueryListAllimages[];
	alllinks?: ApiResponseQueryListAlllinks[];
	allpages?: ApiResponseQueryListAllpages[];
	allredirects?: ApiResponseQueryListAllredirects[];
	allrevisions?: ApiResponseQueryListAllrevisions[];
	alltransclusions?: ApiResponseQueryListAlltransclusions[];
	allusers?: ApiResponseQueryListAllusers[];
	betafeatures?: ApiResponseQueryListBetafeatures;
	backlinks?: ApiResponseQueryListBacklinks[];
	blocks?: ApiResponseQueryListBlocks[];
	categorymembers?: ApiResponseQueryListCategorymembers[];
	centralnoticeactivecampaigns?: ApiResponseQueryListCentralnoticeactivecampaigns[];
	centralnoticelogs?: ApiResponseQueryListCentralnoticelogs;
	checkuser?: ApiResponseQueryListCheckuser;
	checkuserlog?: ApiResponseQueryListCheckuserlog;
	codexicons?: ApiResponseQueryListCodexicons;
	embeddedin?: ApiResponseQueryListEmbeddedin[];
	extdistrepos?: ApiResponseQueryListExtdistrepos;
	exturlusage?: ApiResponseQueryListExturlusage[];
	filearchive?: ApiResponseQueryListFilearchive[];
	gadgetcategories?: ApiResponseQueryListGadgetcategories[];
	gadgets?: ApiResponseQueryListGadgets[];
	globalallusers?: ApiResponseQueryListGlobalallusers[];
	globalblocks?: ApiResponseQueryListGlobalblocks[];
	globalgroups?: ApiResponseQueryListGlobalgroups[];
	imageusage?: ApiResponseQueryListImageusage[];
	iwbacklinks?: ApiResponseQueryListIwbacklinks[];
	langbacklinks?: ApiResponseQueryListLangbacklinks[];
	linterrors?: ApiResponseQueryListLinterrors[];
	logevents?: ApiResponseQueryListLogevents[];
	messagecollection?: ApiResponseQueryListMessagecollection[];
		metadata?: ApiResponseQueryListMessagecollectionMetadata;
	mostviewed?: ApiResponseQueryListMostviewed[];
	mystashedfiles?: ApiResponseQueryListMystashedfiles[];
	pagepropnames?: ApiResponseQueryListPagepropnames[];
	pageswithprop?: ApiResponseQueryListPageswithprop[];
	prefixsearch?: ApiResponseQueryListPrefixsearch[];
	protectedtitles?: ApiResponseQueryListProtectedtitles[];
	querypage?: ApiResponseQueryListQuerypage;
	random?: ApiResponseQueryListRandom[];
	recentchanges?: ApiResponseQueryListRecentchanges[];
	search?: ApiResponseQueryListSearch[];
		searchinfo?: ApiResponseQueryListSearchInfo;
		additionalsearch?: { [iwprefix: string]: ApiResponseQueryListSearchInterwikisearch[] };
		additionalsearchinfo?: ApiResponseQueryListSearchInfoInterwiki;
		interwikisearch?: { [iwprefix: string]: ApiResponseQueryListSearchInterwikisearch[] };
		interwikisearchinfo?: ApiResponseQueryListSearchInfoInterwiki;
	tags?: ApiResponseQueryListTags[];
	threads?: { [thread_id: string]: ApiResponseQueryListThreads };
	usercontribs?: ApiResponseQueryListUsercontribs[];
	users?: ApiResponseQueryListUsers[];
	watchlist?: ApiResponseQueryListWatchlist[];
	watchlistraw?: ApiResponseQueryListWatchlistraw[];
	wblistentityusage?: ApiResponseQueryListWblistentityusage[];
	wikisets?: ApiResponseQueryListWikisets[];

	// ********************** Other properties **********************

	stashimageinfo?: ApiResponseQueryPagesPropImageinfo[]; // prop=stashimageinfo
}


// ************************************** action=query (general properties) **************************************

/** */
export interface ApiResponseQueryPages extends // Fully checked (source code level)
	Omit<_PageSetInvalidTitlesAndRevisions, 'revid' | 'iw' | 'url'>,
	ApiResponseQueryPagesPropInfo,
	ApiResponseQueryPagesPropPageimages
{
	// prop-independent properties are all handled by `_PageSetInvalidTitlesAndRevisions`

	// prop-dependent properties
	categories?: ApiResponseQueryPagesPropCategories[];
	categoryinfo?: ApiResponseQueryPagesPropCategoryinfo;
	contributors?: ApiResponseQueryPagesPropContributors[];
	deletedrevisions?: ApiResponseQueryPagesPropDeletedrevisions[];
	duplicatefiles?: ApiResponseQueryPagesPropDuplicatefiles[];
	extlinks?: ApiResponseQueryPagesPropExtlinks[];
	extracts?: ApiResponseQueryPagesPropExtracts; // string
	fileusage?: ApiResponseQueryPagesPropFileusage[];
	globalusage?: ApiResponseQueryPagesPropGlobalusage[];
	imageinfo?: ApiResponseQueryPagesPropImageinfo[];
		imagerepository?: string;
		badfile?: boolean;
	images?: ApiResponseQueryPagesPropImages[];
	// info?: ApiResponseQueryPagesPropInfo // Handled by interface extension
	iwlinks?: ApiResponseQueryPagesPropIwlinks[];
	langlinks?: ApiResponseQueryPagesPropLanglinks[];
	links?: ApiResponseQueryPagesPropLinks[];
	linkshere?: ApiResponseQueryPagesPropLinkshere[];
	mmcontent?: ApiResponseQueryPagesPropMmcontent;
	// pageimages?: ApiResponseQueryPagesPropPageimages // Handled by interface extension
	pageprops?: ApiResponseQueryPagesPropPageprops;
	/*page*/terms?: ApiResponseQueryPagesPropPageterms;
	pageviews?: ApiResponseQueryPagesPropPageviews;
	redirects?: ApiResponseQueryPagesPropRedirects[];
	revisions?: ApiResponseQueryPagesPropRevisions[];
	// stashimageinfo // Doesn't depend on `titles` and is appended under `query`
	templates?: ApiResponseQueryPagesPropTemplates[];
	transcludedin?: ApiResponseQueryPagesPropTranscludedin[];
	transcodestatus?: Record<string, ApiResponseQueryPagesPropTranscodestatus>;
	videoinfo?: ApiResponseQueryPagesPropVideoinfo[];
	wbentityusage?: Record<string, ApiResponseQueryPagesPropWbentityusage>;
}

/** */
export interface ApiResponseQueryPagesPropCategories extends ApiResponseTitleInfo { // Fully checked (source code level)
	sortkey?: string; // clprop=sortkey
	sortkeyprefix?: string; // clprop=sortkey
	timestamp?: string; // clprop=timestamp
	hidden?: boolean; // clprop=hidden
}

export interface ApiResponseQueryPagesPropCategoryinfo { // Fully checked (source code level)
	size: number;
	pages: number;
	files: number;
	subcats: number;
	hidden: boolean;
}

export interface ApiResponseQueryPagesPropContributors { // Fully checked (source code level)
	userid: number;
	name: string;
}

/** */
export interface ApiResponseQueryPagesPropDeletedrevisions extends ApiResponseQueryPagesPropRevisions {} // Fully checked (source code level)

export interface ApiResponseQueryPagesPropDuplicatefiles { // Fully checked (source code level)
	name: string;
	timestamp: string;
	shared: boolean;
	user?: string;
}

export interface ApiResponseQueryPagesPropExtlinks { // Fully checked (source code level)
	url: string;
}

export type ApiResponseQueryPagesPropExtracts = string; // Fully checked (source code level)

/** */
export interface ApiResponseQueryPagesPropFileusage extends _ApiQueryBacklinksprop {} // Fully checked (source code level)

export interface ApiResponseQueryPagesPropGlobalusage { // Fully checked (source code level)
	title: string;
	wiki: string;
	url?: string;
	pageid?: string;
	ns?: string;
}

export interface ApiResponseQueryPagesPropImageinfo { // Fully checked (source code level)
	// Generated by ApiQueryImageInfo::getInfo
	timestamp?: string;
	userhidden?: true;
	user?: string;
	userid?: number;
	temp?: true;
	anon?: true;
	size?: number;
	width?: number;
	height?: number;
	pagecount?: number;
	duration?: number;
	commenthidden?: true;
	parsedcomment?: string;
	comment?: string;
	html?: string;
	filehidden?: true;
	suppressed?: true;
	canonicaltitle?: string;
	thumburl?: string;
	thumbwidth?: number;
	thumbheight?: number;
	thumbmime?: string;
	responsiveUrls?: string;
	thumberror?: string;
	url?: string;
	descriptionurl?: string;
	descriptionshorturl?: string;
	filemissing?: true;
	sha1?: string;
	metadata?: ApiResponseQueryPagesPropImageinfoMetadata[] | null;
	commonmetadata?: ApiResponseQueryPagesPropImageinfoMetadata[] | null;
	extmetadata?: ApiResponseQueryPagesPropImageinfoExtmetadata;
	mime?: string;
	mediatype?: string;
	archivename?: string;
	bitdepth?: number;
}
export interface ApiResponseQueryPagesPropImageinfoMetadata {
	// Generated by ApiQueryImageInfo::processMetaData
	name: string;
	value: unknown;
}
export interface ApiResponseQueryPagesPropImageinfoExtmetadata { // Fully checked (source code level), but not 100% sure
	[key: string]: {
		value: string | number;
		source: string;
		hidden?: '';
	}
}

/** */
export interface ApiResponseQueryPagesPropImages extends ApiResponseTitleInfo {} // Fully checked (source code level)

export interface ApiResponseQueryPagesPropInfo { // Fully checked (source code level)

	// inprop-independent properties
	contentmodel?: string; // Always exists for prop=info
	pagelanguage?: string; // Always exists for prop=info
	pagelanguagehtmlcode?: string; // Always exists for prop=info
	pagelanguagedir?: string; // Always exists for prop=info
	touched?: string;
	lastrevid?: number;
	length?: number;
	redirect?: true;
	new?: true;

	// inprop-independent properties (sorted as in ApiQueryInfo.php)
	protection?: ApiResponseQueryPagesPropInfoProtection[];
		restrictiontypes?: string[];
	watched?: boolean;
		watchlistexpiry?: string;
	watchers?: number;
	visitingwatchers?: number;
	notificationtimestamp?: string;
	talkid?: number;
	subjectid?: number;
	associatedpage?: string;
	fullurl?: string; // inprop=url
	editurl?: string; // inprop=url
	canonicalurl?: string; // inprop=url
	/**
	 * Use `intestactions=read` instead.
	 * @deprecated
	 */
	readable?: boolean;
	/**
	 * Use `preloadcontent` instead, which supports other kinds of preloaded text too.
	 * @deprecated
	 */
	preload?: string | null;
	preloadcontent?: {
		contentmodel: string;
		contentformat: string;
		content: string;
	};
		preloadisdefault?: boolean;
	editintro?: { [key: string]: string };
	displaytitle?: string;
	varianttitles?: { [lang: string]: string };
	linkclasses?: string[];
	// Properties for the private inprop=testactions are omitted here

}
export interface ApiResponseQueryPagesPropInfoProtection { // Fully checked (source code level)
	type: string;
	level: string;
	expiry: string;
	cascade?: true;
}

export interface ApiResponseQueryPagesPropIwlinks { // Fully checked (source code level)
	prefix: string;
	url?: string;
	title: string;
}

export interface ApiResponseQueryPagesPropLanglinks { // Fully checked (source code level)
	lang: string;
	url?: string;
	langname?: string;
	autonym?: string;
	title: string;
}

/** */
export interface ApiResponseQueryPagesPropLinks extends ApiResponseTitleInfo {} // Fully checked (source code level)

/** */
export interface ApiResponseQueryPagesPropLinkshere extends _ApiQueryBacklinksprop {} // Fully checked (source code level)

export interface ApiResponseQueryPagesPropMmcontent { // Fully checked (source code level)
	description: string | null;
	targets: string[];
}

export interface ApiResponseQueryPagesPropPageimages { // Fully checked (source code level)
	thumbnail?: ApiResponseQueryPagesPropPageimagesThumbnail;
	original?: ApiResponseQueryPagesPropPageimagesThumbnail;
	pageimage?: string;
}
export interface ApiResponseQueryPagesPropPageimagesThumbnail {
	source: string;
	width: number;
	height: number;
}

export interface ApiResponseQueryPagesPropPageprops { // Fully checked (source code level)
	// According to PageProps.php, it appears that page props are always string values
	[prop: string]: string;
}

export interface ApiResponseQueryPagesPropPageterms { // Fully checked (source code level)
	// PageTerms::groupTermsByPageAndType creates a string array for each term, and the relevant terms
	// are defined as constants by TermIndexEntry::$validTermTypes
	alias?: string[];
	label?: string[];
	description?: string[];
}

export interface ApiResponseQueryPagesPropPageviews { // Fully checked (source code level)
	[date: string]: number;
}

/** */
export interface ApiResponseQueryPagesPropRedirects extends // Fully checked (source code level)
	Omit<_ApiQueryBacklinksprop, 'redirect'>, _ApiQueryBacklinkspropFragment {}

/**
 * Generated by `ApiQueryRevisionsBase::extractRevisionInfo`, `ApiQueryRevisionsBase::extractAllSlotInfo`,
 * and `ApiQueryRevisionsBase::extractSlotInfo`.
 */
export interface ApiResponseQueryPagesPropRevisions { // Fully checked (source code level)
	revid?: number;
	parentid?: number;
	minor?: boolean;
	userhidden?: true;
	user?: string;
	temp?: true;
	anon?: true;
	userid?: number;
	timestamp?: string;
	size?: number;
	sha1hidden?: true;
	sha1?: string;
	roles?: string[];
	textmissing?: true;
	slots?: {
		main: { // [slot: string]
			missing?: true;
			// ApiQueryRevisionsBase::extractSlotInfo
			size?: number;
			sha1hidden?: true;
			sha1?: string;
			contentmodel?: string;
			texthidden?: true;
			textmissing?: true;
			// ApiQueryRevisionsBase::extractAllSlotInfo
			badcontentformat?: true;
			contentformat?: string;
			content?: string;
		};
	};
	slotsmissing?: true;
	commenthidden?: true;
	comment?: string;
	parsedcomment?: string;
	tags?: string[];
	suppressed?: true;
	/**
	 * Use `action=expandtemplates` or `action=parse` instead.
	 * @deprecated
	 */
	parsetree?: string;
	/**
	 * @deprecated
	 */
	badcontentformatforparsetree?: true;
	/**
	 * @deprecated
	 */
	badcontentformat?: true;
	/**
	 * Specify the `rvslots` parameter.
	 * @deprecated
	 */
	contentformat?: string;
	/**
	 * Specify the `rvslots` parameter.
	 * @deprecated
	 */
	contentmodel?: string;
	/**
	 * Specify the `rvslots` parameter.
	 * @deprecated
	 */
	content?: string;
	/**
	 * @deprecated
	 */
	diff?: {
		badcontentformat?: true;
		from?: number;
		to?: number;
		body?: string;
		notcached?: true;
	};
}

/** */
export interface ApiResponseQueryPagesPropTemplates extends ApiResponseTitleInfo {} // Fully checked (source code level)

/** */
export interface ApiResponseQueryPagesPropTranscludedin extends _ApiQueryBacklinksprop {} // Fully checked (source code level)

export interface ApiResponseQueryPagesPropTranscodestatus { // Fully checked (source code level)
	// WebVideoTranscode::getTranscodeState fetches the entire DB fields, and ApiTranscodeStatus::execute
	// removes leading "transcode_" from field keys and deletes "id", "image_name", and "key" properties.
	// See https://www.mediawiki.org/wiki/Extension:TimedMediaHandler/transcode_table
	error: string | null;
	time_addjob: string | null;
	time_startwork: string | null;
	time_success: string | null;
	time_error: string | null;
	final_bitrate: string; // int(11) in the database but output as a string
}

/** */
export interface ApiResponseQueryPagesPropVideoinfo extends ApiResponseQueryPagesPropImageinfo { // Fully checked (source code level)
	derivatives?: ApiResponseQueryPagesPropVideoinfoDerivatives[];
	timedtext?: ApiResponseQueryPagesPropVideoinfoTimedtext[];
}
export interface ApiResponseQueryPagesPropVideoinfoDerivatives {
	src: string;
	title?: string;
	type: string;
	shorttitle?: string;
	transcodekey?: string;
	width: number;
	height: number;
	bandwidth?: number;
}
export interface ApiResponseQueryPagesPropVideoinfoTimedtext {
	src: string;
	kind: string;
	type: string;
	srclang: string;
	dir: string;
	label: string;
}

export interface ApiResponseQueryPagesPropWbentityusage { // Fully checked (source code level)
	aspects: string[];
	url?: string;
}


// ************************************** action=query&meta=something **************************************

export interface ApiResponseQueryMetaAuthmanagerinfo { // Fully checked (source code level)
	canauthenticatenow: boolean;
	cancreateaccounts: boolean;
	canlinkaccounts: boolean;
	securitysensitiveoperationstatus?: 'ok' | 'reauth' | 'fail';
	haspreservedstate?: boolean;
	hasprimarypreservedstate?: boolean;
	preservedusername?: string;
	requests?: ApiResponseQueryMetaAuthmanagerinfoRequests[];
	fields?: Record<string, ApiResponseQueryMetaAuthmanagerinfoRequestsField>;
}
export interface ApiResponseQueryMetaAuthmanagerinfoRequests {
	id: string;
	metadata: object; // {}
	required: 'optional' | 'required' | 'primary-required';
	provider: string;
	account: string;
	fields?: Record<string, ApiResponseQueryMetaAuthmanagerinfoRequestsField>;
}
export interface ApiResponseQueryMetaAuthmanagerinfoRequestsField {
	type: string;
	label: string;
	options?: unknown; // TODO: Update this if possible
	help: string;
	optional: boolean;
	sensitive: boolean;
}

export interface ApiResponseQueryMetaAllmessages { // Fully checked (source code level)
	name: string;
	normalizedname: string;
	customised?: true;
	missing?: true;
	content?: string; // Missing if amnocontent=true or "missing" is true
	defaultmissing?: true;
	default?: string;
}

export interface ApiResponseQueryMetaBabel { // Fully checked (source code level)
	[langcode: string]: string;
}

export interface ApiResponseQueryMetaCommunityconfiguration { // Fully checked (source code level)
	data: Record<string, unknown>;
	version: string; // Enclosed in "if", but doesn't seem to ever lack
}

export interface ApiResponseQueryMetaFeatureusage { // Fully checked (source code level)
	agent: string;
	start: string;
	end: string;
	usage: ApiResponseQueryMetaFeatureusageUsage[];
}
export interface ApiResponseQueryMetaFeatureusageUsage {
	feature: string;
	date: string;
	count: number;
}

export interface ApiResponseQueryMetaFilerepoinfo { // Fully checked (source code level)
	name?: string;
	displayname?: string;
	rootUrl?: string | false;
	local?: boolean;
	url?: string | false;
	thumbUrl?: string | false;
	initialCapital?: boolean;
	descBaseUrl?: string;
	scriptDirUrl?: string;
	fetchDescription?: boolean;
	descriptionCacheExpiry?: number;
	favicon?: string;
	canUpload?: boolean;
}

export interface ApiResponseQueryMetaGlobalpreferences { // Fully checked (source code level)
	preferences?: Record<string, string>;
	localoverrides?: Record<string, unknown>;
}

export interface ApiResponseQueryMetaGlobalrenamestatus { // Fully checked (source code level)
	from: string;
	to: string;
	// See GlobalRenameUserStatus::getStatuses and
	// https://www.mediawiki.org/wiki/Extension:CentralAuth/renameuser_status_table
	status: { [wiki: string]: 'queued' | 'inprogress' | 'failed' };
}

export interface ApiResponseQueryMetaGlobaluserinfo { // Fully checked (source code level)
	home: string | null;
	id: number;
	registration: string;
	name: string;
	locked?: true;
	hidden?: true;
	missing?: true;
	groups?: string[];
	rights?: string[];
	merged?: ApiResponseQueryMetaGlobaluserinfoMergedAccount[];
	editcount?: number;
	unattached?: ApiResponseQueryMetaGlobaluserinfoAccount[];
}
export interface ApiResponseQueryMetaGlobaluserinfoAccount {
	wiki: string;
	editcount: number;
	registration: string;
	groups?: string[];
	blocked?: ApiResponseQueryMetaGlobaluserinfoBlocked;
}
export interface ApiResponseQueryMetaGlobaluserinfoMergedAccount extends ApiResponseQueryMetaGlobaluserinfoAccount {
	url: string;
	id: number;
	timestamp: string;
	method: string;
}
export interface ApiResponseQueryMetaGlobaluserinfoBlocked {
	expiry: string;
	reason: string;
}

export interface ApiResponseQueryMetaLanguageinfo { // Fully checked (source code level)
	code?: string;
	bcp47?: string;
	dir?: string;
	autonym?: string;
	name?: string;
	fallbacks?: string[];
	variants?: string[];
	variantnames?: { [code: string]: string };
}

/**
 * Generated by `QueryStatsActionApi::makeItem`.
 * @private
 */
export interface _QueryStatsActionApiItem {
	total: number;
	translated: number;
	fuzzy: number;
	proofread: number;
}
/** */
export interface ApiResponseQueryMetaLanguagestats extends _QueryStatsActionApiItem { // Fully checked (source code level)
	group: string;
}

export interface ApiResponseQueryMetaLinterstats { // Fully checked (source code level)
	totals: ApiResponseQueryMetaLinterstatsTotals;
}
export interface ApiResponseQueryMetaLinterstatsTotals {
	[category: string]: number;
}

export interface ApiResponseQueryMetaManagemessagegroups { // Fully checked (source code level)
	key: string;
	content: string;
	similarity: number;
	link: string;
	title: string;
}

export interface ApiResponseQueryMetaMessagegroups { // Fully checked (source code level)
	id?: string;
	label?: string;
	description?: string;
	class?: string;
	namespace?: number | false;
	exists?: boolean;
	icon?: string;
	priority?: string;
	prioritylangs?: string[] | false;
	priorityforce?: boolean;
	workflowstates?: ApiResponseQueryMetaMessagegroupsWorkflowstates | false;
	sourcelanguage?: string;
	subscription?: boolean;
	groupcount?: number;
	groups?: (ApiResponseEmptyPhpArray | ApiResponseQueryMetaMessagegroups)[];
}
export interface ApiResponseQueryMetaMessagegroupsWorkflowstates {
	[state: string]: ApiResponseQueryMetaMessagegroupsWorkflowstatesEntry;
}
export interface ApiResponseQueryMetaMessagegroupsWorkflowstatesEntry {
	canchange?: 1;
	name: string;
}

/** */
export interface ApiResponseQueryMetaMessagegroupstats extends _QueryStatsActionApiItem { // Fully checked (source code level)
	code: string;
	language: string;
}

export interface ApiResponseQueryMetaMessagetranslations { // Fully checked (source code level)
	title: string;
	language: string;
	lasttranslator: string;
	fuzzy?: 'fuzzy';
	translation: string;
}

// ----- meta=notifications -----

export type ApiResponseQueryMetaNotifications = // Fully checked (source code level)
	| ApiResponseEmptyPhpArray
	| ApiResponseQueryMetaNotificationsUngrouped
	| ApiResponseQueryMetaNotificationsGrouped;

// "&notgroupbysection=" not set
export interface ApiResponseQueryMetaNotificationsUngrouped extends ApiResponseQueryMetaNotificationsList {
	seenTime?: ApiResponseQueryMetaNotificationsUngroupedSeentime;
}
export interface ApiResponseQueryMetaNotificationsUngroupedSeentime {
	alert: string;
	message: string;
}

// "&notgroupbysection=true"
export interface ApiResponseQueryMetaNotificationsGrouped {
	alert: ApiResponseQueryMetaNotificationsGroupedList;
	message: ApiResponseQueryMetaNotificationsGroupedList;
	rawcount?: number;
	count?: string;
}
export interface ApiResponseQueryMetaNotificationsGroupedList extends ApiResponseQueryMetaNotificationsList {
	seenTime?: string;
}

export interface ApiResponseQueryMetaNotificationsList {
	list?: ApiResponseQueryMetaNotificationsListitem[];
	continue?: string | null;
	rawcount?: number;
	count?: string;
}
export interface ApiResponseQueryMetaNotificationsListitem {
	// Generated by DataOutputFormatter::formatOutput
	wiki: string;
	id: number;
	type: string;
	category: string;
	section: string;
	timestamp: ApiResponseQueryMetaNotificationsTimestamp;
	bundledIds?: number[];
	title?: ApiResponseQueryMetaNotificationsTitle;
	agent?: ApiResponseQueryMetaNotificationsAgent;
	revid?: number;
	read?: string;
	targetpages: number[];
	// Generated by ApiEchoNotifications::makeForeignNotification
	count?: number;
	sources?: { [wiki: string]: ApiResponseQueryMetaNotificationsSources };
}
export interface ApiResponseQueryMetaNotificationsTimestamp {
	utciso8601: string;
	utcunix: number;
	unix: string;
	utcmw: string;
	mw: string;
	date: string;
}
export interface ApiResponseQueryMetaNotificationsTitle {
	full: string;
	namespace: string;
	'namespace-key': number;
	text: string;
}
export type ApiResponseQueryMetaNotificationsAgent = XOR<
	{
		id: number;
		name: string;
	},
	{
		userhidden: '';
	}
>;
export interface ApiResponseForeignNotificationsApiEndpoints {
	// Generated by ForeignNotifications::getApiEndpoints
	title: string;
	url: string | null;
	base: string | null;
}
export interface ApiResponseQueryMetaNotificationsSources extends ApiResponseForeignNotificationsApiEndpoints {
	// Generated by ApiEchoNotifications::makeForeignNotification
	ts: string | null;
}

// ----- meta=siteinfo -----

export interface ApiResponseQueryMetaSiteinfoAutocreatetempuser { // Fully checked (source code level)
	enabled: boolean;
	matchPatterns?: string[];
}

export interface ApiResponseQueryMetaSiteinfoDbrepllag { // Fully checked (source code level)
	host: string;
	lag: number;
}

export interface ApiResponseQueryMetaSiteinfoDefaultoptions { // Fully checked
	[option: string]: number | string | boolean | null;
}

export interface ApiResponseQueryMetaSiteinfoExtensions { // Fully checked (source code level)
	type: string;
	name?: string;
	namemsg?: string;
	description?: string;
	descriptionmsg?: string;
	/**
	 * Likely a `string[]`, but [[mw:Manual:$wgExtensionCredits]] doesn't even document this property.
	 * From the source in `ApiQuerySiteinfo.php`, it appears like developers can pass a PHP array to `descriptionmsg`.
	 * In such cases, `$ext['descriptionmsg'][0]` is output as `descriptionmsg`, and `$ext['descriptionmsg'][1+]`
	 * as `descriptionmsgparams`. However, no extension in the Gerrit repositories currently appears to use an array.
	 */
	descriptionmsgparams?: unknown;
	author?: string;
	url?: string;
	version?: string;
	'vcs-system'?: string;
	'vcs-version'?: string;
	'vcs-url'?: string;
	'vcs-date'?: string;
	'license-name'?: string;
	license?: string;
	credits?: string;
}

export type ApiResponseQueryMetaSiteinfoExtensiontags = string; // e.g. <pre> // Fully checked (source code level)

export interface ApiResponseQueryMetaSiteinfoFileextensions { // Fully checked (source code level)
	ext: string;
}

export type ApiResponseQueryMetaSiteinfoFunctionhooks = string; // Fully checked (source code level)

export interface ApiResponseQueryMetaSiteinfoGeneral { // Fully checked (source code level)
	mainpage: string;
	base: string;
	sitename: string;
	mainpageisdomainroot: boolean;
	logo: string;
	generator: string;
	phpversion: string;
	phpsapi: string;
	dbtype: string;
	dbversion: string;
	imagewhitelistenabled?: boolean;
	externalimages?: string[]; // Could be wrong
	langconversion: boolean;
	linkconversion: boolean;
	titleconversion: boolean;
	linkprefixcharset: string;
	linkprefix: string;
	linktrail: string;
	legaltitlechars: string;
	invalidusernamechars: string;
	allunicodefixes: boolean;
	fixarabicunicode: boolean;
	fixmalayalamunicode: boolean;
	'git-hash'?: string;
	'git-branch'?: string;
	case: 'first-letter' | 'case-sensitive';
	lang: string;
	fallback: {
		code: string;
	}[];
	variants?: {
		code: string;
		name: string;
	}[];
	rtl: boolean;
	fallback8bitEncoding: string;
	readonly: boolean;
	readonlyreason?: string;
	writeapi: boolean;
	maxarticlesize: number;
	timezone: string;
	timeoffset: number;
	articlepath: string;
	scriptpath: string;
	script: string;
	variantarticlepath: boolean;
	server: string;
	servername: string;
	wikiid: string;
	time: string;
	misermode: boolean;
	uploadsenabled: boolean;
	maxuploadsize: number;
	minuploadchunksize: number;
	galleryoptions: {
		imagesPerRow: number;
		imageWidth: number;
		imageHeight: number;
		captionLength: boolean;
		showBytes: boolean;
		mode: string;
		showDimensions: boolean;
	};
	thumblimits: {
		[index: string]: number;
	};
	imagelimits: {
		[index: string]: {
			width: number;
			height: number;
		};
	};
	favicon?: string;
	centralidlookupprovider: string;
	allcentralidlookupproviders: string[];
	interwikimagic: boolean;
	magiclinks: {
		[key: string]: boolean;
	};
	categorycollation: string;
	nofollowlinks: boolean;
	nofollownsexceptions: string[]; // Could be wrong
	nofollowdomainexceptions: string[];
	externallinktarget: boolean;
	// site- or extension-specific entries
	[key: string]: unknown;
	// 'wmf-config': {
	// 	wmfMasterDatacenter: string;
	// 	wmfEtcdLastModifiedIndex: number;
	// 	wmgCirrusSearchDefaultCluster: string;
	// 	wgCirrusSearchDefaultCluster: string;
	// };
	// citeresponsivereferences: boolean;
	// 'max-page-id': number;
	// linter: {
	// 	high: string[];
	// 	medium: string[];
	// 	low: string[];
	// };
	// mobileserver: string;
	// 'pageviewservice-supported-metrics': Record<'pageviews' | 'siteviews' | 'mostviewed', {
	// 	pageviews: boolean;
	// 	uniques: boolean;
	// }>;
	// 'readinglists-config': {
	// 	[key: string]: number; // Unsure about the value type
	// };
}

export interface ApiResponseQueryMetaSiteinfoInterwikimap { // Fully checked (source code level)
	prefix: string;
	local?: true;
	trans?: true;
	language?: string;
	deprecated?: string;
	bcp47?: string;
	localinterwiki?: true;
	extralanglink?: true;
	code?: string;
	linktext?: string;
	sitename?: string;
	url: string;
	protorel: boolean;
	wikiid?: string;
	api?: string;
}

export interface ApiResponseQueryMetaSiteinfoLanguages { // Fully checked (source code level)
	code: string;
	bcp47: string;
	name: string;
}

export interface ApiResponseQueryMetaSiteinfoLanguagevariants { // Fully checked (source code level)
	[langcode: string]: {
		[langvarcode: string]: {
			fallbacks: string[];
		};
	};
}

export interface ApiResponseQueryMetaSiteinfoLibraries { // Fully checked (source code level)
	name: string;
	version: string;
}

export interface ApiResponseQueryMetaSiteinfoMagicwords { // Fully checked (source code level)
	name: string;
	aliases: string[];
	'case-sensitive': boolean;
}

export interface ApiResponseQueryMetaSiteinfoNamespacealiases { // Fully checked (source code level)
	id: number;
	alias: string;
}

export interface ApiResponseQueryMetaSiteinfoNamespaces { // Fully checked (source code level)
	[nsId: string]: ApiResponseQueryMetaSiteinfoNamespacesEntry;
}
export interface ApiResponseQueryMetaSiteinfoNamespacesEntry {
	id: number;
	case: 'first-letter' | 'case-sensitive';
	name: string;
	subpages: boolean;
	canonical?: string;
	content: boolean;
	nonincludable: boolean;
	namespaceprotection?: string;
	defaultcontentmodel?: string;
}

export interface ApiResponseQueryMetaSiteinfoRestrictions { // Fully checked (source code level)
	types: string[];
	levels: string[];
	cascadinglevels: string[];
	semiprotectedlevels: string[];
}

export interface ApiResponseQueryMetaSiteinfoRightsinfo { // Fully checked (source code level)
	url: string;
	text: string;
}

export interface ApiResponseQueryMetaSiteinfoShowhooks { // Fully checked (source code level)
	name: string;
	subscribers: string[];
}

export interface ApiResponseQueryMetaSiteinfoSkins { // Fully checked (source code level)
	code: string;
	name: string;
	unusable?: true;
	default: true;
}

export interface ApiResponseQueryMetaSiteinfoSpecialpagealiases { // Fully checked (source code level)
	realname: string;
	aliases: string[];
}

export interface ApiResponseQueryMetaSiteinfoStatistics { // Fully checked (source code level)
	pages: number;
	articles: number;
	edits: number;
	images: number;
	users: number;
	activeusers: number;
	admins: number;
	jobs: number;
	[key: string]: unknown; // There may be dynamic entries
}

export interface ApiResponseQueryMetaSiteinfoUploaddialog { // Fully checked (source code level)
	fields: ApiResponseQueryMetaSiteinfoUploaddialogFields;
	licensemessages: ApiResponseQueryMetaSiteinfoUploaddialogLicensemessages;
	comment: string;
	format: ApiResponseQueryMetaSiteinfoUploaddialogFormat;
}
export interface ApiResponseQueryMetaSiteinfoUploaddialogFields {
	description: boolean;
	date: boolean;
	categories: boolean;
}
export interface ApiResponseQueryMetaSiteinfoUploaddialogLicensemessages {
	local: string;
	foreign: string;
}
export interface ApiResponseQueryMetaSiteinfoUploaddialogFormat {
	filepage: string;
	description: string;
	ownwork: string;
	license: string;
	uncategorized: string;
}

/** */
export interface ApiResponseQueryMetaSiteinfoUsergroups extends Partial<ApiResponseGroupsChangeableBy> { // Fully checked (source code level)
	name: string;
	rights: string[];
	number?: number;
}

export type ApiResponseQueryMetaSiteinfoVariables = string; // Fully checked (source code level)

// ----- meta=siteinfo end -----

export interface ApiResponseQueryMetaSiteviews { // Fully checked (source code level)
	[date: string]: number;
}

export type ApiResponseQueryMetaTokens = { // Fully checked (source code level)
	csrftoken?: string;
	watchtoken?: string;
	patroltoken?: string;
	rollbacktoken?: string;
	userrightstoken?: string;
	logintoken?: string;
	createaccounttoken?: string;
	// The properties below aren't defined in ApiQueryTokens::getTokenTypeSalts
	deleteglobalaccounttoken?: string;
	setglobalaccountstatustoken?: string;
} & {
	[tokentype: string]: string;
};

export interface ApiResponseQueryMetaUnreadnotificationpages {
	[wiki: string]: ApiResponseQueryMetaUnreadnotificationpagesEntry;
}
export interface ApiResponseQueryMetaUnreadnotificationpagesEntry {
	pages: ApiResponseQueryMetaUnreadnotificationpagesEntryPages[];
	totalCount: number;
	source: ApiResponseForeignNotificationsApiEndpoints;
}
export interface ApiResponseQueryMetaUnreadnotificationpagesEntryPages {
	ns?: number;
	title: string | null;
	unprefixed?: string;
	pages?: (string | null)[];
	count: number;
}

/** */
export interface ApiResponseQueryMetaUserinfo extends // Fully checked (source code level)
	/**
	 * `uiprop=blockinfo`
	 */
	ApiResponseBlockDetails,
	/**
	 * `uiprop=centralids`
	 */
	ApiResponseCentralUserInfo
{

	// uiprop-independent properties
	id: number;
	name: string;
	anon?: true;
	temp?: true;

	// uiprop-dependent properties

	/**
	 * `uiprop=hasmsg`
	 */
	messages?: boolean;
	/**
	 * `uiprop=groups`
	 */
	groups?: string[];
	/**
	 * `uiprop=groupmemberships`
	 */
	groupmemberships?: ApiResponseQueryMetaUserinfoGroupmemberships[];
	/**
	 * `uiprop=implicitgroups`
	 */
	implicitgroups?: string[];
	/**
	 * `uiprop=rights`
	 */
	rights?: string[];
	/**
	 * `uiprop=changeablegroups`
	 */
	changeablegroups?: ApiResponseGroupsChangeableBy;
	/**
	 * `uiprop=options`
	 */
	options?: {
		[key: string]: string | number | boolean | null;
	};
	/**
	 * `uiprop=editcount`
	 */
	editcount?: number;
	/**
	 * `uiprop=ratelimits`
	 */
	ratelimits?: ApiResponseQueryMetaUserinfoRatelimits;
	/**
	 * `uiprop=theoreticalratelimits`
	 */
	theoreticalratelimits?: ApiResponseQueryMetaUserinfoRatelimits;
	/**
	 * `uiprop=realname`
	 */
	realname?: string;
	/**
	 * `uiprop=email`
	 */
	email?: string;
		emailauthenticated?: string; // ISO timestamp
	/**
	 * `uiprop=registrationdate`
	 */
	registrationdate?: string | null;
	/**
	 * `uiprop=acceptlang`
	 */
	acceptlang?: ApiResponseQueryMetaUserinfoAcceptlang[];
	/**
	 * `uiprop=unreadcount`
	 *
	 * Usually a number, but may be a string if the counter exceeds a configured limit.
	 * In such cases, the value takes the form `{n}+` (e.g., `'1000+'`), where `n` is defined by
	 * `ApiQueryUserInfo::WL_UNREAD_LIMIT`.
	 */
	unreadcount?: number | string;
	/**
	 * `uiprop=latestcontrib`
	 */
	latestcontrib?: string; // ISO timestamp, undefined (no property) for no contribs
	/**
	 * `uiprop=cancreateaccount`
	 */
	cancreateaccount?: boolean;
		cancreateaccounterror?: unknown; // Probably the same as ApiResponseErrors
}
export interface ApiResponseQueryMetaUserinfoGroupmemberships {
	group: string;
	expiry: string;
}
export interface ApiResponseQueryMetaUserinfoRatelimits {
	[action: string]: PartialRecord<'anon' | 'user' | 'ip' | 'subnet' | 'newbie', {
		hits: number;
		seconds: number;
	}>;
}
export interface ApiResponseQueryMetaUserinfoAcceptlang {
	q: number;
	code: string;
}

export interface ApiResponseQueryMetaWikibase {
	repo?: ApiResponseQueryMetaWikibaseRepo;
	siteid?: string;
}
export interface ApiResponseQueryMetaWikibaseRepo {
	url: ApiResponseQueryMetaWikibaseRepoUrls;
}
export interface ApiResponseQueryMetaWikibaseRepoUrls {
	base: string;
	scriptpath: string;
	articlepath: string;
}


// ************************************** action=query&list=something **************************************

export interface ApiResponseQueryListAbusefilters { // Fully checked (source code level)
	id?: number;
	description?: string;
	pattern?: string;
	actions?: string;
	hits?: number;
	comments?: string;
	lasteditor?: string;
	lastedittime?: string;
	private?: '';
	protected?: '';
	enabled?: '';
	deleted?: '';
}

/** */
export interface ApiResponseQueryListAbuselog extends Partial<ApiResponseTitleInfo> { // Fully checked (source code level)
	id?: number;
	filter_id?: string;
	filter?: string;
	user?: string;
	wiki?: string;
	action?: string;
	result?: string;
	revid?: number | '';
	timestamp?: string;
	/**
	 * This property is appended by `VariablesManager::exportAllVars` and `VariablesBlobStore::loadVarDump`,
	 * referencing an entire row from the `afl_var_dump` column. This column is of BLOB type, and its internal
	 * structure may vary. Therefore, it is not possible to assign a fixed type mapping to this property;
	 * clients should manually type-assert the object’s properties as needed.
	 */
	details?: Record<string, unknown>;
	hidden?: boolean;
}

export interface ApiResponseQueryListAllcategories { // Fully checked (source code level)
	category: string;
	size?: number;
	pages?: number;
	files?: number;
	subcats?: number;
	hidden?: boolean;
}

/** */
export interface ApiResponseQueryListAlldeletedrevisions extends ApiResponseQueryListAllrevisions {} // Fully checked (source code level)

/** */
export interface ApiResponseQueryListAllfileusages extends ApiResponseQueryListAlllinks {} // Fully checked (source code level)

/** */
export interface ApiResponseQueryListAllimages extends ApiResponseTitleInfo, ApiResponseQueryPagesPropImageinfo {} // Fully checked (source code level)

/** */
export interface ApiResponseQueryListAlllinks extends Partial<ApiResponseTitleInfo> { // Fully checked (source code level)
	fromid?: number;
}

/** */
export interface ApiResponseQueryListAllpages extends ApiResponseTitleInfo { // Fully checked (source code level)
	pageid: number;
}

/** */
export interface ApiResponseQueryListAllredirects extends ApiResponseQueryListAlllinks { // Fully checked (source code level)
	fragment?: string;
	interwiki?: string;
}

/** */
export interface ApiResponseQueryListAllrevisions extends Partial<ApiResponseTitleInfo> { // Fully checked (source code level)
	pageid?: number;
	revisions: ApiResponseQueryPagesPropRevisions[];
}

/** */
export interface ApiResponseQueryListAlltransclusions extends ApiResponseQueryListAlllinks {} // Fully checked (source code level)

/** */
export interface ApiResponseQueryListAllusers extends ApiResponseBlockDetails, ApiResponseCentralUserInfo { // Fully checked (source code level)
	// Note: ApiQueryAllUsers.php and ApiQueryUsers.php are different, and not interchangeable
	userid: number;
	name: string;
	hidden?: true;
	editcount?: number;
	recentactions?: number;
	registration?: string;
	groups?: string[];
	implicitgroups?: string[];
	rights?: string[];
}

/** */
export interface ApiResponseQueryListBacklinks extends _ApiQueryBacklinks {} // Fully checked (source code level)

export interface ApiResponseQueryListBetafeatures { // Fully checked (source code level)
	[key: string]: {
		name: string;
		count: number;
	};
}

export interface ApiResponseQueryListBlocks { // Fully checked (source code level)
	id?: number;
	user?: string;
	userid?: number;
	by?: string;
	byid?: number;
	timestamp?: string;
	expiry?: string;
	'duration-l10n'?: string;
	reason?: string;
	parsedreason?: string;
	rangestart?: string;
	rangeend?: string;
	automatic?: boolean;
	anononly?: boolean;
	nocreate?: boolean;
	autoblock?: boolean;
	noemail?: boolean;
	hidden?: boolean;
	allowusertalk?: boolean;
	partial?: boolean;
	/**
	 * An empty array if the user is not partial-blocked; otherwise an object.
	 */
	restrictions?: ApiResponseEmptyPhpArray | ApiResponseQueryListBlocksRestrictions;
}
export interface ApiResponseQueryListBlocksRestrictions {
	pages?: ApiResponseQueryListBlocksRestrictionsPages[];
	namespaces?: number[];
	actions?: ApiActionRestrictions[];
}
export interface ApiResponseQueryListBlocksRestrictionsPages {
	id: number;
	ns: number;
	title: string;
}

/** */
export interface ApiResponseQueryListCategorymembers extends Partial<ApiResponseTitleInfo> { // Fully checked (source code level)
	pageid?: number;
	sortkey?: string;
	sortkeyprefix?: string;
	type?: string;
	timestamp?: string;
}

export interface ApiResponseQueryListCentralnoticeactivecampaigns { // Fully checked (source code level)
	// Generated by Campaign::getActiveCampaignsAndBanners
	name: string;
	start: string;
	end: string;
	banners?: string[];
}

export interface ApiResponseQueryListCentralnoticelogs { // Fully checked (source code level)
	logs: ApiResponseQueryListCentralnoticelogsLog[];
}
export interface ApiResponseQueryListCentralnoticelogsLog {
	removed: ApiResponseEmptyPhpArray | ApiResponseQueryListCentralnoticelogsDiff;
	added: ApiResponseEmptyPhpArray | ApiResponseQueryListCentralnoticelogsDiff;
}
export interface ApiResponseQueryListCentralnoticelogsDiff {
	// Direct result of a SELECT query, formatted as a diff via CampaignLog.php and ApiCentralNoticeLogs.php
	// See https://www.mediawiki.org/wiki/Extension:CentralNotice/cn_notice_log_table
	start?: string;
	end?: string;
	enabled?: '1' | '0';
	preferred?: '1' | '0';
	locked?: '1' | '0';
	geo?: '1' | '0';
	buckets?: '1' | '0';
	projects?: string[];
	languages?: string[];
	countries?: string[];
	regions?: string[];
	banners?: Record<string, unknown>;
}

export type ApiResponseQueryListCheckuser = XOR< // Fully checked (source code level)
	{
		edits: ApiResponseQueryListCheckuserEdits[];
	},
	{
		userips: ApiResponseQueryListCheckuserUserips[];
	},
	{
		ipusers: ApiResponseQueryListCheckuserIpusers[];
	}
>;
/** */
export interface ApiResponseQueryListCheckuserEdits extends ApiResponseTitleInfo {
	// Generated by ApiQueryCheckUserActionsResponse::getResponseData
	timestamp: string;
	user: string;
	ip: string;
	agent: string;
	summary?: string;
	minor?: 'm';
	xff?: string;
}
export interface ApiResponseQueryListCheckuserUserips {
	// Generated by ApiQueryCheckUserUserIpsResponse::getResponseData
	end: string;
	editcount: number;
	start?: string;
	address?: string;
}
export interface ApiResponseQueryListCheckuserIpusers {
	// Generated by ApiQueryCheckUserIpUsersResponse::getResponseData
	end: string;
	editcount: number;
	ips: string[];
	agents: string[];
	start?: string;
	name: string;
}

export interface ApiResponseQueryListCheckuserlog { // Fully checked (source code level)
	entries: ApiResponseQueryListCheckuserlogEntry[];
}
export interface ApiResponseQueryListCheckuserlogEntry {
	timestamp: string;
	checkuser: string;
	type: string;
	reason: string;
	target: string;
}

export interface ApiResponseQueryListCodexicons { // Fully checked (source code level)
	[key: string]: unknown;
}

/** */
export interface ApiResponseQueryListEmbeddedin extends _ApiQueryBacklinks {} // Fully checked (source code level)

export interface ApiResponseQueryListExtdistrepos { // Fully checked (source code level)
	extensions: string[];
	skins: string[];
}

/** */
export interface ApiResponseQueryListExturlusage extends ApiResponseTitleInfo { // Fully checked (source code level)
	pageid?: number;
	url?: string;
}

/** */
export interface ApiResponseQueryListFilearchive extends ApiResponseTitleInfo { // Fully checked (source code level)
	id: number;
	name: string;
	parseddescription?: string;
	description?: string;
	userid?: number;
	user?: string;
	filemissing?: true;
	sha1?: string;
	timestamp?: string;
	size?: string;
	pagecount?: number;
	height?: string;
	width?: string;
	mediatype?: string;
	metadata: ApiResponseQueryPagesPropImageinfoMetadata[] | null;
	bitdepth?: string;
	mime?: string;
	archivename?: string;
	filehidden?: true;
	commenthidden?: true;
	userhidden?: true;
	suppressed?: true;
}

export interface ApiResponseQueryListGadgetcategories { // Fully checked (source code level)
	name?: string;
	desc?: string;
	members?: number;
}

export interface ApiResponseQueryListGadgets { // Fully checked (source code level)
	id?: string;
	metadata?: ApiResponseQueryListGadgetsMetadata;
	desc?: string;
}
export interface ApiResponseQueryListGadgetsMetadata {
	settings: ApiResponseQueryListGadgetsMetadataSettings;
	module: ApiResponseQueryListGadgetsMetadataModule;
}
export interface ApiResponseQueryListGadgetsMetadataSettings {
	actions: string[];
	categories: string[];
	section: string;
	contentModels: string[];
	default: boolean;
	hidden: boolean;
	legacyscripts: boolean;
	namespaces: (string | number)[];
	package: boolean;
	requiresES6: boolean;
	rights: string[];
	shared: false;
	skins: string[];
	supportsUrlLoad: boolean;
}
export interface ApiResponseQueryListGadgetsMetadataModule {
	datas: string[];
	dependencies: string[];
	messages: string[];
	peers: string[];
	scripts: string[];
	styles: string[];
}

export interface ApiResponseQueryListGlobalallusers { // Fully checked (source code level)
	id: number;
	name: string;
	groups?: string[];
	existslocally?: '';
	locked?: '';
}

export interface ApiResponseQueryListGlobalblocks { // Fully checked (source code level)
	id?: string;
	target?: string;
	/**
	 * `bgprop=address` has been deprecated. Use `bgprop=target` instead.
	 * @deprecated
	 */
	address?: string;
	anononly?: boolean;
	'account-creation-disabled'?: boolean;
	'autoblocking-enabled'?: boolean;
	automatic?: boolean;
	by?: string;
	bywiki?: string;
	timestamp?: string;
	expiry?: string;
	reason?: string;
	rangestart?: string;
	rangeend?: string;
}

export interface ApiResponseQueryListGlobalgroups { // Fully checked (source code level)
	name: string;
	rights?: string[];
}

/** */
export interface ApiResponseQueryListImageusage extends _ApiQueryBacklinks {} // Fully checked (source code level)

/** */
export interface ApiResponseQueryListIwbacklinks extends ApiResponseTitleInfo { // Fully checked (source code level)
	pageid: number;
	redirect?: true;
	iwprefix?: string;
	iwtitle?: string;
}

/** */
export interface ApiResponseQueryListLangbacklinks extends ApiResponseTitleInfo { // Fully checked (source code level)
	pageid: number;
	redirect?: true;
	lllang?: string;
	lltitle?: string;
}

/** */
export interface ApiResponseQueryListLinterrors extends ApiResponseTitleInfo { // Fully checked (source code level)
	pageid: number;
	lintId: number;
	category: ApiResponseQueryListLinterrorsCategories;
	location: number[];
	templateInfo: Record<string, unknown>;
	params: Record<string, unknown>;
}
export type ApiResponseQueryListLinterrorsCategories =
	| 'bogus-image-options'
	| 'deletable-table-tag'
	| 'duplicate-ids'
	| 'empty-heading'
	| 'fostered'
	| 'fostered-transparent'
	| 'html5-misnesting'
	| 'large-tables'
	| 'misc-tidy-replacement-issues'
	| 'misnested-tag'
	| 'missing-end-tag'
	| 'missing-end-tag-in-heading'
	| 'multi-colon-escape'
	| 'multiline-html-table-in-list'
	| 'multiple-unclosed-formatting-tags'
	| 'night-mode-unaware-background-color'
	| 'obsolete-tag'
	| 'pwrap-bug-workaround'
	| 'self-closed-tag'
	| 'stripped-tag'
	| 'tidy-font-bug'
	| 'tidy-whitespace-bug'
	| 'unclosed-quotes-in-heading'
	| 'wikilink-in-extlink';

/** */
export interface ApiResponseQueryListLogevents extends Partial<ApiResponseTitleInfo> { // Fully checked (source code level)
	logid?: number;
	actionhidden?: true;
	pageid?: number;
	logpage?: number;
	revid?: number;
	params?: ApiResponseQueryListLogeventsParams;
	type?: string;
	action?: string;
	userhidden?: true;
	user?: string;
	userid?: number;
	temp?: true;
	anon?: true;
	timestamp?: string;
	commenthidden?: true;
	comment?: string;
	parsedcomment?: string;
	tags?: string[];
	suppressed?: true;
}
export interface ApiResponseQueryListLogeventsParams {
	// TODO: Not really possible to make this interface comprehensive.
	// Type it as `[key: string]: unknown`?
	[key: string]: any;
	userid?: number;
	curid?: number;
	previd?: number;
	auto?: boolean;
	description?: string;
	cascade?: boolean;
	details?: {
		type: string;
		level: string;
		expiry: string;
		cascade: boolean;
	}[];
	target_ns?: number;
	target_title?: string;
	suppressredirect?: boolean;
	oldgroups?: string[];
	newgroups?: string[];
	duration?: number | string;
	flags?: string[];
	restrictions?: {
		pages?: {
			page_ns: number;
			page_title: string;
		}[];
		namespaces?: number[];
		actions?: ApiActionRestrictions[];
	};
	blockId?: number;
	sitewide?: boolean;
	expiry?: string;
	'duration-l10n'?: string;
	url?: string;
	img_sha1?: string;
	img_timestamp?: string;
	oldtitle_ns?: number;
	oldtitle_title?: string;
	olduser?: string;
	newuser?: string;
	edits?: number;
	type?: string;
	ids?: number[];
	old?: {
		bitmask: number;
		content: boolean;
		comment: boolean;
		user: boolean;
		restricted: boolean;
	};
	new?: {
		bitmask: number;
		content: boolean;
		comment: boolean;
		user: boolean;
		restricted: boolean;
	};
	oldmetadata?: Array<{
		group: string;
		expiry: string;
	}>;
	newmetadata?: Array<{
		group: string;
		expiry: string;
	}>;
}

export interface ApiResponseQueryListMessagecollection { // Fully checked (source code level)
	key: string;
	definition?: string;
	translation?: string;
	tags?: string[];
	properties?: Record<string, unknown>;
	title: string;
	targetLanguage: string;
	primaryGroup?: string;
}
export interface ApiResponseQueryListMessagecollectionMetadata {
	state: string | null;
	resultsize: number;
	remaining: number;
}

/** */
export interface ApiResponseQueryListMostviewed extends ApiResponseTitleInfo { // Fully checked (source code level)
	count: number;
}

export interface ApiResponseQueryListMystashedfiles { // Fully checked (source code level)
	filekey: string;
	status: string;
	size?: number;
	width?: number;
	height?: number;
	bits?: number;
	mimetype?: string;
	mediatype?: string;
}

export interface ApiResponseQueryListPagepropnames { // Fully checked (source code level)
	propname: string;
}

/** */
export interface ApiResponseQueryListPageswithprop extends Partial<ApiResponseTitleInfo> { // Fully checked (source code level)
	pageid?: number;
	value?: string; // TODO: Should this be unknown?
}

/** */
export interface ApiResponseQueryListPrefixsearch extends ApiResponseTitleInfo { // Fully checked (source code level)
	special?: true;
	pageid?: number;
}

/** */
export interface ApiResponseQueryListProtectedtitles extends ApiResponseTitleInfo { // Fully checked (source code level)
	timestamp?: string;
	user?: string;
	userid?: number;
	comment?: string;
	parsedcomment?: string;
	expiry?: string;
	level?: string;
}

export interface ApiResponseQueryListQuerypage { // Fully checked (source code level)
	name: string;
	disabled?: true;
	cached?: true;
	cachedtimestamp?: string;
	maxresults?: number;
	results: ApiResponseQueryListQuerypageResults[];
}
/** */
export interface ApiResponseQueryListQuerypageResults extends ApiResponseTitleInfo {
	value?: string;
	timestamp?: string;
}

/** */
export interface ApiResponseQueryListRandom extends ApiResponseTitleInfo { // Fully checked (source code level)
	id: number;
	redirect?: boolean;
}

/** */
export interface ApiResponseQueryListRecentchanges extends Partial<ApiResponseTitleInfo> { // Fully checked (source code level)
	type: ApiResponseQueryListRecentchangesTypes;
	actionhidden?: true;
	pageid?: number;
	revid?: number;
	old_revid?: number;
	rcid?: number;
	userhidden?: true;
	user?: string;
	userid?: number;
	temp?: true;
	anon?: true;
	bot?: boolean;
	new?: boolean;
	minor?: boolean;
	oldlen?: number;
	newlen?: number;
	timestamp?: string;
	commenthidden?: true;
	comment?: string;
	parsedcomment?: string;
	redirect?: boolean;
	patrolled?: boolean;
	unpatrolled?: boolean;
	autopatrolled?: boolean;
	logid?: number;
	logtype?: string;
	logaction?: string;
	logparams?: Record<string, unknown>;
	tags?: string[];
	sha1hidden?: true;
	sha1?: string;
	suppressed?: true;
}
/**
 * Defined in `RecentChange::CHANGE_TYPES`.
 */
export type ApiResponseQueryListRecentchangesTypes =
	| 'edit'
	| 'new'
	| 'log'
	| 'external'
	| 'categorize';

/** */
export interface ApiResponseQueryListSearch extends ApiResponseTitleInfo { // Fully checked (source code level)
	pageid: number;
	size?: number;
	wordcount?: number;
	snippet?: string;
	timestamp?: string;
	titlesnippet?: string;
	categorysnippet?: string;
	redirecttitle?: string;
	redirectsnippet?: string;
	sectiontitle?: string;
	sectionsnippet?: string;
	isfilematch?: boolean;
	extensiondata?: Record<string, unknown>;
}
export interface ApiResponseQueryListSearchInfoInterwiki { // Fully checked (source code level)
	totalhits?: number;
	approximate_totalhits?: number;
}
/** */
export interface ApiResponseQueryListSearchInfo extends ApiResponseQueryListSearchInfoInterwiki { // Fully checked (source code level)
	suggestion?: string;
	suggestionsnippet?: string;
	rewrittenquery?: string;
	rewrittenquerysnippet?: string;
}
/** */
export interface ApiResponseQueryListSearchInterwikisearch extends ApiResponseQueryListSearch { // Fully checked (source code level)
	namespace: string;
	title: string;
	url: string;
}

export interface ApiResponseQueryListTags { // Fully checked (source code level)
	name: string;
	displayname?: string;
	description?: string;
	hitcount?: number;
	defined?: boolean;
	source?: ApiResponseQueryListTagsSource[];
	active?: boolean;
}
export type ApiResponseQueryListTagsSource =
	| 'software'
	| 'extension' // Backwards compatibility entry (T247552)
	| 'manual';

export interface ApiResponseQueryListThreads { // Fully checked (source code level)
	// This object is generated by the generic function ApiQueryLQTThreads::formatProperty, but it basically
	// has the same structure as that of the PHP array defined as ApiQueryLQTThreads::$propRelations.
	// See https://www.mediawiki.org/wiki/Extension:LiquidThreads/thread_table for nullable values.
	ancestor?: string;
	author?: ApiResponseQueryListThreadsAuthor;
	created?: string;
	id?: string;
	modified?: string;
	pagens?: number;
		pagetitle?: string;
	parent?: string | null;
	rootid?: string;
	signature?: string | null;
	subject?: string | null;
	summaryid?: string | null;
	type?: string;
	reactions?: ApiResponseEmptyPhpArray | { [key: string]: ApiResponseQueryListThreadsReactions };
	replies?: ApiResponseEmptyPhpArray | { [thread_id: string]: ApiResponseQueryListThreadsReplies };
	/**
	 * `thrender=true`
	 */
	content?: string;
}
export interface ApiResponseQueryListThreadsAuthor {
	id: string | null;
	name: string | null;
}
export interface ApiResponseQueryListThreadsReactions {
	// https://www.mediawiki.org/wiki/Extension:LiquidThreads/thread_reaction_table
	type: string | null;
	'user-id': string | null;
	'user-name': string | null;
	value: string | null;
}
export interface ApiResponseQueryListThreadsReplies {
	id: string;
}

/** */
export interface ApiResponseQueryListUsercontribs extends ApiResponseTitleInfo { // Fully checked (source code level)
	texthidden?: true;
	userid: number;
	user: string;
	userhidden?: true;
	pageid?: number;
	revid?: number;
	parentid?: number;
	timestamp?: string;
	new?: boolean;
	minor?: boolean;
	top?: boolean;
	commenthidden?: true;
	comment?: string;
	parsedcomment?: string;
	patrolled?: boolean;
	autopatrolled?: boolean;
	size?: number;
	sizediff?: number;
	tags?: string[];
	suppressed?: true;
}

/** */
export interface ApiResponseQueryListUsers extends ApiResponseBlockDetails, ApiResponseCentralUserInfo { // Fully checked (source code level)
	name: string;
	invalid?: true;
	userid?: number;
	systemuser?: true;
	editcount?: number;
	registration?: string;
	groups?: string[];
	groupmemberships?: ApiResponseQueryMetaUserinfoGroupmemberships[];
	implicitgroups?: string[];
	rights?: string[];
	hidden?: true;
	emailable?: boolean;
	gender?: string;
	missing?: true;
	cancreate?: boolean;
	cancreateerror?: unknown; // Probably the same as ApiResponseErrors
}

/** */
export interface ApiResponseQueryListWatchlist extends Partial<ApiResponseTitleInfo> { // Fully checked (source code level)
	// Mostly the same as ApiResponseQueryListRecentchanges but not identical
	// as the object is generated by a separate module (ApiQueryWatchlist.php)
	type: ApiResponseQueryListRecentchangesTypes;
	actionhidden?: true;
	pageid?: number;
	revid?: number;
	old_revid?: number;
	// rcid?: number; // Doesn't exist in this object
	userhidden?: true;
	userid?: number;
	user?: string;
	temp?: true;
	anon?: true;
	bot?: boolean;
	new?: boolean;
	minor?: boolean;
	oldlen?: number;
	newlen?: number;
	timestamp?: string;
	notificationtimestamp?: string; // Exclusive to this object
	commenthidden?: true;
	comment?: string;
	parsedcomment?: string;
	// redirect?: boolean; // Doesn't exist in this object
	patrolled?: boolean;
	unpatrolled?: boolean;
	autopatrolled?: boolean;
	logid?: number;
	logtype?: string;
	logaction?: string;
	logparams?: Record<string, unknown>;
	logdisplay?: string; // Exclusive to this object
	tags?: string[];
	expiry?: string | false; // Exclusive to this object
	// sha1hidden?: true; // Doesn't exist in this object
	// sha1?: string; // Doesn't exist in this object
	suppressed?: true;
}

/** */
export interface ApiResponseQueryListWatchlistraw extends ApiResponseTitleInfo { // Fully checked (source code level)
	changed?: string;
}

/** */
export interface ApiResponseQueryListWblistentityusage extends ApiResponseTitleInfo { // Fully checked (source code level)
	pageid: number;
	wblistentityusage: Record<string, ApiResponseQueryPagesPropWbentityusage>;
}

export interface ApiResponseQueryListWikisets { // Fully checked (source code level)
	id: string;
	name: string;
	type?: string;
	wikisincluded?: { [id: string]: string };
	wikisnotincluded?: { [id: string]: string };
}