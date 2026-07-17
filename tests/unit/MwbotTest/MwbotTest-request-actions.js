import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import { MwbotError } from '../../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotRequestActions() {
	describe('General action request methods', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		afterEach(function () {
			sinon.restore();
		});

		describe('move()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let postWithCsrfTokenStub;

			beforeEach(function () {
				postWithCsrfTokenStub = sinon.stub(mwbot, 'postWithCsrfToken');
			});

			it('should throw "anonymous" error for anonymous authentication', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'isAnonymous').returns(true);

				try {
					await mwbot.move('Foo', 'Bar');
					assert.fail('Expected move() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'anonymous');
				}
			});

			it('should throw "nopermission" error when the client does not have the "move" right', async function () {
				sinon.stub(mwbot, 'hasRights').returns(false);

				try {
					await mwbot.move('Foo', 'Bar');
					assert.fail('Expected move() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'nopermission');
				}
			});

			it('should use required API parameters', async function () {
				const expected = {
					from: 'Foo',
					to: 'Bar',
					reason: 'reason',
					redirectcreated: true,
					moveoverredirect: false,
				};
				postWithCsrfTokenStub.resolves({ move: expected });

				const response = await mwbot.move('Foo', 'Bar', { reason: 'reason' }, { timeout: 7777 });

				sinon.assert.calledOnceWithExactly(
					postWithCsrfTokenStub,
					{
						reason: 'reason',
						action: 'move',
						format: 'json',
						formatversion: '2',
						from: 'Foo',
						fromid: false,
						to: 'Bar',
					},
					{ timeout: 7777 }
				);
				assert.deepEqual(expected, response);
			});

			it('should throw "empty" error when the response is missing a "move" property', async function () {
				postWithCsrfTokenStub.resolves({});

				try {
					await mwbot.move('Foo', 'Bar');
					assert.fail('Expected move() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					sinon.assert.calledOnce(postWithCsrfTokenStub);
				}
			});
		});

		describe('parse()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let fetchStub;

			beforeEach(function () {
				fetchStub = sinon.stub(mwbot, 'fetch');
			});

			it('should use required API parameters', async function () {
				/** @type {import('../../../dist/index.js').ApiResponseParse} */
				const expected = {
					title: 'API',
					pageid: 1,
					text: 'Foo',
				};
				fetchStub.resolves({ parse: expected });

				const response = await mwbot.parse(
					{
						text: 'Foo',
						prop: 'text',
						contentmodel: 'wikitext',
					},
					{ timeout: 7777 }
				);

				sinon.assert.calledOnceWithExactly(
					fetchStub,
					{
						text: 'Foo',
						prop: 'text',
						contentmodel: 'wikitext',
						action: 'parse',
						format: 'json',
						formatversion: '2',
					},
					{ timeout: 7777 }
				);
				assert.deepEqual(expected, response);
			});

			it('should throw "empty" error when the response lacks a "parse" property', async function () {
				fetchStub.resolves({});

				try {
					await mwbot.parse({});
					assert.fail('Expected parse() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					sinon.assert.calledOnce(fetchStub);
				}
			});
		});

		describe('purge()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let postStub;

			beforeEach(function () {
				postStub = sinon.stub(mwbot, 'post');
			});

			it('should throw "invalidtitle" error for an invalid title', async function () {
				try {
					await mwbot.purge('[');
					assert.fail('Expected purge() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidtitle');
					sinon.assert.notCalled(postStub);
				}
			});

			it('should throw "typemismatch" error for an invalid title type', async function () {
				try {
					// @ts-expect-error - Invalid title type
					await mwbot.purge(123);
					assert.fail('Expected purge() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'typemismatch');
					sinon.assert.notCalled(postStub);
				}
			});

			it('should throw "emptyinput" error for an empty titles array', async function () {
				try {
					await mwbot.purge([]);
					assert.fail('Expected purge() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'emptyinput');
					sinon.assert.notCalled(postStub);
				}
			});

			it('should use required API parameters', async function () {
				/** @type {import('../../../dist/index.js').ApiResponse} */
				const expected = {
					purge: [{
						title: 'Foo',
						purged: true,
						linkupdate: true,
					}],
				};
				postStub.resolves(expected);

				const response = await mwbot.purge(
					'Foo',
					{ forcelinkupdate: true },
					{ timeout: 7777 }
				);

				sinon.assert.calledOnceWithExactly(
					postStub,
					{
						forcelinkupdate: true,
						action: 'purge',
						format: 'json',
						formatversion: '2',
						titles: ['Foo'],
					},
					{ timeout: 7777 }
				);
				assert.deepEqual(expected, response);
			});

			it('should throw "empty" error when the response is missing "purge"', async function () {
				postStub.resolves({});

				try {
					await mwbot.purge('Foo');
					assert.fail('Expected purge() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					sinon.assert.calledOnce(postStub);
				}
			});
		});
	});
}
