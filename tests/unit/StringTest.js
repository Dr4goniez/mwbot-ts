import { describe, it } from 'mocha';
import { assert } from 'chai';
import sinon from 'sinon';
import { Mwbot } from '../../dist/index.js';
const {
	byteLength,
	codePointLength,
	charAt,
	lcFirst,
	ucFirst,
	trimByteLength,
	trimCodePointLength,
} = Mwbot.String;

describe('Mwbot.String', function () {
	describe('byteLength()', function () {
		it('should calculate 1 byte per ASCII character', function () {
			assert.strictEqual(byteLength('hello'), 5);
			assert.strictEqual(byteLength('1234567890'), 10);
		});

		it('should calculate 2 bytes for Latin extended characters', function () {
			assert.strictEqual(byteLength('¢£¥'), 6);
		});

		it('should calculate 3 bytes for CJK (BMP) characters', function () {
			assert.strictEqual(byteLength('こんにちは'), 15); // 5 chars * 3 bytes
		});

		it('should calculate 4 bytes for UTF-16 surrogate pairs (Emojis)', function () {
			assert.strictEqual(byteLength('💩'), 4);
			assert.strictEqual(byteLength('👨‍👩‍👧'), 18); // Includes Zero Width Joiners
		});

		it('should count lone high surrogates as 2 bytes', function () {
			assert.strictEqual(byteLength('\uD800'), 2);
		});

		it('should count lone low surrogates as 2 bytes', function () {
			assert.strictEqual(byteLength('\uDC00'), 2);
		});
	});

	describe('codePointLength()', function () {
		it('should count ASCII characters correctly', function () {
			assert.strictEqual(codePointLength('hello'), 5);
		});

		it('should count CJK characters correctly', function () {
			assert.strictEqual(codePointLength('こんにちは'), 5);
		});

		it('should count surrogate pairs as a single code point', function () {
			// String.length would return 2, but codePointLength should return 1
			assert.strictEqual(codePointLength('💩'), 1);
			assert.strictEqual(codePointLength('a💩b'), 3);
			assert.strictEqual(codePointLength('👨‍👩‍👧'), 5);
		});

		it('should treat lone high surrogates as one code point', function () {
			assert.strictEqual(codePointLength('\uD800'), 1);
		});

		it('should treat lone low surrogates as one code point', function () {
			assert.strictEqual(codePointLength('\uDC00'), 1);
		});
	});

	describe('charAt()', function () {
		it('should extract normal characters correctly', function () {
			assert.strictEqual(charAt('abc', 1), 'b');
			assert.strictEqual(charAt('あいう', 1), 'い');
		});

		it('should extract surrogate pairs correctly (forward)', function () {
			// '💩' is at indices 1 and 2
			assert.strictEqual(charAt('a💩b', 1), '💩');
		});

		it('should extract surrogate pairs correctly (backwards)', function () {
			// Offset 2 points to the low surrogate of '💩'
			assert.strictEqual(charAt('a💩b', 2, true), '💩');
		});

		it('should return low surrogate when offset points to it without backwards flag', function () {
			assert.strictEqual(charAt('a💩b', 2), '\uDCA9');
		});

		it('should return empty string for out-of-bounds offset', function () {
			assert.strictEqual(charAt('abc', 10), '');
			assert.strictEqual(charAt('abc', -1, true), '');
		});

		it('should return lone high surrogates unchanged', function () {
			assert.strictEqual(charAt('\uD800', 0), '\uD800');
		});

		it('should return lone low surrogates unchanged', function () {
			assert.strictEqual(charAt('\uDC00', 0), '\uDC00');
		});
	});

	describe('lcFirst()', function () {
		it('should lowercase the first ASCII character', function () {
			assert.strictEqual(lcFirst('Hello'), 'hello');
			assert.strictEqual(lcFirst('HELLO'), 'hELLO');
		});

		it('should not affect strings starting with a lowercase letter', function () {
			assert.strictEqual(lcFirst('hello'), 'hello');
		});

		it('should handle surrogate pairs without mangling the string', function () {
			assert.strictEqual(lcFirst('💩Hello'), '💩Hello');
		});

		it('should handle empty strings safely', function () {
			assert.strictEqual(lcFirst(''), '');
		});
	});

	describe('ucFirst()', function () {
		it('should uppercase the first ASCII character', function () {
			assert.strictEqual(ucFirst('hello'), 'Hello');
			assert.strictEqual(ucFirst('hELLO'), 'HELLO');
		});

		it('should not affect strings starting with an uppercase letter', function () {
			assert.strictEqual(ucFirst('Hello'), 'Hello');
		});

		it('should handle surrogate pairs without mangling the string', function () {
			assert.strictEqual(ucFirst('💩hello'), '💩hello');
		});

		it('should handle empty strings safely', function () {
			assert.strictEqual(ucFirst(''), '');
		});
	});

	describe('trimByteLength()', function () {
		it('should not trim if within byte limit', function () {
			const result = trimByteLength('foo', 'foobar', 10);
			assert.deepEqual(result, { newVal: 'foobar', trimmed: false });
		});

		it('should trim trailing additions accurately', function () {
			const result = trimByteLength('foo', 'foobar', 4);
			assert.deepEqual(result, { newVal: 'foob', trimmed: true });
		});

		it('should trim middle insertions accurately', function () {
			// "foo" -> "fobaro" with limit 4 should result in "fobo"
			const result = trimByteLength('foo', 'fobaro', 4);
			assert.deepEqual(result, { newVal: 'fobo', trimmed: true });
		});

		it('should not chop a surrogate pair in half when trimming', function () {
			// 'a' (1) + '💩' (4) = 5 bytes. If limit is 4, it should remove the whole emoji.
			const result = trimByteLength('a', 'a💩', 4);
			assert.deepEqual(result, { newVal: 'a', trimmed: true });
		});

		it('should apply the filterFunction before calculating length', function () {
			// Filter doubles the string, so "abc" looks like 6 bytes.
			const filterFn = sinon.stub().callsFake((val) => val + val);

			// "a" -> "abc", limit 4.
			// "abc" filtered is "abcabc" (6 bytes) -> exceeds 4.
			// "ab" filtered is "abab" (4 bytes) -> exactly 4.
			const result = trimByteLength('a', 'abc', 4, filterFn);

			assert.deepEqual(result, { newVal: 'ab', trimmed: true });
			sinon.assert.called(filterFn);
		});

		it('should handle pathological filter functions that always exceed the limit', function () {
			const filterFn = sinon.stub().returns('xxxxxxxxxxxxxxxx');

			assert.deepEqual(
				trimByteLength('', 'abc', 1, filterFn),
				{
					newVal: '',
					trimmed: true,
				}
			);
		});

		it('should trim BMP 3-byte characters correctly', function () {
			assert.deepEqual(
				trimByteLength('', 'あい', 3),
				{
					newVal: 'あ',
					trimmed: true,
				}
			);
		});

		it('should handle empty strings with zero limit', function () {
			assert.deepEqual(
				trimByteLength('', '', 0),
				{
					newVal: '',
					trimmed: false,
				}
			);
		});
	});

	describe('trimCodePointLength()', function () {
		it('should not trim if within code point limit', function () {
			const result = trimCodePointLength('foo', 'foobar', 10);
			assert.deepEqual(result, { newVal: 'foobar', trimmed: false });
		});

		it('should trim middle insertions accurately based on code points', function () {
			const result = trimCodePointLength('foo', 'fobaro', 4);
			assert.deepEqual(result, { newVal: 'fobo', trimmed: true });
		});

		it('should count surrogate pairs as one limit unit', function () {
			// "a" (1) + "💩" (1) + "b" (1) = 3 code points.
			// If limit is 2, it should trim "b" and leave "a💩".
			const result = trimCodePointLength('a', 'a💩b', 2);
			assert.deepEqual(result, { newVal: 'a💩', trimmed: true });
		});

		it('should apply the filterFunction before calculating code points', function () {
			const filterFn = sinon.stub().callsFake((val) => val + 'X');
			// "a" -> "abc", limit 3.
			// "abc" + "X" = 4 chars (exceeds).
			// "ab" + "X" = 3 chars (fits).
			const result = trimCodePointLength('a', 'abc', 3, filterFn);

			assert.deepEqual(result, { newVal: 'ab', trimmed: true });
			sinon.assert.called(filterFn);
		});

		it('should handle empty strings with zero code point limit', function () {
			assert.deepEqual(
				trimCodePointLength('', '', 0),
				{
					newVal: '',
					trimmed: false,
				}
			);
		});
	});
});
