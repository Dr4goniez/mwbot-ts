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
 * const ex1: OnlyOneRecord<'a' | 'b', {1: 1}> = {
 *   a: {1: 1},
 *   b: {1: 1}
 * };
 * // Ok
 * const ex2: OnlyOneRecord<'a' | 'b', {1: 1}> = {
 *   b: {1: 1}
 * };
 * ```
 */
export type OnlyOneRecord<K extends string, V = any> = {
	[P in K]: (Record<P, V> &
	Partial<Record<Exclude<K, P>, never>>) extends infer O
	? { [Q in keyof O]: O[Q] }
	: never
}[K];


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
		| string[]
		| number[]
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

export interface ApiEditPageParams extends ApiParams {
	// Adapted from https://github.com/wikimedia-gadgets/types-mediawiki/blob/main/api_params/index.d.ts
	title?: string;
	pageid?: number;
	section?: string;
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

// ************************************** Response types **************************************

export interface ApiResponse {

	[key: string]: any;

	// ********************** General properties **********************

	batchcomplete?: boolean;
	continue?: {
		[key: string]: string;
	};
	curtimestamp?: string;
	docref?: string; // Present when "errors" is present
	error?: ApiResponseError;
	errorlang?: string;
	errors?: ApiResponseErrors[];
	limits?: {
		[key: string]: number;
	};
	normalized?: ApiResponseNormalized[];
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
	// block?: ApiResponseBlock;
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
	// delete?: ApiResponseDelete;
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
	// move?: ApiResponseMove;
	// newslettersubscribe?: ApiResponseNewslettersubscribe;
	// opensearch?: ApiResponseOpensearch;
	// options?: ApiResponseOptions;
	paraminfo?: ApiResponseParaminfo;
	parse?: ApiResponseParse;
	// patrol?: ApiResponsePatrol;
	// protect?: ApiResponseProtect;
	purge?: ApiResponsePurge[];
	query?: ApiResponseQuery;
	// removeauthenticationdata?: ApiResponseRemoveauthenticationdata;
	// resetpassword?: ApiResponseResetpassword;
	// revisiondelete?: ApiResponseRevisiondelete;
	// rollback?: ApiResponseRollback;
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
	// unblock?: ApiResponseUnblock;
	// undelete?: ApiResponseUndelete;
	// unlinkaccount?: ApiResponseUnlinkaccount;
	// upload?: ApiResponseUpload;
	// userrights?: ApiResponseUserrights;
	// validatepassword?: ApiResponseValidatepassword;
	// watch?: ApiResponseWatch;
	// webapp-manifest?: ApiResponseWebappmanifest;
	// webauthn?: ApiResponseWebauthn;
	// wikilove?: ApiResponseWikilove;

}


// ************************************** General response properties **************************************

export interface ApiResponseError { // errorformat=bc
	code: string;
	info: string;
	docref?: string;
	// [key: string]: unknown;
}

export type ApiResponseErrors = {
	code: string;
	module: string;
	data?: unknown[];
	// [key: string]: unknown;
} & XOR<
	{'*': string;}, // formatversion=1
	{html: string;}, // errorformat=html
	{text: string;}, // errorformat=wikitext, errorformat=plaintext
	{key: string; params: string[];} // errorformat=raw
>;

export interface ApiResponseNormalized {
	fromencoded?: boolean;
	from: string;
	to: string;
}

export type ApiResponseWarnings = {
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
};

export type ApiResponseWarningsLegacy = PartialRecord<ApiParamsAction, XOR< // errorformat=bc
	{
		'*': string; // formatversion=1
	},
	{
		warnings: string; // formatversion=2, latest
	}>
>;

// ************************************** action=somthing **************************************

// export interface ApiResponseAbusefiltercheckmatch {}
// export interface ApiResponseAbusefilterchecksyntax {}
// export interface ApiResponseAbusefilterevalexpression {}
// export interface ApiResponseAbusefilterunblockautopromote {}
// export interface ApiResponseAbuselogprivatedetails {}
// export interface ApiResponseAggregategroups {}
// export interface ApiResponseAntispoof {}
// export interface ApiResponseBlock {}
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
// export interface ApiResponseDelete {}
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
// export interface ApiResponseMove {}
// export interface ApiResponseNewslettersubscribe {}
// export interface ApiResponseOpensearch {}
// export interface ApiResponseOptions {}

export interface ApiResponseParaminfo {
	helpformat: string;
	modules: ApiResponseParaminfoModules[];
}
export interface ApiResponseParaminfoModules {
	name: string;
	classname: string;
	path: string;
	group: string;
	prefix: string;
	source: string;
	sourcename: string;
	licensetag: string;
	licenselink: string;
	description?:
		| string // helpformat=wikitext, html
		| ApiResponseParaminfoModulesDescription[]; // helpformat=raw
	writerights: boolean;
	mustbeposted: boolean;
	helpurls: string[];
	examples?: {
		query: string;
		description: string | ApiResponseParaminfoModulesDescription[];
	}[];
	parameters: {
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

export interface ApiResponseParse { // TODO: recheck
	title: string;
	pageid: number;
	revid: number;
	text: string;
	langlinks: {
		lang: string;
		url: string;
		langname: string;
		autonym: string;
		title: string;
	}[];
	categories: {
		sortkey: string;
		category: string;
		hidden: boolean;
	}[];
	categorieshtml: string;
	links: {
		ns: number;
		title: string;
		exists: boolean;
	}[];
	templates: {
		ns: number;
		title: string;
		exists: boolean;
	}[];
	images: string[];
	externallinks: string[];
	sections: {
		toclevel: number;
		level: string;
		line: string;
		number: string;
		index: string;
		fromtitle: string;
		byteoffset: number | null;
		anchor: string;
		linkAnchor: string;
		extensionData: {
			[key: string]: string;
		};
	}[];
	showtoc: boolean;
	/** Empty array returned, type might be wrong */
	parsewarnings: string[];
	/** Empty array returned, type might be wrong */
	parsewarningshtml: string[];
	displaytitle: string;
	subtitle: string;
	/** Empty array returned, type might be wrong */
	headitems: string[];
	headhtml: string;
	modules: string[];
	/** Empty array returned, type might be wrong */
	modulescripts: string[];
	modulestyles: string[];
	jsconfigvars: {
		[key: string]: any;
	};
	encodedjsconfigvars: string;
	indicators: {
		[key: string]: string;
	};
	iwlinks: {
		prefix: string;
		url: string;
		title: string;
	}[];
	wikitext: string;
	properties: {
		[key: string]: string;
	};
	limitreportdata: {
		name: string;
		[number: string]: string;
	}
	limitreporthtml: string;
	parsetree: string;
}
// export interface ApiResponsePatrol {}
// export interface ApiResponseProtect {}

export interface ApiResponsePurge { // Fully checked (source code level)
	title: string;
	ns?: number; // Missing for invalid titles
	purged?: true;
	linkupdate?: true;
	invalid?: true;
	invalidreason?: string;
	special?: true;
	missing?: true;
	iw?: string;
}

// export interface ApiResponseQuery {} // Defined below
// export interface ApiResponseRemoveauthenticationdata {}
// export interface ApiResponseResetpassword {}
// export interface ApiResponseRevisiondelete {}
// export interface ApiResponseRollback {}
// export interface ApiResponseRsd {}
// export interface ApiResponseSearchtranslations {}
// export interface ApiResponseSetglobalaccountstatus {}
// export interface ApiResponseSetnotificationtimestamp {}
// export interface ApiResponseSetpagelanguage {}
// export interface ApiResponseShortenurl {}

export type ApiResponseSitematrix = {
	count: number;
	specials: ApiResponseSitematrixSite[];
} & {
	[index: string]: {
		code: string;
		name: string;
		site: ApiResponseSitematrixSite[];
		dir: string;
		localname: string;
	};
};
export interface ApiResponseSitematrixSite {
	url: string;
	dbname: string;
	code: string;
	lang?: string;
	sitename: string;
	closed?: boolean;
	fishbowl?: boolean;
	private?: boolean;
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
// export interface ApiResponseUnblock {}
// export interface ApiResponseUndelete {}
// export interface ApiResponseUnlinkaccount {}
// export interface ApiResponseUpload {}
// export interface ApiResponseUserights {}
// export interface ApiResponseValidatepassword {}
// export interface ApiResponseWatch {}
// export interface ApiResponseWebapp_manifest {}
// export interface ApiResponseWebauthn {}
// export interface ApiResponseWikilove {}

// ************************************** action=query **************************************

export interface ApiResponseQuery {

	// ********************** General properties **********************

	badrevids?: {
		[key: string]: {
			revid: number;
			missing: boolean;
		};
	};
	/** Returned when the `titles` parameter value includes titles with interwiki prefixes. */
	interwiki?: {
		title: string;
		iw: string;
	}[];
	normalized?: ApiResponseNormalized[];
	pages?: ApiResponseQueryPages[];
	pageids?: string[]; // TODO: Don't remember where this came from
	protocols?: string[];
	/** `redirects=true` */
	redirects?: {
		from: string;
		to: string;
	}[];
	searchinfo?: { // TODO: Don't remember if this is part of list=search
		totalhits: number;
	};

	// ********************** Meta properties **********************

	allmessages?: ApiResponseQueryMetaAllmessages[];
	// authmanagerinfo: ApiResponseQueryMetaAuthmanagerinfo;
	// babel: ApiResponseQueryMetaBabel;
	// communityconfiguration: ApiResponseQueryMetaCommunityconfiguration;
	// featureusage: ApiResponseQueryMetaFeatureusage;
	// filerepoinfo: ApiResponseQueryMetaFilerepoinfo;
	// globalpreferences: ApiResponseQueryMetaGlobalpreferences;
	// globalrenamestatus: ApiResponseQueryMetaGlobalrenamestatus;
	// globaluserinfo: ApiResponseQueryMetaGlobaluserinfo;
	// languageinfo: ApiResponseQueryMetaLanguageinfo;
	// languagestats: ApiResponseQueryMetaLanguagestats;
	// linterstats: ApiResponseQueryMetaLinterstats;
	// managemessagegroups: ApiResponseQueryMetaManagemessagegroups;
	// messagegroups: ApiResponseQueryMetaMessagegroups;
	// messagegroupstats: ApiResponseQueryMetaMessagegroupstats;
	// messagetranslations: ApiResponseQueryMetaMessagetranslations;
	// notifications: ApiResponseQueryMetaNotifications;

	// meta=siteinfo
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

	// siteviews: ApiResponseQueryMetaSiteviews;
	tokens?: ApiResponseQueryMetaTokens;
	// unreadnotificationpages: ApiResponseQueryMetaUnreadnotificationpages;
	userinfo?: ApiResponseQueryMetaUserinfo;
	// wikibase: ApiResponseQueryMetaWikibase;

	// ********************** List properties **********************

	// abusefilters?: ApiResponseQueryListAbusefilters;
	// abuselog?: ApiResponseQueryListAbuselog;
	// allcategories?: ApiResponseQueryListAllcategories;
	// alldeletedrevisions?: ApiResponseQueryListAlldeletedrevisions;
	// allfileusages?: ApiResponseQueryListAllfileusages;
	// allimages?: ApiResponseQueryListAllimages;
	// alllinks?: ApiResponseQueryListAlllinks;
	// allpages?: ApiResponseQueryListAllpages;
	// allredirects?: ApiResponseQueryListAllredirects;
	// allrevisions?: ApiResponseQueryListAllrevisions;
	// alltransclusions?: ApiResponseQueryListAlltransclusions;
	// allusers?: ApiResponseQueryListAllusers;
	betafeatures?: ApiResponseQueryListBetafeatures;
	backlinks?: ApiResponseQueryListBacklinks[];
	blocks?: ApiResponseQueryListBlocks[];
	categorymembers?: ApiResponseQueryListCategorymembers[];
	// centralnoticeactivecampaigns?: ApiResponseQueryListCentralnoticeactivecampaigns;
	// centralnoticelogs?: ApiResponseQueryListCentralnoticelogs;
	// checkuser?: ApiResponseQueryListCheckuser;
	// checkuserlog?: ApiResponseQueryListCheckuserlog;
	embeddedin?: ApiResponseQueryListEmbeddedin[];
	// extdistrepos?: ApiResponseQueryListExtdistrepos;
	// exturlusage?: ApiResponseQueryListExturlusage;
	// filearchive?: ApiResponseQueryListFilearchive;
	// gadgetcategories?: ApiResponseQueryListGadgetcategories;
	// gadgets?: ApiResponseQueryListGadgets;
	globalallusers?: ApiResponseQueryListGlobalallusers[];
	globalblocks?: ApiResponseQueryListGlobalblocks[];
	// globalgroups?: ApiResponseQueryListGlobalgroups;
	// imageusage?: ApiResponseQueryListImageusage;
	// iwbacklinks?: ApiResponseQueryListIwbacklinks;
	// langbacklinks?: ApiResponseQueryListLangbacklinks;
	// linterrors?: ApiResponseQueryListLinterrors;
	logevents?: ApiResponseQueryListLogevents[];
	// messagecollection?: ApiResponseQueryListMessagecollection;
	// mostviewed?: ApiResponseQueryListMostviewed;
	// mystashedfiles?: ApiResponseQueryListMystashedfiles;
	// pagepropnames?: ApiResponseQueryListPagepropnames;
	// pageswithprop?: ApiResponseQueryListPageswithprop;
	// prefixsearch?: ApiResponseQueryListPrefixsearch;
	// protectedtitles?: ApiResponseQueryListProtectedtitles;
	// querypage?: ApiResponseQueryListQuerypage;
	// random?: ApiResponseQueryListRandom;
	// recentchanges?: ApiResponseQueryListRecentchanges;
	search?: ApiResponseQueryListSearch[];
	// tags?: ApiResponseQueryListTags;
	// threads?: ApiResponseQueryListThreads;
	usercontribs?: ApiResponseQueryListUsercontribs[];
	users?: ApiResponseQueryListUsers[];
	// watchlist?: ApiResponseQueryListWatchlist;
	// watchlistraw?: ApiResponseQueryListWatchlistraw;
	// wblistentityusage?: ApiResponseQueryListWblistentityusage;
	// wikisets?: ApiResponseQueryListWikisets;
}


// ************************************** action=query (general properties) **************************************

export interface ApiResponseQueryPages {

	[key: string]: unknown;

	// prop-independent
	pageid?: number;
	ns: number;
	title: string;
	missing?: boolean;
	invalid?: boolean;
	invalidreason?: string;

	// prop-dependent
	// TODO: Tidy this up
	contentmodel?: string;
	pagelanguage?: string;
	pagelanguagehtmlcode?: string;
	pagelanguagedir?: string;
	touched?: string;
	lastrevid?: number;
	length?: number;
	redirect?: boolean;
	protection?: ApiResponseQueryPagesProtection[];
	restrictiontypes?: string[];
	watched?: boolean;
	watchers?: number;
	visitingwatchers?: number;
	notificationtimestamp?: string;
	talkid?: number;
	associatedpage?: string;
	fullurl?: string;
	editurl?: string;
	canonicalurl?: string;
	readable?: boolean;
	preload?: string;
	displaytitle?: string;
	varianttitles?: {
		[key: string]: string;
	};
	linkclasses?: string[];

	/** prop=revisions */
	revisions?: ApiResponseQueryPagesPropRevisions[];

}

export interface ApiResponseQueryPagesPropRevisions { // Fully checked
	revid?: number;
	parentid?: number;
	minor?: boolean;
	user?: string;
	userid?: number;
	timestamp?: string;
	size?: number;
	sha1?: string;
	roles?: string[];
	slots?: {
		main: { // [slot: string]
			size?: number;
			sha1?: string;
			contentmodel?: string;
			contentformat?: string;
			content?: string;
			badcontentformat?: boolean;
		};
	};
	/** @deprecated Specify the `rvslots` parameter. */
	contentmodel?: string;
	/** @deprecated Use `action=expandtemplates` or `action=parse` instead. */
	parsetree?: string;
	/** @deprecated Specify the `rvslots` parameter. */
	contentformat?: string;
	/** @deprecated Specify the `rvslots` parameter. */
	content?: string;
	comment?: string;
	parsedcomment?: string;
	tags?: string[];
}

export interface ApiResponseQueryPagesProtection { // TODO: Don't remember which prop this is for (prop=info?)
	type: string;
	level: string;
	expiry: string;
}

// ************************************** action=query&meta=something **************************************

// export interface ApiResponseQueryMetaAuthmanagerinfo {}

// ********************** action=query&meta=allmessages **********************

export interface ApiResponseQueryMetaAllmessages { // Fully checked
	name: string;
	normalizedname: string;
	content?: string; // Missing if amnocontent=true or "missing" is true
	missing?: boolean;
}

// export interface ApiResponseQueryMetaBabel {}
// export interface ApiResponseQueryMetaCommunityconfiguration {}
// export interface ApiResponseQueryMetaFeatureusage {}
// export interface ApiResponseQueryMetaFilerepoinfo {}
// export interface ApiResponseQueryMetaGlobalpreferences {}
// export interface ApiResponseQueryMetaGlobalrenamestatus {}
// export interface ApiResponseQueryMetaGlobaluserinfo {}
// export interface ApiResponseQueryMetaLanguageinfo {}
// export interface ApiResponseQueryMetaLanguagestats {}
// export interface ApiResponseQueryMetaLinterstats {}
// export interface ApiResponseQueryMetaManagemessagegroups {}
// export interface ApiResponseQueryMetaMessagegroups {}
// export interface ApiResponseQueryMetaMessagegroupstats {}
// export interface ApiResponseQueryMetaMessagetranslations {}
// export interface ApiResponseQueryMetaNotifications {}

// ********************** action=query&meta=siteinfo **********************

export interface ApiResponseQueryMetaSiteinfoAutocreatetempuser { // Fully checked
	enabled: boolean;
}

export interface ApiResponseQueryMetaSiteinfoDbrepllag { // Fully checked
	host: string;
	lag: number;
}

export interface ApiResponseQueryMetaSiteinfoDefaultoptions { // Fully checked
	[option: string]: number | string | boolean | null;
}

export interface ApiResponseQueryMetaSiteinfoExtensions { // TODO: Checked in detail but incomplete
	type: string;
	name?: string;
	namemsg?: string;
	description?: string;
	descriptionmsg?: string;
	// Not sure about the property below; returned if the (source code level) value keyed with string; is a PHP array,
	// but no module had such an entry in gerrit repos
	// ### descriptionmsgparams?: string[]; ###
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

export type ApiResponseQueryMetaSiteinfoExtensiontags = string; // e.g. <pre> // Fully checked

export interface ApiResponseQueryMetaSiteinfoFileextensions { // Fully checked
	ext: string;
}

export type ApiResponseQueryMetaSiteinfoFunctionhooks = string; // Fully checked

export interface ApiResponseQueryMetaSiteinfoGeneral { // Fully checked (source code level) but incomplete
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
	// externalimages?: // TODO: Complete this
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
	nofollownsexceptions: unknown[]; // TODO: Probably an array of numbers or strings
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

export interface ApiResponseQueryMetaSiteinfoMagicwords {
	name: string;
	aliases: string[];
	'case-sensitive': boolean;
}

export interface ApiResponseQueryMetaSiteinfoNamespacealiases { // Fully checked (source code level)
	id: number;
	alias: string;
}

export interface ApiResponseQueryMetaSiteinfoNamespaces { // Fully checked (source code level)
	[nsId: string]: {
		id: number;
		case: 'first-letter' | 'case-sensitive';
		name: string;
		subpages: boolean;
		canonical?: string;
		content: boolean;
		nonincludable: boolean;
		namespaceprotection?: string;
		defaultcontentmodel?: string;
	};
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

export interface ApiResponseQueryMetaSiteinfoSpecialpagealiases { // Fully checked
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
	fields: {
		description: boolean;
		date: boolean;
		categories: boolean;
	};
	licensemessages: {
		local: string;
		foreign: string;
	};
	comment: string;
	format: {
		filepage: string;
		description: string;
		ownwork: string;
		license: string;
		uncategorized: string;
	};
}

export interface ApiResponseQueryMetaSiteinfoUsergroups { // Fully checked
	name: string;
	rights: string[];
}

export type ApiResponseQueryMetaSiteinfoVariables = string; // Fully checked

// ********************** action=query&meta=siteviews **********************

// export interface ApiResponseQueryMetaSiteviews {}

// ********************** action=query&meta=tokens **********************

export interface ApiResponseQueryMetaTokens { // Fully checked
	createaccounttoken?: string;
	csrftoken?: string;
	deleteglobalaccounttoken?: string;
	logintoken?: string;
	patroltoken?: string;
	rollbacktoken?: string;
	setglobalaccountstatustoken?: string;
	userrightstoken?: string;
	watchtoken?: string;
}

// export interface ApiResponseQueryMetaUnreadnotificationpages {}

// ********************** action=query&meta=userinfo **********************

export interface ApiResponseQueryMetaUserinfo { // Fully checked

	// *********** uiprop-independent properties ***********

	id: number;
	name: string;
	anon?: boolean;

	// *********** uiprop-dependent properties ***********

	// ****** uiprop=blockinfo ******
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
	blockexpiryformatted?: string;
	blockexpiryrelative?: string;

	// ****** uiprop=hasmsg ******
	messages?: boolean;

	// ****** uiprop=groups ******
	groups?: string[];

	// ****** uiprop=groupmemberships ******
	groupmemberships?: {
		group: string;
		expiry: string;
	}[];

	// ****** uiprop=implicitgroups ******
	implicitgroups?: string[];

	// ****** uiprop=rights ******
	rights?: string[];

	// ****** uiprop=changeablegroups ******
	changeablegroups?: {
		add: string[];
		remove: string[];
		'add-self': string[];
		'remove-self': string[];
	};

	// ****** uiprop=options ******
	options?: {
		[key: string]: string | number | boolean | null;
	};

	// ****** uiprop=editcount ******
	editcount?: number;

	// ****** uiprop=ratelimits ******
	ratelimits?: ApiResponseQueryMetaUserinfoRatelimits;

	// ****** uiprop=theoreticalratelimits ******
	theoreticalratelimits?: ApiResponseQueryMetaUserinfoRatelimits;

	// ****** uiprop=email ******
	email?: string;
	emailauthenticated?: string; // ISO timestamp

	// ****** uiprop=realname ******
	realname?: string;

	// ****** uiprop=acceptlang ******
	acceptlang?: {
		q: number;
		code: string;
	}[];

	// ****** uiprop=registrationdate ******
	registrationdate?: string;

	// ****** uiprop=unreadcount ******
	unreadcount?: number | '1000+';

	// ****** uiprop=centralids ******
	centralids?: {
		CentralAuth: number;
		local: number;
	};
	attachedlocal?: {
		CentralAuth: boolean;
		local: boolean;
	};
	attachedwiki?: { // uiprop=centralids&uiattachedwiki=wiki_ID
		CentralAuth: boolean;
		local: boolean;
	};

	// ****** uiprop=latestcontrib ******
	latestcontrib?: string; // ISO timestamp, undefined (no property) for no contribs

	// ****** uiprop=cancreateaccount ******
	cancreateaccount?: boolean;

}
export type ApiResponseQueryMetaUserinfoRatelimits = {
	[action: string]:
		OnlyOneRecord<'anon' | 'user' | 'ip' | 'subnet' | 'newbie', {
			hits: number;
			seconds: number;
		}>;
};

// export interface ApiResponseQueryMetaWikibase {}


// ************************************** action=query&list=something **************************************

// export interface ApiResponseQueryListAbusefilters {}
// export interface ApiResponseQueryListAbuselog {}
// export interface ApiResponseQueryListAllcategories {}
// export interface ApiResponseQueryListAlldeletedrevisions {}
// export interface ApiResponseQueryListAllfileusages {}
// export interface ApiResponseQueryListAllimages {}
// export interface ApiResponseQueryListAlllinks {}
// export interface ApiResponseQueryListAllpages {}
// export interface ApiResponseQueryListAllredirects {}
// export interface ApiResponseQueryListAllrevisions {}
// export interface ApiResponseQueryListAlltransclusions {}
// export interface ApiResponseQueryListAllusers {}

export interface ApiResponseQueryListBacklinks { // TODO: recheck
	pageid: number;
	ns: number;
	title: string;
}

export interface ApiResponseQueryListBetafeatures { // TODO: recheck
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
	/** An empty array if the user is not partial-blocked; otherwise an object. */
	restrictions?: [] | {
		pages?: {
			id: number;
			ns: number;
			title: string;
		}[];
		namespaces?: number[];
		actions?: ('upload' | 'move' | 'create' | 'thanks')[];
	};
}

export interface ApiResponseQueryListCategorymembers { // TODO: recheck
	pageid: number;
	ns: number;
	title: string;
	sortkey?: string;
	sortkeyprefix?: string;
	type?: string;
	timestamp?: string;
}

// export interface ApiResponseQueryListCentralnoticeactivecampaigns {}
// export interface ApiResponseQueryListCentralnoticelogs {}
// export interface ApiResponseQueryListCheckuser {}
// export interface ApiResponseQueryListCheckuserlog {}

export interface ApiResponseQueryListEmbeddedin { // TODO: recheck
	pageid: number;
	ns: number;
	title: string;
}

// export interface ApiResponseQueryListExtdistrepos {}
// export interface ApiResponseQueryListExturlusage {}
// export interface ApiResponseQueryListFilearchive {}
// export interface ApiResponseQueryListGadgetcategories {}
// export interface ApiResponseQueryListGadgets {}

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

// export interface ApiResponseQueryListGlobalgroups {}
// export interface ApiResponseQueryListImageusage {}
// export interface ApiResponseQueryListIwbacklinks {}
// export interface ApiResponseQueryListLangbacklinks {}
// export interface ApiResponseQueryListLinterrors {}

export interface ApiResponseQueryListLogevents { // TODO: recheck
	logid?: number;
	ns?: number;
	title?: string;
	pageid?: number;
	logpage?: number;
	params?: {
		userid?: number;
		curid?: number;
		previd?: number;
		auto?: boolean;
		description?: string;
		cascade?: boolean;
		details?: Array<{
			type: string;
			level: string;
			expiry: string;
			cascade: boolean;
		}>;
		target_ns?: number;
		target_title?: string;
		suppressredirect?: boolean;
		duration?: number | string;
		oldgroups?: string[];
		newgroups?: string[];
		flags?: string[];
		restrictions?: {
			pages?: Array<{
				page_ns: number;
				page_title: string;
			}>;
		};
		sitewide?: boolean;
		url?: string;
		expiry?: string;
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
			content: false;
			comment: false;
			user: false;
			restricted: false
		};
		new?: {
			bitmask: number;
			content: false;
			comment: false;
			user: false;
			restricted: false
		};
		oldmetadata?: Array<{
			group: string;
			expiry: string
		}>;
		newmetadata?: Array<{
			group: string;
			expiry: string
		}>;
	};
	type?: string;
	action?: string;
	user?: string;
	userid?: number;
	timestamp?: string;
	comment?: string;
	parsedcomment?: string;
	tags?: string[];
}

// export interface ApiResponseQueryListMessagecollection {}
// export interface ApiResponseQueryListMostviewed {}
// export interface ApiResponseQueryListMystashedfiles {}
// export interface ApiResponseQueryListPagepropnames {}
// export interface ApiResponseQueryListPageswithprop {}
// export interface ApiResponseQueryListPrefixsearch {}
// export interface ApiResponseQueryListProtectedtitles {}
// export interface ApiResponseQueryListQuerypage {}
// export interface ApiResponseQueryListRandom {}
// export interface ApiResponseQueryListRecentchanges {}

export interface ApiResponseQueryListSearch { // TODO: recheck
	ns: number;
	title: string;
	pageid: number;
	size?: number;
	wordcount?: number;
	snippet?: string;
	timestamp?: string;
	titlesnippet?: string;
	categorysnippet?: string;
	isfilematch?: boolean;
}

// export interface ApiResponseQueryListTags {}
// export interface ApiResponseQueryListThreads {}

export interface ApiResponseQueryListUsercontribs { // TODO: recheck
	userid: number;
	user: string;
	pageid: number;
	revid: number;
	parentid: number;
	ns: number;
	title: string;
	timestamp: string;
	new: boolean;
	minor: boolean;
	top: boolean;
	comment: string;
	parsedcomment: string;
	patrolled: boolean;
	autopatrolled: boolean;
	size: number;
	sizediff: number;
	tags: string[];
}

export interface ApiResponseQueryListUsers { // TODO: recheck
	userid?: number;
	name: string;
	missing?: boolean;
	editcount?: number;
	registration?: string;
	groups?: string[];
	groupmemberships?: {
		group: string;
		expiry: string;
	}[];
	implicitgroups?: string[];
	rights?: string[];
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
	emailable?: boolean;
	gender?: string;
	centralids?: {
		CentralAuth: number;
		local: number;
	},
	attachedlocal?: {
		CentralAuth: boolean;
		local: boolean;
	}
}

// export interface ApiResponseQueryListWatchlist {}
// export interface ApiResponseQueryListWatchlistraw {}
// export interface ApiResponseQueryListWblistentityusage {}
// export interface ApiResponseQueryListWikisets {}