import { describe, it } from 'mocha';
import { assert } from 'chai';
import { MwbotError } from '../../dist/index.js';

describe('MwbotError', function () {

	describe('Constructor', function () {
		it('should create an instance with correct properties', function () {
			const error = new MwbotError('api_mwbot', {
				code: 'invalidformat',
				info: 'Not valid format',
			});

			assert.instanceOf(error, Error);
			assert.instanceOf(error, MwbotError);
			assert.strictEqual(error.name, 'MwbotError');
			assert.strictEqual(error.type, 'api_mwbot');
			assert.strictEqual(error.code, 'invalidformat');
			assert.strictEqual(error.info, 'Not valid format');
			assert.strictEqual(error.message, 'Not valid format');
			assert.notExists(error.data);
		});

		it('should throw TypeError if config is not a plain object', function () {
			assert.throws(
				// @ts-expect-error - Testing runtime validation
				() => new MwbotError('api_mwbot', 'invalid config string'),
				TypeError,
				'MwbotError.constructor only accepts a plain object.'
			);
		});

		it('should directly assign the data object if provided', function () {
			const additionalData = { title: 'Main Page' };
			const error = new MwbotError(
				'api_mwbot',
				{ code: 'pagemissing', info: 'Missing' },
				additionalData
			);

			assert.deepEqual(error.data, additionalData);
			assert.strictEqual(error.data?.title, 'Main Page');
		});

		it('should capture stack trace', function () {
			const error = new MwbotError('fatal', { code: 'internal', info: 'Fatal Error' });

			assert.isString(error.stack);
		});
	});

	describe('Static newFromResponse()', function () {
		it('should create an instance from a single error response (response.error)', function () {
			const response = {
				error: { code: 'badtoken', info: 'The token is invalid', generic_param: 'value' },
			};
			const error = MwbotError.newFromResponse(response);

			assert.strictEqual(error.type, 'api');
			assert.strictEqual(error.code, 'badtoken');
			assert.strictEqual(error.info, 'The token is invalid');
			assert.strictEqual(error.message, 'The token is invalid');
			assert.deepEqual(error.data?.response, response);
			assert.deepEqual(error.data?.error, response.error); // Fallback to a deprecated property
		});

		describe('Multi-error array responses (response.errors)', function () {
			it('should extract info from "*" property (formatversion=1)', function () {
				const response = {
					errors: [{ code: 'code1', module: 'main', '*': 'Error text from asterisk' }],
				};
				const error = MwbotError.newFromResponse(response);

				assert.strictEqual(error.code, 'code1');
				assert.strictEqual(error.info, 'Error text from asterisk');
				assert.strictEqual(error.message, 'Error text from asterisk');
			});

			it('should extract info from "text" property with higher priority than html', function () {
				const response = {
					errors: [{ code: 'code1', module: 'main', text: 'Plain text error', html: '<b>HTML Error</b>' }],
				};
				const error = MwbotError.newFromResponse(response);

				assert.strictEqual(error.code, 'code1');
				assert.strictEqual(error.info, 'Plain text error');
				assert.strictEqual(error.message, 'Plain text error');
			});

			it('should extract info from "html" property if text is missing', function () {
				const response = {
					errors: [{ code: 'code1', module: 'main', html: '<b>HTML Error</b>' }],
				};
				const error = MwbotError.newFromResponse(response);

				assert.strictEqual(error.code, 'code1');
				assert.strictEqual(error.info, '<b>HTML Error</b>');
				assert.strictEqual(error.message, '<b>HTML Error</b>');
			});

			it('should extract info from "key" property if higher priority fields are missing', function () {
				const response = {
					errors: [{ code: 'code1', module: 'main', key: 'error_key_code', params: ['foo', 'bar'] }],
				};
				const error = MwbotError.newFromResponse(response);

				assert.strictEqual(error.code, 'code1');
				assert.strictEqual(error.info, 'error_key_code');
				assert.strictEqual(error.message, 'error_key_code');
			});

			it('should fallback to "Unknown error." if errors array is empty', function () {
				const response = {
					errors: [],
				};
				const error = MwbotError.newFromResponse(response);

				assert.strictEqual(error.code, 'unknownerror-nocode');
				assert.strictEqual(error.info, 'Unknown error.');
				assert.strictEqual(error.message, 'Unknown error.');
			});

			it('should fallback to "Unknown error." if errors property is missing or null', function () {
				const response = {
					errors: null,
				};
				// @ts-expect-error - Testing malformed API response
				const error = MwbotError.newFromResponse(response);

				assert.strictEqual(error.code, 'unknownerror-nocode');
				assert.strictEqual(error.info, 'Unknown error.');
				assert.strictEqual(error.message, 'Unknown error.');
			});

			it('should merge all properties of the first error into data.error', function () {
				const response = {
					errors: [{ code: 'custom_code', module: 'main', text: 'Some message', extra_info: 'meta' }],
				};
				const error = MwbotError.newFromResponse(response);

				assert.deepEqual(error.data?.response, response);
				assert.strictEqual(error.data?.error?.code, 'custom_code');
				assert.strictEqual(error.data?.error?.module, 'main');
				assert.strictEqual(error.data?.error?.text, 'Some message');
				assert.strictEqual(error.data?.error?.extra_info, 'meta');

				assert.strictEqual(error.data?.error?.info, 'Some message');
			});
		});
	});

	describe('Chaining Methods', function () {
		it('should update code and allow chaining via setCode()', function () {
			const error = new MwbotError('api_mwbot', { code: 'http', info: 'Error' });
			const chained = error.setCode('timeout');

			assert.strictEqual(error.code, 'timeout');
			assert.strictEqual(chained, error);
		});

		it('should update info and allow chaining via setInfo()', function () {
			const error = new MwbotError('api_mwbot', { code: 'http', info: 'Old Error' });
			const chained = error.setInfo('New Error Description');

			assert.strictEqual(error.info, 'New Error Description');
			assert.strictEqual(error.message, 'New Error Description');
			assert.strictEqual(chained, error);
		});
	});

	describe('_clone', function () {
		it('should create a new instance with identical properties', function () {
			const error = new MwbotError(
				'api_mwbot',
				{ code: 'http', info: 'Error' },
				{ title: 'Foo' }
			);
			const cloned = error._clone();

			assert.notStrictEqual(cloned, error);
			assert.strictEqual(cloned.name, error.name);
			assert.strictEqual(cloned.type, error.type);
			assert.strictEqual(cloned.code, error.code);
			assert.strictEqual(cloned.info, error.info);
			assert.strictEqual(cloned.message, error.message);
			assert.strictEqual(cloned.stack, error.stack);
		});

		it('should deep-clone the data property', function () {
			const error = new MwbotError(
				'api_mwbot',
				{ code: 'http', info: 'Error' },
				{
					title: 'Foo',
					modified: {
						0: {
							bar: 'baz',
						},
					},
				}
			);
			const cloned = error._clone();

			assert.deepStrictEqual(cloned.data, error.data);
			assert.notStrictEqual(cloned.data, error.data);
			assert.notStrictEqual(
				(cloned.data ?? {}).modified,
				(error.data ?? {}).modified
			);

			/**
			 * @param {MwbotError} e
			 * @returns {{ bar: string }}
			 */
			const getModifiedZero = (e) => (
				/** @type {{ bar: string }} */ (e.data && e.data.modified && e.data.modified[0])
			);

			getModifiedZero(cloned).bar = 'qux';
			assert.strictEqual(getModifiedZero(error).bar, 'baz');
		});

		it('should preserve the prototype chain', function () {
			const error = new MwbotError(
				'api_mwbot',
				{ code: 'http', info: 'Error' }
			);

			const cloned = error._clone();

			assert.instanceOf(cloned, Error);
			assert.instanceOf(cloned, MwbotError);
		});

		it('should clone an instance without data', function () {
			const error = new MwbotError(
				'api_mwbot',
				{ code: 'http', info: 'Error' }
			);

			const cloned = error._clone();

			assert.strictEqual(cloned.data, undefined);
		});
	});

});