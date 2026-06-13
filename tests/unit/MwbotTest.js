import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MwbotError, MWBOT_VERSION } from '../../dist/index.js';
import OAuth from 'oauth-1.0a';
import { getMwbotInitOptionsBase, getTestMwbot, TestMwbotFactory } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

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
			const clock = sinon.useFakeTimers();
			const warnSpy = sinon.spy(console, 'warn');

			try {
				const TestMwbot = TestMwbotFactory('empty');
				const mwbotInitOptions = getMwbotInitOptionsBase('named');
				const promise = TestMwbot.init(mwbotInitOptions);
				await Promise.resolve();
				await clock.tickAsync(5000);
				const mwbot = await promise;

				// @ts-expect-error - Protected constructor
				assert.instanceOf(mwbot, TestMwbot);
				assert.strictEqual(warnSpy.callCount, 1);
				assert.match(
					warnSpy.firstCall.args[0],
					/Mwbot\.init failed\. Retrying in 5 seconds/
				);
			} finally {
				warnSpy.restore();
				clock.restore();
			}
		});

		it('should throw an error when the retry also receives an empty response', async function () {
			const clock = sinon.useFakeTimers();
			const warnSpy = sinon.spy(console, 'warn');

			const TestMwbot = TestMwbotFactory('empty', Infinity);
			const mwbotInitOptions = getMwbotInitOptionsBase('named');
			const promise = TestMwbot.init(mwbotInitOptions).catch(eer => eer);
			await Promise.resolve();
			await clock.tickAsync(5000);

			const err = await promise;

			assert.instanceOf(err, MwbotError);
			assert.strictEqual(err.code, 'empty');
			assert.strictEqual(warnSpy.callCount, 1);

			warnSpy.restore();
			clock.restore();
		});

		it('should retry once when userinfo.id is 0 for authenticated users', async function () {
			const clock = sinon.useFakeTimers();

			try {
				const TestMwbot = TestMwbotFactory('userId');
				const mwbotInitOptions = getMwbotInitOptionsBase('named');
				const promise = TestMwbot.init(mwbotInitOptions);
				await Promise.resolve();
				await clock.tickAsync(5000);
				const mwbot = await promise;

				// @ts-expect-error - Protected constructor
				assert.instanceOf(mwbot, TestMwbot);
			} finally {
				clock.restore();
			}
		});

		it('should throw badauth when userinfo.id remains 0 after a retry', async function () {
			const clock = sinon.useFakeTimers();
			const warnSpy = sinon.spy(console, 'warn');

			const TestMwbot = TestMwbotFactory('userId', Infinity);
			const mwbotInitOptions = getMwbotInitOptionsBase('named');
			const promise = TestMwbot.init(mwbotInitOptions).catch(eer => eer);
			await Promise.resolve();
			await clock.tickAsync(5000);

			const err = await promise;

			assert.instanceOf(err, MwbotError);
			assert.strictEqual(err.code, 'badauth');
			assert.strictEqual(warnSpy.callCount, 1);

			warnSpy.restore();
			clock.restore();
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
			const clock = sinon.useFakeTimers();
			const warnSpy = sinon.spy(console, 'warn');

			try {
				const TestMwbot = TestMwbotFactory('articlepath');
				const mwbotInitOptions = getMwbotInitOptionsBase('named');
				const promise = TestMwbot.init(mwbotInitOptions);
				await Promise.resolve();
				await clock.tickAsync(5000);
				const mwbot = await promise;

				// @ts-expect-error - Protected constructor
				assert.instanceOf(mwbot, TestMwbot);
				assert.strictEqual(warnSpy.callCount, 1);
				assert.match(
					warnSpy.firstCall.args[0],
					/Mwbot\.init failed\. Retrying in 5 seconds/
				);
			} finally {
				warnSpy.restore();
				clock.restore();
			}
		});

		it('should throw badvars when initConfigData still returns failed keys after a retry', async function () {
			const clock = sinon.useFakeTimers();
			const warnSpy = sinon.spy(console, 'warn');

			const TestMwbot = TestMwbotFactory('articlepath', Infinity);
			const mwbotInitOptions = getMwbotInitOptionsBase('named');
			const promise = TestMwbot.init(mwbotInitOptions).catch(eer => eer);
			await Promise.resolve();
			await clock.tickAsync(5000);

			const err = await promise;

			assert.instanceOf(err, MwbotError);
			assert.strictEqual(err.code, 'badvars');
			assert.isArray(err.data?.keys);
			assert.include(err.data?.keys ?? [], 'wgArticlePath');
			assert.strictEqual(warnSpy.callCount, 1);

			warnSpy.restore();
			clock.restore();
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
				const warnSpy = sinon.spy(console, 'warn');

				assert.isFalse(config.set('wgSiteName', 'Foo'));
				assert.strictEqual(config.get('wgSiteName'), original);
				assert.strictEqual(warnSpy.callCount, 1);

				warnSpy.restore();
			});

			it('should not overwrite built-in wg variables in object form', function () {
				const key = testKey();
				const original = config.get('wgSiteName');
				const warnSpy = sinon.spy(console, 'warn');

				assert.isTrue(
					config.set({
						[key]: 'value',
						wgSiteName: 'Foo',
					})
				);

				assert.strictEqual(config.get(key), 'value');
				assert.strictEqual(config.get('wgSiteName'), original);
				assert.strictEqual(warnSpy.callCount, 1);

				warnSpy.restore();
			});

			it('should return false when all object entries are rejected', function () {
				const warnSpy = sinon.spy(console, 'warn');

				assert.isFalse(
					config.set({
						wgSiteName: 'Foo',
						wgVersion: '999999.0.0',
					})
				);
				assert.strictEqual(warnSpy.callCount, 1);

				warnSpy.restore();
			});

			it('should return false for an empty object', function () {
				assert.isFalse(config.set({}));
			});

		});
	});

});