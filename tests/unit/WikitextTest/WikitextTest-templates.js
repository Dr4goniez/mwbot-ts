import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { getTestMwbot } from '../MwbotTest/MwbotTest-fixtures.js';
import { MwbotError } from '../../../dist/index.js';

/**
 * @typedef {Awaited<ReturnType<getTestMwbot>>} TestMwbot
 * @typedef {import('../../../dist/index.js').ParsedTemplate} ParsedTemplate
 * @typedef {import('../../../dist/index.js').RawTemplate} RawTemplate
 * @typedef {import('../../../dist/index.js').ParsedParserFunction} ParsedParserFunction
 */

export function testWikitextTemplates() {
	describe('Templates', function () {
		/**
		 * @type {TestMwbot}
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

				assertTemplateInstanceOf(mwbot, template, 'Template');
				assertTemplateInstanceOf(mwbot, template, 'ParsedTemplate');

				assertTemplateInstanceOf(mwbot, raw, 'RawTemplate');

				assertTemplateInstanceOf(mwbot, parserFunction, 'ParserFunction');
				assertTemplateInstanceOf(mwbot, parserFunction, 'ParsedParserFunction');
			});
		});

		describe('parseTemplates()', function () {
			describe('basic parsing', function () {
				it('should parse a template', function () {
					const templates = new mwbot.Wikitext('{{Foo|a=1|2}}').parseTemplates();

					assert.lengthOf(templates, 1);

					const tpl = templates[0];

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
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

				it('should parse a raw template', function () {
					const templates = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assert.lengthOf(templates, 1);

					const tpl = templates[0];

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');
					assert.strictEqual(tpl.title, '<>');
				});

				it('should parse a parser function', function () {
					const templates = new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates();

					assert.lengthOf(templates, 1);

					const pf = templates[0];

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');
					assert.strictEqual(pf.hook, '#if:');
					assert.deepEqual(pf.params, [
						'1',
						'yes',
						'no',
					]);
				});

				it('should parse all double-braced markups and index them', function () {
					const templates = new mwbot.Wikitext(
						'aaaaa{{Foo}}bbbbb{{<>}}ccccc{{#if:1|yes|no}}ddddd'
					).parseTemplates();

					assert.lengthOf(templates, 3);

					const [tpl, raw, ppf] = templates;

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
					assertTemplateInstanceOf(mwbot, raw, 'RawTemplate');
					assertTemplateInstanceOf(mwbot, ppf, 'ParsedParserFunction');

					assert.strictEqual(tpl.title.getMain(), 'Foo');
					assert.strictEqual(raw.title, '<>');
					assert.strictEqual(ppf.hook, '#if:');

					assert.strictEqual(tpl.index, 0);
					assert.strictEqual(raw.index, 1);
					assert.strictEqual(ppf.index, 2);
				});

				it.skip('should parse unclosed templates', function () {
					const templates = new mwbot.Wikitext('{{Foo|{{Bar}}').parseTemplates();

					assert.lengthOf(templates, 2);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');
					assert.strictEqual(templates[0].title.getMain(), 'Foo');
					assert.strictEqual(templates[1].title.getMain(), 'Bar');
				});

				describe('.skip', function () {
					it('should mark parsed templates inside skip tags', () => {
						const text = '<nowiki>{{Foo}}</nowiki>{{Bar}}';
						const templates = new mwbot.Wikitext(text).parseTemplates();

						assert.lengthOf(templates, 2);
						assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');
						assert.isTrue(templates[0].skip);
						assert.isFalse(templates[1].skip);
					});

					it('should mark raw templates inside skip tags', () => {
						const text = '<nowiki>{{<>}}</nowiki>{{<>}}';
						const templates = new mwbot.Wikitext(text).parseTemplates();

						assert.lengthOf(templates, 2);
						assertTemplateInstanceOfAll(mwbot, templates, 'RawTemplate');
						assert.isTrue(templates[0].skip);
						assert.isFalse(templates[1].skip);
					});

					it('should mark parsed parser functions inside skip tags', () => {
						const text = '<nowiki>{{#if:1|2}}</nowiki>{{#if:1|2}}';
						const templates = new mwbot.Wikitext(text).parseTemplates();

						assert.lengthOf(templates, 2);
						assertTemplateInstanceOfAll(mwbot, templates, 'ParsedParserFunction');
						assert.isTrue(templates[0].skip);
						assert.isFalse(templates[1].skip);
					});
				});

				it('should initialize nesting relationships', () => {
					const text = '{{Foo|{{<>|{{#if:1|2|3}}}}}}';
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 3);

					const [tpl, raw, ppf] = templates;

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
					assertTemplateInstanceOf(mwbot, raw, 'RawTemplate');
					assertTemplateInstanceOf(mwbot, ppf, 'ParsedParserFunction');

					assert.strictEqual(tpl.nestLevel, 0);
					assert.strictEqual(raw.nestLevel, 1);
					assert.strictEqual(ppf.nestLevel, 2);

					assert.strictEqual(tpl.parent, null);
					assert.strictEqual(raw.parent, 0);
					assert.strictEqual(ppf.parent, 1);

					assert.deepEqual([...tpl.children], [1]);
					assert.deepEqual([...raw.children], [2]);
					assert.deepEqual([...ppf.children], []);
				});
			});

			describe('raw template title parsing', function () {
				it('should ignore HTML comments when determining the template title', function () {
					const templates = new mwbot.Wikitext('{{Foo<!--comment-->Bar}}').parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(mwbot, templates[0], 'ParsedTemplate');
					assert.strictEqual(
						templates[0].title.getPrefixedDb(),
						'Template:FooBar'
					);
				});

				it('should preserve skip tags nested inside skip tags', function () {
					const innerText = 'Foo<nowiki><!--comment--></nowiki>Bar';
					const templates = new mwbot.Wikitext(`{{${innerText}}}`).parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(mwbot, templates[0], 'RawTemplate');
					assert.strictEqual(templates[0].title, innerText);
				});

				it('should preserve parameters in raw template titles', function () {
					const innerText = '{{{1}}}';
					const templates = new mwbot.Wikitext(`{{${innerText}}}`).parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(mwbot, templates[0], 'RawTemplate');
					assert.strictEqual(templates[0].title, innerText);
				});

				it('should preserve wikilinks in raw template titles', function () {
					const innerText = '[[Foo]]';
					const templates = new mwbot.Wikitext(`{{${innerText}}}`).parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(mwbot, templates[0], 'RawTemplate');
					assert.strictEqual(templates[0].title, innerText);
				});

				it('should preserve HTML tags in raw template titles', function () {
					const innerText = '<span>Foo</span>';
					const templates = new mwbot.Wikitext(`{{${innerText}}}`).parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(mwbot, templates[0], 'RawTemplate');
					assert.strictEqual(templates[0].title, innerText);
				});

				it('should preserve parser extension tags in raw template titles', function () {
					const innerText = 'Foo<nowiki>Bar</nowiki>';
					const templates = new mwbot.Wikitext(`{{${innerText}}}`).parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(mwbot, templates[0], 'RawTemplate');
					assert.strictEqual(templates[0].title, innerText);
				});
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
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');

					const [foo, bar] = templates;

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

					const [pf, bar] = templates;

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');
					assertTemplateInstanceOf(mwbot, bar, 'ParsedTemplate');

					assert.strictEqual(pf.hook, '#if:');
					assert.deepEqual(
						pf.params,
						[
							'1\n',
							gallery + '\n',
							'No\n',
						]
					);

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
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);

					const [, bar] = templates;

					assertTemplateInstanceOf(mwbot, bar, 'ParsedTemplate');

					assert.strictEqual(bar.params['1'].value, 'x');
				});

				it('should parse templates inside standalone gallery tags', function () {
					const text =
						'<gallery>\n' +
						'A|{{Bar|1=x}}\n' +
						'</gallery>';
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(mwbot, templates[0], 'ParsedTemplate');
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
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 3);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');

					const [foo, bar, baz] = templates;

					assert.strictEqual(
						foo.params['1'].value,
						'\n' +
						'<gallery>\n' +
						'A|{{Bar}}\n' +
						'</gallery>\n' +
						'<gallery>\n' +
						'B|{{Baz}}\n' +
						'</gallery>\n'
					);
					assert.strictEqual(
						bar.title.getPrefixedDb(),
						'Template:Bar'
					);
					assert.strictEqual(
						baz.title.getPrefixedDb(),
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
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');

					const [foo, bar] = templates;

					assert.strictEqual(
						foo.params.after.value,
						'1'
					);
					assert.strictEqual(
						bar.title.getPrefixedDb(),
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

					const [pf, bar] = templates;

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');
					assertTemplateInstanceOf(mwbot, bar, 'ParsedTemplate');

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
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');

					const [foo, bar] = templates;

					assert.strictEqual(
						foo.params['1'].value,
						'\n' +
						'abc\n' +
						'<gallery>\n' +
						'A|{{Bar}}\n' +
						'</gallery>\n'
					);
					assert.strictEqual(
						foo.params.after.value,
						'1'
					);
					assert.strictEqual(
						bar.title.getPrefixedDb(),
						'Template:Bar'
					);
				});
			});

			describe('{{=}} magic word compatibility', function () {
				it('should parse {{=}} correctly', function () {
					const text = '{{=}}';
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(mwbot, templates[0], 'ParsedTemplate');
				});

				it('should parse {{=}} in template parameters correctly', function () {
					const value = 'bar{{=}}baz';
					const text = `{{Foo|${value}}}`;
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');
					assert.deepInclude(
						templates[0].params,
						{
							1: {
								key: '1',
								value,
								text: '|' + value,
								unnamed: true,
								duplicates: [],
							},
						}
					);
				});

				it('should ignore {{=}} in nowiki tags', function () {
					const value = 'bar<nowiki>{{=}}</nowiki>baz';
					const text = `{{Foo|${value}}}`;
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');
					assert.deepInclude(
						templates[0].params,
						{
							1: {
								key: '1',
								value,
								text: '|' + value,
								unnamed: true,
								duplicates: [],
							},
						}
					);
				});

				it('should ignore {{=}} in HTML comments', function () {
					const value = 'bar<!--{{=}}-->baz';
					const text = `{{Foo|${value}}}`;
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');
					assert.deepInclude(
						templates[0].params,
						{
							1: {
								key: '1',
								value,
								text: '|' + value,
								unnamed: true,
								duplicates: [],
							},
						}
					);
				});
			});

			describe('filtering', function () {

				const mixedWikitext = '{{Foo}}{{<>}}{{#if:1|2|3}}{{Bar}}{{#}}{{bcp47:blah}}';

				it('should filter results by titlePredicate', function () {
					const templates = new mwbot.Wikitext(mixedWikitext).parseTemplates({
						titlePredicate: (title) => {
							return title instanceof mwbot.Title && title.getMain() === 'Bar';
						},
					});

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');
					assert.strictEqual(templates[0].title.getPrefixedDb(), 'Template:Bar');
				});

				it('should filter results by templatePredicate', function () {
					const templates = new mwbot.Wikitext(mixedWikitext).parseTemplates({
						templatePredicate: (template) => {
							return mwbot.Template.is(template, 'ParsedParserFunction') &&
								template.params[1] === '2';
						},
					});

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedParserFunction');
					assert.strictEqual(templates[0].hook, '#if:');
					assert.strictEqual(templates[0].text, '{{#if:1|2|3}}');
				});

				it('should index the result based on the original array', function () {
					const templates = new mwbot.Wikitext(mixedWikitext).parseTemplates({
						titlePredicate: (title) => {
							return title instanceof mwbot.Title && title.getMain() === 'Bar';
						},
					});

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');
					assert.strictEqual(templates[0].index, 3);
				});

				it('should mark kinships based on the original array', function () {
					const text = '{{#if:1|2|{{Foo|{{<>}}}}}}';
					const templates = new mwbot.Wikitext(text).parseTemplates({
						titlePredicate: (title) => {
							return title instanceof mwbot.Title && title.getMain() === 'Foo';
						},
					});

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');
					assert.strictEqual(templates[0].parent, 0);
					assert.deepEqual([...templates[0].children], [2]);
				});
			});
		});

		describe('ParsedTemplate', function () {
			describe('constructor', function () {
				it('should parse a template title', () => {
					const templates = new mwbot.Wikitext('{{Template:Foo|1=Bar|baz=Qux}}').parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');

					const [tpl] = templates;

					assert.instanceOf(tpl.title, mwbot.Title);
					assert.strictEqual(
						tpl.title.getPrefixedDb(),
						'Template:Foo'
					);
					assert.strictEqual(
						tpl.rawTitle,
						'Template:Foo'
					);
				});

				it('should initialize parse result properties', () => {
					const text = '{{Template:Foo|Bar|1=Baz|qux=quux}}';
					const [tpl] = new mwbot.Wikitext(text).parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
					assert.deepEqual(
						tpl.params,
						{
							1: {
								key: '1',
								value: 'Baz',
								text: '|1=Baz',
								unnamed: false,
								duplicates: [
									{
										key: '1',
										value: 'Bar',
										text: '|Bar',
										unnamed: true,
									},
								],
							},
							qux: {
								key: 'qux',
								value: 'quux',
								text: '|qux=quux',
								unnamed: false,
								duplicates: [],
							},
						}
					);
					assertParseResultProperties(
						tpl,
						{
							text,
							nestLevel: 0,
							startIndex: 0,
							endIndex: text.length,
							skip: false,
							index: 0,
							parent: null,
							children: new Set(),
						}
					);
				});

				describe('rawTitle', function () {
					testRawTitleProperty(() => mwbot, 'ParsedTemplate');

					it('should preserve redundant namespace prefixes', () => {
						const [tpl] = new mwbot.Wikitext('{{Template:Foo}}').parseTemplates();

						assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
						assert.strictEqual(
							tpl.rawTitle,
							'Template:Foo'
						);
					});

					it('should preserve redundant leading colons', () => {
						const [tpl] = new mwbot.Wikitext('{{:Template:Foo}}').parseTemplates();

						assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
						assert.strictEqual(
							tpl.rawTitle,
							':Template:Foo'
						);
					});
				});
			});

			describe('setTitle()', function () {
				it('should return true when a valid title is provided', function () {
					const [tpl] = new mwbot.Wikitext('{{Foo}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
					assert.isTrue(tpl.setTitle('Bar'));
					assert.strictEqual(
						tpl.title.getPrefixedDb(),
						'Template:Bar'
					);
				});

				it('should update rawTitle on success', function () {
					const [tpl] = new mwbot.Wikitext('{{ Foo }}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
					assert.strictEqual(tpl.rawTitle, ' Foo ');

					assert.isTrue(tpl.setTitle('Bar'));

					assert.strictEqual(tpl.rawTitle, ' Bar ');
				});

				it('should return false when an invalid title is provided', function () {
					const [tpl] = new mwbot.Wikitext('{{Foo}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
					assert.isFalse(tpl.setTitle('<>'));
					assert.strictEqual(
						tpl.title.getPrefixedDb(),
						'Template:Foo'
					);
				});

				// Test #initializer updates in stringify()
			});

			describe('toParserFunction()', function () {
				it('should convert to ParsedParserFunction', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo|1|2}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');

					const ppf = tpl.toParserFunction('#if:');

					assertTemplateInstanceOf(mwbot, ppf, 'ParsedParserFunction');
					assert.strictEqual(ppf.hook, '#if:');
					assert.deepEqual(ppf.params, ['1', '2']);
				});

				it('should return null when converting to an invalid parser function', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
					assert.isNull(
						tpl.toParserFunction('invalid:')
					);
				});

				it('should log errors on conversion failure', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');

					// @ts-expect-error - Protected property
					const errorSpy = sinon.stub(mwbot.logger, 'error');

					try {
						tpl.toParserFunction('invalid:');

						sinon.assert.calledOnce(errorSpy);

						const err = errorSpy.firstCall.args[0];

						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'invalidinput');
					} finally {
						sinon.restore();
					}
				});

				// Test #initializer updates in stringify()
			});

			describe('stringify()', function () {
				it('should stringify back to the original text', () => {
					const text = '{{Foo|1|bar=baz}}';
					const [tpl] = new mwbot.Wikitext(text).parseTemplates();

					assert.strictEqual(
						tpl.stringify(),
						text
					);
				});

				it('should preserve template structure through parse/stringify cycles', () => {
					const text = '{{Foo|a=1|{{Bar|2}}}}';
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);
					assertTemplateInstanceOfAll(mwbot, templates, 'ParsedTemplate');

					const reparsed = new mwbot.Wikitext(templates[0].stringify()).parseTemplates();

					assert.strictEqual(
						reparsed[0].stringify(),
						templates[0].stringify()
					);
				});

				it('should stringify modified templates', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo|bar}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');

					tpl.setTitle('Bar');

					assert.strictEqual(
						tpl.stringify(),
						'{{Bar|bar}}'
					);
				});

				describe('options.rawTitle', function () {

					const base = [
						{ input: '{{ Foo }}' },
						{ input: '{{ <!-- --> Foo }}' },
						{ input: '{{ F<!-- -->oo }}' },
						{ input: '{{ Foo <!-- --> }}' },
						{ input: '{{ <!-- --> Foo <!-- --> }}' },
					];

					testRawTitleStringify(() => mwbot, base, 'ParsedTemplate');

					describe('setTitle()', function () {
						testRawTitleStringify(
							() => mwbot,
							[
								{ ...base[0], modify: (tpl) => tpl.setTitle('Bar'), output: '{{ Bar }}' },
								{ ...base[1], modify: (tpl) => tpl.setTitle('Bar'), output: '{{ <!-- --> Bar }}' },
								{ ...base[2], modify: (tpl) => tpl.setTitle('Bar'), output: '{{ Bar }}' },
								{ ...base[3], modify: (tpl) => tpl.setTitle('Bar'), output: '{{ Bar <!-- --> }}' },
								{ ...base[4], modify: (tpl) => tpl.setTitle('Bar'), output: '{{ <!-- --> Bar <!-- --> }}' },
							],
							'ParsedTemplate'
						);
					});

					describe('toParserFunction()', function () {
						testRawTitleStringify(
							() => mwbot,
							[
								{ ...base[0], modify: (tpl) => tpl.toParserFunction('#if:'), output: '{{ #if: }}' },
								{ ...base[1], modify: (tpl) => tpl.toParserFunction('#if:'), output: '{{ <!-- --> #if: }}' },
								{ ...base[2], modify: (tpl) => tpl.toParserFunction('#if:'), output: '{{ #if: }}' },
								{ ...base[3], modify: (tpl) => tpl.toParserFunction('#if:'), output: '{{ #if: <!-- --> }}' },
								{ ...base[4], modify: (tpl) => tpl.toParserFunction('#if:'), output: '{{ <!-- --> #if: <!-- --> }}' },
							],
							'ParsedTemplate',
							'ParsedParserFunction'
						);
					});
				});
			});

			describe('toString()', function () {
				it('should return the same value as stringify()', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo|bar}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');

					assert.strictEqual(
						tpl.toString(),
						tpl.stringify()
					);
				});
			});

			describe('_clone()', function () {
				it('should return an independent clone', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo|bar}}').parseTemplates();
					const clone = tpl._clone();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
					assertTemplateInstanceOf(mwbot, clone, 'ParsedTemplate');

					assert.notStrictEqual(clone, tpl);
					assert.notStrictEqual(clone.children, tpl.children);
					assert.deepEqual([...clone.children], [...tpl.children]);

					clone.setTitle('Bar');

					assert.strictEqual(
						tpl.title.getMain(),
						'Foo'
					);
				});

				it('should preserve parse result properties', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo|{{Bar}}}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');

					const clone = tpl._clone();

					assertParseResultProperties(clone, tpl);
				});
			});
		});

		describe('RawTemplate', function () {
			describe('constructor', function () {
				it('should parse a template title', () => {
					const [tpl] = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');

					assert.strictEqual(tpl.title, '<>');
					assert.strictEqual(tpl.rawTitle, '<>');
				});

				it('should initialize parse result properties', () => {
					const text = '{{<>}}';
					const [tpl] = new mwbot.Wikitext(text).parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');
					assertParseResultProperties(
						tpl,
						{
							text,
							nestLevel: 0,
							startIndex: 0,
							endIndex: text.length,
							skip: false,
							index: 0,
							parent: null,
							children: new Set(),
						}
					);
				});

				describe('rawTitle', function () {
					testRawTitleProperty(() => mwbot, 'RawTemplate');

					it('should preserve mixed markup in raw titles', () => {
						const [tpl] = new mwbot.Wikitext(
							'{{[[Foo]]<!--x--><nowiki>bar</nowiki>{{{1}}}}}'
						).parseTemplates();

						assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');

						assert.strictEqual(
							tpl.rawTitle,
							'[[Foo]]<!--x--><nowiki>bar</nowiki>{{{1}}}'
						);
					});

					it.skip('should recognize comment tags intervening between "<>"', function () {
						// FIXME: "<<!-- -->>" is parsed as a tag where the node name is "<!-- -->"
						const rawTitle = ' <<!-- -->> ';
						const [tpl] = new mwbot.Wikitext(`{{${rawTitle}}}`).parseTemplates();

						assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');
						assert.strictEqual(tpl.rawTitle, rawTitle);
						assert.strictEqual(tpl.title, '<>');
					});
				});
			});

			describe('setTitle()', function () {
				it('should return the current instance', function () {
					const [tpl] = new mwbot.Wikitext('{{}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');
					assert.propertyVal(tpl, '_title', '');

					assert.strictEqual(tpl.setTitle('<>'), tpl);

					assert.propertyVal(tpl, '_title', '<>');
				});

				it('should update rawTitle', function () {
					const [tpl] = new mwbot.Wikitext('{{ ## }}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');
					assert.strictEqual(tpl.rawTitle, ' ## ');

					tpl.setTitle('[]');

					assert.strictEqual(tpl.rawTitle, ' [] ');
				});
			});

			describe('toTemplate()', function () {
				it('should convert to ParsedTemplate', () => {
					const [tpl] = new mwbot.Wikitext('{{<>|1|2}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');

					const converted = tpl.toTemplate('Foo');

					assertTemplateInstanceOf(mwbot, converted, 'ParsedTemplate');
					assert.strictEqual(
						converted.title.getPrefixedDb(),
						'Template:Foo'
					);
					assert.strictEqual(
						converted.stringify(),
						'{{Foo|1|2}}'
					);
				});

				it('should return null when an invalid template title is provided', () => {
					const [tpl] = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');
					assert.isNull(tpl.toTemplate('#'));
				});

				it('should log errors on conversion failure', () => {
					const [tpl] = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');

					// @ts-expect-error - Protected property
					const errorSpy = sinon.stub(mwbot.logger, 'error');

					try {
						tpl.toTemplate('#');

						sinon.assert.calledOnce(errorSpy);

						const err = errorSpy.firstCall.args[0];

						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'unparsabletitle');
					} finally {
						sinon.restore();
					}
				});

				// Test #initializer updates in stringify()
			});

			describe('toParserFunction()', function () {
				it('should convert to ParsedParserFunction', () => {
					const [tpl] = new mwbot.Wikitext('{{<>|1|2}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');

					const ppf = tpl.toParserFunction('#if:');

					assertTemplateInstanceOf(mwbot, ppf, 'ParsedParserFunction');
					assert.strictEqual(ppf.hook, '#if:');
					assert.deepEqual(ppf.params, ['1', '2']);
					assert.strictEqual(
						ppf.stringify(),
						'{{#if:1|2}}'
					);
				});

				it('should return null when converting to an invalid parser function', () => {
					const [tpl] = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');
					assert.isNull(tpl.toParserFunction('invalid:'));
				});

				it('should log errors on conversion failure', () => {
					const [tpl] = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');

					// @ts-expect-error - Protected property
					const errorSpy = sinon.stub(mwbot.logger, 'error');

					try {
						tpl.toParserFunction('invalid:');

						sinon.assert.calledOnce(errorSpy);

						const err = errorSpy.firstCall.args[0];

						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'invalidinput');
					} finally {
						sinon.restore();
					}
				});

				// Test #initializer updates in stringify()
			});

			describe('stringify()', function () {
				it('should stringify back to the original text', () => {
					const text = '{{{{{1}}}}}';
					const [tpl] = new mwbot.Wikitext(text).parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');
					assert.strictEqual(tpl.stringify(), text);
				});

				it('should preserve template structure through parse/stringify cycles', () => {
					const text = '{{<>|a=1|{{Foo|2}}}}';
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);

					const [raw, tpl] = templates;

					assertTemplateInstanceOf(mwbot, raw, 'RawTemplate');
					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');

					const [reparsed] = new mwbot.Wikitext(raw.stringify()).parseTemplates();

					assert.strictEqual(
						reparsed.stringify(),
						raw.stringify()
					);
				});

				it('should stringify modified templates', () => {
					const [tpl] = new mwbot.Wikitext('{{<>|bar}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');

					tpl.setTitle('#');

					assert.strictEqual(
						tpl.stringify(),
						'{{#|bar}}'
					);
				});

				describe('options.rawTitle', function () {

					const base = [
						{ input: '{{ ## }}' },
						{ input: '{{ <!-- --> ## }}' },
						{ input: '{{ #<!-- --># }}' },
						{ input: '{{ ## <!-- --> }}' },
						{ input: '{{ <!-- --> ## <!-- --> }}' },
					];

					testRawTitleStringify(() => mwbot, base, 'RawTemplate');

					describe('setTitle()', function () {
						testRawTitleStringify(
							() => mwbot,
							[
								{ ...base[0], modify: (tpl) => tpl.setTitle('[]'), output: '{{ [] }}' },
								{ ...base[1], modify: (tpl) => tpl.setTitle('[]'), output: '{{ <!-- --> [] }}' },
								{ ...base[2], modify: (tpl) => tpl.setTitle('[]'), output: '{{ [] }}' },
								{ ...base[3], modify: (tpl) => tpl.setTitle('[]'), output: '{{ [] <!-- --> }}' },
								{ ...base[4], modify: (tpl) => tpl.setTitle('[]'), output: '{{ <!-- --> [] <!-- --> }}' },
							],
							'RawTemplate'
						);

						it('should handle whitespace/comment-only empty titles', function () {
							const [tpl] = new mwbot.Wikitext('{{ <!-- --> }}').parseTemplates();

							assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');
							assert.strictEqual(tpl.title, '  ');
							assert.strictEqual(tpl.rawTitle, ' <!-- --> ');

							tpl.setTitle('Foo');

							assert.strictEqual(
								tpl.stringify({ rawTitle: true }),
								'{{ <!-- --> Foo}}'
							);
						});
					});

					describe('toTemplate()', function () {
						testRawTitleStringify(
							() => mwbot,
							[
								{ ...base[0], modify: (tpl) => tpl.toTemplate('Foo'), output: '{{ Foo }}' },
								{ ...base[1], modify: (tpl) => tpl.toTemplate('Foo'), output: '{{ <!-- --> Foo }}' },
								{ ...base[2], modify: (tpl) => tpl.toTemplate('Foo'), output: '{{ Foo }}' },
								{ ...base[3], modify: (tpl) => tpl.toTemplate('Foo'), output: '{{ Foo <!-- --> }}' },
								{ ...base[4], modify: (tpl) => tpl.toTemplate('Foo'), output: '{{ <!-- --> Foo <!-- --> }}' },
							],
							'RawTemplate',
							'ParsedTemplate'
						);
					});

					describe('toParserFunction()', function () {
						testRawTitleStringify(
							() => mwbot,
							[
								{ ...base[0], modify: (tpl) => tpl.toParserFunction('#if:'), output: '{{ #if: }}' },
								{ ...base[1], modify: (tpl) => tpl.toParserFunction('#if:'), output: '{{ <!-- --> #if: }}' },
								{ ...base[2], modify: (tpl) => tpl.toParserFunction('#if:'), output: '{{ #if: }}' },
								{ ...base[3], modify: (tpl) => tpl.toParserFunction('#if:'), output: '{{ #if: <!-- --> }}' },
								{ ...base[4], modify: (tpl) => tpl.toParserFunction('#if:'), output: '{{ <!-- --> #if: <!-- --> }}' },
							],
							'RawTemplate',
							'ParsedParserFunction'
						);
					});
				});
			});

			describe('toString()', function () {
				it('should return the same value as stringify()', () => {
					const [tpl] = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');
					assert.strictEqual(
						tpl.toString(),
						tpl.stringify()
					);
				});
			});

			describe('_clone()', function () {
				it('should return an independent clone', () => {
					const [tpl] = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, tpl, 'RawTemplate');

					const clone = tpl._clone();

					assertTemplateInstanceOf(mwbot, clone, 'RawTemplate');
					assert.notStrictEqual(clone, tpl);
					assert.strictEqual(clone.title, tpl.title);
					assertParseResultProperties(clone, tpl);
				});
			});
		});

		describe('ParsedParserFunction', function () {
			describe('constructor', function () {
				it('should parse a parser function hook', () => {
					const [pf] = new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');
					assert.strictEqual(pf.hook, '#if:');
					assert.deepEqual(
						pf.params,
						[
							'1',
							'yes',
							'no',
						]
					);
					assert.strictEqual(pf.rawHook, '#if:');
				});

				it('should initialize parse result properties', () => {
					const text = '{{#if:1|yes|no}}';
					const [pf] = new mwbot.Wikitext(text).parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');
					assertParseResultProperties(
						pf,
						{
							text,
							nestLevel: 0,
							startIndex: 0,
							endIndex: text.length,
							skip: false,
							index: 0,
							parent: null,
							children: new Set(),
						}
					);
				});

				describe('rawHook', function () {

					// For ParsedParserFunction, everything after the hook is part of the parameters

					it('should preserve leading whitespace', function () {
						const [pf] = new mwbot.Wikitext('{{ #if:1|yes|no}}').parseTemplates();

						assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

						assert.strictEqual(pf.hook, '#if:');
						assert.strictEqual(pf.rawHook, ' #if:');
						assert.deepEqual(pf.params, ['1', 'yes', 'no']);
					});

					it('should preserve comments on the left side of the function hook', function () {
						const [pf] = new mwbot.Wikitext('{{ <!-- -->#if:1|yes|no}}').parseTemplates();

						assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

						assert.strictEqual(pf.hook, '#if:');
						assert.strictEqual(pf.rawHook, ' <!-- -->#if:');
						assert.deepEqual(pf.params, ['1', 'yes', 'no']);
					});

					it('should preserve comments inside the function hook', () => {
						const [pf] = new mwbot.Wikitext(
							'{{#if<!-- -->:1|yes|no}}'
						).parseTemplates();

						assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

						assert.strictEqual(pf.hook, '#if:');
						assert.strictEqual(pf.rawHook, '#if<!-- -->:');
						assert.deepEqual(pf.params, ['1', 'yes', 'no']);
					});
				});
			});

			describe('setHook()', function () {
				it('should return true when a valid hook is provided', function () {
					const [pf] = new mwbot.Wikitext('{{#if:1}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');
					assert.isTrue(pf.setHook('#bcp47:'));
					assert.strictEqual(pf.hook, '#bcp47:');
				});

				it('should reflect the new hook via .hook and .canonicalHook', function () {
					const [pf] = new mwbot.Wikitext('{{ #if:1 }}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');
					assert.strictEqual(pf.hook, '#if:');
					assert.strictEqual(pf.canonicalHook, '#if:');

					assert.isTrue(pf.setHook('#bcp47:'));

					assert.strictEqual(pf.hook, '#bcp47:');
					assert.strictEqual(pf.canonicalHook, 'bcp47:');
				});

				it('should update rawHook', function () {
					const [pf] = new mwbot.Wikitext('{{ #if:1 }}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');
					assert.strictEqual(pf.rawHook, ' #if:');

					assert.isTrue(pf.setHook('#bcp47:'));

					assert.strictEqual(pf.rawHook, ' #bcp47:');
				});

				it('should return false when an invalid hook is provided', function () {
					const [pf] = new mwbot.Wikitext('{{#if:1}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');
					assert.isFalse(pf.setHook('#invalid:'));
					assert.strictEqual(pf.hook, '#if:');
				});

				// Test #initializer updates in stringify()
			});

			describe('toTemplate()', function () {
				it('should convert to ParsedTemplate', () => {
					const [pf] = new mwbot.Wikitext('{{#if:test|1|2}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

					const tpl = pf.toTemplate('Foo');

					assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
					assert.strictEqual(tpl.title.getMain(), 'Foo');
					assert.include(tpl.params[1], { key: '1', value: 'test', unnamed: true });
					assert.include(tpl.params[2], { key: '2', value: '1', unnamed: true });
					assert.include(tpl.params[3], { key: '3', value: '2', unnamed: true });
				});

				it('should return null when converting to an invalid template title', () => {
					const [pf] = new mwbot.Wikitext('{{#if:test}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

					assert.isNull(pf.toTemplate('<>'));
				});

				it('should log errors on conversion failure', () => {
					const [pf] = new mwbot.Wikitext('{{#if:test}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

					// @ts-expect-error - Protected property
					const errorSpy = sinon.stub(mwbot.logger, 'error');

					try {
						pf.toTemplate('<>');

						sinon.assert.calledOnce(errorSpy);

						const err = errorSpy.firstCall.args[0];

						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'unparsabletitle');
					} finally {
						sinon.restore();
					}
				});

				// Test #initializer updates in stringify()
			});

			describe('stringify()', function () {
				it('should stringify back to the original text', () => {
					const text = '{{#if:1|yes|no}}';
					const [pf] = new mwbot.Wikitext(text).parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

					assert.strictEqual(
						pf.stringify(),
						text
					);
				});

				it('should stringify modified parser functions', () => {
					const [pf] = new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

					pf.setHook('#bcp47:');

					assert.strictEqual(
						pf.stringify(),
						'{{#bcp47:1|yes|no}}'
					);
				});

				describe('options.rawHook', function () {

					const base = [
						{ input: '{{ #if: }}' },
						{ input: '{{ <!-- --> #if: }}' },
						{ input: '{{ #<!-- -->if: }}' },
					];

					testRawTitleStringify(() => mwbot, base, 'ParsedParserFunction');

					describe('setHook()', function () {
						testRawTitleStringify(
							() => mwbot,
							[
								{ ...base[0], modify: (pf) => pf.setHook('#bcp47:'), output: '{{ #bcp47: }}' },
								{ ...base[1], modify: (pf) => pf.setHook('#bcp47:'), output: '{{ <!-- --> #bcp47: }}' },
								{ ...base[2], modify: (pf) => pf.setHook('#bcp47:'), output: '{{ #bcp47: }}' },
							],
							'ParsedParserFunction'
						);
					});

					describe('toTemplate()', function () {
						testRawTitleStringify(
							() => mwbot,
							[
								{ ...base[0], modify: (pf) => pf.toTemplate('Foo'), output: '{{ Foo| }}' },
								{ ...base[1], modify: (pf) => pf.toTemplate('Foo'), output: '{{ <!-- --> Foo| }}' },
								{ ...base[2], modify: (pf) => pf.toTemplate('Foo'), output: '{{ Foo| }}' },
							],
							'ParsedParserFunction',
							'ParsedTemplate'
						);

						it('should ouput the part after the hook as the first template parameter ', function () {
							const [pf] = new mwbot.Wikitext('{{ #if: <!-- --> }}').parseTemplates();

							assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

							const tpl = pf.toTemplate('Foo');

							assertTemplateInstanceOf(mwbot, tpl, 'ParsedTemplate');
							assert.strictEqual(
								tpl.stringify({ rawTitle: true }),
								'{{ Foo| <!-- --> }}'
							);
						});
					});
				});
			});

			describe('toString()', function () {
				it('should return the same value as stringify()', () => {
					const [pf] = new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

					assert.strictEqual(
						pf.toString(),
						pf.stringify()
					);
				});
			});

			describe('_clone()', function () {
				it('should return an independent clone', () => {
					const [pf] = new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates();

					assertTemplateInstanceOf(mwbot, pf, 'ParsedParserFunction');

					const clone = pf._clone();

					assertTemplateInstanceOf(mwbot, clone, 'ParsedParserFunction');
					assert.notStrictEqual(clone, pf);
					assert.deepEqual(clone.params, pf.params);
					assertParseResultProperties(clone, pf);
				});
			});
		});
	});
}

/**
 * @typedef {import('../../../dist/index.js').TemplateTypeMap} TemplateTypeMap
 */

/**
 * Asserts that the given object is an instance of a parsed template class.
 *
 * @template {keyof TemplateTypeMap} T
 * @param {TestMwbot} mwbot
 * @param {unknown} obj
 * @param {T} type
 * @returns {asserts obj is TemplateTypeMap[T]}
 */
function assertTemplateInstanceOf(mwbot, obj, type) {
	assert.isTrue(mwbot.Template.is(obj, type));
};

/**
 * Asserts that all objects in the given array are instances of a parsed template class.
 *
 * @template {keyof TemplateTypeMap} T
 * @param {TestMwbot} mwbot
 * @param {unknown[]} arr
 * @param {T} type
 * @returns {asserts arr is TemplateTypeMap[T][]}
 */
function assertTemplateInstanceOfAll(mwbot, arr, type) {
	for (const obj of arr) {
		assert.isTrue(mwbot.Template.is(obj, type));
	}
};

/**
 * @typedef {import('../../../dist/index.js').DoubleBracketedClasses} DoubleBracketedClasses
 * @typedef {import('../../../dist/index.js').ParsedTemplatePropsBase} ParsedTemplatePropsBase
 * @typedef {import('../../../dist/index.js').ParseResultBase} ParseResultBase
 */
/**
 * @param {ParsedTemplatePropsBase & ParseResultBase} instance
 * @param {ParsedTemplatePropsBase & ParseResultBase} props
 */
function assertParseResultProperties(instance, props) {
	assert.strictEqual(instance.text, props.text);
	assert.strictEqual(instance.nestLevel, props.nestLevel);
	assert.strictEqual(instance.startIndex, props.startIndex);
	assert.strictEqual(instance.endIndex, props.endIndex);
	assert.strictEqual(instance.skip, props.skip);
	assert.strictEqual(instance.index, props.index);
	assert.strictEqual(instance.parent, props.parent);
	assert.deepEqual(Array.from(instance.children), Array.from(props.children));
}

/**
 * @param {() => TestMwbot} getMwbot
 * @param {'ParsedTemplate' | 'RawTemplate'} type
 */
function testRawTitleProperty(getMwbot, type) {

	const title = type === 'ParsedTemplate'
		? 'Foo'
		: '##';
	const rawPropName = 'rawTitle';

	const data = {
		whitespace: {
			name: 'should preserve leading and trailing whitespace',
			input: `{{  ${title}  }}`,
			output: `  ${title}  `,
		},
		commentLeft: {
			name: 'should preserve comments on the left side of the title',
			input: `{{ <!-- --> ${title} }}`,
			output: ` <!-- --> ${title} `,
		},
		commentInside: {
			name: 'should preserve comments inside the title',
			input: `{{ ${title.slice(0, 1)}<!-- -->${title.slice(1)} }}`,
			output: ` ${title.slice(0, 1)}<!-- -->${title.slice(1)} `,
		},
		commentRight: {
			name: 'should preserve comments on the right side of the title',
			input: `{{ ${title} <!-- --> }}`,
			output: ` ${title} <!-- --> `,
		},
	};

	it(data.whitespace.name, () => {
		const mwbot = getMwbot();
		const [tpl] = new mwbot.Wikitext(data.whitespace.input).parseTemplates();

		assertTemplateInstanceOf(mwbot, tpl, type);
		assert.propertyVal(tpl, rawPropName, data.whitespace.output);
	});

	it(data.commentLeft.name, () => {
		const mwbot = getMwbot();
		const [tpl] = new mwbot.Wikitext(data.commentLeft.input).parseTemplates();

		assertTemplateInstanceOf(mwbot, tpl, type);
		assert.propertyVal(tpl, rawPropName, data.commentLeft.output);
	});

	it(data.commentInside.name, function () {
		const mwbot = getMwbot();
		const [tpl] = new mwbot.Wikitext(data.commentInside.input).parseTemplates();

		assertTemplateInstanceOf(mwbot, tpl, type);
		assert.propertyVal(tpl, rawPropName, data.commentInside.output);
		if (typeof tpl.title === 'string') {
			// RawTemplate.title is not automatically trimmed
			assert.strictEqual(tpl.title.trim(), title);
		} else {
			assert.strictEqual(tpl.title.getMain(), title);
		}
	});

	it(data.commentRight.name, () => {
		const mwbot = getMwbot();
		const [tpl] = new mwbot.Wikitext(data.commentRight.input).parseTemplates();

		assertTemplateInstanceOf(mwbot, tpl, type);
		assert.propertyVal(tpl, rawPropName, data.commentRight.output);
	});
};

const testRawTitleStringifyFixtures = [
	{
		unmodified: 'should output the unmodified rawTitle',
		modified: 'should output the modified rawTitle',
	},
	{
		unmodified: 'should output the unmodified rawTitle with a comment tag on the left side',
		modified: 'should output the modified rawTitle with a comment tag on the left side',
	},
	{
		unmodified: 'should output the unmodified rawTitle with a comment tag intervening',
		modified: 'should output the modified rawTitle with intervening comment tags discarded',
	},
	{
		unmodified: 'should output the unmodified rawTitle with a comment tag on the right side',
		modified: 'should output the modified rawTitle with a comment tag on the right side',
	},
	{
		unmodified: 'should output the unmodified rawTitle with comment tags on both sides',
		modified: 'should output the modified rawTitle with comment tags on both sides',
	},
];

/**
 * @typedef {Pick<TemplateTypeMap, 'ParsedTemplate' | 'RawTemplate' | 'ParsedParserFunction'>} ParsedTemplateTypeMap
 */
/**
 * @template {keyof ParsedTemplateTypeMap} T
 * @typedef {object} RawTitleTestData
 * @property {string} input
 * @property {(instance: ParsedTemplateTypeMap[T]) => any} [modify]
 * @property {string} [output]
 */
/**
 * @template {keyof ParsedTemplateTypeMap} T
 * @param {() => TestMwbot} getMwbot
 * @param {RawTitleTestData<T>[]} data
 * @param {T} type
 * @param {keyof ParsedTemplateTypeMap} [modifiedType]
 */
function testRawTitleStringify(getMwbot, data, type, modifiedType) {
	modifiedType ??= type;
	const rawOutputConfig = modifiedType === 'ParsedParserFunction'
		? { rawHook: true }
		: { rawTitle: true };

	for (const [i, { input, modify, output }] of data.entries()) {

		if (i > 2 && type === 'ParsedParserFunction') {
			return;
		}

		const fixture = testRawTitleStringifyFixtures[i];
		const desc = modify ? fixture.modified : fixture.unmodified;

		it(desc, function () {
			const mwbot = getMwbot();
			let [inst] = new mwbot.Wikitext(input).parseTemplates();

			assertTemplateInstanceOf(mwbot, inst, type);

			const ret = modify?.(inst);
			inst = typeof ret === 'object' && ret !== null ? ret : inst;

			assert.strictEqual(
				inst.stringify(rawOutputConfig),
				modify ? output : input
			);
		});
	}
}
