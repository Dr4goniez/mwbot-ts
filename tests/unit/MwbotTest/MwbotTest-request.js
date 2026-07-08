import { describe, it, before, afterEach, beforeEach } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MwbotError } from '../../../dist/index.js';
import { Logger } from '../../../dist/build/internal/Logger.js';
import {
	createApiErrorResponse,
	createAxiosError,
	createAxiosResponse,
	createMwbotError,
	createRequestOptions,
	getTestMwbot,
} from './MwbotTest-fixtures.js';
import sinon from 'sinon';
import FormData from 'form-data';

export function testMwbotRequest() {
	describe('Core request methods', function () {
		describe('unrefRequestOptions()', function () {
			// @ts-expect-error - Protected method
			const unrefRequestOptions = Mwbot.unrefRequestOptions.bind(Mwbot);

			it('should return { _cloned: true } if requestOptions is undefined', function () {
				const result = unrefRequestOptions(undefined);
				// @ts-expect-error - _cloned is hidden to the public
				assert.deepEqual(result, { _cloned: true });
			});

			it('should return { _cloned: true } if requestOptions is an empty object', function () {
				const result = unrefRequestOptions({});
				// @ts-expect-error - _cloned is hidden to the public
				assert.deepEqual(result, { _cloned: true });
			});

			it('should return { _cloned: true } for an empty null-prototype object', function () {
				const result = unrefRequestOptions(Object.create(null));
				// @ts-expect-error - _cloned is hidden to the public
				assert.deepEqual(result, { _cloned: true });
			});

			it('should return the original object as-is if _cloned is already true', function () {
				const original = { timeout: 1000, _cloned: true };
				const result = unrefRequestOptions(original);

				assert.strictEqual(result, original);

				result.timeout = 2000;
				assert.strictEqual(original.timeout, 2000);
			});

			it('should deeply clone a non-empty object and mark it as cloned', function () {
				const original = {
					timeout: 5000,
					headers: { 'User-Agent': 'TestBot/1.0' },
				};
				const result = unrefRequestOptions(original);

				// @ts-expect-error - _cloned is hidden to the public
				assert.isTrue(result._cloned);
				assert.strictEqual(result.timeout, 5000);
				assert.strictEqual(result.headers?.['User-Agent'], 'TestBot/1.0');

				// @ts-expect-error - _cloned is hidden to the public
				assert.isUndefined(original._cloned, '_cloned should only be set to the output object');

				// Ensure `result` is a deep clone
				assert.notStrictEqual(result, original);
				assert.notStrictEqual(result.headers, original.headers);

				result.headers ??= {};
				result.headers['User-Agent'] = 'ChangedAgent/2.0';
				assert.strictEqual(original.headers['User-Agent'], 'TestBot/1.0');
			});

			it('should not clone the same object twice', function () {
				const original = {
					timeout: 5000,
					headers: {
						foo: 'bar',
					},
				};
				const first = unrefRequestOptions(original);
				const second = unrefRequestOptions(first);

				assert.strictEqual(first, second);
			});
		});

		describe('rawRequest()', function () {
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

			it('should deep-copy request options when _closed is not set', async function () {
				// @ts-expect-error - axios is a property rather than a method
				const axiosStub = sinon.stub(mwbot, 'axios').resolves({
					data: 'success',
				});
				const requestOptions = {
					headers: {
						foo: 'bar',
					},
				};
				const res = await mwbot.rawRequest(requestOptions);

				axiosStub.firstCall.args[0].headers.foo = 'baz';

				assert.strictEqual(res.data, 'success');
				assert.strictEqual(requestOptions.headers.foo, 'bar');
			});

			it('should not clone request options when _cloned is true', async function () {
				let passedOptions;
				// @ts-expect-error - axios is a property rather than a method
				sinon.stub(mwbot, 'axios').callsFake(async (options) => {
					passedOptions = options;
					return { data: 'success' };
				});
				const requestOptions = {
					_cloned: true,
					timeout: 10000,
				};

				await mwbot.rawRequest(requestOptions);

				assert.strictEqual(passedOptions, requestOptions);
			});

			it('should bypass AbortController if disableAbort is true', async function () {
				// @ts-expect-error - axios is a property rather than a method
				const axiosStub = sinon.stub(mwbot, 'axios').resolves({
					data: 'success',
				});
				const res = await mwbot.rawRequest({
					disableAbort: true,
				});

				assert.strictEqual(res.data, 'success');
				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot.abortions.size, 0);
				assert.isUndefined(axiosStub.firstCall.args[0].signal);
			});

			it('should bypass AbortController if signal is provided', async function () {
				// @ts-expect-error - axios is a property rather than a method
				const axiosStub = sinon.stub(mwbot, 'axios').resolves({
					data: 'success',
				});
				const controller = new AbortController();
				const res = await mwbot.rawRequest({
					signal: controller.signal,
				});

				assert.strictEqual(res.data, 'success');
				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot.abortions.size, 0);
				assert.strictEqual(axiosStub.firstCall.args[0].signal, controller.signal);
			});

			it('should inject AbortController and clean it up after request', async function () {
				// @ts-expect-error - axios is a property rather than a method
				sinon.stub(mwbot, 'axios').callsFake(async (options) => {
					assert.isDefined(options.signal);
					// @ts-expect-error - Protected property
					assert.strictEqual(mwbot.abortions.size, 1);

					return { data: 'success' };
				});
				const res = await mwbot.rawRequest({});

				assert.strictEqual(res.data, 'success');
				// @ts-expect-error - Protected property
				assert.strictEqual(mwbot.abortions.size, 0);
			});

			it('should clean up AbortController after request rejection', async function () {
				// @ts-expect-error - axios is a property rather than a method
				sinon.stub(mwbot, 'axios').rejects(new Error('boom'));

				try {
					await mwbot.rawRequest({});
					assert.fail('Expected rawRequest() to reject');
				} catch {
					// @ts-expect-error - Protected property
					assert.strictEqual(mwbot.abortions.size, 0);
				}
			});
		});

		describe('request()', function () {
			afterEach(function () {
				sinon.restore();
			});

			it('should deep-clone the passed arguments', async function () {
				const mwbot = await getTestMwbot('named');
				// @ts-expect-error - Protected method
				const requestStub = sinon.stub(mwbot, '_request').resolves({
					batchcomplete: true,
				});
				const params = {
					action: /** @type {const} */ ('query'),
					titles: ['Foo', 'Bar'],
				};
				const requestOptions = {
					headers: {
						'X-Foo': 'bar',
					},
				};

				const promise =  mwbot.request(params, requestOptions);

				// Mutate the passed arguments
				params.titles.push('Baz');
				requestOptions.headers['X-Foo'] = 'baz';

				await promise;

				const passedOptions = requestStub.firstCall.args[0];
				assert.deepEqual(passedOptions.params.titles, ['Foo', 'Bar']);
				assert.notStrictEqual(passedOptions.params.titles,	params.titles);
				assert.strictEqual(passedOptions.headers['X-Foo'], 'bar');
				assert.notStrictEqual(passedOptions.headers, requestOptions.headers);
				assert.isTrue(passedOptions._cloned);
			});
		});

		describe('prepareRequest()', function () {
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

			it('should return finalized query parameters', async function () {
				const reqOpts = createRequestOptions(mwbot);

				assert.isObject(reqOpts.params);

				// @ts-expect-error - Protected method
				const finalizedParams = await mwbot.prepareRequest(reqOpts);

				assert.deepEqual(finalizedParams, reqOpts.params);
				assert.notStrictEqual(finalizedParams, reqOpts.params);
			});

			it('should normalize and deduplicate request headers', async function () {
				const reqOpts = createRequestOptions(mwbot);
				reqOpts.headers ??={};
				reqOpts.headers['X-Foo'] = 1;
				reqOpts.headers['x-foo'] = 2;

				// @ts-expect-error - Protected method
				await mwbot.prepareRequest(reqOpts);

				assert.strictEqual(reqOpts.headers['X-Foo'], 2);
				assert.isUndefined(reqOpts.headers['x-foo']);
			});

			it('should throw "invalidformat" if format is not json', async function () {
				const reqOpts = {
					params: {
						action: 'query',
						format: 'xml',
					},
				};

				try {
					// @ts-expect-error - Protected method
					await mwbot.prepareRequest(reqOpts);
					assert.fail('Expected request() to reject');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'invalidformat');
				}
			});

			it('should enforce assert=user for authenticated users', async function () {
				const reqOpts = createRequestOptions(mwbot);

				assert.isObject(reqOpts.params);
				assert.isUndefined(reqOpts.params.assert);

				// @ts-expect-error - Protected method
				const finalizedParams = await mwbot.prepareRequest(reqOpts);

				assert.strictEqual(finalizedParams.assert, 'user');
			});

			it('should not enforce assert=user when disableAssert is true', async function () {
				const reqOpts = createRequestOptions(mwbot, { disableAssert: true });

				assert.isObject(reqOpts.params);
				assert.isUndefined(reqOpts.params.assert);

				// @ts-expect-error - Protected method
				const finalizedParams = await mwbot.prepareRequest(reqOpts);

				assert.isUndefined(finalizedParams.assert);
			});

			it('should not enforce assert=user when assertuser is already provided', async function () {
				const reqOpts = createRequestOptions(mwbot, {
					params: { assertuser: 'Admin' },
				});

				assert.isObject(reqOpts.params);
				assert.isUndefined(reqOpts.params.assert);

				// @ts-expect-error - Protected method
				const finalizedParams = await mwbot.prepareRequest(reqOpts);

				assert.isUndefined(finalizedParams.assert);
				assert.strictEqual(finalizedParams.assertuser, 'Admin');
			});

			it('should not override an existing assert parameter', async function () {
				const reqOpts = createRequestOptions(mwbot, {
					params: { assert: 'bot' },
				});

				assert.isObject(reqOpts.params);
				assert.strictEqual(reqOpts.params.assert, 'bot');

				// @ts-expect-error - Protected method
				const finalizedParams = await mwbot.prepareRequest(reqOpts);

				assert.strictEqual(finalizedParams.assert, 'bot');
			});

			it('should merge apiUrl and user agent from userMwbotOptions', async function () {
				const reqOpts = createRequestOptions(mwbot, {
					headers: {
						'user-agent': 'Foo',
					},
				});
				delete reqOpts.url;
				delete reqOpts.headers?.['User-Agent'];
				sinon.stub(mwbot, 'userMwbotOptions').value({
					apiUrl: 'API_URL',
					// @ts-expect-error - Protected property
					credentials: mwbot.credentials,
					userAgent: 'USER_AGENT',
				});

				assert.strictEqual(reqOpts.headers?.['user-agent'], 'Foo');

				// @ts-expect-error - Protected method
				await mwbot.prepareRequest(reqOpts);

				assert.strictEqual(reqOpts.url, 'API_URL');
				assert.strictEqual(reqOpts.headers?.['User-Agent'], 'USER_AGENT');
				assert.isUndefined(reqOpts.headers?.['user-agent']);
			});

			it('should keep GET when autoMethod is true and parameters are short', async function () {
				const reqOpts = createRequestOptions(mwbot, {
					method: 'GET',
					params: {
						titles: 'a'.repeat(1900),
					},
					autoMethod: true,
				});

				// @ts-expect-error - Protected method
				await mwbot.prepareRequest(reqOpts);

				assert.strictEqual(reqOpts.method, 'GET');
				assert.isUndefined(reqOpts.autoMethod);
				assert.isUndefined(reqOpts.headers?.['Promise-Non-Write-API-Action']);
			});

			it('should switch to POST when autoMethod is true and parameters are long', async function () {
				const reqOpts = createRequestOptions(mwbot, {
					method: 'GET',
					params: {
						titles: 'a'.repeat(2100),
					},
					autoMethod: true,
				});

				// @ts-expect-error - Protected method
				await mwbot.prepareRequest(reqOpts);

				assert.strictEqual(reqOpts.method, 'POST');
				assert.isUndefined(reqOpts.autoMethod);
			});

			it('should call applyAuthentication()', async function () {
				// @ts-expect-error - Protected method
				const authSpy = sinon.spy(mwbot, 'applyAuthentication');
				const reqOpts = createRequestOptions(mwbot);

				// @ts-expect-error - Protected method
				await mwbot.prepareRequest(reqOpts);

				sinon.assert.calledOnce(authSpy);
			});

			it('should preserve query parameters for GET requests', async function () {
				const reqOpts = createRequestOptions(mwbot, {
					method: 'GET',
				});

				// @ts-expect-error - Protected method
				await mwbot.prepareRequest(reqOpts);

				assert.exists(reqOpts.params);
				assert.isUndefined(reqOpts.data);
			});

			it('should set the request body and delete query parameters for POST requests', async function () {
				const reqOpts = createRequestOptions(mwbot, {
					method: 'POST',
				});

				// @ts-expect-error - Protected method
				await mwbot.prepareRequest(reqOpts);

				assert.instanceOf(reqOpts.data, URLSearchParams);
				assert.include(reqOpts.data.toString(), 'action=query');
				assert.isUndefined(reqOpts.params);
			});
		});

		describe('preprocessParameters()', function () {
			it('should properly format arrays, booleans, and Dates', function () {
				/** @type {Record<string, any>} */
				const params = {
					normal: 'string',
					arr1: ['a', 'b'],
					arr2: ['a|b', 'c'],
					boolTrue: true,
					boolFalse: false,
					boolUndef: undefined,
					date: new Date('2026-01-01T00:00:00Z'),
				};
				// @ts-expect-error - Protected method
				const result = Mwbot.preprocessParameters(params);

				assert.strictEqual(params.normal, 'string');
				assert.strictEqual(params.arr1, 'a|b');
				assert.strictEqual(params.arr2, '\x1fa|b\x1fc');
				assert.strictEqual(params.boolTrue, '1');
				assert.isUndefined(params.boolFalse);
				assert.isUndefined(params.boolUndef);
				assert.strictEqual(params.date, '2026-01-01T00:00:00.000Z');

				assert.isFalse(result.hasLongFields);
				assert.isAbove(result.length, 0);
			});

			it('should detect fields longer than 8000 characters', function () {
				const params = {
					short: 'a',
					long: 'A'.repeat(8001),
				};
				// @ts-expect-error - Protected method
				const result = Mwbot.preprocessParameters(params);

				assert.isTrue(result.hasLongFields);
			});
		});

		describe('handlePost()', function () {
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

			const POST_METHOD = { method: 'POST' };

			it('should reject if the request method is not POST', async function () {
				try {
					// @ts-expect-error - Protected method
					await mwbot.handlePost({ method: 'GET' }, false);
					assert.fail('Expected handlePost() to reject');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'internal');
					assert.strictEqual(err.info, 'Expected request method to be "POST", but received "GET".');
				}
			});

			it('should mutate the provided request options object', async function () {
				/** @type {Record<string, any>} */
				const reqOpts = {
					...POST_METHOD,
					params: {
						action: 'edit',
						title: 'Test',
					},
				};
				const original = reqOpts;
				// @ts-expect-error - Protected method
				await mwbot.handlePost(reqOpts, false);

				assert.strictEqual(reqOpts, original);
				assert.instanceOf(reqOpts.data, URLSearchParams);
			});

			it('should add "Promise-Non-Write-API-Action" header for query/parse actions', async function () {
				/** @type {Record<string, any>} */
				const reqOpts = {
					...POST_METHOD,
					headers: {},
					params: { action: 'parse' },
				};
				// @ts-expect-error - Protected method
				await mwbot.handlePost(reqOpts, false);

				assert.strictEqual(reqOpts.headers['Promise-Non-Write-API-Action'], '1');
			});

			it('should format data as URLSearchParams for standard POST', async function () {
				/** @type {Record<string, any>} */
				const reqOpts = {
					...POST_METHOD,
					headers: {},
					params: { action: 'edit', title: 'Test' },
				};
				// @ts-expect-error - Protected method
				await mwbot.handlePost(reqOpts, false);

				assert.strictEqual(reqOpts.headers['Content-Type'], 'application/x-www-form-urlencoded');
				assert.instanceOf(reqOpts.data, URLSearchParams);
				assert.strictEqual(reqOpts.data.get('title'), 'Test');
			});

			it('should re-append token if user is authenticated', async function () {
				/** @type {Record<string, any>} */
				const reqOpts = {
					...POST_METHOD,
					params: { action: 'edit', token: 'abc+\\', title: 'Foo' },
				};
				// @ts-expect-error - Protected method
				await mwbot.handlePost(reqOpts, false);

				assert.strictEqual(reqOpts.params.token, 'abc+\\');
				assert.instanceOf(reqOpts.data, URLSearchParams);
				assert.deepEqual([...reqOpts.data.entries()].at(-1), ['token', 'abc+\\']);
			});

			it('should delegate to handlePostMultipartFormData if hasLongFields is true', async function () {
				// @ts-expect-error - Protected method
				const handlerStub = sinon.stub(mwbot, 'handlePostMultipartFormData');

				/** @type {Record<string, any>} */
				const reqOpts = {
					...POST_METHOD,
					params: { action: 'edit' },
				};
				// @ts-expect-error - Protected method
				await mwbot.handlePost(reqOpts, true);

				assert.strictEqual(reqOpts.headers?.['Content-Type'], 'multipart/form-data');
				sinon.assert.calledOnce(handlerStub);
			});

			it('should delegate to handlePostMultipartFormData if Content-Type is multipart/form-data', async function () {
				// @ts-expect-error - Protected method
				const handlerStub = sinon.stub(mwbot, 'handlePostMultipartFormData');

				/** @type {Record<string, any>} */
				const reqOpts = {
					...POST_METHOD,
					headers: { 'Content-Type': 'multipart/form-data' },
					params: { action: 'edit' },
				};
				// @ts-expect-error - Protected method
				await mwbot.handlePost(reqOpts, false);

				assert.strictEqual(reqOpts.headers['Content-Type'], 'multipart/form-data');
				sinon.assert.calledOnce(handlerStub);
			});
		});

		describe('handlePostMultipartFormData()', function () {
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

			it('should create FormData and calculate headers/content-length correctly', async function () {
				/** @type {Record<string, any>} */
				const reqOpts = {
					headers: { 'X-Custom': 'Header' },
					params: { action: 'edit' },
				};
				// @ts-expect-error - Protected method
				await mwbot.handlePostMultipartFormData(reqOpts, 'mock-token');

				assert.strictEqual(reqOpts.params.token, 'mock-token');

				assert.instanceOf(reqOpts.data, FormData);
				const body = reqOpts.data.getBuffer().toString();
				assert.include(body, 'name="token"');
				assert.include(body, 'mock-token');

				assert.include(reqOpts.headers['content-type'], 'multipart/form-data');
				assert.isNumber(reqOpts.headers['Content-Length']);
				assert.strictEqual(reqOpts.headers['X-Custom'], 'Header');
			});

			it('should normalize FormData.getLength errors', async function () {
				const reqOpts = {
					headers: {},
					params: { action: 'edit' },
				};
				sinon.stub(FormData.prototype, 'getLength').throws(new Error('mock error'));

				try {
					// @ts-expect-error - Protected method
					await mwbot.handlePostMultipartFormData(reqOpts, 'mock-token');
					assert.fail('Expected handlePostMultipartFormData() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'formdata');
					assert.strictEqual(err.info, 'Failed to determine multipart form data length.');

					assert.instanceOf(err.cause, Error);
					assert.strictEqual(err.cause?.message, 'mock error');
				}
			});
		});

		describe('applyAuthentication()', function () {
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

			it('should do nothing if no credentials are set', function () {
				const reqOpts = { headers: {} };
				// @ts-expect-error - Protected method
				mwbot.applyAuthentication(reqOpts);
				assert.deepEqual(reqOpts.headers, {});
			});

			it('should apply OAuth 2.0 Bearer token', function () {
				// @ts-expect-error - Protected property
				sinon.stub(mwbot, 'credentials').value({ oauth2: 'TEST_OAUTH2_TOKEN' });
				/** @type {Record<string, any>} */
				const reqOpts = {};
				// @ts-expect-error - Protected method
				mwbot.applyAuthentication(reqOpts);

				assert.strictEqual(reqOpts.headers?.Authorization, 'Bearer TEST_OAUTH2_TOKEN');
			});

			it('should apply OAuth 1.0a authorization headers', function () {
				const authorizeStub = sinon.stub().returns({});
				const toHeaderStub = sinon.stub().returns({
					Authorization: 'OAuth test',
				});
				// @ts-expect-error - Protected property
				sinon.stub(mwbot, 'credentials').value({
					oauth1: {
						accessToken: 'key',
						accessSecret: 'secret',
						instance: {
							authorize: authorizeStub,
							toHeader: toHeaderStub,
						},
					},
				});
				/** @type {Record<string, any>} */
				const reqOpts = {
					url: 'http://localhost:8080',
					method: 'GET',
				};
				// @ts-expect-error - Protected method
				mwbot.applyAuthentication(reqOpts);

				assert.strictEqual(reqOpts.headers?.Authorization, 'OAuth test');
				sinon.assert.calledOnce(authorizeStub);
				sinon.assert.calledOnce(toHeaderStub);
				assert.deepInclude(
					authorizeStub.firstCall.args[0],
					{
						url: 'http://localhost:8080',
						method: 'GET',
					}
				);
			});

			it('should throw an error for OAuth 1.0a if url or method is missing', function () {
				// @ts-expect-error - Protected property
				sinon.stub(mwbot, 'credentials').value({ oauth1: {} });
				/** @type {Record<string, any>} */
				const reqOpts = {
					url: 'http://localhost:8080',
					// method missing
				};

				try {
					// @ts-expect-error - Protected method
					mwbot.applyAuthentication(reqOpts);
					assert.fail('Expected applyAuthentication() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'internal');
					assert.include(err.info, 'OAuth 1.0 requires both "url" and "method"');
				}
			});
		});

		describe('_request()', function () {
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

			describe('Pre- and Post-request static flow', function () {
				it('should clone and delete params from requestOptions on POST requests to avoid "mustpostparams"', async function () {
					const reqOpts = createRequestOptions(mwbot, {
						method: 'POST',
						params: { action: 'query' },
					});
					const rawRequestStub = sinon.stub(mwbot, 'rawRequest').resolves(createAxiosResponse(reqOpts));

					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);

					assert.isUndefined(reqOpts.params);
					sinon.assert.calledWith(rawRequestStub, reqOpts);
				});

				it('should enforce an interval delay if the action matches intervalActions and time elapsed is short', async function () {
					const clock = sinon.useFakeTimers();
					sinon.stub(mwbot, 'userMwbotOptions').value({
						apiUrl: 'http://localhost:8080',
						interval: 2000,
						intervalActions: ['query'],
					});
					const reqOpts = createRequestOptions(mwbot, { params: { action: 'query' } });
					const rawRequestStub = sinon.stub(mwbot, 'rawRequest').resolves(createAxiosResponse(reqOpts));
					// @ts-expect-error - Protected property
					sinon.stub(mwbot, 'lastRequestTime').value(clock.Date.now());

					// @ts-expect-error - Protected method
					const promise = mwbot._request(reqOpts);

					await Promise.resolve();
					await clock.tickAsync(1999);
					sinon.assert.notCalled(rawRequestStub);

					await clock.tickAsync(1);
					await promise;
					sinon.assert.calledOnce(rawRequestStub);
				});

				it('should trigger dieAsEmpty if the response contains no data property', async function () {
					const reqOpts = createRequestOptions(mwbot, {
						method: 'GET',
						params: { action: 'query' },
					});
					const response = createAxiosResponse(reqOpts, null);
					const rawRequestStub = sinon.stub(mwbot, 'rawRequest').resolves(response);

					try {
						// @ts-expect-error - Protected property
						await mwbot._request(reqOpts);
						assert.fail('Expected _request() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'empty');
						assert.strictEqual(err.info, 'OK response but empty result (check HTTP headers?).');
						assert.deepEqual(err.data?.axios, response);
						sinon.assert.calledOnce(rawRequestStub);
					}
				});

				it('should throw an invalidjson MwbotError if response data is not a plain object', async function () {
					const reqOpts = createRequestOptions(mwbot, {
						method: 'GET',
						params: { action: 'query' },
					});
					const response = createAxiosResponse(reqOpts, '<html>MediaWiki</html>');
					const rawRequestStub = sinon.stub(mwbot, 'rawRequest').resolves(response);

					try {
						// @ts-expect-error - Protected property
						await mwbot._request(reqOpts);
						assert.fail('Expected _request() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'invalidjson');
						assert.strictEqual(err.info, 'No valid JSON response (check the request URL?)');
						assert.deepEqual(err.data?.axios, response);
						sinon.assert.calledOnce(rawRequestStub);
					}
				});

				it('should call showWarnings only on the first attempt and suppress it on subsequent retries', async function () {
					const reqOpts = createRequestOptions(mwbot, { params: { action: 'query' } });
					sinon.stub(mwbot, 'rawRequest').resolves(
						createAxiosResponse(reqOpts, {
							warnings: {
								query: {
									warnings: 'Warning!',
								},
							},
							query: { pages: [] },
						})
					);
					// @ts-expect-error - Protected method
					const showWarningsSpy = sinon.spy(mwbot, 'showWarnings');

					// First attempt (attemptCount = 0 internally becomes 1)
					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts, 0);
					sinon.assert.calledOnce(showWarningsSpy);
					showWarningsSpy.resetHistory();

					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts, 1);
					sinon.assert.notCalled(showWarningsSpy);
				});

				it('should update lastRequestTime after a successful interval-controlled request', async function () {
					const clock = sinon.useFakeTimers();
					sinon.stub(mwbot, 'userMwbotOptions').value({
						apiUrl: 'http://localhost',
						interval: 2000,
						intervalActions: ['query'],
					});
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'query' },
					});
					sinon.stub(mwbot, 'rawRequest').resolves(createAxiosResponse(reqOpts));
					// @ts-expect-error - Protected property
					sinon.replace(mwbot, 'lastRequestTime', null);

					// @ts-expect-error - Protected method
					await mwbot._request(reqOpts);

					// @ts-expect-error - Protected method
					assert.strictEqual(mwbot.lastRequestTime, clock.Date.now());
				});
			});

			describe('API error handlers', function () {
				it('should invoke dieIfAnonymous if a missingparam error explicitly targets a token', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('missingparam', 'The token parameter must be set.')
					);
					// @ts-expect-error - Protected method
					sinon.stub(mwbot, 'isAnonymous').returns(true);
					const reqOpts = createRequestOptions(mwbot, {
						method: 'POST',
						params: {
							action: 'edit',
							title: 'Sandbox',
							text: 'Foo',
						},
					});

					try {
						// @ts-expect-error - Protected method
						await mwbot._request(reqOpts);
						assert.fail('Expected a dieIfAnonymous rejection');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'anonymous');
					}
				});

				it('should immediately rethrow the API error without retrying if disableRetryAPI is set to true', async function () {
					// FIXME: This test may be brittle. disableRetryAPI is evaluated in an `if` block,
					// and there's no reliable way to detect whether the code reached that path.
					// For a `notoken` error, the code calls dieIfAnonymous() immediately below this
					// `if` block, so we pretend that the caller is anonymous and see if the code wrongly
					// reaches dieIfAnonymous(), in which case an `anonymous` error would be thrown instead.
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('notoken', 'No token.')
					);
					// @ts-expect-error - Protected method
					const retrySpy = sinon.spy(mwbot, 'retry');
					// @ts-expect-error - Protected method
					sinon.stub(mwbot, 'isAnonymous').returns(true);
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'query' },
						disableRetryAPI: true,
					});

					try {
						// @ts-expect-error - Protected method
						await mwbot._request(reqOpts);
						assert.fail('Expected immediate error throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'notoken');
						sinon.assert.notCalled(retrySpy);
					}
				});

				it('should invoke retry with refreshToken configured when badtoken or notoken codes are encountered', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('badtoken', 'Bad token.')
					);
					const expectedResponse = { query: {} };
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
					const reqOpts = createRequestOptions(mwbot, { params: { action: 'query' } });

					// @ts-expect-error - Protected method
					const res = await mwbot._request(reqOpts);

					assert.deepEqual(res, expectedResponse);
					sinon.assert.calledOnce(retryStub);
					assert.deepInclude(retryStub.firstCall.args[5], { refreshToken: true });
				});

				it('should throw badtoken directly if action is unavailable', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('badtoken')
					);
					// @ts-expect-error - Protected method
					const retrySpy = sinon.spy(mwbot, 'retry');
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: undefined },
					});

					try {
						// @ts-expect-error - Protected method
						await mwbot._request(reqOpts);
						assert.fail('Expected rejection');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'badtoken');
						sinon.assert.notCalled(retrySpy);
					}
				});

				it('should trigger a retry with a maximum attempt constraint of 3 on readonly errors', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('readonly', 'Database locked.')
					);
					const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
					const reqOpts = createRequestOptions(mwbot, {
						method: 'POST',
						params: { action: 'edit' },
					});

					// @ts-expect-error - Protected method
					const res = await mwbot._request(reqOpts);

					assert.deepEqual(res, expectedResponse);
					sinon.assert.calledOnce(retryStub);
					assert.strictEqual(retryStub.firstCall.args[4], 3); // maxAttempts parameter
				});

				it('should not retry maxlag if disableRetry is true', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('maxlag')
					);
					// @ts-expect-error - Protected method
					const retrySpy = sinon.spy(mwbot, 'retry');
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'edit' },
						disableRetry: true,
					});

					try {
						// @ts-expect-error - Protected method
						await mwbot._request(reqOpts);
						assert.fail('Expected rejection');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'maxlag');
						sinon.assert.notCalled(retrySpy);
					}
				});

				it('should favour the bigger value between Retry-After header and lag value on maxlag errors', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('maxlag', 'Server is lagged.', {
							data: { error: { lag: 10 } },
							headers: { 'retry-after': '15' },
						})
					);
					const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
					const reqOpts = createRequestOptions(mwbot, {
						method: 'POST',
						params: { action: 'edit' },
					});

					// @ts-expect-error - Protected method
					const res = await mwbot._request(reqOpts);

					assert.deepEqual(res, expectedResponse);
					sinon.assert.calledOnce(retryStub);
					assert.deepInclude(retryStub.firstCall.args[5], { sleepSeconds: 15 });
				});

				it('should not retry maxlag errors when the lag exceeds maxLagLimit', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('maxlag', 'Server is lagged.', {
							data: { error: { lag: 20 } },
						})
					);
					const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
					const reqOpts = createRequestOptions(mwbot, {
						method: 'POST',
						params: { action: 'edit' },
						maxLagLimit: 10,
					});

					try {
						// @ts-expect-error - Protected method
						await mwbot._request(reqOpts);
						assert.fail('Expected _request() to reject');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'maxlag');
						sinon.assert.notCalled(retryStub);
					}
				});

				it('should fallback to 5 seconds if the Retry-After header is missing on maxlag errors', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('maxlag', 'Server is lagged.')
					);
					const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
					const reqOpts = createRequestOptions(mwbot, {
						method: 'POST',
						params: { action: 'edit' },
					});

					// @ts-expect-error - Protected method
					const res = await mwbot._request(reqOpts);

					assert.deepEqual(res, expectedResponse);
					sinon.assert.calledOnce(retryStub);
					assert.deepInclude(retryStub.firstCall.args[5], { sleepSeconds: 5 });
				});

				it('should not retry for assertuserfailed errors on anonymous authentication', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(createApiErrorResponse('assertuserfailed'));
					// @ts-expect-error - Protected method
					sinon.stub(mwbot, 'isAnonymous').returns(true);
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry');
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'query' },
					});

					try {
						// @ts-expect-error - Protected method
						await mwbot._request(reqOpts);
						assert.fail('Expected _request() to reject');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'assertuserfailed');
						sinon.assert.notCalled(retryStub);
					}
				});

				it('should invoke retry with reLogIn and token refresh on assertion failures', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(createApiErrorResponse('assertuserfailed'));
					const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'edit', token: 'abc+\\' },
					});

					// @ts-expect-error - Protected method
					const res = await mwbot._request(reqOpts);

					assert.deepEqual(res, expectedResponse);
					sinon.assert.calledOnce(retryStub);
					assert.deepEqual(retryStub.firstCall.args[5], {
						sleepSeconds: 0,
						refreshToken: true,
						reLogIn: true,
					});
				});

				it('should retry assertuserfailed without token refresh when token is absent', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('assertuserfailed')
					);
					const expectedResponse = { query: {} };
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
					const reqOpts = createRequestOptions(mwbot, {
						params: {
							action: 'query',
						},
					});

					// @ts-expect-error - Protected method
					const res = await mwbot._request(reqOpts);

					assert.deepEqual(res, expectedResponse);
					sinon.assert.calledOnce(retryStub);
					assert.deepEqual(retryStub.firstCall.args[5], {
						sleepSeconds: 10,
						refreshToken: false,
						reLogIn: true,
					});
				});

				it('should retry mwoauth-invalid-authorization only if info contains "Nonce already used"', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('mwoauth-invalid-authorization', 'Nonce already used upstream.')
					);
					const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'edit', token: 'abc+\\' },
					});

					// @ts-expect-error - Protected method
					const res = await mwbot._request(reqOpts);

					assert.deepEqual(res, expectedResponse);
					sinon.assert.calledOnce(retryStub);
				});

				it('should not retry mwoauth-invalid-authorization when info does not mention nonce reuse', async function () {
					sinon.stub(mwbot, 'rawRequest').resolves(
						createApiErrorResponse('mwoauth-invalid-authorization', 'Invalid signature.' )
					);
					// @ts-expect-error - Protected method
					const retrySpy = sinon.spy(mwbot, 'retry');
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'query' },
					});

					try {
						// @ts-expect-error - Protected method
						await mwbot._request(reqOpts);
						assert.fail('Expected rejection');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'mwoauth-invalid-authorization');
						sinon.assert.notCalled(retrySpy);
					}
				});
			});

			describe('Network & HTTP 400+ errors', function () {
				it('should rethrow non-Axios errors from the request pipeline', async function () {
					const original = new Error('boom');
					sinon.stub(mwbot, 'rawRequest').rejects(original);
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'query' },
					});

					try {
						// @ts-expect-error - Protected method
						await mwbot._request(reqOpts);
						assert.fail('Expected _request() to reject');
					} catch (err) {
						assert.strictEqual(err, original);
					}
				});

				it('should re-code an ERR_CANCELED axios error into an "aborted" error', async function () {
					sinon.stub(mwbot, 'rawRequest').rejects(createAxiosError({ code: 'ERR_CANCELED' }));
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'query' },
					});

					try {
						// @ts-expect-error - Protected method
						await mwbot._request(reqOpts);
						assert.fail('Expected _request() to reject');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'aborted');
						assert.strictEqual(err.info, 'Request aborted by the user.');
						assert.isUndefined(err.data); // Confirms err.data deletion pathway
					}
				});

				it('should schedule a retry with sleepSeconds: 5 when ECONNABORTED is captured', async function () {
					sinon.stub(mwbot, 'rawRequest').rejects(createAxiosError({
						code: 'ECONNABORTED',
						message: 'ECONNABORTED error!',
					}));
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'query' },
					});
					const expectedResponse = { query: {} };
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);

					// @ts-expect-error - Protected method
					const res = await mwbot._request(reqOpts);

					assert.deepEqual(res, expectedResponse);
					sinon.assert.calledOnce(retryStub);

					const err = retryStub.firstCall.args[0];
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'http');
					assert.strictEqual(err.info, 'ECONNABORTED error.');
					assert.deepEqual(retryStub.firstCall.args[5], { sleepSeconds: 5 });
				});

				it('should schedule a retry with sleepSeconds: 10 when ECONNRESET occurs to circumvent TCP drops', async function () {
					sinon.stub(mwbot, 'rawRequest').rejects(createAxiosError({
						code: 'ECONNRESET',
					}));
					const reqOpts = createRequestOptions(mwbot, {
						params: { action: 'query' },
					});
					const expectedResponse = { query: {} };
					// @ts-expect-error - Protected method
					const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);

					// @ts-expect-error - Protected method
					const res = await mwbot._request(reqOpts);

					assert.deepEqual(res, expectedResponse);
					sinon.assert.calledOnce(retryStub);

					const err = retryStub.firstCall.args[0];
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'http');
					assert.strictEqual(err.info, 'HTTP request failed.');
					assert.deepEqual(retryStub.firstCall.args[5], { sleepSeconds: 10 });
				});

				const statusGen = [
					{
						status: 404,
						code: 'notfound',
						info: 'Page not found (404)',
						retryable: false,
					},
					{
						status: 408,
						code: 'timeout',
						info: 'Request timeout (408)',
						retryable: true,
					},
					{
						status: 414,
						code: 'baduri',
						info: 'URI too long (414)',
						retryable: false,
					},
					{
						status: 429,
						code: 'ratelimited',
						info: 'Too many requests (429)',
						retryable: true,
					},
					{
						status: 500,
						code: 'servererror',
						info: 'Internal server error (500)',
						retryable: true,
					},
					{
						status: 502,
						code: 'badgateway',
						info: 'Bad gateway (502)',
						retryable: true,
					},
					{
						status: 503,
						code: 'serviceunavailable',
						info: 'Service Unavailable (503)',
						retryable: true,
					},
					{
						status: 504,
						code: 'timeout',
						info: 'Gateway timeout (504)',
						retryable: true,
					},
					{
						status: 999, // Should be routed to `default: throw`
						code: 'http',
						info: 'HTTP request failed',
						alt: 'unhandled HTTP',
						retryable: false,
					},
					{
						status: undefined,
						code: 'http',
						info: 'HTTP request failed',
						alt: 'no status',
						retryable: false,
					},
				];

				for (const { status, code, info, alt, retryable } of statusGen) {
					if (retryable) {
						it(`should properly map ${alt ?? info} errors to ${code} and make at most 3 attempts`, async function () {
							sinon.stub(mwbot, 'rawRequest').rejects(createAxiosError({
								status: status,
							}));
							const reqOpts = createRequestOptions(mwbot, {
								params: { action: 'query' },
							});
							const expectedResponse = { query: {} };
							// @ts-expect-error - Protected method
							const retryStub = sinon.stub(mwbot, 'retry').resolves(expectedResponse);

							// @ts-expect-error - Protected method
							const res = await mwbot._request(reqOpts);

							assert.deepEqual(res, expectedResponse);
							sinon.assert.calledOnce(retryStub);

							const err = retryStub.firstCall.args[0];
							assert.instanceOf(err, MwbotError);
							assert.strictEqual(err.code, code);
							assert.include(err.info, info);
							assert.strictEqual(retryStub.firstCall.args[4], 3); // maxAttempts
						});
					} else {
						it(`should immediately throw without retrying on ${alt ?? info} exceptions`, async function () {
							sinon.stub(mwbot, 'rawRequest').rejects(createAxiosError({
								status: status,
							}));
							// @ts-expect-error - Protected method
							const retrySpy = sinon.spy(mwbot, 'retry');
							const reqOpts = createRequestOptions(mwbot, {
								params: { action: 'query' },
							});

							try {
								// @ts-expect-error - Protected method
								await mwbot._request(reqOpts);
								assert.fail('Expected _request() to reject');
							} catch (err) {
								assert.instanceOf(err, MwbotError);
								assert.strictEqual(err.code, code);
								assert.include(err.info, info);
								sinon.assert.notCalled(retrySpy);
							}
						});
					}
				}
			});
		});

		describe('showWarnings()', function () {
			/**
			 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
			 */
			let mwbot;

			before(async function () {
				mwbot = await getTestMwbot('named');
			});

			/** @type {sinon.SinonSpy} */
			let warnSpy;

			beforeEach(function () {
				warnSpy = sinon.spy(Logger.prototype, 'warn');
			});

			afterEach(function () {
				sinon.restore();
			});

			it('should do nothing when warnings is undefined', function () {
				// @ts-expect-error - Protected method
				mwbot.showWarnings(undefined);

				sinon.assert.notCalled(warnSpy);
			});

			it('should log warnings in the new format using "*" messages', function () {
				// @ts-expect-error - Protected method
				mwbot.showWarnings([
					{
						code: 'foo',
						module: 'query',
						data: { values: [] },
						'*': 'warning message',
					},
				]);

				sinon.assert.calledOnceWithExactly(warnSpy, 'query: warning message');
			});

			it('should prefer html over text when "*" is absent', function () {
				// @ts-expect-error - Protected method
				mwbot.showWarnings([
					{
						code: 'foo',
						module: 'query',
						data: { values: [] },
						html: '<b>warning</b>',
						text: 'warning',
					},
				]);

				sinon.assert.calledOnceWithExactly(warnSpy, 'query: <b>warning</b>');
			});

			it('should use text when neither "*" nor html is present', function () {
				// @ts-expect-error - Protected method
				mwbot.showWarnings([
					{
						code: 'foo',
						module: 'query',
						data: { values: [] },
						text: 'warning',
					},
				]);

				sinon.assert.calledOnceWithExactly(warnSpy, 'query: warning');
			});

			it('should ignore new-format warnings without a displayable message', function () {
				// @ts-expect-error - Protected method
				mwbot.showWarnings([
					{
						code: 'foo',
						module: 'query',
						data: { values: [] },
						key: 'foo',
						params: [],
					},
				]);

				sinon.assert.notCalled(warnSpy);
			});

			it('should log legacy warnings using "*"', function () {
				// @ts-expect-error - Protected method
				mwbot.showWarnings({
					query: {
						'*': 'legacy warning',
					},
				});

				sinon.assert.calledOnceWithExactly(warnSpy, 'query: legacy warning');
			});

			it('should log legacy warnings using warnings', function () {
				// @ts-expect-error - Protected method
				mwbot.showWarnings({
					query: {
						warnings: 'legacy warning',
					},
				});

				sinon.assert.calledOnceWithExactly(warnSpy, 'query: legacy warning');
			});

			it('should ignore legacy warnings without a displayable message', function () {
				// @ts-expect-error - Protected method
				mwbot.showWarnings({
					query: /** @type {any} */ ({}),
				});

				sinon.assert.notCalled(warnSpy);
			});
		});

		describe('canRetry()', function () {
			// @ts-expect-error - Protected method
			const canRetry = Mwbot.canRetry.bind(Mwbot);

			it('should allow retries when under the attempt limit and retrying is enabled', function () {
				assert.isTrue(
					canRetry(createMwbotError('maxlag'), 1, { disableRetry: false }, 3)
				);
			});

			it('should deny retries when the maximum attempt count has been reached', function () {
				assert.isFalse(
					canRetry(createMwbotError('maxlag'), 3, { disableRetry: false }, 3)
				);
			});

			it('should deny retries when disableRetry is true', function () {
				assert.isFalse(
					canRetry(createMwbotError('maxlag'), 1, { disableRetry: true }, 3)
				);
			});

			it('should deny retries when the error code is listed in disableRetryByCode', function () {
				assert.isFalse(
					canRetry(createMwbotError('maxlag'), 1, { disableRetryByCode: ['maxlag'] }, 3)
				);
			});

			it('should allow retries when disableRetryByCode does not contain the error code', function () {
				assert.isTrue(
					canRetry(createMwbotError('maxlag'), 1, { disableRetryByCode: ['badtoken'] }, 3)
				);
			});

			it('should allow retries when disableRetryByCode is empty', function () {
				assert.isTrue(
					canRetry(createMwbotError('maxlag'), 1, { disableRetryByCode: [] }, 3)
				);
			});

			it('should allow retries when disableRetryByCode is undefined', function () {
				assert.isTrue(
					canRetry(createMwbotError('maxlag'), 1, {}, 3)
				);
			});

			it('should deny retries when maxAttempts is zero', function () {
				assert.isFalse(
					canRetry(createMwbotError('maxlag'), 0, {}, 0)
				);
			});
		});

		describe('retry()', function () {
			/**
			 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
			 */
			let mwbot;

			before(async function () {
				mwbot = await getTestMwbot('named'); // botpassword authentication
			});

			/** @type {sinon.SinonSpy} */
			let warnSpy;
			/** @type {sinon.SinonSpy} */
			let errorSpy;

			beforeEach(function () {
				warnSpy = sinon.spy(Logger.prototype, 'warn');
				errorSpy = sinon.spy(Logger.prototype, 'error');
			});

			afterEach(function () {
				sinon.restore();
			});

			/**
			 * @param {import('../../../dist/index.js').ApiParams} [merge]
			 * @returns {import('../../../dist/index.js').ApiParams}
			 */
			const createParams = (merge) => {
				const base = { action: /** @type {const} */ ('query') };
				return merge ? Mwbot.Util.mergeDeep(base, merge) : base;
			};

			it('should immediately throw the original error when canRetry() returns false', async function () {
				// @ts-expect-error - Protected method
				sinon.stub(Mwbot, 'canRetry').returns(false);
				const error = createMwbotError();
				const params = createParams();

				try {
					// @ts-expect-error - Protected method
					await mwbot.retry(
						error, 1, params, createRequestOptions(mwbot, { params }), 2
					);
					assert.fail('Expected retry() to throw');
				} catch (err) {
					assert.strictEqual(err, error);

					sinon.assert.notCalled(errorSpy);
					sinon.assert.notCalled(warnSpy);
				}
			});

			it('should apply 10-second delay by default before performing a retry', async function () {
				const clock = sinon.useFakeTimers();
				const expectedResponse = { query: {} };
				// @ts-expect-error - Protected method
				const requestStub = sinon.stub(mwbot, '_request').resolves(expectedResponse);

				// @ts-expect-error - Protected method
				const promise = mwbot.retry(
					createMwbotError(), 1, createParams(), createRequestOptions(mwbot), 2
				);

				sinon.assert.calledOnce(errorSpy);
				sinon.assert.calledOnce(warnSpy);
				sinon.assert.callOrder(errorSpy, warnSpy);

				await Promise.resolve();
				await clock.tickAsync(9000);

				sinon.assert.notCalled(requestStub);

				await clock.tickAsync(1000);

				sinon.assert.calledOnce(requestStub);

				const res = await promise;

				assert.deepEqual(res, expectedResponse);
			});

			it('should immediately invoke _request when sleepSeconds is 0', async function () {
				const expectedResponse = { query: {} };
				// @ts-expect-error - Protected method
				const requestStub = sinon.stub(mwbot, '_request').resolves(expectedResponse);

				// @ts-expect-error - Protected method
				const promise = mwbot.retry(
					createMwbotError(), 1, createParams(), createRequestOptions(mwbot), 2, { sleepSeconds: 0 }
				);

				sinon.assert.calledOnce(errorSpy);
				sinon.assert.calledOnce(warnSpy);
				sinon.assert.callOrder(errorSpy, warnSpy);

				// _request() should be reached synchronously without waiting
				sinon.assert.calledOnce(requestStub);

				const res = await promise;

				assert.deepEqual(res, expectedResponse);
			});

			it('should invoke login before retrying when reLogIn is true', async function () {
				const loginStub = sinon.stub(mwbot, 'login').resolves();
				const expectedResponse = { query: {} };
				// @ts-expect-error - Protected method
				const requestStub = sinon.stub(mwbot, '_request').resolves(expectedResponse);

				// @ts-expect-error - Protected method
				const res = await mwbot.retry(
					createMwbotError(), 1, createParams(), createRequestOptions(mwbot), 2, {
						sleepSeconds: 0,
						reLogIn: true,
					}
				);

				assert.deepEqual(res, expectedResponse);
				sinon.assert.calledOnce(loginStub);
				sinon.assert.calledOnce(requestStub);
				sinon.assert.callOrder(loginStub, requestStub);

				sinon.assert.calledOnce(errorSpy);
				sinon.assert.calledOnce(warnSpy);
				sinon.assert.callOrder(errorSpy, warnSpy, loginStub);
			});

			it('should rethrow the original error if login fails', async function () {
				const error = createMwbotError();
				sinon.stub(mwbot, 'login').rejects(new Error('login failed'));

				try {
					// @ts-expect-error - Protected method
					await mwbot.retry(error, 1, createParams(), createRequestOptions(mwbot), 2, {
						sleepSeconds: 0,
						reLogIn: true,
					});
					assert.fail('Expected retry() to throw');
				} catch (err) {
					assert.strictEqual(err, error);
				}
			});

			it('should re-inject params into requestOptions before retrying', async function () {
				const params = createParams();
				const requestOptions = createRequestOptions(mwbot);
				delete requestOptions.params;
				// @ts-expect-error - Protected method
				const requestStub = sinon.stub(mwbot, '_request').resolves({ query: {} });

				// @ts-expect-error - Protected method
				await mwbot.retry(createMwbotError(), 1, params, requestOptions, 2, { sleepSeconds: 0 });

				assert.strictEqual(requestOptions.params, params);
				assert.strictEqual(requestStub.firstCall.args[0].params, params);
			});

			it('should skip token refresh when refreshToken is false', async function () {
				const params = createParams({
					action: 'edit',
					token: 'oldToken',
				});
				const requestOptions = createRequestOptions(mwbot, {
					method: 'POST',
				});
				// @ts-expect-error - Protected method
				const getTokenTypeSpy = sinon.spy(mwbot, 'getTokenType');
				const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, '_request').resolves(expectedResponse);

				// @ts-expect-error - Protected method
				const res = await mwbot.retry(
					createMwbotError(), 1, params, requestOptions, 3, { sleepSeconds: 0, refreshToken: false }
				);

				sinon.assert.notCalled(getTokenTypeSpy);
				assert.deepEqual(res, expectedResponse);
			});

			it('should throw the original error when refreshToken is requested for a non-POST request', async function () {
				const error = createMwbotError();

				try {
					// @ts-expect-error - Protected method
					await mwbot.retry(
						error,
						1,
						createParams({ action: 'edit' }),
						createRequestOptions(mwbot, {
							method: 'GET',
						}),
						2,
						{
							sleepSeconds: 0,
							refreshToken: true,
						}
					);
					assert.fail('Expected retry() to throw');
				} catch (err) {
					assert.strictEqual(err, error);
				}
			});

			it('should throw the original error when refreshToken is requested without a valid action', async function () {
				const error = createMwbotError();

				try {
					// @ts-expect-error - Protected method
					await mwbot.retry(
						error,
						1,
						{ action: undefined },
						createRequestOptions(mwbot, {
							method: 'POST',
						}),
						2,
						{
							sleepSeconds: 0,
							refreshToken: true,
						}
					);
					assert.fail('Expected retry() to throw');
				} catch (err) {
					assert.strictEqual(err, error);
				}
			});

			it('should throw the original error when getTokenType() returns null', async function () {
				const error = createMwbotError();

				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'getTokenType').returns(null);

				try {
					// @ts-expect-error - Protected method
					await mwbot.retry(
						error,
						1,
						createParams({ action: 'edit' }),
						createRequestOptions(mwbot, {
							method: 'POST',
						}),
						2,
						{
							sleepSeconds: 0,
							refreshToken: true,
						}
					);
					assert.fail('Expected retry() to throw');
				} catch (err) {
					assert.strictEqual(err, error);
				}
			});

			it('should rethrow the original error when getToken() fails', async function () {
				const error = createMwbotError();
				// @ts-expect-error - Protected method
				sinon.stub(mwbot, 'getTokenType').returns('csrf');
				sinon.stub(mwbot, 'getToken').rejects(new Error('failed'));

				try {
					// @ts-expect-error - Protected method
					await mwbot.retry(
						error,
						1,
						createParams({ action: 'edit' }),
						createRequestOptions(mwbot, {
							method: 'POST',
						}),
						2,
						{
							sleepSeconds: 0,
							refreshToken: true,
						}
					);
					assert.fail('Expected retry() to throw');
				} catch (err) {
					assert.strictEqual(err, error);
				}
			});

			it('should refresh the token when getToken() succeeds', async function () {
				const params = createParams({
					action: 'edit',
					token: 'oldToken',
				});
				const requestOptions = createRequestOptions(mwbot, {
					method: 'POST',
				});
				// @ts-expect-error - Protected method
				const getTokenTypeStub = sinon.stub(mwbot, 'getTokenType').returns('csrf');
				const badTokenStub = sinon.stub(mwbot, 'badToken');
				const getTokenStub = sinon.stub(mwbot, 'getToken').resolves('newToken');
				const expectedResponse = { edit: { result: /** @type {const} */ ('Success') } };
				// @ts-expect-error - Protected method
				const requestStub = sinon.stub(mwbot, '_request').resolves(expectedResponse);

				// @ts-expect-error - Protected method
				const res = await mwbot.retry(createMwbotError(), 1, params, requestOptions, 2, {
					sleepSeconds: 0,
					refreshToken: true,
				});

				assert.deepEqual(res, expectedResponse);
				assert.strictEqual(params.token, 'newToken');

				sinon.assert.calledOnceWithExactly(getTokenTypeStub, 'edit');
				sinon.assert.calledOnceWithExactly(badTokenStub, 'csrf');
				sinon.assert.calledOnceWithExactly(getTokenStub, 'csrf');
				sinon.assert.callOrder(getTokenTypeStub, getTokenStub, requestStub);
			});
		});
	});
}