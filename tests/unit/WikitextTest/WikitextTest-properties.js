import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { getTestMwbot } from '../MwbotTest/MwbotTest-fixtures.js';

export function testWikitextProperties() {
	describe('Properties', function () {

		/**
		 * @type {Awaited<ReturnType<getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		describe('.content', function () {
			it('should return the original wikitext', function () {
				const wkt = new mwbot.Wikitext('Foo');

				assert.strictEqual(wkt.content, 'Foo');
			});
		});

		describe('.length', function () {
			it('should return the string length', function () {
				assert.strictEqual(
					new mwbot.Wikitext('').length,
					0
				);

				assert.strictEqual(
					new mwbot.Wikitext('Foo').length,
					3
				);

				assert.strictEqual(
					new mwbot.Wikitext('あいう').length,
					3
				);

				assert.strictEqual(
					new mwbot.Wikitext('😀').length,
					2 // UTF-16 code units
				);
			});
		});

		describe('.byteLength', function () {
			it('should return the UTF-8 byte length', function () {
				assert.strictEqual(
					new mwbot.Wikitext('').byteLength,
					0
				);

				assert.strictEqual(
					new mwbot.Wikitext('Foo').byteLength,
					3
				);

				assert.strictEqual(
					new mwbot.Wikitext('あ').byteLength,
					3
				);

				assert.strictEqual(
					new mwbot.Wikitext('😀').byteLength,
					4
				);

				assert.strictEqual(
					new mwbot.Wikitext('Aあ😀').byteLength,
					8
				);
			});
		});
	});
}