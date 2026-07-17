import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { assertThrowsMwbotError, getTestMwbot } from '../MwbotTest/MwbotTest-fixtures.js';

export function testWikitextConstructor() {
	describe('Constructor methods', function () {
		/**
		 * @type {Awaited<ReturnType<getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		describe('constructor()', function () {

			it('should create an instance with initialized storage', function () {
				const wkt = new mwbot.Wikitext('Foo');

				assert.instanceOf(wkt, mwbot.Wikitext);
				assert.strictEqual(wkt.content, 'Foo');

				assert.deepEqual(
					// @ts-expect-error - Testing a private property
					wkt.storage,
					{
						content: 'Foo',
						tags: null,
						parameters: null,
						sections: null,
						wikilinks_fuzzy: null,
						templates: null,
						wikilinks: null,
					}
				);
			});

			it('should throw on a non-string input', function () {
				assertThrowsMwbotError(
					// @ts-expect-error- Passing a number
					() => new mwbot.Wikitext(123),
					'typemismatch'
				);
			});
		});

		describe('new()', function () {
			it('should create an equivalent instance', function () {
				const wkt = mwbot.Wikitext.new('Foo');

				assert.instanceOf(wkt, mwbot.Wikitext);
				assert.strictEqual(wkt.content, 'Foo');
			});
		});

		describe('newFromTitle()', function () {

			const pageTitle = 'Foo';
			const pageContent = 'content';

			/**
			 * @type {sinon.SinonStub}
			 */
			let readStub;

			beforeEach(function () {
				readStub = sinon.stub(mwbot, 'read').resolves(
					/** @type {any} */ ({
						pageid: 2,
						ns: 0,
						title: pageTitle,
						baserevid: 1,
						user: 'Admin',
						basetimestamp: '',
						starttimestamp: '',
						content: pageContent,
					})
				);
			});

			afterEach(function () {
				sinon.restore();
			});

			it('should create an instance from page content', async function () {
				const wkt = await mwbot.Wikitext.newFromTitle(pageTitle);

				assert.instanceOf(wkt, mwbot.Wikitext);
				assert.strictEqual(wkt.content, pageContent);

				sinon.assert.calledOnceWithExactly(
					readStub,
					pageTitle,
					undefined
				);
			});

			it('should pass request options to Mwbot.read()', async function () {
				const reqOpts = {
					timeout: 7777,
				};

				await mwbot.Wikitext.newFromTitle(pageTitle, reqOpts);

				sinon.assert.calledOnceWithExactly(
					readStub,
					pageTitle,
					reqOpts
				);
			});
		});
	});
}
