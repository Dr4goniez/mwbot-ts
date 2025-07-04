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
	OptionPrimitive,
	PartiallyRequired,
	ApiParams,
	ApiParamsAction,
	ApiParamsActionBlock,
	ApiParamsActionDelete,
	ApiParamsActionEdit,
	ApiParamsActionMove,
	ApiParamsActionParse,
	ApiParamsActionProtect,
	ApiParamsActionRollback,
	ApiParamsActionUnblock,
	ApiParamsActionUndelete,
	ApiResponse,
	ApiResponseBlock,
	ApiResponseDelete,
	ApiResponseEdit,
	ApiResponseMove,
	ApiResponseParse,
	ApiResponseProtect,
	ApiResponseQuery,
	ApiResponseQueryPages,
	ApiResponseQueryPagesPropLinkshere,
	ApiResponseQueryPagesPropTranscludedin,
	ApiResponseQueryMetaSiteinfoGeneral,
	ApiResponseQueryMetaSiteinfoNamespaces,
	ApiResponseQueryMetaSiteinfoNamespacealiases,
	ApiResponseQueryMetaTokens,
	ApiResponseQueryMetaUserinfo,
	ApiResponseQueryMetaSiteinfoInterwikimap,
	ApiResponseQueryMetaSiteinfoMagicwords,
	ApiResponseQueryMetaSiteinfoFunctionhooks,
	ApiResponseQueryListCategorymembers,
	ApiResponseQueryListPrefixsearch,
	ApiResponseRollback,
	ApiResponseUnblock,
	ApiResponseUndelete
} from './api_types';
import { MwbotError, MwbotErrorData } from './MwbotError';
import * as Util from './Util';
const { mergeDeep, isPlainObject, isObject, sleep, isEmptyObject, arraysEqual, deepCloneInstance } = Util;
import * as mwString from './String';
import { TitleFactory, TitleStatic, Title } from './Title';
import { TemplateFactory, TemplateStatic, ParserFunctionStatic, ParsedTemplate } from './Template';
import { WikilinkFactory, WikilinkStatic, FileWikilinkStatic, RawWikilinkStatic } from './Wikilink';
import { WikitextFactory, WikitextStatic, Wikitext } from './Wikitext';

// Imported only for docs
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { MwbotErrorCodes } from './MwbotError';

