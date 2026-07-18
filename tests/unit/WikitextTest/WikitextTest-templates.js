import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { getTestMwbot } from '../MwbotTest/MwbotTest-fixtures.js';
import { MwbotError } from '../../../dist/index.js';

/**
 * @typedef {import('../../../dist/index.js').ParsedTemplate} ParsedTemplate
 * @typedef {import('../../../dist/index.js').RawTemplate} RawTemplate
 * @typedef {import('../../../dist/index.js').ParsedParserFunction} ParsedParserFunction
 */

export function testWikitextTemplates() {
	describe('Templates', function () {
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

		/**
		 * @typedef {import('../../../dist/index.js').TemplateTypeMap} TemplateTypeMap
		 */
		/**
		 * @template {keyof TemplateTypeMap} T
		 * @param {unknown} obj
		 * @param {T} type
		 * @returns {asserts obj is TemplateTypeMap[T]}
		 */
		const assertTemplateInstanceOf = (obj, type) => {
			assert.isTrue(mwbot.Template.is(obj, type));
		};

		/**
		 * @template {keyof TemplateTypeMap} T
		 * @param {unknown[]} arr
		 * @param {T} type
		 * @returns {asserts arr is TemplateTypeMap[T][]}
		 */
		const assertTemplateInstanceOfAll = (arr, type) => {
			for (const obj of arr) {
				assert.isTrue(mwbot.Template.is(obj, type));
			}
		};

		describe('parseTemplates()', function () {
			describe('basic parsing', function () {
				it('should parse a template', function () {
					const templates = new mwbot.Wikitext('{{Foo|a=1|2}}').parseTemplates();

					assert.lengthOf(templates, 1);

					const tpl = templates[0];

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');
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

					assertTemplateInstanceOf(tpl, 'RawTemplate');
					assert.strictEqual(tpl.title, '<>');
				});

				it('should parse a parser function', function () {
					const templates = new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates();

					assert.lengthOf(templates, 1);

					const pf = templates[0];

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');
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

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');
					assertTemplateInstanceOf(raw, 'RawTemplate');
					assertTemplateInstanceOf(ppf, 'ParsedParserFunction');

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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');
					assert.strictEqual(templates[0].title.getMain(), 'Foo');
					assert.strictEqual(templates[1].title.getMain(), 'Bar');
				});

				describe('.skip', function () {
					it('should mark parsed templates inside skip tags', () => {
						const text = '<nowiki>{{Foo}}</nowiki>{{Bar}}';
						const templates = new mwbot.Wikitext(text).parseTemplates();

						assert.lengthOf(templates, 2);
						assertTemplateInstanceOfAll(templates, 'ParsedTemplate');
						assert.isTrue(templates[0].skip);
						assert.isFalse(templates[1].skip);
					});

					it('should mark raw templates inside skip tags', () => {
						const text = '<nowiki>{{<>}}</nowiki>{{<>}}';
						const templates = new mwbot.Wikitext(text).parseTemplates();

						assert.lengthOf(templates, 2);
						assertTemplateInstanceOfAll(templates, 'RawTemplate');
						assert.isTrue(templates[0].skip);
						assert.isFalse(templates[1].skip);
					});

					it('should mark parsed parser functions inside skip tags', () => {
						const text = '<nowiki>{{#if:1|2}}</nowiki>{{#if:1|2}}';
						const templates = new mwbot.Wikitext(text).parseTemplates();

						assert.lengthOf(templates, 2);
						assertTemplateInstanceOfAll(templates, 'ParsedParserFunction');
						assert.isTrue(templates[0].skip);
						assert.isFalse(templates[1].skip);
					});
				});

				it('should initialize nesting relationships', () => {
					const text = '{{Foo|{{<>|{{#if:1|2|3}}}}}}';
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 3);

					const [tpl, raw, ppf] = templates;

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');
					assertTemplateInstanceOf(raw, 'RawTemplate');
					assertTemplateInstanceOf(ppf, 'ParsedParserFunction');

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
					assertTemplateInstanceOf(templates[0], 'ParsedTemplate');
					assert.strictEqual(
						templates[0].title.getPrefixedDb(),
						'Template:FooBar'
					);
				});

				it('should preserve parameters in raw template titles', function () {
					const templates = new mwbot.Wikitext('{{{{{1}}}}}').parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(templates[0], 'RawTemplate');
					assert.strictEqual(
						templates[0].title,
						'{{{1}}}'
					);
				});

				it('should preserve wikilinks in raw template titles', function () {
					const templates = new mwbot.Wikitext('{{[[Foo]]}}').parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(templates[0], 'RawTemplate');
					assert.strictEqual(
						templates[0].title,
						'[[Foo]]'
					);
				});

				it('should preserve HTML tags in raw template titles', function () {
					const templates = new mwbot.Wikitext('{{<span>Foo</span>}}').parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(templates[0], 'RawTemplate');
					assert.strictEqual(
						templates[0].title,
						'<span>Foo</span>'
					);
				});

				it('should preserve parser extension tags in raw template titles', function () {
					const templates = new mwbot.Wikitext('{{Foo<nowiki>Bar</nowiki>}}').parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(templates[0], 'RawTemplate');
					assert.strictEqual(
						templates[0].title,
						'Foo<nowiki>Bar</nowiki>'
					);
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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');

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

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');
					assertTemplateInstanceOf(bar, 'ParsedTemplate');

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

					assertTemplateInstanceOf(bar, 'ParsedTemplate');

					assert.strictEqual(bar.params['1'].value, 'x');
				});

				it('should parse templates inside standalone gallery tags', function () {
					const text =
						'<gallery>\n' +
						'A|{{Bar|1=x}}\n' +
						'</gallery>';
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOf(templates[0], 'ParsedTemplate');
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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');

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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');

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

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');
					assertTemplateInstanceOf(bar, 'ParsedTemplate');

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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');

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
					assertTemplateInstanceOf(templates[0], 'ParsedTemplate');
				});

				it('should parse {{=}} in template parameters correctly', function () {
					const value = 'bar{{=}}baz';
					const text = `{{Foo|${value}}}`;
					const templates = new mwbot.Wikitext(text).parseTemplates();

					assert.lengthOf(templates, 2);
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');
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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');
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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');
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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');
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
					assertTemplateInstanceOfAll(templates, 'ParsedParserFunction');
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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');
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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');
					assert.strictEqual(templates[0].parent, 0);
					assert.deepEqual([...templates[0].children], [2]);
				});
			});
		});

		/**
		 * @typedef {import('../../../dist/index.js').DoubleBracketedClasses} DoubleBracketedClasses
		 * @typedef {import('../../../dist/index.js').ParsedTemplatePropsBase} ParsedTemplatePropsBase
		 * @typedef {import('../../../dist/index.js').ParseResultBase} ParseResultBase
		 */
		/**
		 * @param {ParsedTemplatePropsBase & ParseResultBase} instance
		 * @param {ParsedTemplatePropsBase & ParseResultBase} props
		 */
		const assertParseResultProperties = (instance, props) => {
			assert.strictEqual(instance.text, props.text);
			assert.strictEqual(instance.nestLevel, props.nestLevel);
			assert.strictEqual(instance.startIndex, props.startIndex);
			assert.strictEqual(instance.endIndex, props.endIndex);
			assert.strictEqual(instance.skip, props.skip);
			assert.strictEqual(instance.index, props.index);
			assert.strictEqual(instance.parent, props.parent);
			assert.deepEqual(Array.from(instance.children), Array.from(props.children));
		};

		/**
		 * @param {'ParsedTemplate' | 'RawTemplate'} type
		 */
		const testRawTitle = (type) => {
			const title = type === 'ParsedTemplate'
				? 'Foo'
				: '<>';
			const data = {
				whitespace: {
					name: 'should preserve leading and trailing whitespace',
					input: `{{  ${title}  }}`,
					output: `  ${title}  `,
				},
				commentLeft: {
					name: 'should preserve comments on the left side of the title',
					input: `{{<!-- --> ${title}}}`,
					output: `<!-- --> ${title}`,
				},
				commentInside: {
					name: 'should preserve comments inside the title',
					input: `{{${title.slice(0, 1)}<!-- -->${title.slice(1)}}}`,
					output: `${title.slice(0, 1)}<!-- -->${title.slice(1)}`,
				},
				commentRight: {
					name: 'should preserve comments on the right side of the title',
					input: `{{${title} <!-- -->}}`,
					output: `${title} <!-- -->`,
				},
			};

			it(data.whitespace.name, () => {
				const [tpl] = new mwbot.Wikitext(data.whitespace.input).parseTemplates();

				assertTemplateInstanceOf(tpl, type);
				assert.strictEqual(tpl.rawTitle, data.whitespace.output);
			});

			it(data.commentLeft.name, () => {
				const [tpl] = new mwbot.Wikitext(data.commentLeft.input).parseTemplates();

				assertTemplateInstanceOf(tpl, type);
				assert.strictEqual(tpl.rawTitle, data.commentLeft.output);
			});

			it(data.commentInside.name, function () {
				if (type === 'RawTemplate') {
					this.skip();
				}
				const [tpl] = new mwbot.Wikitext(data.commentInside.input).parseTemplates();

				assertTemplateInstanceOf(tpl, type);
				assert.strictEqual(tpl.rawTitle, data.commentInside.output);
				assert.strictEqual(
					typeof tpl.title === 'string' ? tpl.title : tpl.title.getMain(),
					title
				);
			});

			it(data.commentRight.name, () => {
				const [tpl] = new mwbot.Wikitext(data.commentRight.input).parseTemplates();

				assertTemplateInstanceOf(tpl, type);
				assert.strictEqual(tpl.rawTitle, data.commentRight.output);
			});
		};

		describe('ParsedTemplate', function () {
			describe('constructor', function () {
				it('should parse a template title', () => {
					const templates = new mwbot.Wikitext('{{Template:Foo|1=Bar|baz=Qux}}').parseTemplates();

					assert.lengthOf(templates, 1);
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');

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

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');
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
					testRawTitle('ParsedTemplate');

					it('should preserve redundant namespace prefixes', () => {
						const [tpl] = new mwbot.Wikitext('{{Template:Foo}}').parseTemplates();

						assertTemplateInstanceOf(tpl, 'ParsedTemplate');
						assert.strictEqual(
							tpl.rawTitle,
							'Template:Foo'
						);
					});

					it('should preserve redundant leading colons', () => {
						const [tpl] = new mwbot.Wikitext('{{:Template:Foo}}').parseTemplates();

						assertTemplateInstanceOf(tpl, 'ParsedTemplate');
						assert.strictEqual(
							tpl.rawTitle,
							':Template:Foo'
						);
					});
				});
			});

			describe('toParserFunction()', function () {
				it.skip('should convert to ParsedParserFunction', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo|1|2}}').parseTemplates();

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');

					const ppf = tpl.toParserFunction('#if:test');

					assertTemplateInstanceOf(ppf, 'ParsedParserFunction');
					assert.strictEqual(ppf.hook, '#if:');
					assert.deepEqual(ppf.params, [
						'test',
						'1',
						'2',
					]);
				});

				it('should return null when converting to an invalid parser function', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo}}').parseTemplates();

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');
					assert.isNull(
						tpl.toParserFunction('invalid:')
					);
				});

				it('should log errors on conversion failure', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo}}').parseTemplates();

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');

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

				it.skip('should not use modified properties when converting', () => {
					const wkt = new mwbot.Wikitext('{{Foo|bar}}');
					const [tpl] = wkt.parseTemplates();

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');

					tpl.setTitle('Modified');
					const ppf = tpl.toParserFunction('#if:test');

					assertTemplateInstanceOf(ppf, 'ParsedParserFunction');
					assert.strictEqual(
						ppf.params[1],
						'bar'
					);
					assert.strictEqual(
						ppf.stringify(),
						'{{#if:test|bar}}'
					);
				});
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
					assertTemplateInstanceOfAll(templates, 'ParsedTemplate');

					const reparsed = new mwbot.Wikitext(templates[0].stringify()).parseTemplates();

					assert.strictEqual(
						reparsed[0].stringify(),
						templates[0].stringify()
					);
				});

				it('should stringify modified templates', () => {
					const [tpl] = new mwbot.Wikitext('{{Foo|bar}}').parseTemplates();

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');

					tpl.setTitle('Bar');

					assert.strictEqual(
						tpl.stringify(),
						'{{Bar|bar}}'
					);
				});

				it.skip('preserves rawTitle when requested', () => {
					const text = '{{ <!-- --> Foo |bar}}';
					const [tpl] = new mwbot.Wikitext(text).parseTemplates();

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');
					tpl.setTitle('Template:Bar');
					assert.strictEqual(
						tpl.stringify({ rawTitle: true }),
						'{{ <!-- --> Bar |bar}}'
					);
				});
			});

			describe('toString()', function () {
				it('should return the same value as stringify()', () => {
					const [tpl] =
						new mwbot.Wikitext('{{Foo|bar}}').parseTemplates();

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');

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

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');
					assertTemplateInstanceOf(clone, 'ParsedTemplate');

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

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');

					const clone = tpl._clone();

					assertParseResultProperties(clone, tpl);
				});
			});
		});

		describe('RawTemplate', function () {
			describe('constructor', function () {
				it('should parse a template title', () => {
					const [tpl] = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assertTemplateInstanceOf(tpl, 'RawTemplate');

					assert.strictEqual(tpl.title, '<>');
					assert.strictEqual(tpl.rawTitle, '<>');
				});

				it('should initialize parse result properties', () => {
					const text = '{{<>}}';
					const [tpl] = new mwbot.Wikitext(text).parseTemplates();

					assertTemplateInstanceOf(tpl, 'RawTemplate');
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
					testRawTitle('RawTemplate');

					it('should preserve mixed markup in raw titles', () => {
						const [tpl] = new mwbot.Wikitext(
							'{{[[Foo]]<!--x--><nowiki>bar</nowiki>{{{1}}}}}'
						).parseTemplates();

						assertTemplateInstanceOf(tpl, 'RawTemplate');

						assert.strictEqual(
							tpl.rawTitle,
							'[[Foo]]<!--x--><nowiki>bar</nowiki>{{{1}}}'
						);
					});
				});
			});

			describe('stringify()', function () {
				it('should reproduce the original wikitext', () => {
					const text = '{{{{{1}}}}}';
					const [tpl] = new mwbot.Wikitext(text).parseTemplates();

					assertTemplateInstanceOf(tpl, 'RawTemplate');
					assert.strictEqual(
						tpl.stringify(),
						text
					);
				});
			});

			describe('toString()', function () {
				it('should return the same value as stringify()', () => {
					const [tpl] = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assertTemplateInstanceOf(tpl, 'RawTemplate');
					assert.strictEqual(
						tpl.toString(),
						tpl.stringify()
					);
				});
			});

			describe('_clone()', function () {
				it('should return an independent clone', () => {
					const [tpl] = new mwbot.Wikitext('{{<>}}').parseTemplates();

					assertTemplateInstanceOf(tpl, 'RawTemplate');

					const clone = tpl._clone();

					assertTemplateInstanceOf(clone, 'RawTemplate');

					assert.notStrictEqual(clone, tpl);
					assert.strictEqual(
						clone.title,
						tpl.title
					);
					assertParseResultProperties(
						clone,
						tpl
					);
				});
			});
		});

		describe('ParsedParserFunction', function () {
			describe('constructor', function () {
				it('should parse a parser function hook', () => {
					const [pf] = new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates();

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');

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

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');
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
					it.skip('should preserve leading whitespace', function () {
						const [pf] = new mwbot.Wikitext(
							'{{ #if:1|yes|no}}'
						).parseTemplates();

						assertTemplateInstanceOf(pf, 'ParsedParserFunction');

						assert.strictEqual(pf.hook, '#if:');
						assert.strictEqual(pf.rawHook, ' #if:');
					});

					it.skip('should preserve comments on the left side of the function hook', function () {
						const [pf] = new mwbot.Wikitext(
							'{{<!-- -->#if:1|yes|no}}'
						).parseTemplates();

						assertTemplateInstanceOf(pf, 'ParsedParserFunction');

						assert.strictEqual(pf.hook, '#if:');
						assert.strictEqual(pf.rawHook, '<!-- -->#if:');
					});

					it.skip('should preserve comments inside the function hook', () => {
						const [pf] = new mwbot.Wikitext(
							'{{#if<!-- -->:1|yes|no}}'
						).parseTemplates();

						assertTemplateInstanceOf(pf, 'ParsedParserFunction');

						assert.strictEqual(pf.hook, '#if:');
						assert.strictEqual(pf.rawHook, '#if<!-- -->:');
					});
				});
			});

			describe('toTemplate()', function () {
				it.skip('should convert to ParsedTemplate', () => {
					const [pf] = new mwbot.Wikitext('{{#if:test|1|2}}').parseTemplates();

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');

					const tpl = pf.toTemplate('Foo');

					assertTemplateInstanceOf(tpl, 'ParsedTemplate');

					assert.strictEqual(
						tpl.title.getMain(),
						'Foo'
					);
				});

				it('should return null when converting to an invalid template title', () => {
					const [pf] = new mwbot.Wikitext('{{#if:test}}').parseTemplates();

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');

					assert.isNull(
						pf.toTemplate('<>')
					);
				});
			});

			describe('stringify()', function () {
				it('should reproduce the original wikitext', () => {
					const text = '{{#if:1|yes|no}}';
					const [pf] = new mwbot.Wikitext(text).parseTemplates();

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');

					assert.strictEqual(
						pf.stringify(),
						text
					);
				});

				it.skip('should stringify modified parser functions', () => {
					const [pf] = new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates();

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');

					pf.setHook('#bcp47:');

					assert.strictEqual(
						pf.stringify(),
						'{{#bcp47:1|yes|no}}'
					);
				});

				it.skip('should preserve rawHook when requested', () => {
					const text = '{{<!-- -->#if:1|yes|no}}';
					const [pf] = new mwbot.Wikitext(text).parseTemplates();

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');

					assert.strictEqual(
						pf.stringify({ rawHook: true }),
						text
					);
				});
			});

			describe('toString()', function () {
				it('should return the same value as stringify()', () => {
					const [pf] = new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates();

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');

					assert.strictEqual(
						pf.toString(),
						pf.stringify()
					);
				});
			});

			describe('_clone()', function () {
				it('should return an independent clone', () => {
					const [pf] = new mwbot.Wikitext('{{#if:1|yes|no}}').parseTemplates();

					assertTemplateInstanceOf(pf, 'ParsedParserFunction');

					const clone = pf._clone();

					assertTemplateInstanceOf(clone, 'ParsedParserFunction');
					assert.notStrictEqual(clone, pf);
					assert.deepEqual(clone.params, pf.params);
					assertParseResultProperties(clone, pf);
				});
			});
		});
	});
}
