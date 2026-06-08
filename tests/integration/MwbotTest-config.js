import { describe, it } from 'mocha';
import { assert } from 'chai';
import { isIP } from 'node:net';
import { mock } from 'node:test';

/**
 * @type {import('./provider-types.js').MwbotTestSuite}
 */
export function testMwbotConfig(getMwbot, testDomain, authMethod) {
	describe('Mwbot config', () => run(getMwbot, testDomain, authMethod));
}

/**
 * @type {import('./provider-types.js').MwbotTestSuite}
 */
function run(getMwbot, testDomain, authMethod) {

	it('should contain functions', function () {
		const config = getMwbot().config;

		assert.isFunction(config.get);
		assert.isFunction(config.set);
		assert.isFunction(config.exists);
	});

	const isLocalWiki = testDomain === 'localwiki';
	const missingKey = 'missingKey';

	describe('get()', function () {
		it('should expose wgArticlePath', function () {
			const wgArticlePath = getMwbot().config.get('wgArticlePath');

			assert.isString(wgArticlePath);
			assert.match(wgArticlePath, /\/\$1$/);
		});

		it('should expose wgCaseSensitiveNamespaces', function () {
			const wgCaseSensitiveNamespaces = getMwbot().config.get('wgCaseSensitiveNamespaces');

			assert.isArray(wgCaseSensitiveNamespaces);

			if (wgCaseSensitiveNamespaces?.[0] !== undefined) {
				assert.isNumber(wgCaseSensitiveNamespaces[0]);
			}
		});

		it('should expose wgContentLanguage', function () {
			assert.strictEqual(getMwbot().config.get('wgContentLanguage'), 'en');
		});

		it('should expose wgContentNamespaces', function () {
			const wgContentNamespaces = getMwbot().config.get('wgContentNamespaces');

			assert.isArray(wgContentNamespaces);
			assert.include(wgContentNamespaces, 0);
		});

		it('should expose wgDBname', function () {
			assert.strictEqual(getMwbot().config.get('wgDBname'), isLocalWiki ? 'mwbot_ts' : 'testwiki');
		});

		it('should expose wgFormattedNamespaces', function () {
			assert.deepOwnInclude(
				getMwbot().config.get('wgFormattedNamespaces'),
				{
					'-2': 'Media',
					'-1': 'Special',
					'0': '',
					'1': 'Talk',
					'2': 'User',
					'3': 'User talk',
					'4': 'Wikipedia',
					'5': 'Wikipedia talk',
					'6': 'File',
					'7': 'File talk',
					'8': 'MediaWiki',
					'9': 'MediaWiki talk',
					'10': 'Template',
					'11': 'Template talk',
					'12': 'Help',
					'13': 'Help talk',
					'14': 'Category',
					'15': 'Category talk',
				}
			);
		});

		it('should expose wgLegalTitleChars', function () {
			assert.strictEqual(getMwbot().config.get('wgLegalTitleChars'), ' %!"$&\'()*,\\-.\\/0-9:;=?@A-Z\\\\^_`a-z~\\x80-\\xFF+');
		});

		it('should expose wgNamespaceIds', function () {
			assert.deepOwnInclude(
				getMwbot().config.get('wgNamespaceIds'),
				{
					media: -2,
					special: -1,
					'': 0,
					talk: 1,
					user: 2,
					user_talk: 3,
					wikipedia: 4,
					project: 4,
					wikipedia_talk: 5,
					project_talk: 5,
					file: 6,
					image: 6,
					file_talk: 7,
					image_talk: 7,
					mediawiki: 8,
					mediawiki_talk: 9,
					template: 10,
					template_talk: 11,
					help: 12,
					help_talk: 13,
					category: 14,
					category_talk: 15,
				}
			);
		});

		it('should expose wgScript', function () {
			assert.isString(getMwbot().config.get('wgScript'));
		});

		it('should expose wgScriptPath', function () {
			assert.isString(getMwbot().config.get('wgScriptPath'));
		});

		it('should expose wgServer', function () {
			assert.strictEqual(
				getMwbot().config.get('wgServer'),
				isLocalWiki ? 'http://localhost:8080' : '//test.wikipedia.org'
			);
		});

		it('should expose wgServerName', function () {
			assert.strictEqual(
				getMwbot().config.get('wgServerName'),
				isLocalWiki ? 'localhost' : 'test.wikipedia.org'
			);
		});

		it('should expose wgSiteName', function () {
			assert.strictEqual(getMwbot().config.get('wgSiteName'), 'Wikipedia');
		});

		it('should expose wgUserId', function () {
			const wgUserId = getMwbot().config.get('wgUserId');

			if (authMethod === 'anonymous') {
				assert.strictEqual(wgUserId, 0);
			} else if (isLocalWiki) {
				assert.strictEqual(wgUserId, 2);
			} else {
				assert.isNumber(wgUserId);
			}
		});

		it('should expose wgUserName', function () {
			const wgUserName = getMwbot().config.get('wgUserName');

			if (authMethod === 'anonymous') {
				assert.isNumber(isIP(wgUserName));
			} else if (isLocalWiki) {
				assert.strictEqual(wgUserName, 'Admin');
			} else {
				assert.isString(wgUserName);
			}
		});

		it('should expose wgUserRights', function () {
			const wgUserRights = getMwbot().config.get('wgUserRights');

			assert.isArray(wgUserRights);
			assert.isNotEmpty(wgUserRights);
		});

		it('should expose wgVersion', function () {
			const wgVersion = getMwbot().config.get('wgVersion');

			assert.isString(wgVersion);
			if (isLocalWiki) {
				assert.match(wgVersion, /^1\.\d{1,2}.\d{1,2}$/);
			} else {
				assert.match(wgVersion, /^1\.\d{1,2}.\d{1,2}-wmf\.\d{1,2}$/);
			}
		});

		it('should expose wgWikiID', function () {
			assert.strictEqual(getMwbot().config.get('wgWikiID'), isLocalWiki ? 'mwbot_ts' : 'testwiki');
		});

		it('should return null for a missing key by default', function () {
			assert.isNull(getMwbot().config.get(missingKey));
		});

		it('should return the fallback value for a missing key', function () {
			assert.strictEqual(getMwbot().config.get(missingKey, 'fallback'), 'fallback');
		});

		it('should treat explicit undefined fallback as null', function () {
			assert.isNull(getMwbot().config.get(missingKey, undefined));
		});

		it('should return an object when given an array of keys', function () {
			assert.deepEqual(
				getMwbot().config.get(['wgContentLanguage', 'wgSiteName']),
				{
					wgContentLanguage: 'en',
					wgSiteName: 'Wikipedia',
				}
			);
		});

		it('should apply fallback to missing keys in array selection', function () {
			assert.deepEqual(
				getMwbot().config.get(['wgContentLanguage', missingKey], 'missing'),
				{
					wgContentLanguage: 'en',
					[missingKey]: 'missing',
				}
			);
		});

		it('should return all config values when called without arguments', function () {
			const all = getMwbot().config.get();

			assert.isObject(all);
			assert.strictEqual(Object.keys(all).length, 18);
			assert.isString(all.wgArticlePath);
			assert.isArray(all.wgCaseSensitiveNamespaces);
			assert.propertyVal(all, 'wgContentLanguage', 'en');
			assert.isArray(all.wgContentNamespaces);
			assert.propertyVal(all, 'wgDBname', isLocalWiki ? 'mwbot_ts' : 'testwiki');
			assert.isObject(all.wgFormattedNamespaces);
			assert.isString(all.wgLegalTitleChars);
			assert.isObject(all.wgNamespaceIds);
			assert.isString(all.wgScript);
			assert.isString(all.wgScriptPath);
			assert.propertyVal(all, 'wgServer', isLocalWiki ? 'http://localhost:8080' : '//test.wikipedia.org');
			assert.propertyVal(all, 'wgServerName', isLocalWiki ? 'localhost' : 'test.wikipedia.org');
			assert.propertyVal(all, 'wgSiteName', 'Wikipedia');
			assert.isNumber(all.wgUserId);
			assert.isString(all.wgUserName);
			assert.isArray(all.wgUserRights);
			assert.isString(all.wgVersion);
			assert.propertyVal(all, 'wgWikiID', isLocalWiki ? 'mwbot_ts' : 'testwiki');
		});

		it('should return a deep copy', function () {
			const config = getMwbot().config;
			const all = config.get();

			all.wgNamespaceIds.foo = 123;

			assert.notProperty(config.get('wgNamespaceIds'), 'foo');
		});

	});

	describe('exists()', function () {
		it('should return true for an existing key', function () {
			assert.isTrue(getMwbot().config.exists('wgUserName'));
		});

		it('should return false for a missing key', function () {
			assert.isFalse(getMwbot().config.exists(missingKey));
		});

		it('should return true for keys with null values', function () {
			const config = getMwbot().config;
			const key = testKey();

			assert.isTrue(config.set(key, null));
			assert.isTrue(config.exists(key));
			assert.isNull(config.get(key));
		});

	});

	describe('set()', function () {
		it('should set a custom key', function () {
			const config = getMwbot().config;
			const key = testKey();

			assert.isTrue(config.set(key, 123));
			assert.strictEqual(config.get(key), 123);
		});

		it('should set multiple custom keys', function () {
			const config = getMwbot().config;
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
			const config = getMwbot().config;
			const key = testKey();

			assert.isFalse(config.set(key, undefined));
			assert.isFalse(config.exists(key));
		});

		it('should ignore undefined values in object form', function () {
			const config = getMwbot().config;
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
			const config = getMwbot().config;
			const original = config.get('wgSiteName');
			const logSpy = mock.method(console, 'warn');

			assert.isFalse(config.set('wgSiteName', 'Foo'));
			assert.strictEqual(config.get('wgSiteName'), original);
			assert.strictEqual(logSpy.mock.calls.length, 1);
		});

		it('should not overwrite built-in wg variables in object form', function () {
			const config = getMwbot().config;
			const key = testKey();
			const original = config.get('wgSiteName');
			const logSpy = mock.method(console, 'warn');

			assert.isTrue(
				config.set({
					[key]: 'value',
					wgSiteName: 'Foo',
				})
			);

			assert.strictEqual(config.get(key), 'value');
			assert.strictEqual(config.get('wgSiteName'), original);
			assert.strictEqual(logSpy.mock.calls.length, 1);
		});

		it('should return false when all object entries are rejected', function () {
			const logSpy = mock.method(console, 'warn');

			assert.isFalse(
				getMwbot().config.set({
					wgSiteName: 'Foo',
					wgVersion: '999999.0.0',
				})
			);
			assert.strictEqual(logSpy.mock.calls.length, 1);
		});

		it('should return false for an empty object', function () {
			assert.isFalse(getMwbot().config.set({}));
		});

	});

}

let counter = 0;

function testKey() {
	return `test_key_${counter++}`;
}