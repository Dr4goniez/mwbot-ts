import { Mwbot, MWBOT_VERSION } from '../../dist/index.js';
import { describe, it } from 'mocha';
import { assert } from 'chai';
import { getApiUrl, getAuthCredentials } from './provider.js';
import OAuth from 'oauth-1.0a';
import { CookieJar } from 'tough-cookie';
import * as http from 'http';
import * as https from 'https';

/**
 * @type {import('./provider-types.js').MwbotTestSuite}
 */
export function testMwbotProperties(getMwbot, testDomain, authMethod) {
	describe('Mwbot properties', function () {

		describe('Authentication & Network', function () {
			it('should initialize the base credentials object', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected property
				assert.isObject(mwbot.credentials);
			});

			it('should set appropriate credentials based on auth method', function () {
				const mwbot = getMwbot();
				// @ts-expect-error - Protected property
				const internalCredentials = mwbot.credentials;
				const creds = getAuthCredentials(testDomain, authMethod);

				switch (authMethod) {
					case 'oauth2':
						assert.isString(internalCredentials.oauth2);
						assert.strictEqual(internalCredentials.oauth2, creds.oAuth2AccessToken);
						break;
					case 'oauth1':
						assert.isObject(internalCredentials.oauth1);
						assert.instanceOf(internalCredentials.oauth1?.instance, OAuth);
						assert.isString(internalCredentials.oauth1?.accessToken);
						assert.strictEqual(internalCredentials.oauth1?.accessToken, creds.accessToken);
						assert.isString(internalCredentials.oauth1?.accessSecret);
						assert.strictEqual(internalCredentials.oauth1?.accessSecret, creds.accessSecret);
						break;
					case 'botpassword':
						assert.isObject(internalCredentials.user);
						assert.isString(internalCredentials.user?.username);
						assert.strictEqual(internalCredentials.user?.username, creds.username);
						assert.isString(internalCredentials.user?.password);
						assert.strictEqual(internalCredentials.user?.password, creds.password);
						break;
					case 'anonymous':
						assert.isTrue(internalCredentials.anonymous);
						break;
				}
			});

			it('should set the isAnonymous flag correctly', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected method
				assert.strictEqual(mwbot.isAnonymous(), authMethod === 'anonymous');
			});

			it('should configure the CookieJar correctly', function () {
				const mwbot = getMwbot();
				// @ts-expect-error - Protected property
				const jar = mwbot.jar;

				if (authMethod === 'botpassword' || authMethod === 'anonymous') {
					assert.instanceOf(jar, CookieJar);
				} else {
					assert.notExists(jar);
				}
			});

			it('should configure HTTP/HTTPS agents correctly', function () {
				const mwbot = getMwbot();
				// @ts-expect-error - Protected property
				const agents = mwbot.agents;

				if (authMethod === 'oauth2' || authMethod === 'oauth1') {
					assert.isObject(agents);
					assert.instanceOf(agents?.http, http.Agent);
					assert.instanceOf(agents?.https, https.Agent);
				} else {
					assert.notExists(agents);
				}
			});
		});

		describe('Client & Configuration', function () {
			it('should initialize Axios client', function () {
				// @ts-expect-error - Protected property
				const axios = getMwbot().axios;

				assert.isFunction(axios?.request);
			});

			it('should preserve userMwbotOptions configuration', function () {
				const mwbot = getMwbot();
				const apiUrl = getApiUrl(testDomain);

				assert.strictEqual(mwbot.userMwbotOptions.apiUrl, apiUrl);
			});

			it('should preserve userRequestOptions configuration', function () {
				const mwbot = getMwbot();
				const apiUrl = getApiUrl(testDomain);

				assert.strictEqual(mwbot.userRequestOptions.url, apiUrl);
			});
		});

		describe('Internal State', function () {
			it('should initialize abortions as an empty Set', function () {
				const mwbot = getMwbot();
				// @ts-expect-error - Protected property
				const abortions = mwbot.abortions;

				assert.instanceOf(abortions, Set);
				assert.isEmpty(abortions);
			});

			it('should initialize tokens as an empty object', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected property
				assert.deepEqual(mwbot.tokens, {});
			});

			it('should initialize lastRequestTime as null', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected property
				assert.isNull(mwbot.lastRequestTime);
			});
		});

		describe('Static Properties & Utilities', function () {
			it('should expose request defaults', function () {
				assert.deepEqual(Mwbot.defaultRequestOptions, {
					method: 'GET',
					headers: {
						'User-Agent': `mwbot-ts/${MWBOT_VERSION} (https://github.com/Dr4goniez/mwbot-ts)`,
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept-Encoding': 'gzip',
					},
					params: {
						action: 'query',
						format: 'json',
						formatversion: '2',
						maxlag: 5,
					},
					timeout: 60 * 1000, // 60 seconds
					responseType: 'json',
					responseEncoding: 'utf8',
				});
			});

			it('should expose default interval actions', function () {
				assert.deepEqual(
					// @ts-expect-error - Protected getter
					Mwbot.defaultIntervalActions,
					['edit', 'move', 'upload']
				);
			});

			it('should expose Util module', function () {
				assert.exists(Mwbot.Util);
			});

			it('should expose String module', function () {
				assert.exists(Mwbot.String);
			});
		});

		describe('Site Information (info)', function () {
			it('should mirror internal _info state to public info getter', function () {
				const mwbot = getMwbot();
				// @ts-expect-error - Protected property
				const _info = mwbot._info;

				assert.isObject(_info);
				assert.isNotEmpty(_info);
				assert.isObject(mwbot.info);
				assert.isNotEmpty(mwbot.info);
				assert.deepEqual(_info, mwbot.info);
			});

			it('should contain functionhooks array', function () {
				const mwbot = getMwbot();

				assert.isArray(mwbot.info.functionhooks);
				assert.isNotEmpty(mwbot.info.functionhooks);
			});

			it('should contain general object', function () {
				const mwbot = getMwbot();

				assert.isObject(mwbot.info.general);
				assert.isNotEmpty(mwbot.info.general);
			});

			it('should contain magicwords array', function () {
				const mwbot = getMwbot();

				assert.isArray(mwbot.info.magicwords);
				assert.isNotEmpty(mwbot.info.magicwords);
			});

			it('should contain interwikimap array', function () {
				const mwbot = getMwbot();

				assert.isArray(mwbot.info.interwikimap);
				assert.isNotEmpty(mwbot.info.interwikimap);
			});

			it('should contain namespaces object', function () {
				const mwbot = getMwbot();

				assert.isObject(mwbot.info.namespaces);
				assert.isNotEmpty(mwbot.info.namespaces);
			});

			it('should contain namespacealiases array', function () {
				const mwbot = getMwbot();

				assert.isArray(mwbot.info.namespacealiases);
				assert.isNotEmpty(mwbot.info.namespacealiases);
			});

			it('should contain user object', function () {
				const mwbot = getMwbot();

				assert.isObject(mwbot.info.user);
				assert.isNotEmpty(mwbot.info.user);
			});
		});

		describe('Parser Classes', function () {
			it('should expose Title class', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot._Title.name, 'Title');
				assert.strictEqual(mwbot.Title.name, 'Title');
			});

			it('should expose Template class', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot._Template.name, 'Template');
				assert.strictEqual(mwbot.Template.name, 'Template');
			});

			it('should expose ParserFunction class', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot._ParserFunction.name, 'ParserFunction');
				assert.strictEqual(mwbot.ParserFunction.name, 'ParserFunction');
			});

			it('should expose Wikilink class', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot._Wikilink.name, 'Wikilink');
				assert.strictEqual(mwbot.Wikilink.name, 'Wikilink');
			});

			it('should expose FileWikilink class', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot._FileWikilink.name, 'FileWikilink');
				assert.strictEqual(mwbot.FileWikilink.name, 'FileWikilink');
			});

			it('should expose RawWikilink class', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot._RawWikilink.name, 'RawWikilink');
				assert.strictEqual(mwbot.RawWikilink.name, 'RawWikilink');
			});

			it('should expose Wikitext class', function () {
				const mwbot = getMwbot();

				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot._Wikitext.name, 'Wikitext');
				assert.strictEqual(mwbot.Wikitext.name, 'Wikitext');
			});
		});

	});
}