import { describe, it, afterEach } from 'mocha';
import { assert } from 'chai';
import { MwbotError } from '../../dist/index.js';
import sinon from 'sinon';

/**
 * @type {import('./provider-types.js').MwbotTestSuite}
 */
export function testMwbotWriteRequests(getMwbot, _testDomain, authMethod) {
	describe('Mwbot write requests', function () {

		afterEach(function () {
			sinon.restore();
		});

		it('should handle badtoken errors based on authentication state', async function () {
			const mwbot = getMwbot();
			const isAnon = authMethod === 'anonymous';
			// @ts-expect-error - Protected method
			const retrySpy = sinon.spy(mwbot, 'retry');
			const badTokenSpy = sinon.spy(mwbot, 'badToken');

			try {
				const res = await mwbot.request(
					{
						action: 'options',
						optionname: 'userjs-mwbot-ts', // Reset value
						token: 'badtoken',
					},
					{
						method: 'POST',
					}
				);

				if (isAnon) {
					assert.fail('Expected action=options to fail for anonymous users');
				} else {
					assert.deepInclude(res, {
						options: 'success',
					});
					sinon.assert.calledOnce(retrySpy);
					sinon.assert.calledOnce(badTokenSpy);

					const err = retrySpy.firstCall.args[0];
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'badtoken');
				}
			} catch (err) {
				assert.instanceOf(err, MwbotError);

				if (isAnon) {
					assert.strictEqual(err.code, 'anonymous');
				} else {
					assert.fail('Expected action=options to succeed for registered users');
				}
			}
		});

		it('should save a user option via saveOption() and fetch it via getOption()', async function () {
			// Note: ApiOptionsBase.php validates option keys internally.
			// Mwbot intentionally does not perform the same validation and instead relies
			// on the API to accept or reject the request.
			//
			// This test therefore uses a valid `userjs-` preference key so that the
			// save/get roundtrip can be verified.
			const mwbot = getMwbot();
			const isAnon = authMethod === 'anonymous';
			const key = `userjs-mwbot-ts-saveOption-${authMethod}`;
			const value = String(Date.now());

			try {
				const res = await mwbot.saveOption(key, value);

				if (isAnon) {
					assert.fail('Expected action=options to fail for anonymous users');
				} else {
					assert.deepInclude(res, {
						options: 'success',
					});
				}
			} catch (err) {
				assert.instanceOf(err, MwbotError);

				if (isAnon) {
					assert.strictEqual(err.code, 'anonymous');
				} else {
					assert.fail('Expected action=options to succeed for registered users');
				}
			} finally {
				// @ts-expect-error - Protected property
				assert.isNull(mwbot.saveOptionsRequest);
			}

			if (!isAnon) {
				const savedValue = await mwbot.getOption(key);

				assert.strictEqual(savedValue, value);
			}
		});
	});
}