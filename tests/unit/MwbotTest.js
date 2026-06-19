import { describe, it, before, afterEach, beforeEach } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MwbotError, MWBOT_VERSION } from '../../dist/index.js';
import { Logger } from '../../dist/build/Logger.js';
import OAuth from 'oauth-1.0a';
import {
	createApiErrorResponse,
	createAxiosError,
	createAxiosResponse,
	createMwbotError,
	createRequestOptions,
	getMwbotInitOptionsBase,
	getTestMwbot,
	TestMwbotFactory,
} from './MwbotTest-fixtures.js';
import sinon from 'sinon';
import FormData from 'form-data';
import { CookieJar } from 'tough-cookie';

describe('Mwbot', function () {

	describe('getDefaultRequestOptions()', function () {
		it('should match defined defaults', function () {
			assert.deepEqual(Mwbot.getDefaultRequestOptions(), {
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
	});

	describe('getDefaultIntervalActions()', function () {
		it('should match defined defaults', function () {
			assert.deepEqual(
				// @ts-expect-error - Protected method
				Mwbot.getDefaultIntervalActions(),
				['edit', 'move', 'upload']
			);
		});
	});

	describe('Static modules', function () {
		it('should expose Util module', function () {
			assert.exists(Mwbot.Util);
		});

		it('should expose String module', function () {
			assert.exists(Mwbot.String);
		});
	});

	describe('Instance properties', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 * @readonly
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		it('should expose the base credentials object', function () {
			// @ts-expect-error - Protected property
			assert.isObject(mwbot.credentials);
		});

		it('should expose Axios client', function () {
			// @ts-expect-error - Protected property
			assert.isFunction(mwbot.axios?.request);
		});

		it('should expose CookieJar', function () {
			// @ts-expect-error - Protected property
			assert.instanceOf(mwbot.jar, CookieJar);
		});

		it('should expose abort controllers as an empty Set', function () {
			// @ts-expect-error - Protected property
			const abortions = mwbot.abortions;

			assert.instanceOf(abortions, Set);
			assert.isEmpty(abortions);
		});

		it('should expose tokens as an empty object', function () {
			// @ts-expect-error - Protected property
			assert.deepEqual(mwbot.tokens, Object.create(null));
		});

		it('should expose lastRequestTime as null', function () {
			// @ts-expect-error - Protected property
			assert.isNull(mwbot.lastRequestTime);
		});

		it('should expose Logger', function () {
			// @ts-expect-error - Protected property
			assert.instanceOf(mwbot.logger, Logger);
		});
	});

	describe('info', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 * @readonly
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		it('should mirror internal _info state to public info getter', function () {
			// @ts-expect-error - Protected property
			const _info = mwbot._info;

			assert.isObject(_info);
			assert.isNotEmpty(_info);
			assert.isObject(mwbot.info);
			assert.isNotEmpty(mwbot.info);
			assert.deepEqual(_info, mwbot.info);
		});

		it('should expose functionhooks array', function () {
			assert.isArray(mwbot.info.functionhooks);
			assert.isNotEmpty(mwbot.info.functionhooks);
		});

		it('should expose general object', function () {
			assert.isObject(mwbot.info.general);
			assert.isNotEmpty(mwbot.info.general);
		});

		it('should expose magicwords array', function () {
			assert.isArray(mwbot.info.magicwords);
			assert.isNotEmpty(mwbot.info.magicwords);
		});

		it('should expose interwikimap array', function () {
			assert.isArray(mwbot.info.interwikimap);
			assert.isNotEmpty(mwbot.info.interwikimap);
		});

		it('should expose namespaces object', function () {
			assert.isObject(mwbot.info.namespaces);
			assert.isNotEmpty(mwbot.info.namespaces);
		});

		it('should expose namespacealiases array', function () {
			assert.isArray(mwbot.info.namespacealiases);
			assert.isNotEmpty(mwbot.info.namespacealiases);
		});

		it('should expose user object', function () {
			assert.isObject(mwbot.info.user);
			assert.isNotEmpty(mwbot.info.user);
		});
	});

	describe('Parser classes', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 * @readonly
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		/** @type {const} */ ([
			'Title',
			'Template',
			'ParserFunction',
			'Wikilink',
			'FileWikilink',
			'RawWikilink',
			'Wikitext',
		]).forEach((name) => {
			it(`should expose ${name} class`, function () {
				assert.strictEqual(mwbot[`_${name}`].name, name);
				assert.strictEqual(mwbot[name].name, name);
			});
		});
	});

	describe('validateCredentials()', function () {
		// @ts-expect-error - Protected method
		const validateCredentials = Mwbot.validateCredentials.bind(Mwbot);

		describe('Argument validation', function () {
			it('should throw MwbotError if credentials is not a plain object', function () {
				assert.throws(
					// @ts-expect-error - Unsupported value
					() => validateCredentials('string-creds'),
					MwbotError,
					'Expected plain object for "credentials", but got string.'
				);
			});
		});

		describe('Success cases (valid credentials)', function () {
			it('should validate anonymous credentials', function () {
				assert.deepEqual(
					validateCredentials({ anonymous: true }),
					{ anonymous: true }
				);
			});

			it('should validate OAuth2 credentials', function () {
				assert.deepEqual(
					validateCredentials({ oAuth2AccessToken: 'token123' }),
					{ oauth2: 'token123' }
				);
			});

			it('should validate username/password credentials', function () {
				assert.deepEqual(
					validateCredentials({ username: 'botuser', password: 'password123' }),
					{
						user: { username: 'botuser', password: 'password123' },
					}
				);
			});

			it('should validate OAuth1 credentials and construct an OAuth instance', function () {
				const result = validateCredentials({
					consumerToken: 'ctoken',
					consumerSecret: 'csecret',
					accessToken: 'atoken',
					accessSecret: 'asecret',
				});

				assert.isObject(result.oauth1);
				assert.instanceOf(result.oauth1?.instance, OAuth);
				assert.strictEqual(result.oauth1?.accessToken, 'atoken');
				assert.strictEqual(result.oauth1?.accessSecret, 'asecret');
			});
		});

		describe('Failure cases (invalid / mixed credentials)', function () {
			it('should reject anonymous if value is false', function () {
				assert.throws(
					// @ts-expect-error - Unsupported value
					() => validateCredentials({ anonymous: false }),
					MwbotError,
					'Anonymous credentials must only contain "anonymous: true".'
				);
			});

			it('should reject anonymous if mixed with extra keys', function () {
				assert.throws(
					// @ts-expect-error - Unsupported value
					() => validateCredentials({ anonymous: true, extra: 'bad' }),
					MwbotError,
					'Anonymous credentials must only contain "anonymous: true".'
				);
			});

			it('should reject OAuth2 if token is not a string', function () {
				assert.throws(
					// @ts-expect-error - Unsupported value
					() => validateCredentials({ oAuth2AccessToken: 12345 }),
					MwbotError,
					'OAuth2 credentials must only contain a string "oAuth2AccessToken".'
				);
			});

			it('should reject OAuth2 if token is empty', function () {
				assert.throws(
					() => validateCredentials({ oAuth2AccessToken: '' }),
					MwbotError,
					'OAuth2 credentials must only contain a string "oAuth2AccessToken".'
				);
			});

			it('should reject username/password if types are invalid', function () {
				assert.throws(
					// @ts-expect-error - Unsupported value
					() => validateCredentials({ username: 'botuser', password: 12345 }),
					MwbotError,
					'Invalid username/password credentials, or unexpected extra properties.'
				);
			});

			it('should reject username/password if mixed with extra keys', function () {
				assert.throws(
					// @ts-expect-error - Unsupported value
					() => validateCredentials({ username: 'botuser', password: 'password123', foo: true }),
					MwbotError,
					'Invalid username/password credentials, or unexpected extra properties.'
				);
			});

			it('should reject username/password if password is missing', function () {
				assert.throws(
					// @ts-expect-error - Unsupported value
					() => validateCredentials({ username: 'botuser' }),
					MwbotError,
					'Invalid username/password credentials, or unexpected extra properties.'
				);
			});

			it('should reject username/password if username is missing', function () {
				assert.throws(
					// @ts-expect-error - Unsupported value
					() => validateCredentials({ password: 'password123' }),
					MwbotError,
					'Invalid username/password credentials, or unexpected extra properties.'
				);
			});

			it('should reject username/password if username is empty', function () {
				assert.throws(
					() => validateCredentials({ username: '', password: 'password123' }),
					MwbotError,
					'Invalid username/password credentials, or unexpected extra properties.'
				);
			});

			it('should reject username/password if password is empty', function () {
				assert.throws(
					() => validateCredentials({ username: 'botuser', password: '' }),
					MwbotError,
					'Invalid username/password credentials, or unexpected extra properties.'
				);
			});

			it('should reject incomplete OAuth1 credentials', function () {
				assert.throws(
					// @ts-expect-error - accessSecret missing
					() => validateCredentials({
						consumerToken: 'ctoken',
						consumerSecret: 'csecret',
						accessToken: 'atoken',
					}),
					MwbotError,
					'Invalid OAuth1 credentials, or unexpected extra properties.'
				);
			});

			it('should reject OAuth1 if types are invalid', function () {
				assert.throws(
					() => validateCredentials({
						consumerToken: 'a',
						consumerSecret: 'b',
						accessToken: 'c',
						// @ts-expect-error - Invalid type
						accessSecret: 123,
					}),
					MwbotError,
					'Invalid OAuth1 credentials, or unexpected extra properties.'
				);
			});

			it('should reject OAuth1 if any credential is empty', function () {
				assert.throws(
					() => validateCredentials({
						consumerToken: '',
						consumerSecret: 'b',
						accessToken: 'c',
						accessSecret: 'd',
					}),
					MwbotError,
					'Invalid OAuth1 credentials, or unexpected extra properties.'
				);
			});

			it('should reject completely unknown property structures', function () {
				assert.throws(
					// @ts-expect-error - Unsupported value
					() => validateCredentials({ unknownKey1: 'foo', unknownKey2: 'bar' }),
					MwbotError,
					'Invalid credential properties: unknownKey1, unknownKey2'
				);
			});
		});
	});

	describe('init() including constructor', function () {
		/** @type {sinon.SinonSpy} */
		let infoSpy;
		/** @type {sinon.SinonSpy} */
		let warnSpy;
		/** @type {sinon.SinonSpy} */
		let errorSpy;
		/** @type {sinon.SinonFakeTimers} */
		let clock;

		beforeEach(function () {
			infoSpy = sinon.spy(Logger.prototype, 'info');
			warnSpy = sinon.spy(Logger.prototype, 'warn');
			errorSpy = sinon.spy(Logger.prototype, 'error');
			clock = sinon.useFakeTimers();
		});

		afterEach(function () {
			sinon.restore();
		});

		it('should deep-copy mwbotInitOptions', function () {
			const mwbotInitOptions = getMwbotInitOptionsBase('named');

			/** @type {Mwbot} */
			// @ts-expect-error - Protected constructor
			const mwbot = new Mwbot(mwbotInitOptions, {});
			mwbotInitOptions.interval = 9999;

			assert.notStrictEqual(mwbot.userMwbotOptions.interval, 9999);
		});

		it('should deep-copy requestOptions', function () {
			const requestOptions = { timeout: 9999 };

			/** @type {Mwbot} */
			// @ts-expect-error - Protected constructor
			const mwbot = new Mwbot(getMwbotInitOptionsBase('named'), requestOptions);
			requestOptions.timeout = 7777;

			assert.strictEqual(mwbot.userRequestOptions.timeout, 9999);
		});

		it('should throw "nourl" error if API endpoint is not provided', async function () {
			try {
				const TestMwbot = TestMwbotFactory();
				// @ts-expect-error - Testing missing optional/required parameters
				await TestMwbot.init({
					credentials: { anonymous: true },
				});

				assert.fail('Expected init() to reject');
			} catch (err) {
				assert.instanceOf(err, MwbotError);
				assert.strictEqual(err.code, 'nourl');
				assert.strictEqual(err.info, 'No valid API endpoint is provided.');
			}
		});

		it('should retry once when receiving an empty response', async function () {
			const TestMwbot = TestMwbotFactory('empty');
			const mwbotInitOptions = getMwbotInitOptionsBase('named');
			const promise = TestMwbot.init(mwbotInitOptions);

			await Promise.resolve();
			await clock.tickAsync(5000);

			const mwbot = await promise;

			assert.instanceOf(mwbot, TestMwbot);

			assert.strictEqual(errorSpy.callCount, 1);
			assert.strictEqual(warnSpy.callCount, 1);
			assert.strictEqual(infoSpy.callCount, 1);

			assert.isTrue(errorSpy.calledBefore(warnSpy));
			assert.isTrue(warnSpy.calledBefore(infoSpy));
		});

		it('should throw an error when the retry also receives an empty response', async function () {
			const TestMwbot = TestMwbotFactory('empty', Infinity);
			const mwbotInitOptions = getMwbotInitOptionsBase('named');
			const promise = TestMwbot.init(mwbotInitOptions).catch(err => err);

			await Promise.resolve();
			await clock.tickAsync(5000);

			const err = await promise;

			assert.instanceOf(err, MwbotError);
			assert.strictEqual(err.code, 'empty');

			assert.strictEqual(errorSpy.callCount, 1);
			assert.strictEqual(warnSpy.callCount, 1);
			assert.strictEqual(infoSpy.callCount, 0);

			assert.isTrue(errorSpy.calledBefore(warnSpy));
		});

		it('should retry once when userinfo.id is 0 for authenticated users', async function () {
			const TestMwbot = TestMwbotFactory('userId');
			const mwbotInitOptions = getMwbotInitOptionsBase('named');
			const promise = TestMwbot.init(mwbotInitOptions);

			await Promise.resolve();
			await clock.tickAsync(5000);

			const mwbot = await promise;

			assert.instanceOf(mwbot, TestMwbot);

			assert.strictEqual(errorSpy.callCount, 1);
			assert.strictEqual(warnSpy.callCount, 1);
			assert.strictEqual(infoSpy.callCount, 1);

			assert.isTrue(errorSpy.calledBefore(warnSpy));
			assert.isTrue(warnSpy.calledBefore(infoSpy));
		});

		it('should throw badauth when userinfo.id remains 0 after a retry', async function () {
			const TestMwbot = TestMwbotFactory('userId', Infinity);
			const mwbotInitOptions = getMwbotInitOptionsBase('named');
			const promise = TestMwbot.init(mwbotInitOptions).catch(err => err);

			await Promise.resolve();
			await clock.tickAsync(5000);

			const err = await promise;

			assert.instanceOf(err, MwbotError);
			assert.strictEqual(err.code, 'badauth');

			assert.strictEqual(errorSpy.callCount, 1);
			assert.strictEqual(warnSpy.callCount, 1);
			assert.strictEqual(infoSpy.callCount, 0);

			assert.isTrue(errorSpy.calledBefore(warnSpy));
		});

		it('should reject immediately when login fails', async function () {
			try {
				const TestMwbot = TestMwbotFactory(false, 1, true);
				const mwbotInitOptions = getMwbotInitOptionsBase('named');
				await TestMwbot.init(mwbotInitOptions);

				assert.fail('Expected init() to reject');
			} catch (err) {
				assert.instanceOf(err, MwbotError);
				assert.strictEqual(err.code, 'loginfailed');
			}
		});

		it('should retry when initConfigData returns failed keys', async function () {
			const TestMwbot = TestMwbotFactory('articlepath');
			const mwbotInitOptions = getMwbotInitOptionsBase('named');
			const promise = TestMwbot.init(mwbotInitOptions);

			await Promise.resolve();
			await clock.tickAsync(5000);

			const mwbot = await promise;

			assert.instanceOf(mwbot, TestMwbot);

			assert.strictEqual(errorSpy.callCount, 1);
			assert.strictEqual(warnSpy.callCount, 1);
			assert.strictEqual(infoSpy.callCount, 1);

			assert.isTrue(errorSpy.calledBefore(warnSpy));
			assert.isTrue(warnSpy.calledBefore(infoSpy));
		});

		it('should throw badvars when initConfigData still returns failed keys after a retry', async function () {
			const TestMwbot = TestMwbotFactory('articlepath', Infinity);
			const mwbotInitOptions = getMwbotInitOptionsBase('named');
			const promise = TestMwbot.init(mwbotInitOptions).catch(err => err);

			await Promise.resolve();
			await clock.tickAsync(5000);

			const err = await promise;

			assert.instanceOf(err, MwbotError);
			assert.strictEqual(err.code, 'badvars');
			assert.isArray(err.data?.keys);
			assert.include(err.data?.keys ?? [], 'wgArticlePath');

			assert.strictEqual(errorSpy.callCount, 1);
			assert.strictEqual(warnSpy.callCount, 1);
			assert.strictEqual(infoSpy.callCount, 0);

			assert.isTrue(errorSpy.calledBefore(warnSpy));
		});
	});

	describe('setMwbotOptions()', function () {
		it('should deeply merge options when merge is true (default)', async function () {
			const mwbot = await getTestMwbot('named');
			const intervalActions = [/** @type {const} */ ('edit')];
			mwbot.userMwbotOptions.intervalActions = intervalActions;

			mwbot.setMwbotOptions({ userAgent: 'new-agent' });

			assert.strictEqual(mwbot.userMwbotOptions.apiUrl, 'http://localhost:8080');
			assert.strictEqual(mwbot.userMwbotOptions.userAgent, 'new-agent');
			assert.deepEqual(mwbot.userMwbotOptions.intervalActions, intervalActions);
			assert.notStrictEqual(mwbot.userMwbotOptions.intervalActions, intervalActions); // Test deep copy
		});

		it('should clear old options except apiUrl when merge is false', async function () {
			const mwbot = await getTestMwbot('named');
			mwbot.userMwbotOptions.intervalActions = ['edit'];

			mwbot.setMwbotOptions({ userAgent: 'new-agent' }, false);

			assert.strictEqual(mwbot.userMwbotOptions.apiUrl, 'http://localhost:8080');
			assert.strictEqual(mwbot.userMwbotOptions.userAgent, 'new-agent');
			assert.notExists(mwbot.userMwbotOptions.intervalActions);
		});

		it('should throw "nourl" fatal error if apiUrl is missing after update', async function () {
			const mwbot = await getTestMwbot('named');

			assert.throws(
				() => mwbot.setMwbotOptions({ apiUrl: '' }), // Overwrite
				MwbotError,
				'"apiUrl" must be retained.'
			);
		});
	});

	describe('setRequestOptions()', function () {
		it('should deeply merge options when merge is true (default)', async function () {
			const mwbot = await getTestMwbot('named');
			mwbot.userRequestOptions.headers ??= {};
			mwbot.userRequestOptions.headers['X-Retained'] = '1';

			mwbot.setRequestOptions({ headers: { 'X-Test': '1' }, timeout: 1000 });

			// Constructor sets up `url` in all cases: it should be retained
			assert.strictEqual(mwbot.userRequestOptions.url, 'http://localhost:8080');
			assert.strictEqual(mwbot.userRequestOptions.timeout, 1000);
			assert.strictEqual(mwbot.userRequestOptions.headers?.['X-Retained'], '1');
			assert.strictEqual(mwbot.userRequestOptions.headers?.['X-Test'], '1');
		});

		it('should clear old options when merge is false', async function () {
			const mwbot = await getTestMwbot('named');

			mwbot.setRequestOptions({ headers: { 'X-Test': '1' } }, false);

			assert.isUndefined(mwbot.userRequestOptions.url);
			assert.deepEqual(mwbot.userRequestOptions.headers, { 'X-Test': '1' });
		});
	});

	describe('apilimit', function () {
		it('should return 500 if the user has "apihighlimits" right', async function () {
			const mwbot = await getTestMwbot('named');
			assert.strictEqual(mwbot.apilimit, 500);
		});

		it('should return 50 if the user lacks "apihighlimits" right', async function () {
			const mwbot = await getTestMwbot('anon');
			assert.strictEqual(mwbot.apilimit, 50);
		});
	});

	describe('hasRights()', function () {
		it('should return true if the user has the specified single right', async function () {
			const mwbot = await getTestMwbot('anon');
			assert.isTrue(mwbot.hasRights('edit'));
		});

		it('should return false if the user lacks the specified single right', async function () {
			const mwbot = await getTestMwbot('anon');
			assert.isFalse(mwbot.hasRights('delete'));
		});

		it('should return true if requireAll is true and user has ALL rights', async function () {
			const mwbot = await getTestMwbot('named');
			assert.isTrue(mwbot.hasRights(['read', 'delete'], true));
		});

		it('should return false if requireAll is true and user lacks ANY right', async function () {
			const mwbot = await getTestMwbot('anon');
			assert.isFalse(mwbot.hasRights(['read', 'delete'], true));
		});

		it('should return true for an empty rights array when requireAll is true', async function () {
			const mwbot = await getTestMwbot('anon');
			assert.isTrue(mwbot.hasRights([], true));
		});

		it('should return true if requireAll is false and user has AT LEAST ONE right', async function () {
			const mwbot = await getTestMwbot('anon');
			assert.isTrue(mwbot.hasRights(['edit', 'delete'], false));
		});

		it('should return false if requireAll is false and user lacks ALL rights', async function () {
			const mwbot = await getTestMwbot('anon');
			assert.isFalse(mwbot.hasRights(['delete', 'block'], false));
		});
	});

	describe('isAnonymous()', function () {
		it('should return true if instantiated as anonymous', async function () {
			const mwbot = await getTestMwbot('anon');
			// @ts-expect-error - Protected method
			assert.isTrue(mwbot.isAnonymous());
		});

		it('should return false if instantiated as a named user', async function () {
			const mwbot = await getTestMwbot('named');
			// @ts-expect-error - Protected method
			assert.isFalse(mwbot.isAnonymous());
		});
	});

	describe('dieIfAnonymous()', function () {
		it('should throw "anonymous" error if user is anonymous and condition is true', async function () {
			const mwbot = await getTestMwbot('anon');
			assert.throws(
				// @ts-expect-error - Protected method
				() => mwbot.dieIfAnonymous(),
				MwbotError,
				'Anonymous users are limited to non-write requests.'
			);
		});

		it('should not throw if user is anonymous but condition is false', async function () {
			const mwbot = await getTestMwbot('anon');
			assert.doesNotThrow(
				// @ts-expect-error - Protected method
				() => mwbot.dieIfAnonymous(false)
			);
		});

		it('should not throw if user is registered, regardless of condition', async function () {
			const mwbot = await getTestMwbot('named');
			assert.doesNotThrow(
				// @ts-expect-error - Protected method
				() => mwbot.dieIfAnonymous(true)
			);
		});
	});

	describe('dieIfNoRights()', function () {
		it('should do nothing if user has required rights and is registered', async function () {
			const mwbot = await getTestMwbot('named');
			// @ts-expect-error - Protected method
			assert.doesNotThrow(() => mwbot.dieIfNoRights('delete', 'delete the page'));
		});

		it('should throw "nopermission" error if registered user lacks rights', async function () {
			const mwbot = await getTestMwbot('named');
			assert.throws(
				// @ts-expect-error - Protected method
				() => mwbot.dieIfNoRights('superadmin', 'do something weird'),
				MwbotError,
				'You do not have permission to do something weird.'
			);
		});

		it('should throw "anonymous" error if user is anonymous and allowAnonymous is false', async function () {
			const mwbot = await getTestMwbot('anon');
			assert.throws(
				// @ts-expect-error - Protected method
				() => mwbot.dieIfNoRights('read', 'read the page'),
				MwbotError,
				'Anonymous users are limited to non-write requests.'
			);
		});

		it('should check rights correctly if user is anonymous but allowAnonymous is true', async function () {
			const mwbot = await getTestMwbot('anon');
			// @ts-expect-error - Protected method
			assert.doesNotThrow(() =>mwbot.dieIfNoRights('read', 'read the page', true));
			assert.throws(
				// @ts-expect-error - Protected method
				() => mwbot.dieIfNoRights('delete', 'delete the page', true),
				MwbotError,
				'You do not have permission to delete the page.'
			);
		});
	});

	describe('dieAsEmpty()', function () {
		// @ts-expect-error - Protected method
		const dieAsEmpty = Mwbot.dieAsEmpty.bind(Mwbot);

		it('should throw an error with the default message when no arguments are provided', function () {
			assert.throws(
				() => dieAsEmpty(),
				MwbotError,
				'OK response but empty result.'
			);
		});

		it('should throw an error with additional info when die is true', function () {
			assert.throws(
				() => dieAsEmpty(true, 'no pages found'),
				MwbotError,
				'OK response but empty result (no pages found).'
			);
		});

		it('should return the error object instead of throwing when die is false', function () {
			const data = { response: { batchcomplete: true } };
			const result = dieAsEmpty(false, 'missing parameter', data);

			assert.instanceOf(result, MwbotError);
			assert.strictEqual(result.type, 'api_mwbot');
			assert.strictEqual(result.code, 'empty');
			assert.strictEqual(result.info, 'OK response but empty result (missing parameter).');
			assert.deepEqual(result.data, data);
		});

		it('should fallback to default message if additionalInfo is provided but not a string', function () {
			assert.throws(
				// @ts-expect-error - Testing runtime fallback
				() => dieAsEmpty(true, 12345),
				MwbotError,
				'OK response but empty result.'
			);
		});
	});

	describe('dieIfNotPost()', function () {
		// @ts-expect-error - Protected method
		const dieIfNotPost = Mwbot.dieIfNotPost.bind(Mwbot);

		it('should not throw if the request method is POST', function () {
			assert.doesNotThrow(
				() => dieIfNotPost({ method: 'POST', url: '/api.php' })
			);
		});

		it('should throw a fatal internal error if the method is GET', function () {
			assert.throws(
				() => dieIfNotPost({ method: 'GET', url: '/api.php' }),
				MwbotError,
				'Expected request method to be "POST", but received "GET".'
			);
		});

		it('should throw a fatal internal error if the method is missing (undefined)', function () {
			assert.throws(
				() => dieIfNotPost({ url: '/api.php' }),
				MwbotError,
				'Expected request method to be "POST", but received "undefined".'
			);
		});

		it('should safely handle undefined requestOptions', function () {
			assert.throws(
				// @ts-expect-error - Testing bad input
				() => dieIfNotPost(undefined),
				MwbotError,
				'Expected request method to be "POST", but received "undefined".'
			);
		});
	});

	describe('dieWithTypeError() and formatType()', function () {
		// @ts-expect-error - Protected method
		const dieWithTypeError = Mwbot.dieWithTypeError.bind(Mwbot);

		describe('Overload 1: Custom message', function () {
			it('should throw exactly the provided custom message', function () {
				const customMessage = 'A completely custom error message.';
				assert.throws(
					() => dieWithTypeError(customMessage),
					MwbotError,
					customMessage
				);
			});
		});

		describe('Overload 2: Auto-generated message (formatType tests)', function () {
			// --- Primitives (should be lowercase) ---
			it('should format numbers correctly as "number"', function () {
				assert.throws(
					() => dieWithTypeError('string', 'limit', 100),
					MwbotError,
					'Expected string for "limit", but got number.'
				);
			});

			it('should format strings correctly as "string"', function () {
				assert.throws(
					() => dieWithTypeError('number', 'offset', '100'),
					MwbotError,
					'Expected number for "offset", but got string.'
				);
			});

			it('should format booleans correctly as "boolean"', function () {
				assert.throws(
					() => dieWithTypeError('string', 'minor', true),
					MwbotError,
					'Expected string for "minor", but got boolean.'
				);
			});

			it('should format symbols correctly as "symbol"', function () {
				assert.throws(
					() => dieWithTypeError('number', 'key', Symbol()),
					MwbotError,
					'Expected number for "key", but got symbol.'
				);
			});

			it('should format bigints correctly as "bigint"', function () {
				assert.throws(
					() => dieWithTypeError('string', 'size', 1n),
					MwbotError,
					'Expected string for "size", but got bigint.'
				);
			});

			it('should format undefined correctly as "undefined"', function () {
				assert.throws(
					() => dieWithTypeError('number', 'title', undefined),
					MwbotError,
					'Expected number for "title", but got undefined.'
				);
			});

			// --- Structural Types ---
			it('should format arrays correctly as "array"', function () {
				assert.throws(
					() => dieWithTypeError('string', 'titles', ['Page A', 'Page B']),
					MwbotError,
					'Expected string for "titles", but got array.'
				);
			});

			it('should format null correctly as "null"', function () {
				assert.throws(
					() => dieWithTypeError('object', 'config', null),
					MwbotError,
					'Expected object for "config", but got null.'
				);
			});

			it('should format plain objects as "Object"', function () {
				assert.throws(
					() => dieWithTypeError('string', 'data', { key: 'value' }),
					MwbotError,
					'Expected string for "data", but got Object.'
				);
			});

			it('should format objects without a prototype as "object"', function () {
				const nullProtoObj = Object.create(null);
				assert.throws(
					() => dieWithTypeError('string', 'data', nullProtoObj),
					MwbotError,
					'Expected string for "data", but got object.'
				);
			});

			// --- Functions ---
			it('should normalize standard functions to "function"', function () {
				assert.throws(
					() => dieWithTypeError('object', 'callback', function () {}),
					MwbotError,
					'Expected object for "callback", but got function.'
				);
			});

			it('should normalize arrow functions to "function"', function () {
				assert.throws(
					() => dieWithTypeError('object', 'callback', () => {}),
					MwbotError,
					'Expected object for "callback", but got function.'
				);
			});

			// --- Custom Classes ---
			it('should format custom class instances using their constructor name', function () {
				class DummyClass {}
				assert.throws(
					() => dieWithTypeError('string', 'dummy', new DummyClass()),
					MwbotError,
					'Expected string for "dummy", but got DummyClass.'
				);
			});

			// --- Edge Cases ---
			it('should handle an empty string as variableName properly', function () {
				assert.throws(
					() => dieWithTypeError('number', '', 'bad input'),
					MwbotError,
					'Expected number for "", but got string.'
				);
			});
		});
	});

	describe('config', function () {

		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>['config']}
		 * @readonly
		 */
		let config;
		const missingKey = 'missingKey';
		let counter = 0;
		const testKey = () => `test_key_${counter++}`;

		before(async function () {
			config = (await getTestMwbot('named')).config;
		});

		it('should contain functions', function () {
			assert.isFunction(config.get);
			assert.isFunction(config.set);
			assert.isFunction(config.exists);
		});

		describe('get()', function () {
			it('should return null for a missing key by default', function () {
				assert.isNull(config.get(missingKey));
			});

			it('should return the fallback value for a missing key', function () {
				assert.strictEqual(config.get(missingKey, 'fallback'), 'fallback');
			});

			it('should treat explicit undefined fallback as null', function () {
				assert.isNull(config.get(missingKey, undefined));
			});

			it('should return an object when given an array of keys', function () {
				assert.deepEqual(
					config.get(['wgContentLanguage', 'wgSiteName']),
					{
						wgContentLanguage: 'en',
						wgSiteName: 'Wikipedia',
					}
				);
			});

			it('should apply fallback to missing keys in array selection', function () {
				assert.deepEqual(
					config.get(['wgContentLanguage', missingKey], 'missing'),
					{
						wgContentLanguage: 'en',
						[missingKey]: 'missing',
					}
				);
			});

			it('should return all config values when called without arguments', function () {
				const all = config.get();

				assert.isObject(all);
				// @ts-expect-error - Accessing a protected property
				assert.strictEqual(Object.keys(all).length, TestMwbotFactory().CONFIG_KEYS.size);
				assert.isString(all.wgArticlePath);
				assert.isArray(all.wgCaseSensitiveNamespaces);
				assert.propertyVal(all, 'wgContentLanguage', 'en');
				assert.isArray(all.wgContentNamespaces);
				assert.propertyVal(all, 'wgDBname', 'mwbot_ts');
				assert.isObject(all.wgFormattedNamespaces);
				assert.isString(all.wgLegalTitleChars);
				assert.isObject(all.wgNamespaceIds);
				assert.isString(all.wgScript);
				assert.isString(all.wgScriptPath);
				assert.propertyVal(all, 'wgServer', 'http://localhost:8080');
				assert.propertyVal(all, 'wgServerName', 'localhost');
				assert.propertyVal(all, 'wgSiteName', 'Wikipedia');
				assert.isNumber(all.wgUserId);
				assert.isString(all.wgUserName);
				assert.isArray(all.wgUserRights);
				assert.isString(all.wgVersion);
				assert.propertyVal(all, 'wgWikiID', 'mwbot_ts');
			});

			it('should return a deep copy', function () {
				const all = config.get();

				all.wgNamespaceIds.foo = 123;

				assert.notProperty(config.get('wgNamespaceIds'), 'foo');
			});
		});

		describe('exists()', function () {
			it('should return true for an existing key', function () {
				assert.isTrue(config.exists('wgUserName'));
			});

			it('should return false for a missing key', function () {
				assert.isFalse(config.exists(missingKey));
			});

			it('should return true for keys with null values', function () {
				const key = testKey();

				assert.isTrue(config.set(key, null));
				assert.isTrue(config.exists(key));
				assert.isNull(config.get(key));
			});

		});

		describe('set()', function () {
			it('should set a custom key', function () {
				const key = testKey();

				assert.isTrue(config.set(key, 123));
				assert.strictEqual(config.get(key), 123);
			});

			it('should set multiple custom keys', function () {
				const key1 = testKey();
				const key2 = testKey();

				assert.isTrue(
					config.set({
						[key1]: 'bar',
						[key2]: 456,
					})
				);
				assert.strictEqual(config.get(key1), 'bar');
				assert.strictEqual(config.get(key2), 456);
			});

			it('should ignore undefined values', function () {
				const key = testKey();

				assert.isFalse(config.set(key, undefined));
				assert.isFalse(config.exists(key));
			});

			it('should ignore undefined values in object form', function () {
				const key1 = testKey();
				const key2 = testKey();

				assert.isTrue(
					config.set({
						[key1]: 1,
						[key2]: undefined,
					})
				);

				assert.strictEqual(config.get(key1), 1);
				assert.isFalse(config.exists(key2));
			});

			it('should not overwrite built-in wg variables', function () {
				const original = config.get('wgSiteName');

				assert.isFalse(config.set('wgSiteName', 'Foo'));
				assert.strictEqual(config.get('wgSiteName'), original);
			});

			it('should not overwrite built-in wg variables in object form', function () {
				const key = testKey();
				const original = config.get('wgSiteName');

				assert.isTrue(
					config.set({
						[key]: 'value',
						wgSiteName: 'Foo',
					})
				);
				assert.strictEqual(config.get(key), 'value');
				assert.strictEqual(config.get('wgSiteName'), original);
			});

			it('should return false when all object entries are rejected', function () {
				assert.isFalse(
					config.set({
						wgSiteName: 'Foo',
						wgVersion: '999999.0.0',
					})
				);
			});

			it('should return false for an empty object', function () {
				assert.isFalse(config.set({}));
			});

		});
	});

	describe('unrefRequestOptions()', function () {
		// @ts-expect-error - Protected method
		const unrefRequestOptions = Mwbot.unrefRequestOptions.bind(Mwbot);

		it('should return { _cloned: true } if requestOptions is undefined', function () {
			const result = unrefRequestOptions(undefined);
			// @ts-expect-error - _cloned is hidden to the public
			assert.deepEqual(result, { _cloned: true });
		});

		it('should return { _cloned: true } if requestOptions is an empty object', function () {
			const result = unrefRequestOptions({});
			// @ts-expect-error - _cloned is hidden to the public
			assert.deepEqual(result, { _cloned: true });
		});

		it('should return { _cloned: true } for an empty null-prototype object', function () {
			const result = unrefRequestOptions(Object.create(null));
			// @ts-expect-error - _cloned is hidden to the public
			assert.deepEqual(result, { _cloned: true });
		});

		it('should return the original object as-is if _cloned is already true', function () {
			const original = { timeout: 1000, _cloned: true };
			const result = unrefRequestOptions(original);

			assert.strictEqual(result, original);

			result.timeout = 2000;
			assert.strictEqual(original.timeout, 2000);
		});

		it('should deeply clone a non-empty object and mark it as cloned', function () {
			const original = {
				timeout: 5000,
				headers: { 'User-Agent': 'TestBot/1.0' },
			};
			const result = unrefRequestOptions(original);

			// @ts-expect-error - _cloned is hidden to the public
			assert.isTrue(result._cloned);
			assert.strictEqual(result.timeout, 5000);
			assert.strictEqual(result.headers?.['User-Agent'], 'TestBot/1.0');

			// @ts-expect-error - _cloned is hidden to the public
			assert.isUndefined(original._cloned, '_cloned should only be set to the output object');

			// Ensure `result` is a deep clone
			assert.notStrictEqual(result, original);
			assert.notStrictEqual(result.headers, original.headers);

			result.headers ??= {};
			result.headers['User-Agent'] = 'ChangedAgent/2.0';
			assert.strictEqual(original.headers['User-Agent'], 'TestBot/1.0');
		});

		it('should not clone the same object twice', function () {
			const original = {
				timeout: 5000,
				headers: {
					foo: 'bar',
				},
			};
			const first = unrefRequestOptions(original);
			const second = unrefRequestOptions(first);

			assert.strictEqual(first, second);
		});
	});

	describe('rawRequest()', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		afterEach(function () {
			sinon.restore();
		});

		it('should deep-copy request options when _closed is not set', async function () {
			// @ts-expect-error - axios is a property rather than a method
			const axiosStub = sinon.stub(mwbot, 'axios').resolves({
				data: 'success',
			});
			const requestOptions = {
				headers: {
					foo: 'bar',
				},
			};
			const res = await mwbot.rawRequest(requestOptions);

			axiosStub.firstCall.args[0].headers.foo = 'baz';

			assert.strictEqual(res.data, 'success');
			assert.strictEqual(requestOptions.headers.foo, 'bar');
		});

		it('should not clone request options when _cloned is true', async function () {
			let passedOptions;
			// @ts-expect-error - axios is a property rather than a method
			sinon.stub(mwbot, 'axios').callsFake(async (options) => {
				passedOptions = options;
				return { data: 'success' };
			});
			const requestOptions = {
				_cloned: true,
				timeout: 10000,
			};

			await mwbot.rawRequest(requestOptions);

			assert.strictEqual(passedOptions, requestOptions);
		});

		it('should bypass AbortController if disableAbort is true', async function () {
			// @ts-expect-error - axios is a property rather than a method
			const axiosStub = sinon.stub(mwbot, 'axios').resolves({
				data: 'success',
			});
			const res = await mwbot.rawRequest({
				disableAbort: true,
			});

			assert.strictEqual(res.data, 'success');
			// @ts-expect-error - Protected property
			assert.strictEqual(mwbot.abortions.size, 0);
			assert.isUndefined(axiosStub.firstCall.args[0].signal);
		});

		it('should bypass AbortController if signal is provided', async function () {
			// @ts-expect-error - axios is a property rather than a method
			const axiosStub = sinon.stub(mwbot, 'axios').resolves({
				data: 'success',
			});
			const controller = new AbortController();
			const res = await mwbot.rawRequest({
				signal: controller.signal,
			});

			assert.strictEqual(res.data, 'success');
			// @ts-expect-error - Protected property
			assert.strictEqual(mwbot.abortions.size, 0);
			assert.strictEqual(axiosStub.firstCall.args[0].signal, controller.signal);
		});

		it('should inject AbortController and clean it up after request', async function () {
			// @ts-expect-error - axios is a property rather than a method
			sinon.stub(mwbot, 'axios').callsFake(async (options) => {
				assert.isDefined(options.signal);
				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot.abortions.size, 1);

				return { data: 'success' };
			});
			const res = await mwbot.rawRequest({});

			assert.strictEqual(res.data, 'success');
			// @ts-expect-error - Protected property
			assert.strictEqual(mwbot.abortions.size, 0);
		});

		it('should clean up AbortController after request rejection', async function () {
			// @ts-expect-error - axios is a property rather than a method
			sinon.stub(mwbot, 'axios').rejects(new Error('boom'));

			try {
				await mwbot.rawRequest({});
				assert.fail('Expected rawRequest() to reject');
			} catch {
				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot.abortions.size, 0);
			}
		});
	});

	describe('request()', function () {
		afterEach(function () {
			sinon.restore();
		});

		it('should deep-clone the passed arguments', async function () {
			const mwbot = await getTestMwbot('named');
			// @ts-expect-error - Protected method
			const requestStub = sinon.stub(mwbot, '_request').resolves({
				batchcomplete: true,
			});
			const params = {
				action: /** @type {const} */ ('query'),
				titles: ['Foo', 'Bar'],
			};
			const requestOptions = {
				headers: {
					'X-Foo': 'bar',
				},
			};

			const promise =  mwbot.request(params, requestOptions);

			// Mutate the passed arguments
			params.titles.push('Baz');
			requestOptions.headers['X-Foo'] = 'baz';

			await promise;

			const passedOptions = requestStub.firstCall.args[0];
			assert.deepEqual(passedOptions.params.titles, ['Foo', 'Bar']);
			assert.notStrictEqual(passedOptions.params.titles,	params.titles);
			assert.strictEqual(passedOptions.headers['X-Foo'], 'bar');
			assert.notStrictEqual(passedOptions.headers, requestOptions.headers);
			assert.isTrue(passedOptions._cloned);
		});
	});

	describe('prepareRequest()', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		afterEach(function () {
			sinon.restore();
		});

		it('should return finalized query parameters', async function () {
			const reqOpts = createRequestOptions(mwbot);

			assert.isObject(reqOpts.params);

			// @ts-expect-error - Protected method
			const finalizedParams = await mwbot.prepareRequest(reqOpts);

			assert.deepEqual(finalizedParams, reqOpts.params);
			assert.notStrictEqual(finalizedParams, reqOpts.params);
		});

		it('should normalize and deduplicate request headers', async function () {
			const reqOpts = createRequestOptions(mwbot);
			reqOpts.headers ??={};
			reqOpts.headers['X-Foo'] = 1;
			reqOpts.headers['x-foo'] = 2;

			// @ts-expect-error - Protected method
			await mwbot.prepareRequest(reqOpts);

			assert.strictEqual(reqOpts.headers['X-Foo'], 2);
			assert.isUndefined(reqOpts.headers['x-foo']);
		});

		it('should throw "invalidformat" if format is not json', async function () {
			const reqOpts = {
				params: {
					action: 'query',
					format: 'xml',
				},
			};

			try {
				// @ts-expect-error - Protected method
				await mwbot.prepareRequest(reqOpts);
				assert.fail('Expected request() to reject');
			} catch (err) {
				assert.instanceOf(err, MwbotError);
				assert.strictEqual(err.code, 'invalidformat');
			}
		});

		it('should enforce assert=user for authenticated users', async function () {
			const reqOpts = createRequestOptions(mwbot);

			assert.isObject(reqOpts.params);
			assert.isUndefined(reqOpts.params.assert);

			// @ts-expect-error - Protected method
			const finalizedParams = await mwbot.prepareRequest(reqOpts);

			assert.strictEqual(finalizedParams.assert, 'user');
		});

		it('should not enforce assert=user when disableAssert is true', async function () {
			const reqOpts = createRequestOptions(mwbot, { disableAssert: true });

			assert.isObject(reqOpts.params);
			assert.isUndefined(reqOpts.params.assert);

			// @ts-expect-error - Protected method
			const finalizedParams = await mwbot.prepareRequest(reqOpts);

			assert.isUndefined(finalizedParams.assert);
		});

		it('should not enforce assert=user when assertuser is already provided', async function () {
			const reqOpts = createRequestOptions(mwbot, {
				params: { assertuser: 'Admin' },
			});

			assert.isObject(reqOpts.params);
			assert.isUndefined(reqOpts.params.assert);

			// @ts-expect-error - Protected method
			const finalizedParams = await mwbot.prepareRequest(reqOpts);

			assert.isUndefined(finalizedParams.assert);
			assert.strictEqual(finalizedParams.assertuser, 'Admin');
		});

		it('should not override an existing assert parameter', async function () {
			const reqOpts = createRequestOptions(mwbot, {
				params: { assert: 'bot' },
			});

			assert.isObject(reqOpts.params);
			assert.strictEqual(reqOpts.params.assert, 'bot');

			// @ts-expect-error - Protected method
			const finalizedParams = await mwbot.prepareRequest(reqOpts);

			assert.strictEqual(finalizedParams.assert, 'bot');
		});

		it('should merge apiUrl and user agent from userMwbotOptions', async function () {
			const reqOpts = createRequestOptions(mwbot, {
				headers: {
					'user-agent': 'Foo',
				},
			});
			delete reqOpts.url;
			delete reqOpts.headers?.['User-Agent'];
			sinon.stub(mwbot, 'userMwbotOptions').value({
				apiUrl: 'API_URL',
				// @ts-expect-error - Protected property
				credentials: mwbot.credentials,
				userAgent: 'USER_AGENT',
			});

			assert.strictEqual(reqOpts.headers?.['user-agent'], 'Foo');

			// @ts-expect-error - Protected method
			await mwbot.prepareRequest(reqOpts);

			assert.strictEqual(reqOpts.url, 'API_URL');
			assert.strictEqual(reqOpts.headers?.['User-Agent'], 'USER_AGENT');
			assert.isUndefined(reqOpts.headers?.['user-agent']);
		});

		it('should keep GET when autoMethod is true and parameters are short', async function () {
			const reqOpts = createRequestOptions(mwbot, {
				method: 'GET',
				params: {
					titles: 'a'.repeat(1900),
				},
				autoMethod: true,
			});

			// @ts-expect-error - Protected method
			await mwbot.prepareRequest(reqOpts);

			assert.strictEqual(reqOpts.method, 'GET');
			assert.isUndefined(reqOpts.autoMethod);
			assert.isUndefined(reqOpts.headers?.['Promise-Non-Write-API-Action']);
		});

		it('should switch to POST when autoMethod is true and parameters are long', async function () {
			const reqOpts = createRequestOptions(mwbot, {
				method: 'GET',
				params: {
					titles: 'a'.repeat(2100),
				},
				autoMethod: true,
			});

			// @ts-expect-error - Protected method
			await mwbot.prepareRequest(reqOpts);

			assert.strictEqual(reqOpts.method, 'POST');
			assert.isUndefined(reqOpts.autoMethod);
		});

		it('should call applyAuthentication()', async function () {
			// @ts-expect-error - Protected method
			const authSpy = sinon.spy(mwbot, 'applyAuthentication');
			const reqOpts = createRequestOptions(mwbot);

			// @ts-expect-error - Protected method
			await mwbot.prepareRequest(reqOpts);

			assert.isTrue(authSpy.calledOnce);
		});

		it('should preserve query parameters for GET requests', async function () {
			const reqOpts = createRequestOptions(mwbot, {
				method: 'GET',
			});

			// @ts-expect-error - Protected method
			await mwbot.prepareRequest(reqOpts);

			assert.exists(reqOpts.params);
			assert.isUndefined(reqOpts.data);
		});

		it('should set the request body and delete query parameters for POST requests', async function () {
			const reqOpts = createRequestOptions(mwbot, {
				method: 'POST',
			});

			// @ts-expect-error - Protected method
			await mwbot.prepareRequest(reqOpts);

			assert.instanceOf(reqOpts.data, URLSearchParams);
			assert.include(reqOpts.data.toString(), 'action=query');
			assert.isUndefined(reqOpts.params);
		});
	});

	describe('preprocessParameters()', function () {
		it('should properly format arrays, booleans, and Dates', function () {
			/** @type {Record<string, any>} */
			const params = {
				normal: 'string',
				arr1: ['a', 'b'],
				arr2: ['a|b', 'c'],
				boolTrue: true,
				boolFalse: false,
				boolUndef: undefined,
				date: new Date('2026-01-01T00:00:00Z'),
			};
			// @ts-expect-error - Protected method
			const result = Mwbot.preprocessParameters(params);

			assert.strictEqual(params.normal, 'string');
			assert.strictEqual(params.arr1, 'a|b');
			assert.strictEqual(params.arr2, '\x1fa|b\x1fc');
			assert.strictEqual(params.boolTrue, '1');
			assert.isUndefined(params.boolFalse);
			assert.isUndefined(params.boolUndef);
			assert.strictEqual(params.date, '2026-01-01T00:00:00.000Z');

			assert.isFalse(result.hasLongFields);
			assert.isAbove(result.length, 0);
		});

		it('should detect fields longer than 8000 characters', function () {
			const params = {
				short: 'a',
				long: 'A'.repeat(8001),
			};
			// @ts-expect-error - Protected method
			const result = Mwbot.preprocessParameters(params);

			assert.isTrue(result.hasLongFields);
		});
	});

	describe('handlePost()', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		afterEach(function () {
			sinon.restore();
		});

		const POST_METHOD = { method: 'POST' };

		it('should reject if the request method is not POST', async function () {
			try {
				// @ts-expect-error - Protected method
				await mwbot.handlePost({ method: 'GET' }, false);
				assert.fail('Expected handlePost() to reject');
			} catch (e) {
				assert.instanceOf(e, MwbotError);
				assert.strictEqual(e.code, 'internal');
				assert.strictEqual(e.info, 'Expected request method to be "POST", but received "GET".');
			}
		});

		it('should mutate the provided request options object', async function () {
			/** @type {Record<string, any>} */
			const reqOpts = {
				...POST_METHOD,
				params: {
					action: 'edit',
					title: 'Test',
				},
			};
			const original = reqOpts;
			// @ts-expect-error - Protected method
			await mwbot.handlePost(reqOpts, false);

			assert.strictEqual(reqOpts, original);
			assert.instanceOf(reqOpts.data, URLSearchParams);
		});

		it('should add "Promise-Non-Write-API-Action" header for query/parse actions', async function () {
			/** @type {Record<string, any>} */
			const reqOpts = {
				...POST_METHOD,
				headers: {},
				params: { action: 'parse' },
			};
			// @ts-expect-error - Protected method
			await mwbot.handlePost(reqOpts, false);

			assert.strictEqual(reqOpts.headers['Promise-Non-Write-API-Action'], '1');
		});

		it('should format data as URLSearchParams for standard POST', async function () {
			/** @type {Record<string, any>} */
			const reqOpts = {
				...POST_METHOD,
				headers: {},
				params: { action: 'edit', title: 'Test' },
			};
			// @ts-expect-error - Protected method
			await mwbot.handlePost(reqOpts, false);

			assert.strictEqual(reqOpts.headers['Content-Type'], 'application/x-www-form-urlencoded');
			assert.instanceOf(reqOpts.data, URLSearchParams);
			assert.strictEqual(reqOpts.data.get('title'), 'Test');
		});

		it('should re-append token if user is authenticated', async function () {
			/** @type {Record<string, any>} */
			const reqOpts = {
				...POST_METHOD,
				params: { action: 'edit', token: 'abc+\\', title: 'Foo' },
			};
			// @ts-expect-error - Protected method
			await mwbot.handlePost(reqOpts, false);

			assert.strictEqual(reqOpts.params.token, 'abc+\\');
			assert.instanceOf(reqOpts.data, URLSearchParams);
			assert.deepEqual([...reqOpts.data.entries()].at(-1), ['token', 'abc+\\']);
		});

		it('should delegate to handlePostMultipartFormData if hasLongFields is true', async function () {
			// @ts-expect-error - Protected method
			const handlerStub = sinon.stub(mwbot, 'handlePostMultipartFormData');

			/** @type {Record<string, any>} */
			const reqOpts = {
				...POST_METHOD,
				params: { action: 'edit' },
			};
			// @ts-expect-error - Protected method
			await mwbot.handlePost(reqOpts, true);

			assert.strictEqual(reqOpts.headers?.['Content-Type'], 'multipart/form-data');
			assert.strictEqual(handlerStub.callCount, 1);
		});

		it('should delegate to handlePostMultipartFormData if Content-Type is multipart/form-data', async function () {
			// @ts-expect-error - Protected method
			const handlerStub = sinon.stub(mwbot, 'handlePostMultipartFormData');

			/** @type {Record<string, any>} */
			const reqOpts = {
				...POST_METHOD,
				headers: { 'Content-Type': 'multipart/form-data' },
				params: { action: 'edit' },
			};
			// @ts-expect-error - Protected method
			await mwbot.handlePost(reqOpts, false);

			assert.strictEqual(reqOpts.headers['Content-Type'], 'multipart/form-data');
			assert.strictEqual(handlerStub.callCount, 1);
		});
	});

	describe('handlePostMultipartFormData()', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		afterEach(function () {
			sinon.restore();
		});

		it('should create FormData and calculate headers/content-length correctly', async function () {
			/** @type {Record<string, any>} */
			const reqOpts = {
				headers: { 'X-Custom': 'Header' },
				params: { action: 'edit' },
			};
			// @ts-expect-error - Protected method
			await mwbot.handlePostMultipartFormData(reqOpts, 'mock-token');

			assert.strictEqual(reqOpts.params.token, 'mock-token');

			assert.instanceOf(reqOpts.data, FormData);
			const body = reqOpts.data.getBuffer().toString();
			assert.include(body, 'name="token"');
			assert.include(body, 'mock-token');

			assert.include(reqOpts.headers['content-type'], 'multipart/form-data');
			assert.isNumber(reqOpts.headers['Content-Length']);
			assert.strictEqual(reqOpts.headers['X-Custom'], 'Header');
		});

		it('should normalize FormData.getLength errors', async function () {
			const reqOpts = {
				headers: {},
				params: { action: 'edit' },
			};
			sinon.stub(FormData.prototype, 'getLength').throws(new Error('mock error'));

			try {
				// @ts-expect-error - Protected method
				await mwbot.handlePostMultipartFormData(reqOpts, 'mock-token');
				assert.fail('Expected handlePostMultipartFormData() to throw');
			} catch (err) {
				assert.instanceOf(err, MwbotError);
				assert.strictEqual(err.code, 'formdata');
				assert.strictEqual(err.info, 'Failed to determine multipart form data length.');

				assert.instanceOf(err.cause, Error);
				assert.strictEqual(err.cause?.message, 'mock error');
			}
		});
	});

	describe('applyAuthentication()', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named'); // botpassword authentication
		});

		afterEach(function () {
			sinon.restore();
		});

		it('should do nothing if no credentials are set', function () {
			const reqOpts = { headers: {} };
			// @ts-expect-error - Protected method
			mwbot.applyAuthentication(reqOpts);
			assert.deepEqual(reqOpts.headers, {});
		});

		it('should apply OAuth 2.0 Bearer token', function () {
			// @ts-expect-error - Protected property
			sinon.stub(mwbot, 'credentials').value({ oauth2: 'TEST_OAUTH2_TOKEN' });
			/** @type {Record<string, any>} */
			const reqOpts = {};
			// @ts-expect-error - Protected method
			mwbot.applyAuthentication(reqOpts);

			assert.strictEqual(reqOpts.headers?.Authorization, 'Bearer TEST_OAUTH2_TOKEN');
		});

		it('should apply OAuth 1.0a authorization headers', function () {
			const authorizeStub = sinon.stub().returns({});
			const toHeaderStub = sinon.stub().returns({
				Authorization: 'OAuth test',
			});
			// @ts-expect-error - Protected property
			sinon.stub(mwbot, 'credentials').value({
				oauth1: {
					accessToken: 'key',
					accessSecret: 'secret',
					instance: {
						authorize: authorizeStub,
						toHeader: toHeaderStub,
					},
				},
			});
			/** @type {Record<string, any>} */
			const reqOpts = {
				url: 'http://localhost:8080',
				method: 'GET',
			};
			// @ts-expect-error - Protected method
			mwbot.applyAuthentication(reqOpts);

			assert.strictEqual(reqOpts.headers?.Authorization, 'OAuth test');
			assert.isTrue(authorizeStub.calledOnce);
			assert.isTrue(toHeaderStub.calledOnce);
			assert.deepInclude(
				authorizeStub.firstCall.args[0],
				{
					url: 'http://localhost:8080',
					method: 'GET',
				}
			);
		});

		it('should throw an error for OAuth 1.0a if url or method is missing', function () {
			// @ts-expect-error - Protected property
			sinon.stub(mwbot, 'credentials').value({ oauth1: {} });
			/** @type {Record<string, any>} */
			const reqOpts = {
				url: 'http://localhost:8080',
				// method missing
			};

			try {
				// @ts-expect-error - Protected method
				mwbot.applyAuthentication(reqOpts);
				assert.fail('Expected applyAuthentication() to throw');
			} catch (err) {
				assert.instanceOf(err, MwbotError);
				assert.strictEqual(err.code, 'internal');
				assert.include(err.info, 'OAuth 1.0 requires both "url" and "method"');
			}
		});
	});

	describe('_request()', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named'); // botpassword authentication
		});

		afterEach(function () {
			sinon.restore();
		});

		describe('Pre- and Post-request static flow', function () {
			it('should clone and delete params from requestOptions on POST requests to avoid "mustpostparams"', async function () {
				const reqOpts = createRequestOptions(mwbot, {
					method: 'POST',
					params: { action: 'query' },
				});
				const rawRequestStub = sinon.stub(mwbot, 'rawRequest').resolves(createAxiosResponse(reqOpts));

				// @ts-expect-error - Protected method
				await mwbot._request(reqOpts);

				assert.isUndefined(reqOpts.params);
				assert.isTrue(rawRequestStub.calledWith(reqOpts));
			});

			it('should enforce an interval delay if the action matches intervalActions and time elapsed is short', async function () {
				const clock = sinon.useFakeTimers();
				sinon.stub(mwbot, 'userMwbotOptions').value({
					apiUrl: 'http://localhost:8080',
					interval: 2000,
					intervalActions: ['query'],
				});
				const reqOpts = createRequestOptions(mwbot, { params: { action: 'query' } });
				const rawRequestStub = sinon.stub(mwbot, 'rawRequest').resolves(createAxiosResponse(reqOpts));
				// @ts-expect-error - Protected property
				sinon.stub(mwbot, 'lastRequestTime').value(clock.Date.now());

				// @ts-expect-error - Protected method
				const promise = mwbot._request(reqOpts);

				await Promise.resolve();
				await clock.tickAsync(1999);
				assert.strictEqual(rawRequestStub.callCount, 0);

				await clock.tickAsync(1);
				await promise;
				assert.strictEqual(rawRequestStub.callCount, 1);
			});

			it('should trigger dieAsEmpty if the response contains no data property', async function () {
				const reqOpts = createRequestOptions(mwbot, {
					method: 'GET',
					params: { action: 'query' },
				});
				const response = createAxiosResponse(reqOpts, null);
				const rawRequestStub = sinon.stub(mwbot, 'rawRequest').resolves(response);

				try {
					// @ts-expect-error - Protected property
					await mwbot._request(reqOpts);
					assert.fail('Expected _request() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					assert.strictEqual(err.info, 'OK response but empty result (check HTTP headers?).');
					assert.deepEqual(err.data?.axios, response);
					assert.strictEqual(rawRequestStub.callCount, 1);
				}
			});

			it('should throw an invalidjson MwbotError if response data is not a plain object', async function () {
				const reqOpts = createRequestOptions(mwbot, {
					method: 'GET',
					params: { action: 'query' },
				});
				const response = createAxiosResponse(reqOpts, '<html>MediaWiki</html>');
				const rawRequestStub = sinon.stub(mwbot, 'rawRequest').resolves(response);

				try {
					// @ts-expect-error - Protected property
					await mwbot._request(reqOpts);
					assert.fail('Expected _request() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidjson');
					assert.strictEqual(err.info, 'No valid JSON response (check the request URL?)');
					assert.deepEqual(err.data?.axios, response);
					assert.strictEqual(rawRequestStub.callCount, 1);
				}
			});

			it('should call showWarnings only on the first attempt and suppress it on subsequent retries', async function () {
				const reqOpts = createRequestOptions(mwbot, { params: { action: 'query' } });
				sinon.stub(mwbot, 'rawRequest').resolves(
					createAxiosResponse(reqOpts, {
						warnings: {
							query: {
								warnings: 'Warning!',
							},
						},
						query: { pages: [] },
					})
				);
				// @ts-expect-error - Protected method
				const showWarningsSpy = sinon.spy(mwbot, 'showWarnings');

				// First attempt (attemptCount = 0 internally becomes 1)
				// @ts-expect-error - Protected method
				await mwbot._request(reqOpts, 0);
				assert.isTrue(showWarningsSpy.calledOnce);

				showWarningsSpy.resetHistory();

				// @ts-expect-error - Protected method
				await mwbot._request(reqOpts, 1);
				assert.isFalse(showWarningsSpy.called);
			});

			it('should update lastRequestTime after a successful interval-controlled request', async function () {
				const clock = sinon.useFakeTimers();
				sinon.stub(mwbot, 'userMwbotOptions').value({
					apiUrl: 'http://localhost',
					interval: 2000,
					intervalActions: ['query'],
				});
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'query' },
				});
				sinon.stub(mwbot, 'rawRequest').resolves(createAxiosResponse(reqOpts));
				// @ts-expect-error - Protected property
				sinon.replace(mwbot, 'lastRequestTime', null);

				// @ts-expect-error - Protected method
				await mwbot._request(reqOpts);

				// @ts-expect-error - Protected method
				assert.strictEqual(mwbot.lastRequestTime, clock.Date.now());
			});
		});

		describe('API error handlers', function () {
			it('should invoke dieIfAnonymous if a missingparam error explicitly targets a token', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('missingparam', 'The token parameter must be set.')
				);
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'isAnonymous').returns(true);
				const reqOpts = createRequestOptions(mwbot, {
					method: 'POST',
					params: {
						action: 'edit',
						title: 'Sandbox',
						text: 'Foo',
					},
				});

				try {
					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);
					assert.fail('Expected a dieIfAnonymous rejection');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'anonymous');
				}
			});

			it('should immediately rethrow the API error without retrying if disableRetryAPI is set to true', async function () {
				// FIXME: This test may be brittle. disableRetryAPI is evaluated in an `if` block,
				// and there's no reliable way to detect whether the code reached that path.
				// For a `notoken` error, the code calls dieIfAnonymous() immediately below this
				// `if` block, so we pretend that the caller is anonymous and see if the code wrongly
				// reaches dieIfAnonymous(), in which case an `anonymous` error would be thrown instead.
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('notoken', 'No token.')
				);
				// @ts-expect-error - Protected method
				const retrySpy = sinon.spy(mwbot, 'retry');
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'isAnonymous').returns(true);
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'query' },
					disableRetryAPI: true,
				});

				try {
					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);
					assert.fail('Expected immediate error throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'notoken');
					assert.isFalse(retrySpy.called);
				}
			});

			it('should invoke retry with refreshToken configured when badtoken or notoken codes are encountered', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('badtoken', 'Bad token.')
				);
				const expectedResponse = { query: {} };
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
				const reqOpts = createRequestOptions(mwbot, { params: { action: 'query' } });

				// @ts-expect-error - Protected method
				const res = await mwbot._request(reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(retryStub.calledOnce);
				assert.deepInclude(retryStub.firstCall.args[5], { refreshToken: true });
			});

			it('should throw badtoken directly if action is unavailable', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('badtoken')
				);
				// @ts-expect-error - Protected method
				const retrySpy = sinon.spy(mwbot, 'retry');
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: undefined },
				});

				try {
					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);
					assert.fail('Expected rejection');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'badtoken');
					assert.isFalse(retrySpy.called);
				}
			});

			it('should trigger a retry with a maximum attempt constraint of 3 on readonly errors', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('readonly', 'Database locked.')
				);
				const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
				const reqOpts = createRequestOptions(mwbot, {
					method: 'POST',
					params: { action: 'edit' },
				});

				// @ts-expect-error - Protected method
				const res = await mwbot._request(reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(retryStub.calledOnce);
				assert.strictEqual(retryStub.firstCall.args[4], 3); // maxAttempts parameter
			});

			it('should not retry maxlag if disableRetry is true', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('maxlag')
				);
				// @ts-expect-error - Protected method
				const retrySpy = sinon.spy(mwbot, 'retry');
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'edit' },
					disableRetry: true,
				});

				try {
					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);
					assert.fail('Expected rejection');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'maxlag');
					assert.isFalse(retrySpy.called);
				}
			});

			it('should favour the bigger value between Retry-After header and lag value on maxlag errors', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('maxlag', 'Server is lagged.', {
						data: { error: { lag: 10 } },
						headers: { 'retry-after': '15' },
					})
				);
				const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
				const reqOpts = createRequestOptions(mwbot, {
					method: 'POST',
					params: { action: 'edit' },
				});

				// @ts-expect-error - Protected method
				const res = await mwbot._request(reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(retryStub.calledOnce);
				assert.deepInclude(retryStub.firstCall.args[5], { sleepSeconds: 15 });
			});

			it('should not retry maxlag errors when the lag exceeds maxLagLimit', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('maxlag', 'Server is lagged.', {
						data: { error: { lag: 20 } },
					})
				);
				const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
				const reqOpts = createRequestOptions(mwbot, {
					method: 'POST',
					params: { action: 'edit' },
					maxLagLimit: 10,
				});

				try {
					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);
					assert.fail('Expected _request() to reject');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'maxlag');
					assert.isFalse(retryStub.called);
				}
			});

			it('should fallback to 5 seconds if the Retry-After header is missing on maxlag errors', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('maxlag', 'Server is lagged.')
				);
				const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
				const reqOpts = createRequestOptions(mwbot, {
					method: 'POST',
					params: { action: 'edit' },
				});

				// @ts-expect-error - Protected method
				const res = await mwbot._request(reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(retryStub.calledOnce);
				assert.deepInclude(retryStub.firstCall.args[5], { sleepSeconds: 5 });
			});

			it('should not retry for assertuserfailed errors on anonymous authentication', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(createApiErrorResponse('assertuserfailed'));
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'isAnonymous').returns(true);
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry');
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'query' },
				});

				try {
					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);
					assert.fail('Expected _request() to reject');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'assertuserfailed');
					assert.isFalse(retryStub.called);
				}
			});

			it('should invoke retry with reLogIn and token refresh on assertion failures', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(createApiErrorResponse('assertuserfailed'));
				const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'edit', token: 'abc+\\' },
				});

				// @ts-expect-error - Protected method
				const res = await mwbot._request(reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(retryStub.calledOnce);
				assert.deepEqual(retryStub.firstCall.args[5], {
					sleepSeconds: 0,
					refreshToken: true,
					reLogIn: true,
				});
			});

			it('should retry assertuserfailed without token refresh when token is absent', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('assertuserfailed')
				);
				const expectedResponse = { query: {} };
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
				const reqOpts = createRequestOptions(mwbot, {
					params: {
						action: 'query',
					},
				});

				// @ts-expect-error - Protected method
				const res = await mwbot._request(reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(retryStub.calledOnce);
				assert.deepEqual(retryStub.firstCall.args[5], {
					sleepSeconds: 10,
					refreshToken: false,
					reLogIn: true,
				});
			});

			it('should retry mwoauth-invalid-authorization only if info contains "Nonce already used"', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('mwoauth-invalid-authorization', 'Nonce already used upstream.')
				);
				const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'edit', token: 'abc+\\' },
				});

				// @ts-expect-error - Protected method
				const res = await mwbot._request(reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(retryStub.calledOnce);
			});

			it('should not retry mwoauth-invalid-authorization when info does not mention nonce reuse', async function () {
				sinon.stub(mwbot, 'rawRequest').resolves(
					createApiErrorResponse('mwoauth-invalid-authorization', 'Invalid signature.' )
				);
				// @ts-expect-error - Protected method
				const retrySpy = sinon.spy(mwbot, 'retry');
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'query' },
				});

				try {
					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);
					assert.fail('Expected rejection');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'mwoauth-invalid-authorization');
					assert.isFalse(retrySpy.called);
				}
			});
		});

		describe('Network & HTTP 400+ errors', function () {
			it('should rethrow non-Axios errors from the request pipeline', async function () {
				const original = new Error('boom');
				sinon.stub(mwbot, 'rawRequest').rejects(original);
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'query' },
				});

				try {
					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);
					assert.fail('Expected _request() to reject');
				} catch (err) {
					assert.strictEqual(err, original);
				}
			});

			it('should re-code an ERR_CANCELED axios error into an "aborted" error', async function () {
				sinon.stub(mwbot, 'rawRequest').rejects(createAxiosError({ code: 'ERR_CANCELED' }));
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'query' },
				});

				try {
					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);
					assert.fail('Expected _request() to reject');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'aborted');
					assert.strictEqual(err.info, 'Request aborted by the user.');
					assert.isUndefined(err.data); // Confirms err.data deletion pathway
				}
			});

			it('should schedule a retry with sleepSeconds: 5 when ECONNABORTED is captured', async function () {
				sinon.stub(mwbot, 'rawRequest').rejects(createAxiosError({
					code: 'ECONNABORTED',
					message: 'ECONNABORTED error!',
				}));
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'query' },
				});
				const expectedResponse = { query: {} };
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);

				// @ts-expect-error - Protected method
				const res = await mwbot._request(reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(retryStub.calledOnce);

				const err = retryStub.firstCall.args[0];
				assert.instanceOf(err, MwbotError);
				assert.strictEqual(err.code, 'http');
				assert.strictEqual(err.info, 'ECONNABORTED error.');
				assert.deepEqual(retryStub.firstCall.args[5], { sleepSeconds: 5 });
			});

			it('should schedule a retry with sleepSeconds: 10 when ECONNRESET occurs to circumvent TCP drops', async function () {
				sinon.stub(mwbot, 'rawRequest').rejects(createAxiosError({
					code: 'ECONNRESET',
				}));
				const reqOpts = createRequestOptions(mwbot, {
					params: { action: 'query' },
				});
				const expectedResponse = { query: {} };
				// @ts-expect-error - Protected method
				const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);

				// @ts-expect-error - Protected method
				const res = await mwbot._request(reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(retryStub.calledOnce);

				const err = retryStub.firstCall.args[0];
				assert.instanceOf(err, MwbotError);
				assert.strictEqual(err.code, 'http');
				assert.strictEqual(err.info, 'HTTP request failed.');
				assert.deepEqual(retryStub.firstCall.args[5], { sleepSeconds: 10 });
			});

			const statusGen = [
				{
					status: 404,
					code: 'notfound',
					info: 'Page not found (404)',
					retryable: false,
				},
				{
					status: 408,
					code: 'timeout',
					info: 'Request timeout (408)',
					retryable: true,
				},
				{
					status: 414,
					code: 'baduri',
					info: 'URI too long (414)',
					retryable: false,
				},
				{
					status: 429,
					code: 'ratelimited',
					info: 'Too many requests (429)',
					retryable: true,
				},
				{
					status: 500,
					code: 'servererror',
					info: 'Internal server error (500)',
					retryable: true,
				},
				{
					status: 502,
					code: 'badgateway',
					info: 'Bad gateway (502)',
					retryable: true,
				},
				{
					status: 503,
					code: 'serviceunavailable',
					info: 'Service Unavailable (503)',
					retryable: true,
				},
				{
					status: 504,
					code: 'timeout',
					info: 'Gateway timeout (504)',
					retryable: true,
				},
				{
					status: 999, // Should be routed to `default: throw`
					code: 'http',
					info: 'HTTP request failed',
					alt: 'unhandled HTTP',
					retryable: false,
				},
				{
					status: undefined,
					code: 'http',
					info: 'HTTP request failed',
					alt: 'no status',
					retryable: false,
				},
			];

			for (const { status, code, info, alt, retryable } of statusGen) {
				if (retryable) {
					it(`should properly map ${alt ?? info} errors to ${code} and make at most 3 attempts`, async function () {
						sinon.stub(mwbot, 'rawRequest').rejects(createAxiosError({
							status: status,
						}));
						const reqOpts = createRequestOptions(mwbot, {
							params: { action: 'query' },
						});
						const expectedResponse = { query: {} };
						// @ts-expect-error - Protected method
						const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);

						// @ts-expect-error - Protected method
						const res = await mwbot._request(reqOpts);

						assert.deepEqual(res, expectedResponse);
						assert.isTrue(retryStub.calledOnce);

						const err = retryStub.firstCall.args[0];
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, code);
						assert.include(err.info, info);
						assert.strictEqual(retryStub.firstCall.args[4], 3); // maxAttempts
					});
				} else {
					it(`should immediately throw without retrying on ${alt ?? info} exceptions`, async function () {
						sinon.stub(mwbot, 'rawRequest').rejects(createAxiosError({
							status: status,
						}));
						// @ts-expect-error - Protected method
						const retrySpy = sinon.spy(mwbot, 'retry');
						const reqOpts = createRequestOptions(mwbot, {
							params: { action: 'query' },
						});

						try {
							// @ts-expect-error - Protected method
							await mwbot._request(reqOpts);
							assert.fail('Expected _request() to reject');
						} catch (err) {
							assert.instanceOf(err, MwbotError);
							assert.strictEqual(err.code, code);
							assert.include(err.info, info);
							assert.isFalse(retrySpy.called);
						}
					});
				}
			}
		});
	});

	describe('showWarnings()', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		/** @type {sinon.SinonSpy} */
		let warnSpy;

		beforeEach(function () {
			warnSpy = sinon.spy(Logger.prototype, 'warn');
		});

		afterEach(function () {
			sinon.restore();
		});

		it('should do nothing when warnings is undefined', function () {
			// @ts-expect-error - Protected method
			mwbot.showWarnings(undefined);

			assert.isFalse(warnSpy.called);
		});

		it('should log warnings in the new format using "*" messages', function () {
			// @ts-expect-error - Protected method
			mwbot.showWarnings([
				{
					code: 'foo',
					module: 'query',
					data: { values: [] },
					'*': 'warning message',
				},
			]);

			assert.isTrue(warnSpy.calledOnceWithExactly('query: warning message'));
		});

		it('should prefer html over text when "*" is absent', function () {
			// @ts-expect-error - Protected method
			mwbot.showWarnings([
				{
					code: 'foo',
					module: 'query',
					data: { values: [] },
					html: '<b>warning</b>',
					text: 'warning',
				},
			]);

			assert.isTrue(warnSpy.calledOnceWithExactly('query: <b>warning</b>'));
		});

		it('should use text when neither "*" nor html is present', function () {
			// @ts-expect-error - Protected method
			mwbot.showWarnings([
				{
					code: 'foo',
					module: 'query',
					data: { values: [] },
					text: 'warning',
				},
			]);

			assert.isTrue(warnSpy.calledOnceWithExactly('query: warning'));
		});

		it('should ignore new-format warnings without a displayable message', function () {
			// @ts-expect-error - Protected method
			mwbot.showWarnings([
				{
					code: 'foo',
					module: 'query',
					data: { values: [] },
					key: 'foo',
					params: [],
				},
			]);

			assert.isFalse(warnSpy.called);
		});

		it('should log legacy warnings using "*"', function () {
			// @ts-expect-error - Protected method
			mwbot.showWarnings({
				query: {
					'*': 'legacy warning',
				},
			});

			assert.isTrue(warnSpy.calledOnceWithExactly('query: legacy warning'));
		});

		it('should log legacy warnings using warnings', function () {
			// @ts-expect-error - Protected method
			mwbot.showWarnings({
				query: {
					warnings: 'legacy warning',
				},
			});

			assert.isTrue(warnSpy.calledOnceWithExactly('query: legacy warning'));
		});

		it('should ignore legacy warnings without a displayable message', function () {
			// @ts-expect-error - Protected method
			mwbot.showWarnings({
				query: /** @type {any} */ ({}),
			});

			assert.isFalse(warnSpy.called);
		});
	});

	describe('canRetry()', function () {
		// @ts-expect-error - Protected method
		const canRetry = Mwbot.canRetry.bind(Mwbot);

		it('should allow retries when under the attempt limit and retrying is enabled', function () {
			assert.isTrue(
				canRetry(createMwbotError('maxlag'), 1, { disableRetry: false }, 3)
			);
		});

		it('should deny retries when the maximum attempt count has been reached', function () {
			assert.isFalse(
				canRetry(createMwbotError('maxlag'), 3, { disableRetry: false }, 3)
			);
		});

		it('should deny retries when disableRetry is true', function () {
			assert.isFalse(
				canRetry(createMwbotError('maxlag'), 1, { disableRetry: true }, 3)
			);
		});

		it('should deny retries when the error code is listed in disableRetryByCode', function () {
			assert.isFalse(
				canRetry(createMwbotError('maxlag'), 1, { disableRetryByCode: ['maxlag'] }, 3)
			);
		});

		it('should allow retries when disableRetryByCode does not contain the error code', function () {
			assert.isTrue(
				canRetry(createMwbotError('maxlag'), 1, { disableRetryByCode: ['badtoken'] }, 3)
			);
		});

		it('should allow retries when disableRetryByCode is empty', function () {
			assert.isTrue(
				canRetry(createMwbotError('maxlag'), 1, { disableRetryByCode: [] }, 3)
			);
		});

		it('should allow retries when disableRetryByCode is undefined', function () {
			assert.isTrue(
				canRetry(createMwbotError('maxlag'), 1, {}, 3)
			);
		});

		it('should deny retries when maxAttempts is zero', function () {
			assert.isFalse(
				canRetry(createMwbotError('maxlag'), 0, {}, 0)
			);
		});
	});

	describe('retry()', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named'); // botpassword authentication
		});

		/** @type {sinon.SinonSpy} */
		let warnSpy;
		/** @type {sinon.SinonSpy} */
		let errorSpy;

		beforeEach(function () {
			warnSpy = sinon.spy(Logger.prototype, 'warn');
			errorSpy = sinon.spy(Logger.prototype, 'error');
		});

		afterEach(function () {
			sinon.restore();
		});

		/**
		 * @param {import('../../dist/index.js').ApiParams} [merge]
		 * @returns {import('../../dist/index.js').ApiParams}
		 */
		const createParams = (merge) => {
			const base = { action: /** @type {const} */ ('query') };
			return merge ? Mwbot.Util.mergeDeep(base, merge) : base;
		};

		it('should immediately throw the original error when canRetry() returns false', async function () {
			// @ts-expect-error - Protected method
			sinon.stub(Mwbot, 'canRetry').returns(false);
			const error = createMwbotError();
			const params = createParams();

			try {
				// @ts-expect-error - Protected method
				await mwbot.retry(
					error, 1, params, createRequestOptions(mwbot, { params }), 2
				);
				assert.fail('Expected retry() to throw');
			} catch (err) {
				assert.strictEqual(err, error);

				assert.isFalse(errorSpy.called);
				assert.isFalse(warnSpy.called);
			}
		});

		it('should apply 10-second delay by default before performing a retry', async function () {
			const clock = sinon.useFakeTimers();
			const expectedResponse = { query: {} };
			// @ts-expect-error - Protected method
			const requestStub = sinon.stub(mwbot, '_request').resolves(expectedResponse);

			// @ts-expect-error - Protected method
			const promise = mwbot.retry(
				createMwbotError(), 1, createParams(), createRequestOptions(mwbot), 2
			);

			assert.isTrue(errorSpy.calledOnce);
			assert.isTrue(warnSpy.calledOnce);
			assert.isTrue(errorSpy.calledBefore(warnSpy));

			await Promise.resolve();
			await clock.tickAsync(9000);

			assert.isFalse(requestStub.calledOnce);

			await clock.tickAsync(1000);

			assert.isTrue(requestStub.calledOnce);

			const res = await promise;

			assert.deepEqual(res, expectedResponse);
		});

		it('should immediately invoke _request when sleepSeconds is 0', async function () {
			const expectedResponse = { query: {} };
			// @ts-expect-error - Protected method
			const requestStub = sinon.stub(mwbot, '_request').resolves(expectedResponse);

			// @ts-expect-error - Protected method
			const promise = mwbot.retry(
				createMwbotError(), 1, createParams(), createRequestOptions(mwbot), 2, { sleepSeconds: 0 }
			);

			assert.isTrue(errorSpy.calledOnce);
			assert.isTrue(warnSpy.calledOnce);
			assert.isTrue(errorSpy.calledBefore(warnSpy));

			// _request() should be reached synchronously without waiting
			assert.isTrue(requestStub.calledOnce);

			const res = await promise;

			assert.deepEqual(res, expectedResponse);
		});

		it('should invoke login before retrying when reLogIn is true', async function () {
			const loginStub = sinon.stub(mwbot, 'login').resolves();
			const expectedResponse = { query: {} };
			// @ts-expect-error - Protected method
			const requestStub = sinon.stub(mwbot, '_request').resolves(expectedResponse);

			// @ts-expect-error - Protected method
			const res = await mwbot.retry(
				createMwbotError(), 1, createParams(), createRequestOptions(mwbot), 2, {
					sleepSeconds: 0,
					reLogIn: true,
				}
			);

			assert.deepEqual(res, expectedResponse);
			assert.isTrue(loginStub.calledOnce);
			assert.isTrue(requestStub.calledOnce);
			assert.isTrue(loginStub.calledBefore(requestStub));

			assert.isTrue(errorSpy.calledOnce);
			assert.isTrue(warnSpy.calledOnce);
			assert.isTrue(errorSpy.calledBefore(warnSpy));
			assert.isTrue(warnSpy.calledBefore(loginStub));
		});

		it('should rethrow the original error if login fails', async function () {
			const error = createMwbotError();
			sinon.stub(mwbot, 'login').rejects(new Error('login failed'));

			try {
				// @ts-expect-error - Protected method
				await mwbot.retry(error, 1, createParams(), createRequestOptions(mwbot), 2, {
					sleepSeconds: 0,
					reLogIn: true,
				});
				assert.fail('Expected retry() to throw');
			} catch (err) {
				assert.strictEqual(err, error);
			}
		});

		it('should re-inject params into requestOptions before retrying', async function () {
			const params = createParams();
			const requestOptions = createRequestOptions(mwbot);
			delete requestOptions.params;
			// @ts-expect-error - Protected method
			const requestStub = sinon.stub(mwbot, '_request').resolves({ query: {} });

			// @ts-expect-error - Protected method
			await mwbot.retry(createMwbotError(), 1, params, requestOptions, 2, { sleepSeconds: 0 });

			assert.strictEqual(requestOptions.params, params);
			assert.strictEqual(requestStub.firstCall.args[0].params, params);
		});

		it('should skip token refresh when refreshToken is false', async function () {
			const params = createParams({
				action: 'edit',
				token: 'oldToken',
			});
			const requestOptions = createRequestOptions(mwbot, {
				method: 'POST',
			});
			// @ts-expect-error - Protected method
			const getTokenTypeSpy = sinon.spy(mwbot, 'getTokenType');
			const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
			// @ts-expect-error - Protected method
			sinon.stub(mwbot, '_request').resolves(expectedResponse);

			// @ts-expect-error - Protected method
			const res = await mwbot.retry(
				createMwbotError(), 1, params, requestOptions, 3, { sleepSeconds: 0, refreshToken: false }
			);

			assert.isFalse(getTokenTypeSpy.called);
			assert.deepEqual(res, expectedResponse);
		});

		it('should throw the original error when refreshToken is requested for a non-POST request', async function () {
			const error = createMwbotError();

			try {
				// @ts-expect-error - Protected method
				await mwbot.retry(
					error,
					1,
					createParams({ action: 'edit' }),
					createRequestOptions(mwbot, {
						method: 'GET',
					}),
					2,
					{
						sleepSeconds: 0,
						refreshToken: true,
					}
				);
				assert.fail('Expected retry() to throw');
			} catch (err) {
				assert.strictEqual(err, error);
			}
		});

		it('should throw the original error when refreshToken is requested without a valid action', async function () {
			const error = createMwbotError();

			try {
				// @ts-expect-error - Protected method
				await mwbot.retry(
					error,
					1,
					{ action: undefined },
					createRequestOptions(mwbot, {
						method: 'POST',
					}),
					2,
					{
						sleepSeconds: 0,
						refreshToken: true,
					}
				);
				assert.fail('Expected retry() to throw');
			} catch (err) {
				assert.strictEqual(err, error);
			}
		});

		it('should throw the original error when getTokenType() returns null', async function () {
			const error = createMwbotError();

			// @ts-expect-error - Protected method
			sinon.stub(mwbot, 'getTokenType').returns(null);

			try {
				// @ts-expect-error - Protected method
				await mwbot.retry(
					error,
					1,
					createParams({ action: 'edit' }),
					createRequestOptions(mwbot, {
						method: 'POST',
					}),
					2,
					{
						sleepSeconds: 0,
						refreshToken: true,
					}
				);
				assert.fail('Expected retry() to throw');
			} catch (err) {
				assert.strictEqual(err, error);
			}
		});

		it('should rethrow the original error when getToken() fails', async function () {
			const error = createMwbotError();
			// @ts-expect-error - Protected method
			sinon.stub(mwbot, 'getTokenType').returns('csrf');
			sinon.stub(mwbot, 'getToken').rejects(new Error('failed'));

			try {
				// @ts-expect-error - Protected method
				await mwbot.retry(
					error,
					1,
					createParams({ action: 'edit' }),
					createRequestOptions(mwbot, {
						method: 'POST',
					}),
					2,
					{
						sleepSeconds: 0,
						refreshToken: true,
					}
				);
				assert.fail('Expected retry() to throw');
			} catch (err) {
				assert.strictEqual(err, error);
			}
		});

		it('should refresh the token when getToken() succeeds', async function () {
			const params = createParams({
				action: 'edit',
				token: 'oldToken',
			});
			const requestOptions = createRequestOptions(mwbot, {
				method: 'POST',
			});
			// @ts-expect-error - Protected method
			const getTokenTypeStub = sinon.stub(mwbot, 'getTokenType').returns('csrf');
			const badTokenStub = sinon.stub(mwbot, 'badToken');
			const getTokenStub = sinon.stub(mwbot, 'getToken').resolves('newToken');
			const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
			// @ts-expect-error - Protected method
			const requestStub = sinon.stub(mwbot, '_request').resolves(expectedResponse);

			// @ts-expect-error - Protected method
			const res = await mwbot.retry(createMwbotError(), 1, params, requestOptions, 2, {
				sleepSeconds: 0,
				refreshToken: true,
			});

			assert.deepEqual(res, expectedResponse);
			assert.strictEqual(params.token, 'newToken');

			assert.isTrue(
				// Expression produces a union type that is too complex to represent. ts(2590)
				/** @type {any} */(getTokenTypeStub.calledOnceWithExactly)('edit')
			);
			assert.isTrue(badTokenStub.calledOnceWithExactly('csrf'));
			assert.isTrue(getTokenStub.calledOnceWithExactly('csrf'));

			assert.isTrue(getTokenTypeStub.calledBefore(getTokenStub));
			assert.isTrue(getTokenStub.calledBefore(requestStub));
		});
	});

	describe('Request helpers', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named'); // botpassword authentication
		});

		afterEach(function () {
			sinon.restore();
		});

		describe('abort()', function () {
			it('should invoke AbortController.abort() and clear existing controllers', function () {
				const abortControllerSpy = sinon.spy(AbortController.prototype, 'abort');
				const clearSpy = sinon.spy(Set.prototype, 'clear');
				// @ts-expect-error - Protected property
				sinon.stub(mwbot, 'abortions').value(new Set([new AbortController()]));

				mwbot.abort();

				assert.isTrue(abortControllerSpy.called);
				assert.isTrue(clearSpy.calledOnce);
				assert.isTrue(clearSpy.calledImmediatelyAfter(abortControllerSpy));
				// @ts-expect-error - Protected property
				assert.isEmpty(mwbot.abortions);
			});
		});

		describe('get()', function () {
			it('should enforce GET', async function () {
				const params = { action: /** @type {const} */ ('query') };
				const reqOpts = { method: 'POST' };
				const expectedResponse = { query: {} };
				const requestStub = sinon.stub(mwbot, 'request').resolves(expectedResponse);
				// @ts-expect-error - Protected method
				const unrefSpy = sinon.spy(Mwbot, 'unrefRequestOptions');

				const res = await Mwbot.prototype.get.call(mwbot, params, reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(unrefSpy.calledOnce);
				assert.isTrue(requestStub.calledOnce);
				assert.strictEqual(requestStub.firstCall.args[0], params);
				assert.notStrictEqual(requestStub.firstCall.args[1], reqOpts);
				assert.strictEqual(requestStub.firstCall.args[1]?.method, 'GET');
				assert.strictEqual(reqOpts.method, 'POST');
			});
		});

		describe('post()', function () {
			it('should enforce POST', async function () {
				const params = { action: /** @type {const} */ ('query') };
				const reqOpts = { method: 'GET' };
				const expectedResponse = { query: {} };
				const requestStub = sinon.stub(mwbot, 'request').resolves(expectedResponse);
				// @ts-expect-error - Protected method
				const unrefSpy = sinon.spy(Mwbot, 'unrefRequestOptions');

				const res = await mwbot.post(params, reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(unrefSpy.calledOnce);
				assert.isTrue(requestStub.calledOnce);
				assert.strictEqual(requestStub.firstCall.args[0], params);
				assert.notStrictEqual(requestStub.firstCall.args[1], reqOpts);
				assert.strictEqual(requestStub.firstCall.args[1]?.method, 'POST');
				assert.strictEqual(reqOpts.method, 'GET');
			});
		});

		describe('nonwritePost()', function () {
			it('should enforce POST with a Promise-Non-Write-API-Action header', async function () {
				const params = { action: /** @type {const} */ ('query') };
				const reqOpts = { method: 'GET' };
				const expectedResponse = { query: {} };
				const requestStub = sinon.stub(mwbot, 'request').resolves(expectedResponse);
				// @ts-expect-error - Protected method
				const unrefSpy = sinon.spy(Mwbot, 'unrefRequestOptions');

				const res = await mwbot.nonwritePost(params, reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(unrefSpy.calledOnce);
				assert.isTrue(requestStub.calledOnce);
				assert.strictEqual(requestStub.firstCall.args[0], params);
				assert.notStrictEqual(requestStub.firstCall.args[1], reqOpts);
				assert.strictEqual(requestStub.firstCall.args[1]?.method, 'POST');
				assert.strictEqual(reqOpts.method, 'GET');
				assert.strictEqual(
					requestStub.firstCall.args[1]?.headers?.['Promise-Non-Write-API-Action'],
					'1'
				);
			});
		});

		describe('fetch()', function () {
			it('should enforce GET and enable autoMethod', async function () {
				const params = {
					action: /** @type {const} */ ('query'),
					list: 'blocks',
					bkusers: 'a'.repeat(2100),
				};
				const reqOpts = { method: 'POST' };
				const expectedResponse = { query: { blocks: [] } };
				const requestStub = sinon.stub(mwbot, 'request').resolves(expectedResponse);
				// @ts-expect-error - Protected method
				const unrefSpy = sinon.spy(Mwbot, 'unrefRequestOptions');

				const res = await mwbot.fetch(params, reqOpts);

				assert.deepEqual(res, expectedResponse);
				assert.isTrue(unrefSpy.calledOnce);
				assert.isTrue(requestStub.calledOnce);

				assert.strictEqual(requestStub.firstCall.args[0], params);
				assert.notStrictEqual(requestStub.firstCall.args[1], reqOpts);
				assert.strictEqual(requestStub.firstCall.args[1]?.method, 'GET');
				assert.isTrue(requestStub.firstCall.args[1]?.autoMethod);

				assert.strictEqual(reqOpts.method, 'POST');
			});
		});
	});
});