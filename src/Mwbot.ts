/**
 * The core module of `mwbot-ts`.
 *
 * Portions of this module are adapted from the following:
 *
 * * `mediawiki.api` module in MediaWiki core (GNU General Public License v2)
 *   * {@link https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/37c52ab4105e9b6573e3931ea87ae684f4e1c417/resources/src/mediawiki.api/index.js | mediawiki.api}
 *
 * * npm package `mwbot` (MIT License)
 *   * {@link https://github.com/gesinn-it-pub/mwbot/blob/2113a704da0cd6555943ced228cb9df0fd19bba6/src/index.js | mwbot}
 *
 * * npm package `mwn` (GNU Lesser General Public License v3)
 *   * {@link https://github.com/siddharthvp/mwn/blob/870ddd153b189144e7c7ea28b58721cdc458c327/src/bot.ts | mwn (bot.ts)}
 *   * {@link https://github.com/siddharthvp/mwn/blob/870ddd153b189144e7c7ea28b58721cdc458c327/src/core.ts | mwn (core.ts)}
 *
 * * npm package `types-mediawiki` (GNU General Public License v3)
 *   * {@link https://github.com/wikimedia-gadgets/types-mediawiki/blob/e833739c0f685e9deb3d666b0f9419e4122a170b/mw/Map.d.ts | types-mediawiki}
 *
 * @module
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
wrapper(axios);
import FormData from 'form-data';
import { XOR } from 'ts-xor';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { v4 as generateId } from 'uuid';

import packageJson from '../package.json';
import {
	ApiParams,
	ApiParamsAction,
	ApiEditPageParams,
	ApiResponse,
	ApiResponseQueryMetaSiteinfoGeneral,
	ApiResponseQueryMetaSiteinfoNamespaces,
	ApiResponseQueryMetaSiteinfoNamespacealiases,
	ApiResponseQueryMetaTokens,
	ApiResponseQueryMetaUserinfo,
	ApiResponseQueryMetaSiteinfoInterwikimap
} from './api_types';
import {
	ErrorBase,
	MwbotError,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	MwbotErrorConfig // Used in the doc of Mwbot.error
} from './MwbotError';
import * as Util from './Util';
const { mergeDeep, isPlainObject, sleep, isEmptyObject, arraysEqual } = Util;
import * as mwString from './String';
import { TitleFactory, Title } from './Title';
import { TemplateFactory, Template } from './Template';
import { WikitextFactory, Wikitext } from './Wikitext';

/**
 * TODO: Add a doc comment here
 */
export class Mwbot {

	// ****************************** CLASS PROPERTIES ******************************

