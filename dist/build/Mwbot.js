"use strict";
/**
 * The core module of `mwbot-ts`.
 *
 * ### Credits
 *
 * Portions of this module are adapted from the following:
 *
 * * `mediawiki.api` module in MediaWiki core (GNU General Public License v2)
 * 	* {@link https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/37c52ab4105e9b6573e3931ea87ae684f4e1c417/resources/src/mediawiki.api/index.js | mediawiki.api}
 *
 * * npm package `mwbot` (MIT License)
 * 	* {@link https://github.com/gesinn-it-pub/mwbot/blob/2113a704da0cd6555943ced228cb9df0fd19bba6/src/index.js | mwbot}
 *
 * * npm package `mwn` (GNU Lesser General Public License v3)
 * 	* {@link https://github.com/siddharthvp/mwn/blob/870ddd153b189144e7c7ea28b58721cdc458c327/src/bot.ts | mwn (bot.ts)}
 * 	* {@link https://github.com/siddharthvp/mwn/blob/870ddd153b189144e7c7ea28b58721cdc458c327/src/core.ts | mwn (core.ts)}
 *
 * * npm package `types-mediawiki` (GNU General Public License v3)
 * 	* {@link https://github.com/wikimedia-gadgets/types-mediawiki/blob/e833739c0f685e9deb3d666b0f9419e4122a170b/mw/Map.d.ts | types-mediawiki}
 *
 * @module
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mwbot = void 0;
const axios_1 = __importDefault(require("axios"));
const tough_cookie_1 = require("tough-cookie");
const axios_cookiejar_support_1 = require("axios-cookiejar-support");
(0, axios_cookiejar_support_1.wrapper)(axios_1.default);
const form_data_1 = __importDefault(require("form-data"));
const oauth_1_0a_1 = __importDefault(require("oauth-1.0a"));
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const version_1 = require("./version");
const MwbotError_1 = require("./MwbotError");
const Util = __importStar(require("./Util"));
const { mergeDeep, isPlainObject, sleep, isEmptyObject, arraysEqual, deepCloneInstance } = Util;
const mwString = __importStar(require("./String"));
const Title_1 = require("./Title");
const Template_1 = require("./Template");
const Wikilink_1 = require("./Wikilink");
const Wikitext_1 = require("./Wikitext");
/**
 * TODO: Add a doc comment here
 */
