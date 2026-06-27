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

		describe('delete()', function () {
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
					await mwbot.delete('Foo');
					assert.fail('Expected delete() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'anonymous');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should throw "nopermission" error when the client does not have the "delete" right', async function () {
				sinon.stub(mwbot, 'hasRights').returns(false);

				try {
					await mwbot.delete('Foo');
					assert.fail('Expected delete() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'nopermission');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should map a string titleOrId to the "title" API parameter', async function () {
				postWithCsrfTokenStub.resolves({ delete: {} });

				await mwbot.delete('Foo');

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					{ title: 'Foo' }
				);
			});

			it('should map a number titleOrId to the "pageid" API parameter', async function () {
				postWithCsrfTokenStub.resolves({ delete: {} });

				await mwbot.delete(123);

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					{ pageid: 123 }
				);
			});

			it('should use required API parameters', async function () {
				const expected = {
					title: 'Foo',
				};
				postWithCsrfTokenStub.resolves({ delete: expected });

				const additionalParams = { reason: 'reason' };
				const reqOpts = { timeout: 7777 };

				const res = await mwbot.delete(
					'Foo',
					additionalParams,
					reqOpts
				);

				sinon.assert.calledOnceWithExactly(
					postWithCsrfTokenStub,
					{
						...additionalParams,
						action: 'delete',
						format: 'json',
						formatversion: '2',
						title: 'Foo',
					},
					reqOpts
				);

				assert.deepEqual(res, expected);
			});

			it('should return response.delete', async function () {
				const expected = {
					title: 'Foo',
				};
				postWithCsrfTokenStub.resolves({ delete: expected });

				const res = await mwbot.delete('Foo');

				sinon.assert.calledOnce(postWithCsrfTokenStub);
				assert.deepEqual(res, expected);
			});

			it('should throw "empty" error when response.delete is missing', async function () {
				postWithCsrfTokenStub.resolves({});

				try {
					await mwbot.delete('Foo');
					assert.fail('Expected delete() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					sinon.assert.calledOnce(postWithCsrfTokenStub);
				}
			});
		});

		describe('undelete()', function () {
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
					await mwbot.undelete('Foo');
					assert.fail('Expected undelete() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'anonymous');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should throw "nopermission" error when the client does not have the "undelete" right', async function () {
				sinon.stub(mwbot, 'hasRights').returns(false);

				try {
					await mwbot.undelete('Foo');
					assert.fail('Expected undelete() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'nopermission');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should use a default timeout of 180 seconds', async function () {
				postWithCsrfTokenStub.resolves({ undelete: {} });

				await mwbot.undelete('Foo');

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					sinon.match.object,
					{ timeout: 180000 }
				);
			});

			it('should preserve an explicitly specified timeout', async function () {
				postWithCsrfTokenStub.resolves({ undelete: {} });

				await mwbot.undelete('Foo', {}, { timeout: 7777 });

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					sinon.match.object,
					{ timeout: 7777 }
				);
			});

			it('should use required API parameters', async function () {
				const expected = {
					title: 'Foo',
				};
				postWithCsrfTokenStub.resolves({ undelete: expected });

				const additionalParams = {
					reason: 'reason',
				};

				const res = await mwbot.undelete(
					'Foo',
					additionalParams,
					{ timeout: 7777 }
				);

				sinon.assert.calledOnceWithExactly(
					postWithCsrfTokenStub,
					{
						...additionalParams,
						action: 'undelete',
						format: 'json',
						formatversion: '2',
						title: 'Foo',
					},
					{ timeout: 7777, _cloned: true }
				);

				assert.deepEqual(res, expected);
			});

			it('should return response.undelete', async function () {
				const expected = {
					title: 'Foo',
				};
				postWithCsrfTokenStub.resolves({ undelete: expected });

				const res = await mwbot.undelete('Foo');

				sinon.assert.calledOnce(postWithCsrfTokenStub);
				assert.deepEqual(res, expected);
			});

			it('should throw "empty" error when response.undelete is missing', async function () {
				postWithCsrfTokenStub.resolves({});

				try {
					await mwbot.undelete('Foo');
					assert.fail('Expected undelete() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					sinon.assert.calledOnce(postWithCsrfTokenStub);
				}
			});
		});

		describe('protect()', function () {
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
					await mwbot.protect('Foo', 'edit=sysop');
					assert.fail('Expected protect() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'anonymous');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should throw "nopermission" error when the client does not have the "protect" right', async function () {
				sinon.stub(mwbot, 'hasRights').returns(false);

				try {
					await mwbot.protect('Foo', 'edit=sysop');
					assert.fail('Expected protect() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'nopermission');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should throw "invalidtitle" error for an invalid title', async function () {
				try {
					await mwbot.protect('[', 'edit=sysop');
					assert.fail('Expected protect() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidtitle');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should throw "typemismatch" error for an invalid levels type', async function () {
				try {
					// @ts-expect-error - Invalid levels type
					await mwbot.protect('Foo', 123);
					assert.fail('Expected protect() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'typemismatch');
					sinon.assert.notCalled(postWithCsrfTokenStub);
				}
			});

			it('should accept protections as a string', async function () {
				postWithCsrfTokenStub.resolves({ protect: {} });

				await mwbot.protect('Foo', 'edit=sysop|move=sysop');

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					{ protections: 'edit=sysop|move=sysop' }
				);
			});

			it('should accept protections as an array', async function () {
				postWithCsrfTokenStub.resolves({ protect: {} });

				await mwbot.protect('Foo', ['edit=sysop', 'move=sysop']);

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					{ protections: 'edit=sysop|move=sysop' }
				);
			});

			it('should accept protections as an object', async function () {
				postWithCsrfTokenStub.resolves({ protect: {} });

				await mwbot.protect('Foo', {
					edit: 'sysop',
					move: 'sysop',
				});

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					{ protections: 'edit=sysop|move=sysop' }
				);
			});

			it('should apply required API parameters', async function () {
				const expected = {
					title: 'Foo',
				};
				postWithCsrfTokenStub.resolves({ protect: expected });

				const additionalParams = {
					expiry: '1 week',
				};
				const reqOpts = {
					timeout: 7777,
				};

				const res = await mwbot.protect(
					'Foo',
					'edit=sysop',
					additionalParams,
					reqOpts
				);

				sinon.assert.calledOnceWithExactly(
					postWithCsrfTokenStub,
					{
						...additionalParams,
						action: 'protect',
						format: 'json',
						formatversion: '2',
						title: 'Foo',
						protections: 'edit=sysop',
					},
					reqOpts
				);
				assert.deepEqual(res, expected);
			});

			it('should use pageid when titleOrId is a number', async function () {
				postWithCsrfTokenStub.resolves({ protect: {} });

				await mwbot.protect(123, 'edit=sysop');

				sinon.assert.calledOnceWithMatch(
					postWithCsrfTokenStub,
					{
						pageid: 123,
						protections: 'edit=sysop',
					}
				);
			});

			it('should throw "empty" error when response.protect is missing', async function () {
				postWithCsrfTokenStub.resolves({});

				try {
					await mwbot.protect('Foo', 'edit=sysop');
					assert.fail('Expected protect() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					sinon.assert.calledOnce(postWithCsrfTokenStub);
				}
			});
		});

		describe('unprotect()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let protectStub;

			beforeEach(function () {
				protectStub = sinon.stub(mwbot, 'protect');
			});

			it('should call protect() with an empty protections string', async function () {
				protectStub.resolves({
					title: 'Foo',
					reason: 'cleanup',
					protections: [],
				});

				const additionalParams = {
					reason: 'cleanup',
				};
				const reqOpts = {
					timeout: 7777,
				};

				await mwbot.unprotect('Foo', additionalParams, reqOpts);

				sinon.assert.calledOnceWithExactly(
					protectStub,
					'Foo',
					'',
					additionalParams,
					reqOpts
				);
			});

			it('should return the value returned by protect()', async function () {
				protectStub.resolves({
					title: 'Foo',
					reason: '',
					protections: [],
				});

				const expected = {
					title: 'Foo',
				};
				protectStub.resolves(expected);

				const res = await mwbot.unprotect('Foo');

				assert.deepEqual(res, expected);
			});
		});
	});
}