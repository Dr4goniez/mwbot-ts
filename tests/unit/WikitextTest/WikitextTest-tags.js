import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { getTestMwbot } from '../MwbotTest/MwbotTest-fixtures.js';

export function testWikitextTags() {
	describe('Tag methods', function () {
		/**
		 * @type {Awaited<ReturnType<getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		describe('getValidTags()', function () {
			it('should return a Set of recognized tag names by default', function () {
				const tags = mwbot.Wikitext.getValidTags();

				assert.instanceOf(tags, Set);
				assert.isTrue(tags.has('div'));
				assert.isTrue(tags.has('br'));
				assert.isTrue(tags.has('nowiki'));
			});

			it('should return void tags', function () {
				assert.sameMembers(
					[...mwbot.Wikitext.getValidTags('void')],
					['br', 'wbr', 'hr', 'meta', 'link']
				);
			});

			it('should return parser extension tags', function () {
				const tags = mwbot.Wikitext.getValidTags('extension');

				assert.isTrue(tags.has('pre'));
				assert.isTrue(tags.has('nowiki'));
				assert.isFalse(tags.has('div'));
			});

			it('should return self-closing tags', function () {
				const tags = mwbot.Wikitext.getValidTags('selfClosing');

				assert.isTrue(tags.has('br'));
				assert.isTrue(tags.has('li'));
				assert.isTrue(tags.has('pre'));
				assert.isFalse(tags.has('div'));
			});

			it('should return closeable tags', function () {
				const tags = mwbot.Wikitext.getValidTags('closeable');

				assert.isTrue(tags.has('div'));
				assert.isTrue(tags.has('li'));
				assert.isTrue(tags.has('pre'));
				assert.isFalse(tags.has('br'));
			});

			it('should return skip tags', function () {
				const tags = mwbot.Wikitext.getValidTags('skip');

				assert.isTrue(tags.has('!--'));
				assert.isTrue(tags.has('nowiki'));
				assert.isTrue(tags.has('pre'));
				assert.isFalse(tags.has('div'));
			});

			it('should not allow modifications to affect future results', function () {
				const tags = mwbot.Wikitext.getValidTags();

				// @ts-expect-error - Modifying a read-only Set
				tags.delete('div');

				assert.isFalse(tags.has('div'));
				assert.isTrue(mwbot.Wikitext.isValidTag('div'));
				assert.isTrue(mwbot.Wikitext.getValidTags().has('div'));
			});
		});

		describe('isValidTag()', function () {
			it('should return true for recognized tag names', function () {
				assert.isTrue(mwbot.Wikitext.isValidTag('div'));
				assert.isTrue(mwbot.Wikitext.isValidTag('br'));
				assert.isTrue(mwbot.Wikitext.isValidTag('nowiki'));
			});

			it('should validate void tags', function () {
				assert.isTrue(mwbot.Wikitext.isValidTag('br', 'void'));
				assert.isFalse(mwbot.Wikitext.isValidTag('div', 'void'));
			});

			it('should validate parser extension tags', function () {
				assert.isTrue(mwbot.Wikitext.isValidTag('pre', 'extension'));
				assert.isFalse(mwbot.Wikitext.isValidTag('div', 'extension'));
			});

			it('should validate self-closing tags', function () {
				assert.isTrue(mwbot.Wikitext.isValidTag('li', 'selfClosing'));
				assert.isTrue(mwbot.Wikitext.isValidTag('pre', 'selfClosing'));
				assert.isFalse(mwbot.Wikitext.isValidTag('div', 'selfClosing'));
			});

			it('should validate closeable tags', function () {
				assert.isTrue(mwbot.Wikitext.isValidTag('div', 'closeable'));
				assert.isTrue(mwbot.Wikitext.isValidTag('li', 'closeable'));
				assert.isTrue(mwbot.Wikitext.isValidTag('pre', 'closeable'));
				assert.isFalse(mwbot.Wikitext.isValidTag('br', 'closeable'));
			});

			it('should validate skip tags', function () {
				assert.isTrue(mwbot.Wikitext.isValidTag('!--', 'skip'));
				assert.isTrue(mwbot.Wikitext.isValidTag('nowiki', 'skip'));
				assert.isTrue(mwbot.Wikitext.isValidTag('pre', 'skip'));
				assert.isFalse(mwbot.Wikitext.isValidTag('div', 'skip'));
			});

			it('should be case-insensitive', function () {
				assert.isTrue(mwbot.Wikitext.isValidTag('DIV'));
				assert.isTrue(mwbot.Wikitext.isValidTag('Br'));
				assert.isTrue(mwbot.Wikitext.isValidTag('NoWiki'));
			});

			it('should return false for unsupported tag names', function () {
				assert.isFalse(mwbot.Wikitext.isValidTag('foobar'));
				assert.isFalse(mwbot.Wikitext.isValidTag(''));
			});

			it('should coerce the input to a string', function () {
				assert.isFalse(
					// @ts-expect-error - Testing runtime behavior
					mwbot.Wikitext.isValidTag(null)
				);

				assert.isFalse(
					// @ts-expect-error - Testing runtime behavior
					mwbot.Wikitext.isValidTag({})
				);

				assert.isFalse(
					// @ts-expect-error - Testing runtime behavior
					mwbot.Wikitext.isValidTag(123)
				);
			});
		});

		describe('parseTags()', function () {
			it('should return an empty array when no tags exist', function () {
				const wkt = new mwbot.Wikitext('Foo');

				assert.deepEqual(wkt.parseTags(), []);
			});

			it('should parse a normal HTML tag', function () {
				const wkt = new mwbot.Wikitext('<div>Foo</div>');
				const tags = wkt.parseTags();

				assert.lengthOf(tags, 1);

				assert.include(tags[0], {
					name: 'div',
					start: '<div>',
					content: 'Foo',
					end: '</div>',
					text: '<div>Foo</div>',
					void: false,
					unclosed: false,
					selfClosing: false,
					skip: false,
					nestLevel: 0,
					index: 0,
				});
			});

			it('should normalize tag names to lowercase', function () {
				const wkt = new mwbot.Wikitext('<DIV>Foo</DIV>');
				const [tag] = wkt.parseTags();

				assert.strictEqual(tag.name, 'div');
			});

			it('should parse nested tags', function () {
				const wkt = new mwbot.Wikitext('<div><span>Foo</span></div>');
				const tags = wkt.parseTags();

				assert.lengthOf(tags, 2);

				assert.strictEqual(tags[0].name, 'div');
				assert.strictEqual(tags[1].name, 'span');

				assert.strictEqual(tags[0].index, 0);
				assert.strictEqual(tags[1].index, 1);

				assert.strictEqual(tags[0].nestLevel, 0);
				assert.strictEqual(tags[1].nestLevel, 1);

				assert.isNull(tags[0].parent);
				assert.strictEqual(tags[1].parent, 0);

				assert.deepEqual([...tags[0].children], [1]);
				assert.deepEqual([...tags[1].children], []);
			});

			it('should supplement an end tag for an unclosed tag', function () {
				const wkt = new mwbot.Wikitext('<div>Foo');
				const [tag] = wkt.parseTags();

				assert.strictEqual(tag.name, 'div');
				assert.isTrue(tag.unclosed);
				assert.strictEqual(tag.end, '</div>');
				assert.strictEqual(tag.text, '<div>Foo');
			});

			it('should supplement end tags for implicitly closed nested tags', function () {
				const wkt = new mwbot.Wikitext('<div><span>Foo</div>');
				const tags = wkt.parseTags();

				assert.lengthOf(tags, 2);

				assert.strictEqual(tags[0].name, 'div');
				assert.isFalse(tags[0].unclosed);

				assert.strictEqual(tags[1].name, 'span');
				assert.isTrue(tags[1].unclosed);
				assert.strictEqual(tags[1].end, '</span>');
			});

			it('should ignore unmatched end tags', function () {
				const wkt = new mwbot.Wikitext('Foo</div>');
				const tags = wkt.parseTags();

				assert.deepEqual(tags, []);
			});

			it('should parse HTML comments', function () {
				const wkt = new mwbot.Wikitext('<!--Foo-->');
				const [tag] = wkt.parseTags();

				assert.include(tag, {
					name: '!--',
					start: '<!--',
					content: 'Foo',
					end: '-->',
					void: false,
					unclosed: false,
				});
			});

			it('should supplement an end marker for an unclosed HTML comment', function () {
				const wkt = new mwbot.Wikitext('<!--Foo');
				const [tag] = wkt.parseTags();

				assert.strictEqual(tag.name, '!--');
				assert.isTrue(tag.unclosed);
				assert.strictEqual(tag.end, '-->');
				assert.strictEqual(tag.text, '<!--Foo');
			});

			it('should recognize void tags', function () {
				const wkt = new mwbot.Wikitext('Foo<br>Bar');
				const [tag] = wkt.parseTags();

				assert.include(tag, {
					name: 'br',
					void: true,
					unclosed: false,
					selfClosing: false,
				});
			});

			it('should recognize self-closing void tags', function () {
				const wkt = new mwbot.Wikitext('<br />');
				const [tag] = wkt.parseTags();

				assert.isTrue(tag.void);
				assert.isTrue(tag.selfClosing);
			});

			it('should convert </br> into a void tag', function () {
				const wkt = new mwbot.Wikitext('</br>');
				const [tag] = wkt.parseTags();

				assert.strictEqual(tag.name, 'br');
				assert.isTrue(tag.void);
				assert.isFalse(tag.selfClosing);
			});

			it('should treat a self-closing non-void tag as unclosed', function () {
				const wkt = new mwbot.Wikitext('<span />Foo');
				const [tag] = wkt.parseTags();

				assert.include(tag, {
					name: 'span',
					selfClosing: true,
					unclosed: true,
					void: false,
					content: 'Foo',
					end: '</span>',
					text: '<span />Foo',
				});
			});

			it('should treat an unsupported self-closing tag as unclosed', function () {
				const wkt = new mwbot.Wikitext('<div />Foo');
				const [tag] = wkt.parseTags();

				assert.isTrue(tag.selfClosing);
				assert.isTrue(tag.unclosed);
			});

			it('should recognize parser extension tags', function () {
				const wkt = new mwbot.Wikitext('<nowiki>Foo</nowiki>');
				const [tag] = wkt.parseTags();

				assert.strictEqual(tag.name, 'nowiki');
				assert.isFalse(tag.void);
				assert.isFalse(tag.unclosed);
			});

			it('should treat a self-closing parser extension tag as closed', function () {
				const wkt = new mwbot.Wikitext('<nowiki />Foo');
				const [tag] = wkt.parseTags();

				assert.include(tag, {
					name: 'nowiki',
					content: null,
					end: '',
					unclosed: false,
					selfClosing: true,
				});
			});

			it('should not match a closing tag with a self-closing parser extension tag', function () {
				const wkt = new mwbot.Wikitext('<nowiki /></nowiki>');
				const tags = wkt.parseTags();

				assert.lengthOf(tags, 1);

				assert.include(tags[0], {
					name: 'nowiki',
					selfClosing: true,
					unclosed: false,
					end: '',
					text: '<nowiki />',
				});
			});

			it('should treat a self-closing HTML tag as closed when allowed', function () {
				const wkt = new mwbot.Wikitext('<li />');
				const [tag] = wkt.parseTags();

				assert.include(tag, {
					name: 'li',
					selfClosing: true,
					void: false,
					unclosed: false,
					content: null,
					end: '',
					text: '<li />',
				});
			});

			it('should not match a closing tag with a self-closing HTML tag', function () {
				const wkt = new mwbot.Wikitext('<li /></li>');
				const tags = wkt.parseTags();

				assert.lengthOf(tags, 1);

				assert.include(tags[0], {
					name: 'li',
					selfClosing: true,
					unclosed: false,
				});
			});

			it('should mark tags inside skip tags', function () {
				const wkt = new mwbot.Wikitext(
					'<nowiki><div>Foo</div></nowiki>'
				);

				const tags = wkt.parseTags();

				assert.isFalse(tags[0].skip);
				assert.isTrue(tags[1].skip);
			});

			it('should record tag positions', function () {
				const wkt = new mwbot.Wikitext('abc<div>Foo</div>xyz');
				const [tag] = wkt.parseTags();

				assert.strictEqual(tag.startIndex, 3);
				assert.strictEqual(tag.endIndex, 17);
			});

			it('should assign children', function () {
				const wkt = new mwbot.Wikitext(
					'<div><span></span><b></b></div>'
				);

				const tags = wkt.parseTags();

				assert.deepEqual([...tags[0].children], [1, 2]);
			});

			it('should ignore an extra closing tag', function () {
				const wkt = new mwbot.Wikitext(
					'<div></div></div>'
				);

				const tags = wkt.parseTags();

				assert.lengthOf(tags, 1);
			});

			it('should return tags in source order', function () {
				const wkt = new mwbot.Wikitext(
					'<div><span></div>'
				);

				const tags = wkt.parseTags();

				assert.deepEqual(
					tags.map(({ name }) => name),
					['div', 'span']
				);
			});

			it('should filter by namePredicate', function () {
				const wkt = new mwbot.Wikitext('<div><span>Foo</span></div>');

				const tags = wkt.parseTags({
					namePredicate: (name) => name === 'span',
				});

				assert.lengthOf(tags, 1);
				assert.strictEqual(tags[0].name, 'span');
			});

			it('should filter by tagPredicate', function () {
				const wkt = new mwbot.Wikitext('<div><span>Foo</span></div>');

				const tags = wkt.parseTags({
					tagPredicate: (tag) => tag.nestLevel === 0,
				});

				assert.lengthOf(tags, 1);
				assert.strictEqual(tags[0].name, 'div');
			});

			it('should apply both predicates', function () {
				const wkt = new mwbot.Wikitext('<div><span>Foo</span></div>');

				const tags = wkt.parseTags({
					namePredicate: (name) => name === 'span',
					tagPredicate: (tag) => tag.nestLevel === 1,
				});

				assert.lengthOf(tags, 1);
				assert.strictEqual(tags[0].name, 'span');
			});
		});
	});
}