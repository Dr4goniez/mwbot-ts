import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MwbotError } from '../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotRequestToken() {
	describe('Token-related request methods and helpers', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
		 */
		let mwbot;

		before(async function () {
			mwbot = await getTestMwbot('named');
		});

		beforeEach(function() {
			// @ts-expect-error - Protected property
			sinon.stub(mwbot, 'tokens').value({});
		});

		afterEach(function () {
			sinon.restore();
		});

		describe('postWithToken()', function () {
			it('should deep-clone parameters and requestOptions', async function () {
				sinon.stub(mwbot, 'getToken').resolves('TOKEN');
				const postStub = sinon.stub(mwbot, 'post').resolves({ success: 1 });

				const parameters = {
					action: /** @type {const} */ ('edit'),
					title: 'Sandbox',
					foo: ['Foo'],
				};
				const reqOpts = {
					headers: {
						'X-Foo': 'Foo',
					},
				};

				await mwbot.postWithToken('csrf', parameters, reqOpts);

				parameters.foo.push('Baz');
				reqOpts.headers['X-Foo'] = 'Bar';

				assert.deepInclude(
					postStub.firstCall.args[0],
					{
						action: 'edit',
						title: 'Sandbox',
						foo: ['Foo'],
					}
				);
				assert.deepInclude(
					postStub.firstCall.args[1],
					{
						headers: {
							'X-Foo': 'Foo',
						},
					}
				);
			});

			it('should get a token and post', async function () {
				const getTokenStub = sinon.stub(mwbot, 'getToken').resolves('TOKEN');
				const postStub = sinon.stub(mwbot, 'post').resolves({ success: 1 });

				const res = await mwbot.postWithToken('csrf', {
					action: 'edit',
					title: 'Sandbox',
				});

				assert.strictEqual(res.success, 1);
				assert.isTrue(
					getTokenStub.calledOnceWithExactly('csrf', {
						assert: undefined,
						assertuser: undefined,
					})
				);
				assert.deepInclude(postStub.firstCall.args[0], {
					action: 'edit',
					title: 'Sandbox',
					token: 'TOKEN',
				});
			});

			it('should retry once after badtoken', async function () {
				const getTokenStub = sinon.stub(mwbot, 'getToken')
					.onFirstCall().resolves('OLD')
					.onSecondCall().resolves('NEW');
				const badTokenStub = sinon.stub(mwbot, 'badToken');

				const postStub = sinon.stub(mwbot, 'post');
				postStub
					.onFirstCall()
					.rejects(new MwbotError('api', {
						code: 'badtoken',
						info: '',
					}))
					.onSecondCall()
					.resolves({ success: 1 });

				const res = await mwbot.postWithToken('csrf', {
					action: 'edit',
				});

				assert.strictEqual(res.success, 1);
				assert.strictEqual(postStub.callCount, 2);
				assert.isTrue(
					getTokenStub.firstCall.calledWithExactly('csrf', {
						assert: undefined,
						assertuser: undefined,
					})
				);
				assert.strictEqual(getTokenStub.callCount, 2);
				assert.isTrue(badTokenStub.calledOnceWithExactly('csrf'));
				assert.strictEqual(postStub.secondCall.args[0].token, 'NEW');
			});

			it('should rethrow non-badtoken errors', async function () {
				sinon.stub(mwbot, 'getToken').resolves('TOKEN');
				sinon.stub(mwbot, 'post').rejects(
					new MwbotError('api', {
						code: 'permissiondenied',
						info: '',
					})
				);
				const badTokenSpy = sinon.spy(mwbot, 'badToken');

				try {
					await mwbot.postWithToken('csrf', { action: 'edit' });
					assert.fail('Expected postWithToken() to reject');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.isTrue(badTokenSpy.notCalled);
				}
			});
		});

		describe('getToken()', function () {
			it('should return cached token', async function () {
				// @ts-expect-error - Protected property
				mwbot.tokens.csrftoken = 'TOKEN';
				const getStub = sinon.stub(mwbot, 'get');

				assert.strictEqual(
					await mwbot.getToken('csrf'),
					'TOKEN'
				);
				assert.isTrue(getStub.notCalled);
			});

			it('should retrieve and cache token', async function () {
				sinon.stub(mwbot, 'get').resolves({
					query: {
						tokens: {
							csrftoken: 'TOKEN',
							watchtoken: 'WATCH',
						},
					},
				});

				const token = await mwbot.getToken('csrf');

				assert.strictEqual(token, 'TOKEN');
				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot.tokens.csrftoken, 'TOKEN');
			});

			it('should convert string additionalParams to assert parameter', async function () {
				const getStub = sinon.stub(mwbot, 'get').resolves({
					query: {
						tokens: {
							csrftoken: 'TOKEN',
						},
					},
				});

				await mwbot.getToken('csrf', 'user');

				// @ts-expect-error - TS complains due to TestMwbot overriding get()
				assert.deepInclude(getStub.firstCall.args[0], {
					assert: 'user',
					format: 'json',
					formatversion: '2',
					action: 'query',
					meta: 'tokens',
					type: '*',
				});
			});

			it('should throw badnamedtoken errors when the passed token name is invalid', async function () {
				sinon.stub(mwbot, 'get').resolves({
					query: {
						tokens: {
							csrftoken: 'TOKEN',
						},
					},
				});

				try {
					await mwbot.getToken('foo');
					assert.fail('Expected getToken() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'badnamedtoken');
				}
			});

			it('should throw "empty" errors when receiving empty responses', async function () {
				sinon.stub(mwbot, 'get').resolves({
					query: {},
				});

				try {
					await mwbot.getToken('csrf');
					assert.fail('Expected getToken() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					assert.deepEqual(err.data?.response, { query: {} });
				}
			});
		});

		describe('mapLegacyToken()', function () {
			it('should map edit to csrf', function () {
				assert.strictEqual(
					// @ts-expect-error - Protected method
					Mwbot.mapLegacyToken('edit'),
					'csrf'
				);
			});

			it('should remove token suffix', function () {
				assert.strictEqual(
					// @ts-expect-error - Protected method
					Mwbot.mapLegacyToken('edittoken'),
					'csrf'
				);
			});

			it('should keep unknown token types', function () {
				assert.strictEqual(
					// @ts-expect-error - Protected method
					Mwbot.mapLegacyToken('watch'),
					'watch'
				);
			});
		});

		describe('badToken()', function () {
			it('should delete cached token', function () {
				// @ts-expect-error - Protected property
				mwbot.tokens.csrftoken = 'TOKEN';

				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot.tokens.csrftoken, 'TOKEN');

				const ret = mwbot.badToken('csrf');

				assert.strictEqual(ret, mwbot);
				// @ts-expect-error - Protected property
				assert.isUndefined(mwbot.tokens.csrftoken);
			});

			it('should support legacy token names', function () {
				// @ts-expect-error - Protected property
				mwbot.tokens.csrftoken = 'TOKEN';

				mwbot.badToken('edit');

				// @ts-expect-error - Protected property
				assert.isUndefined(mwbot.tokens.csrftoken);
			});
		});

		describe('getTokenType()', function () {
			it('should return token type', async function () {
				const getStub = sinon.stub(mwbot, 'get').resolves({
					paraminfo: {
						modules: [{
							parameters: [
								{
									name: 'token',
									tokentype: 'csrf',
								},
							],
						}],
					},
				});

				// @ts-expect-error - Protected method
				const token = await mwbot.getTokenType('edit');

				assert.strictEqual(token, 'csrf');
				assert.deepEqual(
					// @ts-expect-error - TS complains due to TestMwbot overriding get()
					getStub.firstCall.args[1],
					{ disableRetryByCode: ['badtoken'] }
				);
			});

			it('should return null when token parameter does not exist', async function () {
				sinon.stub(mwbot, 'get').resolves({
					paraminfo: {
						modules: [{
							parameters: [],
						}],
					},
				});

				// @ts-expect-error - Protected method
				const token = await mwbot.getTokenType('csrf');

				assert.isNull(token, 'csrf');
			});

			it('should return null on request failure', async function () {
				sinon.stub(mwbot, 'get').rejects();

				// @ts-expect-error - Protected method
				const token = await mwbot.getTokenType('csrf');

				assert.isNull(token, 'csrf');
			});
		});

		describe('postWithCsrfToken()', function () {
			it('should delegate to postWithToken', async function () {
				const stub = sinon.stub(mwbot, 'postWithToken').resolves({});

				await mwbot.postWithCsrfToken({ action: 'edit' });

				assert.isTrue(
					stub.calledOnceWithExactly(
						'csrf',
						{ action: 'edit' },
						undefined
					)
				);
			});
		});

		describe('getCsrfToken()', function () {
			it('should delegate to getToken', async function () {
				const stub = sinon.stub(mwbot, 'getToken').resolves('TOKEN');

				const token = await mwbot.getCsrfToken();

				assert.strictEqual(token, 'TOKEN');
				assert.isTrue(
					stub.calledOnceWithExactly(
						'csrf',
						undefined,
						undefined
					)
				);
			});
		});
	});
}