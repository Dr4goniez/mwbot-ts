import { describe, it } from 'mocha';
import { assert } from 'chai';
import { formatType, isNonEmptyString, normalizeHeaders } from '../../dist/build/helpers.js';

describe('Helper functions', function () {
	describe('isNonEmptyString', function () {
		it('should return true only for non-empty strings', function () {
			assert.isTrue(isNonEmptyString('foo'));

			assert.isFalse(isNonEmptyString(''));
			assert.isFalse(isNonEmptyString(0));
			assert.isFalse(isNonEmptyString(null));
			assert.isFalse(isNonEmptyString(undefined));
			assert.isFalse(isNonEmptyString({}));
		});
	});

	describe('formatType', function () {
		it('should return primitive types', function () {
			assert.strictEqual(formatType('foo'), 'string');
			assert.strictEqual(formatType(1), 'number');
			assert.strictEqual(formatType(true), 'boolean');
			assert.strictEqual(formatType(undefined), 'undefined');
			assert.strictEqual(formatType(Symbol()), 'symbol');
			assert.strictEqual(formatType(1n), 'bigint');
		});

		it('should distinguish arrays and null', function () {
			assert.strictEqual(formatType([]), 'array');
			assert.strictEqual(formatType(null), 'null');
		});

		it('should return constructor names for objects', function () {
			assert.strictEqual(formatType({}), 'Object');
			assert.strictEqual(formatType(new Date()), 'Date');
			assert.strictEqual(formatType(new Error()), 'Error');
		});

		it('should normalize functions', function () {
			assert.strictEqual(formatType(() => {}), 'function');
			assert.strictEqual(formatType(function () {}), 'function');
		});
	});

	describe('normalizeHeaders', () => {
		it('should normalize header names', function () {
			/** @type {import('../../dist/index.js').MwbotRequestConfig} */
			const options = {
				headers: {
					'content-type': 'application/json',
					user_agent: 'mwbot',
					Accept: 'application/json',
				},
			};

			normalizeHeaders(options);

			assert.deepEqual(options.headers, {
				'Content-Type': 'application/json',
				'User-Agent': 'mwbot',
				Accept: 'application/json',
			});
		});

		it('should omit undefined header values', function () {
			/** @type {import('../../dist/index.js').MwbotRequestConfig} */
			const options = {
				headers: {
					Foo: 'bar',
					Baz: undefined,
				},
			};

			normalizeHeaders(options);

			assert.deepEqual(options.headers, { Foo: 'bar' });
		});

		it('should do nothing if headers are undefined', function () {
			const options = {};

			normalizeHeaders(options);

			assert.deepEqual(options, {});
		});

		it('should replace the headers object', function () {
			const headers = {
				foo_bar: 'baz',
			};
			const options = { headers };

			normalizeHeaders(options);

			assert.notStrictEqual(options.headers, headers);
		});
	});
});
