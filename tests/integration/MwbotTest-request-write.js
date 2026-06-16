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

		it('should refresh a badtoken error and complete the request successfully', async function () {
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
					assert.strictEqual(res.options, 'success');
					assert.isTrue(retrySpy.calledOnce);
					assert.isTrue(badTokenSpy.calledOnce);

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
	});
}