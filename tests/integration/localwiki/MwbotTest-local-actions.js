import { describe, it } from 'mocha';
import { assert } from 'chai';
import { getNonExistingTitle } from './title-provider.js';
import { MwbotError } from '../../../dist/index.js';

/**
 * @type {import('./../provider-types.js').MwbotTestSuite}
 */
export function testMwbotLocalActions(getMwbot, _testDomain, authMethod) {
	describe('General action requests', function () {
		describe('move()', function () {
			it('should move an existing page', async function () {
				const mwbot = getMwbot();
				const source = 'Move from';
				const goal = 'Move to';
				const reason = 'reason';

				if (authMethod === 'anonymous') {
					try {
						await mwbot.move(source, goal, { reason, movetalk: true });
						assert.fail('Expected move() to throw');
					} catch (err) {
						assert.instanceOf(err, MwbotError);
						assert.strictEqual(err.code, 'anonymous');
					}
					return;
				}

				const res = await mwbot.move(source, goal, { reason, movetalk: true });

				/* eslint-disable @typescript-eslint/no-unused-vars */
				const { // Fully checked (source code level)
					from,
					to,
					reason: _reason,
					redirectcreated,
					moveoverredirect,
					talkfrom,
					talkto,
					talkmoveoverredirect,
					'talkmove-errors': talkmove_errors,
					subpages,
					'subpages-talk': subpages_talk,
					...rest
				} = res;
				/* eslint-enable @typescript-eslint/no-unused-vars */

				assert.deepInclude(
					res,
					{
						from: source,
						to: goal,
						reason,
						redirectcreated: true,
						moveoverredirect: false,
						talkfrom: `Talk:${source}`,
						talkto: `Talk:${goal}`,
						talkmoveoverredirect: false,
						// 'talkmove-errors',
						// subpages,
						// 'subpages-talk',
					}
				);
				assert.notProperty(res, 'talkmove-errors');
				assert.notProperty(res, 'subpages');
				assert.notProperty(res, 'subpages-talk');

				assert.isEmpty(rest);
			});

			it('should fail to move a non-existing page', async function () {
				const mwbot = getMwbot();
				const source = getNonExistingTitle();
				const goal = getNonExistingTitle();
				const isAnon = authMethod === 'anonymous';

				try {
					await mwbot.move(source, goal);
					assert.fail('Expected move() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, isAnon ? 'anonymous' : 'missingtitle');
				}
			});
		});

		describe('purge()', function () {
			it('should purge existing pages and report missing pages', async function () {
				const page1 = 'Main Page';
				const page2 = getNonExistingTitle();

				const res = await getMwbot().purge([page1, page2]);

				const purge = [...(res.purge ?? [])].sort((a, b) => {
					return a.title && b.title ? a.title.localeCompare(b.title) : 0;
				});

				assert.deepStrictEqual(
					purge,
					[
						{
							"ns": 0,
							"title": page1,
							"purged": true,
						},
						{
							"ns": 0,
							"title": page2,
							"missing": true,
						},
					]
				);
			});
		});
	});
}