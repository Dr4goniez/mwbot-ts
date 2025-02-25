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
import { ApiParams, ApiParamsAction, ApiResponse, ApiResponseError, ApiResponseErrors, ApiResponseQueryMetaTokens } from './api_types';
import { mergeDeep, isPlainObject, sleep, isEmptyObject } from './util';

/*!
 * Portions of this file are adapted from the following:
 *
 * * `mediawiki-api` module in MediaWiki core (GNU General Public License v2)
 * @see https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/refs/heads/master/resources/src/mediawiki.api/index.js
 *
 * * npm package `mwbot` (MIT License)
 * @see https://github.com/gesinn-it-pub/mwbot
 *
 * * npm package `mwn` (GNU Lesser General Public License v3)
 * @see https://github.com/siddharthvp/mwn/blob/master/src/bot.ts
 * @see https://github.com/siddharthvp/mwn/blob/master/src/core.ts
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
	 * @see MwbotOptions.intervalActions
	 */
	protected static get defaultIntervalActions(): ApiParamsAction[] {
		return ['edit', 'move', 'upload'];
	}

	// ****************************** CONSTRUCTOR-RELATED METHODS ******************************

	/**
	 * Initialize a new `Mwbot` instance.
	 *
	 * @param mwbotInitOptions Configuration object containing initialization settings and user credentials.
	 * @param requestOptions Custom request options applied to all HTTP requests issued by the new instance.
	 * @throws {Error} If no valid API endpoint is provided or if the user credentials are malformed.
	 */
	protected constructor(mwbotInitOptions: MwbotInitOptions, requestOptions: MwbotRequestConfig) {

		const {credentials, ...options} = mwbotInitOptions;

		// Ensure that a valid URL is provided
		requestOptions.url = requestOptions.url || options.apiUrl;
		if (!requestOptions.url) {
			throw new Error('No valid API endpoint is provided.');
		}

		// Determine authentication type
		this.credentials =  Mwbot.validateCredentials(credentials || {});
		this.jar = new CookieJar();

		// Set up the User-Agent header if provided
		if (typeof options.userAgent === 'string') {
			requestOptions.headers = requestOptions.headers || {};
			requestOptions.headers['User-Agent'] = options.userAgent;
		}

		// Initialize other class properties
		this.userMwbotOptions = options; // Already shallow-copied; TODO: Should mergeDeep also handle functions?
		this.userRequestOptions = mergeDeep(requestOptions);
		this.abortions = [];
		this.tokens = {};
		this.uuid = {};
		this.lastRequestTime = null;
	}

	/**
	 * Validates user credentials and determines the authentication type.
	 *
	 * @param credentials The credentials object provided by the user.
	 * @returns The authentication type or an OAuth instance for OAuth 1.0a.
	 * @throws {TypeError} If the credentials format is incorrect.
	 * @throws {Error} If unexpected keys are present.
	 */
	protected static validateCredentials(credentials: Credentials): MwbotCredentials {
		if (!isPlainObject(credentials)) {
			throw new TypeError('Credentials must be provided as an object.');
		}

		const keys = Object.keys(credentials);
		switch (keys.length) {
			case 1: {
				const {anonymous, OAuth2AccessToken} = credentials;
				if (anonymous === true) {
					return {
						anonymous: true
					};
				}
				if (typeof OAuth2AccessToken === 'string') {
					return {
						oauth2: OAuth2AccessToken
					};
				}
				throw new TypeError(`Unexpected value for "${keys[0]}".`);
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
				throw new TypeError('Invalid types for username or password.');
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
				throw new TypeError('Invalid OAuth credentials.');
			}
			default:
				throw new Error(`Invalid credential properties: ${keys.join(', ')}`);
		}
	}

	/**
	 * Update the bot options stored in the instance.
	 *
	 * @param options The options to apply.
	 * @param merge Whether to merge `options` with the existing ones (default: `true`).
	 *
	 * If `false`, the current settings are cleared before applying `options`.
	 *
	 * @returns The current {@link Mwbot} instance.
	 * @throws If the resulting options lack an `apiUrl` property.
	 */
	setMwbotOptions(options: Partial<MwbotOptions>, merge = true): Mwbot {
		type UrlRequired = Required<Pick<ReturnType<typeof mergeDeep>, 'apiUrl'>>;
		if (merge) {
			this.userMwbotOptions = mergeDeep(this.userMwbotOptions, options) as UrlRequired;
		} else {
			this.userMwbotOptions = mergeDeep(options) as UrlRequired;
		}
		if (!this.userMwbotOptions.apiUrl) {
			throw new Error('"apiUrl" must be retained.');
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
	 * Initialize a new `Mwbot` instance.
	 *
	 * @param mwbotInitOptions Configuration object containing initialization settings and user credentials.
	 * @param requestOptions Custom request options applied to all HTTP requests issued by the new instance.
	 * @returns A resolved `Promise` with a new {@link Mwbot} instance, or `null` if initialization fails.
	 */
	static async init(mwbotInitOptions: MwbotInitOptions, requestOptions: MwbotRequestConfig = {}): Promise<Mwbot | null>  {

		// Initialize a Mwbot instance
		let mwbot: Mwbot;
		try {
			mwbot = new Mwbot(mwbotInitOptions, requestOptions);
		}
		catch (err) {
			console.error(err);
			return null;
		}

		// Log in if necessary
		if (mwbot.credentials.user) {
			const {username, password} = mwbot.credentials.user;
			const login = await mwbot.login(username, password).then((res) => res).catch((err) => err);
			if (login.error) {
				console.error(login.error);
				return null;
			}
		}

		// TODO: Get site info
		// const info = await mwbot.get({
		// 	action: 'query',
		// 	format: 'json',
		// 	formatversion: '2',
		// 	meta: 'userinfo',
		// 	uiprop: 'rights'
		// }).then((res) => {

		// }).catch((err) => {

		// });

		return mwbot;

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
		// TODO: Axios accepts non-plain objects in its request options, but mergeDeep only supports plain objects
		requestOptions.params = mergeDeep(this.userRequestOptions.params, requestOptions.params, parameters);
		requestOptions = mergeDeep(Mwbot.defaultRequestOptions, this.userRequestOptions, requestOptions);
		const hasLongFields = this.preprocessParameters(requestOptions.params);
		if (requestOptions.params.format !== 'json') {
			return Promise.reject(
				this.error({
					code: 'mwbot_invalidformat',
					info: 'Must use format=json.'
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
				let error: ApiResponseError | ApiResponseErrors | undefined;

				// Show warnings only for the first request because retries use the same request body
				if (this.uuid[requestId] === 1) {
					this.showWarnings(data?.warnings);
				}

				if (!data) {
					reject(this.error({
						code: 'mwbot_empty',
						info: 'OK response but empty result (check HTTP headers?)',
						details: response
					}, requestId));
				} else if (typeof data !== 'object') {
					// In most cases the raw HTML of [[Main page]]
					reject(this.error({
						code: 'mwbot_invalidjson',
						info: 'Invalid JSON response (check the request URL?)'
					}, requestId));
				} else if ((error = (data.error || data.errors && data.errors[0]))) {

					// Convert the "errors" array to an "error" object
					if (data.errors) {
						const info =
							data.errors[0].html || // errorformat=html
							data.errors[0].text || // errorformat=wikitext, errorformat=plaintext
							data.errors[0].key; // errorformat=raw
						const {errors, ...rest} = data;
						data.error = Object.assign({info: info as string}, errors[0], rest);
						delete data.errors;
					}

					// Handle error codes
					const {code} = error;
					if (code === 'missingparam' && this.isAnonymous() && error.info.includes('The "token" parameter must be set')) {
						return reject(this.errorAnonymous());
					}

					if (!requestOptions.disableRetryAPI) {
						// Handle retries
						switch (code) {
							case 'badtoken':
							case 'notoken':
								if (this.isAnonymous()) {
									return reject(this.errorAnonymous());
								}
								if (!requestOptions.disableRetryByCode?.includes(clonedParams.action!)) {
									return this.getTokenType(clonedParams.action!).then((tokenType) => { // Identify the required token type

										if (!tokenType) {
											return reject(this.error(data.error!, requestId));
										}
										console.warn(`Warning: Encountered a "${code}" error.`);
										this.badToken(tokenType);
										delete clonedParams.token;

										return resolve(this.retry(data.error!, requestId, requestOptions, 2, 0, () => {
											// Clear the request ID because postWithToken issues a new one
											delete this.uuid[requestId];
											return this.postWithToken(tokenType, clonedParams);
										}));

									});
								}
								break;

							case 'readonly':
								console.warn(`Warning: Encountered a "${code}" error.`);
								return resolve(this.retry(data.error!, requestId, requestOptions, 3, 10));

							case 'maxlag': {
								console.warn(`Warning: Encountered a "${code}" error.`);
								const retryAfter = parseInt(response.headers['retry-after']) || 5;
								return resolve(this.retry(data.error!, requestId, requestOptions, 4, retryAfter));
							}

							case 'mwoauth-invalid-authorization':
								// Per https://phabricator.wikimedia.org/T106066, "Nonce already used" indicates
								// an upstream memcached/redis failure which is transient
								if (error.info.includes('Nonce already used')) {
									return resolve(this.retry(data.error!, requestId, requestOptions, 2, 10));
								}
						}
					}

					reject(this.error(data.error!, requestId));

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
				if (error && error.code === 'ERR_CANCELED') {
					reject(this.error({
						code: 'mwbot_aborted',
						info: 'Request aborted by the user'
					}, requestId));
				} else if (typeof error.status === 'number' && error.status >= 400) {
					// Articulate the error object for common errors
					switch (error.status) {
						case 404:
							return reject(this.error({
								code: 'mwbot_notfound',
								info: 'Page not found (404): ' + requestOptions.url!
							}, requestId));
						case 408:
							return resolve(this.retry({
								code: 'mwbot_timeout',
								info: 'Request timeout (408)'
							}, requestId, requestOptions));
						case 414:
							return reject(this.error({
								code: 'mwbot_baduri',
								info: 'URI too long (414): Consider using a POST request'
							}, requestId));
						case 429:
							return resolve(this.retry({
								code: 'mwbot_ratelimited',
								info: 'Too many requests (429)'
							}, requestId, requestOptions));
						case 500:
							return resolve(this.retry({
								code: 'mwbot_servererror',
								info: 'Internal server error (500)'
							}, requestId, requestOptions));
						case 502:
							return resolve(this.retry({
								code: 'mwbot_badgateway',
								info: 'Bad gateway (502): Perhaps the server is down?'
							}, requestId, requestOptions));
						case 503:
							return resolve(this.retry({
								code: 'mwbot_serviceunavailable',
								info: 'Service Unavailable (503): Perhaps the server is down?'
							}, requestId, requestOptions));
						case 504:
							return resolve(this.retry({
								code: 'mwbot_timeout',
								info: 'Gateway timeout (504)'
							}, requestId, requestOptions));
					}
				}
				reject(this.error({
					code: 'mwbot_http',
					info: 'HTTP request failed',
					details: error
				}, requestId));
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
				// Internal error
				throw new TypeError('"url" and "method" must be set before applying authentication.');
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
	 * Returns an object with `code` and `info` properties wrapped in an `error` object.
	 *
	 * If a request UUID is provided, its entry in {@link uuid} is cleared.
	 *
	 * @param result An object containing at least `code` and `info` properties.
	 * @param requestId The UUID of the request to be removed from {@link uuid}.
	 * @returns An object containing the `error` property with the provided result.
	 */
	protected error(result: ApiResponseError, requestId?: string): ApiResponse {
		if (requestId) {
			delete this.uuid[requestId];
		}
		return {error: result};
	}

	/**
	 * Returns a `mwbot_anonymous` error object.
	 * @param requestId If provided, the relevant entry in {@link uuid} is cleared.
	 * @returns
	 */
	protected errorAnonymous(requestId?: string): ApiResponse {
		if (requestId) {
			delete this.uuid[requestId];
		}
		return {
			error: {
				code: 'mwbot_anonymous',
				info: 'Anonymous users are limited to non-write requests'
			}
		};
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
	 * @param retryCallback A function to execute when attempting the retry. If not provided, {@link request} is called on `requestOptions`.
	 * @returns A Promise of the retry request or a rejected error object.
	 */
	protected async retry(
		initialError: ApiResponseError,
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
			console.error(initialError);
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
				.catch((err: ApiResponse) => {

					// Error handler
					if (err.error?.code === 'badtoken') {
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
	 * @returns The retrieved token. If the request fails, a rejected Promise with an `error` object is returned.
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
					throw {
						error: {
							code: 'mwbot_badnamedtoken',
							info: 'Could not find a token named "' + tokenType + '" (check for typos?)'
						}
					};
				}
			} else {
				throw {
					error: {
						code: 'mwbot_empty',
						info: 'OK response but empty result'
					}
				};
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
	postWithEditToken(parameters: ApiParams, requestOptions: MwbotRequestConfig = {}): Promise<ApiResponse> {
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
	getEditToken(requestOptions: MwbotRequestConfig = {}): Promise<string> {
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
		const resLogin = await this.post({
			action: 'login',
			lgname: username,
			lgpassword: password,
			lgtoken: token,
			format: 'json',
			formatversion: '2',
			maxlag: void 0 // Overwrite maxlag to have this request prioritized
		}, disableRetryAPI).then((res) => res).catch((err) => err);

		if (resLogin.error || !resLogin.login || resLogin.login.result !== 'Success') {
			return Promise.reject(resLogin);
		} else {
			this.tokens = {}; // Clear cashed tokens because these can't be used for the newly logged-in user
			return Promise.resolve(resLogin);
		}

	}

}

/**
 * Options to initialize a {@link Mwbot} instance via {@link Mwbot.init}.
 */
export type MwbotInitOptions = MwbotOptions & {credentials: Credentials;};

/**
 * Options for a {@link Mwbot} instance.
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
 * One of the following authentication methods must be provided to {@link Mwbot.init}.
 *
 * #### OAuth 2.0 ({@link https://www.mediawiki.org/wiki/OAuth/Owner-only_consumers#OAuth_2})
 * ```ts
 * {
 * 	OAuth2AccessToken: 'Your OAuth 2.0 access token'
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
		OAuth2AccessToken: string;
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
 * Config options for {@link Mwbot}'s request methods, extending Axios's request config.
 *
 * @see https://axios-http.com/docs/req_config
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