import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import {
	getTestMwbot,
	TestMwbotFactory,
} from './MwbotTest-fixtures.js';

export function testMwbotConfig() {
	describe('config', function () {
		/**
		 * @type {Awaited<ReturnType<typeof getTestMwbot>>['config']}
		 * @readonly
		 */
		let config;
		const missingKey = 'missingKey';
		let counter = 0;
		const testKey = () => `test_key_${counter++}`;

		before(async function () {
			config = (await getTestMwbot('named')).config;
		});

		it('should contain functions', function () {
			assert.isFunction(config.get);
			assert.isFunction(config.set);
			assert.isFunction(config.exists);
		});

		describe('get()', function () {
			it('should return null for a missing key by default', function () {
				assert.isNull(config.get(missingKey));
			});

			it('should return the fallback value for a missing key', function () {
				assert.strictEqual(config.get(missingKey, 'fallback'), 'fallback');
			});

			it('should treat explicit undefined fallback as null', function () {
				assert.isNull(config.get(missingKey, undefined));
			});

			it('should return an object when given an array of keys', function () {
				assert.deepEqual(
					config.get(['wgContentLanguage', 'wgSiteName']),
					{
						wgContentLanguage: 'en',
						wgSiteName: 'Wikipedia',
					}
				);
			});

			it('should apply fallback to missing keys in array selection', function () {
				assert.deepEqual(
					config.get(['wgContentLanguage', missingKey], 'missing'),
					{
						wgContentLanguage: 'en',
						[missingKey]: 'missing',
					}
				);
			});

			it('should return all config values when called without arguments', function () {
				const all = config.get();

				assert.isObject(all);
				// @ts-expect-error - Accessing a protected property
				assert.strictEqual(Object.keys(all).length, TestMwbotFactory().CONFIG_KEYS.size);
				assert.isString(all.wgArticlePath);
				assert.isArray(all.wgCaseSensitiveNamespaces);
				assert.propertyVal(all, 'wgContentLanguage', 'en');
				assert.isArray(all.wgContentNamespaces);
				assert.propertyVal(all, 'wgDBname', 'mwbot_ts');
				assert.isObject(all.wgFormattedNamespaces);
				assert.isString(all.wgLegalTitleChars);
				assert.isObject(all.wgNamespaceIds);
				assert.isString(all.wgScript);
				assert.isString(all.wgScriptPath);
				assert.propertyVal(all, 'wgServer', 'http://localhost:8080');
				assert.propertyVal(all, 'wgServerName', 'localhost');
				assert.propertyVal(all, 'wgSiteName', 'Wikipedia');
				assert.isNumber(all.wgUserId);
				assert.isString(all.wgUserName);
				assert.isArray(all.wgUserRights);
				assert.isString(all.wgVersion);
				assert.propertyVal(all, 'wgWikiID', 'mwbot_ts');
			});

			it('should return a deep copy', function () {
				const all = config.get();

				all.wgNamespaceIds.foo = 123;

				assert.notProperty(config.get('wgNamespaceIds'), 'foo');
			});
		});

		describe('exists()', function () {
			it('should return true for an existing key', function () {
				assert.isTrue(config.exists('wgUserName'));
			});

			it('should return false for a missing key', function () {
				assert.isFalse(config.exists(missingKey));
			});

			it('should return true for keys with null values', function () {
				const key = testKey();

				assert.isTrue(config.set(key, null));
				assert.isTrue(config.exists(key));
				assert.isNull(config.get(key));
			});

		});

		describe('set()', function () {
			it('should set a custom key', function () {
				const key = testKey();

				assert.isTrue(config.set(key, 123));
				assert.strictEqual(config.get(key), 123);
			});

			it('should set multiple custom keys', function () {
				const key1 = testKey();
				const key2 = testKey();

				assert.isTrue(
					config.set({
						[key1]: 'bar',
						[key2]: 456,
					})
				);
				assert.strictEqual(config.get(key1), 'bar');
				assert.strictEqual(config.get(key2), 456);
			});

			it('should ignore undefined values', function () {
				const key = testKey();

				assert.isFalse(config.set(key, undefined));
				assert.isFalse(config.exists(key));
			});

			it('should ignore undefined values in object form', function () {
				const key1 = testKey();
				const key2 = testKey();

				assert.isTrue(
					config.set({
						[key1]: 1,
						[key2]: undefined,
					})
				);

				assert.strictEqual(config.get(key1), 1);
				assert.isFalse(config.exists(key2));
			});

			it('should not overwrite built-in wg variables', function () {
				const original = config.get('wgSiteName');

				assert.isFalse(config.set('wgSiteName', 'Foo'));
				assert.strictEqual(config.get('wgSiteName'), original);
			});

			it('should not overwrite built-in wg variables in object form', function () {
				const key = testKey();
				const original = config.get('wgSiteName');

				assert.isTrue(
					config.set({
						[key]: 'value',
						wgSiteName: 'Foo',
					})
				);
				assert.strictEqual(config.get(key), 'value');
				assert.strictEqual(config.get('wgSiteName'), original);
			});

			it('should return false when all object entries are rejected', function () {
				assert.isFalse(
					config.set({
						wgSiteName: 'Foo',
						wgVersion: '999999.0.0',
					})
				);
			});

			it('should return false for an empty object', function () {
				assert.isFalse(config.set({}));
			});

		});
	});
}