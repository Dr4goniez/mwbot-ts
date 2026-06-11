import { describe, it } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MwbotError } from '../../dist/index.js';
import OAuth from 'oauth-1.0a';

describe('Mwbot', function() {

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

});