class Mwbot {
    // ****************************** CLASS PROPERTIES ******************************
    /**
     * The default configurations for HTTP requests.
     *
     * ```js
     * {
     *	  method: 'GET',
     *	  headers: {
     *	    'User-Agent': `mwbot-ts/${MWBOT_VERSION} (https://github.com/Dr4goniez/mwbot-ts)`,
     *	    'Content-Type': 'application/x-www-form-urlencoded',
     *	    'Accept-Encoding': 'gzip'
     *	  },
     *	  params: {
     *	    action: 'query',
     *	    format: 'json',
     *	    formatversion: '2',
     *	    maxlag: 5
     *	  },
     *	  timeout: 60 * 1000, // 60 seconds
     *	  responseType: 'json',
     *	  responseEncoding: 'utf8'
     * }
     * ```
     */
    static get defaultRequestOptions() {
        return {
            method: 'GET',
            headers: {
                'User-Agent': `mwbot-ts/${version_1.MWBOT_VERSION} (https://github.com/Dr4goniez/mwbot-ts)`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept-Encoding': 'gzip'
            },
            params: {
                action: 'query',
                format: 'json',
                formatversion: '2',
                maxlag: 5
            },
            timeout: 60 * 1000, // 60 seconds
            responseType: 'json',
            responseEncoding: 'utf8'
        };
    }
    /**
     * See {@link MwbotOptions.intervalActions}.
     */
    static get defaultIntervalActions() {
        return ['edit', 'move', 'upload'];
    }
    /**
     * `Util` library with convenient functions.
     */
    static get Util() {
        return Util;
    }
    /**
     * `String` library with functions to manipulate strings.
     */
    static get String() {
        return mwString;
    }
    /**
     * Returns (a deep copy of) the site and user information fetched by {@link init}.
     */
    get info() {
        this.checkInit();
        return mergeDeep(this._info);
    }
    /**
     * Title class for this instance.
     */
    get Title() {
        this.checkInit();
        return this._Title;
    }
    /**
     * Template class for this instance.
     */
    get Template() {
        this.checkInit();
        return this._Template;
    }
    /**
     * ParserFunction class for this instance.
     */
    get ParserFunction() {
        this.checkInit();
        return this._ParserFunction;
    }
    /**
     * Wikilink class for this instance.
     */
    get Wikilink() {
        this.checkInit();
        return this._Wikilink;
    }
    /**
     * FileWikilink class for this instance.
     */
    get FileWikilink() {
        this.checkInit();
        return this._FileWikilink;
    }
    /**
     * RawWikilink class for this instance.
     */
    get RawWikilink() {
        this.checkInit();
        return this._RawWikilink;
    }
    /**
     * Wikitext class for this instance.
     */
    get Wikitext() {
        this.checkInit();
        return this._Wikitext;
    }
    // ****************************** CONSTRUCTOR-RELATED METHODS ******************************
    /**
     * Creates a `Mwbot` instance. **{@link init} must subsequently be called for initialization.**
     *
     * **Example:**
     * ```ts
     * import { Mwbot, MwbotInitOptions } from 'mwbot-ts';
     *
     * const initOptions: MwbotInitOptions = {
     *   apiUrl: 'https://en.wikipedia.org/w/api.php',
     *   userAgent: 'MyCoolBot/1.0.0 (https://github.com/Foo/MyCoolBot)',
     *   credentials: {
     *     oAuth2AccessToken: '...'
     *   }
     * };
     *
     * (async () => {
     *   const mwbot = await new Mwbot(initOptions).init();
     *   // Do something here and below...
     * })();
     * ```
     *
     * @param mwbotInitOptions Configuration object containing initialization settings and user credentials.
     * @param requestOptions Custom request options applied to all HTTP requests issued by the new instance.
     * @throws {MwbotError} If no valid API endpoint is provided or if the user credentials are malformed.
     */
    constructor(mwbotInitOptions, requestOptions = {}) {
        // ****************************** SITE-RELATED CONFIG ******************************
        /**
         * Stores configuration values for the site and user.
         */
        this.configData = Object.create(null);
        /**
         * The `wg`-keys of {@link ConfigData}, used in {@link config} to verify their existence.
         */
        this.configKeys = [
            'wgArticlePath',
            'wgCaseSensitiveNamespaces',
            'wgContentLanguage',
            'wgContentNamespaces',
            'wgDBname',
            // 'wgExtraSignatureNamespaces',
            'wgFormattedNamespaces',
            // 'wgGlobalGroups',
            'wgLegalTitleChars',
            'wgNamespaceIds',
            'wgScript',
            'wgScriptPath',
            'wgServer',
            'wgServerName',
            'wgSiteName',
            // 'wgUserEditCount',
            // 'wgUserGroups',
            'wgUserId',
            'wgUserName',
            'wgUserRights',
            'wgVersion',
            'wgWikiID'
        ];
        const { credentials, ...options } = mergeDeep(mwbotInitOptions);
        requestOptions = mergeDeep(requestOptions);
        // Ensure that a valid URL is provided
        requestOptions.url = requestOptions.url || options.apiUrl;
        if (!requestOptions.url) {
            throw new MwbotError_1.MwbotError('fatal', {
                code: 'nourl',
                info: 'No valid API endpoint is provided.'
            });
        }
        // Determine authentication type
        this.credentials = Mwbot.validateCredentials(credentials);
        this.jar = new tough_cookie_1.CookieJar();
        // Set up the User-Agent header if provided
        if (typeof options.userAgent === 'string') {
            requestOptions.headers = requestOptions.headers || {};
            requestOptions.headers['User-Agent'] = options.userAgent;
        }
        // Initialize other class properties
        this.initialized = false;
        this.userMwbotOptions = options;
        this.userRequestOptions = requestOptions;
        this.abortions = [];
        this.tokens = {};
        this.uuid = {};
        this.lastRequestTime = null;
        this._info = Object.create(null);
        this._Title = Object.create(null);
        this._Template = Object.create(null);
        this._ParserFunction = Object.create(null);
        this._Wikilink = Object.create(null);
        this._FileWikilink = Object.create(null);
        this._RawWikilink = Object.create(null);
        this._Wikitext = Object.create(null);
    }
    /**
     * Validates user credentials and determines the authentication type.
     *
     * @param credentials The credentials object provided by the user.
     * @returns Validated credentials.
     * @throws {MwbotError} If the credentials format is incorrect, or if unexpected keys are present.
     */
    static validateCredentials(credentials) {
        if (!isPlainObject(credentials)) {
            throw new MwbotError_1.MwbotError('fatal', {
                code: 'typemismatch',
                info: 'Credentials must be provided as an object.'
            });
        }
        const keys = Object.keys(credentials);
        switch (keys.length) {
            case 1: {
                const { anonymous, oAuth2AccessToken } = credentials;
                if (anonymous === true) {
                    return {
                        anonymous: true
                    };
                }
                if (typeof oAuth2AccessToken === 'string') {
                    return {
                        oauth2: oAuth2AccessToken
                    };
                }
                throw new MwbotError_1.MwbotError('fatal', {
                    code: 'invalidcreds',
                    info: `Unexpected value for "${keys[0]}".`
                });
            }
            case 2: {
                const { username, password } = credentials;
                if (typeof username === 'string' && typeof password === 'string') {
                    return {
                        user: {
                            username,
                            password
                        }
                    };
                }
                throw new MwbotError_1.MwbotError('fatal', {
                    code: 'invalidcreds',
                    info: 'Invalid types for username or password.'
                });
            }
            case 4: {
                const { consumerToken, consumerSecret, accessToken, accessSecret } = credentials;
                if (typeof consumerToken === 'string' &&
                    typeof consumerSecret === 'string' &&
                    typeof accessToken === 'string' &&
                    typeof accessSecret === 'string') {
                    const instance = new oauth_1_0a_1.default({
                        consumer: { key: consumerToken, secret: consumerSecret },
                        signature_method: 'HMAC-SHA1', // TODO: Make it compatible with the RSA-SHA1 authentication method?
                        hash_function(baseString, key) {
                            return crypto_1.default.createHmac('sha1', key).update(baseString).digest('base64');
                        }
                    });
                    return {
                        oauth1: {
                            instance,
                            accessToken,
                            accessSecret
                        }
                    };
                }
                throw new MwbotError_1.MwbotError('fatal', {
                    code: 'invalidcreds',
                    info: 'Invalid OAuth credentials.'
                });
            }
            default:
                throw new MwbotError_1.MwbotError('fatal', {
                    code: 'invalidcreds',
                    info: `Invalid credential properties: ${keys.join(', ')}`
                });
        }
    }
    /**
     * Updates the bot options stored in the instance.
     *
     * @param options The new options to apply.
     * @param merge Whether to merge `options` with the existing ones (default: `true`).
     *
     * If `false`, all current settings are cleared before applying `options`, ***except*** for the required
     * {@link MwbotOptions.apiUrl | apiUrl} property. While `apiUrl` can be updated if provided in `options`,
     * doing so is discouraged since a `Mwbot` instance is initialized with site-specific data based on the URL.
     * Instead, consider creating a new instance with a different URL.
     *
     * @returns The current instance for chaining.
     * @throws If the resulting options lack an `apiUrl` property.
     */
    setMwbotOptions(options, merge = true) {
        if (merge) {
            this.userMwbotOptions = mergeDeep(this.userMwbotOptions, options);
        }
        else {
            const { apiUrl } = this.userMwbotOptions;
            this.userMwbotOptions = mergeDeep({ apiUrl }, options);
        }
        if (!this.userMwbotOptions.apiUrl) {
            throw new MwbotError_1.MwbotError('fatal', {
                code: 'nourl',
                info: '"apiUrl" must be retained.'
            });
        }
        return this;
    }
    /**
     * Updates the default request options stored in the instance.
     *
     * @param options The options to apply.
     * @param merge Whether to merge `options` with the existing ones (default: `true`).
     *
     * If `false`, the current settings are cleared before applying `options`.
     *
     * @returns The current instance for chaining.
     */
    setRequestOptions(options, merge = true) {
        if (merge) {
            this.userRequestOptions = mergeDeep(this.userRequestOptions, options);
        }
        else {
            this.userRequestOptions = mergeDeep(options);
        }
        return this;
    }
    /**
     * Initializes the `Mwbot` instance to make all functionalities ready.
     *
     * @returns A Promise resolving to the current instance, or rejecting with an error.
     */
    init() {
        return this._init(1);
    }
    /**
     * Internal handler for instance initialization.
     *
     * @param attemptIndex The number of times we have attempted initialization, including the current attempt.
     * On a certain type of failure, a retry is attempted once (i.e., when this index is less than or equal to `2`).
     * @returns A Promise resolving to the current instance, or rejecting with an error.
     */
    async _init(attemptIndex) {
        const retryIfPossible = async (error, index) => {
            if (index < 2) {
                console.log(error);
                console.log('Mwbot.init failed. Retrying once again in 5 seconds...');
                await sleep(5000);
                return this._init(index + 1);
            }
            else {
                throw error;
            }
        };
        // Log in if necessary
        if (this.credentials.user) {
            const { username, password } = this.credentials.user;
            await this.login(username, password);
        }
        // Get user and site info
        const res = await this.get({
            action: 'query',
            format: 'json',
            formatversion: '2',
            meta: 'userinfo|siteinfo',
            uiprop: 'rights',
            siprop: 'functionhooks|general|magicwords|interwikimap|namespaces|namespacealiases',
            maxlag: void 0
        });
        // NOTE: interwikimap is built-in since MW v1.44 but was initially an extension
        const { userinfo, functionhooks, general, magicwords, interwikimap = [], namespaces, namespacealiases } = res.query || {};
        if (!res || !res.query ||
            !userinfo || !functionhooks || !general || !magicwords || !namespaces || !namespacealiases) {
            const error = new MwbotError_1.MwbotError('api_mwbot', {
                code: 'empty',
                info: 'OK response but empty result (check HTTP headers?)'
            });
            return retryIfPossible(error, attemptIndex);
        }
        else if (userinfo.anon && !this.isAnonymous()) {
            const error = new MwbotError_1.MwbotError('api_mwbot', {
                code: 'badauth',
                info: 'Failed to authenticate the client as a registered user.'
            });
            return retryIfPossible(error, attemptIndex);
        }
        // Initialize mwbot.config
        const failedKeys = this.initConfigData(userinfo, general, namespaces, namespacealiases);
        if (failedKeys.length) {
            // Ensure that all the dependent config values are fetched successfully
            const error = new MwbotError_1.MwbotError('api_mwbot', {
                code: 'badvars',
                info: 'Failed to initialize wg-variables.'
            }, { keys: failedKeys });
            return retryIfPossible(error, attemptIndex);
        }
        // Set up instance properties
        this.initialized = true; // This substitution must be done HERE (Mwbot.info and other getters call checkInit in them)
        const config = this.config;
        this._info = {
            functionhooks,
            general,
            magicwords,
            interwikimap,
            namespaces,
            namespacealiases,
            user: userinfo
        };
        this._Title = (0, Title_1.TitleFactory)(
        // Pass individual properties instead of the instance to avoid redundant deep copies
        // from getter functions, improving efficiency in the factory function
        config, this._info);
        const { Template, ParsedTemplate, RawTemplate, ParserFunction, ParsedParserFunction } = (0, Template_1.TemplateFactory)(config, this._info, this._Title);
        this._ParserFunction = ParserFunction;
        this._Template = Template;
        const { Wikilink, ParsedWikilink, FileWikilink, ParsedFileWikilink, RawWikilink, ParsedRawWikilink } = (0, Wikilink_1.WikilinkFactory)(config, this._Title);
        this._Wikilink = Wikilink;
        this._FileWikilink = FileWikilink;
        this._RawWikilink = RawWikilink;
        this._Wikitext = (0, Wikitext_1.WikitextFactory)(this, ParsedTemplate, RawTemplate, ParsedParserFunction, ParsedWikilink, ParsedFileWikilink, ParsedRawWikilink);
        console.log('Connection established: ' + config.get('wgServerName'));
        return this;
    }
    /**
     * Throws an error if the instance is not initialized.
     */
    checkInit() {
        if (!this.initialized) {
            throw new MwbotError_1.MwbotError('fatal', {
                code: 'callinit',
                info: 'The instance must be initialized before performing this action.'
            });
        }
    }
    /**
     * Returns the user's API limit for multi-value requests.
     *
     * @returns `500` for users with the `apihighlimits` permission; otherwise, `50`.
     */
    get apilimit() {
        this.checkInit();
        return this._info.user.rights.includes('apihighlimits') ? 500 : 50;
    }
    /**
     * Provides access to site and user configuration data.
     *
     * `mwbot.config` functions similarly to
     * {@link https://www.mediawiki.org/wiki/ResourceLoader/Core_modules#mediaWiki.config | mw.config}
     * from MediaWiki core, *except*:
     * * `mwbot.config` does not return a Map-like object like `mw.config` does. Instead, it returns
     * an object with the methods `get`, `set`, and `exists`.
     * * `mwbot.config.set` prevents built-in `wg`-variables from being overwritten. (See {@link ConfigData}
     * for a list of such variables.)
     *
     * ```typescript
     * get(selection?: string | string[], fallback = null): Mixed;
     * ```
     * * If `selection` is a string, returns the corresponding value.
     * * If `selection` is an array, returns an object mapping each key to its value.
     * * If no `selection` is provided, returns a new object containing all key-value pairs.
     * * If a key does not exist, `fallback` is returned. This also applies when `selection`
     * is an array: missing keys will be mapped to `fallback` in the returned object.
     * * An explicit `undefined` for `fallback` results in `null` (unlike the native `mw.config`).
     *
     * ```typescript
     * set(selection?: string | object, value?: any): boolean;
     * ```
     * * If `selection` is a string, `value` must be provided. The key-value pair will be set accordingly.
     * * If `selection` is an object, each key-value pair will be set.
     * * Built-in `wg`-variables cannot be modified ― attempting to do so always returns `false`.
     * * Returns `true` if at least one property is successfully set.
     * * If `value` is `undefined`, the key is not set.
     *
     * ```typescript
     * exists(selection: string): boolean;
     * ```
     * * Returns `true` if `selection` exists as a key with a defined value.
     */
    get config() {
        this.checkInit();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        return {
            get: function (configName, fallback) {
                const data = mergeDeep(_this.configData); // Deep copy
                if (!configName) {
                    return data;
                }
                else if (Array.isArray(configName)) {
                    const ret = Object.create(null);
                    for (const key of configName) {
                        if (key in data) {
                            ret[key] = data[key];
                        }
                        else {
                            ret[key] = fallback === undefined ? null : fallback;
                        }
                    }
                    return ret;
                }
                else if (String(configName) in data) {
                    return data[configName];
                }
                else {
                    return fallback === undefined ? null : fallback;
                }
            },
            set: (selection, value) => {
                const warn = (variable) => {
                    console.warn(`Warning: The pre-set wg-configuration variables are read-only (detected an attempt to update "${variable}").`);
                };
                if (typeof selection === 'string' && this.configKeys.includes(selection)) {
                    warn(selection);
                    return false;
                }
                else if (typeof selection === 'string' && value !== void 0) {
                    this.configData[selection] = value;
                    return true;
                }
                else if (isEmptyObject(selection) === false) {
                    let registered = 0;
                    const wgVars = [];
                    for (const [k, v] of Object.entries(selection)) {
                        if (this.configKeys.includes(k)) {
                            wgVars.push(k);
                        }
                        else if (v !== void 0) {
                            this.configData[k] = v;
                            registered++;
                        }
                    }
                    if (wgVars.length) {
                        warn(wgVars.join(', '));
                    }
                    return !!registered;
                }
                return false;
            },
            exists: (selection) => {
                return selection in this.configData;
            }
        };
    }
    /**
     * Initializes the configuration values with site and user data.
     *
     * @param userinfo
     * @param general
     * @param namespaces
     * @param namespacealiases
     * @returns An array of `wg`-keys that failed to be initialized.
     */
    initConfigData(userinfo, general, namespaces, namespacealiases) {
        /**
         * Helper function to set a value to a configuration key.
         *
         * @param configName The key to update.
         * @param configValue The value to assign. If `undefined`, the function returns `false`.
         * @returns If successful, returns `false`; otherwise, the key name. (This allows filtering failed assignments easily.)
         */
        const set = (configName, configValue) => {
            if (configValue !== void 0) {
                this.configData[configName] = configValue;
                return false;
            }
            return configName;
        };
        // Deal with data that need to be formatted
        const wgCaseSensitiveNamespaces = [];
        const wgContentNamespaces = [];
        const wgFormattedNamespaces = {};
        const wgNamespaceIds = namespacealiases.reduce((acc, { id, alias }) => {
            acc[alias.toLowerCase().replace(/ /g, '_')] = id;
            return acc;
        }, {});
        for (const nsId in namespaces) {
            const obj = namespaces[nsId];
            if (obj.case === 'case-sensitive') {
                wgCaseSensitiveNamespaces.push(parseInt(nsId));
            }
            else if (obj.content) {
                wgContentNamespaces.push(parseInt(nsId));
            }
            wgFormattedNamespaces[nsId] = obj.name;
            const nsName = obj.name.toLowerCase().replace(/ /g, '_');
            const nsNameCanoninal = typeof obj.canonical === 'string'
                ? obj.canonical.toLowerCase().replace(/ /g, '_')
                : null;
            wgNamespaceIds[nsName] = obj.id;
            if (nsNameCanoninal !== null && nsNameCanoninal !== nsName) {
                wgNamespaceIds[nsNameCanoninal] = obj.id;
            }
        }
        // Set values
        const valSetMap = [
            set('wgArticlePath', general.articlepath),
            set('wgCaseSensitiveNamespaces', wgCaseSensitiveNamespaces),
            set('wgContentLanguage', general.lang),
            set('wgContentNamespaces', wgContentNamespaces),
            set('wgDBname', general.wikiid),
            // set('wgExtraSignatureNamespaces', ),
            set('wgFormattedNamespaces', wgFormattedNamespaces),
            // set('wgGlobalGroups', ),
            set('wgLegalTitleChars', general.legaltitlechars),
            set('wgNamespaceIds', wgNamespaceIds),
            set('wgScript', general.script),
            set('wgScriptPath', general.scriptpath),
            set('wgServer', general.server),
            set('wgServerName', general.servername),
            set('wgSiteName', general.sitename),
            // set('wgUserEditCount', userinfo.editcount),
            // set('wgUserGroups', userinfo.groups),
            set('wgUserId', userinfo.id),
            set('wgUserName', userinfo.name),
            set('wgUserRights', userinfo.rights),
            set('wgVersion', general.generator.replace(/^MediaWiki /, '')),
            set('wgWikiID', general.wikiid)
        ];
        // Log any failures
        return valSetMap.filter(val => val !== false);
    }
    // ****************************** CORE REQUEST METHODS ******************************
    /**
     * Performs a raw HTTP request.
     *
     * **NOTE**: This method does ***not*** reference any instance-specific settings.
     *
     * @param requestOptions The complete user-defined HTTP request options.
     * @returns The raw Axios response of the HTTP request.
     */
    rawRequest(requestOptions) {
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        // Add an AbortController to make it possible to abort this request later
        if (!requestOptions.disableAbort) {
            const controller = new AbortController();
            requestOptions.signal = controller.signal;
            this.abortions.push(controller);
        }
        // Make an HTTP request
        return (0, axios_1.default)(requestOptions);
    }
    /**
     * Performs an HTTP request to the MediaWiki API.
     *
     * @param parameters Parameters to the API.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    async request(parameters, requestOptions = {}) {
        // Preprocess the request options
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        requestOptions = mergeDeep(Mwbot.defaultRequestOptions, this.userRequestOptions, requestOptions);
        requestOptions.params = mergeDeep(requestOptions.params, parameters);
        const hasLongFields = this.preprocessParameters(requestOptions.params);
        if (requestOptions.params.format !== 'json') {
            throw new MwbotError_1.MwbotError('api_mwbot', {
                code: 'invalidformat',
                info: 'Expected "format=json" in request parameters.'
            });
        }
        requestOptions.url = this.userMwbotOptions.apiUrl || requestOptions.url;
        requestOptions.headers = requestOptions.headers || {};
        requestOptions.headers['User-Agent'] = this.userMwbotOptions.userAgent || requestOptions.headers['User-Agent'];
        // Preprocess the request method
        const method = String(requestOptions.method).toUpperCase();
        if (method === 'POST') {
            await this.handlePost(requestOptions, hasLongFields); // Encode params to data
        }
        else if (method !== 'GET') {
            requestOptions.method = 'GET';
        }
        this.applyAuthentication(requestOptions);
        return this._request(requestOptions);
    }
    /**
     * Performs a raw HTTP request to the MediaWiki API.
     *
     * This method assumes that the request body has been fully processed, meaning all necessary parameters have been formatted,
     * validated, and encoded as required by the API.
     *
     * @param requestOptions The finalized HTTP request options, ready for transmission.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    async _request(requestOptions) {
        var _a, _b;
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        const clonedParams = { ...requestOptions.params };
        if (requestOptions.method === 'POST') {
            // The API throws a "mustpostparams" error if it finds certain parameters in "params", even when "data"
            // in the request body is well-formed
            delete requestOptions.params;
        }
        // Track the request using a UUID
        const xReq = 'X-Request-ID';
        let requestId = requestOptions.headers[xReq];
        if (typeof requestId === 'string') {
            this.uuid[requestId]++;
        }
        else {
            requestId = (0, uuid_1.v4)();
            requestOptions.headers[xReq] = requestId;
            this.uuid[requestId] = 1;
        }
        // Enforce an interval if necessary
        const { interval, intervalActions = Mwbot.defaultIntervalActions } = this.userMwbotOptions;
        const requiresInterval = intervalActions.includes(clonedParams.action || '');
        if (requiresInterval && this.lastRequestTime && (interval === void 0 || +interval > 0)) {
            const sleepDuration = (typeof interval === 'number' ? interval : 4800) - (Date.now() - this.lastRequestTime);
            await sleep(sleepDuration); // sleep clamps negative values automatically
        }
        // Make the request and process the response
        const response = await this.rawRequest(requestOptions).catch(async (error) => {
            var _a, _b;
            const err = new MwbotError_1.MwbotError('api_mwbot', {
                code: 'http',
                info: 'HTTP request failed.'
            });
            if (error && error.code === 'ERR_CANCELED') {
                return this.error(err.setCode('aborted').setInfo('Request aborted by the user.'), requestId);
            }
            const status = (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) !== null && _b !== void 0 ? _b : error === null || error === void 0 ? void 0 : error.status;
            if (typeof status === 'number' && status >= 400) {
                // Articulate the error object for common errors
                switch (status) {
                    case 404:
                        return this.error(err.setCode('notfound').setInfo(`Page not found (404): ${requestOptions.url}.`), requestId);
                    case 408:
                        return await this.retry(err.setCode('timeout').setInfo('Request timeout (408).'), requestId, requestOptions);
                    case 414:
                        return this.error(err.setCode('baduri').setInfo('URI too long (414): Consider using a POST request.'), requestId);
                    case 429:
                        return await this.retry(err.setCode('ratelimited').setInfo('Too many requests (429).'), requestId, requestOptions);
                    case 500:
                        return await this.retry(err.setCode('servererror').setInfo('Internal server error (500).'), requestId, requestOptions);
                    case 502:
                        return await this.retry(err.setCode('badgateway').setInfo('Bad gateway (502): Perhaps the server is down?'), requestId, requestOptions);
                    case 503:
                        return await this.retry(err.setCode('serviceunavailable').setInfo('Service Unavailable (503): Perhaps the server is down?'), requestId, requestOptions);
                    case 504:
                        return await this.retry(err.setCode('timeout').setInfo('Gateway timeout (504)'), requestId, requestOptions);
                }
            }
            err.data = { axios: error }; // Include the full response for unknown errors
            return this.error(err, requestId);
        });
        const data = response.data;
        // Show warnings only for the first request because retries use the same request body
        if (this.uuid[requestId] === 1) {
            this.showWarnings(data === null || data === void 0 ? void 0 : data.warnings);
        }
        if (!data) {
            const err = new MwbotError_1.MwbotError('api_mwbot', {
                code: 'empty',
                info: 'OK response but empty result (check HTTP headers?)'
            });
            return this.error(err, requestId);
        }
        if (typeof data !== 'object') {
            // In most cases the raw HTML of [[Main page]]
            const err = new MwbotError_1.MwbotError('api_mwbot', {
                code: 'invalidjson',
                info: 'No valid JSON response (check the request URL?)'
            });
            return this.error(err, requestId);
        }
        if ('error' in data || 'errors' in data) {
            const err = MwbotError_1.MwbotError.newFromResponse(data);
            // Handle error codes
            if (err.code === 'missingparam' && this.isAnonymous() && err.info.includes('The "token" parameter must be set')) {
                return this.errorAnonymous(requestId);
            }
            if (!requestOptions.disableRetryAPI) {
                // Handle retries
                switch (err.code) {
                    case 'badtoken':
                    case 'notoken':
                        if (this.isAnonymous()) {
                            return this.errorAnonymous(requestId);
                        }
                        if (clonedParams.action && !((_a = requestOptions.disableRetryByCode) === null || _a === void 0 ? void 0 : _a.includes(clonedParams.action))) {
                            const tokenType = await this.getTokenType(clonedParams.action); // Identify the required token type
                            if (!tokenType) {
                                return this.error(err, requestId);
                            }
                            console.warn(`Warning: Encountered a "${err.code}" error.`);
                            this.badToken(tokenType);
                            delete clonedParams.token;
                            return await this.retry(err, requestId, requestOptions, 2, 0, () => {
                                // Clear the request ID because postWithToken issues a new one
                                delete this.uuid[requestId];
                                return this.postWithToken(tokenType, clonedParams);
                            });
                        }
                        break;
                    case 'readonly':
                        console.warn(`Warning: Encountered a "${err.code}" error.`);
                        return await this.retry(err, requestId, requestOptions, 3, 10);
                    case 'maxlag': {
                        console.warn(`Warning: Encountered a "${err.code}" error.`);
                        const retryAfter = parseInt((_b = response === null || response === void 0 ? void 0 : response.headers) === null || _b === void 0 ? void 0 : _b['retry-after']) || 5;
                        return await this.retry(err, requestId, requestOptions, 4, retryAfter);
                    }
                    case 'mwoauth-invalid-authorization':
                        // Per https://phabricator.wikimedia.org/T106066, "Nonce already used" indicates
                        // an upstream memcached/redis failure which is transient
                        if (err.info.includes('Nonce already used')) {
                            return await this.retry(err, requestId, requestOptions, 2, 10);
                        }
                }
            }
            return this.error(err, requestId);
        }
        if (requiresInterval) {
            // Save the current time for intervals as needed
            this.lastRequestTime = Date.now();
        }
        delete this.uuid[requestId];
        return data;
    }
    /**
     * Massages parameters from the nice format we accept into a format suitable for the API.
     *
     * @param parameters (modified in-place)
     * @returns A boolean indicating whether the parameters have a long field.
     */
    preprocessParameters(parameters) {
        let hasLongFields = false;
        Object.entries(parameters).forEach(([key, val]) => {
            if (Array.isArray(val)) {
                // Multi-value fields must be stringified
                if (!val.join('').includes('|')) {
                    parameters[key] = val.join('|');
                }
                else {
                    parameters[key] = '\x1f' + val.join('\x1f');
                }
            }
            else if (val === false || val === undefined) {
                // Boolean values are only false when not given at all
                delete parameters[key];
            }
            else if (val === true) {
                // Boolean values cause error with multipart/form-data requests
                parameters[key] = '1';
            }
            else if (val instanceof Date) {
                parameters[key] = val.toISOString();
            }
            else if (String(val).length > 8000) {
                hasLongFields = true;
            }
        });
        return hasLongFields;
    }
    /**
     * Handles data encoding for POST requests (calls {@link handlePostMultipartFormData} for `multipart/form-data`).
     *
     * @param requestOptions The HTTP request options to modify.
     * @param hasLongFields A boolean indicating whether the parameters have a long field.
     */
    async handlePost(requestOptions, hasLongFields) {
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        // Ensure the token parameter is last (per [[mw:API:Edit#Token]])
        // The token will be kept away if the user is anonymous
        const { params } = requestOptions;
        const token = params.token;
        if (token) {
            delete params.token;
        }
        // Non-write API requests should be processed in the closest data center
        /** @see https://www.mediawiki.org/wiki/API:Etiquette#Other_notes */
        requestOptions.headers = requestOptions.headers || {};
        if (params.action === 'query' || params.action === 'parse') {
            requestOptions.headers['Promise-Non-Write-API-Action'] = true;
        }
        // Encode params
        if (hasLongFields) {
            /** @see https://www.mediawiki.org/wiki/API:Edit#Large_edits */
            requestOptions.headers['Content-Type'] = 'multipart/form-data';
        }
        if (requestOptions.headers['Content-Type'] === 'multipart/form-data') {
            await this.handlePostMultipartFormData(requestOptions, token);
        }
        else {
            // Use application/x-www-form-urlencoded (default)
            requestOptions.data = new URLSearchParams(params);
            if (token && !this.isAnonymous()) {
                requestOptions.data.append('token', token);
            }
        }
    }
    /**
     * Handles POST requests with `multipart/form-data` encoding.
     *
     * - Converts `params` into a `FormData` object.
     * - Supports file uploads if `params` contain an object with a `stream` property.
     *
     * @param requestOptions The HTTP request options to modify.
     * @param token Optional token for authentication.
     */
    async handlePostMultipartFormData(requestOptions, token) {
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        const { params } = requestOptions;
        const form = new form_data_1.default();
        for (const [key, val] of Object.entries(params)) {
            if (val instanceof Object && 'stream' in val) {
                //@ts-expect-error Property 'name' does not exist?
                form.append(key, val.stream, val.name);
            }
            else {
                form.append(key, val);
            }
        }
        if (token && !this.isAnonymous()) {
            form.append('token', token);
        }
        requestOptions.data = form;
        requestOptions.headers = await new Promise((resolve, reject) => {
            form.getLength((err, length) => {
                if (err) {
                    reject(err);
                }
                resolve({
                    ...requestOptions.headers,
                    ...form.getHeaders(),
                    'Content-Length': length,
                });
            });
        });
    }
    /**
     * Applies authentication to the request config.
     *
     * - Adds an `Authorization` header if OAuth is used.
     * - Sets `jar` and `withCredentials` for cookie-based authentication otherwise.
     *
     * NOTE: `url` and `method` must be set beforehand.
     *
     * @param requestOptions
     */
    applyAuthentication(requestOptions) {
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        if (!requestOptions.headers) {
            requestOptions.headers = {};
        }
        const { oauth2, oauth1 } = this.credentials;
        if (oauth2) {
            // OAuth 2.0
            requestOptions.headers.Authorization = `Bearer ${oauth2}`;
        }
        else if (oauth1) {
            // OAuth 1.0a
            if (!requestOptions.url || !requestOptions.method) {
                throw new TypeError('[Internal] "url" and "method" must be set before applying authentication.');
            }
            Object.assign(requestOptions.headers, oauth1.instance.toHeader(oauth1.instance.authorize({
                url: requestOptions.url,
                method: requestOptions.method,
                data: requestOptions.data instanceof form_data_1.default ? {} : requestOptions.params
            }, {
                key: oauth1.accessToken,
                secret: oauth1.accessSecret
            })));
        }
        else {
            // Cookie-based authentication
            requestOptions.jar = this.jar;
            requestOptions.withCredentials = true;
        }
    }
    /**
     * Checks whether the instance has been initialized for an anonymous user.
     *
     * @returns A boolean indicating whether the instance was initialized for an anonymous user.
     */
    isAnonymous() {
        return !!this.credentials.anonymous;
    }
    /**
     * Logs warnings returned from the API to the console unless suppressed.
     *
     * @param warnings Warnings returned by the API, if any.
     */
    showWarnings(warnings) {
        if (!warnings || this.userMwbotOptions.suppressWarnings) {
            return;
        }
        if (Array.isArray(warnings)) {
            // Newer error formats
            for (const { module, ...obj } of warnings) {
                const msg = obj['*'] || // formatversion=1
                    obj.html || // errorformat=html
                    obj.text; // errorformat=wikitext/plaintext
                if (msg) {
                    console.log(`[Warning]: ${module}: ${msg}`);
                }
            }
        }
        else {
            // Older error format (errorformat=bc)
            for (const [module, obj] of Object.entries(warnings)) {
                const msg = (obj === null || obj === void 0 ? void 0 : obj['*']) || (obj === null || obj === void 0 ? void 0 : obj.warnings);
                if (msg) {
                    console.log(`[Warning]: ${module}: ${msg}`);
                }
            }
        }
    }
    /**
     * Throws a {@link MwbotError} by normalizing various error objects.
     *
     * If `base` is an API response containing an error, it is converted into
     * an {@link MwbotError} instance.
     *
     * If `base` is already an instance of {@link MwbotError}, it is thrown as is.
     *
     * If a request UUID is provided, its entry in {@link uuid} is cleared.
     *
     * @param base An error object, which can be:
     * - An API response containing an `error` or `errors` property.
     * - An existing {@link MwbotError} instance, in which case it is thrown as is.
     *
     * @param requestId The UUID of the request to be removed from {@link uuid}.
     * If provided, the corresponding entry is deleted before processing `base`.
     *
     * @throws
     */
    error(base, requestId) {
        if (requestId) {
            delete this.uuid[requestId];
        }
        if (base instanceof MwbotError_1.MwbotError) {
            throw base;
        }
        else {
            throw MwbotError_1.MwbotError.newFromResponse(base);
        }
    }
    /**
     * Throws a `mwbot_api_anonymous` error.
     *
     * @param requestId If provided, the relevant entry in {@link uuid} is cleared.
     * @throws
     */
    errorAnonymous(requestId) {
        if (requestId) {
            delete this.uuid[requestId];
        }
        throw new MwbotError_1.MwbotError('api_mwbot', {
            code: 'anonymous',
            info: 'Anonymous users are limited to non-write requests.'
        });
    }
    /**
     * Attempts to retry a failed request under the following conditions:
     * - The number of requests issued so far (tracked with {@link uuid}) is less than the allowed maximum (`maxAttempts`).
     * - {@link MwbotRequestConfig.disableRetry} is not set to `true`.
     * - {@link MwbotRequestConfig.disableRetryByCode} is either unset or does not contain the error code from `initialError`.
     *
     * Note: {@link MwbotRequestConfig.disableRetryAPI} must be evaluated in the `then` block of {@link request}, rather than here.
     *
     * @param initialError The error that triggered the retry attempt.
     * @param requestId The UUID of the request being retried.
     * @param requestOptions The original request options, using which we make another request.
     * @param maxAttempts The maximum number of attempts (including the first request). Default is 2 (one retry after failure).
     * @param sleepSeconds The delay in seconds before retrying. Default is 10.
     * @param retryCallback A function to execute when attempting the retry. If not provided, {@link _request} is called on `requestOptions`.
     * @returns A Promise of the retry request, or rejecting with an error.
     */
    async retry(initialError, requestId, requestOptions, maxAttempts = 2, sleepSeconds = 10, retryCallback) {
        delete requestOptions._cloned;
        const attemptedCount = this.uuid[requestId] || 0; // Should never fall back to 0 but just in case
        const { disableRetry, disableRetryByCode } = requestOptions;
        const shouldRetry = attemptedCount < maxAttempts &&
            !disableRetry &&
            (!disableRetryByCode || !disableRetryByCode.includes(initialError.code));
        // Check if we should retry the request
        if (shouldRetry) {
            console.log(initialError);
            if (sleepSeconds) {
                console.log(`Retrying in ${sleepSeconds} seconds...`);
            }
            else {
                console.log('Retrying...');
            }
            await sleep(sleepSeconds * 1000);
            if (typeof retryCallback === 'function') {
                return retryCallback(); // TODO: Delete the request ID from uuid here?
            }
            else {
                return this._request(requestOptions);
            }
        }
        // If retry conditions aren't met, reject with the error
        return this.error(initialError, requestId);
    }
    /**
     * Aborts all unfinished HTTP requests issued by this instance.
     */
    abort() {
        this.abortions.forEach((controller) => {
            if (controller) {
                controller.abort();
            }
        });
        this.abortions = [];
        return this;
    }
    /**
     * Performs an HTTP GET request to the MediaWiki API.
     *
     * @param parameters Parameters to the API.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    get(parameters, requestOptions = {}) {
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        requestOptions.method = 'GET';
        return this.request(parameters, requestOptions);
    }
    /**
     * Performs an HTTP POST request to the MediaWiki API.
     *
     * @param parameters Parameters to the API.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    post(parameters, requestOptions = {}) {
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        requestOptions.method = 'POST';
        return this.request(parameters, requestOptions);
    }
    /**
     * Performs an HTTP POST request to the MediaWiki API to **fetch data**. This method should only be used
     * to circumvent a `414 URI too long` error; otherwise, use {@link get}.
     *
     * Per {@link https://www.mediawiki.org/wiki/API:Etiquette#Other_notes | mw:API:Etiquette#Other_notes},
     * `Promise-Non-Write-API-Action: true` will be set to the request headers automatically.
     *
     * @param parameters Parameters to the API.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    nonwritePost(parameters, requestOptions = {}) {
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        requestOptions.method = 'POST';
        requestOptions.headers = requestOptions.headers || {};
        requestOptions.headers['Promise-Non-Write-API-Action'] = true;
        return this.request(parameters, requestOptions);
    }
    /**
     * Performs an API request that automatically continues until the limit is reached.
     *
     * This method is designed for API calls that include a `continue` property in the response.
     *
     * **Usage Note:** If applicable, ensure the API parameters include a `**limit` value set to `'max'`
     * to retrieve the maximum number of results per request.
     *
     * @param parameters Parameters to the API.
     * @param limit The maximum number of continuation. (Default: `10`)
     * @param rejectProof
     * By default, this method rejects the Promise if any internal API request fails, discarding all previously
     * retrieved responses. When set to `true`, it instead resolves with the incomplete responses merged into
     * one object, while logging the error to the console.
     *
     * NOTE: If the first request fails, the returned response object may be empty.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to a merged API response, or rejecting with an error.
     */
    async continuedRequest(parameters, limit = 10, rejectProof = false, requestOptions = {}) {
        const ret = [];
        const query = (params, count) => {
            return this.get(params, requestOptions).then((res) => {
                ret.push(res);
                if (res.continue && count < limit) {
                    return query(Object.assign({}, res.continue, params), ++count);
                }
            });
        };
        if (rejectProof) {
            await query(parameters, 1).catch(console.error);
        }
        else {
            await query(parameters, 1);
        }
        const flattened = ret.reduce((acc, obj) => mergeDeep(acc, obj), Object.create(null));
        if (ret[ret.length - 1] && !ret[ret.length - 1].continue) {
            // Delete the continue property if the last response doesn't have it
            delete flattened.continue;
        }
        return flattened;
    }
    /**
     * Performs API requests with a multi-value field that is subject to the apilimit, processing multiple requests
     * in parallel if necessary.
     *
     * For example:
     * ```ts
     * {
     *   action: 'query',
     *   titles: 'A|B|C|D|...', // This parameter is subject to the apilimit of 500 or 50
     *   formatversion: '2'
     * }
     * ```
     * Pass the multi-value field as an array, and this method will automatically split it based on the
     * user's apilimit (`500` for bots, `50` otherwise). The key(s) of the multi-value field(s) must be passed
     * as the second parameter.
     *
     * @param parameters Parameters to the API, including multi-value fields.
     * @param keys The key(s) of the multi-value field(s) to split (e.g., `titles`).
     * @param batchSize
     * The number of elements of the multi-value field to query per request. Defaults to `500` for bots and `50` for others.
     * @param requestOptions Optional HTTP request options.
     * @returns
     * A Promise resolving to an array of API responses or {@link MwbotError} objects for failed requests.
     * The array will be empty if the multi-value field is empty.
     */
    async massRequest(parameters, keys, batchSize, requestOptions = {}) {
        const apilimit = this.apilimit;
        if (batchSize !== undefined) {
            if (!Number.isInteger(batchSize) || batchSize > apilimit || batchSize <= 0) {
                throw new MwbotError_1.MwbotError('fatal', {
                    code: 'invalidsize',
                    info: `"batchSize" must be a positive integer less than or equal to ${apilimit}.`
                });
            }
        }
        else {
            batchSize = apilimit;
        }
        // Ensure "keys" is an array
        keys = Array.isArray(keys) ? keys : [keys];
        if (!keys.length) {
            throw new MwbotError_1.MwbotError('fatal', {
                code: 'emptykeys',
                info: '"keys" cannot be an empty array.'
            });
        }
        // Extract multi-value field
        let batchValues = null;
        for (const key of keys) {
            const value = parameters[key];
            if (value !== undefined) {
                if (!Array.isArray(value)) {
                    throw new MwbotError_1.MwbotError('fatal', {
                        code: 'typemismatch',
                        info: `The multi-value fields (${keys.join(', ')}) must be arrays.`
                    });
                }
                if (batchValues === null) {
                    batchValues = [...value]; // Copy the array
                }
                else if (!arraysEqual(batchValues, value, true)) {
                    throw new MwbotError_1.MwbotError('fatal', {
                        code: 'fieldmismatch',
                        info: 'All multi-value fields must be identical.'
                    });
                }
            }
        }
        if (!batchValues) {
            throw new MwbotError_1.MwbotError('fatal', {
                code: 'nofields',
                info: 'No multi-value fields have been found.'
            });
        }
        else if (!batchValues.length) {
            return [];
        }
        // Prepare API batches
        const batchParams = [];
        for (let i = 0; i < batchValues.length; i += batchSize) {
            const batchArrayStr = batchValues.slice(i, i + batchSize).join('|');
            batchParams.push({
                ...parameters,
                ...Object.fromEntries(keys.map((key) => [key, batchArrayStr]))
            });
        }
        // Send API requests in batches of 100
        const results = [];
        for (let i = 0; i < batchParams.length; i += 100) {
            const batch = batchParams.slice(i, i + 100).map((params) => this.nonwritePost(params, requestOptions).catch((err) => err));
            const batchResults = await Promise.all(batch);
            results.push(...batchResults);
        }
        return results;
    }
    // ****************************** TOKEN-RELATED METHODS ******************************
    /**
     * Performs a POST request to the MediaWiki API using a token of the specified type.
     *
     * This method retrieves a token automatically, before performing the request.
     * If a cached token exists, it is used first; if the request fails due to an invalid token
     * (`badtoken`), the token cache is cleared, and a retry is attempted.
     *
     * Example usage:
     * ```typescript
     * mwbot.postWithToken('csrf', {
     *   action: 'options',
     *   optionname: 'gender',
     *   optionvalue: 'female'
     * });
     * ```
     *
     * @param tokenType The type of token to use (e.g., `csrf`).
     * @param parameters Parameters to the API.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    async postWithToken(tokenType, parameters, requestOptions = {}) {
        if (this.isAnonymous()) {
            return this.errorAnonymous();
        }
        const assertParams = {
            assert: parameters.assert,
            assertuser: parameters.assertuser
        };
        parameters.token = await this.getToken(tokenType, assertParams);
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        requestOptions.disableRetryByCode = ['badtoken'];
        const err = await this.post(parameters, mergeDeep(requestOptions)).catch((err) => err);
        if (!(err instanceof Error)) {
            return err; // Success
        }
        // Error handler
        if (err.code === 'badtoken') {
            this.badToken(tokenType);
            // Try again, once
            parameters.token = await this.getToken(tokenType, assertParams);
            return this.post(parameters, requestOptions);
        }
        throw err;
    }
    /**
     * Retrieves a token of the specified type from the API.
     *
     * If a cached token is available, it is returned immediately. Otherwise, an API request is made to fetch a new token.
     *
     * @param tokenType The type of token to retrieve (e.g., `csrf`).
     * @param additionalParams Additional API parameters. If a string is provided, it is treated as the `assert` parameter.
     * @param requestOptions Optional HTTP request options.
     * @returns The retrieved token. If the request fails, a rejected Promise with a {@link MwbotError} object is returned.
     */
    async getToken(tokenType, additionalParams, requestOptions = {}) {
        // Check for a cached token
        tokenType = Mwbot.mapLegacyToken(tokenType);
        const tokenName = `${tokenType}token`;
        const cashedToken = this.tokens[tokenName];
        if (cashedToken) {
            return cashedToken;
        }
        // Send an API request
        if (typeof additionalParams === 'string') {
            additionalParams = { assert: additionalParams };
        }
        const params = Object.assign({
            action: 'query',
            meta: 'tokens',
            type: '*',
            format: 'json',
            formatversion: '2'
        }, additionalParams);
        return this.get(params, requestOptions).then((res) => {
            var _a;
            const resToken = (_a = res.query) === null || _a === void 0 ? void 0 : _a.tokens;
            if (resToken && isEmptyObject(resToken) === false) {
                this.tokens = resToken; // Update cashed tokens
                const token = resToken[tokenName];
                if (token) {
                    return token;
                }
                else {
                    throw new MwbotError_1.MwbotError('api_mwbot', {
                        code: 'badnamedtoken',
                        info: 'Could not find a token named "' + tokenType + '" (check for typos?)'
                    });
                }
            }
            else {
                throw new MwbotError_1.MwbotError('api_mwbot', {
                    code: 'empty',
                    info: 'OK response but empty result.'
                });
            }
        });
    }
    /**
     * Converts legacy token types to `csrf`.
     *
     * @param action
     * @returns
     */
    static mapLegacyToken(action) {
        const csrfActions = [
            'edit',
            'delete',
            'protect',
            'move',
            'block',
            'unblock',
            'email',
            'import',
            'options'
        ];
        if (csrfActions.includes(action)) {
            return 'csrf';
        }
        return action;
    }
    /**
     * Marks a cached token of the specified type as invalid.
     *
     * @param tokenType The type of token to invalidate (e.g., `csrf`).
     * @returns The current instance for chaining.
     */
    badToken(tokenType) {
        tokenType = Mwbot.mapLegacyToken(tokenType);
        const tokenName = `${tokenType}token`;
        if (this.tokens[tokenName]) {
            delete this.tokens[tokenName];
        }
        return this;
    }
    /**
     * Gets type of token to be used with an API action.
     *
     * @param action The API's `action` parameter value.
     * @returns A Promise resolving to the token type as a string, or `null` on failure.
     *
     * *This method never rejects*.
     */
    getTokenType(action) {
        return this.get({
            action: 'paraminfo',
            modules: action,
            maxlag: void 0
        }, {
            disableRetryByCode: ['badtoken']
        }).then((res) => {
            var _a;
            const paramObj = (_a = res.paraminfo) === null || _a === void 0 ? void 0 : _a.modules[0].parameters.find((p) => p.name === 'token');
            return paramObj && paramObj.tokentype || null;
        }).catch(() => null);
    }
    /**
     * Performs a POST request to the MediaWiki API using a CSRF token.
     *
     * This is a shorthand method of {@link postWithToken}.
     *
     * @param parameters Parameters to the API.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    postWithCsrfToken(parameters, requestOptions = {}) {
        return this.postWithToken('csrf', parameters, requestOptions);
    }
    /**
     * Retrieves a csrf token from the API.
     *
     * This is a shorthand method of {@link getToken}.
     *
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to a CSRF token or rejecting with an error.
     */
    getCsrfToken(requestOptions = {}) {
        return this.getToken('csrf', void 0, requestOptions);
    }
    // ****************************** EDIT-RELATED REQUEST METHODS ******************************
    /**
     * Validates and processes a title before editing, and returns a {@link Title} instance.
     * If any validation fails, this method throws an {@link MwbotError}.
     * @param title The page title, either as a string or a {@link Title} instance.
     * @param allowAnonymous Whether to allow anonymous users to proceed. Defaults to `false`.
     * @returns A {@link Title} instance.
     * @throws If:
     * - The user is anonymous while `allowAnonymous` is `false`.
     * - The title is neither a string nor a {@link Title} instance.
     * - The title is empty.
     * - The title is interwiki.
     */
    prepEdit(title, allowAnonymous = false) {
        if (this.isAnonymous() && !allowAnonymous) {
            return this.errorAnonymous();
        }
        if (typeof title !== 'string' && !(title instanceof this.Title)) {
            throw new MwbotError_1.MwbotError('fatal', {
                code: 'typemismatch',
                info: `"${typeof title}" is not a valid type.`
            });
        }
        if (!(title instanceof this.Title)) {
            const t = this.Title.newFromText(title);
            if (!t) {
                throw new MwbotError_1.MwbotError('api_mwbot', {
                    code: 'invalidtitle',
                    info: `"${title}" is not a valid title.`
                });
            }
            title = t;
        }
        if (!title.getMain()) {
            throw new MwbotError_1.MwbotError('api_mwbot', {
                code: 'emptytitle',
                info: 'The title is empty.'
            });
        }
        if (title.isExternal()) {
            throw new MwbotError_1.MwbotError('api_mwbot', {
                code: 'interwikititle',
                info: `"${title.getPrefixedText()}" is an interwiki title.`
            });
        }
        return title;
    }
    /**
     * Sends an `action=edit` request.
     *
     * @param title
     * @param content
     * @param summary
     * @param internalOptions
     * @param additionalParams
     * @param requestOptions
     * @returns
     */
    async _save(title, content, summary, internalOptions = {}, additionalParams = {}, requestOptions = {}) {
        var _a;
        const params = Object.assign({
            action: 'edit',
            title: title.getPrefixedDb(),
            text: content,
            summary,
            bot: true,
            format: 'json',
            formatversion: '2'
        }, internalOptions, additionalParams);
        const res = await this.postWithCsrfToken(params, requestOptions);
        if (((_a = res.edit) === null || _a === void 0 ? void 0 : _a.result) === 'Success') {
            return res.edit;
        }
        throw new MwbotError_1.MwbotError('api_mwbot', {
            code: 'editfailed',
            info: 'Edit failed.'
        }, { response: res });
    }
    /**
     * Creates a new page with the given content.
     *
     * - To save a content to an (existing) page, use {@link save} instead.
     * - To edit an existing page using a transformation predicate, use {@link edit} instead.
     *
     * Default parameters:
     * ```js
     * {
     *   action: 'edit',
     *   title: title,
     *   text: content,
     *   summary: summary,
     *   bot: true,
     *   createonly: true,
     *   format: 'json',
     *   formatversion: '2'
     *   // `token` is automatically appended
     * }
     * ```
     *
     * @param title The new page title, either as a string or a {@link Title} instance.
     * @param content The text content of the new page.
     * @param summary An optional edit summary.
     * @param additionalParams Additional parameters for the API request. These can be used to
     * overwrite the default parameters.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to {@link ApiResponseEditSuccess} or rejecting with {@link MwbotError}.
     */
    async create(title, content, summary, additionalParams = {}, requestOptions = {}) {
        return this._save(this.prepEdit(title), content, summary, { createonly: true }, additionalParams, requestOptions);
    }
    /**
     * Saves the given content to a page.
     *
     * - To create a new page, use {@link create} instead.
     * - To edit an existing page using a transformation predicate, use {@link edit} instead.
     *
     * Default parameters:
     * ```js
     * {
     *   action: 'edit',
     *   title: title,
     *   text: content,
     *   summary: summary,
     *   bot: true,
     *   nocreate: true,
     *   format: 'json',
     *   formatversion: '2'
     *   // `token` is automatically appended
     * }
     * ```
     *
     * @param title The page title, either as a string or a {@link Title} instance.
     * @param content The text content of the page.
     * @param summary An optional edit summary.
     * @param additionalParams Additional parameters for the API request. These can be used to
     * overwrite the default parameters.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with {@link MwbotError}.
     */
    async save(title, content, summary, additionalParams = {}, requestOptions = {}) {
        return this._save(this.prepEdit(title), content, summary, { nocreate: true }, additionalParams, requestOptions);
    }
    async read(titles, requestOptions = {}) {
        var _a, _b, _c;
        const titlesTemp = Array.isArray(titles) ? titles : [titles];
        /**
         * The result array, initialized with the same length as `titlesTemp`.
         * Each index in this array corresponds to an index in `titlesTemp` to maintain order.
         */
        const ret = [
            // Spread undefined because Array.prototype.reduce skips empty slots
            // TODO: Remove this spreader if we remove the undefined checker at the bottom of this method
            ...Array(titlesTemp.length)
        ];
        /**
         * Maps canonicalized page titles to their corresponding indexes in `ret`.
         * This ensures correct mapping even if duplicate titles exist in `titlesTemp`.
         */
        const titleMap = Object.create(null);
        /**
         * A chunked list of title batches for API requests. This is used when we need to map
         * one error response to multiple titles.
         */
        const multiValues = [];
        /**
         * The limit is 50 for `rvprop=content`.
         */
        const apilimit = 50;
        // Pre-process and validate titles
        let errCount = 0;
        for (let i = 0; i < titlesTemp.length; i++) {
            try {
                const validatedTitle = this.prepEdit(titlesTemp[i], true);
                // Canonicalize all titles as in the API response and remember the array index
                const page = validatedTitle.getPrefixedText();
                titleMap[page] = titleMap[page] || [];
                titleMap[page].push(i);
                if (!multiValues.length || multiValues[multiValues.length - 1].length === apilimit) {
                    multiValues.push([]);
                }
                multiValues[multiValues.length - 1].push(page);
            }
            catch (err) {
                // Store errors immediately in the corresponding index
                ret[i] = err;
                errCount++;
            }
        }
        // If all titles are invalid, return early without making API requests
        if (Array.isArray(titles) && errCount === titles.length) {
            return ret;
        }
        else if (!Array.isArray(titles) && errCount === 1) {
            if (ret[0] instanceof MwbotError_1.MwbotError) {
                throw ret[0];
            }
            else {
                throw new Error('[Internal] Unexpected error.');
            }
        }
        // Set a twice-as-long timeout because content-fetching is time-consuming
        if (!requestOptions._cloned) {
            requestOptions = mergeDeep(requestOptions);
            requestOptions._cloned = true;
        }
        if (typeof requestOptions.timeout !== 'number') {
            requestOptions.timeout = 120 * 1000; // 120 seconds
        }
        // Perform batch API requests
        const responses = await this.massRequest({
            action: 'query',
            titles: multiValues.flat(),
            prop: 'revisions',
            rvprop: 'ids|timestamp|user|content',
            rvslots: 'main',
            rvlimit: apilimit,
            curtimestamp: true,
            formatversion: '2'
        }, 'titles', apilimit, requestOptions);
        // Process the response
        for (let batchIndex = 0; batchIndex < responses.length; batchIndex++) {
            const res = responses[batchIndex];
            if (res instanceof MwbotError_1.MwbotError) {
                setToAll(res, batchIndex);
                continue;
            }
            const resPages = (_a = res.query) === null || _a === void 0 ? void 0 : _a.pages;
            if (!resPages) {
                const err = new MwbotError_1.MwbotError('api_mwbot', {
                    code: 'empty',
                    info: 'OK response but empty result.'
                });
                setToAll(err, batchIndex);
                continue;
            }
            for (const pageObj of resPages) {
                const resRevision = (_b = pageObj.revisions) === null || _b === void 0 ? void 0 : _b[0];
                let value;
                if (typeof pageObj.pageid !== 'number' || pageObj.missing) {
                    value = new MwbotError_1.MwbotError('api_mwbot', {
                        code: 'pagemissing',
                        info: 'The requested page does not exist.'
                    }, {
                        title: pageObj.title
                    });
                }
                else if (!resRevision ||
                    typeof resRevision.revid !== 'number' ||
                    typeof res.curtimestamp !== 'string' ||
                    !resRevision.timestamp ||
                    typeof ((_c = resRevision.slots) === null || _c === void 0 ? void 0 : _c.main.content) !== 'string') {
                    value = new MwbotError_1.MwbotError('api_mwbot', {
                        code: 'empty',
                        info: 'OK response but empty result.'
                    }, {
                        title: pageObj.title
                    });
                }
                else {
                    value = {
                        pageid: pageObj.pageid,
                        ns: pageObj.ns,
                        title: pageObj.title,
                        baserevid: resRevision.revid,
                        user: resRevision.user, // Could be missing if revdel'd
                        basetimestamp: resRevision.timestamp,
                        starttimestamp: res.curtimestamp,
                        content: resRevision.slots.main.content
                    };
                }
                setToTitle(value, pageObj.title);
            }
        }
        // At this point there shouldn't be any empty slots in `ret`
        const emptyIndexes = ret.reduce((acc, el, i) => {
            if (!el) {
                acc.push(i);
            }
            return acc;
        }, []);
        if (emptyIndexes.length) {
            throw new Error(`[Internal] \`ret\` has empty slots at index ${emptyIndexes.join(', ')}.`);
        }
        if (Array.isArray(titles)) {
            return ret;
        }
        else {
            if (ret[0] instanceof Error) {
                throw ret[0];
            }
            else {
                return ret[0];
            }
        }
        function setToAll(error, batchIndex) {
            multiValues[batchIndex].forEach((title) => {
                titleMap[title].forEach((retIndex, i) => {
                    // Ensure pass-by-value as in JSON outputs
                    ret[retIndex] = i === 0 ? error : deepCloneInstance(error);
                });
            });
        }
        function setToTitle(value, title) {
            titleMap[title].forEach((retIndex, i) => {
                if (i === 0) {
                    ret[retIndex] = value;
                }
                else if (value instanceof MwbotError_1.MwbotError) {
                    ret[retIndex] = deepCloneInstance(value);
                }
                else {
                    ret[retIndex] = Object.assign({}, value);
                }
            });
        }
    }
    /**
     * Edits an existing page by first fetching its latest revision and applying a transformation
     * function to modify its content.
     *
     * This method automatically handles edit conflicts up to 3 times.
     *
     * Default parameters (into which the return value of `transform` is merged):
     * ```js
     * {
     *   action: 'edit',
     *   title: revision.title, // Erased if "pageid" is provided
     *   bot: true,
     *   baserevid: revision.baserevid,
     *   basetimestamp: revision.basetimestamp,
     *   starttimestamp: revision.starttimestamp,
     *   nocreate: true,
     *   format: 'json',
     *   formatversion: '2'
     *   // `token` is automatically appended
     * }
     * ```
     *
     * @param title The page title, either as a string or a {@link Title} instance.
     * @param transform See {@link TransformationPredicate} for details.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to an {@link ApiResponse} or rejecting with an error object.
     */
    async edit(title, transform, requestOptions = {}, 
    /** @private */
    retry = 0) {
        var _a;
        if (typeof transform !== 'function') {
            throw new MwbotError_1.MwbotError('fatal', {
                code: 'typemismatch',
                info: `Expected a function for "transform", but got ${typeof transform}.`
            });
        }
        const revision = await this.read(title, mergeDeep(requestOptions, { _cloned: true }));
        const unresolvedParams = transform(new this.Wikitext(revision.content), { ...revision });
        let params = unresolvedParams instanceof Promise
            ? await unresolvedParams
            : unresolvedParams;
        if (params === null) {
            throw new MwbotError_1.MwbotError('api_mwbot', {
                code: 'aborted',
                info: 'Edit aborted by the user.'
            });
        }
        if (!isPlainObject(params)) {
            throw new MwbotError_1.MwbotError('fatal', {
                code: 'typemismatch',
                info: 'The transformation predicate must resolve to a plain object.'
            }, { transformed: params });
        }
        const defaultParams = {
            action: 'edit',
            title: revision.title,
            bot: true,
            baserevid: revision.baserevid,
            basetimestamp: revision.basetimestamp,
            starttimestamp: revision.starttimestamp,
            nocreate: true,
            format: 'json',
            formatversion: '2'
        };
        if (typeof params.pageid === 'number') {
            delete defaultParams.title; // Mutually exclusive
        }
        params = Object.assign(defaultParams, params);
        // Not using _save() here because it's complicated to destructure the user-defined params
        const result = await this.postWithCsrfToken(params, mergeDeep(requestOptions, { _cloned: true })).catch((err) => err);
        const { disableRetry, disableRetryAPI, disableRetryByCode = [] } = requestOptions;
        if (result instanceof MwbotError_1.MwbotError && result.code === 'editconflict' &&
            typeof retry === 'number' && retry < 3 &&
            !disableRetry && !disableRetryAPI &&
            !disableRetryByCode.some((code) => code === 'editconflict')) {
            console.warn('Warning: Encountered an edit conflict.');
            console.log('Retrying in 5 seconds...');
            await sleep(5000);
            return await this.edit(title, transform, mergeDeep(requestOptions, { _cloned: true }), ++retry);
        }
        if (result instanceof Error) {
            throw result;
        }
        if (((_a = result.edit) === null || _a === void 0 ? void 0 : _a.result) === 'Success') {
            return result.edit;
        }
        throw new MwbotError_1.MwbotError('api_mwbot', {
            code: 'editfailed',
            info: 'Edit failed.'
        }, { response: result });
    }
    /**
     * Posts a new section to the given page.
     *
     * Default parameters:
     * ```js
     * {
     *   action: 'edit',
     *   title: title,
     *   section: 'new',
     *   sectiontitle: sectiontitle,
     *   text: content,
     *   summary: summary,
     *   bot: true,
     *   format: 'json',
     *   formatversion: '2'
     *   // `token` is automatically appended
     * }
     * ```
     *
     * @param title The title of the page to edit.
     * @param sectiontitle The section title.
     * @param content The content of the new section.
     * @param summary An optional edit summary. If not provided, the API generates one automatically.
     * @param additionalParams Additional parameters for the API request. These can be used to overwrite the default parameters.
     * @param requestOptions Optional HTTP request options.
     * @return A Promise resolving to an {@link ApiResponse} or rejecting with an error object.
     */
    async newSection(title, sectiontitle, content, summary, additionalParams = {}, requestOptions = {}) {
        return this._save(this.prepEdit(title), content, summary, { section: 'new', sectiontitle }, additionalParams, requestOptions);
    }
    // ****************************** SPECIFIC REQUEST METHODS ******************************
    /**
     * Logs in to the wiki for which this instance has been initialized.
     *
     * @param username
     * @param password
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    async login(username, password) {
        // Fetch a login token
        const disableRetryAPI = { disableRetryAPI: true };
        const token = await this.getToken('login', { maxlag: void 0 }, disableRetryAPI);
        // Login
        const resLogin = await this.post({
            action: 'login',
            lgname: username,
            lgpassword: password,
            lgtoken: token,
            format: 'json',
            formatversion: '2',
            maxlag: void 0 // Overwrite maxlag to have this request prioritized
        }, disableRetryAPI);
        if (!resLogin.login) {
            throw new MwbotError_1.MwbotError('api_mwbot', {
                code: 'empty',
                info: 'OK response but empty result.'
            }, { response: resLogin });
        }
        else if (resLogin.login.result !== 'Success') {
            throw new MwbotError_1.MwbotError('api_mwbot', {
                code: 'loginfailed',
                info: resLogin.login.reason || 'Failed to log in.'
            }, { response: resLogin });
        }
        else {
            this.tokens = {}; // Clear cashed tokens because these can't be used for the newly logged-in user
            return resLogin;
        }
    }
    /**
     * Purges the cache for the given titles.
     *
     * Default parameters:
     * ```js
     * {
     *   action: 'purge',
     *   forcelinkupdate: true,
     *   titles: titles,
     *   format: 'json',
     *   formatversion: '2'
     * }
     * ```
     *
     * @param titles The titles to purge the cache for.
     *
     * The maximum number of values is 50 or 500 (see also {@link apilimit}).
     * @param additionalParams Additional parameters for the API request. These can be used to overwrite the default parameters.
     * @param requestOptions Optional HTTP request options.
     * @return A Promise resolving to an {@link ApiResponse} or rejecting with an error object.
     * @throws If `titles` contains non-strings or non-Titles.
     */
    async purge(titles, additionalParams = {}, requestOptions = {}) {
        const titleSet = new Set();
        const invalid = [];
        titles.forEach((t) => {
            if (t instanceof this.Title) {
                titleSet.add(t.toString());
            }
            else if (typeof t === 'string') {
                titleSet.add(t);
            }
            else {
                invalid.push(t);
            }
        });
        if (invalid.length) {
            const err = new MwbotError_1.MwbotError('fatal', {
                code: 'typemismatch',
                info: 'The array passed as the first argument of purge() must only contain strings or Title instances.'
            }, { invalid });
            throw err;
        }
        return this.post(Object.assign({
            action: 'purge',
            forcelinkupdate: true,
            titles: [...titleSet],
            format: 'json',
            formatversion: '2'
        }, additionalParams), requestOptions);
    }
}
exports.Mwbot = Mwbot;
