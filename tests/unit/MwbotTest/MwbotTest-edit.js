import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import { MwbotError } from '../../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotRequestEdit() {
	describe('Edit-related request methods and helpers', function () {
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

		describe('validateTitle()', function () {
			it('should convert a string to a Title object', function () {
				// @ts-expect-error - Protected method
				const title = mwbot.validateTitle('Main Page');

				assert.instanceOf(title, mwbot.Title);
				assert.strictEqual(title.getPrefixedText(), 'Main Page');
			});

			it('should return the same Title instance', function () {
				const title = mwbot.Title.newFromText('Main Page');

				// @ts-expect-error - Protected method
				const ret = mwbot.validateTitle(title);

				assert.strictEqual(ret, title);
			});

			it('should throw typemismatch for invalid types', function () {
				try {
					// @ts-expect-error - Number passed
					mwbot.validateTitle(123);
					assert.fail('Expected validateTitle() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'typemismatch');
				}
			});

			it('should throw invalidtitle when Title.newFromText() returns null', function () {
				sinon.stub(mwbot.Title, 'newFromText').returns(null);

				try {
					// @ts-expect-error - Protected method
					mwbot.validateTitle('Foo');
					assert.fail('Expected validateTitle() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidtitle');
				}
			});

			it('should throw interwikititle for interwiki titles', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.validateTitle('mediawikiwiki:Foo');
					assert.fail('Expected validateTitle() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'interwikititle');
				}
			});

			it('should throw specialtitle for special namespace titles', function () {
				try {
					// @ts-expect-error - Protected method
					mwbot.validateTitle('Special:Version');
					assert.fail('Expected validateTitle() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'specialtitle');
				}
			});

			it('should allow special namespace titles when allowSpecial is true', function () {
				// @ts-expect-error - Protected method
				const title = mwbot.validateTitle('Special:Version', { allowSpecial: true });

				assert.strictEqual(title.getPrefixedText(), 'Special:Version');
			});
		});

		describe('_save()', function () {
			it('should throw "anonymous" error for anonymous authentication', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'isAnonymous').returns(true);

				try {
					// @ts-expect-error - Protected method
					await mwbot._save(new mwbot.Title('Sandbox'), 'content');
					assert.fail('Expected _save() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'anonymous');
				}
			});

			it('should call postWithCsrfToken with merged parameters', async function () {
				const title = new mwbot.Title('Sandbox');
				const expected = { result: /** @type {const} */ ('Success') };
				const stub = sinon.stub(mwbot, 'postWithCsrfToken').resolves({
					edit: expected,
				});

				// @ts-expect-error - Protected method
				const res = await mwbot._save(
					title,
					'text',
					'summary',
					{ createonly: true },
					{ bot: false, tags: 'test' },
					{ timeout: 1 }
				);

				assert.deepInclude(stub.firstCall.args[0], {
					title: 'Sandbox',
					text: 'text',
					summary: 'summary',
					createonly: true,
					bot: false,
					tags: 'test',
					action: 'edit',
				});
				assert.deepEqual(stub.firstCall.args[1], {
					timeout: 1,
				});
				assert.deepEqual(res, expected);
			});

			it('should throw editfailed when edit.result is not Success', async function () {
				const title = new mwbot.Title('Sandbox');
				sinon.stub(mwbot, 'postWithCsrfToken').resolves({
					edit: { result: 'Failure' },
				});

				try {
					// @ts-expect-error - Protected method
					await mwbot._save(
						title,
						'text',
						'summary',
						{},
						{ bot: false, tags: 'test' },
						{ timeout: 1 }
					);
					assert.fail('Expected _edit() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'editfailed');
				}
			});
		});

		describe('create()', function () {
			it('should call _save with createonly=true', async function () {
				const title = new mwbot.Title('Sandbox');
				const expectedResult = {
					result: /** @type {const} */ ('Success'),
				};

				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'validateTitle').returns(title);
				// @ts-expect-error - Protected method
				const saveStub = sinon.stub(mwbot, '_save').resolves({
					result: 'Success',
				});

				const res = await mwbot.create(title, 'text', 'summary');

				assert.deepEqual(res, expectedResult);
				sinon.assert.calledOnceWithExactly(
					saveStub,
					title,
					'text',
					'summary',
					{ createonly: true },
					{},
					undefined
				);
			});
		});

		describe('save()', function () {
			it('should call _save with nocreate=true', async function () {
				const title = new mwbot.Title('Sandbox');
				const expectedResult = {
					result: /** @type {const} */ ('Success'),
				};

				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'validateTitle').returns(title);
				// @ts-expect-error - Protected method
				const saveStub = sinon.stub(mwbot, '_save').resolves(expectedResult);

				const res = await mwbot.save(title, 'text', 'summary');

				assert.deepEqual(res, expectedResult);
				sinon.assert.calledOnceWithExactly(
					saveStub,
					title,
					'text',
					'summary',
					{ nocreate: true },
					{},
					undefined
				);
			});
		});

		describe('edit()', function () {
			/**
			 * @returns {import('../../../dist/index.js').Title}
			 */
			const createTitle = () => new mwbot.Title('Sandbox');
			/**
			 * @param {import('../../../dist/index.js').Title} title
			 * @param {Record<string, any>} override
			 * @returns
			 */
			const createReadResponse = (title, override = {}) => {
				return {
					pageid: 1,
					ns: 0,
					title: title.getPrefixedText(),
					baserevid: 1,
					basetimestamp: new Date(Date.now() - 10000),
					starttimestamp: new Date(),
					content: 'content',
					...override,
				};
			};
			/**
			 * @type {sinon.SinonStub}
			 */
			let readStub;
			/**
			 * @type {sinon.SinonStub}
			 */
			let postWithCsrfToken;

			beforeEach(function () {
				readStub = sinon.stub(mwbot, 'read');
				postWithCsrfToken = sinon.stub(mwbot, 'postWithCsrfToken');
			});

			afterEach(function () {
				sinon.restore();
			});

			it('should throw typemismatch error when the transformation predicate is not a function', async function () {
				try {
					// @ts-expect-error - Passing a non-function
					await mwbot.edit(createTitle(), 1);
					assert.fail('Expected edit() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'typemismatch');
					sinon.assert.notCalled(postWithCsrfToken);
				}
			});

			it('should throw aborted when the transformation predicate returns null', async function () {
				const title = createTitle();
				readStub.resolves(createReadResponse(title));

				try {
					await mwbot.edit(title, () => null);
					assert.fail('Expected edit() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'aborted');
					sinon.assert.notCalled(postWithCsrfToken);
				}
			});

			it('should pass requestOptions to both read() and postWithCsrfToken()', async function () {
				const title = createTitle();
				const response = createReadResponse(title);
				const requestOptions = {
					timeout: 1000,
					headers: {
						'X-Test': 'test',
					},
				};
				readStub.resolves(response);
				postWithCsrfToken.resolves({
					edit: { result: 'Success' },
				});

				await mwbot.edit(title, () => ({}), requestOptions);

				assert.deepInclude(readStub.firstCall.args[1], requestOptions);
				assert.notProperty(readStub.firstCall.args[1], '_cloned');
				assert.deepInclude(postWithCsrfToken.firstCall.args[1], requestOptions);
				assert.notProperty(postWithCsrfToken.firstCall.args[1], '_cloned');
			});

			it('should await an asynchronous transformation predicate', async function () {
				const title = createTitle();
				readStub.resolves(createReadResponse(title));
				postWithCsrfToken.resolves({
					edit: { result: 'Success' },
				});

				await mwbot.edit(title, async () => ({ text: 'new content' }));

				sinon.assert.calledOnceWithMatch(
					postWithCsrfToken,
					{ text: 'new content' }
				);
			});

			it('should remove title when both title and pageid are provided', async function () {
				const title = createTitle();
				const response = createReadResponse(title);
				readStub.resolves(response);
				postWithCsrfToken.resolves({
					edit: { result: 'Success' },
				});

				await mwbot.edit(title, () => ({
					title: 'Another',
					pageid: 123,
				}));

				assert.strictEqual(
					postWithCsrfToken.firstCall.args[0].pageid,
					123
				);
				assert.notProperty(
					postWithCsrfToken.firstCall.args[0],
					'title'
				);
			});

			it('should throw typemismatch when the transformation predicate returns a non-plain object', async function () {
				const title = createTitle();
				readStub.resolves(createReadResponse(title));

				try {
					// @ts-expect-error - Transformation predicate returns an invalid value
					await mwbot.edit(title, async () => 1);
					assert.fail('Expected edit() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'typemismatch');
				}
			});

			it('should merge revision data into the finalized parameters', async function () {
				const title = createTitle();
				const response = createReadResponse(title);
				readStub.resolves(response);
				postWithCsrfToken.resolves({
					edit: { result: 'Success' },
				});

				await mwbot.edit(title, () => ({
					text: 'new content',
				}));

				sinon.assert.calledOnceWithMatch(
					postWithCsrfToken,
					{
						title: response.title,
						text: 'new content',
						bot: true,
						nocreate: true,
						baserevid: response.baserevid,
						basetimestamp: response.basetimestamp,
						starttimestamp: response.starttimestamp,
						action: 'edit',
					}
				);
			});

			it('should not retry for an edit conflict after three failures', async function () {
				const title = createTitle();
				readStub.resolves(createReadResponse(title));
				postWithCsrfToken.rejects(
					new MwbotError('api', {
						code: 'editconflict',
						info: '',
					})
				);

				try {
					await mwbot.edit(title, () => ({}), undefined, 3);
					assert.fail('Expected edit() to reject');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'editconflict');
					sinon.assert.calledOnce(postWithCsrfToken);
				}
			});

			it('should not retry for an edit conflict when disableRetry is enabled', async function () {
				const title = createTitle();
				readStub.resolves(createReadResponse(title));
				postWithCsrfToken.rejects(
					new MwbotError('api', {
						code: 'editconflict',
						info: '',
					})
				);

				try {
					await mwbot.edit(title, () => ({}), { disableRetry: true });
					assert.fail('Expected edit() to reject');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'editconflict');
					sinon.assert.calledOnce(postWithCsrfToken);
				}
			});

			it('should not retry for an edit conflict when disableRetryAPI is enabled', async function () {
				const title = createTitle();
				readStub.resolves(createReadResponse(title));
				postWithCsrfToken.rejects(
					new MwbotError('api', {
						code: 'editconflict',
						info: '',
					})
				);

				try {
					await mwbot.edit(title, () => ({}), { disableRetryAPI: true });
					assert.fail('Expected edit() to reject');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'editconflict');
					sinon.assert.calledOnce(postWithCsrfToken);
				}
			});

			it('should not retry for an edit conflict when disableRetryByCode includes "editconflict"', async function () {
				const title = createTitle();
				readStub.resolves(createReadResponse(title));
				postWithCsrfToken.rejects(
					new MwbotError('api', {
						code: 'editconflict',
						info: '',
					})
				);

				try {
					await mwbot.edit(title, () => ({}), { disableRetryByCode: ['editconflict'] });
					assert.fail('Expected edit() to reject');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'editconflict');
					sinon.assert.calledOnce(postWithCsrfToken);
				}
			});

			it('should retry when encountering an edit conflict', async function () {
				const clock = sinon.useFakeTimers();
				const title = createTitle();
				const expectedResponse = {
					edit: { result: 'Success' },
				};
				readStub.resolves(createReadResponse(title));
				postWithCsrfToken
					.onFirstCall()
					.rejects(
						new MwbotError('api', {
							code: 'editconflict',
							info: '',
						})
					)
					.onSecondCall()
					.resolves(expectedResponse);

				try {
					const promise = mwbot.edit(title, () => ({}));

					await Promise.resolve();

					sinon.assert.calledOnce(readStub);
					sinon.assert.calledOnce(postWithCsrfToken);

					await clock.tickAsync(5000);

					const res = await promise;

					sinon.assert.calledTwice(readStub);
					sinon.assert.calledTwice(postWithCsrfToken);
					assert.deepEqual(res, expectedResponse.edit);
				} catch (err) {
					console.error('%o', err);
					assert.fail('Expected edit() to suceed');
				} finally {
					clock.restore();
				}
			});

			it('should return response.edit on success', async function () {
				const title = createTitle();
				const response = createReadResponse(title);
				const expected = {
					result: /** @type {const} */ ('Success'),
					pageid: 1,
					title: 'Sandbox',
				};
				readStub.resolves(response);
				postWithCsrfToken.resolves({
					edit: expected,
				});

				const res = await mwbot.edit(title, () => ({}));

				assert.deepEqual(res, expected);
			});

			it('should throw editfailed when the edit does not succeed', async function () {
				const title = createTitle();
				readStub.resolves(createReadResponse(title));
				postWithCsrfToken.resolves({
					edit: {
						result: 'Failure',
					},
				});

				try {
					await mwbot.edit(title, () => ({}));
					assert.fail('Expected edit() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'editfailed');
				}
			});
		});

		describe('newSection()', function () {
			it('should call _save with section=new and sectiontitle', async function () {
				const title = new mwbot.Title('Sandbox');
				const expectedResult = {
					result: /** @type {const} */ ('Success'),
				};

				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'validateTitle').returns(title);
				// @ts-expect-error - Protected method
				const saveStub = sinon.stub(mwbot, '_save').resolves(expectedResult);

				const res = await mwbot.newSection(
					title,
					'Heading',
					'text',
					'summary'
				);

				assert.deepEqual(res, expectedResult);
				sinon.assert.calledOnceWithExactly(
					saveStub,
					title,
					'text',
					'summary',
					{
						section: 'new',
						sectiontitle: 'Heading',
					},
					{},
					undefined
				);
			});
		});
	});
}
