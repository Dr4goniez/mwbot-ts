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
	describe('Edit requests', function () {

		/**
		 * @param {import('../../../dist/index.js').ApiResponseEditSuccess} res
		 * @param {string} target
		 */
		const validatePageCreationResponse = (res, target) => {
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
		};

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
						validatePageCreationResponse(res, target);
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

		/**
		 * @param {import('../../../dist/index.js').ApiResponseEditSuccess} res
		 * @param {string} target
		 */
		const validatePageModificationResponse = (res, target) => {
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
					// new,
					// pageid,
					title: target,
					contentmodel: 'wikitext',
					// nochange,
					// oldrevid,
					// newrevid,
					// newtimestamp,
					watched: true,
					// watchlistexpiry,
					// tempusercreated,
					// tempusercreatedredirect,
				}
			);
			assert.notProperty(res, 'new');
			assert.isNumber(pageid);
			assert.notProperty(res, 'nochange');
			assert.isAbove(oldrevid ?? 0, 0);
			assert.isAbove(newrevid ?? 0, 0);
			assert.isString(newtimestamp);
			assert.notProperty(res, 'watchlistexpiry');
			assert.notProperty(res, 'tempusercreated');
			assert.notProperty(res, 'tempusercreatedredirect');

			assert.isEmpty(rest);
		};

		describe('save()', function () {
			it('should save to an existing page', async function () {
				const mwbot = getMwbot();
				const target = 'Save existing page';
				const isAnon = authMethod === 'anonymous';

				try {
					const res = await mwbot.save(target, 'content');

					if (isAnon) {
						assert.fail('Expected save() to throw');
					} else {
						validatePageModificationResponse(res, target);
					}
				} catch (err) {
					assert.instanceOf(err, MwbotError);

					if (isAnon) {
						assert.strictEqual(err.code, 'anonymous');
					} else {
						logger.error(err);
						assert.fail('Expected save() to succeed');
					}
				}
			});

			it('should fail to save to a non-existing page', async function () {
				const mwbot = getMwbot();
				const target = getNonExistingTitle();
				const isAnon = authMethod === 'anonymous';

				try {
					const res = await mwbot.save(target, 'content');
					console.error('%o', res);
					assert.fail('Expected save() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, isAnon ? 'anonymous' : 'missingtitle');
				}
			});
		});

		describe('edit()', function () {
			it('should edit an existing page', async function () {
				const mwbot = getMwbot();
				const target = 'Edit existing page';
				const isAnon = authMethod === 'anonymous';

				try {
					const res = await mwbot.edit(target, (_wikitext, _revision) => {
						return { text: 'content' };
					});

					if (isAnon) {
						assert.fail('Expected edit() to throw');
					} else {
						validatePageModificationResponse(res, target);
					}
				} catch (err) {
					assert.instanceOf(err, MwbotError);

					if (isAnon) {
						assert.strictEqual(err.code, 'anonymous');
					} else {
						logger.error(err);
						assert.fail('Expected edit() to succeed');
					}
				}
			});

			it('should fail to edit to a non-existing page', async function () {
				const mwbot = getMwbot();
				const target = getNonExistingTitle();
				const isAnon = authMethod === 'anonymous';

				try {
					const res = await mwbot.edit(target, (_wikitext, _revision) => {
						return { text: 'content' };
					});
					console.error('%o', res);
					assert.fail('Expected edit() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, isAnon ? 'anonymous' : 'pagemissing');
				}
			});
		});

		describe('newSection()', function () {
			it('should create a new section on an existing page', async function () {
				const mwbot = getMwbot();
				const target = 'Talk:NewSection';
				const isAnon = authMethod === 'anonymous';

				try {
					const res = await mwbot.newSection(target, 'Section', 'content');

					if (isAnon) {
						assert.fail('Expected newSection() to throw');
					} else {
						validatePageModificationResponse(res, target);
					}
				} catch (err) {
					assert.instanceOf(err, MwbotError);

					if (isAnon) {
						assert.strictEqual(err.code, 'anonymous');
					} else {
						logger.error(err);
						assert.fail('Expected newSection() to succeed');
					}
				}
			});

			it('should create a new section on a non-existing page', async function () {
				const mwbot = getMwbot();
				const target = getNonExistingTitle();
				const isAnon = authMethod === 'anonymous';

				try {
					const res = await mwbot.newSection(target, 'Section', 'content');

					if (isAnon) {
						assert.fail('Expected newSection() to throw');
					} else {
						validatePageCreationResponse(res, target);
					}
				} catch (err) {
					assert.instanceOf(err, MwbotError);

					if (isAnon) {
						assert.strictEqual(err.code, 'anonymous');
					} else {
						logger.error(err);
						assert.fail('Expected newSection() to succeed');
					}
				}
			});
		});
	});
}