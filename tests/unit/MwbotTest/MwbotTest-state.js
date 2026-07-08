import { describe, it } from 'mocha';
import { assert } from 'chai';
import { MwbotError } from '../../../dist/index.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';

export function testMwbotState() {
	describe('Instance state and configuration', function () {
		describe('setMwbotOptions()', function () {
			it('should deeply merge options when merge is true (default)', async function () {
				const mwbot = await getTestMwbot('named');
				const intervalActions = [/** @type {const} */ ('edit')];
				mwbot.userMwbotOptions.intervalActions = intervalActions;

				mwbot.setMwbotOptions({ userAgent: 'new-agent' });

				assert.strictEqual(mwbot.userMwbotOptions.apiUrl, 'http://localhost:8080');
				assert.strictEqual(mwbot.userMwbotOptions.userAgent, 'new-agent');
				assert.deepEqual(mwbot.userMwbotOptions.intervalActions, intervalActions);
				assert.notStrictEqual(mwbot.userMwbotOptions.intervalActions, intervalActions); // Test deep copy
			});

			it('should clear old options except apiUrl when merge is false', async function () {
				const mwbot = await getTestMwbot('named');
				mwbot.userMwbotOptions.intervalActions = ['edit'];

				mwbot.setMwbotOptions({ userAgent: 'new-agent' }, false);

				assert.strictEqual(mwbot.userMwbotOptions.apiUrl, 'http://localhost:8080');
				assert.strictEqual(mwbot.userMwbotOptions.userAgent, 'new-agent');
				assert.notExists(mwbot.userMwbotOptions.intervalActions);
			});

			it('should throw "nourl" fatal error if apiUrl is missing after update', async function () {
				const mwbot = await getTestMwbot('named');

				assert.throws(
					() => mwbot.setMwbotOptions({ apiUrl: '' }), // Overwrite
					MwbotError,
					'"apiUrl" must be retained.'
				);
			});
		});

		describe('setRequestOptions()', function () {
			it('should deeply merge options when merge is true (default)', async function () {
				const mwbot = await getTestMwbot('named');
				mwbot.userRequestOptions.headers ??= {};
				mwbot.userRequestOptions.headers['X-Retained'] = '1';

				mwbot.setRequestOptions({ headers: { 'X-Test': '1' }, timeout: 1000 });

				// Constructor sets up `url` in all cases: it should be retained
				assert.strictEqual(mwbot.userRequestOptions.url, 'http://localhost:8080');
				assert.strictEqual(mwbot.userRequestOptions.timeout, 1000);
				assert.strictEqual(mwbot.userRequestOptions.headers?.['X-Retained'], '1');
				assert.strictEqual(mwbot.userRequestOptions.headers?.['X-Test'], '1');
			});

			it('should clear old options when merge is false', async function () {
				const mwbot = await getTestMwbot('named');

				mwbot.setRequestOptions({ headers: { 'X-Test': '1' } }, false);

				assert.isUndefined(mwbot.userRequestOptions.url);
				assert.deepEqual(mwbot.userRequestOptions.headers, { 'X-Test': '1' });
			});
		});

		// usingOAuth() is tested in integration tests

		describe('apilimit', function () {
			it('should return 500 if the user has "apihighlimits" right', async function () {
				const mwbot = await getTestMwbot('named');
				assert.strictEqual(mwbot.apilimit, 500);
			});

			it('should return 50 if the user lacks "apihighlimits" right', async function () {
				const mwbot = await getTestMwbot('anon');
				assert.strictEqual(mwbot.apilimit, 50);
			});
		});

		describe('hasRights()', function () {
			it('should return true if the user has the specified single right', async function () {
				const mwbot = await getTestMwbot('anon');
				assert.isTrue(mwbot.hasRights('edit'));
			});

			it('should return false if the user lacks the specified single right', async function () {
				const mwbot = await getTestMwbot('anon');
				assert.isFalse(mwbot.hasRights('delete'));
			});

			it('should return true if requireAll is true and user has ALL rights', async function () {
				const mwbot = await getTestMwbot('named');
				assert.isTrue(mwbot.hasRights(['read', 'delete'], true));
			});

			it('should return false if requireAll is true and user lacks ANY right', async function () {
				const mwbot = await getTestMwbot('anon');
				assert.isFalse(mwbot.hasRights(['read', 'delete'], true));
			});

			it('should return true for an empty rights array when requireAll is true', async function () {
				const mwbot = await getTestMwbot('anon');
				assert.isTrue(mwbot.hasRights([], true));
			});

			it('should return true if requireAll is false and user has AT LEAST ONE right', async function () {
				const mwbot = await getTestMwbot('anon');
				assert.isTrue(mwbot.hasRights(['edit', 'delete'], false));
			});

			it('should return false if requireAll is false and user lacks ALL rights', async function () {
				const mwbot = await getTestMwbot('anon');
				assert.isFalse(mwbot.hasRights(['delete', 'block'], false));
			});
		});

		describe('isAnonymous()', function () {
			it('should return true if instantiated as anonymous', async function () {
				const mwbot = await getTestMwbot('anon');
				// @ts-expect-error - Protected method
				assert.isTrue(mwbot.isAnonymous());
			});

			it('should return false if instantiated as a named user', async function () {
				const mwbot = await getTestMwbot('named');
				// @ts-expect-error - Protected method
				assert.isFalse(mwbot.isAnonymous());
			});
		});
	});
}