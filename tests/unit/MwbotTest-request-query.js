import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	Mwbot,
	MwbotError,
} from '../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotRequestQuery() {
	describe('Query methods', function () {
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

		describe('read()', function () {
			describe('Single titles', function () {
				/**
				 * @type {sinon.SinonStub<Parameters<Mwbot['get']>, ReturnType<Mwbot['get']>>}
				 */
				let getStub;

				beforeEach(function () {
					// @ts-expect-error - TS complains due to TestMwbot overriding get()
					getStub = sinon.stub(mwbot, 'get');
				});

				it('should throw "invalidtitle" for an invalid title', async function () {
					try {
						await mwbot.read('[');
						assert.fail('Expected read() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'invalidtitle');
						sinon.assert.notCalled(getStub);
					}
				});

				it('should use the required API parameters', async function () {
					getStub.resolves({
						curtimestamp: '2026-01-01T00:00:00Z',
						query: {
							pages: [{
								pageid: 1,
								ns: 0,
								title: 'Foo',
								revisions: [{
									revid: 10,
									user: 'Example',
									timestamp: '2025-12-31T23:59:59Z',
									slots: {
										main: { content: 'Hello' },
									},
								}],
							}],
						},
					});

					const response = await mwbot.read('Foo', {
						timeout: 7777,
						params: {
							pageids: [1],
							revids: [2],
							foo: 'bar',
						},
					});

					sinon.assert.calledOnceWithExactly(
						getStub,
						{
							action: 'query',
							format: 'json',
							formatversion: '2',
							prop: 'revisions',
							rvprop: 'ids|timestamp|user|content',
							rvslots: 'main',
							curtimestamp: true,
							titles: 'Foo',
						},
						{
							timeout: 7777,
							params: {
								foo: 'bar',
							},
							// @ts-expect-error - Not recognized as a known property
							_cloned: true,
						}
					);
					assert.deepEqual(response, {
						pageid: 1,
						ns: 0,
						title: 'Foo',
						baserevid: 10,
						user: 'Example',
						basetimestamp: '2025-12-31T23:59:59Z',
						starttimestamp: '2026-01-01T00:00:00Z',
						content: 'Hello',
					});
				});

				it('should use a default timeout of 120 seconds', async function () {
					getStub.resolves({
						curtimestamp: '2026-01-01T00:00:00Z',
						query: {
							pages: [{
								pageid: 1,
								ns: 0,
								title: 'Foo',
								revisions: [{
									revid: 1,
									timestamp: '2025-01-01T00:00:00Z',
									slots: {
										main: { content: '' },
									},
								}],
							}],
						},
					});

					await mwbot.read('Foo');

					sinon.assert.calledOnceWithMatch(
						getStub,
						sinon.match.any,
						{ timeout: 120000 }
					);
				});

				it('should throw "pagemissing" when the page does not exist', async function () {
					getStub.resolves({
						query: {
							pages: [{
								ns: 0,
								title: 'Foo',
								missing: true,
							}],
						},
					});

					try {
						await mwbot.read('Foo');
						assert.fail('Expected read() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'pagemissing');
						sinon.assert.calledOnce(getStub);
					}
				});

				it('should throw "empty" when query.pages is missing', async function () {
					getStub.resolves({ query: {} });

					try {
						await mwbot.read('Foo');
						assert.fail('Expected read() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'empty');
						sinon.assert.calledOnce(getStub);
					}
				});

				it('should throw "empty" when the page lacks revision content', async function () {
					getStub.resolves({
						curtimestamp: '2026-01-01T00:00:00Z',
						query: {
							pages: [{
								pageid: 1,
								ns: 0,
								title: 'Foo',
								revisions: [],
							}],
						},
					});

					try {
						await mwbot.read('Foo');
						assert.fail('Expected read() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'empty');
						sinon.assert.calledOnce(getStub);
					}
				});
			});

			describe('Multiple titles', function () {
				/**
				 * @type {sinon.SinonStub}
				 */
				let massRequestStub;

				beforeEach(function () {
					massRequestStub = sinon.stub(mwbot, 'massRequest');
				});

				it('should preserve the input order', async function () {
					massRequestStub.resolves([{
						curtimestamp: '2026-01-01T00:00:00Z',
						query: {
							pages: [
								{
									pageid: 2,
									ns: 0,
									title: 'Bar',
									revisions: [{
										revid: 2,
										user: 'User2',
										timestamp: '2025-01-02T00:00:00Z',
										slots: { main: { content: 'Bar content' } },
									}],
								},
								{
									pageid: 1,
									ns: 0,
									title: 'Foo',
									revisions: [{
										revid: 1,
										user: 'User1',
										timestamp: '2025-01-01T00:00:00Z',
										slots: { main: { content: 'Foo content' } },
									}],
								},
							],
						},
					}]);

					const res = await mwbot.read(['Foo', 'Bar']);

					assert.notInstanceOf(res[0], MwbotError);
					assert.strictEqual(res[0].title, 'Foo');
					assert.notInstanceOf(res[1], MwbotError);
					assert.strictEqual(res[1].title, 'Bar');
				});

				it('should return MwbotError for invalid titles while continuing with valid ones', async function () {
					massRequestStub.resolves([{
						curtimestamp: '2026-01-01T00:00:00Z',
						query: {
							pages: [{
								pageid: 1,
								ns: 0,
								title: 'Foo',
								revisions: [{
									revid: 1,
									timestamp: '2025-01-01T00:00:00Z',
									slots: { main: { content: 'Foo' } },
								}],
							}],
						},
					}]);

					const res = await mwbot.read(['Foo', '[']);

					assert.notInstanceOf(res[0], MwbotError);

					assert.instanceOf(res[1], MwbotError);
					assert.strictEqual(res[1].code, 'invalidtitle');
				});

				it('should not call massRequest when all titles are invalid', async function () {
					const res = await mwbot.read(['[', '{']);

					sinon.assert.notCalled(massRequestStub);

					assert.instanceOf(res[0], MwbotError);
					assert.instanceOf(res[1], MwbotError);
				});

				it('should clone duplicate revisions', async function () {
					massRequestStub.resolves([{
						curtimestamp: '2026-01-01T00:00:00Z',
						query: {
							pages: [{
								pageid: 1,
								ns: 0,
								title: 'Foo',
								revisions: [{
									revid: 1,
									user: 'User',
									timestamp: '2025-01-01T00:00:00Z',
									slots: { main: { content: 'Foo' } },
								}],
							}],
						},
					}]);

					const res = await mwbot.read(['Foo', 'Foo']);

					assert.deepEqual(res[0], res[1]);
					assert.notStrictEqual(res[0], res[1]);
				});

				it('should clone duplicate errors', async function () {
					massRequestStub.resolves([{
						curtimestamp: '2026-01-01T00:00:00Z',
						query: {
							pages: [{
								title: 'Foo',
								missing: true,
							}],
						},
					}]);

					const res = await mwbot.read(['Foo', 'Foo']);

					assert.instanceOf(res[0], MwbotError);
					assert.strictEqual(res[0].code, 'pagemissing');

					assert.instanceOf(res[1], MwbotError);
					assert.strictEqual(res[1].code, 'pagemissing');

					assert.notStrictEqual(res[0], res[1]);
				});

				it('should propagate a batch error to every title in the batch', async function () {
					const err = new MwbotError('api_mwbot', {
						code: 'http',
						info: 'Network error',
					});

					massRequestStub.resolves([err]);

					const res = await mwbot.read(['Foo', 'Bar']);

					assert.instanceOf(res[0], MwbotError);
					assert.strictEqual(res[0].code, 'http');

					assert.instanceOf(res[1], MwbotError);
					assert.strictEqual(res[1].code, 'http');
				});

				it('should throw "internal" for an unexpected title returned by the API', async function () {
					massRequestStub.resolves([{
						curtimestamp: '2026-01-01T00:00:00Z',
						query: {
							pages: [{
								pageid: 1,
								ns: 0,
								title: 'Unexpected',
								revisions: [{
									revid: 1,
									timestamp: '2025-01-01T00:00:00Z',
									slots: { main: { content: '' } },
								}],
							}],
						},
					}]);

					try {
						await mwbot.read(['Foo']);
						assert.fail('Expected read() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'internal');
					}
				});

				it('should throw "internal" when the API returns a page without a title', async function () {
					massRequestStub.resolves([{
						curtimestamp: '2026-01-01T00:00:00Z',
						query: {
							pages: [{
								pageid: 1,
								ns: 0,
								revisions: [{
									revid: 1,
									timestamp: '2025-01-01T00:00:00Z',
									slots: { main: { content: '' } },
								}],
							}],
						},
					}]);

					try {
						await mwbot.read(['Foo']);
						assert.fail('Expected read() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'internal');
					}
				});
			});
		});

		describe('getExistencePredicate()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let massRequestStub;

			beforeEach(function () {
				massRequestStub = sinon.stub(mwbot, 'massRequest');
			});

			it('should deduplicate duplicate titles before making the request', async function () {
				massRequestStub.resolves([]);

				await mwbot.getExistencePredicate([
					'Foo',
					'Foo',
					'Bar',
					'Foo',
				]);

				sinon.assert.calledOnce(massRequestStub);
				assert.deepEqual(
					massRequestStub.firstCall.args[0].titles,
					['Foo', 'Bar']
				);
			});

			it('should throw for invalid titles when loose=false', async function () {
				try {
					await mwbot.getExistencePredicate([
						'Foo',
						'Invalid[',
					]);
					assert.fail('Expected getExistencePredicate() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidtitle');
				}
			});

			it('should ignore invalid titles when loose=true', async function () {
				massRequestStub.resolves([]);

				await mwbot.getExistencePredicate(
					['Foo', 'Invalid['],
					{ loose: true }
				);

				sinon.assert.calledOnce(massRequestStub);
				assert.deepEqual(
					massRequestStub.firstCall.args[0].titles,
					['Foo']
				);
			});

			it('should throw request errors by default', async function () {
				const expected = new MwbotError('api_mwbot', {
					code: 'http',
					info: 'Network error',
				});
				massRequestStub.resolves([expected]);

				try {
					await mwbot.getExistencePredicate(['Foo']);
					assert.fail('Expected getExistencePredicate() to throw');
				} catch (err) {
					assert.strictEqual(err, expected);
				}
			});

			it('should suppress request errors when rejectProof=true', async function () {
				massRequestStub.resolves([
					new MwbotError('api_mwbot', {
						code: 'http',
						info: 'Network error',
					}),
				]);

				const exists = await mwbot.getExistencePredicate(
					['Foo'],
					{ rejectProof: true }
				);

				assert.strictEqual(exists('Foo'), null);
			});

			it('should throw "empty" when response.query.pages is missing', async function () {
				massRequestStub.resolves([{}]);

				try {
					await mwbot.getExistencePredicate(['Foo']);
					assert.fail('Expected getExistencePredicate() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
				}
			});

			it('should ignore missing pages arrays when rejectProof=true', async function () {
				massRequestStub.resolves([{}]);

				const exists = await mwbot.getExistencePredicate(
					['Foo'],
					{ rejectProof: true }
				);

				assert.strictEqual(exists('Foo'), null);
			});

			it('should return true for existing pages', async function () {
				massRequestStub.resolves([{
					query: {
						pages: [{
							ns: 0,
							title: 'Foo',
						}],
					},
				}]);

				const exists = await mwbot.getExistencePredicate(['Foo']);

				assert.strictEqual(exists('Foo'), true);
			});

			it('should return false for missing pages', async function () {
				massRequestStub.resolves([{
					query: {
						pages: [{
							ns: 0,
							title: 'Foo',
							missing: true,
						}],
					},
				}]);

				const exists = await mwbot.getExistencePredicate(['Foo']);

				assert.strictEqual(exists('Foo'), false);
			});

			it('should return null for unknown titles', async function () {
				massRequestStub.resolves([{
					query: {
						pages: [{
							ns: 0,
							title: 'Foo',
						}],
					},
				}]);

				const exists = await mwbot.getExistencePredicate(['Foo']);

				assert.strictEqual(exists('Bar'), null);
			});

			it('should accept Title instances', async function () {
				massRequestStub.resolves([{
					query: {
						pages: [{
							ns: 0,
							title: 'Foo',
						}],
					},
				}]);

				const exists = await mwbot.getExistencePredicate(['Foo']);

				assert.strictEqual(exists(new mwbot.Title('Foo')), true);
			});

			it('should return null for invalid predicate input', async function () {
				massRequestStub.resolves([]);

				const exists = await mwbot.getExistencePredicate([]);

				assert.strictEqual(exists('Invalid['), null);
			});
		});

		describe('getCategories()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let continuedRequestStub;

			beforeEach(function () {
				continuedRequestStub = sinon.stub(mwbot, 'continuedRequest');
			});

			it('should throw "emptyinput" for an empty title array', async function () {
				try {
					await mwbot.getCategories([]);
					assert.fail('Expected getCategories() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'emptyinput');
					sinon.assert.notCalled(continuedRequestStub);
				}
			});

			it('should pass hidden=true as clshow=hidden', async function () {
				continuedRequestStub.resolves([]);

				await mwbot.getCategories('Foo', true);

				sinon.assert.calledOnceWithMatch(
					continuedRequestStub,
					{ clshow: 'hidden' }
				);
			});

			it('should pass hidden=false as clshow=!hidden', async function () {
				continuedRequestStub.resolves([]);

				await mwbot.getCategories('Foo', false);

				sinon.assert.calledOnceWithMatch(
					continuedRequestStub,
					{ clshow: '!hidden' }
				);
			});

			it('should omit clshow when hidden is undefined', async function () {
				continuedRequestStub.resolves([]);

				await mwbot.getCategories('Foo');

				const args = continuedRequestStub.firstCall.args[0];

				assert.notProperty(args, 'clshow');
			});

			it('should throw "empty" when response.query.pages is missing', async function () {
				continuedRequestStub.resolves([{}]);

				try {
					await mwbot.getCategories('Foo');
					assert.fail('Expected getCategories() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
				}
			});

			it('should throw "internal" for an unexpected title returned by the API', async function () {
				continuedRequestStub.resolves([{
					query: {
						pages: [{
							title: 'Unexpected',
							categories: [
								{ title: 'Category:A' },
							],
						}],
					},
				}]);

				try {
					await mwbot.getCategories('Foo');
					assert.fail('Expected getCategories() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'internal');
				}
			});

			describe('Single title', function () {
				it('should return category names without the namespace prefix', async function () {
					continuedRequestStub.resolves([{
						query: {
							pages: [{
								title: 'Foo',
								categories: [
									{ title: 'Category:Bar' },
									{ title: 'Category:Baz' },
								],
							}],
						},
					}]);

					const res = await mwbot.getCategories('Foo');

					assert.deepEqual(res, ['Bar', 'Baz']);
				});

				it('should return an empty array if the page has no categories', async function () {
					continuedRequestStub.resolves([{
						query: {
							pages: [{
								title: 'Foo',
							}],
						},
					}]);

					const res = await mwbot.getCategories('Foo');

					assert.deepEqual(res, []);
				});
			});

			describe('Multiple titles', function () {
				it('should return a mapping from titles to category arrays', async function () {
					continuedRequestStub.resolves([{
						query: {
							pages: [
								{
									title: 'Foo',
									categories: [
										{ title: 'Category:A' },
										{ title: 'Category:B' },
									],
								},
								{
									title: 'Bar',
									categories: [
										{ title: 'Category:C' },
									],
								},
							],
						},
					}]);

					const res = await mwbot.getCategories(['Foo', 'Bar']);

					assert.deepEqual(res, {
						Foo: ['A', 'B'],
						Bar: ['C'],
					});
				});

				it('should include pages without categories', async function () {
					continuedRequestStub.resolves([{
						query: {
							pages: [
								{
									title: 'Foo',
									categories: [
										{ title: 'Category:A' },
									],
								},
								{
									title: 'Bar',
								},
							],
						},
					}]);

					const res = await mwbot.getCategories(['Foo', 'Bar']);

					assert.deepEqual(res, {
						Foo: ['A'],
						Bar: [],
					});
				});

				it('should deduplicate category names', async function () {
					continuedRequestStub.resolves([
						{
							query: {
								pages: [{
									title: 'Foo',
									categories: [
										{ title: 'Category:A' },
									],
								}],
							},
						},
						{
							query: {
								pages: [{
									title: 'Foo',
									categories: [
										{ title: 'Category:A' },
										{ title: 'Category:B' },
									],
								}],
							},
						},
					]);

					const res = await mwbot.getCategories(['Foo']);

					assert.deepEqual(res, {
						Foo: ['A', 'B'],
					});
				});
			});
		});

		describe('getCategoriesByPrefix()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let continuedRequestStub;

			beforeEach(function () {
				continuedRequestStub = sinon.stub(mwbot, 'continuedRequest');
			});

			it('should throw "invalidlimit" for zero', async function () {
				try {
					await mwbot.getCategoriesByPrefix('Foo', 0);
					assert.fail('Expected getCategoriesByPrefix() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidlimit');
					sinon.assert.notCalled(continuedRequestStub);
				}
			});

			it('should throw "invalidlimit" for a negative limit', async function () {
				try {
					await mwbot.getCategoriesByPrefix('Foo', -1);
					assert.fail('Expected getCategoriesByPrefix() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidlimit');
					sinon.assert.notCalled(continuedRequestStub);
				}
			});

			it('should throw "invalidlimit" for a non-integer limit', async function () {
				try {
					await mwbot.getCategoriesByPrefix('Foo', 1.5);
					assert.fail('Expected getCategoriesByPrefix() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidlimit');
					sinon.assert.notCalled(continuedRequestStub);
				}
			});

			it('should throw "empty" when response.query.allpages is missing', async function () {
				continuedRequestStub.resolves([
					{},
				]);

				try {
					await mwbot.getCategoriesByPrefix('Foo');
					assert.fail('Expected getCategoriesByPrefix() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
				}
			});

			it('should call continuedRequest() with the correct parameters', async function () {
				const reqOpts = { timeout: 12345 };

				continuedRequestStub.resolves([
					{
						query: {
							allpages: [],
						},
					},
				]);

				await mwbot.getCategoriesByPrefix('Foo', 7, reqOpts);

				sinon.assert.calledOnceWithMatch(
					continuedRequestStub,
					{
						action: 'query',
						format: 'json',
						formatversion: '2',
						list: 'allpages',
						apprefix: 'Foo',
						aplimit: 'max',
					},
					{
						limit: 7,
					},
					reqOpts
				);
			});

			it('should use Infinity as the default continuation limit', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							allpages: [],
						},
					},
				]);

				await mwbot.getCategoriesByPrefix('Foo');

				assert.strictEqual(
					continuedRequestStub.firstCall.args[1].limit,
					Infinity
				);
			});

			it('should return category names without the namespace prefix', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							allpages: [
								{ title: 'Category:Foo' },
								{ title: 'Category:Bar' },
							],
						},
					},
				]);

				const res = await mwbot.getCategoriesByPrefix('F');

				assert.deepEqual(res, ['Foo', 'Bar']);
			});

			it('should merge results from multiple continuation responses', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							allpages: [
								{ title: 'Category:Foo' },
							],
						},
					},
					{
						query: {
							allpages: [
								{ title: 'Category:Bar' },
							],
						},
					},
				]);

				const res = await mwbot.getCategoriesByPrefix('F');

				assert.deepEqual(res, ['Foo', 'Bar']);
			});

			it('should remove duplicate category names', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							allpages: [
								{ title: 'Category:Foo' },
							],
						},
					},
					{
						query: {
							allpages: [
								{ title: 'Category:Foo' },
								{ title: 'Category:Bar' },
							],
						},
					},
				]);

				const res = await mwbot.getCategoriesByPrefix('F');

				assert.deepEqual(res, ['Foo', 'Bar']);
			});

			it('should return an empty array when no categories are found', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							allpages: [],
						},
					},
				]);

				const res = await mwbot.getCategoriesByPrefix('F');

				assert.deepEqual(res, []);
			});
		});

		describe('getCategoryMembers()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let continuedRequestStub;

			beforeEach(function () {
				continuedRequestStub = sinon.stub(mwbot, 'continuedRequest');
			});

			it('should validate category titles', async function () {
				try {
					await mwbot.getCategoryMembers('Foo');
					assert.fail('Expected getCategoryMembers() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidtitle');
					sinon.assert.notCalled(continuedRequestStub);
				}
			});

			it('should map a string title to the "cmtitle" parameter', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							categorymembers: [],
						},
					},
				]);

				await mwbot.getCategoryMembers('Category:Foo');

				sinon.assert.calledOnceWithMatch(
					continuedRequestStub,
					{
						action: 'query',
						format: 'json',
						formatversion: '2',
						list: 'categorymembers',
						cmtitle: 'Category:Foo',
						cmlimit: 'max',
					},
					{ limit: Infinity }
				);
			});

			it('should map a number to the "cmpageid" parameter', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							categorymembers: [],
						},
					},
				]);

				await mwbot.getCategoryMembers(123);

				sinon.assert.calledOnceWithMatch(
					continuedRequestStub,
					{ cmpageid: 123 }
				);
			});

			it('should merge additional parameters', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							categorymembers: [],
						},
					},
				]);

				const params = {
					cmtype: 'page',
				};
				const reqOpts = {
					timeout: 7777,
				};

				await mwbot.getCategoryMembers('Category:Foo', params, reqOpts);

				sinon.assert.calledOnceWithMatch(
					continuedRequestStub,
					{
						...params,
						action: 'query',
						format: 'json',
						formatversion: '2',
						list: 'categorymembers',
						cmtitle: 'Category:Foo',
						cmlimit: 'max',
					},
					{ limit: Infinity },
					reqOpts
				);
			});

			it('should concatenate categorymembers from multiple responses', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							categorymembers: [
								{ pageid: 1, title: 'Foo' },
							],
						},
					},
					{
						query: {
							categorymembers: [
								{ pageid: 2, title: 'Bar' },
							],
						},
					},
				]);

				const res = await mwbot.getCategoryMembers('Category:Foo');

				assert.deepEqual(res, [
					{ pageid: 1, title: 'Foo' },
					{ pageid: 2, title: 'Bar' },
				]);
			});

			it('should throw "empty" when response.query.categorymembers is missing', async function () {
				continuedRequestStub.resolves([
					{
						query: {},
					},
				]);

				try {
					await mwbot.getCategoryMembers('Category:Foo');
					assert.fail('Expected getCategoryMembers() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
				}
			});
		});

		describe('getBacklinks()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let continuedRequestStub;

			beforeEach(function () {
				continuedRequestStub = sinon.stub(mwbot, 'continuedRequest');
			});

			it('should throw "emptyinput" for an empty array', async function () {
				try {
					await mwbot.getBacklinks([]);
					assert.fail('Expected getBacklinks() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'emptyinput');
					sinon.assert.notCalled(continuedRequestStub);
				}
			});

			it('should throw "empty" when response.query.pages is missing', async function () {
				continuedRequestStub.resolves([
					{},
				]);

				try {
					await mwbot.getBacklinks('Foo');
					assert.fail('Expected getBacklinks() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
				}
			});

			it('should throw when the API returns an unexpected title', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							pages: [
								{
									title: 'Unexpected',
									linkshere: [],
								},
							],
						},
					},
				]);

				try {
					await mwbot.getBacklinks('Foo');
					assert.fail('Expected getBacklinks() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'internal');
				}
			});

			describe('single title', function () {
				it('should pass the correct parameters', async function () {
					continuedRequestStub.resolves([
						{ query: { pages: [] } },
					]);

					const params = { lhnamespace: 0 };
					const reqOpts = { timeout: 7777 };

					await mwbot.getBacklinks('Foo', params, reqOpts);

					sinon.assert.calledOnceWithMatch(
						continuedRequestStub,
						{
							...params,
							action: 'query',
							format: 'json',
							formatversion: '2',
							titles: ['Foo'],
							prop: 'linkshere',
							lhlimit: 'max',
						},
						{
							limit: Infinity,
							multiValues: 'titles',
						},
						reqOpts
					);
				});

				it('should return backlinks', async function () {
					const expected = [
						{ pageid: 1, title: 'Bar' },
						{ pageid: 2, title: 'Baz' },
					];

					continuedRequestStub.resolves([
						{
							query: {
								pages: [
									{
										title: 'Foo',
										linkshere: expected,
									},
								],
							},
						},
					]);

					const res = await mwbot.getBacklinks('Foo');

					assert.deepEqual(res, expected);
				});
			});

			describe('multiple titles', function () {
				it('should return an object keyed by title', async function () {
					continuedRequestStub.resolves([
						{
							query: {
								pages: [
									{
										title: 'Foo',
										linkshere: [
											{ pageid: 1, title: 'A' },
										],
									},
									{
										title: 'Bar',
										linkshere: [
											{ pageid: 2, title: 'B' },
										],
									},
								],
							},
						},
					]);

					const res = await mwbot.getBacklinks(['Foo', 'Bar']);

					assert.deepEqual(res, {
						Foo: [{ pageid: 1, title: 'A' }],
						Bar: [{ pageid: 2, title: 'B' }],
					});
				});

				it('should merge continuation responses', async function () {
					continuedRequestStub.resolves([
						{
							query: {
								pages: [
									{
										title: 'Foo',
										linkshere: [
											{ pageid: 1, title: 'A' },
										],
									},
								],
							},
						},
						{
							query: {
								pages: [
									{
										title: 'Foo',
										linkshere: [
											{ pageid: 2, title: 'B' },
										],
									},
								],
							},
						},
					]);

					const res = await mwbot.getBacklinks(['Foo']);

					assert.deepEqual(res, {
						Foo: [
							{ pageid: 1, title: 'A' },
							{ pageid: 2, title: 'B' },
						],
					});
				});
			});
		});

		describe('getTransclusions()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let continuedRequestStub;

			beforeEach(function () {
				continuedRequestStub = sinon.stub(mwbot, 'continuedRequest');
			});

			it('should throw "emptyinput" for an empty array', async function () {
				try {
					await mwbot.getTransclusions([]);
					assert.fail('Expected getTransclusions() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'emptyinput');
					sinon.assert.notCalled(continuedRequestStub);
				}
			});

			it('should throw "empty" when response.query.pages is missing', async function () {
				continuedRequestStub.resolves([
					{},
				]);

				try {
					await mwbot.getTransclusions('Foo');
					assert.fail('Expected getTransclusions() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
				}
			});

			it('should throw when the API returns an unexpected title', async function () {
				continuedRequestStub.resolves([
					{
						query: {
							pages: [
								{
									title: 'Unexpected',
									transcludedin: [],
								},
							],
						},
					},
				]);

				try {
					await mwbot.getTransclusions('Foo');
					assert.fail('Expected getTransclusions() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'internal');
				}
			});

			describe('single title', function () {
				it('should pass the correct parameters', async function () {
					continuedRequestStub.resolves([
						{ query: { pages: [] } },
					]);

					const params = { tinamespace: 10 };
					const reqOpts = { timeout: 7777 };

					await mwbot.getTransclusions('Foo', params, reqOpts);

					sinon.assert.calledOnceWithMatch(
						continuedRequestStub,
						{
							...params,
							action: 'query',
							format: 'json',
							formatversion: '2',
							titles: ['Foo'],
							prop: 'transcludedin',
							tilimit: 'max',
						},
						{
							limit: Infinity,
							multiValues: 'titles',
						},
						reqOpts
					);
				});

				it('should return transclusions', async function () {
					const expected = [
						{ pageid: 1, title: 'Template:A' },
						{ pageid: 2, title: 'Template:B' },
					];

					continuedRequestStub.resolves([
						{
							query: {
								pages: [
									{
										title: 'Foo',
										transcludedin: expected,
									},
								],
							},
						},
					]);

					const res = await mwbot.getTransclusions('Foo');

					assert.deepEqual(res, expected);
				});
			});

			describe('multiple titles', function () {
				it('should return an object keyed by title', async function () {
					continuedRequestStub.resolves([
						{
							query: {
								pages: [
									{
										title: 'Foo',
										transcludedin: [
											{ pageid: 1, title: 'A' },
										],
									},
									{
										title: 'Bar',
										transcludedin: [
											{ pageid: 2, title: 'B' },
										],
									},
								],
							},
						},
					]);

					const res = await mwbot.getTransclusions(['Foo', 'Bar']);

					assert.deepEqual(res, {
						Foo: [{ pageid: 1, title: 'A' }],
						Bar: [{ pageid: 2, title: 'B' }],
					});
				});

				it('should merge continuation responses', async function () {
					continuedRequestStub.resolves([
						{
							query: {
								pages: [
									{
										title: 'Foo',
										transcludedin: [
											{ pageid: 1, title: 'A' },
										],
									},
								],
							},
						},
						{
							query: {
								pages: [
									{
										title: 'Foo',
										transcludedin: [
											{ pageid: 2, title: 'B' },
										],
									},
								],
							},
						},
					]);

					const res = await mwbot.getTransclusions(['Foo']);

					assert.deepEqual(res, {
						Foo: [
							{ pageid: 1, title: 'A' },
							{ pageid: 2, title: 'B' },
						],
					});
				});
			});
		});
	});
}