import { describe, it, afterEach } from 'mocha';
import { assert } from 'chai';
import {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	Mwbot,
	MwbotError,
} from '../../dist/index.js';
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
			// @ts-expect-error - Protected method
			const retrySpy = sinon.spy(mwbot, 'retry');
			const badTokenSpy = sinon.spy(mwbot, 'badToken');

			/** @type {Parameters<Mwbot['request']>} */
			const args = [
				{
					action: 'options',
					optionname: 'userjs-mwbot-ts', // Reset value
					token: 'badtoken',
				},
				{
					method: 'POST',
				},
			];

			if (authMethod === 'anonymous') {
				try {
					await mwbot.request(...args);
					assert.fail('Expected action=options to fail for anonymous users');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'anonymous');
				}
				return;
			}

			const res = await mwbot.request(...args);

			assert.deepInclude(res, {
				options: 'success',
			});
			sinon.assert.calledOnce(retrySpy);
			sinon.assert.calledOnce(badTokenSpy);

			const err = retrySpy.firstCall.args[0];
			assert.instanceOf(err, MwbotError);
			assert.strictEqual(err.code, 'badtoken');
		});

		it('should save a user option via saveOption() and fetch it via getOption()', async function () {
			// Note: ApiOptionsBase.php validates option keys internally.
			// Mwbot intentionally does not perform the same validation and instead relies
			// on the API to accept or reject the request.
			//
			// This test therefore uses a valid `userjs-` preference key so that the
			// save/get roundtrip can be verified.
			const mwbot = getMwbot();
			const key = `userjs-mwbot-ts-saveOption-${authMethod}`;
			const value = String(Date.now());

			if (authMethod === 'anonymous') {
				try {
					await mwbot.saveOption(key, value);
					assert.fail('Expected action=options to fail for anonymous users');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'anonymous');
				}
				return;
			}

			const res = await mwbot.saveOption(key, value);

			assert.deepInclude(res, {
				options: 'success',
			});

			// @ts-expect-error - Protected property
			assert.isNull(mwbot.saveOptionsRequest);

			const savedValue = await mwbot.getOption(key);

			assert.strictEqual(savedValue, value);
		});
	});
}