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
			it('should return a Set of valid tag names', function () {
				const tags = mwbot.Wikitext.getValidTags();

				assert.instanceOf(tags, Set);
				assert.isTrue(tags.has('div'));
				assert.isTrue(tags.has('br'));
				assert.isTrue(tags.has('nowiki'));
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
			it('should return true for valid tag names', function () {
				assert.isTrue(mwbot.Wikitext.isValidTag('div'));
				assert.isTrue(mwbot.Wikitext.isValidTag('br'));
				assert.isTrue(mwbot.Wikitext.isValidTag('nowiki'));
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
	});
}