/**
 * The core class of the `mwbot-ts` framework. This class provides a robust and extensible interface
 * for interacting with the MediaWiki API.
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
	 * See [[{@link https://www.mediawiki.org/wiki/Manual:Creating_a_bot#Bot_best_practices | mw:Manual:Creating a bot#Bot best practices}]].
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
	protected _info: SiteAndUserInfo;
	/**
	 * Returns (a deep copy of) the site and user information fetched by {@link init}.
	 */
	get info(): SiteAndUserInfo {
		return mergeDeep(this._info);
	}
	protected _Title: TitleStatic;
	/**
	 * Title class for this instance.
	 */
	get Title(): TitleStatic {
		return this._Title;
	}
	protected _Template: TemplateStatic;
	/**
	 * Template class for this instance.
	 */
	get Template(): TemplateStatic {
		return this._Template;
	}
	protected _ParserFunction: ParserFunctionStatic;
	/**
	 * ParserFunction class for this instance.
	 */
	get ParserFunction(): ParserFunctionStatic {
		return this._ParserFunction;
	}
	protected _Wikilink: WikilinkStatic;
	/**
	 * Wikilink class for this instance.
	 */
	get Wikilink(): WikilinkStatic {
		return this._Wikilink;
	}
	protected _FileWikilink: FileWikilinkStatic;
	/**
	 * FileWikilink class for this instance.
	 */
	get FileWikilink(): FileWikilinkStatic {
		return this._FileWikilink;
	}
	protected _RawWikilink: RawWikilinkStatic;
	/**
	 * RawWikilink class for this instance.
	 */
	get RawWikilink(): RawWikilinkStatic {
		return this._RawWikilink;
	}
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
	 * **This constructor is protected**. Use {@link init} instead to create a new instance.
	 *
	 * @param mwbotInitOptions Configuration object containing initialization settings and user credentials.
	 * @param requestOptions Custom request options applied to all HTTP requests issued by the new instance.
	 * @throws {MwbotError} If:
	 * * No valid API endpoint is provided. (`nourl`)
	 * * The user credentials are malformed. (`invalidcreds`)
	 */
	protected constructor(mwbotInitOptions: MwbotInitOptions, requestOptions: MwbotRequestConfig) {

		const { credentials, ...options } = mergeDeep(mwbotInitOptions);
		requestOptions = mergeDeep(requestOptions);

		// Ensure that a valid URL is provided
		requestOptions.url ||= options.apiUrl;
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
	 * @throws {MwbotError}
	 * If the credentials format is incorrect, or if unexpected keys are present. (`invalidcreds`)
	 */
	protected static validateCredentials(credentials: Credentials): MwbotCredentials {
		if (!isPlainObject(credentials)) {
			Mwbot.dieWithTypeError('plain object', 'credentials', credentials);
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
	 * @returns A Promise resolving to a new `Mwbot` instance, or rejecting with an error.
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
			...Mwbot.getActionParams('query'),
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
				Mwbot.dieAsEmpty(false, 'check HTTP headers?'),
				attemptIndex
			);
		} else if (userinfo.id === 0 && !this.isAnonymous()) {
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
	 * @throws {MwbotError} If the resulting options lack an `apiUrl` property. (`nourl`)
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
		return this.hasRights('apihighlimits') ? 500 : 50;
	}

	/**
	 * Checks whether the authenticated user has the specified user right(s).
	 *
	 * @param rights The user right or list of rights to check.
	 * @param requireAll
	 * Whether to require **all** rights (`true`, default) or **any** one of them (`false`).
	 * @returns
	 * `true` if the user has the specified right(s) according to the given condition; otherwise `false`.
	 */
	hasRights(rights: string | string[], requireAll = true): boolean {
		rights = Array.isArray(rights) ? rights : [rights];
		const possessed = new Set(this._info.user.rights);
		return requireAll
			? rights.every((r) => possessed.has(r))
			: rights.some((r) => possessed.has(r));
	}

	/**
	 * Throws an error if the client is anonymous or lacks the required rights.
	 *
	 * @param rights A single right or list of rights required to perform the action.
	 * @param actionDescription A brief description of the action requiring the rights.
	 * This will be included in the error message if permission is denied.
	 * @param allowAnonymous Whether to allow anonymous users to proceed. Defaults to `false`.
	 * @throws {MwbotError} If:
	 * - `allowAnonymous` is `false` and the client is anonymous. (`anonymous`)
	 * - The client lacks the required rights. (`nopermission`)
	 */
	protected dieIfNoRights(
		rights: string | string[],
		actionDescription: string,
		allowAnonymous = false
	): never | void {
		this.dieIfAnonymous(!allowAnonymous);
		if (!this.hasRights(rights)) {
			throw new MwbotError('api_mwbot', {
				code: 'nopermission',
				info: `You do not have permission to ${actionDescription}.`
			});
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
	 * Throws an `api_mwbot: anonymous` error if the client is authenticated as anonymous.
	 *
	 * @param condition Optional additional condition (default: `true`). The error is thrown
	 * only if this is `true` and the client is anonymous.
	 * @throws {MwbotError} If the client is anonymous and the condition is `true`.
	 */
	protected dieIfAnonymous(condition = true): never | void {
		if (condition && this.isAnonymous()) {
			throw new MwbotError('api_mwbot', {
				code: 'anonymous',
				info: 'Anonymous users are limited to non-write requests.'
			});
		}
	}

	/**
	 * Throws or returns an `api_mwbot: empty` error indicating an empty API result.
	 *
	 * @param die Whether to throw the error (default: `true`). If `false`, the error object
	 * is returned instead of being thrown.
	 * @param additionalInfo Optional text to insert into the error message.
	 *
	 * - If omitted: `"OK response but empty result."`
	 * - If provided: `"OK response but empty result ($1)."` where `$1` is replaced with `additionalInfo`.
	 *
	 * @param data Optional additional data to include with the error.
	 * @returns If `die` is `false`, returns the constructed error object. Otherwise, never returns (throws).
	 * @throws {MwbotError<'api_mwbot'>} If `die` is `true`.
	 */
	protected static dieAsEmpty(die?: true, additionalInfo?: string, data?: MwbotErrorData): never;
	protected static dieAsEmpty(die: false, additionalInfo?: string, data?: MwbotErrorData): MwbotError<'api_mwbot'>;
	protected static dieAsEmpty(die = true, additionalInfo?: string, data?: MwbotErrorData): never | MwbotError<'api_mwbot'> {
		const info = additionalInfo
			? `OK response but empty result (${additionalInfo}).`
			: 'OK response but empty result.';
		const error = new MwbotError('api_mwbot', { code: 'empty', info }, data);
		if (die) throw error;
		return error;
	}

	/**
	 * Throws a fatal internal error if the request method is not "POST".
	 *
	 * @param requestOptions The request configuration object to check.
	 * @throws {MwbotError} If the request method is missing or not "POST". (`internal`)
	 */
	protected static dieIfNotPost(requestOptions: MwbotRequestConfig): never | void {
		if (requestOptions?.method !== 'POST') {
			throw new MwbotError('fatal', {
				code: 'internal',
				info: `Expected request method to be "POST", but received "${requestOptions?.method}".`
			});
		}
	}

	/**
	 * Throws a `typemismatch` fatal error.
	 *
	 * Two overloads are supported:
	 *
	 * 1. Provide a custom message directly:
	 * ```ts
	 * Mwbot.dieWithTypeError('Invalid value provided.');
	 * ```
	 *
	 * 2. Provide expected type, variable name, and actual value to auto-generate a message:
	 * ```ts
	 * Mwbot.dieWithTypeError('string', 'username', 42);
	 * // => 'Expected string for \"username\", but got number.'
	 * ```
	 */
	protected static dieWithTypeError(message: string): never;
	protected static dieWithTypeError(
		expectedType: string,
		variableName: string,
		inputValue: unknown
	): never;
	protected static dieWithTypeError(
		messageOrExpectedType: string,
		variableName?: string,
		inputValue?: unknown
	): never {
		const formatType = (value: unknown) => {
			if (Array.isArray(value)) return 'array';
			if (value === null) return 'null';
			return value?.constructor?.name ?? typeof value;
		};
		throw new MwbotError('fatal', {
			code: 'typemismatch',
			info: variableName
				? `Expected ${messageOrExpectedType} for "${variableName}", but got ${formatType(inputValue)}.`
				: messageOrExpectedType
		});
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
	 * Returns a deep-cloned version of the given request options, ensuring that the returned object
	 * is safe to mutate without affecting the original.
	 *
	 * If `requestOptions` is `undefined` or an empty object, a new object with `_cloned: true` is
	 * returned immediately to avoid unnecessary cloning.
	 *
	 * If the `_cloned` flag is already present and truthy, the original object is returned as-is.
	 * Otherwise, the object is deeply cloned via `mergeDeep()`, and `_cloned` is set to `true`
	 * on the resulting object to prevent redundant cloning on future calls.
	 *
	 * @param requestOptions The request options to check and clone if needed.
	 * @returns A safely cloneable `MwbotRequestConfig` object with `_cloned` set to `true`.
	 */
	protected static unrefRequestOptions(requestOptions?: MwbotRequestConfig): MwbotRequestConfig {
		if (requestOptions === undefined || isEmptyObject(requestOptions)) {
			return { _cloned: true };
		}
		if (requestOptions._cloned) {
			return requestOptions;
		}
		requestOptions = mergeDeep(requestOptions);
		requestOptions._cloned = true;
		return requestOptions;
	}

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
				// Proxy should be disabled when supplying a custom httpAgent/httpsAgent, per Axios's guidance
				// See https://axios-http.com/docs/req_config
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
	 * @returns A Promise resolving to the API response, or rejecting with an error.
	 */
	async request(
		parameters: ApiParams,
		requestOptions?: MwbotRequestConfig & ReadRequestConfig
	): Promise<ApiResponse> {

		// Preprocess the request options
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
		requestOptions = mergeDeep(Mwbot.defaultRequestOptions, this.userRequestOptions, requestOptions, { params: parameters });
		const { length, hasLongFields } = this.preprocessParameters(requestOptions.params);
		if (requestOptions.params?.format !== 'json') {
			throw new MwbotError('api_mwbot', {
				code: 'invalidformat',
				info: 'Expected "format=json" in request parameters.'
			});
		}
		requestOptions.url = this.userMwbotOptions.apiUrl || requestOptions.url;
		requestOptions.headers ||= {};
		requestOptions.headers['User-Agent'] = this.userMwbotOptions.userAgent || requestOptions.headers['User-Agent'];

		// Preprocess the request method
		requestOptions.method = String(requestOptions.method).toUpperCase();
		const autoMethod = requestOptions.method !== 'POST' && !!requestOptions.autoMethod;
		delete requestOptions.autoMethod;
		if (autoMethod) {
			const baseUrl = this.config.get('wgScriptPath') + '/api.php?';
			const baseUrlLength = new TextEncoder().encode(baseUrl).length;
			if (length + baseUrlLength > 2084) {
				requestOptions.method = 'POST';
			}
		}
		if (requestOptions.method === 'POST') {
			await this.handlePost(requestOptions, hasLongFields); // Encode params to data
		} else {
			requestOptions.method = 'GET';
		}
		this.applyAuthentication(requestOptions);

		return this._request(requestOptions);

	}

	/**
	 * Performs a raw HTTP request to the MediaWiki API.
	 *
	 * This method assumes that the request body has been fully processed, meaning all necessary parameters
	 * have been formatted, validated, and encoded as required by the API.
	 *
	 * @param requestOptions The finalized HTTP request options, ready for transmission.
	 * @param attemptCount The number of attemps that have been made so far.
	 * @returns A Promise resolving to the API response, or rejecting with an error.
	 */
	protected async _request(requestOptions: MwbotRequestConfig, attemptCount?: number): Promise<ApiResponse> {

		attemptCount = (attemptCount ?? 0) + 1;
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);

		// Clone params early since POST requests will delete them from `requestOptions`
		const clonedParams: ApiParams = { ...requestOptions.params };
		if (requestOptions.method === 'POST') {
			// The API throws a "mustpostparams" error if it finds certain parameters in "params", even when "data"
			// in the request body is well-formed
			delete requestOptions.params;
		}

		// Enforce an interval if necessary
		const { interval, intervalActions = Mwbot.defaultIntervalActions } = this.userMwbotOptions;
		const requiresInterval = !!(clonedParams.action && intervalActions.includes(clonedParams.action));
		if (requiresInterval && this.lastRequestTime && (interval === void 0 || +interval > 0)) {
			const sleepDuration = (typeof interval === 'number' ? interval : 4800) - (Date.now() - this.lastRequestTime);
			await sleep(sleepDuration); // sleep() clamps negative values automatically
		}

		// Make the request and process the response
		return this.rawRequest(requestOptions).then(async (response): Promise<ApiResponse> => {

			const data: ApiResponse | undefined = response.data;

			// Show warnings only for the first request because retries use the same request body
			if (attemptCount === 1) {
				this.showWarnings(data?.warnings);
			}

			if (!data) {
				Mwbot.dieAsEmpty(true, 'check HTTP headers?', { axios: response });
			}
			if (!isPlainObject(data)) {
				// In most cases the raw HTML of [[Main page]]
				throw new MwbotError('api_mwbot', {
					code: 'invalidjson',
					info: 'No valid JSON response (check the request URL?)'
				}, { axios: response });
			}
			if ('error' in data || 'errors' in data) {

				const err = MwbotError.newFromResponse(data as Required<Pick<ApiResponse, 'error'>> | Required<Pick<ApiResponse, 'errors'>>);

				// Handle error codes
				this.dieIfAnonymous(err.code === 'missingparam' && err.info.includes('The "token" parameter must be set'));
				if (!requestOptions.disableRetryAPI) {
					// Handle retries
					switch (err.code) {
						case 'badtoken':
						case 'notoken':
							this.dieIfAnonymous();
							if (requestOptions.method === 'POST' && clonedParams.action && !requestOptions.disableRetryByCode?.includes(clonedParams.action)) {
								const tokenType = await this.getTokenType(clonedParams.action); // Identify the required token type
								if (!tokenType) throw err;
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

							let retryAfter = parseInt(response?.headers?.['retry-after']);
							if (!Number.isFinite(retryAfter)) {
								retryAfter = 5; // Fallback to 5 seconds if Retry-After header is missing or invalid
							}

							const lag = err.data?.error?.lag as number | undefined;
							const maxLagLimit = requestOptions.maxLagLimit ?? 60; // Default limit is 60 seconds

							if (typeof lag === 'number') {
								if (lag > maxLagLimit) {
									// If reported lag exceeds the configured limit, abort retry to avoid hammering the server
									console.group();
									console.warn(`- No retry will be attempted because server lag (${lag.toFixed(2)}s) exceeds the limit (${maxLagLimit}s).`);
									console.groupEnd();
									throw err;
								}
								// Use the higher of Retry-After and the reported lag (rounded up)
								retryAfter = Math.max(Math.ceil(lag), retryAfter);
							}

							return await this.retry(err, attemptCount, clonedParams, requestOptions, 3, retryAfter);
						}

						case 'assertbotfailed':
						case 'assertuserfailed':
							if (!this.isAnonymous()) {
								console.warn(`Warning: Encountered an "${err.code}" error.`);
								let retryAfter = 10;

								// If authenticated using a BotPassword, log in again
								const { username, password } = this.credentials.user || {};
								if (username && password) {
									console.log('Re-logging in...');
									const loggedIn = await this.login(username, password).catch((err: MwbotError) => err);
									if (loggedIn instanceof MwbotError) {
										console.dir(loggedIn, { depth: 3 });
										throw err;
									}
									console.log('Re-login successful.');

									// If the failed request was a token-requiring action, fetch a new token
									if (requestOptions.method === 'POST' && clonedParams.token &&
										clonedParams.action && !requestOptions.disableRetryByCode?.includes(clonedParams.action)
									) {
										console.log('Will retry if possible...');
										const tokenType = await this.getTokenType(clonedParams.action);
										if (!tokenType) throw err;

										const token = await this.getToken(tokenType).catch(() => null);
										if (!token) throw err;

										clonedParams.token = token;
										requestOptions.params = clonedParams;
										delete requestOptions.data;
										const formatted = await this.handlePost(requestOptions, false).catch(() => null);
										if (formatted === null) throw err;
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
			}, { axios: error }); // Include the full response for debugging

			// Code-based error handling
			let retryAfter: number | null = null;
			switch (error.code) {
				case 'ERR_CANCELED':
					delete err.data; // Error details are unnecessary
					throw err.setCode('aborted').setInfo('Request aborted by the user.');
				case 'ECONNABORTED':
					// Usually triggered by a timeout
					retryAfter = 5;
					break;
				case 'ECONNRESET':
					// Connection was forcibly closed (e.g., server reset)
					// This serves as a workaround for Axios's upstream TCP handling issue: https://github.com/axios/axios/issues/5267
					retryAfter = 10;
					break;
			}
			if (retryAfter !== null) {
				console.warn(`Warning: Encountered an "${error.code}" error.`);
				const msg = error.message?.replace(/[.?!]+$/, '') ?? err.info;
				return await this.retry(
					err.setInfo(msg + '.'),
					attemptCount, clonedParams, requestOptions, retryAfter
				);
			}

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
							err.setCode('timeout').setInfo('Gateway timeout (504).'),
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

		Mwbot.dieIfNotPost(requestOptions);
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);

		// Ensure the token parameter is last (per [[mw:API:Edit#Token]])
		// The token will be kept away if the user is anonymous
		const { params } = requestOptions;
		const token = params.token as string | undefined;
		delete params.token;

		// Non-write API requests should be processed in the closest data center
		// See https://www.mediawiki.org/wiki/API:Etiquette#Other_notes
		requestOptions.headers ||= {};
		if (params.action === 'query' || params.action === 'parse') {
			requestOptions.headers['Promise-Non-Write-API-Action'] = true;
		}

		// Encode params
		if (hasLongFields) {
			// See https://www.mediawiki.org/wiki/API:Edit#Large_edits
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
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
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
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
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
				throw new MwbotError('fatal', {
					code: 'internal',
					info: 'OAuth 1.0 requires both "url" and "method" to be set before authentication.'
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
			configureKeepAliveAgents();
		} else {
			// Cookie-based authentication
			requestOptions.jar = this.jar;
			requestOptions.withCredentials = true;
		}
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
			!disableRetryByCode?.includes(initialError.code);

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
				return await retryCallback();
			} else {
				requestOptions.params = params;
				return await this._request(requestOptions, attemptCount);
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
	 * @returns A Promise resolving to the API response, or rejecting with an error.
	 */
	get(parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse> {
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
		requestOptions.method = 'GET';
		return this.request(parameters, requestOptions);
	}

	/**
	 * Performs an HTTP POST request to the MediaWiki API.
	 *
	 * @param parameters Parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the API response, or rejecting with an error.
	 */
	post(parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse> {
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
		requestOptions.method = 'POST';
		return this.request(parameters, requestOptions);
	}

	/**
	 * Performs an HTTP POST request to the MediaWiki API to **fetch data**. This method should only be used
	 * to circumvent a `414 URI too long` error; otherwise, use {@link get}.
	 *
	 * Per [[{@link https://www.mediawiki.org/wiki/API:Etiquette#Other_notes | mw:API:Etiquette#Other notes}]],
	 * `Promise-Non-Write-API-Action: true` will be set to the request headers automatically.
	 *
	 * @param parameters Parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the API response, or rejecting with an error.
	 */
	nonwritePost(parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse> {
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
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
	 * @returns A Promise resolving to the API response, or rejecting with an error.
	 */
	fetch(parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse> {
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
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
	 * @throws {MwbotError} If:
	 * * `limit` is specified but is neither a positive integer nor `Infinity`. (`invalidlimit`)
	 * * `multiValues` is specified but fails validation via {@link createBatchArray}.
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
		requestOptions?: MwbotRequestConfig
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
	 * Performs API requests with a multi-value field that is subject to the {@link apilimit}, processing
	 * multiple requests in parallel if necessary.
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
	 * user's `apilimit` (`500` for bots, `50` otherwise). The key(s) of the multi-value field(s) must be
	 * passed as the second parameter.
	 *
	 * **Request method**:
	 *
	 * By default, this method assumes a **read-only request** and automatically chooses between `GET` and `POST`.
	 * To perform a database write action, `requestOptions.method` must be explicitly set to `'POST'`.
	 *
	 * @param parameters Parameters to the API, including multi-value fields.
	 * @param keys The key(s) of the multi-value field(s) to split (e.g., `titles`).
	 * @param batchSize Optional batch size (defaults to the `apilimit`). Must be a positive integer less than
	 * or equal to the `apilimit`.
	 * @param requestOptions Optional HTTP request options.
	 * @returns
	 * A Promise resolving to an array of API responses or {@link MwbotError} objects for failed requests.
	 * The array will be empty if no values are provided to batch.
	 * @throws {MwbotError} If multi-values fail validation via {@link createBatchArray}.
	 */
	async massRequest(
		parameters: ApiParams,
		keys: string | string[],
		batchSize?: number,
		requestOptions?: MwbotRequestConfig
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

		// Set up request options
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
		const method = typeof requestOptions.method === 'string' && requestOptions.method.toUpperCase();
		if (method !== 'POST') {
			requestOptions.method = 'GET';
			(requestOptions as MwbotRequestConfig & ReadRequestConfig).autoMethod = true;
		}
		delete requestOptions._cloned; // Let request() handle mutation prevention for each request
		requestOptions.timeout ??= 120 * 1000;

		// Send API requests in batches of 100
		const results: (ApiResponse | MwbotError)[] = [];
		for (let i = 0; i < batchParams.length; i += 100) {
			const batch = batchParams.slice(i, i + 100).map((params) =>
				this.request(params, requestOptions).catch((err: MwbotError) => err)
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
				Mwbot.dieWithTypeError('string as element', 'keys', key);
			}
			const value = parameters[key];
			if (!Array.isArray(value)) {
				Mwbot.dieWithTypeError('array', `parameters["${key}"]`, value);
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

	/**
	 * Constructs a standard API request parameter object for a given MediaWiki API action.
	 *
	 * The returned object includes:
	 * ```ts
	 * {
	 *   action: action,
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param action The API action name (e.g., 'query', 'edit', etc.).
	 * @returns An object containing the action name along with fixed `format` and `formatversion` values.
	 */
	static getActionParams(action: ApiParamsAction): {
		action: ApiParamsAction;
		format: 'json';
		formatversion: '2';
	} {
		return {
			action,
			format: 'json',
			formatversion: '2'
		};
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
	 * @returns A Promise resolving to the API response, or rejecting with an error.
	 */
	async postWithToken(
		tokenType: string,
		parameters: ApiParams,
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponse> {
		this.dieIfAnonymous();
		const assertParams = {
			assert: parameters.assert,
			assertuser: parameters.assertuser
		};
		parameters.token = await this.getToken(tokenType, assertParams);
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
		requestOptions.disableRetryByCode = ['badtoken'];
		delete requestOptions._cloned; // Let post() handle mutation prevention
		const err = await this.post(parameters, requestOptions).catch((err: MwbotError) => err);
		if (!(err instanceof MwbotError)) {
			return err; // Success
		}
		// Error handler
		if (err.code === 'badtoken') {
			this.badToken(tokenType);
			// Try again, once
			parameters.token = await this.getToken(tokenType, assertParams);
			requestOptions._cloned = true; // requestOptions won't be reused; prevent redundant cloning
			return this.post(parameters, requestOptions);
		}
		throw err;
	}

	/**
	 * Retrieves a token of the specified type from the API.
	 *
	 * If a cached token is available, it is returned immediately. Otherwise, an API request is made to fetch a new token.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'query',
	 *   meta: 'tokens',
	 *   type: '*',
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param tokenType The type of token to retrieve (e.g., `csrf`).
	 * @param additionalParams
	 * Additional API parameters. If a string is provided, it is treated as the `assert` parameter.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the retrieved token, or rejecting with an error.
	 */
	async getToken(
		tokenType: string,
		additionalParams?: ApiParams | 'user' | 'bot' | 'anon',
		requestOptions?: MwbotRequestConfig
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
		const response = await this.get({
			...additionalParams,
			...Mwbot.getActionParams('query'),
			meta: 'tokens',
			type: '*'
		}, requestOptions);
		const tokenMap = response.query?.tokens;
		if (tokenMap && isEmptyObject(tokenMap) === false) {
			this.tokens = tokenMap; // Update cashed tokens
			const token = tokenMap[tokenName];
			if (token) {
				return token;
			} else {
				throw new MwbotError('api_mwbot', {
					code: 'badnamedtoken',
					info: 'Could not find a token named "' + tokenType + '" (check for typos?)'
				});
			}
		} else {
			Mwbot.dieAsEmpty(true, void 0, { response });
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
		delete this.tokens[tokenName];
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
	 * @returns A Promise resolving to the API response, or rejecting with an error.
	 */
	postWithCsrfToken(parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse> {
		return this.postWithToken('csrf', parameters, requestOptions);
	}

	/**
	 * Retrieves a csrf token from the API.
	 *
	 * This is a shorthand method of {@link getToken}.
	 *
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to a CSRF token, or rejecting with an error.
	 */
	getCsrfToken(requestOptions?: MwbotRequestConfig): Promise<string> {
		return this.getToken('csrf', void 0, requestOptions);
	}

	// ****************************** EDIT-RELATED REQUEST METHODS ******************************

	/**
	 * Validates and processes a title before use, and returns a {@link Title} instance.
	 * This method is used to normalize user input and ensure the title is valid for API access.
	 * If any validation fails, it throws an {@link MwbotError}.
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param options
	 * @param options.allowAnonymous Whether to allow anonymous users to proceed. Defaults to `false`.
	 * @param options.allowSpecial Whether to allow special page inputs. Defaults to `false`.
	 * @returns A validated {@link Title} instance.
	 * @throws {MwbotError} If:
	 * - The user is anonymous while `allowAnonymous` is `false`. (`anonymous`)
	 * - The title is neither a string nor a {@link Title} instance. (`typemismatch`)
	 * - The title is empty. (`emptytitle`)
	 * - The title is interwiki. (`interwikititle`)
	 * - The title is in the Special or Media namespace while `allowSpecial` is `false`. (`specialtitle`)
	 */
	protected validateTitle(title: string | Title, options: { allowAnonymous?: boolean; allowSpecial?: boolean } = {}): Title {
		const { allowAnonymous = false, allowSpecial = false } = options;
		this.dieIfAnonymous(!allowAnonymous);
		if (typeof title !== 'string' && !(title instanceof this.Title)) {
			Mwbot.dieWithTypeError('string or Title', 'title', title);
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
		if (!allowSpecial && title.getNamespaceId() < 0) {
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
	 * Method-specific default parameters, which `additionalParams` should be able to override.
	 * @param additionalParams User-provided additional parameters.
	 * @param requestOptions
	 * @returns
	 */
	protected async _save(
		title: Title,
		content: string,
		summary?: string,
		internalOptions: ApiParamsActionEdit = {},
		additionalParams: ApiParamsActionEdit = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseEditSuccess> {
		const res = await this.postWithCsrfToken({
			title: title.getPrefixedDb(),
			text: content,
			summary,
			bot: true,
			...internalOptions,
			...additionalParams,
			...Mwbot.getActionParams('edit'),
		}, requestOptions);
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
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'edit',
	 *   format: 'json',
	 *   formatversion: '2',
	 *   // `token` is automatically appended
	 * }
	 * ```
	 *
	 * Default parameters (can be overridden):
	 * ```
	 * {
	 *   title: title,
	 *   text: content,
	 *   summary: summary,
	 *   bot: true,
	 *   createonly: true
	 * }
	 * ```
	 *
	 * @param title The new page title, either as a string or a {@link Title} instance.
	 * @param content The text content of the new page.
	 * @param summary An optional edit summary.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Edit | `action=edit`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.edit` object (where the `result` property is guaranteed
	 * to be `'Success'`), or rejecting with an error.
	 */
	async create(
		title: string | Title,
		content: string,
		summary?: string,
		additionalParams: ApiParamsActionEdit = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseEditSuccess> {
		return this._save(this.validateTitle(title), content, summary, { createonly: true }, additionalParams, requestOptions);
	}

	/**
	 * Saves the given content to a page.
	 *
	 * - To create a new page, use {@link create} instead.
	 * - To edit an existing page using a transformation predicate, use {@link edit} instead.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'edit',
	 *   format: 'json',
	 *   formatversion: '2',
	 *   // `token` is automatically appended
	 * }
	 * ```
	 *
	 * Default parameters (can be overridden):
	 * ```
	 * {
	 *   title: title,
	 *   text: content,
	 *   summary: summary,
	 *   bot: true,
	 *   nocreate: true
	 * }
	 * ```
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param content The text content of the page.
	 * @param summary An optional edit summary.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Edit | `action=edit`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.edit` object (where the `result` property is guaranteed
	 * to be `'Success'`), or rejecting with an error.
	 */
	async save(
		title: string | Title,
		content: string,
		summary?: string,
		additionalParams: ApiParamsActionEdit = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseEditSuccess> {
		return this._save(this.validateTitle(title), content, summary, { nocreate: true }, additionalParams, requestOptions);
	}

	/**
	 * Edits an existing page by first fetching its latest revision and applying a transformation
	 * function to modify its content.
	 *
	 * This method automatically handles edit conflicts up to 3 times.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'edit',
	 *   format: 'json',
	 *   formatversion: '2',
	 *   // `token` is automatically appended
	 * }
	 * ```
	 *
	 * Default parameters (can be overridden by the return value of `transform`):
	 * ```
	 * {
	 *   title: revision.title, // Erased if "pageid" is provided
	 *   bot: true,
	 *   baserevid: revision.baserevid,
	 *   basetimestamp: revision.basetimestamp,
	 *   starttimestamp: revision.starttimestamp,
	 *   nocreate: true
	 * }
	 * ```
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param transform See {@link TransformationPredicate} for details.
	 * @param editRequestOptions Optional HTTP request options and exclusion compliance options.
	 * @returns A Promise resolving to the `response.edit` object (where the `result` property is guaranteed
	 * to be `'Success'`), or rejecting with an error.
	 */
	async edit(
		title: string | Title,
		transform: TransformationPredicate,
		editRequestOptions?: MwbotRequestConfig & ExclusionComplianceConfig,
		/** @hidden @private */
		retry?: number
	): Promise<ApiResponseEditSuccess> {

		if (typeof transform !== 'function') {
			Mwbot.dieWithTypeError('function', 'transform', transform);
		}
		// Prevent the client from manupilating the private parameter
		retry = [0, 1, 2, 3].includes(retry as any) ? retry as number : 0;

		// Parse request options
		const {
			comply = false,
			complianceTypes,
			...requestOptions
		} = Mwbot.unrefRequestOptions(editRequestOptions) as MwbotRequestConfig & ExclusionComplianceConfig;
		delete requestOptions._cloned; // Let the callee methods handle mutation prevention

		// Retrieve the latest revision content
		const revision = await this.read(title, requestOptions);
		const wikitext = new this.Wikitext(revision.content);
		if (comply) {
			this.dieIfDenied(revision.title, wikitext, complianceTypes);
		}

		// Apply transformation
		const unresolvedParams = transform(wikitext, { ...revision });
		const userParams = unresolvedParams instanceof Promise
			? await unresolvedParams
			: unresolvedParams;
		if (userParams === null) {
			throw new MwbotError('api_mwbot', {
				code: 'aborted',
				info: 'Edit aborted by the user.'
			});
		}
		if (!isPlainObject(userParams)) {
			Mwbot.dieWithTypeError('plain object return', 'tansform', userParams);
		}
		const parameters: ApiParamsActionEdit = {
			title: revision.title,
			bot: true,
			baserevid: revision.baserevid,
			basetimestamp: revision.basetimestamp,
			starttimestamp: revision.starttimestamp,
			nocreate: true,
			...userParams,
			...Mwbot.getActionParams('edit'),
		};
		if (typeof parameters.title === 'string' && typeof parameters.pageid === 'number') {
			delete parameters.title; // Mutually exclusive
		}

		// Not using _save() here because it's complicated to destructure the user-defined userParams
		const result = await this.postWithCsrfToken(parameters, requestOptions).catch((err: MwbotError) => err);
		const { disableRetry, disableRetryAPI, disableRetryByCode } = requestOptions;
		if (
			result instanceof MwbotError && result.code === 'editconflict' &&
			retry < 3 &&
			!disableRetry && !disableRetryAPI &&
			!disableRetryByCode?.some((code) => code === 'editconflict')
		) {
			console.warn('Warning: Encountered an edit conflict.');
			console.log('Retrying in 5 seconds...');
			await sleep(5000);
			return await this.edit(title, transform, editRequestOptions, retry + 1);
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
	 * Throws an error if the page opts out of bot editing via `{{bots}}` or `{{nobots}}` templates.
	 *
	 * This method checks the parsed wikitext for templates named `{{bots}}` or `{{nobots}}` and enforces
	 * bot exclusion rules based on the parameters `allow`, `deny`, or `optout`. If the page explicitly
	 * opts out of bot actions for the current user or for any of the specified `complianceTypes`, a
	 * {@link MwbotError} is thrown.
	 *
	 * It also emits console warnings for any suspicious or conflicting use of these templates, such as:
	 * - both `allow` and `deny` present in one `{{bots}}`
	 * - parameters inside `{{nobots}}`
	 * - presence of both `{{bots}}` and `{{nobots}}` on the same page
	 * - multiple instances of either template
	 *
	 * @param title The title of the page being processed.
	 * @param wikitext A {@link Wikitext} instance for the page, used to extract templates.
	 * @param complianceTypes A message type or list of message types to check against `|optout=`.
	 * @throws {MwbotError} If bot access is denied, either by a `{{nobots}}` template or a `{{bots}}`
	 * template that excludes the current user or any of the specified `complianceTypes`. (`botdenied`)
	 */
	protected dieIfDenied(
		title: string,
		wikitext: Wikitext,
		complianceTypes: string | string[] = []
	): never | void {

		// Retrieve {{bots}} and {{nobots}} transclusions
		const warnings: string[] = [];
		const config = this.config;
		const NS_TEMPLATE = config.get('wgNamespaceIds').template;
		const count = {
			bots: 0,
			nobots: 0
		};
		const templates = wikitext.parseTemplates({
			templatePredicate: (temp) => {
				const isTemplate =
					!temp.skip &&
					this._Template.is(temp, 'ParsedTemplate') &&
					temp.title.getNamespaceId() === NS_TEMPLATE;
				if (!isTemplate) {
					return false;
				}
				switch (temp.title.getMain()) {
					case 'Bots':
						count.bots++;
						if (
							temp.hasParam(({ key, value }) => !!(key === 'allow' && value)) &&
							temp.hasParam(({ key, value }) => !!(key === 'deny' && value))
						) {
							warnings.push(`The template "${temp.text}" unexpectedly includes both "|allow=" and "|deny=" parameters.`);
						}
						return true;
					case 'Nobots':
						count.nobots++;
						if (Object.keys(temp.params).length) {
							warnings.push(`The template "${temp.text}" unexpectedly includes parameters.`);
						}
						return true;
					default: return false;
				}
			}
		}) as ParsedTemplate[];
		if (!templates.length) {
			return;
		}

		const username = config.get('wgUserName');
		const deniedTypes = new Set(Array.isArray(complianceTypes) ? complianceTypes : [complianceTypes]);
		let text = '';
		for (const temp of templates) {

			// {{nobots}} being there means denied
			if (temp.title.getMain() === 'Nobots') {
				text = temp.text;
				break;
			}

			// Handle |allow=
			const allow = temp.getParam('allow');
			if (allow?.value) {
				const values = allow.value.split(',').map(v => v.trim()).filter(Boolean);
				if (values.includes('none')) {
					text = temp.text;
					if (values.length > 1) {
						warnings.push(`The template "${text}" contains "${allow.text}", which mixes "none" with other values.`);
					}
					break;
				}
				const isListed = values.some(name => name === 'all' || this._Title.normalizeUsername(name) === username);
				if (!isListed) {
					text = temp.text;
					break;
				}
			}

			// Handle |deny=
			const deny = temp.getParam('deny');
			if (deny?.value) {
				const values = deny.value.split(',').map(v => v.trim()).filter(Boolean);
				const hasNone = values.includes('none');
				if (hasNone && values.length > 1) {
					warnings.push(`The template "${temp.text}" contains "${deny.text}", which mixes "none" with other values.`);
					// continue instead of break
				} else if (hasNone) {
					// deny=none means allow all, do nothing
				} else {
					const isListed = values.some(name => name === 'all' || this._Title.normalizeUsername(name) === username);
					if (isListed) {
						text = temp.text;
						break;
					}
				}
			}

			// Check if a non-empty "|optout=" includes the current user's name
			const optout = temp.getParam('optout');
			if (optout?.value) {
				const isListed = optout.value.split(',').some((type) => {
					type = type.trim();
					if (!type) return false;
					return type === 'all' || deniedTypes.has(type);
				});
				if (isListed) {
					text = temp.text;
					break;
				}
			}

		}

		// Show warnings if caught
		if (count.bots && count.nobots) {
			warnings.push('This page contains both {{bots}} and {{nobots}} templates, which may conflict.');
		}
		if (count.bots > 1) {
			warnings.push(`This page includes {{bots}} ${count.bots} times.`);
		}
		if (count.nobots > 1) {
			warnings.push(`This page includes {{nobots}} ${count.nobots} times.`);
		}
		if (warnings.length && !this.userMwbotOptions.suppressWarnings) {
			console.warn(`[Warning]: Exclusion compliance warnings caught for "${title}".`);
			console.group();
			for (const w of warnings) {
				console.warn('- ' + w);
			}
			console.groupEnd();
		}

		// `text` being set means the page has opted out
		if (text) {
			throw new MwbotError('api_mwbot', {
				code: 'botdenied',
				info: `Bot edit denied due to "${text}".`
			}, { title });
		}

	}

	/**
	 * Posts a new section to the given page.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'edit',
	 *   format: 'json',
	 *   formatversion: '2',
	 *   // `token` is automatically appended
	 * }
	 * ```
	 *
	 * Default parameters (can be overridden):
	 * ```
	 * {
	 *   title: title,
	 *   section: 'new',
	 *   sectiontitle: sectiontitle,
	 *   text: content,
	 *   summary: summary,
	 *   bot: true
	 * }
	 * ```
	 *
	 * @param title The title of the page to edit.
	 * @param sectiontitle The section title.
	 * @param content The content of the new section.
	 * @param summary An optional edit summary. If not provided, the API generates one automatically.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Edit | `action=edit`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.edit` object (where the `result` property is guaranteed
	 * to be `'Success'`), or rejecting with an error.
	 */
	async newSection(
		title: string | Title,
		sectiontitle: string,
		content: string,
		summary?: string,
		additionalParams: ApiParamsActionEdit = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseEditSuccess> {
		return this._save(this.validateTitle(title), content, summary, { section: 'new', sectiontitle }, additionalParams, requestOptions);
	}

	// ****************************** OPTION-RELATED REQUEST METHODS ******************************

	/**
	 * Retrieves user options as a Map object.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'query',
	 *   meta: 'userinfo',
	 *   uiprop: 'options',
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param additionalParams Additional parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to a Map of option keys and their values, or rejecting
	 * with an error.
	 */
	async getOptions(
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<Map<string, OptionPrimitive>> {
		const response = await this.get({
			...additionalParams,
			...Mwbot.getActionParams('query'),
			meta: 'userinfo',
			uiprop: 'options'
		}, requestOptions);
		const options = response.query?.userinfo?.options;
		if (options) {
			return new Map(Object.entries(options));
		}
		Mwbot.dieAsEmpty(true, 'missing "response.query.userinfo.options"', { response });
	}

	/**
	 * Retrieves the value of a specific user option by key.
	 *
	 * This is a variant of {@link getOptions} that returns the value for a single key.
	 *
	 * @param key The name of the user option to retrieve.
	 * @param additionalParams Additional parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the option value if found, or `undefined` if not present.
	 */
	async getOption(
		key: string,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<OptionPrimitive | undefined> {
		return (await this.getOptions(additionalParams, requestOptions)).get(key);
	}

	/**
	 * Internal handler for fetching global user preferences and/or overrides.
	 *
	 * @param gprprop Which property or properties to retrieve.
	 * @param additionalParams Additional parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to a Map or an object of Maps, depending on `gprprop`.
	 * @throws {MwbotError} If not logged in or required properties are missing.
	 */
	protected async _getGlobalPreferences(
		gprprop: ['preferences', 'localoverrides'],
		additionalParams?: ApiParams,
		requestOptions?: MwbotRequestConfig
	): Promise<{
		preferences: Map<string, string>;
		localoverrides: Map<string, OptionPrimitive>;
	}>;
	protected async _getGlobalPreferences(
		gprprop: ['preferences'],
		additionalParams?: ApiParams,
		requestOptions?: MwbotRequestConfig
	): Promise<Map<string, string>>;
	protected async _getGlobalPreferences(
		gprprop: ['localoverrides'],
		additionalParams?: ApiParams,
		requestOptions?: MwbotRequestConfig
	): Promise<Map<string, OptionPrimitive>>;
	protected async _getGlobalPreferences(
		gprprop: ('preferences' | 'localoverrides')[],
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<any> {
		this.dieIfAnonymous();

		// Validate gprprop
		if (
			gprprop.length === 0 ||
			gprprop.length > 2 ||
			!gprprop.every(p => p === 'preferences' || p === 'localoverrides')
		) {
			throw new MwbotError('fatal', {
				code: 'internal',
				info: `Invalid "gprprop": ${JSON.stringify(gprprop)}`
			});
		}

		const response = await this.get({
			...additionalParams,
			...Mwbot.getActionParams('query'),
			meta: 'globalpreferences',
			gprprop: gprprop.join('|')
		}, requestOptions);

		const path = 'response.query.globalpreferences';
		const gp = response.query?.globalpreferences;
		if (!gp) {
			Mwbot.dieAsEmpty(true, `missing "${path}"`, { response });
		}

		// Helper to wrap object in Map, ensuring type safety
		const toMap = <T extends string | OptionPrimitive>(obj: Record<string, T>): Map<string, T> =>
			new Map(Object.entries(obj));

		// Both properties requested
		if (gprprop.length === 2) {
			const { preferences, localoverrides } = gp;
			if (!preferences || !localoverrides) {
				Mwbot.dieAsEmpty(true, `missing "preferences" and/or "localoverrides" in "${path}"`, { response });
			}
			return {
				preferences: toMap(preferences),
				localoverrides: toMap(localoverrides)
			};
		}

		// Single property requested
		const prop = gprprop[0];
		const data = gp[prop];
		if (!data) {
			Mwbot.dieAsEmpty(true, `missing "${prop}" in "${path}"`, { response });
		}
		return toMap(data);
	}

	/**
	 * Retrieves global user preferences and local overrides as Map objects.
	 *
	 * The returned object contains:
	 * - `preferences`: A Map of global user preference keys to string values.
	 * - `localoverrides`: A Map of locally overridden preference keys to their values.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'query',
	 *   meta: 'globalpreferences',
	 *   gprprop: 'preferences|localoverrides',
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param additionalParams Additional parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to an object containing `preferences` and `localoverrides` Maps.
	 * @throws {MwbotError} If the client is anonymous.
	 */
	getGlobalPreferences(
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<{
		preferences: Map<string, string>;
		localoverrides: Map<string, OptionPrimitive>;
	}> {
		return this._getGlobalPreferences(['preferences', 'localoverrides'], additionalParams, requestOptions);
	}

	/**
	 * Retrieves global user preferences as a Map.
	 *
	 * This is a variant of {@link getGlobalPreferences} that retrieves only the `preferences` portion.
	 *
	 * @param additionalParams Additional parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to a Map of global preference keys to string values.
	 * @throws {MwbotError} If the client is anonymous.
	 */
	getGlobalOptions(
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<Map<string, string>> {
		return this._getGlobalPreferences(['preferences'], additionalParams, requestOptions);
	}

	/**
	 * Retrieves the value of a specific global user preference by key.
	 *
	 * This is a variant of {@link getGlobalOptions} that returns the value for a single key.
	 *
	 * @param key The preference key to retrieve.
	 * @param additionalParams Additional parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the preference value as a string, or `undefined` if not set.
	 * @throws {MwbotError} If the client is anonymous.
	 */
	async getGlobalOption(
		key: string,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<string | undefined> {
		return (await this.getGlobalOptions(additionalParams, requestOptions)).get(key);
	}

	/**
	 * Retrieves global preference overrides as a Map.
	 *
	 * This is a variant of {@link getGlobalPreferences} that retrieves only the `localoverrides` portion.
	 *
	 * @param additionalParams Additional parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to a Map of overridden preference keys to their values.
	 * @throws {MwbotError} If the client is anonymous.
	 */
	getGlobalOptionOverrides(
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<Map<string, OptionPrimitive>> {
		return this._getGlobalPreferences(['localoverrides'], additionalParams, requestOptions);
	}

	/**
	 * Retrieves the value of a specific global preference override by key.
	 *
	 * This is a variant of {@link getGlobalOptionOverrides} that returns the value for a single key.
	 *
	 * @param key The override key to retrieve.
	 * @param additionalParams Additional parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the overridden value, or `undefined` if not set.
	 * @throws {MwbotError} If the client is anonymous.
	 */
	async getGlobalOptionOverride(
		key: string,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<OptionPrimitive | undefined> {
		return (await this.getGlobalOptionOverrides(additionalParams, requestOptions)).get(key);
	}

	/**
	 * Promise tracking the currently ongoing options save request.
	 * Prevents overlapping option writes by serializing calls to {@link _saveOptions}.
	 * Set to `null` when no save operation is active.
	 */
	protected saveOptionsRequest: Promise<ApiResponse> | null = null;

	/**
	 * Internal handler for saving user options or global preferences.
	 *
	 * Supports batching and serialization of requests to comply with API constraints and prevent overlapping modifications.
	 *
	 * @template T `'options'`, `'globalpreferences'`, or `'globalpreferenceoverrides'`.
	 * @param action The API action to perform.
	 * @param options A plain object or `Map` of option keys to values. Use `null` to reset an option.
	 * @param additionalParams User-provided additional parameters to the API.
	 * @param requestOptions User-provided optional HTTP request options.
	 * @returns A Promise resolving to an API response with a guaranteed `"success"` result for `response[action]`.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - `options` is neither a plain object nor Map. (`typemismatch`)
	 */
	protected async _saveOptions<T extends 'options' | 'globalpreferences' | 'globalpreferenceoverrides'>(
		action: T,
		options: Record<string, OptionPrimitive> | Map<string, OptionPrimitive>,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<PartiallyRequired<ApiResponse, T>> {

		this.dieIfAnonymous();
		if (isPlainObject(options)) {
			options = new Map(Object.entries(options));
		} else if (!(options instanceof Map)) {
			Mwbot.dieWithTypeError('plain object or Map', 'options', options);
		}

		// Create `key=value` pairs
		const batches: { pairs: string[]; bundleable: boolean; usePipe: boolean }[] = [];
		const apilimit = this.apilimit;
		for (const [key, v] of options) {

			const value = v === null ? null : String(v);
			const bundleable = !key.includes('=');
			const usePipe = !key.includes('|') && (value === null || !value.includes('|'));

			// Start new batch if:
			// - No batches yet
			// - Last batch cannot bundle further
			// - Last batch reached apilimit
			let last = batches.at(-1);
			if (!last?.bundleable || last.pairs.length >= apilimit) {
				batches.push({ pairs: [], bundleable, usePipe });
			}
			last = batches.at(-1)!;

			const change = value !== null
				? `${key}=${value}`
				: key; // Omitting value resets the option
			last.pairs.push(change);
			last.bundleable &&= bundleable; // Keep false or set to false unless both are true
			last.usePipe &&= usePipe;

		}

		// Wait for prior request if present
		if (this.saveOptionsRequest) {
			await this.saveOptionsRequest;
		}

		// Send requests sequentially per batch
		const unicodeSep = '\u001F';
		for (const [i, { pairs, usePipe }] of Object.entries(batches)) {
			const change = usePipe
				? pairs.join('|')
				: unicodeSep + pairs.join(unicodeSep);

			this.saveOptionsRequest = this.postWithCsrfToken({
				...additionalParams,
				...Mwbot.getActionParams(action),
				change
			}, requestOptions).then((res) => {
				if (res[action] === 'success') {
					return res;
				}
				Mwbot.dieAsEmpty(true, `expected "response.${action}" to be "success"`, { response: res });
			});

			// Await each batch sequentially except for the last one
			if (parseInt(i) !== batches.length - 1) {
				await this.saveOptionsRequest;
			}
		}

		return await this.saveOptionsRequest! as PartiallyRequired<ApiResponse, T>;
	}

	/**
	 * Saves user options based on the provided `options` mapping.
	 *
	 * If a value is set to `null`, the corresponding option will be reset to its default.
	 *
	 * The method batches option updates if the total exceeds {@link apilimit} or if key/value
	 * constraints prevent bundling. Sequential API calls are issued when needed, but only a
	 * single Promise is returned, resolving once all requests complete.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'options',
	 *   change: options, // Automatically formatted
	 *   format: 'json',
	 *   formatversion: '2',
	 *   // `token` is automatically appended
	 * }
	 * ```
	 *
	 * @param options A plain object or `Map` of option keys to values. Use `null` to reset an option.
	 *
	 * **Avoid passing the full Map returned by {@link getOptions} as it may include unmodified values.**
	 * @param additionalParams Additional parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to an API response where `response.options` is guaranteed to be `'success'`.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - `options` is neither a plain object nor Map. (`typemismatch`)
	 */
	saveOptions(
		options: Record<string, OptionPrimitive> | Map<string, OptionPrimitive>,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<PartiallyRequired<ApiResponse, 'options'>> {
		return this._saveOptions('options', options, additionalParams, requestOptions);
	}

	/**
	 * Saves a single user option. Providing `null` as the value resets the option to its default.
	 *
	 * This is a variant of {@link saveOptions} which operates on a single option key.
	 *
	 * @param key The option key to update.
	 * @param value The new value to set, or `null` to reset to default.
	 * @param additionalParams Additional parameters to the API.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to an API response where `response.options` is guaranteed to be `'success'`.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - `options` is neither a plain object nor Map. (`typemismatch`)
	 */
	saveOption(
		key: string,
		value: OptionPrimitive,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<PartiallyRequired<ApiResponse, 'options'>> {
		return this._saveOptions('options', { [key]: value }, additionalParams, requestOptions);
	}

	/**
	 * Saves global user options.
	 *
	 * This is a variant of {@link saveOptions} and instead performs a `action=globalpreferences` request.
	 *
	 * @param options
	 * @param additionalParams
	 * @param requestOptions
	 * @returns
	 */
	saveGlobalOptions(
		options: Record<string, OptionPrimitive> | Map<string, OptionPrimitive>,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<PartiallyRequired<ApiResponse, 'globalpreferences'>> {
		return this._saveOptions('globalpreferences', options, additionalParams, requestOptions);
	}

	/**
	 * Saves a single global user option.
	 *
	 * This is a variant of {@link saveGlobalOptions} which operates on a single option key.
	 *
	 * @param key
	 * @param value
	 * @param additionalParams
	 * @param requestOptions
	 * @returns
	 */
	saveGlobalOption(
		key: string,
		value: OptionPrimitive,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<PartiallyRequired<ApiResponse, 'globalpreferences'>> {
		return this._saveOptions('globalpreferences', { [key]: value }, additionalParams, requestOptions);
	}

	/**
	 * Saves global user option overrides.
	 *
	 * This is a variant of {@link saveOptions} and instead performs a `action=globalpreferenceoverrides` request.
	 *
	 * @param options
	 * @param additionalParams
	 * @param requestOptions
	 * @returns
	 */
	saveGlobalOptionOverrides(
		options: Record<string, OptionPrimitive> | Map<string, OptionPrimitive>,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<PartiallyRequired<ApiResponse, 'globalpreferenceoverrides'>> {
		return this._saveOptions('globalpreferenceoverrides', options, additionalParams, requestOptions);
	}

	/**
	 * Saves a single global user option override.
	 *
	 * This is a variant of {@link saveGlobalOptionOverrides} which operates on a single option key.
	 *
	 * @param key
	 * @param value
	 * @param additionalParams
	 * @param requestOptions
	 * @returns
	 */
	saveGlobalOptionOverride(
		key: string,
		value: OptionPrimitive,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<PartiallyRequired<ApiResponse, 'globalpreferenceoverrides'>> {
		return this._saveOptions('globalpreferenceoverrides', { [key]: value }, additionalParams, requestOptions);
	}

	// ****************************** ACTION-RELATED UTILITY REQUEST METHODS ******************************

	/**
	 * Blocks a user.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'block',
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * Default parameters:
	 * ```
	 * {
	 *   user: target,
	 *   anononly: true, // Soft-block
	 *   nocreate: true,
	 *   autoblock: true,
	 *   allowusertalk: true
	 * }
	 * ```
	 *
	 * @param target The user name, IP address, or user ID to block.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Block#Blocking_users | `action=block`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.block` object, or rejecting with an error.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - The client lacks the `block` user right. (`nopermission`)
	 * - `target` is not a string. (`typemismatch`)
	 */
	async block(
		target: string,
		additionalParams: ApiParamsActionBlock = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseBlock> {

		this.dieIfNoRights('block', 'block users');

		if (typeof target !== 'string') {
			Mwbot.dieWithTypeError('string', 'target', target);
		}

		const response = await this.postWithCsrfToken({
			user: target,
			anononly: true,
			nocreate: true,
			autoblock: true,
			allowusertalk: true,
			...additionalParams,
			...Mwbot.getActionParams('block')
		}, requestOptions);
		if (response.block) {
			return response.block;
		}
		Mwbot.dieAsEmpty(true, 'missing "response.block"', { response });

	}

	/**
	 * Deletes a page.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'delete',
	 *   title: titleOrId, // If a string or a Title instance
	 *   pageid: titleOrId, // If a number
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param titleOrId The title or ID of the page to delete.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Delete | `action=delete`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.delete` object, or rejecting with an error.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - The client lacks the `delete` user right. (`nopermission`)
	 * - `titleOrId`, if not a number, fails validation via {@link validateTitle}.
	 */
	async delete(
		titleOrId: string | Title | number,
		additionalParams: Partial<ApiParamsActionDelete> = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseDelete> {

		this.dieIfNoRights('delete', 'delete pages');

		let pageId: number | false = false;
		let title: string | false = false;
		if (typeof titleOrId === 'number') {
			pageId = titleOrId;
		} else {
			title = this.validateTitle(titleOrId).getPrefixedText();
		}

		const response = await this.postWithCsrfToken({
			...additionalParams,
			...Mwbot.getActionParams('delete'),
			title,
			pageid: pageId
		}, requestOptions);
		if (response.delete) {
			return response.delete;
		}
		Mwbot.dieAsEmpty(true, 'missing "response.delete"', { response });

	}

	/**
	 * Logs in to the wiki for which this instance has been initialized.
	 *
	 * @param username
	 * @param password
	 * @returns A Promise resolving to the API response, or rejecting with an error.
	 */
	protected async login(username: string, password: string): Promise<ApiResponse> { // TODO: Make this method public?

		// Fetch a login token
		const disableRetryAPI = { disableRetryAPI: true };
		const token = await this.getToken('login', { maxlag: void 0 }, disableRetryAPI);

		// Login
		const response = await this.post({
			...Mwbot.getActionParams('login'),
			lgname: username,
			lgpassword: password,
			lgtoken: token,
			maxlag: void 0 // Overwrite maxlag to have this request prioritized
		}, disableRetryAPI);
		if (!response.login) {
			Mwbot.dieAsEmpty(true, 'missing "response.login"', { response });
		} else if (response.login.result !== 'Success') {
			throw new MwbotError('api_mwbot', {
				code: 'loginfailed',
				info: response.login.reason || 'Failed to log in.'
			}, { response });
		} else {
			this.tokens = {}; // Clear cashed tokens because these can't be used for the newly logged-in user
			return response;
		}

	}

	/**
	 * Moves a page.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'move',
	 *   from: from, // If a string or a Title instance
	 *   fromid: from, // If a number
	 *   to: to,
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param from The title or ID of the page to move.
	 * @param to The destination title.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Move | `action=move`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.move` object, or rejecting with an error.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - The client lacks the `move` user right. (`nopermission`)
	 * - `from` is not a number and fails validation via {@link validateTitle}.
	 * - `to` fails validation via {@link validateTitle}.
	 */
	async move(
		from: string | Title | number,
		to: string | Title,
		additionalParams: Partial<ApiParamsActionMove> = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseMove> {

		this.dieIfNoRights('move', 'move pages');

		let fromId: number | false = false;
		let fromTitle: string | false = false;
		if (typeof from === 'number') {
			fromId = from;
		} else {
			fromTitle = this.validateTitle(from).getPrefixedText();
		}
		const toTitle = this.validateTitle(to).getPrefixedText();

		const response = await this.postWithCsrfToken({
			...additionalParams,
			...Mwbot.getActionParams('move'),
			from: fromTitle,
			fromid: fromId,
			to: toTitle
		}, requestOptions);
		if (response.move) {
			return response.move;
		}
		Mwbot.dieAsEmpty(true, 'missing "response.move"', { response });

	}

	/**
	 * Parses content via the API.
	 *
	 * Enforced parameters:
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
	 * @returns A Promise resolving to the `response.parse` object, or rejecting with an error.
	 * @throws {MwbotError} If `response.parse` is missing. (`empty`)
	 */
	async parse(params: ApiParamsActionParse, requestOptions?: MwbotRequestConfig): Promise<ApiResponseParse> {
		const response = await this.fetch({
			...params,
			...Mwbot.getActionParams('parse')
		}, requestOptions);
		if (response.parse) {
			return response.parse;
		}
		Mwbot.dieAsEmpty(true, 'missing "response.parse"', { response });
	}

	/**
	 * Protects a page.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'protect',
	 *   title: titleOrId, // If a string or a Title instance
	 *   pageid: titleOrId, // If a number
	 *   protections: levels,
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param titleOrId The title or ID of the page to protect.
	 * @param levels The protection levels to apply, in one of the following forms:
	 * - A pipe-separated string (e.g., `'edit=sysop|move=sysop'`)
	 * - An array of `action=level` strings (e.g., `['edit=sysop', 'move=sysop']`)
	 * - An object map of actions to levels (e.g., `{ edit: 'sysop', move: 'sysop' }`)
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Protect | `action=protect`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.protect` object, or rejecting with an error.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - The client lacks the `protect` user right. (`nopermission`)
	 * - `titleOrId` is not a number and fails validation via {@link validateTitle}.
	 * - `levels` is of an invalid type. (`typemismatch`)
	 */
	async protect(
		titleOrId: string | Title | number,
		levels: string | string[] | { [action: string]: string },
		additionalParams: Partial<ApiParamsActionProtect> = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseProtect> {

		this.dieIfNoRights('protect', 'protect pages');

		let pageId: number | false = false;
		let title: string | false = false;
		if (typeof titleOrId === 'number') {
			pageId = titleOrId;
		} else {
			title = this.validateTitle(titleOrId).getPrefixedText();
		}

		let protections: string;
		if (typeof levels === 'string') {
			protections = levels;
		} else if (Array.isArray(levels)) {
			protections = levels.join('|');
		} else if (isObject(levels)) {
			protections = Object.entries(levels).map(([action, level]) => `${action}=${level}`).join('|');
		} else {
			Mwbot.dieWithTypeError('string, string array, or mapped object', 'levels', levels);
		}

		const response = await this.postWithCsrfToken({
			...additionalParams,
			...Mwbot.getActionParams('protect'),
			title,
			pageid: pageId,
			protections
		}, requestOptions);
		if (response.protect) {
			return response.protect;
		}
		Mwbot.dieAsEmpty(true, 'missing "response.protect"', { response });

	}

	/**
	 * Purges the cache for the given titles.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'purge',
	 *   titles: titles,
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param titles The titles to purge the cache for.
	 *
	 * The maximum number of values is 50 or 500 (see also {@link apilimit}).
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Purge | `action=purge`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @return A Promise that resolves to an {@link ApiResponse} object. This is the full response,
	 * not just the `response.purge` array, allowing access to top-level properties like `normalized`
	 * and `redirects`.
	 * @throws {MwbotError} If:
	 * - The client lacks the `purge` user right. (`nopermission`)
	 * - `titles` contains non-strings or non-Titles. (`typemismatch`)
	 */
	async purge(
		titles: (string | Title)[],
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<PartiallyRequired<ApiResponse, 'purge'>> {

		// Check the types of `titles` without using `validateTitle`
		// The `action=purge` API call does not throw an error for invalid titles
		// Instead, it returns a response that may lack the `{ purged: true }` property
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
			throw new MwbotError('fatal', {
				code: 'typemismatch',
				info: 'The array passed as the first argument of purge() must only contain strings or Title instances.'
			}, { invalid });
		}

		const response = await this.post({
			...additionalParams,
			...Mwbot.getActionParams('purge'),
			titles: [...titleSet]
		}, requestOptions);
		if (response.purge) {
			// TODO: Should this return the "response.purge" object?
			// May be good as is, where the client can access properties like "normalized" and "redirects"
			return response as PartiallyRequired<ApiResponse, 'purge'>;
		}
		Mwbot.dieAsEmpty(true, 'missing "response.purge"', { response });

	}

	/**
	 * Rolls back the most recent edits to a page made by a specific user.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'rollback',
	 *   title: titleOrId, // If a string or a Title instance
	 *   pageid: titleOrId, // If a number
	 *   user: user,
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param titleOrId The title or ID of the page to rollback.
	 * @param user The username whose consecutive edits to the page should be rolled back.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Rollback | `action=rollback`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.rollback` object, or rejecting with an error.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - The client lacks the `rollback` user right. (`nopermission`)
	 * - `titleOrId`, if not a number, fails validation via {@link validateTitle}.
	 */
	async rollback(
		titleOrId: string | Title | number,
		user: string,
		additionalParams: Partial<ApiParamsActionRollback> = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseRollback> {

		this.dieIfNoRights('rollback', 'rollback edits');

		let pageId: number | false = false;
		let title: string | false = false;
		if (typeof titleOrId === 'number') {
			pageId = titleOrId;
		} else {
			title = this.validateTitle(titleOrId).getPrefixedText();
		}
		if (typeof user !== 'string') {
			Mwbot.dieWithTypeError('string', 'user', user);
		}

		const response = await this.postWithToken('rollback', {
			...additionalParams,
			...Mwbot.getActionParams('rollback'),
			title,
			pageid: pageId,
			user
		}, requestOptions);
		if (response.rollback) {
			return response.rollback;
		}
		Mwbot.dieAsEmpty(true, 'missing "response.rollback"', { response });

	}

	/**
	 * Unblocks a user.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'unblock',
	 *   id: userOrId, // If a number
	 *   user: userOrId, // If a string
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param userOrId The user name, IP address, user ID, or block ID to unblock.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Block#Unblocking_users | `action=unblock`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.unblock` object, or rejecting with an error.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - The client lacks the `block` user right. (`nopermission`)
	 * - `userOrId` is neither a string nor a number. (`typemismatch`)
	 */
	async unblock(
		userOrId: string | number,
		additionalParams: ApiParamsActionUnblock = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseUnblock> {

		this.dieIfNoRights('block', 'unblock users');

		const id = typeof userOrId === 'number' && userOrId;
		const user = typeof userOrId === 'string' && userOrId;
		if (id === false && user === false) {
			Mwbot.dieWithTypeError('string or number', 'userOrId', userOrId);
		}

		const response = await this.postWithCsrfToken({
			...additionalParams,
			...Mwbot.getActionParams('unblock'),
			id,
			user
		}, requestOptions);
		if (response.unblock) {
			return response.unblock;
		}
		Mwbot.dieAsEmpty(true, 'missing "response.unblock"', { response });

	}

	/**
	 * Undeletes revisions of a deleted page.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'undelete',
	 *   title: title,
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * This method does not automatically handle multi-value fields that exceed the {@link apilimit}.
	 * Such cases must be handled manually (e.g., via {@link massRequest}).
	 *
	 * @param title The title of the page to undelete.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Undelete | `action=undelete`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.undelete` object, or rejecting with an error.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - The client lacks the `undelete` user right. (`nopermission`)
	 * - `title` fails title validation via {@link validateTitle}.
	 */
	async undelete(
		title: string | Title,
		additionalParams: Partial<ApiParamsActionUndelete> = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseUndelete> {

		this.dieIfNoRights('undelete', 'undelete revisions');

		title = this.validateTitle(title).getPrefixedText();
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
		requestOptions.timeout ??= 180 * 1000;

		const response = await this.postWithCsrfToken({
			...additionalParams,
			...Mwbot.getActionParams('undelete'),
			title
		}, requestOptions);
		if (response.undelete) {
			return response.undelete;
		}
		Mwbot.dieAsEmpty(true, 'missing "response.undelete"', { response });

	}

	/**
	 * Unprotects a page.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'protect',
	 *   title: titleOrId, // If a string or a Title instance
	 *   pageid: titleOrId, // If a number
	 *   protections: '', // Remove all protections
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param titleOrId The title or ID of the page to protect.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Protect | `action=protect`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the `response.protect` object, or rejecting with an error.
	 * @throws {MwbotError} If:
	 * - The client is anonymous. (`anonymous`)
	 * - The client lacks the `protect` user right. (`nopermission`)
	 * - `titleOrId` is not a number and fails title validation via {@link validateTitle}.
	 */
	async unprotect(
		titleOrId: string | Title | number,
		additionalParams: Partial<ApiParamsActionProtect> = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseProtect> {
		// Use async-await to handle exceptions as Promise rejections
		return await this.protect(titleOrId, '', additionalParams, requestOptions);
	}

	// ****************************** QUERY-RELATED UTILITY REQUEST METHODS ******************************

	/**
	 * Retrieves the latest revision content of a given title from the API.
	 *
	 * @param title The page title, either as a string or a {@link Title} instance.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the revision information.
	 * @throws {MwbotError} If:
	 * - `title` fails validation via {@link validateTitle}.
	 * - The requested title does not exist. (`pagemissing`)
	 */
	async read(title: string | Title, requestOptions?: MwbotRequestConfig): Promise<Revision>;
	/**
	 * Retrieves the latest revision contents of multiple titles from the API.
	 *
	 * This method returns a Promise resolving to an array of revision information, whose length is exactly
	 * the same as the input `titles` array. This ensures that each title at a specific index in `titles`
	 * will have its corresponding response at the same index in the returned array, preserving a strict
	 * mapping between inputs and outputs.
	 *
	 * @param titles An array of the page titles, either as strings or {@link Title} instances, or mixed.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to an array of revision information, with errors for invalid titles at
	 * their respective indexes.
	 */
	async read(titles: (string | Title)[], requestOptions?: MwbotRequestConfig): Promise<(Revision | MwbotError)[]>;
	async read(
		titles: string | Title | (string | Title)[],
		requestOptions?: MwbotRequestConfig
	): Promise<Revision | (Revision | MwbotError)[]> {

		// If `titles` isn't an array, verify it (validateTitle throws an error if the title is invalid)
		const singleTitle = !Array.isArray(titles) && this.validateTitle(titles, { allowAnonymous: true });

		// `pageids` and `revids` shouldn't be set because we use the `titles` parameter
		requestOptions = Mwbot.unrefRequestOptions(requestOptions);
		if (isObject(requestOptions.params)) {
			delete requestOptions.params.pageids;
			delete requestOptions.params.revids;
		}

		// Set a twice-as-long timeout because content-fetching is time-consuming
		if (typeof requestOptions.timeout !== 'number') {
			requestOptions.timeout = 120 * 1000; // 120 seconds
		}

		const params: ApiParams = {
			...Mwbot.getActionParams('query'),
			// titles, // Set below dynamically
			prop: 'revisions',
			rvprop: 'ids|timestamp|user|content',
			rvslots: 'main',
			curtimestamp: true
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
				return Mwbot.dieAsEmpty(false, void 0, { title: page.title });
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
				Mwbot.dieAsEmpty(true, 'missing "response.query.pages"', { title: t });
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
				const page = this.validateTitle(titlesArray[i], { allowAnonymous: true }).getPrefixedText();
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
				setToAll(Mwbot.dieAsEmpty(false, 'missing "response.query.pages"', { response: res }), batchIndex);
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
			throw new MwbotError('fatal', {
				code: 'internal',
				info: `"ret" has empty slots at index ${emptyIndexes.join(', ')}.`
			});
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
					ret[retIndex] = { ...value };
				}
			});
		}

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
	 * - If `false` (default), the method throws if any input title fails validation
	 *   via {@link validateTitle}.
	 * - If `true`, such titles are skipped (and `exists()` will return `null` for them).
	 *
	 * @param options.rejectProof Whether to suppress request errors (default: `false`).
	 * If set to `true`, the method always resolves to a function, though that function
	 * may return `null` frequently due to missing data.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise that resolves to an `exists()` function, or rejects with
	 * an error (unless `rejectProof` is `true`).
	 */
	async getExistencePredicate(
		titles: (string | Title)[],
		options: { loose?: boolean; rejectProof?: boolean } = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ExistencePredicate> {

		const loose = !!options.loose;
		const rejectProof = !!options.rejectProof;

		// Collect valid target titles
		const targets = titles.reduce((acc, title) => {
			try {
				acc.add(this.validateTitle(title, { allowAnonymous: true }).getPrefixedText());
			} catch (err) {
				if (!loose) throw err;
			}
			return acc;
		}, new Set<string>());

		// Query the API for title existence
		const responses = await this.massRequest({
			...Mwbot.getActionParams('query'),
			titles: Array.from(targets)
		}, 'titles', void 0, requestOptions);

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
				Mwbot.dieAsEmpty(true, 'missing "response.query.pages"', { response: res });
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
				const t = this.Title.normalize(title, { format: 'api' });
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
	 * @param hidden A specification to enumerate hidden categories. This manipulates the `clshow` parameter
	 * for {@link https://www.mediawiki.org/wiki/API:Categories | `prop=categories`}:
	 * - If not provided, enumerates both hidden and unhidden categories.
	 * - If `true`, only enumerates hidden categories (`clshow=hidden`).
	 * - If `false`, only enumerates unhidden categories (`clshow=!hidden`).
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise that resolves to:
	 * - An array of category titles (without the namespace prefix) if a single title is provided.
	 * - An object mapping each normalized title (as returned by {@link TitleStatic.normalize} in `'api'` format)
	 *   to an array of category titles (without the namespace prefix) if multiple titles are provided.
	 * @throws {MwbotError} If
	 * - Any input title fails validation via {@link validateTitle}.
	 * - `titles` is an empty array. (`emptyinput`)
	 */
	getCategories(
		titles: string | Title,
		hidden?: boolean,
		requestOptions?: MwbotRequestConfig
	): Promise<string[]>;
	getCategories(
		titles: (string | Title)[],
		hidden?: boolean,
		requestOptions?: MwbotRequestConfig
	): Promise<Record<string, string[]>>;
	async getCategories(
		titles: string | Title | (string | Title)[],
		hidden?: boolean,
		requestOptions?: MwbotRequestConfig
	): Promise<string[] | Record<string, string[]>> {

		// Normalize titles
		const isArrayInput = Array.isArray(titles);
		const titleSet = new Set<string>();
		for (const t of (isArrayInput ? titles : [titles])) {
			titleSet.add(this.validateTitle(t, { allowAnonymous: true }).getPrefixedText());
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
			...Mwbot.getActionParams('query'),
			titles: validatedTitles,
			prop: 'categories',
			clshow: hidden ? 'hidden' : hidden === false ? '!hidden' : undefined,
			cllimit: 'max'
		}, {
			limit: Infinity,
			multiValues: 'titles'
		}, requestOptions);

		// Process the responses and format categories
		const config = this.config;
		const NS_CATEGORY = config.get('wgNamespaceIds').category;
		const CATEGORY_PREFIX = config.get('wgFormattedNamespaces')[NS_CATEGORY] + ':';

		const result: Record<string, string[]> = Object.create(null);
		for (const res of responses) {
			const pages = res.query?.pages;
			if (!pages) Mwbot.dieAsEmpty(true, 'missing "response.query.pages"', { response: res });
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
	 * Retrieves a list of categories whose titles match the specified prefix.
	 *
	 * @param prefix The prefix to match.
	 * @param limit The maximum number of continuation cycles to perform (default: `Infinity`).
	 * Specify this if the `prefix` is very generic and may produce too many results.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise that resolves to an array of matched category titles, excluding the namespace prefix.
	 * @throws {MwbotError} If `limit` is provided and is not a positive integer or `Infinity`. (`invalidlimit`)
	 */
	async getCategoriesByPrefix(
		prefix: string,
		limit = Infinity,
		requestOptions?: MwbotRequestConfig
	): Promise<string[]> {

		// Validate limit
		if ((!Number.isInteger(limit) && limit !== Infinity) || limit <= 0) {
			throw new MwbotError('fatal', {
				code: 'invalidlimit',
				info: '"limit" must be a positive integer.'
			});
		}

		const config = this.config;
		const NS_CATEGORY = config.get('wgNamespaceIds').category;
		const CATEGORY_PREFIX = config.get('wgFormattedNamespaces')[NS_CATEGORY] + ':';

		const responses = await this.continuedRequest({
			...Mwbot.getActionParams('query'),
			list: 'allpages',
			apprefix: prefix,
			apnamespace: NS_CATEGORY,
			aplimit: 'max'
		}, { limit }, requestOptions);

		const retSet = new Set<string>();
		for (const res of responses) {
			const allpages = res.query?.allpages;
			if (!allpages) Mwbot.dieAsEmpty(true, 'missing "response.query.allpages"', { response: res });
			allpages.forEach(({ title }) => {
				retSet.add(title.replace(CATEGORY_PREFIX, ''));
			});
		}
		return Array.from(retSet);

	}

	/**
	 * Retrieves a list of pages that belong to the given category.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'query',
	 *   list: 'categorymembers',
	 *   cmtitle: titleOrId, // If a string or a Title instance
	 *   cmpageid: titleOrId, // If a number
	 *   cmlimit: 'max',
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param titleOrId The **prefixed** title or the page ID of the category to enumerate.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Categorymembers | `list=categorymembers`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the result array in `response.query.categorymembers`, or rejecting with an error.
	 * @throws {MwbotError} If:
	 * - `titleOrId`, if not a number, fails title validation via {@link validateTitle}.
	 * - `titleOrId`, if not a number, is not a category title. (`invalidtitle`)
	 */
	async getCategoryMembers(
		titleOrId: string | Title | number,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseQueryListCategorymembers[]> {

		// Validate title
		let pageId: number | false = false;
		let title: Title | false = false;
		if (typeof titleOrId === 'number') {
			pageId = titleOrId;
		} else {
			title = this.validateTitle(titleOrId, { allowAnonymous: true });
			const NS_CATEGORY = this.config.get('wgNamespaceIds').category;
			if (title.getNamespaceId() !== NS_CATEGORY) {
				throw new MwbotError('api_mwbot', {
					code: 'invalidtitle',
					info: `"${titleOrId}" is not a category title.`
				});
			}
		}

		// Query the API
		const responses = await this.continuedRequest({
			...additionalParams,
			...Mwbot.getActionParams('query'),
			list: 'categorymembers',
			cmtitle: title && title.getPrefixedText(),
			cmpageid: pageId,
			cmlimit: 'max'
		}, { limit: Infinity }, requestOptions);

		// Format the responses and return them as an array
		let ret: ApiResponseQueryListCategorymembers[] = [];
		responses.forEach((res) => {
			const members = res.query?.categorymembers;
			if (!members) Mwbot.dieAsEmpty(true, 'missing "response.query.categorymembers"', { response: res });
			ret = ret.concat(members);
		});
		return ret;

	}

	/**
	 * Retrieves a list of pages that link to the given page(s).
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'query',
	 *   titles: titles,
	 *   prop: 'linkshere',
	 *   lhlimit: 'max',
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param titles A single title or an array of titles to enumerate backlinks for.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Linkshere | `prop=linkshere`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise that resolves to:
	 * - An array of `linkshere` objects if a single title is provided.
	 * - An object mapping each normalized title (as returned by {@link TitleStatic.normalize} in `'api'` format)
	 *   to an array of `linkshere` objects if multiple titles are provided.
	 * @throws {MwbotError} If
	 * - Any input title fails validation via {@link validateTitle} (with `allowSpecial` set to `true`).
	 * - `titles` is an empty array. (`emptyinput`)
	 */
	getBacklinks(
		titles: string | Title,
		additionalParams?: ApiParams,
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseQueryPagesPropLinkshere[]>;
	getBacklinks(
		titles: (string | Title)[],
		additionalParams?: ApiParams,
		requestOptions?: MwbotRequestConfig
	): Promise<Record<string, ApiResponseQueryPagesPropLinkshere[]>>;
	async getBacklinks(
		titles: string | Title | (string | Title)[],
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseQueryPagesPropLinkshere[] | Record<string, ApiResponseQueryPagesPropLinkshere[]>> {

		// Normalize titles
		const isArrayInput = Array.isArray(titles);
		const titleSet = new Set<string>();
		for (const t of (isArrayInput ? titles : [titles])) {
			titleSet.add(this.validateTitle(t, { allowAnonymous: true, allowSpecial: true }).getPrefixedText());
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
			...additionalParams,
			...Mwbot.getActionParams('query'),
			titles: validatedTitles,
			prop: 'linkshere',
			lhlimit: 'max'
		}, {
			limit: Infinity,
			multiValues: 'titles'
		}, requestOptions);

		// Process the responses and return them
		const result: Record<string, ApiResponseQueryPagesPropLinkshere[]> = Object.create(null);
		for (const res of responses) {
			const pages = res.query?.pages;
			if (!pages) Mwbot.dieAsEmpty(true, 'missing "response.query.pages"', { response: res });
			pages.forEach(({ title, linkshere }) => {
				if (!title || !linkshere) return;
				result[title] ||= [];
				result[title].push(...linkshere);
			});
		}

		if (isArrayInput) {
			return result;
		} else {
			return result[validatedTitles[0]] || [];
		}

	}

	/**
	 * Retrieves a list of pages that transclude the given page(s).
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'query',
	 *   titles: titles,
	 *   prop: 'transcludedin',
	 *   tilimit: 'max',
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param titles A single title or an array of titles to enumerate transclusions for.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Transcludedin | `prop=transcludedin`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise that resolves to:
	 * - An array of `transcludedin` objects if a single title is provided.
	 * - An object mapping each normalized title (as returned by {@link TitleStatic.normalize} in `'api'` format)
	 *   to an array of `transcludedin` objects if multiple titles are provided.
	 * @throws {MwbotError} If
	 * - Any input title fails validation via {@link validateTitle} (with `allowSpecial` set to `true`).
	 * - `titles` is an empty array. (`emptyinput`)
	 */
	getTransclusions(
		titles: string | Title,
		additionalParams?: ApiParams,
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseQueryPagesPropTranscludedin[]>;
	getTransclusions(
		titles: (string | Title)[],
		additionalParams?: ApiParams,
		requestOptions?: MwbotRequestConfig
	): Promise<Record<string, ApiResponseQueryPagesPropTranscludedin[]>>;
	async getTransclusions(
		titles: string | Title | (string | Title)[],
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseQueryPagesPropTranscludedin[] | Record<string, ApiResponseQueryPagesPropTranscludedin[]>> {

		// Normalize titles
		const isArrayInput = Array.isArray(titles);
		const titleSet = new Set<string>();
		for (const t of (isArrayInput ? titles : [titles])) {
			titleSet.add(this.validateTitle(t, { allowAnonymous: true, allowSpecial: true }).getPrefixedText());
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
			...additionalParams,
			...Mwbot.getActionParams('query'),
			titles: validatedTitles,
			prop: 'transcludedin',
			tilimit: 'max'
		}, {
			limit: Infinity,
			multiValues: 'titles'
		}, requestOptions);

		// Process the responses and return them
		const result: Record<string, ApiResponseQueryPagesPropTranscludedin[]> = Object.create(null);
		for (const res of responses) {
			const pages = res.query?.pages;
			if (!pages) Mwbot.dieAsEmpty(true, 'missing "response.query.pages"', { response: res });
			pages.forEach(({ title, transcludedin }) => {
				if (!title || !transcludedin) return;
				result[title] ||= [];
				result[title].push(...transcludedin);
			});
		}

		if (isArrayInput) {
			return result;
		} else {
			return result[validatedTitles[0]] || [];
		}

	}

	/**
	 * Performs a full text search.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'query',
	 *   list: 'search',
	 *   srsearch: target,
	 *   srlimit: 'max',
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param target The search query string to look for in page titles or content.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Search | `list=search`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise that resolves to the `response.query` object (not the `response.query.search`
	 * array, as `list=search` may return additional properties in the `query` object, such as `searchinfo`).
	 * @throws {MwbotError} If:
	 * - `target` is not a string. (`typemismatch`)
	 * - `target` is empty. (`emptyinput`)
	 */
	async search(
		target: string,
		additionalParams: ApiParams = {},
		requestOptions?: MwbotRequestConfig
	): Promise<PartiallyRequired<ApiResponseQuery, 'search'>> {

		// Validate `target`
		if (typeof target !== 'string') {
			Mwbot.dieWithTypeError('string', 'target', target);
		}
		if (!target.trim()) {
			throw new MwbotError('fatal', {
				code: 'emptyinput',
				info: '"target" cannot be empty.'
			});
		}

		// Send an API request
		const responses = await this.continuedRequest({
			...additionalParams,
			...Mwbot.getActionParams('query'),
			list: 'search',
			srsearch: target,
			srlimit: 'max'
		}, { limit: Infinity }, requestOptions);
		if (!responses.length) {
			// `responses` is never expected to be an empty array but just in case
			Mwbot.dieAsEmpty();
		}

		// Merge the response arrays into a single object and return it
		let ret: PartiallyRequired<ApiResponseQuery, 'search'> = Object.create(null);
		for (const res of responses) {
			if (!res.query) {
				Mwbot.dieAsEmpty(true, 'missing "response.query"', { response: res });
			}
			if (!res.query.search) {
				Mwbot.dieAsEmpty(true, 'missing "response.query.search"', { response: res });
			}
			const query = res.query as PartiallyRequired<ApiResponseQuery, 'search'>;
			if (responses.length === 1) {
				return query;
			}
			ret = mergeDeep(ret, query);
		}
		return ret;

	}

	/**
	 * Performs a prefix search for page titles.
	 *
	 * Enforced parameters:
	 * ```
	 * {
	 *   action: 'query',
	 *   list: 'prefixsearch',
	 *   pssearch: target,
	 *   pslimit: 'max',
	 *   format: 'json',
	 *   formatversion: '2'
	 * }
	 * ```
	 *
	 * @param target The search string.
	 * @param additionalParams
	 * Additional parameters for {@link https://www.mediawiki.org/wiki/API:Prefixsearch | `list=prefixsearch`}.
	 * If any of these parameters conflict with the enforced ones, the enforced values take precedence.
	 * @param limit The maximum number of continuation cycles to perform (default: `Infinity`).
	 * Specify this if the `target` is very generic and may produce too many results.
	 * @param requestOptions Optional HTTP request options.
	 * @returns A Promise resolving to the result array in `response.query.prefixsearch`, or rejecting with an error.
	 * @throws {MwbotError} If:
	 * - `target` is not a string. (`typemismatch`)
	 * - `target` is empty. (`emptyinput`)
	 * - `limit` is provided and is not a positive integer or `Infinity`. (`invalidlimit`)
	 */
	async prefixSearch(
		target: string,
		additionalParams: ApiParams = {},
		limit = Infinity,
		requestOptions?: MwbotRequestConfig
	): Promise<ApiResponseQueryListPrefixsearch[]> {

		// Validate `target`
		if (typeof target !== 'string') {
			Mwbot.dieWithTypeError('string', 'target', target);
		}
		if (!target.trim()) {
			throw new MwbotError('fatal', {
				code: 'emptyinput',
				info: '"target" cannot be empty.'
			});
		}

		// Validate limit
		if ((!Number.isInteger(limit) && limit !== Infinity) || limit <= 0) {
			throw new MwbotError('fatal', {
				code: 'invalidlimit',
				info: '"limit" must be a positive integer.'
			});
		}

		// Send an API request
		const responses = await this.continuedRequest({
			...additionalParams,
			...Mwbot.getActionParams('query'),
			list: 'prefixsearch',
			pssearch: target,
			pslimit: 'max'
		}, { limit }, requestOptions);
		if (!responses.length) {
			// `responses` is never expected to be an empty array but just in case
			Mwbot.dieAsEmpty();
		}

		// Format the responses and return them as an array
		let ret: ApiResponseQueryListPrefixsearch[] = [];
		responses.forEach((res) => {
			const prefixsearch = res.query?.prefixsearch;
			if (!prefixsearch) Mwbot.dieAsEmpty(true, 'missing "response.query.prefixsearch"', { response: res });
			ret = ret.concat(prefixsearch);
		});
		return ret;

	}

}

// ****************************** HELPER TYPES AND INTERFACES ******************************

/**
 * Options to be passed as the first argument of {@link Mwbot.init}.
 */
export interface MwbotInitOptions extends MwbotOptions {
	credentials: Credentials;
}

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
	/**
	 * The maximum allowed server lag (in seconds) before aborting retries when a `'maxlag'` API error
	 * is encountered.
	 *
	 * If the reported lag exceeds this threshold, the request will not be retried, and the `'maxlag'`
	 * error will be thrown immediately.
	 *
	 * By default, `mwbot-ts` handles `'maxlag'` errors with the following delay mechanism before
	 * attempting a retry:
	 * - If the response includes a `Retry-After` header, its value (in seconds) determines the delay.
	 * - If `Retry-After` is missing or invalid, a default delay of 5 seconds applies.
	 * - If the reported server lag exceeds the delay, the delay is increased to match the lag (rounded up).
	 * - If the lag exceeds `maxLagLimit`, no retry is performed, and the error is thrown immediately.
	 *
	 * If omitted, the default `maxLagLimit` is 60 seconds.
	 */
	maxLagLimit?: number;
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
 * Additional options for {@link Mwbot.edit}.
 */
export interface ExclusionComplianceConfig {
	/**
	 * Whether to comply with {@link https://en.wikipedia.org/wiki/Template:Bots bot exclusions} by
	 * automatically detecting `{{bots}}` and `{{nobots}}` templates. (Default: `false`)
	 *
	 * If the target page opts out of bot edits, the attempt will fail with a `botdenied` error.
	 */
	comply?: boolean;
	/**
	 * The message type(s) this edit is associated with. If the page includes a `{{bots|optout=}}` template
	 * that matches any of the specified types, the edit attempt will fail with a `botdenied` error.
	 *
	 * Ignored unless {@link comply} is set to `true`.
	 */
	complianceTypes?: string | string[];
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
	// wgUserGroups: string[];
	wgUserId: number;
	wgUserName: string;
	wgUserRights: string[];
	wgVersion: string;
	wgWikiID: string;
	[key: string]: unknown;
}

/**
 * Utility type that describes a class definition whose `prototype` matches a specific instance type.
 *
 * This is used internally to connect a class constructor with its corresponding instance type
 * in a safe and type-checkable way.
 *
 * @template T The instance type associated with the class.
 * @private
 */
export type PrototypeOf<T> = { prototype: T };

/**
 * Resolves the instance type of a given class definition.
 *
 * This is a reverse utility to {@link PrototypeOf}, used to infer the type of instances
 * constructed by a class that matches the given definition.
 *
 * @template T A class definition (with a `prototype` property).
 * @private
 */
export type InstanceOf<T> = T extends { prototype: infer R } ? R : never;

/**
 * Checks whether a value is an `AxiosError` object.
 *
 * @param value The value to check.
 * @returns A boolean indicating whether `value` is an `AxiosError` object.
 */
function isAxiosError(value: any): value is AxiosError {
	return value?.isAxiosError === true;
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
export interface ApiResponseEditSuccess extends Omit<ApiResponseEdit, 'result'> {
	result: 'Success';
}

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