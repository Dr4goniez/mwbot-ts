import { describe, it } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MwbotError } from '../../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';

export function testMwbotExceptions() {
	describe('Exception methods', function () {
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
}
