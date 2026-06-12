import { describe, it } from 'mocha';
import { assert } from 'chai';
import { isIP } from 'node:net';

/**
 * @type {import('./provider-types.js').MwbotTestSuite}
 */
export function testMwbotConfig(getMwbot, testDomain, authMethod) {
	describe('Mwbot config', function () {
		const isLocalWiki = testDomain === 'localwiki';

		it('should initialize wgArticlePath', function () {
			const wgArticlePath = getMwbot().config.get('wgArticlePath');

			assert.isString(wgArticlePath);
			assert.match(wgArticlePath, /\/\$1$/);
		});

		it('should initialize wgCaseSensitiveNamespaces', function () {
			const wgCaseSensitiveNamespaces = getMwbot().config.get('wgCaseSensitiveNamespaces');

			assert.isArray(wgCaseSensitiveNamespaces);

			if (wgCaseSensitiveNamespaces?.[0] !== undefined) {
				assert.isNumber(wgCaseSensitiveNamespaces[0]);
			}
		});

		it('should initialize wgContentLanguage', function () {
			assert.strictEqual(getMwbot().config.get('wgContentLanguage'), 'en');
		});

		it('should initialize wgContentNamespaces', function () {
			const wgContentNamespaces = getMwbot().config.get('wgContentNamespaces');

			assert.isArray(wgContentNamespaces);
			assert.include(wgContentNamespaces, 0);
		});

		it('should initialize wgDBname', function () {
			assert.strictEqual(getMwbot().config.get('wgDBname'), isLocalWiki ? 'mwbot_ts' : 'testwiki');
		});

		it('should initialize wgFormattedNamespaces', function () {
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

		it('should initialize wgLegalTitleChars', function () {
			assert.strictEqual(getMwbot().config.get('wgLegalTitleChars'), ' %!"$&\'()*,\\-.\\/0-9:;=?@A-Z\\\\^_`a-z~\\x80-\\xFF+');
		});

		it('should initialize wgNamespaceIds', function () {
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

		it('should initialize wgScript', function () {
			assert.isString(getMwbot().config.get('wgScript'));
		});

		it('should initialize wgScriptPath', function () {
			assert.isString(getMwbot().config.get('wgScriptPath'));
		});

		it('should initialize wgServer', function () {
			assert.strictEqual(
				getMwbot().config.get('wgServer'),
				isLocalWiki ? 'http://localhost:8080' : '//test.wikipedia.org'
			);
		});

		it('should initialize wgServerName', function () {
			assert.strictEqual(
				getMwbot().config.get('wgServerName'),
				isLocalWiki ? 'localhost' : 'test.wikipedia.org'
			);
		});

		it('should initialize wgSiteName', function () {
			assert.strictEqual(getMwbot().config.get('wgSiteName'), 'Wikipedia');
		});

		it('should initialize wgUserId', function () {
			const wgUserId = getMwbot().config.get('wgUserId');

			if (authMethod === 'anonymous') {
				assert.strictEqual(wgUserId, 0);
			} else if (isLocalWiki) {
				assert.strictEqual(wgUserId, 2);
			} else {
				assert.isNumber(wgUserId);
			}
		});

		it('should initialize wgUserName', function () {
			const wgUserName = getMwbot().config.get('wgUserName');

			if (authMethod === 'anonymous') {
				assert.isNumber(isIP(wgUserName));
			} else if (isLocalWiki) {
				assert.strictEqual(wgUserName, 'Admin');
			} else {
				assert.isString(wgUserName);
			}
		});

		it('should initialize wgUserRights', function () {
			const wgUserRights = getMwbot().config.get('wgUserRights');

			assert.isArray(wgUserRights);
			assert.isNotEmpty(wgUserRights);
		});

		it('should initialize wgVersion', function () {
			const wgVersion = getMwbot().config.get('wgVersion');

			assert.isString(wgVersion);
			if (isLocalWiki) {
				assert.match(wgVersion, /^1\.\d{1,2}.\d{1,2}$/);
			} else {
				assert.match(wgVersion, /^1\.\d{1,2}.\d{1,2}-wmf\.\d{1,2}$/);
			}
		});

		it('should initialize wgWikiID', function () {
			assert.strictEqual(getMwbot().config.get('wgWikiID'), isLocalWiki ? 'mwbot_ts' : 'testwiki');
		});

	});
}