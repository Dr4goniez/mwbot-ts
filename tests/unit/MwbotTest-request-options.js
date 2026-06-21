import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	Mwbot, // Type import
	MwbotError,
} from '../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotOptions() {
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
			 * @param {import('../../dist/index.js').ApiResponseQueryMetaUserinfo['options']} options
			 * @returns {import('../../dist/index.js').ApiResponse}
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

					assert.deepInclude(getStub.firstCall.args[0], {
						action: 'query',
						meta: 'userinfo',
						uiprop: 'options',
						format: 'json',
						formatversion: '2',
					});
					assert.deepEqual(getStub.firstCall.args[1], requestOptions);
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

					assert.isTrue(
						getOptionsStub.calledOnceWithExactly(
							additionalParams,
							requestOptions
						)
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
			 * @param {import('../../dist/index.js').ApiResponseQueryMetaGlobalpreferences['preferences']} [preferences]
			 * @param {import('../../dist/index.js').ApiResponseQueryMetaGlobalpreferences['localoverrides']} [localoverrides]
			 * @returns {import('../../dist/index.js').ApiResponse}
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
				it('should throw "anonymous" error if the client is anonymous', async function() {
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

					assert.deepEqual(getStub.firstCall.args[0], {
						assert: 'user',
						action: 'query',
						format: 'json',
						formatversion: '2',
						meta: 'globalpreferences',
						gprprop: 'preferences',
					});
					assert.deepEqual(getStub.firstCall.args[1], {
						timeout: 7777,
					});
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
					assert.deepEqual(gpSpy.firstCall.args[0], ['preferences', 'localoverrides']);
					assert.deepEqual(gpSpy.firstCall.args[1], params);
					assert.deepEqual(gpSpy.firstCall.args[2], reqOpts);
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
					assert.deepEqual(gpSpy.firstCall.args[0], ['preferences']);
					assert.deepEqual(gpSpy.firstCall.args[1], params);
					assert.deepEqual(gpSpy.firstCall.args[2], reqOpts);
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
					assert.deepEqual(gpSpy.firstCall.args[0], ['localoverrides']);
					assert.deepEqual(gpSpy.firstCall.args[1], params);
					assert.deepEqual(gpSpy.firstCall.args[2], reqOpts);
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
	});
}