import { describe, it } from 'mocha';
import { assert } from 'chai';
import { formatType, isNonEmptyString } from '../../dist/build/helpers.js';

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
});
