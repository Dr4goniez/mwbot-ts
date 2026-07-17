import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MwbotError } from '../../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotRequestOptions() {
	describe('User-option-related methods', function () {
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

		describe('Local option fetchers', function () {
			/**
			 * @type {sinon.SinonStub<Parameters<Mwbot['get']>, ReturnType<Mwbot['get']>>}
			 */
			let getStub;

			beforeEach(function () {
				// @ts-expect-error - TS complains due to TestMwbot overriding get()
				getStub = sinon.stub(mwbot, 'get');
			});

			/**
			 * @param {import('../../../dist/index.js').ApiResponseQueryMetaUserinfo['options']} options
			 * @returns {import('../../../dist/index.js').ApiResponse}
			 */
			const createOptionsResponse = (options = {}) => {
				return {
					query: {
						userinfo: {
							id: 2,
							name: 'Admin',
							options: {
								foo: 'bar',
								...options,
								answer: 42,
								enabled: true,
							},
						},
					},
				};
			};

			describe('getOptions()', function () {
				it('should call get() with merged parameters and return a Map', async function () {
					const requestOptions = {
						timeout: 1000,
					};
					getStub.resolves(createOptionsResponse({ answer: 42, enabled: true }));

					const ret = await mwbot.getOptions({}, requestOptions);

					assert.instanceOf(ret, Map);
					assert.strictEqual(ret.get('foo'), 'bar');
					assert.strictEqual(ret.get('answer'), 42);
					assert.strictEqual(ret.get('enabled'), true);

					sinon.assert.calledOnceWithExactly(
						getStub,
						{
							action: 'query',
							meta: 'userinfo',
							uiprop: 'options',
							format: 'json',
							formatversion: '2',
						},
						requestOptions
					);
				});

				it('should allow additional parameters to be passed', async function () {
					getStub.resolves(createOptionsResponse());

					await mwbot.getOptions({
						maxlag: 5,
					});

					assert.propertyVal(getStub.firstCall.args[0], 'maxlag', 5);
				});

				it('should throw when response.query.userinfo.options is missing', async function () {
					getStub.resolves({});

					try {
						await mwbot.getOptions();
						assert.fail('Expected getOptions() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'empty');
					}
				});
			});

			describe('getOption()', function () {
				it('should return the requested option', async function () {
					sinon.stub(mwbot, 'getOptions').resolves(
						new Map([
							['foo', 'bar'],
						])
					);

					const ret = await mwbot.getOption('foo');

					assert.strictEqual(ret, 'bar');
				});

				it('should return undefined when the option does not exist', async function () {
					sinon.stub(mwbot, 'getOptions').resolves(new Map());

					const ret = await mwbot.getOption('missing');

					assert.isUndefined(ret);
				});

				it('should pass parameters through to getOptions()', async function () {
					const getOptionsStub = sinon.stub(mwbot, 'getOptions').resolves(new Map());

					const additionalParams = {
						maxlag: 5,
					};
					const requestOptions = {
						timeout: 1000,
					};

					await mwbot.getOption('foo', additionalParams, requestOptions);

					sinon.assert.calledOnceWithExactly(
						getOptionsStub,
						additionalParams,
						requestOptions
					);
				});
			});
		});

		describe('Global option fetchers', function () {
			/**
			 * @type {sinon.SinonStub<Parameters<Mwbot['get']>, ReturnType<Mwbot['get']>>}
			 */
			let getStub;

			beforeEach(function () {
				// @ts-expect-error - TS complains due to TestMwbot overriding get()
				getStub = sinon.stub(mwbot, 'get');
			});

			/**
			 * @param {import('../../../dist/index.js').ApiResponseQueryMetaGlobalpreferences['preferences']} [preferences]
			 * @param {import('../../../dist/index.js').ApiResponseQueryMetaGlobalpreferences['localoverrides']} [localoverrides]
			 * @returns {import('../../../dist/index.js').ApiResponse}
			 */
			const createApiResponse = (preferences, localoverrides) => {
				return {
					query: {
						globalpreferences: {
							preferences,
							localoverrides,
						},
					},
				};
			};

			describe('_getGlobalPreferences()', function () {
				it('should throw "anonymous" error if the client is anonymous', async function () {
					// @ts-expect-error - Protected method
					sinon.stub(mwbot, 'isAnonymous').returns(true);

					try {
						// @ts-expect-error - Protected method
						await mwbot._getGlobalPreferences(['preferences']);
						assert.fail('Expected _getGlobalPreferences() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'anonymous');
					}
				});

				it('should respect additionalParams and requestOptions', async function () {
					getStub.resolves(createApiResponse({}, {}));

					// @ts-expect-error - Protected method
					await mwbot._getGlobalPreferences(
						['preferences'],
						{ assert: 'user' },
						{ timeout: 7777 }
					);

					sinon.assert.calledOnceWithExactly(
						getStub,
						{
							assert: 'user',
							action: 'query',
							format: 'json',
							formatversion: '2',
							meta: 'globalpreferences',
							gprprop: 'preferences',
						},
						{
							timeout: 7777,
						}
					);
				});

				it('should throw "empty" error if "globalpreferences" is missing from API response', async function () {
					getStub.resolves({ query: {} });

					try {
						// @ts-expect-error - Protected method
						await mwbot._getGlobalPreferences(['preferences']);
						assert.fail('Expected _getGlobalPreferences() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'empty');
					}
				});

				it('should throw "empty" error if a requested property is missing from API response', async function () {
					getStub.resolves(createApiResponse({}, undefined));

					try {
						// @ts-expect-error - Protected method
						await mwbot._getGlobalPreferences(['preferences', 'localoverrides']);
						assert.fail('Expected _getGlobalPreferences() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'empty');
					}
				});

				it('should throw "empty" error if a requested single property is missing from API response', async function () {
					getStub.resolves(createApiResponse(undefined, {}));

					try {
						// @ts-expect-error - Protected method
						await mwbot._getGlobalPreferences(['preferences']);
						assert.fail('Expected _getGlobalPreferences() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'empty');
					}
				});

				it('should return a single Map when one "gprprop" is provided', async function () {
					getStub.resolves(
						createApiResponse(
							{ foo: 'bar' },
							{ baz: 'qux' }
						)
					);

					// @ts-expect-error - Protected method
					const map = await mwbot._getGlobalPreferences(['preferences']);

					assert.instanceOf(map, Map);
					assert.strictEqual(map.get('foo'), 'bar');
					assert.isUndefined(map.get('baz'));
				});

				it('should return an object containing Maps when two "gprprop"s are provided', async function () {
					getStub.resolves(
						createApiResponse(
							{ foo: 'bar' },
							{ baz: 'qux' }
						)
					);

					// @ts-expect-error - Protected method
					const obj = await mwbot._getGlobalPreferences(['preferences', 'localoverrides']);

					assert.isObject(obj);
					assert.instanceOf(obj.preferences, Map);
					assert.strictEqual(obj.preferences.get('foo'), 'bar');
					assert.instanceOf(obj.localoverrides, Map);
					assert.strictEqual(obj.localoverrides.get('baz'), 'qux');
				});
			});

			describe('getGlobalPreferences()', function () {
				it('should return an object containing Maps when two "gprprop"s are provided', async function () {
					getStub.resolves(
						createApiResponse(
							{ foo: 'bar' },
							{ baz: 'qux' }
						)
					);

					const res = await mwbot.getGlobalPreferences();

					assert.deepEqual(
						res,
						{
							preferences: new Map(Object.entries({ foo: 'bar' })),
							localoverrides: new Map(Object.entries({ baz: 'qux' })),
						}
					);
				});

				it('should pass along additionalParams and requestOptions', async function () {
					getStub.resolves(createApiResponse({}, {}));

					// @ts-expect-error - Protected method
					const gpSpy = sinon.spy(mwbot, '_getGlobalPreferences');
					const params = { foo: 'bar' };
					const reqOpts = { timeout: 7777 };

					const res = await mwbot.getGlobalPreferences(params, reqOpts);

					assert.deepEqual(res, {
						preferences: new Map(),
						localoverrides: new Map(),
					});
					sinon.assert.calledOnceWithExactly(
						gpSpy,
						['preferences', 'localoverrides'],
						params,
						reqOpts
					);
				});
			});

			describe('getGlobalOptions()', function () {
				it('should return a single Map', async function () {
					getStub.resolves(
						createApiResponse(
							{ foo: 'bar' },
							{ baz: 'qux' }
						)
					);

					const res = await mwbot.getGlobalOptions();

					assert.deepEqual(res, new Map(Object.entries({ foo: 'bar' })));
				});

				it('should pass along additionalParams and requestOptions', async function () {
					getStub.resolves(createApiResponse({}, {}));
					// @ts-expect-error - Protected method
					const gpSpy = sinon.spy(mwbot, '_getGlobalPreferences');
					const params = { foo: 'bar' };
					const reqOpts = { timeout: 7777 };

					const res = await mwbot.getGlobalOptions(params, reqOpts);

					assert.deepEqual(res, new Map());
					sinon.assert.calledOnceWithExactly(
						gpSpy,
						['preferences'],
						params,
						reqOpts
					);
				});
			});

			describe('getGlobalOption()', function () {
				it('should delegate to getGlobalOptions() and return a single option value', async function () {
					const map = new Map([['foo', 'bar']]);
					const goStub = sinon.stub(mwbot, 'getGlobalOptions').resolves(map);

					const params = { foo: 'bar' };
					const reqOpts = { timeout: 7777 };

					assert.strictEqual(
						await mwbot.getGlobalOption('foo', params, reqOpts),
						'bar'
					);

					sinon.assert.calledOnceWithExactly(goStub, params, reqOpts);
				});

				it('should return undefined for non-existing option values', async function () {
					sinon.stub(mwbot, 'getGlobalOptions').resolves(new Map());

					assert.isUndefined(await mwbot.getGlobalOption('foo'));
				});
			});

			describe('getGlobalOptionOverrides()', function () {
				it('should return a single Map', async function () {
					getStub.resolves(
						createApiResponse(
							{},
							{ baz: 'qux' }
						)
					);

					assert.deepEqual(
						await mwbot.getGlobalOptionOverrides(),
						new Map(Object.entries({ baz: 'qux' }))
					);
				});

				it('should pass along additionalParams and requestOptions', async function () {
					getStub.resolves(createApiResponse({}, {}));
					// @ts-expect-error - Protected method
					const gpSpy = sinon.spy(mwbot, '_getGlobalPreferences');
					const params = { foo: 'bar' };
					const reqOpts = { timeout: 7777 };

					const res = await mwbot.getGlobalOptionOverrides(params, reqOpts);

					assert.deepEqual(res, new Map());
					sinon.assert.calledOnceWithExactly(
						gpSpy,
						['localoverrides'],
						params,
						reqOpts
					);
				});
			});

			describe('getGlobalOptionOverride()', function () {
				it('should return a single option value', async function () {
					getStub.resolves(createApiResponse({}, { foo: 'bar' }));

					assert.strictEqual(
						await mwbot.getGlobalOptionOverride('foo'),
						'bar'
					);
				});

				it('should return undefined for non-existing option values', async function () {
					getStub.resolves(createApiResponse({}, {}));

					assert.isUndefined(await mwbot.getGlobalOptionOverride('foo'));
				});
			});
		});

		describe('Option setters', function () {
			describe('_saveOptions()', function () {
				/**
				 * @type {sinon.SinonStub}
				 */
				let postWithCsrfTokenStub;

				beforeEach(function () {
					postWithCsrfTokenStub = sinon.stub(mwbot, 'postWithCsrfToken');
				});

				it('should throw "anonymous" error if the client is anonymous', async function () {
					// @ts-expect-error - Protected method
					sinon.stub(mwbot, 'isAnonymous').returns(true);

					try {
						// @ts-expect-error - Protected method
						await mwbot._saveOptions('options', { foo: 'bar' });
						assert.fail('Expected _saveOptions() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'anonymous');
					}
				});

				it('should throw "emptyinput" error if "options" is an empty object', async function () {
					try {
						// @ts-expect-error - Protected method
						await mwbot._saveOptions('options', {});
						assert.fail('Expected _saveOptions() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'emptyinput');
					}
				});

				it('should throw "emptyinput" error if "options" is an empty Map', async function () {
					try {
						// @ts-expect-error - Protected method
						await mwbot._saveOptions('options', new Map());
						assert.fail('Expected _saveOptions() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'emptyinput');
					}
				});

				it('should throw "typemismatch" error if the "options" argument is neither a plain object nor a Map', async function () {
					try {
						// @ts-expect-error - Protected method
						await mwbot._saveOptions('options', 1);
						assert.fail('Expected _saveOptions() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'typemismatch');
					}
				});

				it('should accept a plain object', async function () {
					postWithCsrfTokenStub.resolves({ options: 'success' });

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', {
						foo: 'bar',
						baz: 1,
					});

					sinon.assert.calledOnceWithMatch(
						postWithCsrfTokenStub,
						{ change: 'foo=bar|baz=1' }
					);
				});

				it('should accept a Map', async function () {
					postWithCsrfTokenStub.resolves({ options: 'success' });

					const change = new Map();
					change.set('foo', 'bar');
					change.set('baz', 1);

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', change);

					sinon.assert.calledOnceWithMatch(
						postWithCsrfTokenStub,
						{ change: 'foo=bar|baz=1' }
					);
				});

				it('should omit the value to reset an option', async function () {
					postWithCsrfTokenStub.resolves({ options: 'success' });

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', {
						foo: null,
						bar: 'baz',
					});

					sinon.assert.calledOnceWithMatch(
						postWithCsrfTokenStub,
						{ change: 'foo|bar=baz' }
					);
				});

				it('should use optionname and optionvalue when a key contains "="', async function () {
					postWithCsrfTokenStub.resolves({ options: 'success' });

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', {
						'a=b': 'c',
					});

					sinon.assert.calledOnceWithMatch(
						postWithCsrfTokenStub,
						{
							optionname: 'a=b',
							optionvalue: 'c',
						}
					);
					assert.notProperty(postWithCsrfTokenStub.firstCall.args[0], 'change');
				});

				it('should omit optionvalue when resetting an option whose key contains "="', async function () {
					postWithCsrfTokenStub.resolves({ options: 'success' });

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', {
						'a=b': null,
					});

					sinon.assert.calledOnceWithMatch(
						postWithCsrfTokenStub,
						{ optionname: 'a=b' }
					);
					assert.notProperty(postWithCsrfTokenStub.firstCall.args[0], 'optionvalue');

					// Ensure the undefined property is stripped
					const params = Mwbot.Util.cloneDeep(postWithCsrfTokenStub.firstCall.args[0]);
					// @ts-expect-error - Protected method
					Mwbot.preprocessParameters(params);
					assert.notProperty(params, 'optionvalue');
				});

				it('should use the unit separator when a key contains "|"', async function () {
					postWithCsrfTokenStub.resolves({ options: 'success' });

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', {
						'foo|bar': 'baz',
					});

					sinon.assert.calledOnceWithMatch(
						postWithCsrfTokenStub,
						{ change: '\u001Ffoo|bar=baz' }
					);
				});

				it('should use the unit separator when a value contains "|"', async function () {
					postWithCsrfTokenStub.resolves({ options: 'success' });

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', {
						foo: 'a|b',
					});

					sinon.assert.calledOnceWithMatch(
						postWithCsrfTokenStub,
						{ change: '\u001Ffoo=a|b' }
					);
				});

				it('should split requests according to the API limit', async function () {
					postWithCsrfTokenStub.resolves({ options: 'success' });
					sinon.stub(mwbot, 'apilimit').get(() => 2);

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', {
						'a=b': '0',
						a: '1',
						b: '2',
						c: '3',
					});

					sinon.assert.calledThrice(postWithCsrfTokenStub);
					assert.deepInclude(postWithCsrfTokenStub.firstCall.args[0], {
						optionname: 'a=b',
						optionvalue: '0',
					});
					assert.strictEqual(postWithCsrfTokenStub.secondCall.args[0].change, 'a=1|b=2');
					assert.strictEqual(postWithCsrfTokenStub.thirdCall.args[0].change, 'c=3');
				});

				it('should create separate requests for keys containing "="', async function () {
					postWithCsrfTokenStub.resolves({
						options: 'success',
					});

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', {
						foo: 'bar',
						'a=b': 'c',
						baz: 'qux',
					});

					sinon.assert.calledTwice(postWithCsrfTokenStub);
					assert.deepEqual(postWithCsrfTokenStub.firstCall.args[0], {
						action: 'options',
						format: 'json',
						formatversion: '2',
						optionname: 'a=b',
						optionvalue: 'c',
					});
					assert.deepEqual(postWithCsrfTokenStub.secondCall.args[0], {
						action: 'options',
						format: 'json',
						formatversion: '2',
						change: 'foo=bar|baz=qux',
					});
				});

				it('should send one request per key containing "="', async function () {
					postWithCsrfTokenStub.resolves({ options: 'success' });

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', {
						'a=b': '1',
						'c=d': '2',
					});

					sinon.assert.calledTwice(postWithCsrfTokenStub);
					assert.strictEqual(postWithCsrfTokenStub.firstCall.args[0].optionname, 'a=b');
					assert.strictEqual(postWithCsrfTokenStub.secondCall.args[0].optionname, 'c=d');
				});

				it('should pass additional API parameters and request options', async function () {
					postWithCsrfTokenStub.resolves({ options: 'success' });

					const requestOptions = { timeout: 123 };

					// @ts-expect-error - Protected method
					await mwbot._saveOptions(
						'options',
						{ foo: 'bar' },
						{ assert: 'user' },
						requestOptions
					);

					sinon.assert.calledOnceWithMatch(
						postWithCsrfTokenStub,
						{ assert: 'user' },
						requestOptions
					);
				});

				it('should return the API response', async function () {
					const response = {
						options: /** @type {const} */ ('success'),
						warnings: {},
					};
					postWithCsrfTokenStub.resolves(response);

					// @ts-expect-error - Protected method
					const ret = await mwbot._saveOptions('options', {
						foo: 'bar',
					});

					assert.strictEqual(ret, response);
				});

				it('should throw if the API response is missing a success result', async function () {
					postWithCsrfTokenStub.resolves({});

					try {
						// @ts-expect-error - Protected method
						await mwbot._saveOptions('options', {
							foo: 'bar',
						});
						assert.fail('Expected _saveOptions() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'empty');
					}
				});

				it('should wait for a previous save request before sending a new one', async function () {
					/** @type {(value: any) => void} */
					let resolveFirst = () => {};

					postWithCsrfTokenStub.onFirstCall().returns(
						new Promise((resolve) => {
							resolveFirst = resolve;
						})
					);

					postWithCsrfTokenStub.onSecondCall().resolves({
						options: 'success',
					});

					// @ts-expect-error - Protected method
					const p1 = mwbot._saveOptions('options', {
						foo: 'bar',
					});

					// @ts-expect-error - Protected method
					const p2 = mwbot._saveOptions('options', {
						baz: 'qux',
					});

					sinon.assert.calledOnce(postWithCsrfTokenStub);

					resolveFirst({ options: 'success' });

					await p1;
					await p2;

					sinon.assert.calledTwice(postWithCsrfTokenStub);
				});

				it('should clear saveOptionsRequest after completion', async function () {
					postWithCsrfTokenStub.resolves({
						options: 'success',
					});

					// @ts-expect-error - Protected method
					await mwbot._saveOptions('options', {
						foo: 'bar',
					});

					// @ts-expect-error - Protected property
					assert.isNull(mwbot.saveOptionsRequest);
				});

				it('should clear saveOptionsRequest when the request fails', async function () {
					postWithCsrfTokenStub.rejects(new Error('boom'));

					try {
						// @ts-expect-error - Protected method
						await mwbot._saveOptions('options', {
							foo: 'bar',
						});
						assert.fail();
					} catch { /**/ }

					// @ts-expect-error - Protected property
					assert.isNull(mwbot.saveOptionsRequest);
				});
			});

			describe('Public methods', function () {
				/**
				 * @type {sinon.SinonStub}
				 */
				let _saveOptionsStub;

				beforeEach(function () {
					// @ts-expect-error - Protected method
					_saveOptionsStub = sinon.stub(mwbot, '_saveOptions');
				});

				describe('saveOptions()', function () {
					it('should delegate to _saveOptions()', async function () {
						const response = { options: 'success' };
						_saveOptionsStub.resolves(response);

						const options = { foo: 'bar' };
						const params = { assert: /** @type {const} */ ('user') };
						const reqOpts = { timeout: 123 };

						const ret = await mwbot.saveOptions(options, params, reqOpts);

						assert.strictEqual(ret, response);
						sinon.assert.calledOnceWithExactly(
							_saveOptionsStub,
							'options',
							options,
							params,
							reqOpts
						);
					});
				});

				describe('saveOption()', function () {
					it('should delegate to _saveOptions() with a single-option object', async function () {
						const response = { options: 'success' };
						_saveOptionsStub.resolves(response);

						const params = { assert: /** @type {const} */ ('user') };
						const reqOpts = { timeout: 123 };

						const ret = await mwbot.saveOption(
							'foo',
							'bar',
							params,
							reqOpts
						);

						assert.strictEqual(ret, response);
						sinon.assert.calledOnceWithExactly(
							_saveOptionsStub,
							'options',
							{ foo: 'bar' },
							params,
							reqOpts
						);
					});
				});

				describe('saveGlobalOptions()', function () {
					it('should delegate to _saveOptions()', async function () {
						const response = {
							globalpreferences: 'success',
						};
						_saveOptionsStub.resolves(response);

						const options = { foo: 'bar' };

						const ret = await mwbot.saveGlobalOptions(options);

						assert.strictEqual(ret, response);
						sinon.assert.calledOnceWithExactly(
							_saveOptionsStub,
							'globalpreferences',
							options,
							{},
							undefined
						);
					});
				});

				describe('saveGlobalOption()', function () {
					it('should delegate to _saveOptions() with a single-option object', async function () {
						const response = {
							globalpreferences: 'success',
						};
						_saveOptionsStub.resolves(response);

						await mwbot.saveGlobalOption('foo', 'bar');

						sinon.assert.calledOnceWithExactly(
							_saveOptionsStub,
							'globalpreferences',
							{ foo: 'bar' },
							{},
							undefined
						);
					});
				});

				describe('saveGlobalOptionOverrides()', function () {
					it('should delegate to _saveOptions()', async function () {
						const response = {
							globalpreferenceoverrides: 'success',
						};
						_saveOptionsStub.resolves(response);

						const options = { foo: 'bar' };

						const ret = await mwbot.saveGlobalOptionOverrides(options);

						assert.strictEqual(ret, response);
						sinon.assert.calledOnceWithExactly(
							_saveOptionsStub,
							'globalpreferenceoverrides',
							options,
							{},
							undefined
						);
					});
				});

				describe('saveGlobalOptionOverride()', function () {
					it('should delegate to _saveOptions() with a single-option object', async function () {
						const response = {
							globalpreferenceoverrides: 'success',
						};
						_saveOptionsStub.resolves(response);

						await mwbot.saveGlobalOptionOverride('foo', 'bar');

						sinon.assert.calledOnceWithExactly(
							_saveOptionsStub,
							'globalpreferenceoverrides',
							{ foo: 'bar' },
							{},
							undefined
						);
					});
				});
			});
		});
	});
}
