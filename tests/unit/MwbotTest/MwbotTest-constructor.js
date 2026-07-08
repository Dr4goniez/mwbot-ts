import { describe, it, afterEach, beforeEach } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MwbotError } from '../../../dist/index.js';
import { Logger } from '../../../dist/build/internal/Logger.js';
import OAuth from 'oauth-1.0a';
import { getMwbotInitOptionsBase, TestMwbotFactory } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotConstructor() {
	describe('Constructor-related methods', function () {
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

				sinon.assert.calledOnce(errorSpy);
				sinon.assert.calledOnce(warnSpy);
				sinon.assert.calledOnce(infoSpy);
				sinon.assert.callOrder(errorSpy, warnSpy, infoSpy);
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

				sinon.assert.calledOnce(errorSpy);
				sinon.assert.calledOnce(warnSpy);
				sinon.assert.notCalled(infoSpy);
				sinon.assert.callOrder(errorSpy, warnSpy);
			});

			it('should retry once when userinfo.id is 0 for authenticated users', async function () {
				const TestMwbot = TestMwbotFactory('userId');
				const mwbotInitOptions = getMwbotInitOptionsBase('named');
				const promise = TestMwbot.init(mwbotInitOptions);

				await Promise.resolve();
				await clock.tickAsync(5000);

				const mwbot = await promise;

				assert.instanceOf(mwbot, TestMwbot);

				sinon.assert.calledOnce(errorSpy);
				sinon.assert.calledOnce(warnSpy);
				sinon.assert.calledOnce(infoSpy);
				sinon.assert.callOrder(errorSpy, warnSpy, infoSpy);
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

				sinon.assert.calledOnce(errorSpy);
				sinon.assert.calledOnce(warnSpy);
				sinon.assert.notCalled(infoSpy);
				sinon.assert.callOrder(errorSpy, warnSpy);
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

				sinon.assert.calledOnce(errorSpy);
				sinon.assert.calledOnce(warnSpy);
				sinon.assert.calledOnce(infoSpy);
				sinon.assert.callOrder(errorSpy, warnSpy, infoSpy);
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

				sinon.assert.calledOnce(errorSpy);
				sinon.assert.calledOnce(warnSpy);
				sinon.assert.notCalled(infoSpy);
				sinon.assert.callOrder(errorSpy, warnSpy);
			});
		});
	});
}