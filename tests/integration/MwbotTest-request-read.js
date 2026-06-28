import { describe, it } from 'mocha';
import { assert } from 'chai';

/**
 * @type {import('./provider-types.js').MwbotTestSuite}
 */
export function testMwbotReadRequests(getMwbot, _testDomain, _authMethod) {
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
	});
}