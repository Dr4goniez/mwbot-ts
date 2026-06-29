import { describe, it } from 'mocha';
import { assert } from 'chai';
import { MwbotError } from '../../../dist/index.js';

/**
 * @type {import('./../provider-types.js').MwbotTestSuite}
 */
export function testMwbotLocalAdmin(getMwbot, _testDomain, authMethod) {
	describe('Admin action requests', function () {
		describe('block()', function () {
			it('should block a user', async function () {
				const target = '1.1.1.1';
				const reason = 'reason';

				if (authMethod === 'anonymous') {
					try {
						await getMwbot().block(target, { reason });
						assert.fail('Expected block() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'anonymous');
					}
					return;
				}

				const res = await getMwbot().block(target, { reason });

				assert.deepInclude(
					res,
					{
						user: target,
						userID: 0,
						expiry: 'infinite',
						// id,
						reason,
						// XXX: ApiBlock is inelegant and returns input restrictions
						anononly: true, // XXX
						nocreate: true, // XXX
						autoblock: true, // XXX: This should be false since we're blocking an IP
						noemail: false, // XXX
						hidename: false,
						allowusertalk: true, // XXX
						watchuser: false, // XXX
						watchlistexpiry: null,
						partial: false, // XXX
						pagerestrictions: null, // XXX
						namespacerestrictions: null, // XXX
						actionrestrictions: null, // XXX
					}
				);

				/* eslint-disable @typescript-eslint/no-unused-vars */
				const {
					user,
					userID,
					expiry,
					id,
					reason: _reason,
					anononly,
					nocreate,
					autoblock,
					noemail,
					hidename,
					allowusertalk,
					watchuser,
					watchlistexpiry,
					partial,
					pagerestrictions,
					namespacerestrictions,
					actionrestrictions,
					...rest
				} = res;
				/* eslint-enable @typescript-eslint/no-unused-vars */

				assert.isAbove(id, 0);

				assert.isEmpty(rest);
			});
		});

		describe('unblock()', function () {
			it('should unblock a user', async function () {
				const target = '2.2.2.2';
				const reason = 'reason';

				if (authMethod === 'anonymous') {
					try {
						await getMwbot().unblock(target, { reason });
						assert.fail('Expected unblock() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'anonymous');
					}
					return;
				}

				const res = await getMwbot().unblock(target, { reason });

				assert.deepInclude(
					res,
					{
						// id,
						user: target,
						userid: 0,
						reason,
						watchuser: false,
						// watchlistexpiry
					}
				);

				/* eslint-disable @typescript-eslint/no-unused-vars */
				const {
					id,
					user,
					userid,
					reason: _reason,
					watchuser,
					watchlistexpiry,
					...rest
				} = res;
				/* eslint-enable @typescript-eslint/no-unused-vars */

				assert.isAbove(id, 0);
				assert.notProperty(res, 'watchlistexpiry');

				assert.isEmpty(rest);
			});
		});

		describe('delete()', function () {
			it('should delete a page', async function () {
				const target = 'Delete existing page';
				const reason = 'reason';

				if (authMethod === 'anonymous') {
					try {
						await getMwbot().delete(target, { reason });
						assert.fail('Expected delete() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'anonymous');
					}
					return;
				}

				const res = await getMwbot().delete(target, { reason });

				assert.deepInclude(
					res,
					{
						title: target,
						reason,
						// logid,
					}
				);

				/* eslint-disable @typescript-eslint/no-unused-vars */
				const {
					title,
					reason: _reason,
					logid,
					...rest
				} = res;
				/* eslint-enable @typescript-eslint/no-unused-vars */

				assert.isAbove(logid ?? 0, 0);

				assert.isEmpty(rest);
			});
		});

		describe('undelete()', function () {
			it('should undelete a page', async function () {
				const target = 'Undelete deleted page';
				const reason = 'reason';

				if (authMethod === 'anonymous') {
					try {
						await getMwbot().undelete(target, { reason });
						assert.fail('Expected undelete() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'anonymous');
					}
					return;
				}

				const res = await getMwbot().undelete(target, { reason });

				assert.deepInclude(
					res,
					{
						title: target,
						revisions: 1,
						fileversions: 0,
						reason,
					}
				);

				/* eslint-disable @typescript-eslint/no-unused-vars */
				const {
					title,
					revisions,
					fileversions,
					reason: _reason,
					...rest
				} = res;
				/* eslint-enable @typescript-eslint/no-unused-vars */

				assert.isEmpty(rest);
			});
		});
	});
}