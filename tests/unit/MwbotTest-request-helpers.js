import { describe, it, before, afterEach } from 'mocha';
import { assert } from 'chai';
import { Mwbot } from '../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotRequestHelpers() {
	describe('Request helper methods', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named'); // botpassword authentication
		});

		afterEach(function () {
			sinon.restore();
		});

		describe('getActionParams()', function () {
			it('should return an object with the given action and fixed format and formatversion', function () {
				assert.deepEqual(
					Mwbot.getActionParams('query'),
					{
						action: 'query',
						format: 'json',
						formatversion: '2',
					}
				);
			});
		});

		describe('abort()', function () {
			it('should invoke AbortController.abort() and clear existing controllers', function () {
				const abortControllerSpy = sinon.spy(AbortController.prototype, 'abort');
				const clearSpy = sinon.spy(Set.prototype, 'clear');
				// @ts-expect-error - Protected property
				sinon.stub(mwbot, 'abortions').value(new Set([new AbortController()]));

				mwbot.abort();

				sinon.assert.called(abortControllerSpy);
				sinon.assert.calledOnce(clearSpy);
				sinon.assert.callOrder(abortControllerSpy, clearSpy);
				// @ts-expect-error - Protected property
				assert.isEmpty(mwbot.abortions);
			});
		});

		describe('get()', function () {
			it('should enforce GET', async function () {
				const params = { action: /** @type {const} */ ('query') };
				const reqOpts = { method: 'POST' };
				const expectedResponse = { query: {} };
				const requestStub = sinon.stub(mwbot, 'request').resolves(expectedResponse);
				// @ts-expect-error - Protected method
				const unrefSpy = sinon.spy(Mwbot, 'unrefRequestOptions');

				const res = await Mwbot.prototype.get.call(mwbot, params, reqOpts);

				assert.deepEqual(res, expectedResponse);
				sinon.assert.calledOnce(unrefSpy);
				sinon.assert.calledOnce(requestStub);
				assert.strictEqual(requestStub.firstCall.args[0], params);
				assert.notStrictEqual(requestStub.firstCall.args[1], reqOpts);
				assert.strictEqual(requestStub.firstCall.args[1]?.method, 'GET');
				assert.strictEqual(reqOpts.method, 'POST');
			});
		});

		describe('post()', function () {
			it('should enforce POST', async function () {
				const params = { action: /** @type {const} */ ('query') };
				const reqOpts = { method: 'GET' };
				const expectedResponse = { query: {} };
				const requestStub = sinon.stub(mwbot, 'request').resolves(expectedResponse);
				// @ts-expect-error - Protected method
				const unrefSpy = sinon.spy(Mwbot, 'unrefRequestOptions');

				const res = await mwbot.post(params, reqOpts);

				assert.deepEqual(res, expectedResponse);
				sinon.assert.calledOnce(unrefSpy);
				sinon.assert.calledOnce(requestStub);
				assert.strictEqual(requestStub.firstCall.args[0], params);
				assert.notStrictEqual(requestStub.firstCall.args[1], reqOpts);
				assert.strictEqual(requestStub.firstCall.args[1]?.method, 'POST');
				assert.strictEqual(reqOpts.method, 'GET');
			});
		});

		describe('nonwritePost()', function () {
			it('should enforce POST with a Promise-Non-Write-API-Action header', async function () {
				const params = { action: /** @type {const} */ ('query') };
				const reqOpts = { method: 'GET' };
				const expectedResponse = { query: {} };
				const requestStub = sinon.stub(mwbot, 'request').resolves(expectedResponse);
				// @ts-expect-error - Protected method
				const unrefSpy = sinon.spy(Mwbot, 'unrefRequestOptions');

				const res = await mwbot.nonwritePost(params, reqOpts);

				assert.deepEqual(res, expectedResponse);
				sinon.assert.calledOnce(unrefSpy);
				sinon.assert.calledOnce(requestStub);
				assert.strictEqual(requestStub.firstCall.args[0], params);
				assert.notStrictEqual(requestStub.firstCall.args[1], reqOpts);
				assert.strictEqual(requestStub.firstCall.args[1]?.method, 'POST');
				assert.strictEqual(reqOpts.method, 'GET');
				assert.strictEqual(
					requestStub.firstCall.args[1]?.headers?.['Promise-Non-Write-API-Action'],
					'1'
				);
			});
		});

		describe('fetch()', function () {
			it('should enforce GET and enable autoMethod', async function () {
				const params = {
					action: /** @type {const} */ ('query'),
					list: 'blocks',
					bkusers: 'a'.repeat(2100),
				};
				const reqOpts = { method: 'POST' };
				const expectedResponse = { query: { blocks: [] } };
				const requestStub = sinon.stub(mwbot, 'request').resolves(expectedResponse);
				// @ts-expect-error - Protected method
				const unrefSpy = sinon.spy(Mwbot, 'unrefRequestOptions');

				const res = await mwbot.fetch(params, reqOpts);

				assert.deepEqual(res, expectedResponse);
				sinon.assert.calledOnce(unrefSpy);
				sinon.assert.calledOnce(requestStub);

				assert.strictEqual(requestStub.firstCall.args[0], params);
				assert.notStrictEqual(requestStub.firstCall.args[1], reqOpts);
				assert.strictEqual(requestStub.firstCall.args[1]?.method, 'GET');
				assert.isTrue(requestStub.firstCall.args[1]?.autoMethod);

				assert.strictEqual(reqOpts.method, 'POST');
			});
		});
	});
}