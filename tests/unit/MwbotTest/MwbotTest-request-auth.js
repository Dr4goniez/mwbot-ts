import { describe, it, before, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MwbotError } from '../../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import sinon from 'sinon';

export function testMwbotRequestAuth() {
	describe('Authentication-related request methods', function () {
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

		describe('login()', function () {
			/**
			 * @type {sinon.SinonStub}
			 */
			let getTokenStub;
			/**
			 * @type {sinon.SinonStub}
			 */
			let postStub;

			beforeEach(function() {
				// @ts-expect-error - Protected property
				sinon.stub(mwbot, 'tokens').value({});
				getTokenStub = sinon.stub(mwbot, 'getToken');
				postStub = sinon.stub(mwbot, 'post');
			});

			it('should log in successfully and clear cached tokens', async function () {
				getTokenStub.resolves('LOGIN_TOKEN');
				const response = {
					login: {
						result: /** @type {const} */ ('Success'),
						lguserid: 1,
						lgusername: 'Foo',
					},
				};
				postStub.resolves(response);

				// @ts-expect-error- Protected method
				const ret = await Mwbot.prototype.login.call(mwbot, 'Foo', 'p@assword');

				assert.deepEqual(ret, response.login);
				sinon.assert.calledOnceWithExactly(
					getTokenStub,
					'login',
					{ maxlag: undefined },
					{
						disableRetryAPI: true,
						disableAssert: true,
					}
				);
				sinon.assert.calledOnceWithExactly(
					postStub,
					{
						action: 'login',
						format: 'json',
						formatversion: '2',
						lgname: 'Foo',
						lgpassword: 'p@assword',
						lgtoken: 'LOGIN_TOKEN',
						maxlag: undefined,
					},
					{
						disableRetryAPI: true,
						disableAssert: true,
					}
				);
				// @ts-expect-error - Protected property
				assert.deepEqual(mwbot.tokens, {});
			});

			it('should throw when the response is missing "login"', async function () {
				getTokenStub.resolves('LOGIN_TOKEN');
				const response = { foo: 'bar' };
				postStub.resolves(response);

				try {
					// @ts-expect-error- Protected method
					await Mwbot.prototype.login.call(mwbot, 'Foo', 'p@assword');
					assert.fail('Expected login() to fail');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'empty');
					assert.deepEqual(err.data?.response, response);
				}
			});

			it('should throw when login fails with a reason', async function () {
				getTokenStub.resolves('LOGIN_TOKEN');
				postStub.resolves({
					login: {
						result: 'Failed',
						reason: 'Wrong password',
					},
				});

				try {
					// @ts-expect-error- Protected method
					await Mwbot.prototype.login.call(mwbot, 'Foo', 'p@assword');
					assert.fail('Expected login() to fail');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'loginfailed');
					assert.strictEqual(err.info, 'Wrong password');
				}
			});

			it('should throw with a default message when login fails without a reason', async function () {
				getTokenStub.resolves('LOGIN_TOKEN');
				postStub.resolves({
					login: {
						result: 'WrongToken',
					},
				});

				try {
					// @ts-expect-error- Protected method
					await Mwbot.prototype.login.call(mwbot, 'Foo', 'p@assword');
					assert.fail('Expected login() to fail');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'loginfailed');
					assert.strictEqual(err.info, 'Failed to log in.');
				}
			});
		});
	});
}