import { describe, it, before, afterEach, beforeEach } from 'mocha';
import { assert } from 'chai';
import { MwbotError } from '../../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotRequestBatch() {
	describe('Batch request methods', function () {
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

		describe('continuedRequest()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let fetchStub;

			beforeEach(function () {
				fetchStub = sinon.stub(mwbot, 'fetch');
			});

			it('should throw an invalidlimit error when limit is not an integer', async function () {
				try {
					await mwbot.continuedRequest(
						{ action: 'query' },
						{ limit: 1.5 }
					);
					assert.fail('Expected continuedRequest() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidlimit');
				}
			});

			it('should throw an invalidlimit error when limit is negative', async function () {
				try {
					await mwbot.continuedRequest(
						{ action: 'query' },
						{ limit: -1 }
					);
					assert.fail('Expected continuedRequest() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidlimit');
				}
			});

			it('should continue requesting until the API stops returning a continue object', async function () {
				fetchStub
					.onCall(0)
					.resolves({
						continue: { apcontinue: '1' },
						query: { pages: ['Foo'] },
					})
					.onCall(1)
					.resolves({
						query: { pages: ['Bar'] },
					});

				const result = await mwbot.continuedRequest({
					action: 'query',
					list: 'allpages',
				});

				sinon.assert.calledTwice(fetchStub);
				sinon.assert.calledWithMatch(
					fetchStub.getCall(0),
					{
						action: 'query',
						list: 'allpages',
					}
				);
				sinon.assert.calledWithMatch(
					fetchStub.getCall(1),
					{
						action: 'query',
						list: 'allpages',
						apcontinue: '1',
					}
				);
				assert.deepEqual(result, [
					{ continue: { apcontinue: '1' }, query: { pages: ['Foo'] } },
					{ query: { pages: ['Bar'] } },
				]);
			});

			it('should stop requesting once the specified limit is reached', async function () {
				fetchStub.resolves({
					continue: { apcontinue: 'next' },
					query: {},
				});

				const result = await mwbot.continuedRequest(
					{ action: 'query' },
					{ limit: 3 }
				);

				sinon.assert.calledThrice(fetchStub);
				assert.lengthOf(result, 3);
			});

			it('should accept Infinity as the request limit', async function () {
				fetchStub
					.onCall(0)
					.resolves({
						continue: { c: '1' },
						query: {},
					})
					.onCall(1)
					.resolves({
						query: {},
					});

				const result = await mwbot.continuedRequest(
					{ action: 'query' },
					{ limit: Infinity }
				);

				sinon.assert.calledTwice(fetchStub);
				assert.deepEqual(result, [
					{ continue: { c: '1' }, query: {} },
					{ query: {} },
				]);
			});

			it('should return an empty array when createBatchArray returns no batches', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns([]);

				const result = await mwbot.continuedRequest(
					{
						action: 'query',
						titles: [],
					},
					{
						multiValues: 'titles',
					}
				);

				assert.deepEqual(result, []);
				sinon.assert.notCalled(fetchStub);
			});

			it('should perform one continued request sequence for each batch', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns([
					['A', 'B'],
					['C', 'D'],
				]);

				fetchStub.callsFake(async (params) => {
					const key =
						params.titles.join(',') +
						':' +
						(params.apcontinue ?? '');

					switch (key) {
						case 'A,B:':
							return {
								continue: { apcontinue: 'A2' },
								query: { pages: ['A', 'B'] },
							};

						case 'A,B:A2':
							return {
								query: { pages: ['A', 'B', 'done'] },
							};

						case 'C,D:':
							return {
								continue: { apcontinue: 'C2' },
								query: { pages: ['C', 'D'] },
							};

						case 'C,D:C2':
							return {
								query: { pages: ['C', 'D', 'done'] },
							};

						default:
							throw new Error(`Unexpected params: ${JSON.stringify(params)}`);
					}
				});

				const result = await mwbot.continuedRequest(
					{
						action: 'query',
						titles: ['A', 'B', 'C', 'D'],
					},
					{
						multiValues: 'titles',
					}
				);

				sinon.assert.callCount(fetchStub, 4);
				assert.sameDeepMembers(
					fetchStub.getCalls().map((call) => call.args[0]),
					[
						{
							action: 'query',
							titles: ['A', 'B'],
						},
						{
							action: 'query',
							titles: ['A', 'B'],
							apcontinue: 'A2',
						},
						{
							action: 'query',
							titles: ['C', 'D'],
						},
						{
							action: 'query',
							titles: ['C', 'D'],
							apcontinue: 'C2',
						},
					]
				);
				assert.deepEqual(result, [
					{ continue: { apcontinue: 'A2' }, query: { pages: ['A', 'B'] } },
					{ query: { pages: ['A', 'B', 'done'] } },
					{ continue: { apcontinue: 'C2' }, query: { pages: ['C', 'D'] } },
					{ query: { pages: ['C', 'D', 'done'] } },
				]);
			});

			it('should reject when a request fails if rejectProof is false', async function () {
				const error = new MwbotError('api_mwbot', {
					code: 'http',
					info: 'HTTP Error',
				});

				fetchStub.rejects(error);

				try {
					await mwbot.continuedRequest({
						action: 'query',
					});
					assert.fail('Expected continuedRequest() to reject');
				} catch (err) {
					assert.strictEqual(err, error);
				}
			});

			it('should collect errors instead of rejecting when rejectProof is true', async function () {
				const error = new MwbotError('api_mwbot', {
					code: 'notfound',
					info: 'Not Found',
				});

				fetchStub.rejects(error);

				const result = await mwbot.continuedRequest(
					{
						action: 'query',
					},
					{
						rejectProof: true,
					}
				);

				sinon.assert.calledOnce(fetchStub);
				assert.deepEqual(result, [error]);
			});
		});

		describe('massRequest()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let requestStub;

			beforeEach(function () {
				requestStub = sinon.stub(mwbot, 'request');
			});

			it('should return an empty array when createBatchArray returns no batches', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns([]);

				const result = await mwbot.massRequest(
					{
						action: 'query',
						titles: [],
					},
					'titles'
				);

				assert.deepEqual(result, []);
				sinon.assert.notCalled(requestStub);
			});

			it('should create one request for each batch', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns([
					['A', 'B'],
					['C'],
				]);

				requestStub
					.onCall(0).resolves({ query: { pages: ['A', 'B'] } })
					.onCall(1).resolves({ query: { pages: ['C'] } });

				const result = await mwbot.massRequest(
					{
						action: 'query',
						titles: ['A', 'B', 'C'],
					},
					'titles'
				);

				sinon.assert.calledTwice(requestStub);
				sinon.assert.calledWithMatch(
					requestStub.getCall(0),
					{
						action: 'query',
						titles: ['A', 'B'],
					}
				);
				sinon.assert.calledWithMatch(
					requestStub.getCall(1),
					{
						action: 'query',
						titles: ['C'],
					}
				);
				assert.deepEqual(result, [
					{ query: { pages: ['A', 'B'] } },
					{ query: { pages: ['C'] } },
				]);
			});

			it('should replace every multi-value field when multiple keys are specified', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns([
					['A', 'B'],
				]);

				requestStub.resolves({});

				await mwbot.massRequest(
					{
						action: 'query',
						titles: ['A', 'B'],
						revids: ['1', '2'],
					},
					['titles', 'revids']
				);

				sinon.assert.calledOnceWithMatch(
					requestStub,
					{
						action: 'query',
						titles: ['A', 'B'],
						revids: ['A', 'B'],
					}
				);
			});

			it('should automatically use GET for read requests', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns([['A']]);

				requestStub.resolves({});

				await mwbot.massRequest(
					{
						action: 'query',
						titles: ['A'],
					},
					'titles'
				);

				assert.strictEqual(requestStub.firstCall.args[1].method, 'GET');
				assert.isTrue(requestStub.firstCall.args[1].autoMethod);
			});

			it('should preserve POST requests', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns([['A']]);

				requestStub.resolves({});

				await mwbot.massRequest(
					{
						action: 'edit',
						title: 'Sandbox',
						text: 'foo',
					},
					'title',
					undefined,
					{
						method: 'POST',
					}
				);

				assert.strictEqual(requestStub.firstCall.args[1].method, 'POST');
				assert.isUndefined(requestStub.firstCall.args[1].autoMethod);
			});

			it('should set the default timeout to 120 seconds', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns([['A']]);

				requestStub.resolves({});

				await mwbot.massRequest(
					{
						action: 'query',
						titles: ['A'],
					},
					'titles'
				);

				assert.strictEqual(requestStub.firstCall.args[1].timeout, 120000);
			});

			it('should preserve a custom timeout', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns([['A']]);

				requestStub.resolves({});

				await mwbot.massRequest(
					{
						action: 'query',
						titles: ['A'],
					},
					'titles',
					undefined,
					{
						timeout: 5000,
					}
				);

				assert.strictEqual(requestStub.firstCall.args[1].timeout, 5000);
			});

			it('should return MwbotError objects instead of rejecting', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns([
					['A'],
					['B'],
				]);

				const err = new MwbotError('api_mwbot', {
					code: 'http',
					info: 'HTTP Error',
				});

				requestStub
					.onCall(0).rejects(err)
					.onCall(1).resolves({ query: {} });

				const result = await mwbot.massRequest(
					{
						action: 'query',
						titles: ['A', 'B'],
					},
					'titles'
				);

				assert.deepEqual(result, [
					err,
					{ query: {} },
				]);
			});

			it('should process requests in groups of 100', async function () {
				const batches = Array.from({ length: 201 }, (_, i) => [String(i)]);
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'createBatchArray').returns(batches);

				let concurrent = 0;
				let maxConcurrent = 0;

				requestStub.callsFake(async () => {
					concurrent++;
					maxConcurrent = Math.max(maxConcurrent, concurrent);

					await Promise.resolve();

					concurrent--;
					return {};
				});

				const promise = mwbot.massRequest(
					{
						action: 'query',
						titles: [],
					},
					'titles'
				);

				await promise;

				sinon.assert.callCount(requestStub, 201);
				assert.isAtMost(maxConcurrent, 100);
			});
		});

		describe('createBatchArray()', function () {

			beforeEach(function () {
				sinon.stub(mwbot, 'apilimit').get(() => 5);
			});

			it('should throw an invalidsize error when batchSize is not an integer', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.createBatchArray({ t: ['A'] }, ['t'], 1.5);
					assert.fail('Expected createBatchArray() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidsize');
				}
			});

			it('should throw an invalidsize error when batchSize exceeds apilimit', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.createBatchArray({ t: ['A'] }, ['t'], 6);
					assert.fail('Expected createBatchArray() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidsize');
				}
			});

			it('should throw an invalidsize error when batchSize is zero', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.createBatchArray({ t: ['A'] }, ['t'], 0);
					assert.fail('Expected createBatchArray() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidsize');
				}
			});

			it('should throw an invalidsize error when batchSize is negative', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.createBatchArray({ t: ['A'] }, ['t'], -1);
					assert.fail('Expected createBatchArray() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidsize');
				}
			});

			it('should throw an emptyinput error when keys array is empty', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.createBatchArray({ t: ['A'] }, []);
					assert.fail('Expected createBatchArray() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'emptyinput');
				}
			});

			it('should throw a typemismatch error when an element in keys is not a string', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.createBatchArray({ t: ['A'] }, [123]);
					assert.fail('Expected createBatchArray() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'typemismatch');
				}
			});

			it('should throw a typemismatch error when parameters[key] is not an array', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.createBatchArray({ t: 'not_an_array' }, [123]);
					assert.fail('Expected createBatchArray() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'typemismatch');
				}
			});

			it('should throw a fieldmismatch error when array elements do not match between keys', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.createBatchArray(
						{
							titles: ['A', 'B'],
							revids: ['A', 'C'],
						},
						['titles', 'revids']
					);
					assert.fail('Expected createBatchArray() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'fieldmismatch');
				}
			});

			it('should throw a fieldmismatch error when array lengths do not match between keys', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.createBatchArray(
						{
							titles: ['A', 'B'],
							revids: ['A'],
						},
						['titles', 'revids']
					);
					assert.fail('Expected createBatchArray() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'fieldmismatch');
				}
			});

			it('should batch using apilimit when batchSize is not provided', function () {
				// @ts-expect-error - Protected method
				const result = mwbot.createBatchArray(
					{ titles: ['A', 'B', 'C', 'D', 'E', 'F'] },
					['titles']
				);

				assert.deepEqual(
					result,
					[['A', 'B', 'C', 'D', 'E'], ['F']]
				);
			});

			it('should correctly batch when a valid positive integer batchSize is provided', function () {
				// @ts-expect-error - Protected method
				const result = mwbot.createBatchArray(
					{ titles: ['A', 'B', 'C', 'D'] },
					['titles'],
					2
				);

				assert.deepEqual(
					result,
					[['A', 'B'], ['C', 'D']]
				);
			});

			it('should process successfully when multiple keys are provided and their arrays match perfectly', function () {
				// @ts-expect-error - Protected method
				const result = mwbot.createBatchArray(
					{
						titles: ['A', 'B', 'C'],
						revids: ['A', 'B', 'C'],
					},
					['titles', 'revids']
				);

				assert.deepEqual(
					result,
					[['A', 'B', 'C']]
				);
			});
		});
	});
}
