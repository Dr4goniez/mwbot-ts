import { ApiParams as ApiParamsTMW } from 'types-mediawiki/api_params';
import { XOR } from 'ts-xor';

type PartialRecord<K extends keyof any, T> = {
	[P in K]?: T;
};

// Parameter types

/**
 * The API query parameters.
 * @see https://www.mediawiki.org/wiki/API:Main_page
 */
export interface ApiParams extends ApiParamsTMW {

	// Overwrite "action?: string;"
	action?: ApiParamsAction;

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


// Response types

export interface ApiResponse {

	[key: string]: any;

	// General properties

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

	// Action-specific properties

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
	// edit?: ApiResponseEdit;
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
	// purge?: ApiResponsePurge;
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

// General properties

export interface ApiResponseError { // errorformat=bc
	code: string;
	info: string;
	docref?: string;
	details?: any; // script-internal
	[key: string]: any;
}
export type ApiResponseErrors = {
	code: string;
	module: string;
	data?: any[];
	[key: string]: any;
} & XOR<
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

// ************************************** Actions (ApiResponse[Action]) **************************************

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

export interface ApiResponseEdit { // TODO: recheck
	result: string;
	pageid: number;
	title: string;
	contentmodel: string;
	oldrevid: number;
	newrevid: number;
	newtimestamp: string;
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

export interface ApiResponseLogin {
	result: string;
	reason?: string;
	lguserid?: number;
	lgusername?: string;
	/** @deprecated */
	token?: string;
}

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
		byteoffset: number|null;
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

export interface ApiResponsePurge { // TODO: recheck
	ns: number;
	title: string;
	missing?: boolean;
	purged?: boolean;
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

// ************************************** ApiResponseQuery **************************************

export interface ApiResponseQuery {

	// ********************** General properties **********************

	badrevids?: {
		[key: string]: {
			revid: number;
			missing: boolean;
		};
	};
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

	// siteinfo: ApiResponseQueryMetaSiteinfo;
		// autocreatetempuser?: ApiResponseQueryMetaSiteinfoAutocreatetempuser;
		// dbrepllag?: ApiResponseQueryMetaSiteinfoDbrepllag[];
		// defaultoptions?: ApiResponseQueryMetaSiteinfoDefaultoptions;
		// extensions?: ApiResponseQueryMetaSiteinfoExtensions[];
		// extensiontags?: string[];
		// fileextensions?: ApiResponseQueryMetaSiteinfoFileextensions[];
		// functionhooks?: string[];
		// general?: ApiResponseQueryMetaSiteinfoGeneral;
		// interwikimap?: ApiResponseQueryMetaSiteinfoInterwikimap[];
		// languages?: ApiResponseQueryMetaSiteinfoLanguages[];
		// languagevariants?: ApiResponseQueryMetaSiteinfoLanguagevariants;
		// libraries?: ApiResponseQueryMetaSiteinfoLibraries[];
		// magicwords?: ApiResponseQueryMetaSiteinfoMagicwords[];
		// namespacealiases?: ApiResponseQueryMetaSiteinfoNamespacealiases[];
		// namespaces?: ApiResponseQueryMetaSiteinfoNamespaces;
		// restrictions?: ApiResponseQueryMetaSiteinfoRestrictions;
		// rightsinfo?: ApiResponseQueryMetaSiteinfoRightsinfo;
		// showhooks?: ApiResponseQueryMetaSiteinfoShowhooks[];
		// skins?: ApiResponseQueryMetaSiteinfoSkins[];
		// specialpagealiases?: ApiResponseQueryMetaSiteinfoSpecialpagealiases[];
		// statistics?: ApiResponseQueryMetaSiteinfoStatistics;
		// uploaddialog?: ApiResponseQueryMetaSiteinfoUploaddialog;
		// usergroups?: ApiResponseQueryMetaSiteinfoUsergroups[];
		// variables?: string[];

