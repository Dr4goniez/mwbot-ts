import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { getTestMwbot } from '../MwbotTest/MwbotTest-fixtures.js';

export function testWikitextParameters() {
	describe('Parameter methods', function () {
		/**
		 * @type {Awaited<ReturnType<getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		describe('parseParameters()', function () {
			it('should return an empty array when no parameters exist', function () {
				const wt = new mwbot.Wikitext('Foo');

				assert.deepEqual(wt.parseParameters(), []);
			});

			it('should parse a parameter without a default value', function () {
				const wt = new mwbot.Wikitext('{{{foo}}}');
				const params = wt.parseParameters();

				assert.lengthOf(params, 1);
				assert.deepInclude(params[0], {
					key: 'foo',
					value: null,
					text: '{{{foo}}}',
					index: 0,
					startIndex: 0,
					endIndex: 9,
					nestLevel: 0,
					skip: false,
					parent: null,
				});
				assert.deepEqual([...params[0].children], []);
			});

			it('should parse a parameter with a default value', function () {
				const wt = new mwbot.Wikitext('{{{foo|bar}}}');
				const param = wt.parseParameters()[0];

				assert.strictEqual(param.key, 'foo');
				assert.strictEqual(param.value, 'bar');
			});

			it('should trim parameter keys', function () {
				const wt = new mwbot.Wikitext('{{{ foo |bar}}}');
				const param = wt.parseParameters()[0];

				assert.strictEqual(param.key, 'foo');
				assert.strictEqual(param.value, 'bar');
			});

			it('should preserve whitespace in parameter values', function () {
				const wt = new mwbot.Wikitext('{{{foo| bar }}}');
				const param = wt.parseParameters()[0];

				assert.strictEqual(param.value, ' bar ');
			});

			it('should parse nested parameters', function () {
				const wt = new mwbot.Wikitext('{{{1|{{{2|x}}}}}}');
				const params = wt.parseParameters();

				assert.lengthOf(params, 2);
				assert.deepInclude(params[0], {
					key: '1',
					nestLevel: 0,
					parent: null,
				});
				assert.deepEqual([...params[0].children], [1]);
				assert.deepInclude(params[1], {
					key: '2',
					nestLevel: 1,
					parent: 0,
				});
				assert.deepEqual([...params[1].children], []);
			});

			it('should parse parameters containing templates', function () {
				const wt = new mwbot.Wikitext(
					'{{{1|{{PAGENAME}}}}}'
				);

				const param = wt.parseParameters()[0];

				assert.strictEqual(param.key, '1');
				assert.strictEqual(param.value, '{{PAGENAME}}');
				assert.strictEqual(param.text, '{{{1|{{PAGENAME}}}}}');
			});

			it('should parse parameters containing nested parameters and templates', function () {
				const wt = new mwbot.Wikitext(
					'{{{1|{{{2|{{PAGENAME}}}}}}}}'
				);

				const params = wt.parseParameters();

				assert.lengthOf(params, 2);
				assert.strictEqual(params[0].value, '{{{2|{{PAGENAME}}}}}');
				assert.strictEqual(params[1].value, '{{PAGENAME}}');
			});

			it('should ignore parameters inside skip tags', function () {
				const wt = new mwbot.Wikitext(
					'<nowiki>{{{foo}}}</nowiki>\n{{{bar}}}'
				);
				const params = wt.parseParameters();

				assert.lengthOf(params, 2);
				assert.isTrue(params[0].skip);
				assert.isFalse(params[1].skip);
			});

			it('should ignore invalid parameter markup', function () {
				const wt = new mwbot.Wikitext(
					'{{{foo|bar}}'
				);

				assert.deepEqual(wt.parseParameters(), []);
			});

			it('should support keyPredicate', function () {
				const wt = new mwbot.Wikitext(
					'{{{a}}}{{{b}}}'
				);
				const params = wt.parseParameters({
					keyPredicate: (key) => key === 'b',
				});

				assert.lengthOf(params, 1);
				assert.strictEqual(params[0].key, 'b');
			});

			it('should support parameterPredicate', function () {
				const wt = new mwbot.Wikitext(
					'{{{a}}}{{{b|x}}}'
				);
				const params = wt.parseParameters({
					parameterPredicate: (p) => p.value !== null,
				});

				assert.lengthOf(params, 1);
				assert.strictEqual(params[0].key, 'b');
			});

			it('should preserve source ranges', function () {
				const wt = new mwbot.Wikitext(
					'{{{a}}}\n{{{b|c}}}'
				);

				for (const param of wt.parseParameters()) {
					assert.strictEqual(
						param.text,
						wt.content.slice(param.startIndex, param.endIndex)
					);
				}
			});

			it('should parse multiple sibling parameters', function () {
				const wt = new mwbot.Wikitext(
					'{{{a}}}{{{b}}}{{{c}}}'
				);

				const params = wt.parseParameters();

				assert.lengthOf(params, 3);
				assert.deepEqual(params.map((p) => p.key), ['a', 'b', 'c']);
				assert.isNull(params[0].parent);
				assert.isNull(params[1].parent);
				assert.isNull(params[2].parent);
			});
		});
	});
}
