import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import { MwbotError } from '../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotRequestAdmin() {
	describe('Admin action request methods', function () {
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

		describe('block()', function () {
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
					await mwbot.block('Foo');
					assert.fail('Expected block() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'anonymous');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should throw "nopermission" error when the client does not have the "block" right', async function () {
				sinon.stub(mwbot, 'hasRights').returns(false);

				try {
					await mwbot.block('Foo');
					assert.fail('Expected block() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'nopermission');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should throw "typemismatch" error when "userOrId" is neither a string nor a number', async function () {
				try {
					// @ts-expect-error - Passing a symbol
					await mwbot.block(Symbol(1));
					assert.fail('Expected block() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'typemismatch');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should map a string userOrId to the "user" API parameter', async function () {
				postWithCsrfTokenStub.resolves({ block: {} });

				await mwbot.block('Foo');

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					{ user: 'Foo' }
				);
			});

			it('should map a number userOrId to the "id" API parameter', async function () {
				postWithCsrfTokenStub.resolves({ block: {} });

				await mwbot.block(1);

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					{ id: 1 }
				);
			});

			it('should apply default parameters along with user-provided parameters', async function () {
				postWithCsrfTokenStub.resolves({ block: {} });
				const additionalParams = { watchuser: true };
				const reqOpts = { timeout: 7777 };

				await mwbot.block('Foo', additionalParams, reqOpts);

				sinon.assert.calledOnceWithExactly(
					postWithCsrfTokenStub,
					{
						user: 'Foo',
						anononly: true,
						nocreate: true,
						autoblock: true,
						allowusertalk: true,
						...additionalParams,
						action: 'block',
						format: 'json',
						formatversion: '2',
					},
					reqOpts
				);
			});

			it('should return response.block', async function () {
				const expected = {
					user: 'Foo',
				};
				postWithCsrfTokenStub.resolves({ block: expected });

				const res = await mwbot.block('Foo');

				sinon.assert.calledOnce(postWithCsrfTokenStub);
				assert.deepEqual(res, expected);
			});

			it('should throw "empty" error when response.block is missing', async function () {
				postWithCsrfTokenStub.resolves({});

				try {
					await mwbot.block('Foo');
					assert.fail('Expected block() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					sinon.assert.calledOnce(postWithCsrfTokenStub);
				}
			});
		});

		describe('unblock()', function () {
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
					await mwbot.unblock('Foo');
					assert.fail('Expected unblock() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'anonymous');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should throw "nopermission" error when the client does not have the "block" right', async function () {
				sinon.stub(mwbot, 'hasRights').returns(false);

				try {
					await mwbot.unblock('Foo');
					assert.fail('Expected unblock() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'nopermission');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should throw "typemismatch" error when "userOrId" is neither a string nor a number', async function () {
				try {
					// @ts-expect-error - Passing a symbol
					await mwbot.unblock(Symbol(1));
					assert.fail('Expected unblock() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'typemismatch');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should map a string userOrId to the "user" API parameter', async function () {
				postWithCsrfTokenStub.resolves({ unblock: {} });

				await mwbot.unblock('Foo');

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					{ user: 'Foo' }
				);
			});

			it('should map a number userOrId to the "id" API parameter', async function () {
				postWithCsrfTokenStub.resolves({ unblock: {} });

				await mwbot.unblock(1);

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					{ id: 1 }
				);
			});

			it('should use required API parameters', async function () {
				postWithCsrfTokenStub.resolves({ unblock: {} });
				const additionalParams = { reason: 'reason' };
				const reqOpts = { timeout: 7777 };

				await mwbot.unblock('Foo', additionalParams, reqOpts);

				sinon.assert.calledOnceWithExactly(
					postWithCsrfTokenStub,
					{
						...additionalParams,
						action: 'unblock',
						format: 'json',
						formatversion: '2',
						user: 'Foo',
					},
					reqOpts
				);
			});

			it('should return response.unblock', async function () {
				const expected = {
					user: 'Foo',
				};
				postWithCsrfTokenStub.resolves({ unblock: expected });

				const res = await mwbot.unblock('Foo');

				sinon.assert.calledOnce(postWithCsrfTokenStub);
				assert.deepEqual(res, expected);
			});

			it('should throw "empty" error when response.unblock is missing', async function () {
				postWithCsrfTokenStub.resolves({});

				try {
					await mwbot.unblock('Foo');
					assert.fail('Expected unblock() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					sinon.assert.calledOnce(postWithCsrfTokenStub);
				}
			});
		});
	});
}