	// siteviews: ApiResponseQueryMetaSiteviews;
	tokens?: ApiResponseQueryMetaTokens;
	// unreadnotificationpages: ApiResponseQueryMetaUnreadnotificationpages;
	// userinfo: ApiResponseQueryMetaUserinfo;
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


// ************************************** ApiResponseQuery (general properties) **************************************

export interface ApiResponseQueryPages {

	// prop-independent
	pageid?: number;
	ns: number;
	title: string;
	missing?: boolean;
	invalid?: boolean;
	invalidreason?: string;

	// prop-dependent
	// TODO: Tidy this up
	revisions?: ApiResponseQueryPagesPropRevisions[];
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

}

export interface ApiResponseQueryPagesPropRevisions {
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

export interface ApiResponseQueryPagesProtection {
	type: string;
	level: string;
	expiry: string;
}

// ************************************** ApiResponseQuery (meta) **************************************

// export interface ApiResponseQueryMetaAuthmanagerinfo {}

export interface ApiResponseQueryMetaAllmessages {
	name: string;
	normalizedname: string;
	content: string;
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
// export interface ApiResponseQueryMetaSiteinfo {}
// export interface ApiResponseQueryMetaSiteviews {}
export interface ApiResponseQueryMetaTokens {
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
export interface ApiResponseQueryMetaUserinfo { // TODO: recheck
	id: number;
	name: string;
	anon?: boolean;
	messages?: boolean;
	groups?: string[];
	groupmemberships?: {
		group: string;
		expiry: string;
	}[];
	implicitgroups?: string[];
	rights?: string[];
	changeablegroups?: {
		add: string[];
		remove: string[];
		'add-self': string[];
		'remove-self': string[];
	},
	options?: {
		[key: string]: string|number|boolean|null;
	};
	editcount?: number;
	ratelimits?: {
		[key: string]: {
			[key: string]: {
				hits: number;
				seconds: number;
			};
		};
	};
	theoreticalratelimits?: {
		[key: string]: {
			[key: string]: {
				hits: number;
				seconds: number;
			};
		};
	};
	email?: string;
	emailauthenticated?: string;
	registrationdate?: string;
	acceptlang?: {
		q: number;
		code: string;
	}[];
	unreadcount?: string;
	centralids?: {
		CentralAuth: number;
		local: number;
	},
	attachedlocal?: {
		CentralAuth: boolean;
		local: boolean;
	},
	attachedwiki?: {
		CentralAuth: boolean;
		local: boolean;
	},
	latestcontrib?: string;
	cancreateaccount?: boolean;
}
// export interface ApiResponseQueryMetaWikibase {}


// ************************************** ApiResponseQuery (list) **************************************

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
export interface ApiResponseQueryListBlocks { // TODO: recheck
	id: number;
	user: string;
	userid?: number;
	by: string;
	byid?: number;
	timestamp: string;
	expiry: string;
	reason: string;
	rangestart?: string;
	rangeend?: string;
	automatic: boolean;
	anononly: boolean;
	nocreate: boolean;
	autoblock: boolean;
	noemail: boolean;
	hidden: boolean;
	allowusertalk: boolean;
	partial: boolean;
	restrictions?: [] | {
		pages?: {
			id: number;
			ns: number;
			title: string;
		}[];
		namespaces?: number[];
		actions?: string[];
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
export interface ApiResponseQueryListGlobalallusers { // TODO: recheck
	id: number;
	name: string;
	/** Array of global user rights. Local rights are not included. */
	groups?: string[];
	/** Empty string if the account exists locally, otherwise the key is undefined. */
	existslocally?: "";
	/** Empty string if the account globally locked, otherwise the key is undefined. */
	locked?: "";
}
export interface ApiResponseQueryListGlobalblocks { // TODO: recheck
	id: string;
	address: string;
	/** Empty string if anononly is enabled, otherwise the key is undefined. */
	anononly?: "";
	by: string;
	bywiki: string;
	timestamp: string;
	expiry: string;
	reason: string;
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
		duration?: number|string;
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
	/** May be `undefined` if the user doesn't exist. */
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