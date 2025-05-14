/**
 * The core module of `mwbot-ts`.
 *
 * See the documentation of the {@link Mwbot} class for the main entry point to the framework’s
 * functionalities, and refer to the {@link https://dr4goniez.github.io/mwbot-ts/docs/index.html | README}
 * for a getting started guide.
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

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
wrapper(axios);
import FormData from 'form-data';
import { XOR } from 'ts-xor';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';

import { MWBOT_VERSION } from './version';
import {
	MultiValue,
	ApiParams,
	ApiParamsAction,
	ApiParamsActionEdit,
	ApiParamsActionParse,
	ApiResponse,
	ApiResponseQueryMetaSiteinfoGeneral,
	ApiResponseQueryMetaSiteinfoNamespaces,
	ApiResponseQueryMetaSiteinfoNamespacealiases,
	ApiResponseQueryMetaTokens,
	ApiResponseQueryMetaUserinfo,
	ApiResponseQueryMetaSiteinfoInterwikimap,
	ApiResponseQueryMetaSiteinfoMagicwords,
	ApiResponseQueryMetaSiteinfoFunctionhooks,
	ApiResponseEdit,
	ApiResponseParse,
	ApiResponseQueryPages,
	PartiallyRequired
} from './api_types';
import { MwbotError, MwbotErrorData } from './MwbotError';
import * as Util from './Util';
const { mergeDeep, isPlainObject, isObject, sleep, isEmptyObject, arraysEqual, deepCloneInstance } = Util;
import * as mwString from './String';
import { TitleFactory, TitleStatic, Title } from './Title';
import { TemplateFactory, TemplateStatic, ParserFunctionStatic } from './Template';
import { WikilinkFactory, WikilinkStatic, FileWikilinkStatic, RawWikilinkStatic } from './Wikilink';
import { WikitextFactory, WikitextStatic, Wikitext } from './Wikitext';

// Imported only for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { MwbotErrorCodes } from './MwbotError';

/**
 * The core class of the `mwbot-ts` framework. This class provides a robust and extensible interface
 * for interacting with the MediaWiki API.
 *
 * It encapsulates authentication, API request logic, session handling, token management, and
 * parsers for working with wikitext elements such as titles, templates, wikilinks, and more.
 *
 * A `Mwbot` instance must be created using the static {@link init} method (not the protected constructor)
 * to ensure that all lazy-loaded classes, properties, and methods are properly initialized.
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
 * Mwbot.init(initOptions).then((mwbot) => {
 *   // Interact with MediaWiki using the mwbot instance...
 * });
 * ```
 *
 * **See also:**
 * - 🐙 {@link https://github.com/Dr4goniez/mwbot-ts | GitHub}
 * - 📦 {@link https://www.npmjs.com/package/mwbot-ts | npm}
 * - 📘 {@link https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.html | API Documentation}
 */
export class Mwbot {

	// ****************************** CLASS PROPERTIES ******************************

