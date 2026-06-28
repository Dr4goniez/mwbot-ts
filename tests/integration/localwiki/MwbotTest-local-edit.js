import { describe, it } from 'mocha';
import { assert } from 'chai';
import { getNonExistingTitle } from './title-provider.js';
import { MwbotError } from '../../../dist/index.js';
import { Logger } from '../../../dist/build/Logger.js';

const logger = new Logger({ outputErrors: true });

/**
 * @type {import('./../provider-types.js').MwbotTestSuite}
 */
export function testMwbotLocalEdit(getMwbot, _testDomain, authMethod) {
	describe('Edit tests', function () {
		describe('create()', function () {
			it('should create a new page', async function () {
				const mwbot = getMwbot();
				const target = getNonExistingTitle();
				const isAnon = authMethod === 'anonymous';

				try {
					const res = await mwbot.create(target, 'content');

					if (isAnon) {
						assert.fail('Expected create() to throw');
					} else {
						/* eslint-disable @typescript-eslint/no-unused-vars */
						const {
							result,
							new: isNew,
							pageid,
							title,
							contentmodel,
							nochange,
							oldrevid,
							newrevid,
							newtimestamp,
							watched,
							watchlistexpiry,
							tempusercreated,
							tempusercreatedredirect,
							...rest
						} = res;
						/* eslint-enable @typescript-eslint/no-unused-vars */

						assert.deepInclude(
							res,
							{
								result: 'Success',
								new: true,
								// pageid,
								title: target,
								contentmodel: 'wikitext',
								// nochange,
								oldrevid: 0,
								// newrevid,
								// newtimestamp,
								watched: true,
								// watchlistexpiry,
								// tempusercreated,
								// tempusercreatedredirect,
							}
						);
						assert.isNumber(pageid);
						assert.notProperty(res, 'nochange');
						assert.isAbove(newrevid ?? 0, 0);
						assert.isString(newtimestamp);
						assert.notProperty(res, 'watchlistexpiry');
						assert.notProperty(res, 'tempusercreated');
						assert.notProperty(res, 'tempusercreatedredirect');

						assert.isEmpty(rest);
					}
				} catch (err) {
					assert.instanceOf(err, MwbotError);

					if (isAnon) {
						assert.strictEqual(err.code, 'anonymous');
					} else {
						logger.error(err);
						assert.fail('Expected create() to succeed');
					}
				}
			});

			it('should fail to create an existing page', async function () {
				const mwbot = getMwbot();
				const target = 'Create existing page';
				const isAnon = authMethod === 'anonymous';

				try {
					const res = await mwbot.create(target, 'content');
					console.error('%o', res);
					assert.fail('Expected create() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, isAnon ? 'anonymous' : 'articleexists');
				}
			});
		});
	});
}