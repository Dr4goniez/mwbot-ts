import { describe, it } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MwbotError, MWBOT_VERSION } from '../../dist/index.js';
import OAuth from 'oauth-1.0a';
import { getMwbotInitOptionsBase, TestMwbotFactory } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

describe('Mwbot', function() {

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

});