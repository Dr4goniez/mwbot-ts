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
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { CookieJar } from 'tough-cookie';
import { XOR } from 'ts-xor';
import OAuth from 'oauth-1.0a';
import { ApiParams, ApiParamsAction, ApiEditPageParams, ApiResponse, ApiResponseQueryMetaSiteinfoGeneral, ApiResponseQueryMetaSiteinfoNamespaces, ApiResponseQueryMetaSiteinfoNamespacealiases, ApiResponseQueryMetaTokens, ApiResponseQueryMetaUserinfo, ApiResponseQueryMetaSiteinfoInterwikimap, ApiResponseQueryMetaSiteinfoMagicwords, ApiResponseQueryMetaSiteinfoFunctionhooks } from './api_types';
import { MwbotError } from './MwbotError';
import * as Util from './Util';
import * as mwString from './String';
import { TitleStatic, Title } from './Title';
import { TemplateStatic, ParserFunctionStatic } from './Template';
import { WikilinkStatic, FileWikilinkStatic, RawWikilinkStatic } from './Wikilink';
import { WikitextStatic, Wikitext } from './Wikitext';
/**
 * TODO: Add a doc comment here
 */
export declare class Mwbot {
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
    static get defaultRequestOptions(): {
        method: string;
        headers: {
            'User-Agent': string;
            'Content-Type': string;
            'Accept-Encoding': string;
        };
        params: {
            action: string;
            format: string;
            formatversion: string;
            maxlag: number;
        };
        timeout: number;
        responseType: string;
        responseEncoding: string;
    };
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
     * Object that holds UUIDs generated for each HTTP request issued by {@link _request}.
     * The keys represent request UUIDs, and the values the number of requests made using the ID.
     */
    protected uuid: {
        [id: string]: number;
    };
    /**
     * The timestamp (in milliseconds since the UNIX epoch) of the last successful request.
     * This is updated only for API actions specified in {@link MwbotOptions.intervalActions}.
     */
    protected lastRequestTime: number | null;
    /**
     * See {@link MwbotOptions.intervalActions}.
     */
    protected static get defaultIntervalActions(): ApiParamsAction[];
    /**
     * `Util` library with convenient functions.
     */
    static get Util(): typeof Util;
    /**
     * `String` library with functions to manipulate strings.
     */
    static get String(): typeof mwString;
    /**
     * The site and user information fetched by {@link _init}. Exposed to the user via {@link info}.
     */
    protected _info: SiteAndUserInfo;
    /**
     * Returns (a deep copy of) the site and user information fetched by {@link init}.
     */
    get info(): SiteAndUserInfo;
    /**
     * Title class for this instance.
     */
    protected _Title: TitleStatic;
    /**
     * Title class for this instance.
     */
    get Title(): TitleStatic;
    /**
     * Template class for this instance.
     */
    protected _Template: TemplateStatic;
    /**
     * Template class for this instance.
     */
    get Template(): TemplateStatic;
    /**
     * ParserFunction class for this instance.
     */
    protected _ParserFunction: ParserFunctionStatic;
    /**
     * ParserFunction class for this instance.
     */
    get ParserFunction(): ParserFunctionStatic;
    /**
     * Wikilink class for this instance.
     */
    protected _Wikilink: WikilinkStatic;
    /**
     * Wikilink class for this instance.
     */
    get Wikilink(): WikilinkStatic;
    /**
     * FileWikilink class for this instance.
     */
    protected _FileWikilink: FileWikilinkStatic;
    /**
     * FileWikilink class for this instance.
     */
    get FileWikilink(): FileWikilinkStatic;
    /**
     * RawWikilink class for this instance.
     */
    protected _RawWikilink: RawWikilinkStatic;
    /**
     * RawWikilink class for this instance.
     */
    get RawWikilink(): RawWikilinkStatic;
    /**
     * Wikitext class for this instance.
     */
    protected _Wikitext: WikitextStatic;
    /**
     * Wikitext class for this instance.
     */
    get Wikitext(): WikitextStatic;
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
    constructor(mwbotInitOptions: MwbotInitOptions, requestOptions?: MwbotRequestConfig);
    /**
     * Validates user credentials and determines the authentication type.
     *
     * @param credentials The credentials object provided by the user.
     * @returns Validated credentials.
     * @throws {MwbotError} If the credentials format is incorrect, or if unexpected keys are present.
     */
    protected static validateCredentials(credentials: Credentials): MwbotCredentials;
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
    setMwbotOptions(options: Partial<MwbotOptions>, merge?: boolean): this;
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
    setRequestOptions(options: MwbotRequestConfig, merge?: boolean): Mwbot;
    /**
     * Initializes the `Mwbot` instance to make all functionalities ready.
     *
     * @returns A Promise resolving to the current instance, or rejecting with an error.
     */
    init(): Promise<this>;
    /**
     * Internal handler for instance initialization.
     *
     * @param attemptIndex The number of times we have attempted initialization, including the current attempt.
     * On a certain type of failure, a retry is attempted once (i.e., when this index is less than or equal to `2`).
     * @returns A Promise resolving to the current instance, or rejecting with an error.
     */
    protected _init(attemptIndex: number): Promise<this>;
    /**
     * Throws an error if the instance is not initialized.
     */
    protected checkInit(): void;
    /**
     * Returns the user's API limit for multi-value requests.
     *
     * @returns `500` for users with the `apihighlimits` permission; otherwise, `50`.
     */
    get apilimit(): 500 | 50;
    /**
     * Stores configuration values for the site and user.
     */
    protected readonly configData: ConfigData;
    /**
     * The `wg`-keys of {@link ConfigData}, used in {@link config} to verify their existence.
     */
    protected readonly configKeys: Array<keyof ConfigData>;
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
    get config(): MwConfig<ConfigData>;
    /**
     * Initializes the configuration values with site and user data.
     *
     * @param userinfo
     * @param general
     * @param namespaces
     * @param namespacealiases
     * @returns An array of `wg`-keys that failed to be initialized.
     */
    protected initConfigData<K extends keyof ConfigData>(userinfo: ApiResponseQueryMetaUserinfo, general: ApiResponseQueryMetaSiteinfoGeneral, namespaces: ApiResponseQueryMetaSiteinfoNamespaces, namespacealiases: ApiResponseQueryMetaSiteinfoNamespacealiases[]): K[];
    /**
     * Performs a raw HTTP request.
     *
     * **NOTE**: This method does ***not*** reference any instance-specific settings.
     *
     * @param requestOptions The complete user-defined HTTP request options.
     * @returns The raw Axios response of the HTTP request.
     */
    rawRequest(requestOptions: MwbotRequestConfig): Promise<AxiosResponse>;
    /**
     * Performs an HTTP request to the MediaWiki API.
     *
     * @param parameters Parameters to the API.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    request(parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
    /**
     * Performs a raw HTTP request to the MediaWiki API.
     *
     * This method assumes that the request body has been fully processed, meaning all necessary parameters have been formatted,
     * validated, and encoded as required by the API.
     *
     * @param requestOptions The finalized HTTP request options, ready for transmission.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    protected _request(requestOptions: MwbotRequestConfig): Promise<ApiResponse>;
    /**
     * Massages parameters from the nice format we accept into a format suitable for the API.
     *
     * @param parameters (modified in-place)
     * @returns A boolean indicating whether the parameters have a long field.
     */
    protected preprocessParameters(parameters: ApiParams): boolean;
    /**
     * Handles data encoding for POST requests (calls {@link handlePostMultipartFormData} for `multipart/form-data`).
     *
     * @param requestOptions The HTTP request options to modify.
     * @param hasLongFields A boolean indicating whether the parameters have a long field.
     */
    protected handlePost(requestOptions: MwbotRequestConfig, hasLongFields: boolean): Promise<void>;
    /**
     * Handles POST requests with `multipart/form-data` encoding.
     *
     * - Converts `params` into a `FormData` object.
     * - Supports file uploads if `params` contain an object with a `stream` property.
     *
     * @param requestOptions The HTTP request options to modify.
     * @param token Optional token for authentication.
     */
    protected handlePostMultipartFormData(requestOptions: MwbotRequestConfig, token?: string): Promise<void>;
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
    protected applyAuthentication(requestOptions: MwbotRequestConfig): void;
    /**
     * Checks whether the instance has been initialized for an anonymous user.
     *
     * @returns A boolean indicating whether the instance was initialized for an anonymous user.
     */
    protected isAnonymous(): boolean;
    /**
     * Logs warnings returned from the API to the console unless suppressed.
     *
     * @param warnings Warnings returned by the API, if any.
     */
    protected showWarnings(warnings: ApiResponse['warnings']): void;
    /**
     * Returns a {@link MwbotError} instance by normalizing various error objects.
     *
     * If `base` is an API response containing an error, it is converted into
     * an {@link MwbotError} instance.
     *
     * If `base` is already an instance of {@link MwbotError}, it is returned as is.
     *
     * If a request UUID is provided, its entry in {@link uuid} is cleared.
     *
     * @param base An error object, which can be:
     * - An API response containing an `error` or `errors` property.
     * - An existing {@link MwbotError} instance, in which case it is returned as is.
     *
     * @param requestId The UUID of the request to be removed from {@link uuid}.
     * If provided, the corresponding entry is deleted before processing `base`.
     *
     * @returns A normalized {@link MwbotError} instance.
     */
    protected error(base: Required<Pick<ApiResponse, 'error'>> | Required<Pick<ApiResponse, 'errors'>> | MwbotError, requestId?: string): MwbotError;
    /**
     * Returns a `mwbot_api_anonymous` error.
     *
     * @param requestId If provided, the relevant entry in {@link uuid} is cleared.
     * @returns
     */
    protected errorAnonymous(requestId?: string): MwbotError<'api_mwbot'>;
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
    protected retry(initialError: MwbotError, requestId: string, requestOptions: MwbotRequestConfig, maxAttempts?: number, sleepSeconds?: number, retryCallback?: () => Promise<ApiResponse>): Promise<ApiResponse>;
    /**
     * Aborts all unfinished HTTP requests issued by this instance.
     */
    abort(): Mwbot;
    /**
     * Performs an HTTP GET request to the MediaWiki API.
     *
     * @param parameters Parameters to the API.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    get(parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
    /**
     * Performs an HTTP POST request to the MediaWiki API.
     *
     * @param parameters Parameters to the API.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    post(parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
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
    nonwritePost(parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
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
    continuedRequest(parameters: ApiParams, limit?: number, rejectProof?: boolean, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
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
    massRequest(parameters: ApiParams, keys: string | string[], batchSize?: number, requestOptions?: MwbotRequestConfig): Promise<(ApiResponse | MwbotError)[]>;
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
    postWithToken(tokenType: string, parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
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
    getToken(tokenType: string, additionalParams?: ApiParams | 'user' | 'bot' | 'anon', requestOptions?: MwbotRequestConfig): Promise<string>;
    /**
     * Converts legacy token types to `csrf`.
     *
     * @param action
     * @returns
     */
    protected static mapLegacyToken(action: string): string;
    /**
     * Marks a cached token of the specified type as invalid.
     *
     * @param tokenType The type of token to invalidate (e.g., `csrf`).
     * @returns The current instance for chaining.
     */
    badToken(tokenType: string): Mwbot;
    /**
     * Gets type of token to be used with an API action.
     *
     * @param action The API's `action` parameter value.
     * @returns A Promise resolving to the token type as a string, or `null` on failure.
     *
     * *This method never rejects*.
     */
    protected getTokenType(action: string): Promise<string | null>;
    /**
     * Performs a POST request to the MediaWiki API using a CSRF token.
     *
     * This is a shorthand method of {@link postWithToken}.
     *
     * @param parameters Parameters to the API.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    postWithCsrfToken(parameters: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
    /**
     * Retrieves a csrf token from the API.
     *
     * This is a shorthand method of {@link getToken}.
     *
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to a CSRF token or rejecting with an error.
     */
    getCsrfToken(requestOptions?: MwbotRequestConfig): Promise<string>;
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
    protected prepEdit(title: string | Title, allowAnonymous?: boolean): Title | MwbotError;
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
    protected _save(title: Title, content: string, summary?: string, internalOptions?: ApiEditPageParams, additionalParams?: ApiEditPageParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
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
     * }
     * ```
     *
     * @param title The new page title, either as a string or a {@link Title} instance.
     * @param content The text content of the new page.
     * @param summary An optional edit summary.
     * @param additionalParams Additional parameters for the API request. These can be used to
     * overwrite the default parameters.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to the API response or rejecting with {@link MwbotError}.
     */
    create(title: string | Title, content: string, summary?: string, additionalParams?: ApiEditPageParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
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
    save(title: string | Title, content: string, summary?: string, additionalParams?: ApiEditPageParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
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
     * - The requested title does not exist.
     */
    read(title: string | Title, requestOptions?: MwbotRequestConfig): Promise<Revision>;
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
    read(titles: (string | Title)[], requestOptions?: MwbotRequestConfig): Promise<(Revision | MwbotError)[]>;
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
     * }
     * ```
     *
     * @param title The page title, either as a string or a {@link Title} instance.
     * @param transform See {@link TransformationPredicate} for details.
     * @param requestOptions Optional HTTP request options.
     * @returns A Promise resolving to an {@link ApiResponse} or rejecting with an error object.
     */
    edit(title: string | Title, transform: TransformationPredicate, requestOptions?: MwbotRequestConfig, 
    /** @private */
    retry?: number): Promise<ApiResponse>;
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
    newSection(title: string | Title, sectiontitle: string, content: string, summary?: string, additionalParams?: ApiEditPageParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
    /**
     * Logs in to the wiki for which this instance has been initialized.
     *
     * @param username
     * @param password
     * @returns A Promise resolving to the API response or rejecting with an error.
     */
    protected login(username: string, password: string): Promise<ApiResponse>;
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
    purge(titles: (string | Title)[], additionalParams?: ApiParams, requestOptions?: MwbotRequestConfig): Promise<ApiResponse>;
}
/**
 * Options to be passed as the first argument of {@link Mwbot.constructor}.
 */
export type MwbotInitOptions = MwbotOptions & {
    credentials: Credentials;
};
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
export type Credentials = XOR<{
    /**
     * OAuth 2.0 access token.
     */
    oAuth2AccessToken: string;
}, {
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
}, {
    /**
     * Bot's username.
     */
    username: string;
    /**
     * Bot's password.
     */
    password: string;
}, {
    /**
     * Set to `true` for anonymous access.
     */
    anonymous: true;
}>;
/**
 * Processed {@link Credentials} stored in a {@link Mwbot} instance.
 * @private
 */
export type MwbotCredentials = XOR<{
    oauth2: string;
}, {
    oauth1: {
        instance: OAuth;
        accessToken: string;
        accessSecret: string;
    };
}, {
    user: {
        username: string;
        password: string;
    };
}, {
    anonymous: true;
}>;
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
 * Utility types used in this interface simply ensure certain optional properties in the API response
 * are treated as non-optional after verification.
 */
export interface SiteAndUserInfo {
    functionhooks: ApiResponseQueryMetaSiteinfoFunctionhooks[];
    general: Pick<ApiResponseQueryMetaSiteinfoGeneral, 'articlepath' | 'lang' | 'legaltitlechars' | 'script' | 'scriptpath' | 'server' | 'servername' | 'sitename' | 'generator' | 'wikiid'> & ApiResponseQueryMetaSiteinfoGeneral;
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
    wgFormattedNamespaces: Record<string, string>;
    wgLegalTitleChars: string;
    wgNamespaceIds: Record<string, number>;
    wgScript: string;
    wgScriptPath: string;
    wgServer: string;
    wgServerName: string;
    wgSiteName: string;
    wgUserId: number;
    wgUserName: string;
    wgUserRights: string[];
    wgVersion: string;
    wgWikiID: string;
    [key: string]: unknown;
}
/**
 * Type used to define {@link MwConfig}.
 * @private
 */
export type TypeOrArray<T> = T | T[];
/**
 * Type used to define {@link MwConfig}.
 * @private
 */
export type GetOrDefault<V, K extends PropertyKey, TD, TX = unknown> = K extends keyof V ? V extends Required<Pick<V, K>> ? V[K] : Required<V>[K] | TD : TX | TD;
/**
 * Type used to define {@link MwConfig}.
 * @private
 */
export type PickOrDefault<V, S extends TypeOrArray<PropertyKey>, TD, TX = unknown> = S extends Array<infer K> ? {
    [P in K & PropertyKey]-?: GetOrDefault<V, P, TD, TX>;
} : GetOrDefault<V, S & PropertyKey, TD, TX>;
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
export type TransformationPredicate = (wikitext: Wikitext, revision: Revision) => ApiEditPageParams | null | Promise<ApiEditPageParams | null>;
//# sourceMappingURL=Mwbot.d.ts.map