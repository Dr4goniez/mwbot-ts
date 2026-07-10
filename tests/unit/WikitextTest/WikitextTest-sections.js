import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { assertThrowsMwbotError, getTestMwbot } from '../MwbotTest/MwbotTest-fixtures.js';

export function testWikitextSections() {
	describe('Section methods', function () {
		/**
		 * @type {Awaited<ReturnType<getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		describe('parseSections()', function () {
			it('should return only the top section when no headings exist', function () {
				const wt = new mwbot.Wikitext('Foo\nBar');

				const sections = wt.parseSections();

				assert.lengthOf(sections, 1);
				assert.include(sections[0], {
					heading: '',
					title: 'top',
					level: 1,
					index: 0,
					startIndex: 0,
					endIndex: 7,
					content: 'Foo\nBar',
				});
				assert.strictEqual(sections[0].text, 'Foo\nBar');
				assert.isNull(sections[0].parent);
				assert.deepEqual([...sections[0].children], []);
			});

			it('should parse HTML headings', function () {
				const wt = new mwbot.Wikitext(
					'<h2>Heading</h2>\n' +
					'Text'
				);

				const sections = wt.parseSections();

				assert.lengthOf(sections, 2);
				assert.strictEqual(sections[1].title, 'Heading');
				assert.strictEqual(sections[1].level, 2);
			});

			it('should ignore comments in HTML headings', function () {
				const wt = new mwbot.Wikitext(
					'<h2>A<!--c-->B</h2>'
				);

				const sections = wt.parseSections();

				assert.strictEqual(sections[1].title, 'AB');
			});

			it('should parse wikitext headings', function () {
				const wt = new mwbot.Wikitext(
					'Top\n' +
					'== A ==\n' +
					'A\n' +
					'=== B ===\n' +
					'B\n'
				);

				const sections = wt.parseSections();

				assert.lengthOf(sections, 3);
				assert.deepInclude(sections[1], {
					title: 'A',
					level: 2,
					parent: null,
				});
				assert.deepEqual([...sections[1].children], [2]);
				assert.deepInclude(sections[2], {
					title: 'B',
					level: 3,
					parent: 1,
				});
				assert.deepEqual([...sections[2].children], []);
			});

			it('should ignore headings inside skipped ranges', function () {
				const wt = new mwbot.Wikitext(
					'<nowiki>== Hidden ==</nowiki>\n' +
					'== Visible =='
				);

				const sections = wt.parseSections();

				assert.lengthOf(sections, 2);
				assert.strictEqual(sections[1].title, 'Visible');
			});

			it('should parse headings containing comments', function () {
				const wt = new mwbot.Wikitext(
					'==<!--c--> A <!--c-->==\n'
				);

				const sections = wt.parseSections();

				assert.lengthOf(sections, 2);
				assert.strictEqual(sections[1].title, 'A');
				assert.strictEqual(
					sections[1].heading,
					'==<!--c--> A <!--c-->==\n'
				);
			});

			it('should parse interrupted heading markers on the left side', function () {
				const wt = new mwbot.Wikitext(
					'=<!--c-->= A ==\n'
				);

				const sections = wt.parseSections();

				assert.strictEqual(sections[1].level, 1);
				assert.strictEqual(sections[1].title, '= A =');
			});

			it('should parse interrupted heading markers on the right side', function () {
				const wt = new mwbot.Wikitext(
					'== A ==<!--c-->=\n'
				);

				const sections = wt.parseSections();

				assert.strictEqual(sections[1].level, 1);
				assert.strictEqual(sections[1].title, '= A ==');
			});

			it('should parse interrupted heading markers on both sides', function () {
				const wt = new mwbot.Wikitext(
					'=<!--c-->== A ==<!--c-->=\n'
				);

				const sections = wt.parseSections();

				assert.strictEqual(sections[1].level, 1);
				assert.strictEqual(sections[1].title, '== A ==');
			});

			it('should preserve overflow equals in section titles', function () {
				const wt = new mwbot.Wikitext(
					'======= A =======\n'
				);

				const sections = wt.parseSections();

				assert.strictEqual(sections[1].level, 6);
				assert.strictEqual(sections[1].title, '= A =');
			});

			it('should ignore headings precedeed by non-whitespace characters', function () {
				const wt = new mwbot.Wikitext(
					'x== A ==\n'
				);

				const sections = wt.parseSections();

				assert.lengthOf(sections, 1);
			});

			it('should ignore headings followed by non-whitespace characters', function () {
				const wt = new mwbot.Wikitext(
					'== A ==x\n'
				);

				const sections = wt.parseSections();

				assert.lengthOf(sections, 1);
			});

			it('should parse headings precedeed by HTML comments', function () {
				const wt = new mwbot.Wikitext(
					'<!-- -->== A ==\n'
				);

				const sections = wt.parseSections();

				assert.lengthOf(sections, 2);
				assert.strictEqual(sections[1].level, 2);
				assert.strictEqual(sections[1].title, 'A');
			});

			it('should ignore headings precedeed by HTML comments and whitespace', function () {
				const wt = new mwbot.Wikitext(
					'<!-- --> == A ==\n'
				);

				const sections = wt.parseSections();

				assert.lengthOf(sections, 1);
			});

			it('should parse headings followed by HTML comments', function () {
				const wt = new mwbot.Wikitext(
					'== A == <!-- -->\n'
				);

				const sections = wt.parseSections();

				assert.lengthOf(sections, 2);
				assert.strictEqual(sections[1].level, 2);
				assert.strictEqual(sections[1].title, 'A');
			});

			it('should support sectionPredicate', function () {
				const wt = new mwbot.Wikitext(
					'== A ==\n' +
					'=== B ===\n'
				);

				const sections = wt.parseSections({
					sectionPredicate: sec => sec.level === 3,
				});

				assert.lengthOf(sections, 1);
				assert.strictEqual(sections[0].title, 'B');
			});

			it('should preserve source ranges', function () {
				const wt = new mwbot.Wikitext(
					'Top\n== A ==\nText\n=== B ===\nBody'
				);

				for (const sec of wt.parseSections()) {
					assert.strictEqual(
						sec.text,
						wt.content.slice(sec.startIndex, sec.endIndex)
					);
				}
			});
		});

		describe('identifySection()', function () {
			it('should identify the top section', function () {
				const wt = new mwbot.Wikitext('Foo');
				const sec = wt.identifySection(0, 3);

				assert.strictEqual(sec?.title, 'top');
			});

			it('should identify the deepest section', function () {
				const wt = new mwbot.Wikitext(
					'== A ==\n' +
					'=== B ===\n' +
					'Text'
				);

				const b = wt.parseSections()[2];
				const sec = wt.identifySection(
					b.startIndex,
					b.endIndex
				);
				assert.strictEqual(sec?.title, 'B');
			});

			it('should accept an object with startIndex and endIndex', function () {
				const wt = new mwbot.Wikitext(
					'== A ==\nText'
				);

				const obj = {
					startIndex: 8,
					endIndex: 12,
					foo: 'bar',
				};

				const sec = wt.identifySection(obj);

				assert.strictEqual(sec?.title, 'A');
			});

			it('should return null when no section contains the range', function () {
				const wt = new mwbot.Wikitext('Foo');

				assert.isNull(
					wt.identifySection(-1, 1)
				);
			});

			it('should include boundary positions', function () {
				const wt = new mwbot.Wikitext(
					'== A ==\nText'
				);

				const sec = wt.parseSections()[1];
				const found = wt.identifySection(sec.startIndex, sec.endIndex);

				assert.deepEqual(found, sec);
				assert.notStrictEqual(found, sec);
			});

			it('should throw for an invalid object.startIndex', function () {
				const wt = new mwbot.Wikitext('');

				assertThrowsMwbotError(
					() => wt.identifySection({
						startIndex: /** @type {any} */ (null),
						endIndex: 0,
					}),
					'typemismatch',
					'Expected a number for "startIndex", but got null.'
				);
			});

			it('should throw for an invalid object.endIndex', function () {
				const wt = new mwbot.Wikitext('');

				assertThrowsMwbotError(
					() => wt.identifySection({
						startIndex: 0,
						endIndex: /** @type {any} */ (null),
					}),
					'typemismatch',
					'Expected a number for "endIndex", but got null.'
				);
			});

			it('should throw for an invalid startIndex', function () {
				const wt = new mwbot.Wikitext('');

				assertThrowsMwbotError(
					() => wt.identifySection(/** @type {any} */ (null), 0),
					'typemismatch',
					'Expected a number for "startIndex", but got null.'
				);
			});

			it('should throw for an invalid endIndex', function () {
				const wt = new mwbot.Wikitext('');

				assertThrowsMwbotError(
					() => wt.identifySection(0, /** @type {any} */ (null)),
					'typemismatch',
					'Expected a number for "endIndex", but got null.'
				);
			});
		});
	});
}