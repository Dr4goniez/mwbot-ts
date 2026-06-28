import { describe, it } from 'mocha';
import { assert } from 'chai';
import { MwbotError } from '../../dist/index.js';

/**
 * @type {import('./provider-types.js').MwbotTestSuite}
 */
export function testMwbotReadRequests(getMwbot, testDomain, _authMethod) {
	describe('Mwbot read requests', function () {
		describe('request()', function () {
			it('should perform a GET request successfully', async function () {
				const mwbot = getMwbot();

				const res = await mwbot.request(
					{
						action: 'query',
						titles: 'Main Page',
					},
					{
						method: 'GET',
					}
				);

				assert.isObject(res.query);
				assert.isArray(res.query?.pages);
				assert.isObject(res.query?.pages?.[0]);
				assert.isNumber(res.query?.pages?.[0].pageid);
				assert.strictEqual(res.query?.pages?.[0].ns, 0);
				assert.strictEqual(res.query?.pages?.[0].title, 'Main Page');
			});

			it('should perform a POST request successfully', async function () {
				const mwbot = getMwbot();

				const res = await mwbot.request(
					{
						action: 'query',
						titles: 'Main Page',
					},
					{
						method: 'POST',
						headers: {
							'Promise-Non-Write-API-Action': '1',
						},
					}
				);

				assert.isObject(res.query);
				assert.isArray(res.query?.pages);
				assert.isObject(res.query?.pages?.[0]);
				assert.isNumber(res.query?.pages?.[0].pageid);
				assert.strictEqual(res.query?.pages?.[0].ns, 0);
				assert.strictEqual(res.query?.pages?.[0].title, 'Main Page');
			});
		});

		describe('read()', function () {

			/**
			 * @param {1 | 2 | 3} index `3` for a non-existing page
			 * @returns {{ ns: number; title: string; }}
			 */
			const getTitle = (index) => {
				let title = `Read ${index}`;
				let ns = 0;
				if (testDomain === 'testwiki') {
					title = 'User:Dragoniez/CI/' + title;
					ns = 2;
				}
				return { ns, title };
			};

			/**
			 * @param {import('../../dist/index.js').Revision} res
			 * @param {number} ns
			 * @param {string} title
			 */
			const validateReadResponseObject = (res, ns, title) => {
				/* eslint-disable @typescript-eslint/no-unused-vars */
				const {
					pageid,
					ns: _ns,
					title: _title,
					baserevid,
					user,
					basetimestamp,
					starttimestamp,
					content,
					...rest
				} = res;
				/* eslint-enable @typescript-eslint/no-unused-vars */

				assert.deepInclude(
					res,
					{
						// pageid,
						ns,
						title,
						// baserevid,
						// user,
						// basetimestamp,
						// starttimestamp,
						content: 'dummy content',
					}
				);

				assert.isAbove(pageid, 0);
				assert.isAbove(baserevid, 0);
				assert.isString(user);
				assert.isString(basetimestamp);
				assert.isString(starttimestamp);

				assert.isEmpty(rest);
			};

			it('should read a single page', async function () {
				const { ns, title } = getTitle(1);

				const res = await getMwbot().read(title);

				validateReadResponseObject(res, ns, title);
			});

			it('should read multiple pages', async function () {
				const titles = [
					getTitle(1),
					getTitle(2),
				];

				const res = await getMwbot().read(titles.map(obj => obj.title));

				assert.notInstanceOf(res[0], MwbotError);
				validateReadResponseObject(res[0], titles[0].ns, titles[0].title);

				assert.notInstanceOf(res[1], MwbotError);
				validateReadResponseObject(res[1], titles[1].ns, titles[1].title);
			});

			it('should throw for a missing page when reading a single title', async function () {
				const { title } = getTitle(3);

				try {
					await getMwbot().read(title);
					assert.fail('Expected read() to throw');
				} catch (err) {
					assert.instanceOf(err, MwbotError);
					assert.strictEqual(err.code, 'pagemissing');
				}
			});

			it('should return errors for missing pages when reading multiple titles', async function () {
				const titles = [
					getTitle(1),
					getTitle(3),
				];

				const res = await getMwbot().read(titles.map(obj => obj.title));

				assert.notInstanceOf(res[0], MwbotError);
				validateReadResponseObject(res[0], titles[0].ns, titles[0].title);

				assert.instanceOf(res[1], MwbotError);
				assert.strictEqual(res[1].code, 'pagemissing');
			});

			it('should preserve duplicate titles', async function () {
				const { ns, title } = getTitle(1);

				const res = await getMwbot().read([title, title]);

				assert.notInstanceOf(res[0], MwbotError);
				validateReadResponseObject(res[0], ns, title);

				assert.notInstanceOf(res[1], MwbotError);
				validateReadResponseObject(res[1], ns, title);

				assert.deepEqual(res[0], res[1]);
				assert.notStrictEqual(res[0], res[1]);
			});
		});
	});
}