	/**
	 * The default config for HTTP requests.
	 */
	static get defaultRequestOptions() {
		return {
			method: 'GET',
			headers: {
				'User-Agent': `mwbot-ts/${packageJson.version} (https://github.com/Dr4goniez/mwbot-ts)`,
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
	 * User credentials.
	 */
	protected readonly credentials: MwbotCredentials;
	/**
	 * A cookie jar that stores session and login cookies for this instance.
	 */
	protected readonly jar: CookieJar;
	/**
	 * Whether the instance has been initialized.
	 */
	protected initialized: boolean;
	/**
	 * The user options for this intance.
	 */
	userMwbotOptions: MwbotOptions;
	/**
	 * The user-defined configurations for HTTP requests.
	 */
	userRequestOptions: MwbotRequestConfig;
	/**
	 * An array of `AbortController`s used in {@link abort}.
	 */
	protected abortions: AbortController[];
	/**
	 * Cashed MediaWiki tokens.
	 */
	protected tokens: ApiResponseQueryMetaTokens;
	/**
	 * Object that holds UUIDs generated for each HTTP request issued by {@link request}.
	 * The keys represent request UUIDs, and the values the number of requests made using the ID.
	 */
	protected uuid: {[id :string]: number};
	/**
	 * The timestamp (in milliseconds since the UNIX epoch) of the last successful request.
	 * This is updated only for API actions specified in {@link MwbotOptions.intervalActions}.
	 */
	protected lastRequestTime: number | null;
	/**
	 * See {@link MwbotOptions.intervalActions}.
	 */
	protected static get defaultIntervalActions(): ApiParamsAction[] {
		return ['edit', 'move', 'upload'];
	}
	/**
	 * `Util` library with convenient functions.
	 */
	static get Util(): typeof Util {
		return Util;
	}
	/**
	 * `String` library.
	 */
	static get String(): typeof mwString {
		return mwString;
	}
	/**
	 * The site and user information fetched when {@link init} is called. Can be obtained with {@link info}.
	 */
	protected _info: SiteAndUserInfo;
	/**
	 * Returns (a deep copy of) the site and user information fetched when {@link init} is called.
	 */
	get info() {
		this.checkInit();
		return mergeDeep(this._info) as SiteAndUserInfo;
	}
	/**
	 * Title class for this instance.
	 */
	protected _Title: Title;
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
	protected _Template: Template;
	/**
	 * Template class for this instance.
	 */
	get Template() {
		this.checkInit();
		return this._Template;
	}
	/**
	 * Wikitext class for this instance.
	 */
	protected _Wikitext: Wikitext;
	/**
	 * Wikitext class for this instance.
	 */
	get Wikitext() {
		this.checkInit();
		return this._Wikitext;
	}

	// ****************************** CONSTRUCTOR-RELATED METHODS ******************************

	/**
	 * Create a `Mwbot` instance. **{@link init} must subsequently be called for initialization.**
	 *
	 * @param mwbotInitOptions Configuration object containing initialization settings and user credentials.
	 * @param requestOptions Custom request options applied to all HTTP requests issued by the new instance.
	 * @throws {MwbotError} If no valid API endpoint is provided or if the user credentials are malformed.
	 */
	constructor(mwbotInitOptions: MwbotInitOptions, requestOptions: MwbotRequestConfig = {}) {

		const {credentials, ...options} = mwbotInitOptions;

		// Ensure that a valid URL is provided
		requestOptions.url = requestOptions.url || options.apiUrl;
		if (!requestOptions.url) {
			throw new MwbotError({
				code: 'mwbot_fatal_nourl',
				info: 'No valid API endpoint is provided.'
			});
		}

		// Determine authentication type
		this.credentials =  Mwbot.validateCredentials(credentials);
		this.jar = new CookieJar();

		// Set up the User-Agent header if provided
		if (typeof options.userAgent === 'string') {
			requestOptions.headers = requestOptions.headers || {};
			requestOptions.headers['User-Agent'] = options.userAgent;
		}

		// Initialize other class properties
		this.initialized = false;
		this.userMwbotOptions = options;
		this.userRequestOptions = mergeDeep(requestOptions);
		this.abortions = [];
		this.tokens = {};
		this.uuid = {};
		this.lastRequestTime = null;
		this._info = Object.create(null);
		this._Title = Object.create(null);
		this._Template = Object.create(null);
		this._Wikitext = Object.create(null);

	}

	/**
	 * Validates user credentials and determines the authentication type.
	 *
	 * @param credentials The credentials object provided by the user.
	 * @returns The authentication type or an OAuth instance for OAuth 1.0a.
	 * @throws {MwbotError} If the credentials format is incorrect, or if unexpected keys are present.
	 */
	protected static validateCredentials(credentials: Credentials): MwbotCredentials {
		if (!isPlainObject(credentials)) {
			throw new MwbotError({
				code: 'mwbot_fatal_invalidtype',
				info: 'Credentials must be provided as an object.'
			});
		}

		const keys = Object.keys(credentials);
		switch (keys.length) {
			case 1: {
				const {anonymous, oAuth2AccessToken} = credentials;
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
				throw new MwbotError({
					code: 'mwbot_fatal_invalidcreds',
					info: `Unexpected value for "${keys[0]}".`
				});
			}
			case 2: {
				const {username, password} = credentials;
				if (typeof username === 'string' && typeof password === 'string') {
					return {
						user: {
							username,
							password
						}
					};
				}
				throw new MwbotError({
					code: 'mwbot_fatal_invalidcreds',
					info: 'Invalid types for username or password.'
				});
			}
			case 4: {
				const {consumerToken, consumerSecret, accessToken, accessSecret} = credentials;
				if (
					typeof consumerToken === 'string' &&
					typeof consumerSecret === 'string' &&
					typeof accessToken === 'string' &&
					typeof accessSecret === 'string'
				) {
					const instance = new OAuth({
						consumer: {key: consumerToken, secret: consumerSecret},
						signature_method: 'HMAC-SHA1', // TODO: Make it compatible with the RSA-SHA1 authentication method?
						hash_function(baseString: crypto.BinaryLike, key: crypto.BinaryLike | crypto.KeyObject) {
							return crypto.createHmac('sha1', key).update(baseString).digest('base64');
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
				throw new MwbotError({
					code: 'mwbot_fatal_invalidcreds',
					info: 'Invalid OAuth credentials.'
				});
			}
			default:
				throw new MwbotError({
					code: 'mwbot_fatal_invalidcreds',
					info: `Invalid credential properties: ${keys.join(', ')}`
				});
		}
	}

	/**
	 * Update the bot options stored in the instance.
	 *
	 * @param options The new options to apply.
	 * @param merge Whether to merge `options` with the existing ones (default: `true`).
	 *
	 * If `false`, all current settings are cleared before applying `options`, ***except*** for the required
	 * {@link MwbotOptions.apiUrl | apiUrl} property. While `apiUrl` can be updated if provided in `options`,
	 * doing so is discouraged since a `Mwbot` instance is initialized with site-specific data based on the URL.
	 * Instead, consider creating a new instance with a different URL.
	 *
	 * @returns The current {@link Mwbot} instance.
	 * @throws If the resulting options lack an `apiUrl` property.
	 */
	setMwbotOptions(options: Partial<MwbotOptions>, merge = true): Mwbot {
		if (merge) {
			this.userMwbotOptions = mergeDeep(this.userMwbotOptions, options);
		} else {
			const {apiUrl} = this.userMwbotOptions;
			this.userMwbotOptions = mergeDeep({apiUrl}, options);
		}
		if (!this.userMwbotOptions.apiUrl) {
			throw new MwbotError({
				code: 'mwbot_fatal_nourl',
				info: '"apiUrl" must be retained.'
			});
		}
		return this;
	}

	/**
	 * Update the default request options stored in the instance.
	 *
	 * @param options The options to apply.
	 * @param merge Whether to merge `options` with the existing ones (default: `true`).
	 *
	 * If `false`, the current settings are cleared before applying `options`.
	 *
	 * @returns The current {@link Mwbot} instance.
	 */
	setRequestOptions(options: MwbotRequestConfig, merge = true): Mwbot {
		if (merge) {
			this.userRequestOptions = mergeDeep(this.userRequestOptions, options);
		} else {
			this.userRequestOptions = mergeDeep(options);
		}
		return this;
	}

	/**
	 * Initialize the `Mwbot` instance to make all functionalities ready.
	 *
	 * @returns A `Promise` that resolves to a {@link Mwbot} instance if successful, or `null` if initialization fails.
	 *
	 * *This method never rejects.*
	 */
	init(): Promise<this | null> {
		return this._init(1);
	}

	protected async _init(attemptIndex: number): Promise<this | null> {

		// This method does not use MwbotError because it never rejects, unlike other asynchronous methods

		const initError = (msg?: string): null => {
			console.error(`Error: ${msg || 'Failed to establish connection.'}`);
			return null;
		};

		const retryIfPossible = async (index: number): Promise<this | null> => {
			if (index < 2) {
				console.log('Retrying once again in 5 seconds...');
				await sleep(5000);
				return await this._init(index + 1);
			} else {
				return initError('Aborted initialization.');
			}
		};

		// Log in if necessary
		if (this.credentials.user) {
			const {username, password} = this.credentials.user;
			const login = await this.login(username, password).then((res) => res).catch((err) => err);
			if (login instanceof MwbotError) {
				console.error(login);
				return initError();
			}
		}

		// Get user and site info
		const res: ApiResponse = await this.get({
			action: 'query',
			format: 'json',
			formatversion: '2',
			meta: 'userinfo|siteinfo',
			uiprop: 'rights',
			siprop: 'general|interwikimap|namespaces|namespacealiases',
			maxlag: void 0
		}).then((res) => res)
		.catch((err) => err);
		if (!res || !res.query) {
			return initError();
		} else if (res instanceof MwbotError) {
			console.error(res);
			return initError();
		}

		// NOTE: interwikimap is built-in since MW v1.44 but was initially an extension
		const {userinfo, general, interwikimap = [], namespaces, namespacealiases} = res.query;
		if (!userinfo || !general || !namespaces || !namespacealiases) {
			console.error('Error: Failed to establish connection.');
			return await retryIfPossible(attemptIndex);
		} else if (userinfo.anon && !this.isAnonymous()) {
			return initError('Authentication failed.');
		}

		// Initialize mwbot.config
		const failedKeys = this.initConfigData(userinfo, general, namespaces, namespacealiases);
		if (failedKeys.length) {
			// Ensure that all the dependet config values are fetched successfully
			console.warn('Failed to fetch configuration variables: ' + failedKeys.join(', '));
			return await retryIfPossible(attemptIndex);
		}

		// Set up instance properties
		this.initialized = true; // This substitution must be done HERE (Mwbot.info and other getters call checkInit in them)
		const config = this.config;
		this._info = {
			user: userinfo as SiteAndUserInfo['user'],
			general,
			interwikimap,
			namespaces,
			namespacealiases
		};
		this._Title = TitleFactory(
			// Pass individual properties instead of the instance to avoid redundant deep copies
			// from getter functions, improving efficiency in the factory function
			config,
			this._info
		);
		const {Template, ParsedTemplate, MalformedTemplate} = TemplateFactory(config, this._Title);
		this._Template = Template;
		this._Wikitext = WikitextFactory(this, ParsedTemplate, MalformedTemplate);

		console.log('Connection established: ' + config.get('wgServerName'));
		return this;

	}

	/**
	 * Throws an error if the instance is not initialized.
	 */
	protected checkInit(): void {
		if (!this.initialized) {
			throw new MwbotError({
				code: 'mwbot_fatal_callinit',
				info: 'The instance must be initialized before performing this action.'
			});
		}
	}

	// ****************************** SITE-RELATED CONFIG ******************************

	/**
	 * Stores configuration values for the site and user.
	 */
	protected readonly configData: ConfigData = Object.create(null);

	/**
	 * The `wg`-keys of {@link ConfigData}, used in {@link config} to verify their existence.
	 */
	protected readonly configKeys: Array<keyof ConfigData> = [
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
	get config(): MwConfig<ConfigData> {
		this.checkInit();
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const _this = this;
		return {
			get: function<K extends keyof ConfigData, TD>(configName?: string | string[], fallback?: TD) {
				const data = mergeDeep(_this.configData) as ConfigData; // Deep copy
				if (!configName) {
					return data;
				} else if (Array.isArray(configName)) {
					const ret = Object.create(null);
					for (const key of configName) {
						if (key in data) {
							ret[key] = data[key as K];
						} else {
							ret[key] = fallback === undefined ? null : <TD>fallback;
						}
					}
					return ret;
				} else if (String(configName) in data) {
					return data[configName as K];
				} else {
					return fallback === undefined ? null : <TD>fallback;
				}
			},
			set: <K extends keyof ConfigData, U extends Partial<ConfigData> & Record<string, TX>, TX>(selection: K | string | U, value?: TX) => {
				const warn = (variable: string): void => {
					console.warn(`Warning: The pre-set wg-configuration variables are read-only (detected an attempt to update "${variable}").`);
				};
				if (typeof selection === 'string' && this.configKeys.includes(selection as K)) {
					warn(selection);
					return false;
				} else if (typeof selection === 'string' && value !== void 0) {
					this.configData[selection as string] = value;
					return true;
				} else if (isPlainObject(selection) && !isEmptyObject(selection)) {
					let registered = 0;
					const wgVars: string[] = [];
					for (const [k, v] of Object.entries(<U>selection)) {
						if (this.configKeys.includes(k)) {
							wgVars.push(k);
						} else if (v !== void 0) {
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
			exists: (selection: keyof ConfigData | string) => {
				return selection in this.configData;
			}
		};
	}

	/**
	 * Initialize the configuration values with site and user data.
	 * @param userinfo
	 * @param general
	 * @param namespaces
	 * @param namespacealiases
	 * @returns An array of `wg`-keys that failed to be initialized.
	 */
	protected initConfigData<K extends keyof ConfigData>(
		userinfo: ApiResponseQueryMetaUserinfo,
		general: ApiResponseQueryMetaSiteinfoGeneral,
		namespaces: ApiResponseQueryMetaSiteinfoNamespaces,
		namespacealiases: ApiResponseQueryMetaSiteinfoNamespacealiases[]
	): K[] {

		/**
		 * Helper function to set a value to a configuration key.
		 *
		 * @param configName The key to update.
		 * @param configValue The value to assign. If `undefined`, the function returns `false`.
		 * @returns If successful, returns `false`; otherwise, the key name. (This allows filtering failed assignments easily.)
		 */
		const set = (configName: K, configValue?: ConfigData[K]): K | false => {
			if (configValue !== void 0) {
				this.configData[configName] = configValue;
				return false;
			}
			return configName;
		};

		// Deal with data that need to be formatted
		const wgCaseSensitiveNamespaces: number[] = [];
		const wgContentNamespaces: number[] = [];
		const wgFormattedNamespaces: Record<string, string> = {};
		const wgNamespaceIds = namespacealiases.reduce((acc: Record<string, number>, {id, alias}) => {
			acc[alias.toLowerCase().replace(/ /g, '_')] = id;
			return acc;
		}, {});

		for (const nsId in namespaces) {
			const obj = namespaces[nsId];
			if (obj.case === 'case-sensitive') {
				wgCaseSensitiveNamespaces.push(parseInt(nsId));
			} else if (obj.content) {
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
		const valSetMap: (K | false)[] = [
			set(<K>'wgArticlePath', general.articlepath),
			set(<K>'wgCaseSensitiveNamespaces', wgCaseSensitiveNamespaces),
			set(<K>'wgContentLanguage', general.lang),
			set(<K>'wgContentNamespaces', wgContentNamespaces),
			set(<K>'wgDBname', general.wikiid),
			// set('wgExtraSignatureNamespaces', ),
			set(<K>'wgFormattedNamespaces', wgFormattedNamespaces),
			// set('wgGlobalGroups', ),
			set(<K>'wgLegalTitleChars', general.legaltitlechars),
			set(<K>'wgNamespaceIds', wgNamespaceIds),
			set(<K>'wgScript', general.script),
			set(<K>'wgScriptPath', general.scriptpath),
			set(<K>'wgServer', general.server),
			set(<K>'wgServerName', general.servername),
			set(<K>'wgSiteName', general.sitename),
			// set('wgUserEditCount', userinfo.editcount),
			// set('wgUserGroups', userinfo.groups),
			set(<K>'wgUserId', userinfo.id),
			set(<K>'wgUserName', userinfo.name),
			set(<K>'wgUserRights', userinfo.rights),
			set(<K>'wgVersion', general.generator.replace(/^MediaWiki /, '')),
			set(<K>'wgWikiID', general.wikiid)
		];

		// Log any failures
		return valSetMap.filter(val => val !== false);

	}

	// ****************************** CORE REQUEST METHODS ******************************

	/**
	 * Perform a raw HTTP request.
	 *
	 * **NOTE**: This method does ***not*** reference any instance-specific settings.
	 *
	 * @param requestOptions The complete user-defined HTTP request options.
	 * @returns The raw Axios response of the HTTP request.
	 */
	rawRequest(requestOptions: MwbotRequestConfig): Promise<AxiosResponse> {

		// Add an AbortController to make it possible to abort this request later
		if (!requestOptions.disableAbort) {
			const controller = new AbortController();
			requestOptions.signal = controller.signal;
			this.abortions.push(controller);
		}

		// Make an HTTP request
		return axios(requestOptions);

	}

	/**
	 * Perform an HTTP request to the MediaWiki API.
	 *
	 * @param parameters Parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns
	 */
	async request(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {

		// Preprocess the request options
		requestOptions.params = mergeDeep(this.userRequestOptions.params, requestOptions.params, parameters);
		requestOptions = mergeDeep(Mwbot.defaultRequestOptions, this.userRequestOptions, requestOptions);
		const hasLongFields = this.preprocessParameters(requestOptions.params);
		if (requestOptions.params.format !== 'json') {
			return Promise.reject(
				this.error({
					code: 'invalidformat',
					info: 'Expected "format=json" in request parameters.'
				})
			);
		}
		requestOptions.url = this.userMwbotOptions.apiUrl || requestOptions.url;
		requestOptions.headers = requestOptions.headers || {};
		requestOptions.headers['User-Agent'] = this.userMwbotOptions.userAgent || requestOptions.headers['User-Agent'];

		// Preprocess the request method
		const method = String(requestOptions.method).toUpperCase();
		if (method === 'POST') {
			await this.handlePost(requestOptions, hasLongFields); // Encode params to data
		} else if (method !== 'GET') {
			requestOptions.method = 'GET';
		}
		this.applyAuthentication(requestOptions);

		return this._request(requestOptions);

	}

	/**
	 * Perform a raw HTTP request to the MediaWiki API.
	 *
	 * This method assumes that the request body has been fully processed, meaning all necessary parameters have been formatted,
	 * validated, and encoded as required by the API.
	 *
	 * @param requestOptions The finalized HTTP request options, ready for transmission.
	 * @returns
	 */
	protected async _request(requestOptions: MwbotRequestConfig): Promise<ApiResponse> {

		const clonedParams: ApiParams = {...requestOptions.params};
		if (requestOptions.method === 'POST') {
			// The API throws a "mustpostparams" error if it finds certain parameters in "params", even when "data"
			// in the request body is well-formed
			delete requestOptions.params;
		}

		// Track the request using a UUID
		const xReq = 'X-Request-ID';
		let requestId: string | undefined = requestOptions.headers![xReq];
		if (typeof requestId === 'string') {
			this.uuid[requestId]++;
		} else {
			requestId = generateId();
			requestOptions.headers![xReq] = requestId;
			this.uuid[requestId] = 1;
		}

		// Enforce an interval if necessary
		const {interval, intervalActions = Mwbot.defaultIntervalActions} = this.userMwbotOptions;
		const requiresInterval = (intervalActions as (ApiParamsAction | '')[]).includes(clonedParams.action || '');
		if (requiresInterval && this.lastRequestTime && (interval === void 0 || +interval > 0)) {
			const sleepDuration = (typeof interval === 'number' ? interval : 4800) - (Date.now() - this.lastRequestTime);
			await sleep(sleepDuration); // sleep clamps negative values automatically
		}

		// Make the request and process the response
		return new Promise((resolve, reject) => this.rawRequest(requestOptions)
			.then((response) => {

				const data: ApiResponse | undefined = response.data;

				// Show warnings only for the first request because retries use the same request body
				if (this.uuid[requestId] === 1) {
					this.showWarnings(data?.warnings);
				}

				if (!data) {
					reject(this.error({
						code: 'empty',
						info: 'OK response but empty result (check HTTP headers?)',
						response: response
					}, requestId));
				} else if (typeof data !== 'object') {
					// In most cases the raw HTML of [[Main page]]
					reject(this.error({
						code: 'invalidjson',
						info: 'Invalid JSON response (check the request URL?)'
					}, requestId));
				} else if (data.error || data.errors && data.errors[0]) {

					const err = new MwbotError(data as Required<Pick<ApiResponse, 'error' | 'errors'>>);

					// Handle error codes
					if (err.code === 'missingparam' && this.isAnonymous() && err.info.includes('The "token" parameter must be set')) {
						return reject(this.errorAnonymous(requestId));
					}

					if (!requestOptions.disableRetryAPI) {
						// Handle retries
						switch (err.code) {
							case 'badtoken':
							case 'notoken':
								if (this.isAnonymous()) {
									return reject(this.errorAnonymous(requestId));
								}
								if (!requestOptions.disableRetryByCode?.includes(clonedParams.action!)) {
									return this.getTokenType(clonedParams.action!).then((tokenType) => { // Identify the required token type

										if (!tokenType) {
											return reject(this.error(data.error!, requestId));
										}
										console.warn(`Warning: Encountered a "${err.code}" error.`);
										this.badToken(tokenType);
										delete clonedParams.token;

										return resolve(this.retry(err, requestId, requestOptions, 2, 0, () => {
											// Clear the request ID because postWithToken issues a new one
											delete this.uuid[requestId];
											return this.postWithToken(tokenType, clonedParams);
										}));

									});
								}
								break;

							case 'readonly':
								console.warn(`Warning: Encountered a "${err.code}" error.`);
								return resolve(this.retry(err, requestId, requestOptions, 3, 10));

							case 'maxlag': {
								console.warn(`Warning: Encountered a "${err.code}" error.`);
								const retryAfter = parseInt(response.headers['retry-after']) || 5;
								return resolve(this.retry(err, requestId, requestOptions, 4, retryAfter));
							}

							case 'mwoauth-invalid-authorization':
								// Per https://phabricator.wikimedia.org/T106066, "Nonce already used" indicates
								// an upstream memcached/redis failure which is transient
								if (err.info.includes('Nonce already used')) {
									return resolve(this.retry(err, requestId, requestOptions, 2, 10));
								}
						}
					}

					reject(this.error(err, requestId));

				} else {
					if (requiresInterval) {
						// Save the current time for intervals as needed
						this.lastRequestTime = Date.now();
					}
					delete this.uuid[requestId];
					resolve(data);
				}

			})
			.catch((error) => {

				if (error instanceof Error) {
					// Reaches this block if anything throw'd in the then block
					return reject(error);
				}

				const err = new MwbotError({
					code: 'http',
					info: 'HTTP request failed.'
					// Add response here if the code isn't modified
				});

				if (error && error.code === 'ERR_CANCELED') {
					return reject(this.error(
						err.setCode('aborted').setInfo('Request aborted by the user.'),
						requestId
					));
				} else if (typeof error.status === 'number' && error.status >= 400) {
					// Articulate the error object for common errors
					switch (error.status) {
						case 404:
							return reject(this.error(
								err.setCode('notfound').setInfo(`Page not found (404): ${requestOptions.url!}.`),
								requestId
							));
						case 408:
							return resolve(this.retry(
								err.setCode('timeout').setInfo('Request timeout (408).'),
								requestId, requestOptions
							));
						case 414:
							return reject(this.error(
								err.setCode('baduri').setInfo('URI too long (414): Consider using a POST request.'),
								requestId
							));
						case 429:
							return resolve(this.retry(
								err.setCode('ratelimited').setInfo('Too many requests (429).'),
								requestId, requestOptions
							));
						case 500:
							return resolve(this.retry(
								err.setCode('servererror').setInfo('Internal server error (500).'),
								requestId, requestOptions
							));
						case 502:
							return resolve(this.retry(
								err.setCode('badgateway').setInfo('Bad gateway (502): Perhaps the server is down?'),
								requestId, requestOptions
							));
						case 503:
							return resolve(this.retry(
								err.setCode('serviceunavailable').setInfo('Service Unavailable (503): Perhaps the server is down?'),
								requestId, requestOptions
							));
						case 504:
							return resolve(this.retry(
								err.setCode('timeout').setInfo('Gateway timeout (504)'),
								requestId, requestOptions
							));
					}
				}

				err.response = error;
				reject(this.error(err, requestId));

			})
		);

	}

	/**
	 * Massage parameters from the nice format we accept into a format suitable for the API.
	 *
	 * @param parameters (modified in-place)
	 * @returns Boolean indicating whether the parameters have a long field.
	 */
	protected preprocessParameters(parameters: ApiParams): boolean {
		let hasLongFields = false;
		Object.entries(parameters).forEach(([key, val]) => {
			if (Array.isArray(val)) {
				// Multi-value fields must be stringified
				if (!val.join('').includes('|')) {
					parameters[key] = val.join('|');
				} else {
					parameters[key] = '\x1f' + val.join('\x1f');
				}
			} else if (val === false || val === undefined) {
				// Boolean values are only false when not given at all
				delete parameters[key];
			} else if (val === true) {
				// Boolean values cause error with multipart/form-data requests
				parameters[key] = '1';
			} else if (val instanceof Date) {
				parameters[key] = val.toISOString();
			} else if (String(val).length > 8000) {
				hasLongFields = true;
			}
		});
		return hasLongFields;
	}

	/**
	 * Handles data encoding for POST requests (calls {@link handlePostMultipartFormData} for `multipart/form-data`).
	 *
	 * @param requestOptions The HTTP request options to modify.
	 * @param hasLongFields Boolean indicating whether the parameters have a long field.
	 */
	protected async handlePost(requestOptions: MwbotRequestConfig, hasLongFields: boolean): Promise<void> {

		// Ensure the token parameter is last (per [[mw:API:Edit#Token]])
		// The token will be kept away if the user is anonymous
		const {params} = requestOptions;
		const token = params.token as string | undefined;
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
		} else {
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
	protected async handlePostMultipartFormData(requestOptions: MwbotRequestConfig, token?: string): Promise<void> {
		const {params} = requestOptions;
		const form = new FormData();

		for (const [key, val] of Object.entries(params)) {
			if (val instanceof Object && 'stream' in val) {
				//@ts-expect-error Property 'name' does not exist?
				form.append(key, val.stream, val.name);
			} else {
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
	protected applyAuthentication(requestOptions: MwbotRequestConfig): void {
		if (!requestOptions.headers) {
			requestOptions.headers = {};
		}
		const {oauth2, oauth1} = this.credentials;
		if (oauth2) {
			// OAuth 2.0
			requestOptions.headers.Authorization = `Bearer ${oauth2}`;
		} else if (oauth1) {
			// OAuth 1.0a
			if (!requestOptions.url || !requestOptions.method) {
				throw new MwbotError({
					code: 'mwbot_fatal_typemismatch',
					info: '[Internal] "url" and "method" must be set before applying authentication.'
				});
			}
			Object.assign(
				requestOptions.headers,
				oauth1.instance.toHeader(
					oauth1.instance.authorize({
						url: requestOptions.url,
						method: requestOptions.method,
						data: requestOptions.data instanceof FormData ? {} : requestOptions.params
					}, {
						key: oauth1.accessToken,
						secret: oauth1.accessSecret
					})
				)
			);
		} else {
			// Cookie-based authentication
			requestOptions.jar = this.jar;
			requestOptions.withCredentials = true;
		}
	}

	/**
	 * Check whether the instance has been initialized for an anonymous user.
	 * @returns
	 */
	protected isAnonymous(): boolean {
		return !!this.credentials.anonymous;
	}

	/**
	 * Logs warnings returned from the API to the console unless suppressed.
	 * @param warnings Warnings returned by the API, if any.
	 */
	protected showWarnings(warnings: ApiResponse['warnings']): void {
		if (!warnings || this.userMwbotOptions.suppressWarnings) {
			return;
		}
		if (Array.isArray(warnings)) {
			// Newer error formats
			for (const {module, ...obj} of warnings) {
				const msg =
					obj['*'] || // formatversion=1
					obj.html || // errorformat=html
					obj.text; // errorformat=wikitext/plaintext
				if (msg) {
					console.log(`[Warning]: ${module}: ${msg}`);
				}
			}
		} else {
			// Older error format (errorformat=bc)
			for (const [module, obj] of Object.entries(warnings)) {
				const msg = obj?.['*'] || obj?.warnings;
				if (msg) {
					console.log(`[Warning]: ${module}: ${msg}`);
				}
			}
		}
	}

	/**
	 * Returns a {@link MwbotError} instance by normalizing various error objects.
	 *
	 * If `base` is an {@link MwbotErrorConfig} or an API response containing an error,
	 * it is converted into an {@link MwbotError} instance.
	 *
	 * If `base` is already an instance of `Error` (including `MwbotError`), it is returned as is.
	 *
	 * If a request UUID is provided, its entry in {@link uuid} is cleared.
	 *
	 * @param base An error object, which can be:
	 * - A manually created error in the form of {@link MwbotErrorConfig}.
	 * - An API response containing an `error` or `errors` property.
	 * - An existing `Error` instance, in which case it is returned as is.
	 *
	 * @param requestId The UUID of the request to be removed from {@link uuid}.
	 * If provided, the corresponding entry is deleted before processing `base`.
	 *
	 * @returns A normalized {@link MwbotError} instance. If `base` is already an `Error`, it is returned unchanged.
	 */
	protected error(base: ErrorBase | MwbotError, requestId?: string): MwbotError {
		if (requestId) {
			delete this.uuid[requestId];
		}
		if (base instanceof Error) {
			return base;
		} else {
			return new MwbotError(base);
		}
	}

	/**
	 * Returns a `mwbot_api_anonymous` error.
	 * @param requestId If provided, the relevant entry in {@link uuid} is cleared.
	 * @returns
	 */
	protected errorAnonymous(requestId?: string): MwbotError {
		if (requestId) {
			delete this.uuid[requestId];
		}
		return new MwbotError({
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
	 * @returns A Promise of the retry request or a rejected error object.
	 */
	protected async retry(
		initialError: MwbotError,
		requestId: string,
		requestOptions: MwbotRequestConfig,
		maxAttempts = 2,
		sleepSeconds = 10,
		retryCallback?: () => Promise<ApiResponse>
	): Promise<ApiResponse> {

		const attemptedCount = this.uuid[requestId] || 0; // Should never fall back to 0 but just in case
		const {disableRetry, disableRetryByCode} = requestOptions;
		const shouldRetry =
			attemptedCount < maxAttempts &&
			!disableRetry &&
			(!disableRetryByCode || !disableRetryByCode.includes(initialError.code));

		// Check if we should retry the request
		if (shouldRetry) {
			console.log(initialError);
			if (sleepSeconds) {
				console.log(`Retrying in ${sleepSeconds} seconds...`);
			} else {
				console.log(`Retrying...`);
			}
			await sleep(sleepSeconds * 1000);
			if (typeof retryCallback === 'function') {
				return retryCallback(); // TODO: Delete the request ID from uuid here?
			} else {
				return this._request(requestOptions);
			}
		}

		// If retry conditions aren't met, reject with the error
		return Promise.reject(this.error(initialError, requestId));

	}

	/**
	 * Abort all unfinished HTTP requests issued by this instance.
	 */
	abort(): Mwbot {
		this.abortions.forEach((controller) => {
			if (controller) {
				controller.abort();
			}
		});
		this.abortions = [];
		return this;
	}

	/**
	 * Perform an HTTP GET request to the MediaWiki API.
	 *
	 * @param parameters Parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns
	 */
	get(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
		requestOptions.method = 'GET';
		return this.request(parameters, requestOptions);
	}

	/**
	 * Perform an HTTP POST request to the MediaWiki API.
	 *
	 * @param parameters Parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns
	 */
	post(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
		requestOptions.method = 'POST';
		return this.request(parameters, requestOptions);
	}

	/**
	 * Perform an HTTP POST request to the MediaWiki API to **fetch data**. This method should only be used
	 * to circumvent a `414 URI too long` error; otherwise, use {@link get}.
	 *
	 * Per {@link https://www.mediawiki.org/wiki/API:Etiquette#Other_notes | mw:API:Etiquette#Other_notes},
	 * `Promise-Non-Write-API-Action: true` will be set to the request headers automatically.
	 *
	 * @param parameters Parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns
	 */
	nonwritePost(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
		requestOptions.method = 'POST';
		requestOptions.headers = requestOptions.headers || {};
		requestOptions.headers['Promise-Non-Write-API-Action'] = true;
		return this.request(parameters, requestOptions);
	}

	/**
	 * Perform an API request that automatically continues until the limit is reached.
	 *
	 * This method is designed for API calls that include a `continue` property in the response.
	 *
	 * **Usage Note:** Ensure the API parameters include a `**limit` value set to `"max"` to retrieve the maximum
	 * number of results per request.
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
	async continuedRequest(
		parameters: ApiParams,
		limit = 10,
		rejectProof = false,
		requestOptions: MwbotRequestConfig = {}
	): Promise<ApiResponse> {

		const ret: ApiResponse[] = [];
		const query = (params: ApiParams, count: number): Promise<void> => {
			return this.get(params, requestOptions)
				.then((res) => {
					ret.push(res);
					if (res.continue && count < limit) {
						return query(Object.assign({}, res.continue, params), ++count);
					}
				}).catch((err) => {
					throw err;
				});
		};

		await query(parameters, 1).catch((err) => {
			if (!rejectProof) {
				throw err;
			} else {
				console.error(err);
			}
		});

		const flattened = ret.reduce((acc: ApiResponse, obj) => mergeDeep(acc, obj), Object.create(null));
		if (ret[ret.length - 1] && !ret[ret.length - 1].continue) {
			// Delete the continue property if the last response doesn't have it
			delete flattened.continue;
		}
		return flattened;

	}

	/**
	 * Perform API requests with a multi-value field that is subject to the apilimit, processing multiple requests
	 * in parallel if necessary.
	 *
	 * For example:
	 * ```ts
	 * {
	 * 	action: 'query',
	 * 	titles: 'A|B|C|D|...', // This parameter is subject to the apilimit of 500 or 50
	 * 	formatversion: '2'
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
	async massRequest(
		parameters: ApiParams,
		keys: string | string[],
		batchSize?: number,
		requestOptions: MwbotRequestConfig = {}
	): Promise<(ApiResponse | MwbotError)[]> {

		const apilimit = this.info.user.rights.includes('apihighlimits') ? 500 : 50;

		if (batchSize !== undefined) {
			if (!Number.isInteger(batchSize) || batchSize > apilimit || batchSize <= 0) {
				throw new MwbotError({
					code: 'mwbot_fatal_invalidsize',
					info: `"batchSize" must be a positive integer less than or equal to ${apilimit}.`
				});
			}
		} else {
			batchSize = apilimit;
		}

		// Ensure "keys" is an array
		keys = Array.isArray(keys) ? keys : [keys];
		if (!keys.length) {
			throw new MwbotError({
				code: 'mwbot_fatal_emptykeys',
				info: `"keys" cannot be an empty array.`
			});
		}

		// Extract multi-value field
		let batchValues: string[] | null = null;
		for (const key of keys) {
			const value = parameters[key];
			if (value !== undefined) {
				if (!Array.isArray(value)) {
					throw new MwbotError({
						code: 'mwbot_fatal_typemismatch',
						info: `The multi-value fields (${keys.join(', ')}) must be arrays.`
					});
				}
				if (batchValues === null) {
					batchValues = [...value] as string[]; // Copy the array
				} else if (!arraysEqual(batchValues, value, true)) {
					throw new MwbotError({
						code: 'mwbot_fatal_fieldmismatch',
						info: 'All multi-value fields must be identical.'
					});
				}
			}
		}
		if (!batchValues) {
			throw new MwbotError({
				code: 'mwbot_fatal_nofields',
				info: 'No multi-value fields have been found.'
			});
		} else if (!batchValues.length) {
			return [];
		}

		// Prepare API batches
		const batchParams: ApiParams[] = [];
		for (let i = 0; i < batchValues.length; i += batchSize) {
			const batchArrayStr = batchValues.slice(i, i + batchSize).join('|');
			batchParams.push({
				...parameters,
				...Object.fromEntries(keys.map((key) => [key, batchArrayStr]))
			});
		}

		// Send API requests in batches of 100
		const results: (ApiResponse | MwbotError)[] = [];
		for (let i = 0; i < batchParams.length; i += 100) {
			const batch = batchParams.slice(i, i + 100).map((params) =>
				this.nonwritePost(params, requestOptions).catch((err: MwbotError) => err)
			);
			const batchResults = await Promise.all(batch);
			results.push(...batchResults);
		}
		return results;

	}

	// ****************************** TOKEN-RELATED METHODS ******************************

	/**
	 * Perform a POST request to the MediaWiki API using a token of the specified type.
	 *
	 * This method retrieves a token automatically, before performing the request.
	 * If a cached token exists, it is used first; if the request fails due to an invalid token
	 * (`badtoken`), the token cache is cleared, and a retry is attempted.
	 *
	 * Example usage:
	 * ```typescript
	 * mwbot.postWithToken('csrf', {
	 * 	action: 'options',
	 * 	optionname: 'gender',
	 * 	optionvalue: 'female'
	 * });
	 * ```
	 *
	 * @param tokenType The type of token to use (e.g., `csrf`).
	 * @param parameters Parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns
	 */
	postWithToken(tokenType: string, parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
		if (this.isAnonymous()) {
			return Promise.reject(this.errorAnonymous());
		}
		const assertParams = {
			assert: parameters.assert,
			assertuser: parameters.assertuser
		};
		return new Promise((resolve, reject) => {
			this.getToken(tokenType, assertParams)
			.then((token) => {
				parameters.token = token;
				return this.post(parameters, mergeDeep(requestOptions, {disableRetryByCode: ['badtoken']}))
				.then(resolve)
				.catch((err: MwbotError) => {

					// Error handler
					if (err.code === 'badtoken') {
						this.badToken(tokenType);
						// Try again, once
						parameters.token = void 0;
						return this.getToken(tokenType, assertParams)
						.then((t) => {
							parameters.token = t;
							return this.post(parameters, requestOptions).then(resolve).catch(reject);
						}).catch(reject);
					}

					reject(err);

				});
			}).catch(reject);
		});
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
	getToken(tokenType: string, additionalParams?: ApiParams | 'user' | 'bot' | 'anon', requestOptions: MwbotRequestConfig = {}): Promise<string> {

		// Check for a cached token
		tokenType = Mwbot.mapLegacyToken(tokenType);
		const tokenName = `${tokenType}token` as keyof ApiResponseQueryMetaTokens;
		const cashedToken = this.tokens[tokenName];
		if (cashedToken) {
			return Promise.resolve(cashedToken);
		}

		// Send an API request
		if (typeof additionalParams === 'string') {
			additionalParams = {assert: additionalParams};
		}
		const params = Object.assign(
			{
				action: 'query',
				meta: 'tokens',
				type: '*',
				format: 'json',
				formatversion: '2'
			},
			additionalParams
		);
		return this.get(params, requestOptions)
		.then((res) => {
			const resToken = res?.query?.tokens;
			if (resToken && !isEmptyObject(resToken)) {
				this.tokens = resToken; // Update cashed tokens
				const token = resToken[tokenName];
				if (token) {
					return token;
				} else {
					throw new MwbotError({
						code: 'badnamedtoken',
						info: 'Could not find a token named "' + tokenType + '" (check for typos?)'
					});
				}
			} else {
				throw new MwbotError({
					code: 'empty',
					info: 'OK response but empty result.'
				});
			}
		}).catch(Promise.reject);
	}

	/**
	 * Convert legacy token types to `csrf`.
	 *
	 * @param action
	 * @returns
	 */
	protected static mapLegacyToken(action: string): string {
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
	 * Mark a cached token of the specified type as invalid.
	 *
	 * @param tokenType The type of token to invalidate (e.g., `csrf`).
	 * @returns
	 */
	badToken(tokenType: string): Mwbot {
		tokenType = Mwbot.mapLegacyToken(tokenType);
		const tokenName = `${tokenType}token` as keyof ApiResponseQueryMetaTokens;
		if (this.tokens[tokenName]) {
			delete this.tokens[tokenName];
		}
		return this;
	}

	/**
	 * Get type of token to be used with an API action
	 * @param action The API's action parameter value.
	 * @returns
	 */
	protected getTokenType(action: string): Promise<string | null> {
		return this.get({
			action: 'paraminfo',
			modules: action,
			maxlag: void 0
		}, {
			disableRetryByCode: ['badtoken']
		}).then((res) => {
			const paramObj = res.paraminfo?.modules[0].parameters.find((p) => p.name === 'token');
			return paramObj && paramObj.tokentype || null;
		})
		.catch(() => null);
	}

	/**
	 * Perform a POST request to the MediaWiki API using a csrf token.
	 *
	 * This is a shorthand method of {@link postWithToken}.
	 *
	 * @param parameters Parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns
	 */
	postWithCsrfToken(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
		return this.postWithToken('csrf', parameters, requestOptions);
	}

	/**
	 * Retrieves a csrf token from the API.
	 *
	 * This is a shorthand method of {@link getToken}.
	 *
	 * @param requestOptions Optional HTTP request options.
	 * @returns
	 */
	getCsrfToken(requestOptions: MwbotRequestConfig = {}): Promise<string> {
		return this.getToken('csrf', void 0, requestOptions);
	}

	// ****************************** SPECIFIC REQUEST METHODS ******************************

	/**
	 * Log in to the wiki for which this instance has been initialized.
	 *
	 * @param username
	 * @param password
	 * @returns
	 */
	protected async login(username: string, password: string): Promise<ApiResponse> { // TODO: Make this method public?

		// Fetch a login token
		const disableRetryAPI = {disableRetryAPI: true};
		const token = await this.getToken('login', {maxlag: void 0}, disableRetryAPI).then((res) => res).catch((err) => err);
		if (typeof token !== 'string') {
			return Promise.reject(token); // Error object
		}

		// Login
		const resLogin: ApiResponse | MwbotError = await this.post({
			action: 'login',
			lgname: username,
			lgpassword: password,
			lgtoken: token,
			format: 'json',
			formatversion: '2',
			maxlag: void 0 // Overwrite maxlag to have this request prioritized
		}, disableRetryAPI).then((res) => res).catch((err) => err);

		if (resLogin instanceof MwbotError) {
			return Promise.reject(resLogin);
		} else if (!resLogin.login) {
			const err = new MwbotError({
				code: 'empty',
				info: 'OK response but empty result.'
			});
			err.response = resLogin;
			return Promise.reject(err);
		} else if (resLogin.login.result !== 'Success') {
			const err = new MwbotError({
				code: 'loginfailed',
				info: 'Failed to log in.'
			});
			err.response = resLogin;
			return Promise.reject(err);
		} else {
			this.tokens = {}; // Clear cashed tokens because these can't be used for the newly logged-in user
			return Promise.resolve(resLogin);
		}

	}

	/**
	 * Validates and processes a title before editing.
	 *
	 * This method ensures that:
	 * - The user is not anonymous unless `allowAnonymous` is `true`.
	 * - The title is either a valid string or an instance of {@link Title}.
	 * - If the title is a string, it is converted to a {@link Title} instance.
	 * - The title is not empty.
	 * - The title is not interwiki.
	 *
	 * If any validation fails, it returns an {@link MwbotError}.
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param allowAnonymous Whether to allow anonymous users to proceed. Defaults to `false`.
	 * @returns A valid {@link Title} instance if successful, or an {@link MwbotError} if validation fails.
	 */
	protected prepEdit(title: string | InstanceType<Title>, allowAnonymous = false): InstanceType<Title> | MwbotError {
		if (this.isAnonymous() && !allowAnonymous) {
			return this.errorAnonymous();
		} else if (typeof title !== 'string' && !(title instanceof this.Title)) {
			return new MwbotError({
				code: 'mwbot_fatal_typemismatch',
				info: `"${typeof title}" is not a valid type.`
			});
		} else if (!(title instanceof this.Title)) {
			const t = this.Title.newFromText(title);
			if (!t) {
				return new MwbotError({
					code: 'invalidtitle',
					info: `"${title}" is not a valid title.`
				});
			}
			title = t;
		}
		if (!title.getMain()) {
			return new MwbotError({
				code: 'emptytitle',
				info: 'The title is empty.'
			});
		} else if (title.isExternal()) {
			return new MwbotError({
				code: 'interwikititle',
				info: `"${title.getPrefixedText()}" is an interwiki title.`
			});
		}
		return title;
	}

	protected _edit(
		title: InstanceType<Title>,
		content: string,
		summary?: string,
		internalOptions: ApiEditPageParams = {},
		options: ApiEditPageParams = {},
		requestOptions: MwbotRequestConfig = {}
	): Promise<ApiResponse> {
		const params: ApiEditPageParams = Object.assign(
			{
				action: 'edit',
				title: title.getPrefixedDb(),
				text: content,
				summary,
				bot: true,
				format: 'json',
				formatversion: '2'
			},
			internalOptions,
			options
		);
		return this.postWithCsrfToken(params as ApiParams, requestOptions);
	}

	/**
	 * Create a new page with the given content.
	 *
	 * - To edit an (existing) page, use {@link edit} instead.
	 * - To edit an existing page using a transformation predicate, use {@link transform} instead.
	 *
	 * Default parameters:
	 * ```js
	 * {
	 * 	action: 'edit',
	 * 	title: title,
	 * 	text: content,
	 * 	summary: summary,
	 * 	bot: true,
	 * 	createonly: true,
	 * 	format: 'json',
	 * 	formatversion: '2'
	 * }
	 * ```
	 *
	 * @param title The new page title, either as a string or a {@link Title} instance.
	 * @param content The text content of the new page.
	 * @param summary An optional edit summary.
	 * @param options Additional parameters for the API request. These can be used to overwrite
	 * the default parameters.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the API response or rejecting with {@link MwbotError}.
	 */
	async create(
		title: string | InstanceType<Title>,
		content: string,
		summary?: string,
		options: ApiEditPageParams = {},
		requestOptions: MwbotRequestConfig = {}
	): Promise<ApiResponse> {
		const validatedTitle = this.prepEdit(title);
		if (validatedTitle instanceof MwbotError) {
			throw validatedTitle;
		}
		return this._edit(validatedTitle, content, summary, {createonly: true}, options, requestOptions);
	}

	/**
	 * Edit a page with the given content.
	 *
	 * - To create a new page, use {@link create} instead.
	 * - To edit an existing page using a transformation predicate, use {@link transform} instead.
	 *
	 * Default parameters:
	 * ```js
	 * {
	 * 	action: 'edit',
	 * 	title: title,
	 * 	text: content,
	 * 	summary: summary,
	 * 	bot: true,
	 * 	nocreate: true,
	 * 	format: 'json',
	 * 	formatversion: '2'
	 * }
	 * ```
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param content The text content of the page.
	 * @param summary An optional edit summary.
	 * @param options Additional parameters for the API request. These can be used to overwrite
	 * the default parameters.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the API response or rejecting with {@link MwbotError}.
	 */
	async edit(
		title: string | InstanceType<Title>,
		content: string,
		summary?: string,
		options: ApiEditPageParams = {},
		requestOptions: MwbotRequestConfig = {}
	): Promise<ApiResponse> {
		const validatedTitle = this.prepEdit(title);
		if (validatedTitle instanceof MwbotError) {
			throw validatedTitle;
		}
		return this._edit(validatedTitle, content, summary, {nocreate: true}, options, requestOptions);
	}

	/**
	 * Read the content of the latest revision of a title from the API.
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the revision information, or rejecting with {@link MwbotError}.
	 */
	async read(title: string | InstanceType<Title>, requestOptions: MwbotRequestConfig = {}): Promise<Revision> {
		const validatedTitle = this.prepEdit(title, true);
		if (validatedTitle instanceof MwbotError) {
			throw validatedTitle;
		}
		return this.get({
			action: 'query',
			titles: validatedTitle.getPrefixedDb(),
			prop: 'revisions',
			rvprop: 'ids|timestamp|user|content',
			rvslots: 'main',
			curtimestamp: true,
			formatversion: '2'
		}, requestOptions)
		.then((res) => {
			const resPg = res.query?.pages?.[0];
			const resRv = resPg?.revisions?.[0];
			if (!resPg || !resRv) {
				const err = new MwbotError({
					code: 'empty',
					info: 'OK response but empty result.'
				});
				err.response = res;
				throw err;
			} else if (typeof resPg.pageid !== 'number' || resPg.missing) {
				const err = new MwbotError({
					code: 'pagemissing',
					info: 'The requested page does not exist.'
				});
				err.title = resPg.title;
				throw err;
			} else if (
				typeof resRv.revid !== 'number' ||
				typeof res.curtimestamp !== 'string' ||
				!resRv.timestamp ||
				typeof resRv.slots?.main.content !== 'string'
			) {
				const err = new MwbotError({
					code: 'empty',
					info: 'OK response but empty result.'
				});
				err.response = res;
				throw err;
			}
			return {
				pageid: resPg.pageid,
				ns: resPg.ns,
				title: resPg.title,
				baserevid: resRv.revid,
				user: resRv.user, // Could be missing if revdel'd
				basetimestamp: resRv.timestamp,
				starttimestamp: res.curtimestamp,
				content: resRv.slots.main.content
			};
		}).catch((err) => {
			throw err;
		});
	}

	/**
	 * Edit an existing page by first fetching its latest revision and applying a transformation
	 * function to modify its content.
	 *
	 * This method automatically handles edit conflicts up to 3 times.
	 *
	 * Default parameters (into which the return value of `callback` is merged):
	 * ```js
	 * {
	 * 	action: 'edit',
	 * 	title: revision.title, // Erased if "pageid" is provided
	 * 	bot: true,
	 * 	baserevid: revision.baserevid,
	 * 	basetimestamp: revision.basetimestamp,
	 * 	starttimestamp: revision.starttimestamp,
	 * 	nocreate: true,
	 * 	format: 'json',
	 * 	formatversion: '2'
	 * }
	 * ```
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param callback A function that receives a {@link Wikitext} instance initialized from the
	 * fetched content and an object representing the metadata of the fetched revision. This function
	 * should return a Promise resolving to {@link ApiEditPageParams} as a plain object, which will
	 * be used for the edit request.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to an {@link ApiResponse} or rejecting with an error object.
	 */
	async transform(
		title: string | InstanceType<Title>,
		callback: (wikitext: InstanceType<Wikitext>, revision: Revision) => Promise<ApiEditPageParams>,
		requestOptions: MwbotRequestConfig = {},
		/** @private */
		retry = 0
	): Promise<ApiResponse> {

		if (typeof callback !== 'function') {
			throw new MwbotError({
				code: 'mwbot_fatal_typemismatch',
				info: `Expected a function for "callback", but got ${typeof callback}.`
			});
		}

		const revision = await this.read(title, requestOptions).catch((err: Error) => err);
		if (revision instanceof Error) {
			throw revision;
		}

		let params = await callback(new this.Wikitext(revision.content), {...revision}).catch((err: Error) => err);
		if (params instanceof Error) {
			throw params;
		} else if (!isPlainObject(params)) {
			const err = new MwbotError({
				code: 'mwbot_fatal_typemismatch',
				info: `The callback function of transform() must return a plain object.`
			});
			err.params = params;
			throw err;
		}
		const defaultParams: ApiEditPageParams = {
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

		const result = await this.postWithCsrfToken(params as ApiParams, requestOptions)
			.catch((err: MwbotError) => err);
		const {disableRetry, disableRetryAPI, disableRetryByCode = []} = requestOptions;
		if (
			result instanceof MwbotError && result.code === 'mwbot_api_editconflict' &&
			typeof retry === 'number' && retry < 3 &&
			!disableRetry && !disableRetryAPI &&
			!disableRetryByCode.some((code) => /editconflict$/.test(code))
		) {
			console.warn('Warning: Encountered an edit conflict.');
			console.log('Retrying in 5 seconds...');
			await sleep(5000);
			return this.transform(title, callback, requestOptions, ++retry);
		}
		return result;

	}

}

// ****************************** HELPER TYPES AND INTERFACES ******************************

/**
 * Options to be passed as the first argument of {@link Mwbot.constructor}.
 */
export type MwbotInitOptions = MwbotOptions & {credentials: Credentials;};

/**
 * Configuration options for {@link Mwbot.constructor}. These options can also be updated later
 * via {@link Mwbot.setMwbotOptions}.
 */
export interface MwbotOptions {
	/**
	 * The API endpoint to initialize the {@link Mwbot} instance with.
	 */
	apiUrl: string;
	/**
	 * Custom User-Agent string for requests.
	 *
	 * Format: `clientname/version (contact information e.g., username, email) framework/version...`
	 *
	 * @see https://www.mediawiki.org/wiki/API:Etiquette#The_User-Agent_header
	 */
	userAgent?: string;
	/**
	 * Minimum interval (in milliseconds) between consecutive API requests.
	 * See {@link intervalActions} for the relevant API actions.
	 *
	 * Default: `5000` (5 seconds)
	 *
	 * To disable intervals, set {@link intervalActions} to an empty array.
	 */
	interval?: number;
	/**
	 * API actions that require an enforced interval.
	 *
	 * Default: `['edit', 'move', 'upload']`
	 *
	 * Set an empty array to disable intervals.
	 */
	intervalActions?: ApiParamsAction[];
	/**
	 * Whether to suppress warnings returned by the API.
	 */
	suppressWarnings?: boolean;
}

/**
 * User credentials for authentication.
 *
 * When calling {@link Mwbot.constructor}, one of the following credential types must be provided under
 * the `credentials` key in the {@link MwbotInitOptions} object.
 *
 * #### OAuth 2.0 ({@link https://www.mediawiki.org/wiki/OAuth/Owner-only_consumers#OAuth_2})
 * ```ts
 * {
 * 	oAuth2AccessToken: 'Your OAuth 2.0 access token'
 * }
 * ```
 * #### OAuth 1.0a ({@link https://www.mediawiki.org/wiki/OAuth/Owner-only_consumers#OAuth_1})
 * ```ts
 * {
 * 	consumerToken: 'Your OAuth 1.0a consumer token',
 * 	consumerSecret: 'Your OAuth 1.0a consumer secret',
 * 	accessToken: 'Your OAuth 1.0a access token',
 * 	accessSecret: 'Your OAuth 1.0a access secret'
 * }
 * ```
 * #### BotPassword ({@link https://www.mediawiki.org/wiki/Manual:Bot_passwords})
 * ```ts
 * {
 * 	username: 'Your bot username',
 * 	password: 'Your bot password'
 * }
 * ```
 * #### Anonymous Access
 * ```ts
 * {
 * 	anonymous: true
 * }
 * ```
 * **NOTE:** Anonymous users will be limited to non-write requests only.
 */
export type Credentials = XOR<
	{
		/**
		 * OAuth 2.0 access token.
		 */
		oAuth2AccessToken: string;
	},
	{
		/**
		 * OAuth 1.0a consumer token.
		 */
		consumerToken: string;
		/**
		 * OAuth 1.0a consumer secret.
		 */
		consumerSecret: string;
		/**
		 * OAuth 1.0a access token.
		 */
		accessToken: string;
		/**
		 * OAuth 1.0a access secret.
		 */
		accessSecret: string;
	},
	{
		/**
		 * Bot's username.
		 */
		username: string;
		/**
		 * Bot's password.
		 */
		password: string;
	},
	{
		/**
		 * Set to `true` for anonymous access.
		 */
		anonymous: true;
	}
>;

/**
 * Processed {@link Credentials} stored in a {@link Mwbot} instance.
 * @private
 */
type MwbotCredentials = XOR<
	{
		oauth2: string;
	},
	{
		oauth1: {
			instance: OAuth;
			accessToken: string;
			accessSecret: string;
		};
	},
	{
		user: {
			username: string;
			password: string;
		};
	},
	{
		anonymous: true;
	}
>;

/**
 * Configuration options for {@link Mwbot}'s request methods, extending
 * {@link https://axios-http.com/docs/req_config | Axios's request config}.
 *
 * These options are per-request options and should be passed to request methods as needed.
 * To set default options for all requests, provide them in the {@link Mwbot.constructor}
 * or update them with {@link Mwbot.setRequestOptions}.
 *
 * When passed to a request method, these options are recursively merged with default options.
 * The priority order is:
 * * {@link Mwbot.defaultRequestOptions} < {@link Mwbot.userRequestOptions} < Per-method request options
 *
 * where `userRequestOptions` is the options set by the user with the constructor or the `setRequestOptions`
 * method. Higher-priority options override lower ones if they share the same properties.
 */
export interface MwbotRequestConfig extends AxiosRequestConfig {
	/**
	 * Whether to disable request abortion.
	 *
	 * By default, all requests are abortable. Set this to `true` to explicitly disable this behavior.
	 */
	disableAbort?: boolean;
	/**
	 * Whether to disable automatic retries entirely. If set to `true`, no retries will be attempted
	 * for any type of failure.
	 *
	 * See also {@link disableRetryAPI}.
	 */
	disableRetry?: boolean;
	/**
	 * Whether to disable automatic retries for API-related errors. If set to `true`, retries will not
	 * be attempted for errors returned by the API itself.
	 *
	 * HTTP-related errors (e.g., `Request timeout (408)`) will still be retried.
	 */
	disableRetryAPI?: boolean;
	/**
	 * A list of error codes for which automatic retries should be disabled.
	 *
	 * If a request fails due to one of these error codes, it will not be retried.
	 */
	disableRetryByCode?: string[];
}

/**
 * Site and user information retrieved by {@link Mwbot.init}. Accessible via {@link Mwbot.info}.
 *
 * Note that there is nothing special about this interface. It mirrors the API response from
 * https://en.wikipedia.org/w/api.php?action=query&formatversion=2&meta=userinfo|siteinfo&uiprop=rights&siprop=general|namespaces|namespacealiases
 * (the endpoint may vary), **except** that `userinfo` is renamed to `user`.
 *
 * This interface ensures that certain optional properties in the API response are treated as non-optional after verification.
 */
export interface SiteAndUserInfo {
	// The utility types used here just make the verified properties non-optional
	user: Required<Pick<ApiResponseQueryMetaUserinfo, 'id' | 'name' | 'rights'>>;
	general: Pick<
		ApiResponseQueryMetaSiteinfoGeneral,
		'articlepath' | 'lang' | 'legaltitlechars' | 'script' | 'scriptpath' | 'server' | 'servername' | 'sitename' | 'generator' | 'wikiid'
	> & ApiResponseQueryMetaSiteinfoGeneral;
	interwikimap: ApiResponseQueryMetaSiteinfoInterwikimap[];
	namespaces: ApiResponseQueryMetaSiteinfoNamespaces;
	namespacealiases: ApiResponseQueryMetaSiteinfoNamespacealiases[];
}

/**
 * Schema for the object accessible via {@link Mwbot.config}.
 */
export interface ConfigData {
	wgArticlePath: string;
	wgCaseSensitiveNamespaces: number[];
	wgContentLanguage: string;
	wgContentNamespaces: number[];
	wgDBname: string;
	// wgExtraSignatureNamespaces: number[];
	wgFormattedNamespaces: Record<string, string>;
	// wgGlobalGroups: string[];
	wgLegalTitleChars: string;
	wgNamespaceIds: Record<string, number>;
	wgScript: string;
	wgScriptPath: string;
	wgServer: string;
	wgServerName: string;
	wgSiteName: string;
	// wgUserEditCount: number;
	// wgUserGroups: string[];
	wgUserId: number;
	wgUserName: string;
	wgUserRights: string[];
	wgVersion: string;
	wgWikiID: string;
	[key: string]: unknown;
}

// The following type definitions are substantial copies from the npm package `types-mediawiki`.

/**
 * Type used to define {@link MwConfig}.
 * @private
 */
export type TypeOrArray<T> = T | T[];

// Get/PickOrDefault<V, S, TD, TX> extracts values from V using key selection S
//  - TD is the value type of missing properties
//  - TX is the value type of unknown properties

/**
 * Type used to define {@link MwConfig}.
 * @private
 */
export type GetOrDefault<V, K extends PropertyKey, TD, TX = unknown> = K extends keyof V
    ? V extends Required<Pick<V, K>>
        ? V[K]
        : Required<V>[K] | TD
    : TX | TD;

/**
 * Type used to define {@link MwConfig}.
 * @private
 */
export type PickOrDefault<V, S extends TypeOrArray<PropertyKey>, TD, TX = unknown> = S extends Array<
    infer K
>
    ? { [P in K & PropertyKey]-?: GetOrDefault<V, P, TD, TX> }
    : GetOrDefault<V, S & PropertyKey, TD, TX>;

/**
 * The structure of {@link Mwbot.config}, designed to provide user-friendly Intellisense suggestions.
 *
 * This interface is essentially a TypeScript representation of
 * {@link https://www.mediawiki.org/wiki/ResourceLoader/Core_modules#mediaWiki.config | mw.config}
 * from MediaWiki core, with some adjustments for improved usability.
 *
 * See {@link Mwbot.config} for implementation details.
 * @private
 */
export interface MwConfig<V extends Record<string, any>, TX = unknown> {
	/**
	 * Get the value of one or more keys.
	 *
	 * If called with no arguments, all values are returned.
	 *
	 * @param selection Key or array of keys to retrieve values for.
	 * @param fallback Value for keys that don't exist.
	 * @returns If `selection` was a string, returns the value. If `selection` was an array, returns
	 * an object of key/values. If no `selection` is passed, a new object with all key/values is returned.
	 * Any type of the return value is a deep copy of the original stored in the instance.
	 */
	get<S extends TypeOrArray<keyof V>, TD>(selection: S, fallback: TD): PickOrDefault<V, S, TD, TX>;
	get<S extends TypeOrArray<string>, TD>(selection: S, fallback: TD): PickOrDefault<V, S, TD, TX>;
	get<S extends TypeOrArray<keyof V>>(selection: S): PickOrDefault<V, S, null, TX>;
	get<S extends TypeOrArray<string>>(selection: S): PickOrDefault<V, S, null, TX>;
	get(): V & Record<string, TX>;
	/**
	 * Set the value of one or more keys.
	 *
	 * @param selection Key to set value for, or object mapping keys to values.
	 * @param value Value to set (optional, only in use when key is a string).
	 * @returns `true` on success, `false` on failure.
	 *
	 * **NOTE**: The pre-set `wg`-configuration variables are read-only, and attempts to set a new value
	 * for them always return `false`.
	 */
	set<S extends keyof V>(selection: S, value: V[S]): boolean;
	set<S extends string>(selection: S, value: TX): boolean;
	set<S extends Partial<V> & Record<string, TX>>(selection: S): boolean;
	/**
	 * Check if a given configuration key exists.
	 *
	 * @param selection Key to check.
	 * @returns `true` if the key exists.
	 */
	exists(selection: keyof V): boolean;
	exists(selection: string): boolean;
}

// -------- Copies end --------

/**
 * Object that holds information about a revision, returned by {@link Mwbot.read}.
 *
 * See also https://www.mediawiki.org/wiki/API:Edit.
 */
export interface Revision {
	pageid: number;
	ns: number;
	title: string;
	baserevid: number;
	/** This property could be missing if the editor is revdel'd. */
	user?: string;
	basetimestamp: string;
	starttimestamp: string;
	content: string;
}