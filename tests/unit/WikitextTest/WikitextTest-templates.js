import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { getTestMwbot } from '../MwbotTest/MwbotTest-fixtures.js';

export function testWikitextTemplates() {
	describe('Template methods', function () {
		/**
		 * @typedef {import('../../../dist/index.js').ParsedTemplate} ParsedTemplate
		 * @typedef {import('../../../dist/index.js').RawTemplate} RawTemplate
		 * @typedef {import('../../../dist/index.js').ParsedParserFunction} ParsedParserFunction
		 */
		/**
		 * @type {Awaited<ReturnType<getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		describe('Template.is()', function () {
			it('should discriminate template classes', function () {
				const result = new mwbot.Wikitext(
					'{{Foo}}{{{{{1}}}}}{{#if:1|a|b}}'
				).parseTemplates();

				assert.lengthOf(result, 3);

				const [
					template,
					raw,
					parserFunction,
				] = result;

				assert.isTrue(mwbot.Template.is(template, 'Template'));
				assert.isTrue(mwbot.Template.is(template, 'ParsedTemplate'));

				assert.isTrue(mwbot.Template.is(raw, 'RawTemplate'));

				assert.isTrue(mwbot.Template.is(parserFunction, 'ParserFunction'));
				assert.isTrue(mwbot.Template.is(parserFunction, 'ParsedParserFunction'));
			});
		});

		describe('parseTemplates()', function () {
			it('should parse a template', function () {
				const templates = /** @type {ParsedTemplate[]} */ (
					new mwbot.Wikitext('{{Foo|a=1|2}}').parseTemplates()
				);

				assert.lengthOf(templates, 1);

				const tpl = templates[0];

				assert.isTrue(mwbot.Template.is(tpl, 'ParsedTemplate'));
				assert.strictEqual(tpl.title.getPrefixedDb(), 'Template:Foo');
				assert.deepInclude(tpl.params['a'], {
					key: 'a',
					value: '1',
				});
				assert.deepInclude(tpl.params['1'], {
					key: '1',
					value: '2',
					unnamed: true,
				});
				assert.strictEqual(tpl.nestLevel, 0);
				assert.strictEqual(tpl.parent, null);
				assert.deepEqual([...tpl.children], []);
			});

			it('should parse nested templates', function () {
				const templates = /** @type {ParsedTemplate[]} */ (
					new mwbot.Wikitext('{{A|{{B|{{C}}}}}}').parseTemplates()
				);

				assert.lengthOf(templates, 3);

				assert.isTrue(mwbot.Template.is(templates[0], 'ParsedTemplate'));

				assert.strictEqual(templates[0].title.getMain(), 'A');
				assert.strictEqual(templates[1].title.getMain(), 'B');
				assert.strictEqual(templates[2].title.getMain(), 'C');

				assert.strictEqual(templates[0].nestLevel, 0);
				assert.strictEqual(templates[1].nestLevel, 1);
				assert.strictEqual(templates[2].nestLevel, 2);

				assert.strictEqual(templates[0].parent, null);
				assert.strictEqual(templates[1].parent, 0);
				assert.strictEqual(templates[2].parent, 1);

				assert.deepEqual([...templates[0].children], [1]);
				assert.deepEqual([...templates[1].children], [2]);
				assert.deepEqual([...templates[2].children], []);
			});

			it('should parse parser functions', function () {
				const templates = /** @type {ParsedParserFunction[]} */ (
					new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates()
				);

				assert.lengthOf(templates, 1);

				const pf = templates[0];

				assert.isTrue(mwbot.Template.is(pf, 'ParsedParserFunction'));

				assert.strictEqual(pf.hook, '#if:');
				assert.deepEqual(pf.params, [
					'1',
					'yes',
					'no',
				]);
			});

			/* eslint-disable @stylistic/no-tabs */
			// it('should parse raw templates', function () {
			// 	const templates = /** @type {RawTemplate[]} */ (
			// 		new mwbot.Wikitext('{{{{{1}}}}}').parseTemplates()
			// 	);

			// 	assert.lengthOf(templates, 1);

			// 	const tpl = templates[0];
			// 	console.log('%o', tpl);
			// 	assert.isTrue(mwbot.Template.is(tpl, 'RawTemplate'));
			// 	assert.strictEqual(tpl.title, '{{{1}}}');
			// });
			/* eslint-enable @stylistic/no-tabs */

			it('should preserve comments in rawTitle', function () {
				const templates = /** @type {ParsedTemplate[]} */ (
					new mwbot.Wikitext('{{Foo<!--comment-->|a=1}}').parseTemplates()
				);

				assert.lengthOf(templates, 1);

				const tpl = templates[0];

				assert.isTrue(mwbot.Template.is(tpl, 'ParsedTemplate'));

				assert.strictEqual(tpl.rawTitle, 'Foo<!--comment-->');
				assert.strictEqual(tpl.title.getMain(), 'Foo');
			});

			it('should set skip for templates inside skip tags', function () {
				const templates = /** @type {(ParsedTemplate | RawTemplate | ParsedParserFunction)[]} */ (
					new mwbot.Wikitext('<nowiki>{{A}}</nowiki>{{B}}').parseTemplates()
				);

				assert.lengthOf(templates, 2);

				assert.isTrue(templates[0].skip);
				assert.isFalse(templates[1].skip);
			});

			it('should preserve parent-child relationships', function () {
				const templates = /** @type {ParsedTemplate[]} */ (
					new mwbot.Wikitext('{{A|{{B}}|{{C|{{D}}}} }}').parseTemplates()
				);

				assert.lengthOf(templates, 4);
				assert.isTrue(mwbot.Template.is(templates[0], 'ParsedTemplate'));

				assert.deepEqual([...templates[0].children], [1, 2]);
				assert.deepEqual([...templates[1].children], []);
				assert.deepEqual([...templates[2].children], [3]);
				assert.deepEqual([...templates[3].children], []);
			});

			it('should round-trip stringify()', function () {
				const text = '{{Foo|a=1|{{Bar|2}}}}';

				const parsed = /** @type {ParsedTemplate[]} */ (
					new mwbot.Wikitext(text).parseTemplates()
				);

				assert.isTrue(mwbot.Template.is(parsed[0], 'ParsedTemplate'));

				const reparsed = /** @type {ParsedTemplate[]} */ (
					new mwbot.Wikitext(parsed[0].stringify()).parseTemplates()
				);

				assert.strictEqual(
					reparsed[0].stringify(),
					parsed[0].stringify()
				);
			});

			describe('<gallery> tag compatibility', function () {
				it('should parse templates containing gallery tags', function () {
					const gallery =
						'<gallery>\n' +
						'Squirrel.png | Act I\n' +
						'Gbc squirrel.png | {{Bar|1=Act II}}\n' +
						'</gallery>';
					const image = `|image=\n${gallery}`;
					const text = `{{Foo\n${image}\n}}`;
					const templates = /** @type {ParsedTemplate[]} */ (
						new mwbot.Wikitext(text).parseTemplates()
					);

					assert.lengthOf(templates, 2);

					const foo = templates[0];

					assert.isTrue(mwbot.Template.is(foo, 'ParsedTemplate'));
					assert.strictEqual(foo.title.getPrefixedDb(), 'Template:Foo');
					assert.isObject(foo.params.image);
					assert.include(
						foo.params.image,
						{
							key: 'image',
							value: gallery,
						}
					);
					assert.include(
						foo,
						{
							rawTitle: 'Foo\n',
							text,
							index: 0,
							startIndex: 0,
							endIndex: text.length,
							nestLevel: 0,
							skip: false,
						}
					);

					const bar = templates[1];

					assert.isTrue(mwbot.Template.is(bar, 'ParsedTemplate'));
					assert.strictEqual(bar.title.getPrefixedDb(), 'Template:Bar');
					assert.include(
						bar.params['1'],
						{
							key: '1',
							value: 'Act II',
							unnamed: false,
						}
					);
				});

				it('should parse parser functions containing gallery tags', function () {
					const gallery =
						'<gallery>\n' +
						'Squirrel.png | Act I\n' +
						'Gbc squirrel.png | {{Bar|1=Act II}}\n' +
						'</gallery>';
					const text =
						'{{#if:1\n' +
						`|${gallery}\n` +
						'|No\n' +
						'}}';

					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);

					const pf = /** @type {ParsedParserFunction} */ (templates[0]);

					assert.isTrue(mwbot.Template.is(pf, 'ParsedParserFunction'));
					assert.strictEqual(pf.hook, '#if:');
					assert.deepEqual(
						pf.params,
						[
							'1\n',
							gallery + '\n',
							'No\n',
						]
					);

					const bar = /** @type {ParsedTemplate} */ (templates[1]);

					assert.isTrue(mwbot.Template.is(bar, 'ParsedTemplate'));
					assert.strictEqual(bar.title.getPrefixedDb(), 'Template:Bar');
					assert.include(
						bar.params['1'],
						{
							key: '1',
							value: 'Act II',
							unnamed: false,
						}
					);
				});

				it('should ignore pipes inside comments within gallery tags', function () {
					const text =
						'{{Foo|\n' +
						'<gallery>\n' +
						'A<!-- | -->|{{Bar|1=x}}\n' +
						'</gallery>\n' +
						'}}';

					const templates = /** @type {ParsedTemplate[]} */ (
						new mwbot.Wikitext(text).parseTemplates()
					);

					assert.lengthOf(templates, 2);
					assert.strictEqual(
						templates[1].params['1'].value,
						'x'
					);
				});

				it('should parse templates inside standalone gallery tags', function () {
					const text =
						'<gallery>\n' +
						'A|{{Bar|1=x}}\n' +
						'</gallery>';

					const templates = /** @type {ParsedTemplate[]} */ (
						new mwbot.Wikitext(text).parseTemplates()
					);

					assert.lengthOf(templates, 1);
					assert.strictEqual(
						templates[0].title.getPrefixedDb(),
						'Template:Bar'
					);
				});

				it('should ignore standalone gallery tags without templates', function () {
					const text =
						'<gallery>\n' +
						'A|B\n' +
						'</gallery>';

					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.isEmpty(templates);
				});

				it('should parse templates in multiple gallery tags', function () {
					const text =
						'{{Foo|\n' +
						'<gallery>\n' +
						'A|{{Bar}}\n' +
						'</gallery>\n' +
						'<gallery>\n' +
						'B|{{Baz}}\n' +
						'</gallery>\n' +
						'}}';

					const templates = /** @type {ParsedTemplate[]} */ (
						new mwbot.Wikitext(text).parseTemplates()
					);

					assert.lengthOf(templates, 3);
					assert.strictEqual(
						templates[0].params['1'].value,
						'\n' +
						'<gallery>\n' +
						'A|{{Bar}}\n' +
						'</gallery>\n' +
						'<gallery>\n' +
						'B|{{Baz}}\n' +
						'</gallery>\n'
					);
					assert.strictEqual(
						templates[1].title.getPrefixedDb(),
						'Template:Bar'
					);
					assert.strictEqual(
						templates[2].title.getPrefixedDb(),
						'Template:Baz'
					);
				});

				it('should parse template parameters following a gallery tag', function () {
					const text =
						'{{Foo|\n' +
						'<gallery>\n' +
						'A|{{Bar}}\n' +
						'</gallery>\n' +
						'|after=1\n' +
						'}}';

					const templates = /** @type {ParsedTemplate[]} */ (
						new mwbot.Wikitext(text).parseTemplates()
					);

					assert.lengthOf(templates, 2);
					assert.strictEqual(
						templates[0].params.after.value,
						'1'
					);
					assert.strictEqual(
						templates[1].title.getPrefixedDb(),
						'Template:Bar'
					);
				});

				it('should parse parser functions containing multiple gallery parameters', function () {
					const text =
						'{{#if:1\n' +
						'|<gallery>\n' +
						'A|{{Bar}}\n' +
						'</gallery>\n' +
						'|No\n' +
						'}}';

					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);

					const pf = /** @type {ParsedParserFunction} */ (templates[0]);

					assert.deepEqual(
						pf.params,
						[
							'1\n',
							'<gallery>\n' +
							'A|{{Bar}}\n' +
							'</gallery>\n',
							'No\n',
						]
					);

					const bar = /** @type {ParsedTemplate} */ (templates[1]);

					assert.strictEqual(
						bar.title.getPrefixedDb(),
						'Template:Bar'
					);
				});

				it('should ignore pipes inside gallery tags but split parameters outside them', function () {
					const text =
						'{{Foo|\n' +
						'abc\n' +
						'<gallery>\n' +
						'A|{{Bar}}\n' +
						'</gallery>\n' +
						'|after=1\n' +
						'}}';

					const templates = /** @type {ParsedTemplate[]} */ (
						new mwbot.Wikitext(text).parseTemplates()
					);

					assert.lengthOf(templates, 2);
					assert.strictEqual(
						templates[0].params['1'].value,
						'\n' +
						'abc\n' +
						'<gallery>\n' +
						'A|{{Bar}}\n' +
						'</gallery>\n'
					);
					assert.strictEqual(
						templates[0].params.after.value,
						'1'
					);
					assert.strictEqual(
						templates[1].title.getPrefixedDb(),
						'Template:Bar'
					);
				});
			});

			/* eslint-disable @stylistic/no-tabs */
			// it('should parse unclosed templates', function () {
			// 	const templates = /** @type {ParsedTemplate[]} */ (
			// 		new mwbot.Wikitext('{{Foo|{{Bar}}').parseTemplates()
			// 	);

			// 	assert.lengthOf(templates, 2);

			// 	assert.isTrue(mwbot.Template.is(templates[0], 'ParsedTemplate'));

			// 	assert.strictEqual(templates[0].title.getMain(), 'Foo');
			// 	assert.strictEqual(templates[1].title.getMain(), 'Bar');
			// });
			/* eslint-enable @stylistic/no-tabs */
		});
	});
}
