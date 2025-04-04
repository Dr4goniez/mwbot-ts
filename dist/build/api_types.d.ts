/**
 * This module includes interfaces and types for API-related functionality.
 *
 * @module
 */
import { XOR } from 'ts-xor';
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
    [P in K]: (Record<P, V> & Partial<Record<Exclude<K, P>, never>>) extends infer O ? {
        [Q in keyof O]: O[Q];
    } : never;
}[K];
/**
 * The API query parameters.
 * @see https://www.mediawiki.org/wiki/API:Main_page
 */
export interface ApiParams {
    action?: ApiParamsAction;
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
    callback?: string;
    utf8?: boolean;
    ascii?: boolean;
    formatversion?: "1" | "2" | "latest";
    [param: string]: string | number | boolean | string[] | number[] | undefined | Date;
}
export type ApiParamsAction = 'abusefiltercheckmatch' | 'abusefilterchecksyntax' | 'abusefilterevalexpression' | 'abusefilterunblockautopromote' | 'abuselogprivatedetails' | 'acquiretempusername' | 'aggregategroups' | 'antispoof' | 'block' | 'centralauthtoken' | 'centralnoticecdncacheupdatebanner' | 'centralnoticechoicedata' | 'centralnoticequerycampaign' | 'changeauthenticationdata' | 'changecontentmodel' | 'checktoken' | 'cirrus-config-dump' | 'cirrus-mapping-dump' | 'cirrus-profiles-dump' | 'cirrus-settings-dump' | 'clearhasmsg' | 'clientlogin' | 'communityconfigurationedit' | 'compare' | 'createaccount' | 'createlocalaccount' | 'delete' | 'deleteglobalaccount' | 'discussiontoolsedit' | 'discussiontoolsfindcomment' | 'discussiontoolsgetsubscriptions' | 'discussiontoolssubscribe' | 'discussiontoolsthank' | 'echocreateevent' | 'echomarkread' | 'echomarkseen' | 'echomute' | 'edit' | 'editmassmessagelist' | 'emailuser' | 'expandtemplates' | 'featuredfeed' | 'feedcontributions' | 'feedrecentchanges' | 'feedthreads' | 'feedwatchlist' | 'filerevert' | 'flow-parsoid-utils' | 'flow' | 'flowthank' | 'globalblock' | 'globalpreferenceoverrides' | 'globalpreferences' | 'globaluserrights' | 'groupreview' | 'help' | 'imagerotate' | 'import' | 'jsonconfig' | 'languagesearch' | 'linkaccount' | 'login' | 'logout' | 'managetags' | 'markfortranslation' | 'massmessage' | 'mergehistory' | 'move' | 'newslettersubscribe' | 'opensearch' | 'options' | 'paraminfo' | 'parse' | 'patrol' | 'protect' | 'purge' | 'query' | 'removeauthenticationdata' | 'resetpassword' | 'revisiondelete' | 'rollback' | 'rsd' | 'searchtranslations' | 'setglobalaccountstatus' | 'setnotificationtimestamp' | 'setpagelanguage' | 'shortenurl' | 'sitematrix' | 'spamblacklist' | 'streamconfigs' | 'strikevote' | 'tag' | 'templatedata' | 'thank' | 'threadaction' | 'titleblacklist' | 'torblock' | 'transcodereset' | 'translationaids' | 'translationreview' | 'translationstats' | 'ttmserver' | 'unblock' | 'undelete' | 'unlinkaccount' | 'upload' | 'userrights' | 'validatepassword' | 'watch' | 'webapp-manifest' | 'webauthn' | 'wikilove';
export interface ApiEditPageParams extends ApiParams {
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
    contentformat?: "application/json" | "application/octet-stream" | "application/unknown" | "application/x-binary" | "text/css" | "text/javascript" | "text/plain" | "text/unknown" | "text/x-wiki" | "unknown/unknown";
    contentmodel?: "GadgetDefinition" | "JsonSchema" | "MassMessageListContent" | "Scribunto" | "SecurePoll" | "css" | "javascript" | "json" | "sanitized-css" | "text" | "unknown" | "wikitext";
    token?: string;
    returnto?: string;
    returntoquery?: string;
    returntoanchor?: string;
    captchaword?: string;
    captchaid?: string;
}
export interface ApiResponse {
    [key: string]: any;
    batchcomplete?: boolean;
    continue?: {
        [key: string]: string;
    };
    curtimestamp?: string;
    docref?: string;
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
    edit?: ApiResponseEdit;
    login?: ApiResponseLogin;
    paraminfo?: ApiResponseParaminfo;
    parse?: ApiResponseParse;
    purge?: ApiResponsePurge[];
    query?: ApiResponseQuery;
    sitematrix?: ApiResponseSitematrix;
}
export interface ApiResponseError {
    code: string;
    info: string;
    docref?: string;
}
export type ApiResponseErrors = {
    code: string;
    module: string;
    data?: unknown[];
} & XOR<{
    '*': string;
}, // formatversion=1
{
    html: string;
}, // errorformat=html
{
    text: string;
}, // errorformat=wikitext, errorformat=plaintext
{
    key: string;
    params: string[];
}>;
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
    '*'?: string;
    html?: string;
    text?: string;
    key?: string;
    params?: string[];
};
export type ApiResponseWarningsLegacy = PartialRecord<ApiParamsAction, XOR<// errorformat=bc
{
    '*': string;
}, {
    warnings: string;
}>>;
export interface ApiResponseEdit {
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
export interface ApiResponseLogin {
    result: string;
    reason?: string;
    lguserid?: number;
    lgusername?: string;
    /** @deprecated */
    token?: string;
}
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
    description?: string | ApiResponseParaminfoModulesDescription[];
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
    templatedparameters: unknown[];
    dynamicparameters: boolean | string | ApiResponseParaminfoModulesDescription[];
}
export interface ApiResponseParaminfoModulesDescription {
    key: string;
    params: string[];
}
export interface ApiResponseParse {
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
    };
    limitreporthtml: string;
    parsetree: string;
}
export interface ApiResponsePurge {
    title: string;
    ns?: number;
    purged?: true;
    linkupdate?: true;
    invalid?: true;
    invalidreason?: string;
    special?: true;
    missing?: true;
    iw?: string;
}
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
export interface ApiResponseQuery {
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
    pageids?: string[];
    protocols?: string[];
    /** `redirects=true` */
    redirects?: {
        from: string;
        to: string;
    }[];
    searchinfo?: {
        totalhits: number;
    };
    allmessages?: ApiResponseQueryMetaAllmessages[];
    autocreatetempuser?: ApiResponseQueryMetaSiteinfoAutocreatetempuser;
    dbrepllag?: ApiResponseQueryMetaSiteinfoDbrepllag[];
    defaultoptions?: ApiResponseQueryMetaSiteinfoDefaultoptions;
    extensions?: ApiResponseQueryMetaSiteinfoExtensions[];
    extensiontags?: ApiResponseQueryMetaSiteinfoExtensiontags[];
    fileextensions?: ApiResponseQueryMetaSiteinfoFileextensions[];
    functionhooks?: ApiResponseQueryMetaSiteinfoFunctionhooks[];
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
    variables?: ApiResponseQueryMetaSiteinfoVariables[];
    tokens?: ApiResponseQueryMetaTokens;
    userinfo?: ApiResponseQueryMetaUserinfo;
    betafeatures?: ApiResponseQueryListBetafeatures;
    backlinks?: ApiResponseQueryListBacklinks[];
    blocks?: ApiResponseQueryListBlocks[];
    categorymembers?: ApiResponseQueryListCategorymembers[];
    embeddedin?: ApiResponseQueryListEmbeddedin[];
    globalallusers?: ApiResponseQueryListGlobalallusers[];
    globalblocks?: ApiResponseQueryListGlobalblocks[];
    logevents?: ApiResponseQueryListLogevents[];
    search?: ApiResponseQueryListSearch[];
    usercontribs?: ApiResponseQueryListUsercontribs[];
    users?: ApiResponseQueryListUsers[];
}
export interface ApiResponseQueryPages {
    pageid?: number;
    ns: number;
    title: string;
    missing?: boolean;
    invalid?: boolean;
    invalidreason?: string;
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
        main: {
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
export interface ApiResponseQueryMetaAllmessages {
    name: string;
    normalizedname: string;
    content?: string;
    missing?: boolean;
}
export interface ApiResponseQueryMetaSiteinfoAutocreatetempuser {
    enabled: boolean;
}
export interface ApiResponseQueryMetaSiteinfoDbrepllag {
    host: string;
    lag: number;
}
export interface ApiResponseQueryMetaSiteinfoDefaultoptions {
    [option: string]: number | string | boolean | null;
}
export interface ApiResponseQueryMetaSiteinfoExtensions {
    type: string;
    name?: string;
    namemsg?: string;
    description?: string;
    descriptionmsg?: string;
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
export type ApiResponseQueryMetaSiteinfoExtensiontags = string;
export interface ApiResponseQueryMetaSiteinfoFileextensions {
    ext: string;
}
export type ApiResponseQueryMetaSiteinfoFunctionhooks = string;
export interface ApiResponseQueryMetaSiteinfoGeneral {
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
    nofollownsexceptions: unknown[];
    nofollowdomainexceptions: string[];
    externallinktarget: boolean;
    [key: string]: unknown;
}
export interface ApiResponseQueryMetaSiteinfoInterwikimap {
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
export interface ApiResponseQueryMetaSiteinfoLanguages {
    code: string;
    bcp47: string;
    name: string;
}
export interface ApiResponseQueryMetaSiteinfoLanguagevariants {
    [langcode: string]: {
        [langvarcode: string]: {
            fallbacks: string[];
        };
    };
}
export interface ApiResponseQueryMetaSiteinfoLibraries {
    name: string;
    version: string;
}
export interface ApiResponseQueryMetaSiteinfoMagicwords {
    name: string;
    aliases: string[];
    'case-sensitive': boolean;
}
export interface ApiResponseQueryMetaSiteinfoNamespacealiases {
    id: number;
    alias: string;
}
export interface ApiResponseQueryMetaSiteinfoNamespaces {
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
export interface ApiResponseQueryMetaSiteinfoRestrictions {
    types: string[];
    levels: string[];
    cascadinglevels: string[];
    semiprotectedlevels: string[];
}
export interface ApiResponseQueryMetaSiteinfoRightsinfo {
    url: string;
    text: string;
}
export interface ApiResponseQueryMetaSiteinfoShowhooks {
    name: string;
    subscribers: string[];
}
export interface ApiResponseQueryMetaSiteinfoSkins {
    code: string;
    name: string;
    unusable?: true;
    default: true;
}
export interface ApiResponseQueryMetaSiteinfoSpecialpagealiases {
    realname: string;
    aliases: string[];
}
export interface ApiResponseQueryMetaSiteinfoStatistics {
    pages: number;
    articles: number;
    edits: number;
    images: number;
    users: number;
    activeusers: number;
    admins: number;
    jobs: number;
    [key: string]: unknown;
}
export interface ApiResponseQueryMetaSiteinfoUploaddialog {
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
export interface ApiResponseQueryMetaSiteinfoUsergroups {
    name: string;
    rights: string[];
}
export type ApiResponseQueryMetaSiteinfoVariables = string;
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
export interface ApiResponseQueryMetaUserinfo {
    id: number;
    name: string;
    anon?: boolean;
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
    };
    options?: {
        [key: string]: string | number | boolean | null;
    };
    editcount?: number;
    ratelimits?: ApiResponseQueryMetaUserinfoRatelimits;
    theoreticalratelimits?: ApiResponseQueryMetaUserinfoRatelimits;
    email?: string;
    emailauthenticated?: string;
    realname?: string;
    acceptlang?: {
        q: number;
        code: string;
    }[];
    registrationdate?: string;
    unreadcount?: number | '1000+';
    centralids?: {
        CentralAuth: number;
        local: number;
    };
    attachedlocal?: {
        CentralAuth: boolean;
        local: boolean;
    };
    attachedwiki?: {
        CentralAuth: boolean;
        local: boolean;
    };
    latestcontrib?: string;
    cancreateaccount?: boolean;
}
export type ApiResponseQueryMetaUserinfoRatelimits = {
    [action: string]: OnlyOneRecord<'anon' | 'user' | 'ip' | 'subnet' | 'newbie', {
        hits: number;
        seconds: number;
    }>;
};
export interface ApiResponseQueryListBacklinks {
    pageid: number;
    ns: number;
    title: string;
}
export interface ApiResponseQueryListBetafeatures {
    [key: string]: {
        name: string;
        count: number;
    };
}
export interface ApiResponseQueryListBlocks {
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
export interface ApiResponseQueryListCategorymembers {
    pageid: number;
    ns: number;
    title: string;
    sortkey?: string;
    sortkeyprefix?: string;
    type?: string;
    timestamp?: string;
}
export interface ApiResponseQueryListEmbeddedin {
    pageid: number;
    ns: number;
    title: string;
}
export interface ApiResponseQueryListGlobalallusers {
    id: number;
    name: string;
    /** Array of global user rights. Local rights are not included. */
    groups?: string[];
    /** Empty string if the account exists locally, otherwise the key is undefined. */
    existslocally?: "";
    /** Empty string if the account globally locked, otherwise the key is undefined. */
    locked?: "";
}
export interface ApiResponseQueryListGlobalblocks {
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
export interface ApiResponseQueryListLogevents {
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
            restricted: false;
        };
        new?: {
            bitmask: number;
            content: false;
            comment: false;
            user: false;
            restricted: false;
        };
        oldmetadata?: Array<{
            group: string;
            expiry: string;
        }>;
        newmetadata?: Array<{
            group: string;
            expiry: string;
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
export interface ApiResponseQueryListSearch {
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
export interface ApiResponseQueryListUsercontribs {
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
export interface ApiResponseQueryListUsers {
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
    };
    attachedlocal?: {
        CentralAuth: boolean;
        local: boolean;
    };
}
//# sourceMappingURL=api_types.d.ts.map