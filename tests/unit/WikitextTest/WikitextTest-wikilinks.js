import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { getTestMwbot } from '../MwbotTest/MwbotTest-fixtures.js';

export function testWikitextWikilinks() {
	describe('Wikilink methods', function () {
		/**
		 * @type {Awaited<ReturnType<getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		describe('_parseWikilinksFuzzy()', function () {
			it('should return an empty array when no wikilinks exist', function () {
				const wt = new mwbot.Wikitext('Foo');

				// @ts-expect-error - Calling a private method
				assert.deepEqual(wt._parseWikilinksFuzzy(), []);
			});

			it('should parse a simple wikilink', function () {
				const wt = new mwbot.Wikitext('[[Foo]]');

				// @ts-expect-error - Calling a private method
				const links = wt._parseWikilinksFuzzy();

				assert.lengthOf(links, 1);
				assert.deepInclude(links[0], {
					title: 'Foo',
					rawTitle: 'Foo',
					right: null,
					text: '[[Foo]]',
					startIndex: 0,
					endIndex: 7,
					nestLevel: 0,
					skip: false,
				});
			});

			it('should parse a wikilink with display text', function () {
				const wt = new mwbot.Wikitext('[[Foo|Bar]]');

				// @ts-expect-error - Calling a private method
				const link = wt._parseWikilinksFuzzy()[0];

				assert.strictEqual(link.title, 'Foo');
				assert.strictEqual(link.rawTitle, 'Foo');
				assert.strictEqual(link.right, 'Bar');
			});

			it('should treat an empty display text as null', function () {
				const wt = new mwbot.Wikitext('[[Foo|]]');

				// @ts-expect-error - Calling a private method
				const link = wt._parseWikilinksFuzzy()[0];

				assert.strictEqual(link.title, 'Foo');
				assert.strictEqual(link.rawTitle, 'Foo');
				assert.strictEqual(link.right, null);
			});

			it('should exclude parameters from the title while preserving them in rawTitle', function () {
				const wt = new mwbot.Wikitext('[[Foo{{{1}}}Bar]]');

				// @ts-expect-error - Calling a private method
				const link = wt._parseWikilinksFuzzy()[0];

				assert.strictEqual(link.title, 'FooBar');
				assert.strictEqual(link.rawTitle, 'Foo{{{1}}}Bar');
			});

			it('should exclude skip tags from the title while preserving them in rawTitle', function () {
				const wt = new mwbot.Wikitext(
					'[[Foo<nowiki>[[</nowiki>Bar]]'
				);

				// @ts-expect-error - Calling a private method
				const link = wt._parseWikilinksFuzzy()[0];

				assert.strictEqual(link.title, 'FooBar');
				assert.strictEqual(link.rawTitle, 'Foo<nowiki>[[</nowiki>Bar');
			});

			it('should recursively parse wikilinks inside parameters', function () {
				const wt = new mwbot.Wikitext(
					'{{{1|[[Foo]]}}}'
				);

				// @ts-expect-error - Calling a private method
				const links = wt._parseWikilinksFuzzy();

				assert.lengthOf(links, 1);
				assert.strictEqual(links[0].title, 'Foo');
			});

			it('should recursively parse wikilinks inside skip tags', function () {
				const wt = new mwbot.Wikitext(
					'<nowiki>[[Foo]]</nowiki>'
				);

				// @ts-expect-error - Calling a private method
				const links = wt._parseWikilinksFuzzy();

				assert.lengthOf(links, 1);
				assert.strictEqual(links[0].title, 'Foo');
			});

			it('should mark wikilinks inside skip tags', function () {
				const wt = new mwbot.Wikitext(
					'<nowiki>[[Foo]]</nowiki> [[Bar]]'
				);

				// @ts-expect-error - Calling a private method
				const links = wt._parseWikilinksFuzzy();

				assert.isTrue(links[0].skip);
				assert.isFalse(links[1].skip);
			});

			it('should parse nested wikilinks', function () {
				const wt = new mwbot.Wikitext(
					'[[A [[B]]]]'
				);

				// @ts-expect-error - Calling a private method
				const links = wt._parseWikilinksFuzzy();

				assert.lengthOf(links, 2);
				assert.deepInclude(links[0], {
					title: 'A ',
					nestLevel: 0,
					startIndex: 0,
					endIndex: 11,
				});
				assert.deepInclude(links[1], {
					title: 'B',
					nestLevel: 1,
					startIndex: 4,
					endIndex: 9,
				});
			});

			it('should preserve source ranges', function () {
				const wt = new mwbot.Wikitext(
					'[[Foo]] [[Bar|Baz]]'
				);

				// @ts-expect-error - Calling a private method
				const links = wt._parseWikilinksFuzzy();

				for (const link of links) {
					assert.strictEqual(
						link.text,
						wt.content.slice(link.startIndex, link.endIndex)
					);
				}
			});

			it('should handle multiple parameters and skip tags in the title', function () {
				const wt = new mwbot.Wikitext(
					'[[A{{{1}}}B<nowiki>x</nowiki>C{{{2}}}D|Display]]'
				);

				// @ts-expect-error - Calling a private method
				const link = wt._parseWikilinksFuzzy()[0];

				assert.strictEqual(link.title, 'ABCD');
				assert.strictEqual(
					link.rawTitle,
					'A{{{1}}}B<nowiki>x</nowiki>C{{{2}}}D'
				);
				assert.strictEqual(link.right, 'Display');
			});

			it('should preserve parameters in rawTitle after nested parsing', function () {
				const wt = new mwbot.Wikitext(
					'[[Foo{{{1|[[Bar]]}}}Baz]]'
				);

				// @ts-expect-error - Calling a private method
				const links = wt._parseWikilinksFuzzy();

				assert.lengthOf(links, 2);

				assert.strictEqual(links[0].title, 'FooBaz');
				assert.strictEqual(
					links[0].rawTitle,
					'Foo{{{1|[[Bar]]}}}Baz'
				);

				assert.strictEqual(links[1].title, 'Bar');
				assert.strictEqual(links[1].nestLevel, 0);
			});
		});
	});
}