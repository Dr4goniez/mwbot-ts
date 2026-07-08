import { describe, it, before, beforeEach } from 'mocha';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { assertThrowsMwbotError, getTestMwbot } from './MwbotTest/MwbotTest-fixtures.js';

describe('Mwbot.Template', function () {
	/**
	 * @type {Awaited<ReturnType<getTestMwbot>>}
	 */
	let mwbot;
	/**
	 * @type {number}
	 */
	let NS_MAIN;
	/**
	 * @type {number}
	 */
	let NS_TEMPLATE;

	before(async function () {
		mwbot = await getTestMwbot('named');

		const wgNamespaceIds = mwbot.config.get('wgNamespaceIds');
		NS_MAIN = wgNamespaceIds[''];
		NS_TEMPLATE = wgNamespaceIds.template;
	});

	describe('TemplateBase', function () {
		describe('validateTitle()', function () {
			/**
			 * @typedef {import('../../dist/index.js').Title} Title
			 */
			/**
			 * @typedef {(
			 *   ((title: string | Title, asHook?: false) => Title) &
			 *   ((title: string | Title, asHook: true) => import('../../dist/index.js').VerifiedFunctionHook)
			 * )} ValidateTitle
			 */
			/** @type {ValidateTitle} */
			let validateTitle;

			beforeEach(function () {
				// @ts-expect-error - Testing a protected method
				validateTitle = mwbot.Template.validateTitle.bind(mwbot.Template);
			});

			it('should reject invalid input types', function () {
				assertThrowsMwbotError(
					// @ts-expect-error - Passing a number
					() => validateTitle(123),
					'typemismatch'
				);
			});

			it('should return a verified parser function when asHook is true', function () {
				const hook = validateTitle('#bcp47:', true);

				assert.deepEqual(hook, {
					canonical: 'bcp47:',
					match: '#bcp47:',
				});
			});

			it('should reject parser functions by default', function () {
				assertThrowsMwbotError(
					() => validateTitle('#bcp47:'),
					'internal'
				);
			});

			it('should reject non-transcludable interwiki titles', function () {
				assertThrowsMwbotError(
					() => validateTitle('en:Main Page'),
					'invalidtitle'
				);
			});

			it('should return a Template Title from a string', function () {
				const title = validateTitle('Infobox');

				assert.instanceOf(title, mwbot.Title);
				assert.strictEqual(title.getMain(), 'Infobox');
				assert.strictEqual(title.getNamespaceId(), NS_TEMPLATE);
			});

			it('should preserve a leading colon', function () {
				const title = validateTitle(':Sandbox');

				assert.strictEqual(title.getNamespaceId(), NS_MAIN);
				assert.isTrue(title.hadLeadingColon());
			});

			it('should clone a Title instance', function () {
				const input = new mwbot.Title('Template:Infobox');
				const output = validateTitle(input);

				assert.notStrictEqual(output, input);
				assert.strictEqual(
					output.getPrefixedDb(),
					input.getPrefixedDb()
				);
			});
		});

		describe('insertParam()', function () {
			it('should trim parameter keys', function () {
				const tpl = new mwbot.Template('Test');

				const rawKey = '  a  ';
				tpl.insertParam(rawKey, '1');

				assert.property(tpl.params, 'a');
				assert.notProperty(tpl.params, rawKey);
			});

			it('should insert a named parameter', function () {
				const tpl = new mwbot.Template('Test');

				const value = '1';
				tpl.insertParam('a', value);

				assert.strictEqual(tpl.params.a.value, value);
				assert.isFalse(tpl.params.a.unnamed);
			});

			it('should insert an unnamed parameter', function () {
				const tpl = new mwbot.Template('Test');

				const value = '1';
				tpl.insertParam('', value);

				assert.property(tpl.params, value);
				assert.isTrue(tpl.params['1'].unnamed);
				assert.strictEqual(tpl.params['1'].value, value);
			});

			it('should trim named parameter values', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('a', '  value  ');

				assert.strictEqual(tpl.params.a.value, 'value');
			});

			it('should preserve unnamed parameter values', function () {
				const tpl = new mwbot.Template('Test');

				const value = '  value  ';
				tpl.insertParam('', value);

				assert.strictEqual(tpl.params['1'].value, value);
			});

			it('should include keys in text output for named parameters', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('1', 'Foo');

				assert.strictEqual(tpl.params['1'].text, '|1=Foo');
			});

			it('should omit keys in text output for unnamed parameters', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('', 'Foo');

				assert.strictEqual(tpl.params['1'].text, '|Foo');
			});

			it('should increment numeric keys correctly for multiple unnamed params', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('', 'a');
				tpl.insertParam('', 'b');
				tpl.insertParam('', 'c');

				assert.property(tpl.params, '1');
				assert.property(tpl.params, '2');
				assert.property(tpl.params, '3');
			});

			it('should overwrite an existing parameter by default', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
				]);

				const value = '2';
				tpl.insertParam('a', value);

				assert.strictEqual(tpl.params.a.value, value);
				assert.lengthOf(tpl.params.a.duplicates, 0);
			});

			it('should not overwrite when overwrite is false', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
				]);

				tpl.insertParam('a', '2', false);

				assert.strictEqual(tpl.params.a.value, '1');
			});

			it('should assign the first available numeric key', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: '1', value: 'a' },
					{ key: '3', value: 'c' },
				]);

				const value = 'b';
				tpl.insertParam('', value);

				assert.property(tpl.params, '2');
				assert.strictEqual(tpl.params['2'].value, value);
			});

			it('should insert at the start', function () {
				const tpl = new mwbot.Template('Test');

				tpl
					.insertParam('a', '1')
					.insertParam('b', '2')
					.insertParam('c', '3', true, 'start');

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['c', 'a', 'b']));
			});

			it('should insert at the end', function () {
				const tpl = new mwbot.Template('Test');

				tpl
					.insertParam('a', '1')
					.insertParam('b', '2')
					.insertParam('c', '3', true, 'end');

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['a', 'b', 'c']));
			});

			it('should insert at end by default', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('a', '1');
				tpl.insertParam('b', '2');

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['a', 'b']));
			});

			it('should insert before another parameter', function () {
				const tpl = new mwbot.Template('Test');

				tpl
					.insertParam('a', '1')
					.insertParam('c', '3')
					.insertParam('b', '2', true, { before: 'c' });

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['a', 'b', 'c']));
			});

			it('should insert after another parameter', function () {
				const tpl = new mwbot.Template('Test');

				tpl
					.insertParam('a', '1')
					.insertParam('c', '3')
					.insertParam('b', '2', true, { after: 'a' });

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['a', 'b', 'c']));
			});

			it('should append when the reference parameter does not exist', function () {
				const tpl = new mwbot.Template('Test');

				tpl
					.insertParam('a', '1')
					.insertParam('b', '2', true, { before: 'x' });

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['a', 'b']));
			});

			it('should overwrite a lower-priority hierarchy parameter', function () {
				const tpl = new mwbot.Template(
					'Test',
					[{ key: '1', value: 'foo' }],
					[['1', 'user']]
				);

				tpl.insertParam('user', 'bar');

				assert.notProperty(tpl.params, '1');
				assert.property(tpl.params, 'user');
				assert.strictEqual(tpl.params.user.value, 'bar');
			});

			it('should ignore a lower-priority hierarchy parameter', function () {
				const tpl = new mwbot.Template(
					'Test',
					[{ key: 'user', value: 'bar' }],
					[['1', 'user']]
				);

				tpl.insertParam('1', 'foo');

				assert.property(tpl.params, 'user');
				assert.notProperty(tpl.params, '1');
				assert.strictEqual(tpl.params.user.value, 'bar');
			});

			it('should resolve hierarchy aliases in before references', function () {
				const tpl = new mwbot.Template(
					'Test',
					[{ key: 'user', value: 'foo' }],
					[['1', 'user']]
				);

				tpl.insertParam('x', '1', true, { before: '1' });

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['x', 'user']));
			});

			it('should resolve hierarchy aliases in after references', function () {
				const tpl = new mwbot.Template(
					'Test',
					[{ key: 'user', value: 'foo' }],
					[['1', 'user']]
				);

				tpl.insertParam('x', '1', true, { after: '1' });

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['x', 'user']));
			});

			it('should preserve the original position when updating before itself', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
					{ key: 'b', value: '2' },
				]);

				tpl.insertParam('a', '3', true, { before: 'a' });

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['a', 'b']));
			});

			it('should preserve the original position when updating after itself', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
					{ key: 'b', value: '2' },
				]);

				tpl.insertParam('a', '3', true, { after: 'a' });

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['a', 'b']));
			});

			it('should preserve the original position when overriding a hierarchy alias', function () {
				const tpl = new mwbot.Template(
					'Test',
					[
						{ key: '1', value: 'foo' },
						{ key: 'x', value: 'bar' },
					],
					[['1', 'user']]
				);

				tpl.insertParam('user', 'baz');

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['user', 'x']));
			});
		});

		describe('updateParam()', function () {
			it('should update an existing parameter', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
				]);

				tpl.updateParam('a', '2');

				assert.strictEqual(tpl.params.a.value, '2');
			});

			it('should preserve parameter order', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
					{ key: 'b', value: '2' },
					{ key: 'c', value: '3' },
				]);

				tpl.updateParam('b', 'updated');

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['a', 'b', 'c']));
			});

			it('should do nothing when the parameter does not exist', function () {
				const tpl = new mwbot.Template('Test');

				tpl.updateParam('a', '1');

				assert.deepEqual(tpl.params, Object.create(null));
			});

			it('should update a lower-priority hierarchy parameter', function () {
				const tpl = new mwbot.Template(
					'Test',
					[{ key: '1', value: 'foo' }],
					[['1', 'user']]
				);

				tpl.updateParam('user', 'bar');

				assert.notProperty(tpl.params, '1');
				assert.strictEqual(tpl.params.user.value, 'bar');
			});

			it('should not update an overridden hierarchy parameter', function () {
				const tpl = new mwbot.Template(
					'Test',
					[{ key: 'user', value: 'bar' }],
					[['1', 'user']]
				);

				tpl.updateParam('1', 'foo');

				assert.strictEqual(tpl.params.user.value, 'bar');
				assert.notProperty(tpl.params, '1');
			});
		});

		describe('getParam()', function () {
			it('should return an existing parameter', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
				]);

				assert.strictEqual(
					tpl.getParam('a'),
					tpl.params.a
				);
			});

			it('should return null for a missing parameter', function () {
				const tpl = new mwbot.Template('Test');

				assert.isNull(tpl.getParam('a'));
			});

			it('should resolve hierarchy aliases', function () {
				const tpl = new mwbot.Template(
					'Test',
					[{ key: 'user', value: 'foo' }],
					[['1', 'user']]
				);

				assert.strictEqual(
					tpl.getParam('1', true),
					tpl.params.user
				);
			});

			it('should not resolve hierarchy aliases by default', function () {
				const tpl = new mwbot.Template(
					'Test',
					[{ key: 'user', value: 'foo' }],
					[['1', 'user']]
				);

				assert.isNull(tpl.getParam('1'));
			});
		});

		describe('hasParam()', function () {
			it('should check a parameter by key', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
				]);

				assert.isTrue(tpl.hasParam('a'));
				assert.isFalse(tpl.hasParam('b'));
			});

			it('should check a parameter by key and value', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
				]);

				assert.isTrue(tpl.hasParam('a', '1'));
				assert.isFalse(tpl.hasParam('a', '2'));
			});

			it('should support RegExp keys', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'abc', value: '1' },
				]);

				assert.isTrue(tpl.hasParam(/^ab/));
			});

			it('should support RegExp values', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: 'foobar' },
				]);

				assert.isTrue(tpl.hasParam('a', /^foo/));
			});

			it('should support predicate functions', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
				]);

				assert.isTrue(
					tpl.hasParam(param => param.value === '1')
				);
			});

			it('should pass a clone to predicate functions', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
				]);

				tpl.hasParam(param => {
					param.value = 'modified';
					return false;
				});

				assert.strictEqual(tpl.params.a.value, '1');
			});

			it('should reject invalid keys', function () {
				const tpl = new mwbot.Template('Test');

				// @ts-expect-error - Passing a number
				assert.isFalse(tpl.hasParam(123));
				assert.isFalse(tpl.hasParam(''));
			});
		});

		describe('deleteParam()', function () {
			it('should delete an existing parameter', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
				]);

				assert.isTrue(tpl.deleteParam('a'));
				assert.notProperty(tpl.params, 'a');
			});

			it('should return false for a missing parameter', function () {
				const tpl = new mwbot.Template('Test');

				assert.isFalse(tpl.deleteParam('a'));
			});

			it('should resolve hierarchy aliases', function () {
				const tpl = new mwbot.Template(
					'Test',
					[{ key: 'user', value: 'foo' }],
					[['1', 'user']]
				);

				assert.isTrue(tpl.deleteParam('1', true));
				assert.notProperty(tpl.params, 'user');
			});

			it('should not resolve hierarchy aliases by default', function () {
				const tpl = new mwbot.Template(
					'Test',
					[{ key: 'user', value: 'foo' }],
					[['1', 'user']]
				);

				assert.isFalse(tpl.deleteParam('1'));
				assert.property(tpl.params, 'user');
			});

			it('should remove the parameter from the internal order', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
					{ key: 'b', value: '2' },
				]);

				tpl.deleteParam('a');

				assert.deepPropertyVal(
					tpl,
					'_paramOrder',
					new Set(['b'])
				);
			});
		});
	});

	describe('Template', function () {
		describe('constructor()', function () {
			it('should accept a string title', function () {
				const tpl = new mwbot.Template('Infobox');

				assert.strictEqual(tpl.title.getMain(), 'Infobox');
				assert.strictEqual(tpl.title.getNamespaceId(), NS_TEMPLATE);
			});

			it('should accept a Title instance', function () {
				const title = new mwbot.Title('Template:Infobox');
				const tpl = new mwbot.Template(title);

				assert.strictEqual(
					tpl.title.getPrefixedDb(),
					title.getPrefixedDb()
				);
			});

			it('should throw on an invalid title', function () {
				assertThrowsMwbotError(
					() => new mwbot.Template(''),
					'unparsabletitle'
				);
			});

			it('should preserve a leading colon', function () {
				const tpl = new mwbot.Template(':Sandbox');

				assert.strictEqual(tpl.title.getNamespaceId(), NS_MAIN);
				assert.isTrue(tpl.title.hadLeadingColon());
			});

			it('should clone the given Title instance', function () {
				const title = new mwbot.Title('Template:Infobox');
				const tpl = new mwbot.Template(title);

				assert.notStrictEqual(tpl.title, title);
				assert.strictEqual(
					tpl.title.getPrefixedDb(),
					title.getPrefixedDb()
				);
			});

			it('should normalize a Title instance using the Template namespace by default', function () {
				const title = new mwbot.Title('Infobox');
				const tpl = new mwbot.Template(title);

				assert.strictEqual(tpl.title.getNamespaceId(), NS_TEMPLATE);
				assert.strictEqual(tpl.title.getMain(), 'Infobox');
			});

			it('should register initial parameters', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
					{ key: 'b', value: '2' },
				]);

				assert.strictEqual(tpl.params.a?.value, '1');
				assert.strictEqual(tpl.params.b?.value, '2');
			});

			it('should store duplicate parameters', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: '', value: 'Foo' },
					{ key: '1', value: 'Bar' },
				]);

				assert.strictEqual(tpl.params['1'].value, 'Bar');
				assert.lengthOf(tpl.params['1'].duplicates, 1);
				assert.deepInclude(
					tpl.params['1'].duplicates[0],
					{
						key: '1',
						value: 'Foo',
						unnamed: true,
					}
				);
				assert.strictEqual(
					tpl.params['1'].duplicates[0].text,
					'|Foo'
				);
			});

			it('should expose _paramOrder', function () {
				const tpl = new mwbot.Template('Test', [
					{ key: 'a', value: '1' },
					{ key: 'b', value: '2' },
				]);

				assert.deepPropertyVal(tpl, '_paramOrder', new Set(['a', 'b']));
			});

			it('should expose _hierarchyMap', function () {
				const hier = ['1', 'user'];
				const tpl = new mwbot.Template('Test', [], [hier]);

				assert.deepPropertyVal(tpl, '_hierarchyMap', new Map([
					['1', { hierarchy: hier, index: 0 }],
					['user', { hierarchy: hier, index: 1 }],
				]));
			});

			it('should ignore duplicate hierarchy keys after the first occurrence', function () {
				const tpl = new mwbot.Template(
					'Test',
					[],
					[
						['1', 'user'],
						['user', 'name'],
					]
				);

				assert.deepPropertyVal(
					tpl,
					'_hierarchyMap',
					new Map([
						['1', { hierarchy: ['1', 'user'], index: 0 }],
						['user', { hierarchy: ['1', 'user'], index: 1 }],
						['name', { hierarchy: ['user', 'name'], index: 1 }],
					])
				);
			});
		});

		describe('new()', function () {
			it('should accept a string title', function () {
				const tpl = mwbot.Template.new('Infobox');

				assert.instanceOf(tpl, mwbot.Template);
				assert.strictEqual(tpl.title.getMain(), 'Infobox');
				assert.strictEqual(tpl.title.getNamespaceId(), NS_TEMPLATE);
			});

			it('should accept a Title instance', function () {
				const title = new mwbot.Title('Template:Infobox');
				const tpl = mwbot.Template.new(title);

				assert.instanceOf(tpl, mwbot.Template);
				assert.strictEqual(
					tpl.title.getPrefixedDb(),
					title.getPrefixedDb()
				);
			});

			it('should return null on an invalid title', function () {
				assert.isNull(mwbot.Template.new(''));
			});
		});

		describe('is()', function () {
			// The success paths should be tested in WikitextTest.js

			it('should throw on an invalid input', function () {
				assertThrowsMwbotError(
					// @ts-expect-error = Passing an unsupported class name
					() => mwbot.Template.is({}, 'Unknown'),
					'invalidinput'
				);
			});
		});

		describe('setTitle()', function () {
			it('should update the title from a string', function () {
				const tpl = new mwbot.Template('Foo');

				assert.isTrue(tpl.setTitle('Bar'));
				assert.strictEqual(tpl.title.getMain(), 'Bar');
			});

			it('should update the title from a Title instance', function () {
				const tpl = new mwbot.Template('Foo');

				assert.isTrue(
					tpl.setTitle(new mwbot.Title('Template:Bar'))
				);

				assert.strictEqual(
					tpl.title.getPrefixedDb(),
					'Template:Bar'
				);
			});

			it('should return false for an invalid title', function () {
				const tpl = new mwbot.Template('Foo');

				assert.isFalse(tpl.setTitle(''));
				assert.strictEqual(tpl.title.getMain(), 'Foo');
			});

			it('should clone the given Title instance', function () {
				const tpl = new mwbot.Template('Foo');
				const title = new mwbot.Title('Template:Bar');

				tpl.setTitle(title);

				assert.notStrictEqual(tpl.title, title);
			});

			it('should log validation errors when verbose is true', function () {
				const tpl = new mwbot.Template('Test');

				const stub = sinon.stub(console, 'error');

				assert.isFalse(tpl.setTitle('', true));
				assert.isTrue(stub.calledOnce);

				stub.restore();
			});
		});

		describe('stringify()', function () {
			it('should stringify an empty template', function () {
				const tpl = new mwbot.Template('Test');

				assert.strictEqual(tpl.stringify(), '{{Test}}');
			});

			it('should stringify named parameters', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('a', '1');

				assert.strictEqual(tpl.stringify(), '{{Test|a=1}}');
			});

			it('should stringify unnamed parameters', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('', 'foo');

				assert.strictEqual(tpl.stringify(), '{{Test|foo}}');
			});

			it('should stringify mixed parameters', function () {
				const tpl = new mwbot.Template('Test');

				tpl
					.insertParam('a', '1')
					.insertParam('', 'foo');

				assert.strictEqual(tpl.stringify(), '{{Test|a=1|foo}}');
			});

			it('should always show key when value contains =', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('a', '1=2');

				assert.strictEqual(tpl.stringify(), '{{Test|a=1=2}}');
			});

			it('should suppress numeric keys when configured', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('1', 'a');

				assert.strictEqual(
					tpl.stringify({ suppressKeys: ['1'] }),
					'{{Test|a}}'
				);
			});

			it('should not suppress numeric keys when the value contains "="', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('1', 'a=b');

				assert.strictEqual(
					tpl.stringify({ suppressKeys: ['1'] }),
					'{{Test|1=a=b}}'
				);
			});

			it('should ignore non-numeric suppressKeys', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('a', '1');

				assert.strictEqual(
					tpl.stringify({ suppressKeys: ['a'] }),
					'{{Test|a=1}}'
				);
			});

			it('should apply prepend', function () {
				const tpl = new mwbot.Template(':Sandbox');

				const result = tpl.stringify({
					prepend: 'User:',
				});

				assert.strictEqual(result, '{{User:Sandbox}}');
			});

			it('should preserve colon logic in prepend', function () {
				const tpl = new mwbot.Template(':Sandbox');

				const result = tpl.stringify({
					prepend: 'User:',
				});

				assert.strictEqual(result, '{{User:Sandbox}}');
			});

			it('should apply append', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('a', '1');

				assert.strictEqual(
					tpl.stringify({ append: '/doc' }),
					'{{Test/doc|a=1}}'
				);
			});

			it('should preserve parameter order', function () {
				const tpl = new mwbot.Template('Test');

				tpl
					.insertParam('a', '1')
					.insertParam('b', '2')
					.insertParam('c', '3');

				assert.strictEqual(tpl.stringify(), '{{Test|a=1|b=2|c=3}}');
			});

			it('should respect insert order manipulation', function () {
				const tpl = new mwbot.Template('Test');

				tpl
					.insertParam('a', '1')
					.insertParam('c', '3')
					.insertParam('b', '2', true, { before: 'c' });

				assert.strictEqual(tpl.stringify(), '{{Test|a=1|b=2|c=3}}');
			});

			it('should insert line break for param predicate', function () {
				const tpl = new mwbot.Template('Test');

				tpl.insertParam('a', '1');

				const result = tpl.stringify({
					brPredicateParam: () => true,
				});

				assert.ok(result.includes('\n'));
			});

			it('should insert line break for title predicate', function () {
				const tpl = new mwbot.Template('Test');

				const result = tpl.stringify({
					brPredicateTitle: () => true,
				});

				assert.ok(result.startsWith('{{Test\n'));
			});

			it('should sort parameters using custom predicate', function () {
				const tpl = new mwbot.Template('Test');

				tpl
					.insertParam('a', '1')
					.insertParam('b', '2')
					.insertParam('c', '3');

				const result = tpl.stringify({
					sortPredicate: (p1, p2) => p2.key.localeCompare(p1.key),
				});

				assert.strictEqual(result, '{{Test|c=3|b=2|a=1}}');
			});
		});

		describe('toString()', function () {
			it('should delegate to stringify()', function () {
				const tpl = new mwbot.Template('Test');

				assert.strictEqual(
					tpl.toString(),
					tpl.stringify()
				);
			});
		});
	});
});