	/**
	 * The default configurations for HTTP requests.
	 *
	 * ```js
	 * {
	 *   method: 'GET',
	 *   headers: {
	 *     'User-Agent': `mwbot-ts/${MWBOT_VERSION} (https://github.com/Dr4goniez/mwbot-ts)`,
	 *     'Content-Type': 'application/x-www-form-urlencoded',
	 *     'Accept-Encoding': 'gzip'
	 *   },
	 *   params: {
	 *     action: 'query',
	 *     format: 'json',
	 *     formatversion: '2',
	 *     maxlag: 5
	 *   },
	 *   timeout: 60 * 1000, // 60 seconds
	 *   responseType: 'json',
	 *   responseEncoding: 'utf8'
	 * }
	 * ```
	 */
	static get defaultRequestOptions() {
		return {
			method: 'GET',
			headers: {
				'User-Agent': `mwbot-ts/${MWBOT_VERSION} (https://github.com/Dr4goniez/mwbot-ts)`,
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
	 * Axios instance for this intance.
	 */
	protected readonly axios: axios.AxiosInstance;
	/**
	 * A cookie jar that stores session and login cookies for this instance.
	 */
	protected readonly jar: CookieJar;
	/**
	 * Custom agents that manage keep-alive connections for HTTP requests.
	 * These are injected into the request options when using OAuth.
	 *
	 * See: https://www.mediawiki.org/wiki/Manual:Creating_a_bot#Bot_best_practices
	 */
	protected readonly agents: {
		http: http.Agent;
		https: https.Agent;
	};
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
	 * `String` library with functions to manipulate strings.
	 */
	static get String(): typeof mwString {
		return mwString;
	}
	/**
	 * The site and user information fetched by {@link _init}. Exposed to the user via {@link info}.
	 */
	protected _info: SiteAndUserInfo;
	/**
	 * Returns (a deep copy of) the site and user information fetched by {@link init}.
	 */
	get info(): SiteAndUserInfo {
		return mergeDeep(this._info);
	}
	/**
	 * Title class for this instance.
	 */
	protected _Title: TitleStatic;
	/**
	 * Title class for this instance.
	 */
	get Title(): TitleStatic {
		return this._Title;
	}
	/**
	 * Template class for this instance.
	 */
	protected _Template: TemplateStatic;
	/**
	 * Template class for this instance.
	 */
	get Template(): TemplateStatic {
		return this._Template;
	}
	/**
	 * ParserFunction class for this instance.
	 */
	protected _ParserFunction: ParserFunctionStatic;
	/**
	 * ParserFunction class for this instance.
	 */
	get ParserFunction(): ParserFunctionStatic {
		return this._ParserFunction;
	}
	/**
	 * Wikilink class for this instance.
	 */
	protected _Wikilink: WikilinkStatic;
	/**
	 * Wikilink class for this instance.
	 */
	get Wikilink(): WikilinkStatic {
		return this._Wikilink;
	}
	/**
	 * FileWikilink class for this instance.
	 */
	protected _FileWikilink: FileWikilinkStatic;
	/**
	 * FileWikilink class for this instance.
	 */
	get FileWikilink(): FileWikilinkStatic {
		return this._FileWikilink;
	}
	/**
	 * RawWikilink class for this instance.
	 */
	protected _RawWikilink: RawWikilinkStatic;
	/**
	 * RawWikilink class for this instance.
	 */
	get RawWikilink(): RawWikilinkStatic {
		return this._RawWikilink;
	}
	/**
	 * Wikitext class for this instance.
	 */
	protected _Wikitext: WikitextStatic;
	/**
	 * Wikitext class for this instance.
	 */
	get Wikitext(): WikitextStatic {
		return this._Wikitext;
	}

	// ****************************** CONSTRUCTOR-RELATED METHODS ******************************

	/**
	 * Creates a `Mwbot` instance.
	 *
	 * **This constructor is protected**. Call {@link init} instead.
	 *
	 * @param mwbotInitOptions Configuration object containing initialization settings and user credentials.
	 * @param requestOptions Custom request options applied to all HTTP requests issued by the new instance.
	 * @throws {MwbotError} If no valid API endpoint is provided or if the user credentials are malformed.
	 */
	protected constructor(mwbotInitOptions: MwbotInitOptions, requestOptions: MwbotRequestConfig) {

		const { credentials, ...options } = mergeDeep(mwbotInitOptions);
		requestOptions = mergeDeep(requestOptions);

		// Ensure that a valid URL is provided
		requestOptions.url = requestOptions.url || options.apiUrl;
		if (!requestOptions.url) {
			throw new MwbotError('fatal', {
				code: 'nourl',
				info: 'No valid API endpoint is provided.'
			});
		}

		// Determine authentication type
		this.credentials = Mwbot.validateCredentials(credentials);

		// Set up the User-Agent header if provided
		if (typeof options.userAgent === 'string') {
			requestOptions.headers ||= {};
			requestOptions.headers['User-Agent'] = options.userAgent;
		}

		// Initialize other class properties
		this.axios = axios.create();
		this.jar = new CookieJar();
		this.agents = {
			http: new http.Agent({ keepAlive: true }),
			https: new https.Agent({ keepAlive: true })
		};
		this.userMwbotOptions = options;
		this.userRequestOptions = requestOptions;
		this.abortions = [];
		this.tokens = {};
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
	protected static validateCredentials(credentials: Credentials): MwbotCredentials {
		if (!isPlainObject(credentials)) {
			throw new MwbotError('fatal', {
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
				throw new MwbotError('fatal', {
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
				throw new MwbotError('fatal', {
					code: 'invalidcreds',
					info: 'Invalid types for username or password.'
				});
			}
			case 4: {
				const { consumerToken, consumerSecret, accessToken, accessSecret } = credentials;
				if (
					typeof consumerToken === 'string' &&
					typeof consumerSecret === 'string' &&
					typeof accessToken === 'string' &&
					typeof accessSecret === 'string'
				) {
					const instance = new OAuth({
						consumer: { key: consumerToken, secret: consumerSecret },
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
				throw new MwbotError('fatal', {
					code: 'invalidcreds',
					info: 'Invalid OAuth credentials.'
				});
			}
			default:
				throw new MwbotError('fatal', {
					code: 'invalidcreds',
					info: `Invalid credential properties: ${keys.join(', ')}`
				});
		}
	}

	/**
	 * Initializes a new `Mwbot` instance.
	 *
	 * This static factory method should always be used to create instances of `Mwbot` or its subclasses.
	 * It handles token fetching, site info, and class initialization in one convenient place.
	 *
	 * > **Note:** The generic signature may look intimidating, but it’s designed to ensure subclasses
	 * > are constructed correctly while preserving type safety. You usually don’t need to worry about it.
	 *
	 * **Example:**
	 * ```ts
	 * import { Mwbot, MwbotInitOptions, MwbotRequestConfig } from 'mwbot-ts';
	 *
	 * const initOptions: MwbotInitOptions = {
	 *   apiUrl: 'https://en.wikipedia.org/w/api.php',
	 *   userAgent: 'MyCoolBot/1.0.0 (https://github.com/Foo/MyCoolBot)',
	 *   credentials: {
	 *     oAuth2AccessToken: '...'
	 *   }
	 * };
	 * const requestOptions: MwbotRequestConfig = { // This object is optional
	 *   // ...
	 * };
	 *
	 * Mwbot.init(initOptions, requestOptions).then((mwbot) => {
	 *   // Do something here and below...
	 * });
	 * ```
	 *
	 * @param mwbotInitOptions Configuration object containing initialization settings and user credentials.
	 * @param requestOptions Custom request options applied to all HTTP requests issued by the new instance.
	 * @throws {MwbotError} If no valid API endpoint is provided or if the user credentials are malformed.
	 */
	/*!
	 * Developer Note:
	 *
	 * The seemingly redundant generic parameters (`MwbotStatic`, `MwbotConstructor`) are intentional workarounds
	 * for TypeScript limitations:
	 *
	 * 1. Static methods cannot directly instantiate a class with a `protected` constructor,
	 *    even from within the same class or a subclass.
	 *
	 * 2. Subclasses calling `init()` would lose correct return type inference without these generics.
	 *
	 * `MwbotStatic` ensures that something like `class Mwbot2 extends Mwbot {}` is compatible with calling
	 * this static `init()` method, such that `Mwbot2.init(options).then(mwbot => ...)` correctly infers
	 * `mwbot` as an instance of `Mwbot2`. It is also important that we use "new this(...)" instead of "new Mwbot(...)".
	 * By using the former, subclasses instantiate their own classes, not the parent class, via this method.
	 *
	 * `MwbotConstructor` provides a constructor signature override as if the class had a public constructor,
	 * enabling instantiation within the method body via type-safe casting.
	 */
	static init<
		MwbotStatic extends PrototypeOf<Mwbot>,
		MwbotConstructor extends new (mwbotInitOptions: MwbotInitOptions, requestOptions: MwbotRequestConfig) => InstanceOf<MwbotStatic>,
	>(
		this: MwbotStatic,
		mwbotInitOptions: MwbotInitOptions,
		requestOptions: MwbotRequestConfig = {}
	): Promise<InstanceOf<MwbotStatic>> {
		return new (this as unknown as MwbotConstructor)(mwbotInitOptions, requestOptions)._init(1);
	}

	/**
	 * Internal handler for instance initialization.
	 *
	 * @param attemptIndex The number of times we have attempted initialization, including the current attempt.
	 * On a certain type of failure, a retry is attempted once (i.e., when this index is less than or equal to `2`).
	 * @returns A Promise resolving to the current instance, or rejecting with an error.
	 */
	protected async _init(attemptIndex: number): Promise<this> {

		const retryIfPossible = async (error: MwbotError, index: number): Promise<this> => {
			if (index < 2) {
				console.dir(error, { depth: 3 });
				console.log('Mwbot.init failed. Retrying once again in 5 seconds...');
				await sleep(5000);
				return this._init(index + 1);
			} else {
				throw error;
			}
		};

		// Log in if necessary
		if (this.credentials.user) {
			const { username, password } = this.credentials.user;
			await this.login(username, password);
		}

		// Get user and site info
		const res: ApiResponse = await this.get({
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
		if (
			!res || !res.query ||
			!userinfo || !functionhooks || !general || !magicwords || !namespaces || !namespacealiases
		) {
			return retryIfPossible(
				this.errorEmpty(false, '(check HTTP headers?)'),
				attemptIndex
			);
		} else if (userinfo.anon && !this.isAnonymous()) {
			return retryIfPossible(
				new MwbotError('api_mwbot', {
					code: 'badauth',
					info: 'Failed to authenticate the client as a registered user.'
				}),
				attemptIndex
			);
		}

		// Initialize mwbot.config
		const failedKeys = this.initConfigData(userinfo, general, namespaces, namespacealiases);
		if (failedKeys.length) {
			// Ensure that all the dependent config values are fetched successfully
			return retryIfPossible(
				new MwbotError('api_mwbot', {
					code: 'badvars',
					info: 'Failed to initialize wg-variables.'
				}, { keys: failedKeys }),
				attemptIndex
			);
		}

		// Set up instance properties
		const config = this.config;
		this._info = {
			functionhooks,
			general,
			magicwords,
			interwikimap,
			namespaces,
			namespacealiases,
			user: userinfo as SiteAndUserInfo['user']
		};
		this._Title = TitleFactory(
			// Pass individual properties instead of the instance to avoid redundant deep copies
			// from getter functions, improving efficiency in the factory function
			config,
			this._info
		);
		const { Template, ParsedTemplate, RawTemplate, ParserFunction, ParsedParserFunction } = TemplateFactory(config, this._info, this._Title);
		this._ParserFunction = ParserFunction;
		this._Template = Template;
		const { Wikilink, ParsedWikilink, FileWikilink, ParsedFileWikilink, RawWikilink, ParsedRawWikilink } = WikilinkFactory(config, this._Title);
		this._Wikilink = Wikilink;
		this._FileWikilink = FileWikilink;
		this._RawWikilink = RawWikilink;
		this._Wikitext = WikitextFactory(this, ParsedTemplate, RawTemplate, ParsedParserFunction, ParsedWikilink, ParsedFileWikilink, ParsedRawWikilink);

		console.log('Connection established: ' + config.get('wgServerName'));
		return this;

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
	setMwbotOptions(options: Partial<MwbotOptions>, merge = true): this {
		if (merge) {
			this.userMwbotOptions = mergeDeep(this.userMwbotOptions, options);
		} else {
			const { apiUrl } = this.userMwbotOptions;
			this.userMwbotOptions = mergeDeep({ apiUrl }, options);
		}
		if (!this.userMwbotOptions.apiUrl) {
			throw new MwbotError('fatal', {
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
	setRequestOptions(options: MwbotRequestConfig, merge = true): this {
		if (merge) {
			this.userRequestOptions = mergeDeep(this.userRequestOptions, options);
		} else {
			this.userRequestOptions = mergeDeep(options);
		}
		return this;
	}

	/**
	 * Returns the user's API limit for multi-value requests.
	 *
	 * @returns `500` for users with the `apihighlimits` permission; otherwise, `50`.
	 */
	get apilimit(): 500 | 50 {
		return this._info.user.rights.includes('apihighlimits') ? 500 : 50;
	}

	// ****************************** SITE-RELATED CONFIG ******************************

	/**
	 * Stores configuration values for the site and user.
	 */
	protected readonly configData: ConfigData = Object.create(null);

	/**
	 * The `wg`-keys of {@link ConfigData}, used in {@link config} to verify their existence.
	 */
	protected readonly configKeys: Set<keyof ConfigData> = new Set([
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
	]);

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
	 * ```ts
	 * get(selection?: string | string[], fallback = null): Mixed;
	 * ```
	 * * If `selection` is a string, returns the corresponding value.
	 * * If `selection` is an array, returns an object mapping each key to its value.
	 * * If no `selection` is provided, returns a new object containing all key-value pairs.
	 * * If a key does not exist, `fallback` is returned. This also applies when `selection`
	 * is an array: missing keys will be mapped to `fallback` in the returned object.
	 * * An explicit `undefined` for `fallback` results in `null` (unlike the native `mw.config`).
	 *
	 * ```ts
	 * set(selection?: string | object, value?: any): boolean;
	 * ```
	 * * If `selection` is a string, `value` must be provided. The key-value pair will be set accordingly.
	 * * If `selection` is an object, each key-value pair will be set.
	 * * Built-in `wg`-variables cannot be modified ― attempting to do so always returns `false`.
	 * * Returns `true` if at least one property is successfully set.
	 * * If `value` is `undefined`, the key is not set.
	 *
	 * ```ts
	 * exists(selection: string): boolean;
	 * ```
	 * * Returns `true` if `selection` exists as a key with a defined value.
	 */
	get config(): MwConfig<ConfigData> {
		return {
			get: <K extends keyof ConfigData, TD>(configName?: string | string[], fallback?: TD) => {
				const data = mergeDeep(this.configData); // Deep copy
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
				if (typeof selection === 'string' && this.configKeys.has(selection as K)) {
					warn(selection);
					return false;
				} else if (typeof selection === 'string' && value !== void 0) {
					this.configData[selection as string] = value;
					return true;
				} else if (isEmptyObject(selection) === false) {
					let registered = 0;
					const wgVars = new Set<string>();
					for (const [k, v] of Object.entries(<U>selection)) {
						if (this.configKeys.has(k)) {
							wgVars.add(k);
						} else if (v !== void 0) {
							this.configData[k] = v;
							registered++;
						}
					}
					if (wgVars.size) {
						warn(Array.from(wgVars).join(', '));
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
	 * Initializes the configuration values with site and user data.
	 *
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
		const wgNamespaceIds = namespacealiases.reduce((acc: Record<string, number>, { id, alias }) => {
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
	 * Performs a raw HTTP request.
	 *
	 * **NOTE**: This method does ***not*** inject most instance-specific settings
	 * into the request config — except for session/cookie handling and cancellation.
	 *
	 * @param requestOptions The complete user-defined Axios request config.
	 * @returns A Promise that resolves to the raw Axios response.
	 */
	rawRequest(requestOptions: MwbotRequestConfig): Promise<AxiosResponse> {

		// If `_cloned` is not set, assume this method is being called externally
		// Clone the config and inject necessary instance-specific settings
		if (!requestOptions._cloned) {
			requestOptions = mergeDeep(requestOptions);
			requestOptions._cloned = true;

			// Inject httpAgent/httpsAgent to handle TCP connections
			if (this.usingOAuth()) {
				requestOptions.httpAgent = this.agents.http;
				requestOptions.httpsAgent = this.agents.https;

				// Per Axios's guidance on request configuration, proxy should be disabled when supplying
				// a custom httpAgent/httpsAgent; otherwise, environment variables may affect proxy handling,
				// leading Axios to return a confusing `503 Service Unavailable` error.
				// See https://axios-http.com/docs/req_config and https://github.com/axios/axios/issues/5214
				requestOptions.proxy = false;
			} else {
				// axios-cookiejar-support uses its own agents
				requestOptions.jar = this.jar;
				requestOptions.withCredentials = true;
			}
		}

		// Setup AbortController
		if (!requestOptions.disableAbort) {
			const controller = new AbortController();
			requestOptions.signal = controller.signal;
			this.abortions.push(controller);
		}

		// Make the request
		return this.axios(requestOptions);

	}

	/**
	 * Checks whether the client is configured to use OAuth (v1 or v2).
	 *
	 * @returns `true` if either `oauth1` or `oauth2` credentials are set; otherwise, `false`.
	 */
	protected usingOAuth(): boolean {
		const { oauth2, oauth1 } = this.credentials;
		return !!(oauth2 || oauth1);
	}

	/**
	 * Performs an HTTP request to the MediaWiki API.
	 *
	 * @param parameters Parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the API response or rejecting with an error.
	 */
	async request(
		parameters: ApiParams,
		requestOptions: MwbotRequestConfig & ReadRequestConfig = {}
	): Promise<ApiResponse> {

		// Preprocess the request options
		if (!requestOptions._cloned) {
			requestOptions = mergeDeep(requestOptions);
			requestOptions._cloned = true;
		}
		requestOptions = mergeDeep(Mwbot.defaultRequestOptions, this.userRequestOptions, requestOptions);
		requestOptions.params = mergeDeep(requestOptions.params, parameters);
		const { length, hasLongFields } = this.preprocessParameters(requestOptions.params);
		if (requestOptions.params.format !== 'json') {
			throw new MwbotError('api_mwbot', {
				code: 'invalidformat',
				info: 'Expected "format=json" in request parameters.'
			});
		}
		requestOptions.url = this.userMwbotOptions.apiUrl || requestOptions.url;
		requestOptions.headers ||= {};
		requestOptions.headers['User-Agent'] = this.userMwbotOptions.userAgent || requestOptions.headers['User-Agent'];

		// Preprocess the request method
		let method = String(requestOptions.method).toUpperCase();
		const autoMethod = requestOptions.method !== 'POST' && !!requestOptions.autoMethod;
		delete requestOptions.autoMethod;
		const baseUrl = this.config.get('wgScriptPath') + '/api.php?';
		const baseUrlLength = new TextEncoder().encode(baseUrl).length;
		if (autoMethod && length + baseUrlLength > 2084) {
			method = 'POST';
		}
		if (method === 'POST') {
			await this.handlePost(requestOptions, hasLongFields); // Encode params to data
		} else if (method !== 'GET') {
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
	 * @param attemptCount The number of attemps that have been made so far.
	 * @returns A Promise resolving to the API response or rejecting with an error.
	 */
	protected async _request(requestOptions: MwbotRequestConfig, attemptCount?: number): Promise<ApiResponse> {

		attemptCount = (attemptCount ?? 0) + 1;
		if (!requestOptions._cloned) {
			requestOptions = mergeDeep(requestOptions);
			requestOptions._cloned = true;
		}

		// Clone params early since POST requests will delete them from `requestOptions`
		const clonedParams: ApiParams = { ...requestOptions.params };
		if (requestOptions.method === 'POST') {
			// The API throws a "mustpostparams" error if it finds certain parameters in "params", even when "data"
			// in the request body is well-formed
			delete requestOptions.params;
		}

		// Enforce an interval if necessary
		const { interval, intervalActions = Mwbot.defaultIntervalActions } = this.userMwbotOptions;
		const requiresInterval = (intervalActions as (ApiParamsAction | '')[]).includes(clonedParams.action || '');
		if (requiresInterval && this.lastRequestTime && (interval === void 0 || +interval > 0)) {
			const sleepDuration = (typeof interval === 'number' ? interval : 4800) - (Date.now() - this.lastRequestTime);
			await sleep(sleepDuration); // sleep clamps negative values automatically
		}

		// Make the request and process the response
		return this.rawRequest(requestOptions).then(async (response): Promise<ApiResponse> => {

			const data: ApiResponse | undefined = response.data;

			// Show warnings only for the first request because retries use the same request body
			if (attemptCount === 1) {
				this.showWarnings(data?.warnings);
			}

			if (!data) {
				this.errorEmpty(true, '(check HTTP headers?)', { axios: response });
			}
			if (typeof data !== 'object') {
				// In most cases the raw HTML of [[Main page]]
				throw new MwbotError('api_mwbot', {
					code: 'invalidjson',
					info: 'No valid JSON response (check the request URL?)'
				}, { axios: response });
			}
			if ('error' in data || 'errors' in data) {

				const err = MwbotError.newFromResponse(data as Required<Pick<ApiResponse, "error">> | Required<Pick<ApiResponse, "errors">>);

				// Handle error codes
				if (err.code === 'missingparam' && this.isAnonymous() && err.info.includes('The "token" parameter must be set')) {
					this.errorAnonymous();
				}

				if (!requestOptions.disableRetryAPI) {
					// Handle retries
					switch (err.code) {
						case 'badtoken':
						case 'notoken':
							if (this.isAnonymous()) {
								this.errorAnonymous();
							}
							if (requestOptions.method === 'POST' && clonedParams.action && !requestOptions.disableRetryByCode?.includes(clonedParams.action)) {
								const tokenType = await this.getTokenType(clonedParams.action); // Identify the required token type
								if (!tokenType) {
									throw err;
								}
								console.warn(`Warning: Encountered a "${err.code}" error.`);
								this.badToken(tokenType);
								delete clonedParams.token;

								return await this.retry(err, attemptCount, clonedParams, requestOptions, 2, 0, () => {
									return this.postWithToken(tokenType, clonedParams);
								});
							}
							break;

						case 'readonly':
							console.warn(`Warning: Encountered a "${err.code}" error.`);
							return await this.retry(err, attemptCount, clonedParams, requestOptions, 3, 10);

						case 'maxlag': {
							console.warn(`Warning: Encountered a "${err.code}" error.`);
							const retryAfter = parseInt(response?.headers?.['retry-after']) ?? 5;
							return await this.retry(err, attemptCount, clonedParams, requestOptions, 4, retryAfter);
						}

						case 'assertbotfailed':
						case 'assertuserfailed':
							if (!this.isAnonymous()) {
								console.warn(`Warning: Encountered an "${err.code}" error.`);
								let retryAfter = 10;
								const { username, password } = this.credentials.user || {};
								if (username && password) {
									console.log('Re-logging in...');
									const loggedIn = await this.login(username, password).catch((err: MwbotError) => err);
									if (loggedIn instanceof MwbotError) {
										console.dir(loggedIn, { depth: 3 });
										throw err;
									}
									console.log('Re-login successful.');
									if (requestOptions.method === 'POST' && clonedParams.token &&
										clonedParams.action && !requestOptions.disableRetryByCode?.includes(clonedParams.action)
									) {
										console.log('Will retry if possible...');
										const tokenType = await this.getTokenType(clonedParams.action);
										if (!tokenType) {
											throw err;
										}
										const token = await this.getToken(tokenType).catch(() => null);
										if (!token) {
											throw err;
										}
										clonedParams.token = token;
										requestOptions.params = clonedParams;
										delete requestOptions.data;
										const formatted = await this.handlePost(requestOptions, false).catch(() => null);
										if (formatted === null) {
											throw err;
										}
										delete requestOptions.params;
										retryAfter = 0;
									}
								}
								return await this.retry(err, attemptCount, clonedParams, requestOptions, 2, retryAfter);
							}
							break;

						case 'mwoauth-invalid-authorization':
							// Per https://phabricator.wikimedia.org/T106066, "Nonce already used" indicates
							// an upstream memcached/redis failure which is transient
							if (err.info.includes('Nonce already used')) {
								return await this.retry(err, attemptCount, clonedParams, requestOptions, 2, 10);
							}
					}
				}

				throw err;

			}

			if (requiresInterval) {
				// Save the current time for intervals as needed
				this.lastRequestTime = Date.now();
			}
			return data;

		}).catch(async (error: AxiosError | MwbotError): Promise<ApiResponse> => {

			// Immediately throw an error caught in the then() block
			if (!isAxiosError(error)) {
				throw error;
			}

			const err = new MwbotError('api_mwbot', {
				code: 'http',
				info: 'HTTP request failed.'
			});

			if (error && error.code === 'ERR_CANCELED') {
				throw err.setCode('aborted').setInfo('Request aborted by the user.');
			}

			err.data = { axios: error }; // Include the full response for debugging
			const status = error?.response?.status ?? error?.status;
			if (typeof status === 'number' && status >= 400) {
				// Articulate the error object for common errors
				switch (status) {
					case 404:
						throw err.setCode('notfound').setInfo(`Page not found (404): ${requestOptions.url!}.`);
					case 408:
						return await this.retry(
							err.setCode('timeout').setInfo('Request timeout (408).'),
							attemptCount, clonedParams, requestOptions
						);
					case 414:
						throw err.setCode('baduri').setInfo('URI too long (414): Consider using a POST request.');
					case 429:
						return await this.retry(
							err.setCode('ratelimited').setInfo('Too many requests (429).'),
							attemptCount, clonedParams, requestOptions
						);
					case 500:
						return await this.retry(
							err.setCode('servererror').setInfo('Internal server error (500).'),
							attemptCount, clonedParams, requestOptions
						);
					case 502:
						return await this.retry(
							err.setCode('badgateway').setInfo('Bad gateway (502): Perhaps the server is down?'),
							attemptCount, clonedParams, requestOptions
						);
					case 503:
						return await this.retry(
							err.setCode('serviceunavailable').setInfo('Service Unavailable (503): Perhaps the server is down?'),
							attemptCount, clonedParams, requestOptions
						);
					case 504:
						return await this.retry(
							err.setCode('timeout').setInfo('Gateway timeout (504)'),
							attemptCount, clonedParams, requestOptions
						);
				}
			}

			throw err;

		});

	}

	/**
	 * Massages parameters from the nice format we accept into a format suitable for the API.
	 *
	 * @param parameters (modified in-place)
	 * @returns An object containing:
	 * - `length`: The UTF-8 byte length of the encoded query string.
	 * - `hasLongFields`: Whether any field value exceeds 8000 characters.
	 */
	protected preprocessParameters(parameters: ApiParams): { length: number; hasLongFields: boolean } {
		let hasLongFields = false;
		const markIfLongField = (value: string): void => {
			hasLongFields ||= value.length > 8000;
		};
		if (!this.isAnonymous()) {
			// Enforce { assert: 'user' } for logged-in users
			parameters.assert = 'user';
		}
		Object.entries(parameters).forEach(([key, val]) => {
			if (Array.isArray(val)) {
				// Multi-value fields must be stringified
				let str: string;
				if (!val.join('').includes('|')) {
					str = val.join('|');
				} else {
					str = '\x1f' + val.join('\x1f');
				}
				parameters[key] = str;
				markIfLongField(str);
			} else if (val === false || val === undefined) {
				// Boolean values are only false when not given at all
				delete parameters[key];
			} else if (val === true) {
				// Boolean values cause error with multipart/form-data requests
				parameters[key] = '1';
			} else if (val instanceof Date) {
				parameters[key] = val.toISOString();
			} else {
				markIfLongField(String(val));
			}
		});

		// Calculate the actual UTF-8 byte length of the encoded query string
		const query = new URLSearchParams(parameters as Record<string, string>).toString();
		const length = new TextEncoder().encode(query).length;

		return { length, hasLongFields };
	}

	/**
	 * Handles data encoding for POST requests (calls {@link handlePostMultipartFormData} for `multipart/form-data`).
	 *
	 * @param requestOptions The HTTP request options to modify.
	 * @param hasLongFields A boolean indicating whether the parameters have a long field.
	 */
	protected async handlePost(requestOptions: MwbotRequestConfig, hasLongFields: boolean): Promise<void> {

		if (!requestOptions._cloned) {
			requestOptions = mergeDeep(requestOptions);
			requestOptions._cloned = true;
		}

		// Ensure the token parameter is last (per [[mw:API:Edit#Token]])
		// The token will be kept away if the user is anonymous
		const { params } = requestOptions;
		const token = params.token as string | undefined;
		if (token) {
			delete params.token;
		}

		// Non-write API requests should be processed in the closest data center
		/** @see https://www.mediawiki.org/wiki/API:Etiquette#Other_notes */
		requestOptions.headers ||= {};
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
				params.token = token;
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
		if (!requestOptions._cloned) {
			requestOptions = mergeDeep(requestOptions);
			requestOptions._cloned = true;
		}
		const { params } = requestOptions;
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
			params.token = token;
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
		if (!requestOptions._cloned) {
			requestOptions = mergeDeep(requestOptions);
			requestOptions._cloned = true;
		}
		requestOptions.headers ||= {};
		const { oauth2, oauth1 } = this.credentials;
		const configureKeepAliveAgents = (): void => {
			requestOptions.httpAgent = this.agents.http;
			requestOptions.httpsAgent = this.agents.https;
			requestOptions.proxy = false;
		};
		if (oauth2) {
			// OAuth 2.0
			requestOptions.headers.Authorization = `Bearer ${oauth2}`;
			configureKeepAliveAgents();
		} else if (oauth1) {
			// OAuth 1.0a
			if (!requestOptions.url || !requestOptions.method) {
				throw new TypeError('[Internal] OAuth 1.0 requires both "url" and "method" to be set before authentication.');
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
			configureKeepAliveAgents();
		} else {
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
	protected isAnonymous(): boolean {
		return !!this.credentials.anonymous;
	}

	/**
	 * Logs warnings returned from the API to the console unless suppressed.
	 *
	 * @param warnings Warnings returned by the API, if any.
	 */
	protected showWarnings(warnings: ApiResponse['warnings']): void {
		if (!warnings || this.userMwbotOptions.suppressWarnings) {
			return;
		}
		if (Array.isArray(warnings)) {
			// Newer error formats
			for (const { module, ...obj } of warnings) {
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
	 * Throws an `api_mwbot: anonymous` error.
	 *
	 * @throws
	 */
	protected errorAnonymous(): never {
		throw new MwbotError('api_mwbot', {
			code: 'anonymous',
			info: 'Anonymous users are limited to non-write requests.'
		});
	}

	/**
	 * Throws or returns an `api_mwbot: empty` error.
	 *
	 * @param die Whether to throw the error (default: `true`). If `false`, the error object
	 * is returned instead of being thrown.
	 * @param additionalInfo Optional text to append after `'OK response but empty result'`.
	 * A space is automatically prepended if provided; otherwise, a period is appended.
	 * @param data Optional data object to set to the error.
	 */
	protected errorEmpty(die?: true, additionalInfo?: string, data?: MwbotErrorData): never;
	protected errorEmpty(die: false, addtionalInfo?: string, data?: MwbotErrorData): MwbotError<'api_mwbot'>;
	protected errorEmpty(die = true, addtionalInfo?: string, data?: MwbotErrorData): never | MwbotError<'api_mwbot'> {
		die ??= true;
		const info = 'OK response but empty result' + (addtionalInfo ? ' ' + addtionalInfo : '.');
		const error = new MwbotError('api_mwbot', {
			code: 'empty',
			info
		}, data);
		if (die) {
			throw error;
		} else {
			return error;
		}
	}

	/**
	 * Attempts to retry a failed request under the following conditions:
	 * - The number of requests issued so far is less than the allowed maximum (`maxAttempts`).
	 * - {@link MwbotRequestConfig.disableRetry} is not set to `true`.
	 * - {@link MwbotRequestConfig.disableRetryByCode} is either unset or does not contain the error code from `initialError`.
	 *
	 * Note: {@link MwbotRequestConfig.disableRetryAPI} must be evaluated in the `then` block of {@link request}, rather than here.
	 *
	 * @param initialError The error that triggered the retry attempt.
	 * @param attemptCount The number of attemps that have been made so far.
	 * @param params Request parameters. Since {@link _request} might have deleted them, they are re-injected as needed.
	 * @param requestOptions The original request options, using which we make another request.
	 * @param maxAttempts The maximum number of attempts (including the first request). Default is 2 (one retry after failure).
	 * @param sleepSeconds The delay in seconds before retrying. Default is 10.
	 * @param retryCallback A function to execute when attempting the retry. If not provided, {@link _request} is called on `requestOptions`.
	 * @returns A Promise of the retry request, or rejecting with an error.
	 */
	protected async retry(
		initialError: MwbotError,
		attemptCount: number,
		params: ApiParams,
		requestOptions: MwbotRequestConfig,
		maxAttempts = 2,
		sleepSeconds = 10,
		retryCallback?: () => Promise<ApiResponse>
	): Promise<ApiResponse> {

		const { disableRetry, disableRetryByCode } = requestOptions;
		const shouldRetry =
			attemptCount < maxAttempts &&
			!disableRetry &&
			(!disableRetryByCode || !disableRetryByCode.includes(initialError.code));

		// Check if we should retry the request
		if (shouldRetry) {
			console.dir(initialError, { depth: 3 });
			if (sleepSeconds) {
				console.log(`Retrying in ${sleepSeconds} seconds...`);
			} else {
				console.log('Retrying...');
			}
			await sleep(sleepSeconds * 1000);
			if (typeof retryCallback === 'function') {
				delete requestOptions._cloned;
				delete requestOptions.signal;
				return retryCallback();
			} else {
				requestOptions.params = params;
				return this._request(requestOptions, attemptCount);
			}
		}

		// If retry conditions aren't met, reject with the error
		throw initialError;

	}

	/**
	 * Aborts all unfinished HTTP requests issued by this instance.
	 */
	abort(): this {
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
	get(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
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
	post(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
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
	nonwritePost(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
		if (!requestOptions._cloned) {
			requestOptions = mergeDeep(requestOptions);
			requestOptions._cloned = true;
		}
		requestOptions.method = 'POST';
		requestOptions.headers ||= {};
		requestOptions.headers['Promise-Non-Write-API-Action'] = true;
		return this.request(parameters, requestOptions);
	}

	/**
	 * Performs an HTTP request to fetch data, defaulting to the `'GET'` method,
	 * but automatically switches to `'POST'` if the request parameters are too long.
	 *
	 * This is a shorthand for calling `request(params, { autoMethod: true })`.
	 *
	 * @param parameters Parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the API response or rejecting with an error.
	 */
	fetch(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
		if (!requestOptions._cloned) {
			requestOptions = mergeDeep(requestOptions);
			requestOptions._cloned = true;
		}
		requestOptions.method = 'GET';
		(requestOptions as MwbotRequestConfig & ReadRequestConfig).autoMethod = true;
		return this.request(parameters, requestOptions);
	}

	/**
	 * Performs API requests that automatically continue until the limit is reached.
	 *
	 * This method is designed for API modules that support continuation using a `continue`
	 * property in the response.
	 *
	 * **Usage Note**: If applicable, ensure the API parameters include a `**limit` value set
	 * to `'max'` to retrieve the maximum number of results per request.
	 *
	 * @param parameters Parameters to send to the API.
	 * @param options Optional continuation and batching settings.
	 * @param options.rejectProof
	 * * If `false` (default), rejects the Promise if any internal API request fails, discarding
	 *   all previously retrieved responses.
	 * * If `true`, failed requests are caught and appended as {@link MwbotError} into the result
	 *   array.
	 * @param options.limit
	 * The maximum number of continuation cycles (default: `10`). Must be a positive integer or
	 * `Infinity`.
	 * @param options.multiValues
	 * The key or keys of multi-value fields that must be split into batches of up to {@link apilimit}.
	 * Specifying this option incorporates the function of {@link massRequest}. See the throw conditions
	 * of {@link createBatchArray} for the validation of these fields.
	 * @param requestOptions Optional HTTP request options.
	 * @returns
	 * * If `rejectProof` is `false`, resolves to an array of API responses.
	 * * If `rejectProof` is `true`, resolves to the same, but can include error objects.
	 *
	 * NOTE: If `multiValues` is set and the relevant fields are empty arrays, returns an empty array.
	 * @throws
	 * On error unless `rejectProof` is enabled. Also throws if `multiValues` fields are invalid.
	 */
	continuedRequest(
		parameters: ApiParams,
		options?: { rejectProof?: false; limit?: number; multiValues?: string | string[] },
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponse[]>;
	continuedRequest(
		parameters: ApiParams,
		options: { rejectProof: true; limit?: number; multiValues?: string | string[] },
		requestOptions?: MwbotRequestConfig
	): Promise<(ApiResponse | MwbotError)[]>;
	async continuedRequest(
		parameters: ApiParams,
		options: { rejectProof?: boolean; limit?: number; multiValues?: string | string[] } = {},
		requestOptions: MwbotRequestConfig = {}
	): Promise<(ApiResponse | MwbotError)[]> {

		const { rejectProof = false, limit = 10, multiValues } = options;

		// Validate limit
		if ((!Number.isInteger(limit) && limit !== Infinity) || limit <= 0) {
			throw new MwbotError('fatal', {
				code: 'invalidlimit',
				info: '"limit" must be a positive integer.'
			});
		}

		// If `multiValues` is provided, split multi-value fields
		let batchArray: string[][] | null = null;
		let multiKeys: string[] = [];
		if (multiValues) {
			multiKeys = Array.isArray(multiValues) ? multiValues : [multiValues];
			batchArray = this.createBatchArray(parameters, multiKeys);
			if (!batchArray.length) return [];
		}

		const request = async (params: ApiParams): Promise<(ApiResponse | MwbotError)[]> => {
			const ret: (ApiResponse | MwbotError)[] = [];
			try {
				let count = 0;
				let currentParams = { ...params };
				while (count < limit) {
					const res = await this.fetch(currentParams, requestOptions);
					ret.push(res);
					count++;
					if (!res.continue) break;
					currentParams = { ...currentParams, ...res.continue };
				}
				return ret;
			} catch (err) {
				if (rejectProof) {
					ret.push(err as MwbotError);
					return ret;
				}
				throw err;
			}
		};

		// Send API requests
		const promise: Promise<(ApiResponse | MwbotError)[]>[] = [];
		if (batchArray) {
			for (const multiValues of batchArray) {
				const batchString = multiValues.join('|');
				const batchParams: ApiParams = {
					...parameters,
					...Object.fromEntries(multiKeys.map(k => [k, batchString]))
				};
				promise.push(request(batchParams));
			}
		} else {
			promise.push(request(parameters));
		}
		return (await Promise.all(promise)).flat();

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
	 * @param batchSize Optional batch size (defaults to the {@link apilimit}`). Must be a positive integer
	 * less than or equal to `apilimit`.
	 * @param requestOptions Optional HTTP request options.
	 * @returns
	 * A Promise resolving to an array of API responses or {@link MwbotError} objects for failed requests.
	 * The array will be empty if no values are provided to batch.
	 * @throws See the throw conditions of {@link createBatchArray}.
	 */
	async massRequest(
		parameters: ApiParams,
		keys: string | string[],
		batchSize?: number,
		requestOptions: MwbotRequestConfig = {}
	): Promise<(ApiResponse | MwbotError)[]> {

		// Create batch array
		keys = Array.isArray(keys) ? keys : [keys];
		const batchArray = this.createBatchArray(parameters, keys, batchSize);
		if (!batchArray.length) {
			return [];
		}

		// Prepare API batches
		const batchParams: ApiParams[] = [];
		for (const multiValues of batchArray) {
			const batchArrayStr = multiValues.join('|');
			batchParams.push({
				...parameters,
				...Object.fromEntries(keys.map((key) => [key, batchArrayStr]))
			});
		}

		// Send API requests in batches of 100
		const results: (ApiResponse | MwbotError)[] = [];
		for (let i = 0; i < batchParams.length; i += 100) {
			const batch = batchParams.slice(i, i + 100).map((params) =>
				this.fetch(params, requestOptions).catch((err: MwbotError) => err)
			);
			const batchResults = await Promise.all(batch);
			results.push(...batchResults);
		}
		return results;

	}

	/**
	 * Creates a batch array for an API request involving multi-value fields.
	 *
	 * Each batch will contain up to `batchSize` values (or {@link apilimit} if not provided),
	 * and all specified keys must refer to identical arrays of strings. This ensures
	 * consistent batching across all multi-value fields.
	 *
	 * @param parameters The API parameters object.
	 * @param keys An array of parameter names that are expected to hold multiple values.
	 * @param batchSize
	 * Optional maximum number of items per batch. Must be a positive integer less than or
	 * equal to `apilimit` (defaults to `apilimit`).
	 * @returns An array of string arrays, each representing a single API batch.
	 *
	 * @throws {MwbotError} If:
	 * - `keys` is an empty array. (`emptyinput`)
	 * - Any element in `keys` is not a string. (`typemismatch`)
	 * - The corresponding `parameters[key]` is not an array. (`typemismatch`)
	 * - The arrays for multiple fields are not identical. (`fieldmismatch`)
	 * - No valid multi-value fields are found. (`nofields`)
	 * - `batchSize` is invalid. (`invalidsize`)
	 */
	protected createBatchArray(
		parameters: ApiParams,
		keys: string[],
		batchSize?: number
	): string[][] {

		// Validadate the batch size
		const apilimit = this.apilimit;
		if (typeof batchSize === 'number') {
			if (!Number.isInteger(batchSize) || batchSize > apilimit || batchSize <= 0) {
				throw new MwbotError('fatal', {
					code: 'invalidsize',
					info: `"batchSize" must be a positive integer less than or equal to ${apilimit}.`
				});
			}
		} else {
			batchSize = apilimit;
		}

		if (!keys.length) {
			throw new MwbotError('fatal', {
				code: 'emptyinput',
				info: '"keys" cannot be empty.'
			});
		}

		// Extract multi-value field
		let batchValues: string[] | null = null;
		for (const key of keys) {
			if (typeof key !== 'string') {
				throw new MwbotError('fatal', {
					code: 'typemismatch',
					info: `Expected a string (element) for "keys", but got ${typeof key}.`
				});
			}
			const value = parameters[key];
			if (!Array.isArray(value)) {
				throw new MwbotError('fatal', {
					code: 'typemismatch',
					info: `Expected an array for the "${key}" parameter, but got ${typeof value}.`
				});
			}
			if (batchValues === null) {
				batchValues = [...value] as string[]; // Copy the array
			} else if (!arraysEqual(batchValues, value, true)) {
				throw new MwbotError('fatal', {
					code: 'fieldmismatch',
					info: 'All multi-value fields must be identical.'
				});
			}
		}

		if (!batchValues) {
			throw new MwbotError('fatal', {
				code: 'nofields',
				info: 'No multi-value fields were found.'
			});
		}

		const batchArray: string[][] = [];
		for (let i = 0; i < batchValues.length; i += batchSize) {
			batchArray.push(batchValues.slice(i, i + batchSize));
		}
		return batchArray;

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
	 * ```ts
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
	async postWithToken(tokenType: string, parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
		if (this.isAnonymous()) {
			this.errorAnonymous();
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
		const err = await this.post(parameters, mergeDeep(requestOptions)).catch((err: MwbotError) => err);
		if (!(err instanceof MwbotError)) {
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
	async getToken(
		tokenType: string,
		additionalParams?: ApiParams | 'user' | 'bot' | 'anon',
		requestOptions: MwbotRequestConfig = {}
	): Promise<string> {

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
		const res = await this.get(params, requestOptions);
		const resToken = res.query?.tokens;
		if (resToken && isEmptyObject(resToken) === false) {
			this.tokens = resToken; // Update cashed tokens
			const token = resToken[tokenName];
			if (token) {
				return token;
			} else {
				throw new MwbotError('api_mwbot', {
					code: 'badnamedtoken',
					info: 'Could not find a token named "' + tokenType + '" (check for typos?)'
				});
			}
		} else {
			this.errorEmpty();
		}
	}

	/**
	 * Converts legacy token types to `csrf`.
	 *
	 * @param action
	 * @returns
	 */
	protected static mapLegacyToken(action: string): string {
		action = String(action).replace(/token$/, '');
		const csrfActions = new Set([
			'edit',
			'delete',
			'protect',
			'move',
			'block',
			'unblock',
			'email',
			'import',
			'options'
		]);
		if (csrfActions.has(action)) {
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
	badToken(tokenType: string): this {
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
	postWithCsrfToken(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
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
	getCsrfToken(requestOptions: MwbotRequestConfig = {}): Promise<string> {
		return this.getToken('csrf', void 0, requestOptions);
	}

	// ****************************** EDIT-RELATED REQUEST METHODS ******************************

	/**
	 * Validates and processes a title before use, and returns a {@link Title} instance.
	 * This method is used to normalize user input and ensure the title is valid for API access.
	 * If any validation fails, it throws an {@link MwbotError}.
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param allowAnonymous Whether to allow anonymous users to proceed. Defaults to `false`.
	 * @returns A validated {@link Title} instance.
	 * @throws If:
	 * - The user is anonymous while `allowAnonymous` is `false`.
	 * - The title is neither a string nor a {@link Title} instance.
	 * - The title is empty.
	 * - The title is interwiki.
	 * - The title is in the Special or Media namespace.
	 */
	protected validateTitle(title: string | Title, allowAnonymous = false): Title {
		if (this.isAnonymous() && !allowAnonymous) {
			this.errorAnonymous();
		}
		if (typeof title !== 'string' && !(title instanceof this.Title)) {
			throw new MwbotError('fatal', {
				code: 'typemismatch',
				info: `"${typeof title}" is not a valid type.`
			});
		}
		if (!(title instanceof this.Title)) {
			const t = this.Title.newFromText(title);
			if (!t) {
				throw new MwbotError('api_mwbot', {
					code: 'invalidtitle',
					info: `"${title}" is not a valid title.`
				});
			}
			title = t;
		}
		if (!title.getMain()) {
			throw new MwbotError('api_mwbot', {
				code: 'emptytitle',
				info: 'The title is empty.'
			});
		}
		if (title.isExternal()) {
			throw new MwbotError('api_mwbot', {
				code: 'interwikititle',
				info: `"${title.getPrefixedText()}" is an interwiki title.`
			});
		}
		if (title.getNamespaceId() < 0) {
			throw new MwbotError('api_mwbot', {
				code: 'specialtitle',
				info: `"${title.getPrefixedText()}" is a special-namespace title.`
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
	protected async _save(
		title: Title,
		content: string,
		summary?: string,
		internalOptions: ApiParamsActionEdit = {},
		additionalParams: ApiParamsActionEdit = {},
		requestOptions: MwbotRequestConfig = {}
	): Promise<ApiResponseEditSuccess> {
		const params: ApiParamsActionEdit = Object.assign(
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
			additionalParams
		);
		const res = await this.postWithCsrfToken(params as ApiParams, requestOptions);
		if (res.edit?.result === 'Success') {
			return res.edit as ApiResponseEditSuccess;
		}
		throw new MwbotError('api_mwbot', {
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
	async create(
		title: string | Title,
		content: string,
		summary?: string,
		additionalParams: ApiParamsActionEdit = {},
		requestOptions: MwbotRequestConfig = {}
	): Promise<ApiResponseEditSuccess> {
		return this._save(this.validateTitle(title), content, summary, { createonly: true }, additionalParams, requestOptions);
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
	async save(
		title: string | Title,
		content: string,
		summary?: string,
		additionalParams: ApiParamsActionEdit = {},
		requestOptions: MwbotRequestConfig = {}
	): Promise<ApiResponse> {
		return this._save(this.validateTitle(title), content, summary, { nocreate: true }, additionalParams, requestOptions);
	}

	/**
	 * Retrieves the latest revision content of a given title from the API.
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the revision information.
	 * @throws If:
	 * - `title` is neither a string nor a {@link Title} instance.
	 * - `title` is invalid or empty.
	 * - `title` is an interwiki title.
	 * - The title is in the Special or Media namespace.
	 * - The requested title does not exist.
	 */
	async read(title: string | Title, requestOptions?: MwbotRequestConfig): Promise<Revision>;
	/**
	 * Retrieves the latest revision contents of multiple titles from the API.
	 *
	 * This method returns a Promise resolving to an array of API responses, whose length is exactly the same
	 * as the input `titles` array. This ensures that each title at a specific index in `titles` will have its
	 * corresponding response at the same index in the returned array, preserving a strict mapping between inputs
	 * and outputs.
	 *
	 * @param titles An array of the page titles, either as strings or {@link Title} instances, or mixed.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to an array of API responses, with errors for invalid titles at their respective indexes.
	 */
	async read(titles: (string | Title)[], requestOptions?: MwbotRequestConfig): Promise<(Revision | MwbotError)[]>;
	async read(
		titles: string | Title | (string | Title)[],
		requestOptions?: MwbotRequestConfig
	): Promise<Revision | (Revision | MwbotError)[]> {

		// If `titles` isn't an array, verify it (validateTitle throws an error if the title is invalid)
		const singleTitle = !Array.isArray(titles) && this.validateTitle(titles, true);

		// `pageids` and `revids` shouldn't be set because we use the `titles` parameter
		if (!requestOptions) {
			requestOptions = { _cloned: true };
		} else if (!requestOptions._cloned) {
			requestOptions = mergeDeep(requestOptions);
			requestOptions._cloned = true;
		}
		if (isObject(requestOptions.params)) {
			delete requestOptions.params.pageids;
			delete requestOptions.params.revids;
		}

		// Set a twice-as-long timeout because content-fetching is time-consuming
		if (typeof requestOptions.timeout !== 'number') {
			requestOptions.timeout = 120 * 1000; // 120 seconds
		}

		const params: ApiParams = {
			action: 'query',
			// titles, // Set below dynamically
			prop: 'revisions',
			rvprop: 'ids|timestamp|user|content',
			rvslots: 'main',
			curtimestamp: true,
			formatversion: '2'
		};

		const processSinglePage = (
			page: PartiallyRequired<ApiResponseQueryPages, 'title'>,
			curtimestamp?: string
		): Revision | MwbotError => {
			const rev = page.revisions?.[0];
			if (page.missing || typeof page.pageid !== 'number') {
				return new MwbotError('api_mwbot', {
					code: 'pagemissing',
					info: 'The requested page does not exist.'
				}, { title: page.title });
			} else if (
				typeof page.ns !== 'number' ||
				typeof page.title !== 'string' || // Just in case
				!rev ||
				typeof rev.revid !== 'number' ||
				typeof curtimestamp !== 'string' ||
				!rev.timestamp ||
				typeof rev.slots?.main.content !== 'string'
			) {
				return this.errorEmpty(false, void 0, { title: page.title });
			} else {
				return {
					pageid: page.pageid,
					ns: page.ns,
					title: page.title,
					baserevid: rev.revid,
					user: rev.user,
					basetimestamp: rev.timestamp,
					starttimestamp: curtimestamp,
					content: rev.slots.main.content
				};
			}
		};

		// If `titles` isn't an array, return a response for the single page
		if (singleTitle) {
			const t = singleTitle.getPrefixedText();
			params.titles = t;
			const res = await this.get(params, requestOptions);
			const pages = res.query?.pages;
			if (!pages || !pages[0]) {
				this.errorEmpty(true, void 0, { title: t });
			}
			pages[0].title ??= t;
			const processed = processSinglePage(
				pages[0] as PartiallyRequired<ApiResponseQueryPages, 'title'>,
				res.curtimestamp
			);
			if (processed instanceof MwbotError) {
				throw processed;
			} else {
				return processed;
			}
		}

		// At this point, we know `titles` is an array
		const titlesArray = titles as (string | Title)[];

		/**
		 * The result array, initialized with the same length as `titlesArray`.
		 * Each index in this array corresponds to an index in `titlesArray` to maintain order.
		 */
		const ret: (Revision | MwbotError | undefined)[] = Array.from({ length: titlesArray.length });
		/**
		 * Maps canonicalized page titles to their corresponding indexes in `ret`.
		 * This ensures correct mapping even if duplicate titles exist in `titlesArray`.
		 */
		const titleMap: Record<string, number[]> = Object.create(null);
		/**
		 * A chunked list of title batches for API requests. This is used when we need to map
		 * one error response to multiple titles.
		 */
		const multiValues: string[][] = [];
		/**
		 * The limit is 50 for `rvprop=content`.
		 */
		const apilimit = 50;

		// Pre-process and validate titles
		let errCount = 0;
		for (let i = 0; i < titlesArray.length; i++) {
			try {
				// Normalize all titles as in the API response and remember the array index
				const page = this.validateTitle(titlesArray[i], true).getPrefixedText();
				titleMap[page] ||= [];
				titleMap[page].push(i);
				if (!multiValues.length || multiValues[multiValues.length - 1].length === apilimit) {
					multiValues.push([]);
				}
				multiValues.at(-1)!.push(page);
			} catch (err) {
				// Store errors immediately in the corresponding index
				ret[i] = err as MwbotError;
				errCount++;
			}
		}

		// If all titles are invalid, return early without making API requests
		if (errCount === titlesArray.length) {
			return ret as MwbotError[];
		}

		// Perform batch API requests
		params.titles = multiValues.flat();
		const responses = await this.massRequest(params, 'titles', apilimit, requestOptions);

		// Process the response
		for (let batchIndex = 0; batchIndex < responses.length; batchIndex++) {

			const res = responses[batchIndex];
			if (res instanceof MwbotError) {
				setToAll(res, batchIndex);
				continue;
			}

			const pages = res.query?.pages;
			if (!pages) {
				setToAll(this.errorEmpty(false), batchIndex);
				continue;
			}

			for (const page of pages) {
				setToTitle(
					processSinglePage(
						page as PartiallyRequired<ApiResponseQueryPages, 'title'>,
						res.curtimestamp
					),
					// We can safely assume `title` is always a string when the `pages` array exists,
					// because we make title-based queries — not ID-based queries, which might lack associated titles
					page.title!
				);
			}

		}

		// At this point there shouldn't be any empty slots in `ret`
		const emptyIndexes = ret.reduce((acc: number[], el, i) => {
			if (!el) acc.push(i);
			return acc;
		}, []);
		if (emptyIndexes.length) {
			throw new Error(`[Internal] "ret" has empty slots at index ${emptyIndexes.join(', ')}.`);
		}

		return ret as (Revision | MwbotError)[];

		function setToAll(error: MwbotError, batchIndex: number): void {
			multiValues[batchIndex].forEach((title) => {
				titleMap[title].forEach((retIndex, i) => {
					// Ensure pass-by-value as in JSON outputs
					// TODO: MwbotError should have a _clone() method
					ret[retIndex] = i === 0 ? error : deepCloneInstance(error);
				});
			});
		}

		function setToTitle(value: Revision | MwbotError, title: string): void {
			titleMap[title].forEach((retIndex, i) => {
				if (i === 0) {
					ret[retIndex] = value;
				} else if (value instanceof MwbotError) {
					ret[retIndex] = deepCloneInstance(value);
				} else {
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
	async edit(
		title: string | Title,
		transform: TransformationPredicate,
		requestOptions: MwbotRequestConfig = {},
		/** @private */
		retry = 0
	): Promise<ApiResponseEditSuccess> {

		if (typeof transform !== 'function') {
			throw new MwbotError('fatal', {
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
			throw new MwbotError('api_mwbot', {
				code: 'aborted',
				info: 'Edit aborted by the user.'
			});
		}
		if (!isPlainObject(params)) {
			throw new MwbotError('fatal', {
				code: 'typemismatch',
				info: 'The transformation predicate must resolve to a plain object.'
			}, { transformed: params });
		}
		const defaultParams: ApiParamsActionEdit = {
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
		const result = await this.postWithCsrfToken(
			params as ApiParams,
			mergeDeep(requestOptions, { _cloned: true })
		).catch((err: MwbotError) => err);
		const { disableRetry, disableRetryAPI, disableRetryByCode = [] } = requestOptions;
		if (
			result instanceof MwbotError && result.code === 'editconflict' &&
			typeof retry === 'number' && retry < 3 &&
			!disableRetry && !disableRetryAPI &&
			!disableRetryByCode.some((code) => code === 'editconflict')
		) {
			console.warn('Warning: Encountered an edit conflict.');
			console.log('Retrying in 5 seconds...');
			await sleep(5000);
			return await this.edit(title, transform, mergeDeep(requestOptions, { _cloned: true }), ++retry);
		}
		if (result instanceof MwbotError) {
			throw result;
		}
		if (result.edit?.result === 'Success') {
			return result.edit as ApiResponseEditSuccess;
		}
		throw new MwbotError('api_mwbot', {
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
	async newSection(
		title: string | Title,
		sectiontitle: string,
		content: string,
		summary?: string,
		additionalParams: ApiParamsActionEdit = {},
		requestOptions: MwbotRequestConfig = {}
	): Promise<ApiResponse> {
		return this._save(this.validateTitle(title), content, summary, { section: 'new', sectiontitle }, additionalParams, requestOptions);
	}

	// ****************************** SPECIFIC REQUEST METHODS ******************************

	/**
	 * Logs in to the wiki for which this instance has been initialized.
	 *
	 * @param username
	 * @param password
	 * @returns A Promise resolving to the API response or rejecting with an error.
	 */
	protected async login(username: string, password: string): Promise<ApiResponse> { // TODO: Make this method public?

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
			this.errorEmpty(true, void 0, { response: resLogin });
		} else if (resLogin.login.result !== 'Success') {
			throw new MwbotError('api_mwbot', {
				code: 'loginfailed',
				info: resLogin.login.reason || 'Failed to log in.'
			}, { response: resLogin });
		} else {
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
	async purge(titles: (string | Title)[], additionalParams: ApiParams = {}, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
		const titleSet = new Set<string>();
		const invalid: unknown[] = [];
		titles.forEach((t) => {
			if (t instanceof this.Title) {
				titleSet.add(t.toString());
			} else if (typeof t === 'string') {
				titleSet.add(t);
			} else {
				invalid.push(t);
			}
		});
		if (invalid.length) {
			const err = new MwbotError('fatal', {
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

	/**
	 * Performs an `action=parse` API request.
	 *
	 * This method enforces the `action=parse` parameter and returns a Promise that resolves to the `response.parse`
	 * object from the API response. If this property is missing, the Promise is rejected with an `mwbot_api: empty` error.
	 *
	 * The following parameters are enforced:
	 * ```
	 * {
	 *   action: 'parse',
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param params {@link https://www.mediawiki.org/wiki/API:Parsing_wikitext | Parameters} to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.parse` object from the API response, or rejecting with an error.
	 * @throws If:
	 * - `response.parse` is missing (causing an `mwbot_api: empty` error).
	 * - the HTTP request fails.
	 */
	async parse(params: ApiParamsActionParse, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponseParse> {
		params = mergeDeep(params, {
			action: 'parse',
			format: 'json',
			formatversion: '2'
		});
		const res = await this.fetch(params, requestOptions);
		if (res.parse) {
			return res.parse;
		}
		this.errorEmpty(true, '("response.parse" is missing).', { response: res });
	}

	/**
	 * Gets a function to check whether pages exist.
	 *
	 * **Example**:
	 * ```ts
	 * // Suppose 'Foo' exists but 'Bar' does not
	 * const exists = await mwbot.getExistencePredicate(['Foo', 'Bar']);
	 * exists('Foo'); // true
	 * exists('Bar'); // false
	 * exists('Baz'); // null
	 * ```
	 *
	 * See {@link ExistencePredicate} for details on the returned function.
	 *
	 * @param titles The titles to check for existence.
	 * @param options
	 * @param options.loose Whether to apply loose validation to the `titles` input.
	 *
	 * - If `false` (default), the method throws if `titles` contains:
	 *   - a value that is neither a string nor a {@link Title} instance,
	 *   - an empty title,
	 *   - an interwiki title,
	 *   - or a title in the Special or Media namespaces.
	 * - If `true`, such titles are skipped (and `exists()` will return `null` for them).
	 *
	 * @param options.rejectProof Whether to suppress request errors (default: `false`).
	 * If set to `true`, the method always resolves to a function, though that function
	 * may return `null` frequently due to missing data.
	 *
	 * @returns A Promise that resolves to an `exists()` function, or rejects with
	 * an error (unless `rejectProof` is `true`).
	 */
	async getExistencePredicate(
		titles: (string | Title)[],
		options: { loose?: boolean; rejectProof?: boolean } = {}
	): Promise<ExistencePredicate> {

		const loose = !!options.loose;
		const rejectProof = !!options.rejectProof;

		// Collect valid target titles
		const targets = titles.reduce((acc, title) => {
			try {
				acc.add(this.validateTitle(title, true).getPrefixedText());
			} catch (err) {
				if (!loose) throw err;
			}
			return acc;
		}, new Set<string>());

		// Query the API for title existence
		const responses = await this.massRequest({
			action: 'query',
			titles: Array.from(targets),
			format: 'json',
			formatversion: '2'
		}, 'titles');

		// Process responses and populate existence map
		const list = new Map<string, boolean>();
		for (const res of responses) {
			if (res instanceof MwbotError) {
				if (rejectProof) continue;
				throw res;
			}
			const pages = res.query?.pages;
			if (!pages) {
				if (rejectProof) continue;
				this.errorEmpty();
			}
			for (const { ns, title, missing } of pages) {
				if (title && typeof ns === 'number') {
					list.set(title, !missing);
				}
			}
		}

		// Return an `exists()` function
		return (title: string | Title): boolean | null => {
			if (!(title instanceof this.Title)) {
				const t = this.Title.normalize(title);
				if (!t) return null;
				title = t;
			} else {
				title = title.getPrefixedText();
			}
			return list.get(title) ?? null;
		};

	}

	/**
	 * Retrieves the categories that the given title(s) belong to.
	 *
	 * @param titles A single title or an array of titles to enumerate categories for.
	 * @param hidden A specification to enumerate hidden categories. This manipulates the `clshow` parameter:
	 * - If not provided, enumerates both hidden and unhidden categories.
	 * - If `true`, only enumerates hidden categories (`clshow=hidden`).
	 * - If `false`, only enumerates unhidden categories (`clshow=!hidden`).
	 * @returns A Promise that resolves to:
	 * - An array of category titles (without the namespace prefix) if a single title is provided.
	 * - An object mapping each normalized title (as returned by {@link TitleStatic.normalize} in `'api'` format)
	 *   to an array of category titles (without the namespace prefix) if multiple titles are provided.
	 *
	 * Throws immediately if any input title fails validation via {@link validateTitle}.
	 */
	getCategories(title: string | Title, hidden?: boolean): Promise<string[]>;
	getCategories(titles: (string | Title)[], hidden?: boolean): Promise<Record<string, string[]>>;
	async getCategories(
		titles: string | Title | (string | Title)[],
		hidden?: boolean
	): Promise<string[] | Record<string, string[]>> {

		// Normalize titles
		const isArrayInput = Array.isArray(titles);
		const titleSet = new Set<string>();
		for (const t of (isArrayInput ? titles : [titles])) {
			titleSet.add(this.validateTitle(t, true).getPrefixedText());
		}
		if (!titleSet.size) {
			throw new MwbotError('fatal', {
				code: 'emptyinput',
				info: '"titles" cannot be empty.'
			});
		}

		// Send API requests
		const validatedTitles = [...titleSet];
		const responses = await this.continuedRequest({
			action: 'query',
			titles: validatedTitles,
			prop: 'categories',
			clshow: hidden ? 'hidden' : hidden === false ? '!hidden' : undefined,
			cllimit: 'max',
			format: 'json',
			formatversion: '2'
		}, {
			limit: Infinity,
			multiValues: 'titles'
		});

		// Process the responses and format categories
		const config = this.config;
		const NS_CATEGORY = config.get('wgNamespaceIds').category;
		const CATEGORY_PREFIX = config.get('wgFormattedNamespaces')[NS_CATEGORY] + ':';

		const result: Record<string, string[]> = Object.create(null);
		for (const res of responses) {
			const pages = res.query?.pages;
			if (!pages) this.errorEmpty();
			pages.forEach(({ title, categories }) => {
				if (!title || !categories) return;
				const stripped = categories.map(c => c.title.replace(CATEGORY_PREFIX, ''));
				result[title] ||= [];
				result[title].push(...stripped);
			});
		}

		if (isArrayInput) {
			return result;
		} else {
			return result[validatedTitles[0]] || [];
		}

	}

	/**
	 * Gets a list of categories that match a certain prefix.
	 *
	 * @param prefix The prefix to match.
	 * @returns A Promise that resolves with an array of matched category titles without
	 * the namespace prefix.
	 */
	async getCategoriesByPrefix(prefix: string): Promise<string[]> {
		const config = this.config;
		const NS_CATEGORY = config.get('wgNamespaceIds').category;
		const CATEGORY_PREFIX = config.get('wgFormattedNamespaces')[NS_CATEGORY] + ':';
		const res = await this.get({
			action: 'query',
			list: 'allpages',
			apprefix: prefix,
			apnamespace: NS_CATEGORY,
			format: 'json',
			formatversion: '2'
		});
		const allpages = res.query?.allpages;
		if (!allpages) this.errorEmpty();
		return allpages.map(({ title }) => title.replace(CATEGORY_PREFIX, ''));
	}

}

// ****************************** HELPER TYPES AND INTERFACES ******************************

/**
 * Options to be passed as the first argument of {@link Mwbot.init}.
 */
export type MwbotInitOptions = MwbotOptions & { credentials: Credentials };

/**
 * Configuration options for {@link Mwbot.init}. These options can also be updated later
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
 *   oAuth2AccessToken: 'Your OAuth 2.0 access token'
 * }
 * ```
 * #### OAuth 1.0a ({@link https://www.mediawiki.org/wiki/OAuth/Owner-only_consumers#OAuth_1})
 * ```ts
 * {
 *   consumerToken: 'Your OAuth 1.0a consumer token',
 *   consumerSecret: 'Your OAuth 1.0a consumer secret',
 *   accessToken: 'Your OAuth 1.0a access token',
 *   accessSecret: 'Your OAuth 1.0a access secret'
 * }
 * ```
 * #### BotPassword ({@link https://www.mediawiki.org/wiki/Manual:Bot_passwords})
 * ```ts
 * {
 *   username: 'Your bot username',
 *   password: 'Your bot password'
 * }
 * ```
 * #### Anonymous Access
 * ```ts
 * {
 *   anonymous: true
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
export type MwbotCredentials = XOR<
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
	 * Set to `true` when the `requestOptions` object passed to a method is deep-cloned to avoid
	 * mutating the caller's original object. Mwbot methods check this property to prevent redundant
	 * recursive calls to `mergeDeep`, ensuring optimal efficiency.
	 * @hidden
	 * @internal
	 */
	_cloned?: boolean;
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
 * Additional options for read-only requests passed to {@link Mwbot.request}.
 */
export interface ReadRequestConfig {
	/**
	 * If `true`, {@link Mwbot.request} chooses `'POST'` over the default `'GET'` if the request
	 * would otherwise result in a `414 URI Too Long` error.
	 *
	 * This option should not be used for requests that require `POST`, as the method will
	 * fall back to `'GET'` unless `'POST'` is explicitly specified.
	 */
	autoMethod?: boolean;
}

/**
 * Site and user information retrieved by {@link Mwbot.init}. Accessible via {@link Mwbot.info}.
 *
 * Utility types used in this interface simply ensure certain optional properties in the API response
 * are treated as non-optional after verification.
 */
export interface SiteAndUserInfo {
	// The utility types used here just make the verified properties non-optional
	functionhooks: ApiResponseQueryMetaSiteinfoFunctionhooks[];
	general: Pick<
		ApiResponseQueryMetaSiteinfoGeneral,
		'articlepath' | 'lang' | 'legaltitlechars' | 'script' | 'scriptpath' | 'server' | 'servername' | 'sitename' | 'generator' | 'wikiid'
	> & ApiResponseQueryMetaSiteinfoGeneral;
	magicwords: ApiResponseQueryMetaSiteinfoMagicwords[];
	interwikimap: ApiResponseQueryMetaSiteinfoInterwikimap[];
	namespaces: ApiResponseQueryMetaSiteinfoNamespaces;
	namespacealiases: ApiResponseQueryMetaSiteinfoNamespacealiases[];
	user: Required<Pick<ApiResponseQueryMetaUserinfo, 'id' | 'name' | 'rights'>>;
}

/**
 * Schema of the data handled by {@link Mwbot.config}.
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

/**
 * @private
 * Utility type that describes a class definition whose `prototype` matches a specific instance type.
 *
 * This is used internally to connect a class constructor with its corresponding instance type
 * in a safe and type-checkable way.
 *
 * @template T The instance type associated with the class.
 */
export type PrototypeOf<T> = { prototype: T };

/**
 * @private
 * Resolves the instance type of a given class definition.
 *
 * This is a reverse utility to {@link PrototypeOf}, used to infer the type of instances
 * constructed by a class that matches the given definition.
 *
 * @template T A class definition (with a `prototype` property).
 */
export type InstanceOf<T> = T extends { prototype: infer R } ? R : never;

function isAxiosError(err: any): err is AxiosError {
	return err?.isAxiosError === true;
}

// The following type definitions are substantial copies from the npm package `types-mediawiki`.

// Get/PickOrDefault<V, S, TD, TX> extracts values from V using key selection S
// - TD is the value type of missing properties
// - TX is the value type of unknown properties

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
export type PickOrDefault<V, S extends MultiValue<PropertyKey>, TD, TX = unknown> = S extends Array<
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
	 * Gets the value of one or more keys.
	 *
	 * If called with no arguments, all values are returned.
	 *
	 * @param selection Key or array of keys to retrieve values for.
	 * @param fallback Value for keys that don't exist.
	 * @returns If `selection` was a string, returns the value. If `selection` was an array, returns
	 * an object of key/values. If no `selection` is passed, a new object with all key/values is returned.
	 * Any type of the return value is a deep copy of the original stored in the instance.
	 */
	get<S extends MultiValue<keyof V>, TD>(selection: S, fallback: TD): PickOrDefault<V, S, TD, TX>;
	get<S extends MultiValue<string>, TD>(selection: S, fallback: TD): PickOrDefault<V, S, TD, TX>;
	get<S extends MultiValue<keyof V>>(selection: S): PickOrDefault<V, S, null, TX>;
	get<S extends MultiValue<string>>(selection: S): PickOrDefault<V, S, null, TX>;
	get(): V & Record<string, TX>;
	/**
	 * Sets the value of one or more keys.
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
	 * Checks if a given configuration key exists.
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
	/** This property may be missing if the editor is revdel'd. */
	user?: string;
	basetimestamp: string;
	starttimestamp: string;
	content: string;
}

/**
 * Callback function for {@link Mwbot.edit}.
 *
 * @param wikitext A {@link Wikitext} instance created from the target page’s content.
 * @param revision The latest revision information of the target page.
 * @returns Parameters for `action=edit` as a plain object, or `null` to cancel the edit.
 * May also return a Promise resolving to either of the two.
 *
 * See {@link Mwbot.edit} for the default parameters used by the method.
 *
 * If the return value is (or resolves to) `null`, the method rejects with a {@link MwbotError}
 * using the `api_mwbot: aborted` error code.
 */
export type TransformationPredicate =
	(wikitext: Wikitext, revision: Revision) => ApiParamsActionEdit | null | Promise<ApiParamsActionEdit | null>;

/**
 * A variant of {@link ApiResponseEdit} where the `result` property is guaranteed to be `'Success'`.
 * Used in {@link Mwbot.create}, {@link Mwbot.save}, and {@link Mwbot.edit}.
 */
export type ApiResponseEditSuccess = Omit<ApiResponseEdit, 'result'> & { result: 'Success' };

/**
 * A function that checks whether a given title exists.
 *
 * This function is returned by {@link Mwbot.getExistencePredicate}. It returns:
 * - `true` if the title is known to exist,
 * - `false` if the title is known to be missing,
 * - `null` if the existence of the title is unknown.
 *
 * A `null` return value indicates one of the following:
 * - The title was not included in the original `getExistencePredicate()` input.
 * - The title is empty.
 * - The title is interwiki.
 * - The title is in the Special or Media namespaces.
 *
 * The `title` parameter is automatically normalized; the caller does not need to
 * normalize it manually.
 *
 * @param title The title to check.
 * @returns `true`, `false`, or `null` depending on the known existence status.
 */
export type ExistencePredicate = (title: string | Title) => boolean | null;