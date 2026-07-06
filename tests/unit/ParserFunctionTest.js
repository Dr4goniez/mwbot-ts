import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { assertThrowsMwbotError, getTestMwbot } from './MwbotTest-fixtures.js';

describe('Mwbot.ParserFunction', function () {
	/**
	 * @type {Awaited<ReturnType<getTestMwbot>>}
	 */
	let mwbot;

	before(async function () {
		mwbot = await getTestMwbot('named');
	});

	describe('ParamBase', function () {
		describe('constructor()', function () {
			it('should clone the initial parameters', function () {
				const params = ['a', 'b'];
				const func = new mwbot.ParserFunction('#bcp47:', params);

				assert.deepEqual(func.params, params);
				assert.notStrictEqual(func.params, params);
			});

			it('should default to an empty parameter array', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				assert.deepEqual(func.params, []);
			});
		});

		describe('addParam()', function () {
			it('should append a parameter', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				func.addParam('foo');

				assert.deepEqual(func.params, ['foo']);
			});

			it('should return itself', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				assert.strictEqual(func.addParam('foo'), func);
			});
		});

		describe('setParam()', function () {
			it('should overwrite an existing parameter by default', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['foo']);

				assert.isTrue(func.setParam('bar', 0));
				assert.strictEqual(func.params[0], 'bar');
			});

			it('should not overwrite when overwrite is false', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['foo']);

				assert.isFalse(
					func.setParam('bar', 0, { overwrite: false })
				);
				assert.strictEqual(func.params[0], 'foo');
			});

			it('should create a new parameter by default', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				assert.isTrue(func.setParam('foo', 0));
				assert.strictEqual(func.params[0], 'foo');
			});

			it('should not create a parameter when ifexist is true', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				assert.isFalse(
					func.setParam('foo', 0, { ifexist: true })
				);
				assert.deepEqual(func.params, []);
			});
		});

		describe('getParam()', function () {
			it('should return an existing parameter', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['foo']);

				assert.strictEqual(func.getParam(0), 'foo');
			});

			it('should return null for a missing parameter', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				assert.isNull(func.getParam(0));
			});
		});

		describe('hasParam()', function () {
			it('should check a parameter by index', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['foo']);

				assert.isTrue(func.hasParam(0));
				assert.isFalse(func.hasParam(1));
			});

			it('should check a parameter by string value', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['foo']);

				assert.isTrue(func.hasParam(0, 'foo'));
				assert.isFalse(func.hasParam(0, 'bar'));
			});

			it('should check a parameter by RegExp', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['foobar']);

				assert.isTrue(func.hasParam(0, /^foo/));
				assert.isFalse(func.hasParam(0, /^bar/));
			});

			it('should support predicate functions', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['foo', 'bar']);

				assert.isTrue(
					func.hasParam((i, value) => i === 1 && value === 'bar')
				);
			});

			it('should reject invalid indices', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				// @ts-expect-error - Passing a string
				assert.isFalse(func.hasParam('0'));
			});

			it('should escape string values for exact matching', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['a+b']);

				assert.isTrue(func.hasParam(0, 'a+b'));
				assert.isFalse(func.hasParam(0, 'a.b'));
				assert.isFalse(func.hasParam(0, 'a.*'));
				assert.isFalse(func.hasParam(0, 'a+b+'));
			});
		});

		describe('deleteParam()', function () {
			it('should delete a parameter', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['foo']);

				assert.isTrue(func.deleteParam(0));
				assert.deepEqual(func.params, []);
			});

			it('should return false for a missing parameter', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				assert.isFalse(func.deleteParam(0));
			});

			it('should left-shift parameters by default', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['a', 'b', 'c']);

				func.deleteParam(1);

				assert.deepEqual(func.params, ['a', 'c']);
			});

			it('should preserve indices when leftShift is false', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['a', 'b', 'c']);

				func.deleteParam(1, false);

				assert.strictEqual(func.params[0], 'a');
				assert.isUndefined(func.params[1]);
				assert.strictEqual(func.params[2], 'c');
				assert.lengthOf(func.params, 3);
			});
		});
	});

	describe('ParserFunction', function () {
		describe('constructor()', function () {
			it('should accept a valid function hook', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				assert.strictEqual(func.hook, '#bcp47:');
				assert.strictEqual(func.canonicalHook, 'bcp47:');
				assert.deepEqual(func.params, []);
			});

			it('should register initial parameters', function () {
				const params = ['foo', 'bar'];
				const func = new mwbot.ParserFunction('#bcp47:', params);

				assert.deepEqual(func.params, params);
				assert.notStrictEqual(func.params, params);
			});

			it('should reject an invalid function hook', function () {
				assertThrowsMwbotError(
					() => new mwbot.ParserFunction('# bcp47:'),
					'invalidinput'
				);
			});
		});

		describe('verify()', function () {
			it('should verify a parser function hook', function () {
				assert.deepEqual(
					mwbot.ParserFunction.verify('#bcp47:'),
					{
						canonical: 'bcp47:',
						match: '#bcp47:',
					}
				);
			});

			it('should accept no-hash parser functions', function () {
				assert.deepEqual(
					mwbot.ParserFunction.verify('plural:'),
					{
						canonical: 'plural:',
						match: 'plural:',
					}
				);
			});

			it('should reject a hash for no-hash parser functions', function () {
				assert.isNull(
					mwbot.ParserFunction.verify('#plural:')
				);
			});

			it('should trim surrounding whitespace', function () {
				assert.deepEqual(
					mwbot.ParserFunction.verify('  #bcp47:  '),
					{
						canonical: 'bcp47:',
						match: '#bcp47:',
					}
				);
			});

			it('should skip pattern matching for canonical hooks', function () {
				const spy = sinon.spy(RegExp.prototype, 'test');

				const verified = mwbot.ParserFunction.verify('bcp47:');

				assert.deepEqual(verified, {
					canonical: 'bcp47:',
					match: 'bcp47:',
				});
				sinon.assert.notCalled(spy);

				sinon.restore();
			});

			it('should preserve the matched hook', function () {
				assert.deepEqual(
					mwbot.ParserFunction.verify('BIDI:'),
					{
						canonical: 'bidi:',
						match: 'BIDI:',
					}
				);
			});

			it('should reject invalid hooks', function () {
				assert.isNull(mwbot.ParserFunction.verify('# bcp47:'));
				assert.isNull(mwbot.ParserFunction.verify('#bcp47'));
				assert.isNull(mwbot.ParserFunction.verify(''));
			});
		});

		describe('setHook()', function () {
			it('should update the hook', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				assert.isTrue(func.setHook('#contentmodel:'));
				assert.strictEqual(func.hook, '#contentmodel:');
				assert.strictEqual(func.canonicalHook, 'contentmodel:');
			});

			it('should preserve the current hook on failure', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				assert.isFalse(func.setHook('# if:'));
				assert.strictEqual(func.hook, '#bcp47:');
				assert.strictEqual(func.canonicalHook, 'bcp47:');
			});
		});

		describe('stringify()', function () {
			it('should stringify an empty parser function', function () {
				const func = new mwbot.ParserFunction('#bcp47:');

				assert.strictEqual(func.stringify(), '{{#bcp47:}}');
			});

			it('should stringify parameters', function () {
				const func = new mwbot.ParserFunction('#bcp47:', [
					'foo',
					'bar',
				]);

				assert.strictEqual(
					func.stringify(),
					'{{#bcp47:foo|bar}}'
				);
			});

			it('should apply prepend', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['foo']);

				assert.strictEqual(
					func.stringify({ prepend: 'subst:' }),
					'{{subst:#bcp47:foo}}'
				);
			});

			it('should use the canonical hook when configured', function () {
				const func = new mwbot.ParserFunction('BIDI:', ['foo']);

				assert.strictEqual(
					func.stringify({ useCanonical: true }),
					'{{bidi:foo}}'
				);
			});

			it('should preserve the matched hook by default', function () {
				const func = new mwbot.ParserFunction('BIDI:', ['foo']);

				assert.strictEqual(
					func.stringify(),
					'{{BIDI:foo}}'
				);
			});

			it('should sort parameters', function () {
				const func = new mwbot.ParserFunction('#bcp47:', [
					'c',
					'a',
					'b',
				]);

				assert.strictEqual(
					func.stringify({
						sortPredicate: (a, b) => a.localeCompare(b),
					}),
					'{{#bcp47:a|b|c}}'
				);
			});

			it('should not mutate the original parameter order when sorting', function () {
				const func = new mwbot.ParserFunction('#bcp47:', [
					'c',
					'a',
					'b',
				]);

				func.stringify({
					sortPredicate: (a, b) => a.localeCompare(b),
				});
				assert.deepEqual(func.params, ['c', 'a', 'b']);
			});

			it('should insert line breaks using brPredicate', function () {
				const func = new mwbot.ParserFunction('#bcp47:', [
					'foo',
					'bar',
				]);

				assert.strictEqual(
					func.stringify({
						brPredicate: () => true,
					}),
					'{{#bcp47:foo\n|bar\n}}'
				);
			});
		});

		describe('toString()', function () {
			it('should delegate to stringify()', function () {
				const func = new mwbot.ParserFunction('#bcp47:', ['foo']);

				assert.strictEqual(
					func.toString(),
					func.stringify()
				);
			});
		});
	});
});