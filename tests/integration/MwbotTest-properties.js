import { Mwbot, MWBOT_VERSION } from '../../dist/index.js';
import { it } from 'mocha';
import { assert } from 'chai';
import { getApiUrl, getAuthCredentials } from './provider.js';
import OAuth from 'oauth-1.0a';
import { CookieJar } from 'tough-cookie';
import * as http from 'http';
import * as https from 'https';

/**
 * @param {() => Mwbot} getMwbot
 * @param {'localwiki' | 'testwiki'} testDomain
 * @param {'oauth2' | 'oauth1' | 'botpassword' | 'anonymous'} authMethod
 * @returns {void}
 */
export function testMwbotProperties(getMwbot, testDomain, authMethod) {

	it('should initialize credentials correctly', function () {
		const mwbot = getMwbot();

		// @ts-expect-error - Protected property
		const prop_creds = mwbot.credentials;
		assert.isObject(prop_creds);
		const creds = getAuthCredentials(testDomain, authMethod);

		// @ts-expect-error - Protected method
		const isAnonymous = mwbot.isAnonymous();
		// @ts-expect-error - Protected property
		const jar = mwbot.jar;

		/**
		 * @param {boolean} shouldExist
		 */
		const assertAgents = (shouldExist) => {
			// @ts-expect-error - Protected property
			const agents = mwbot.agents;

			if (shouldExist) {
				assert.isObject(agents);
				assert.instanceOf(agents?.http, http.Agent);
				assert.instanceOf(agents?.https, https.Agent);
			} else {
				assert.notExists(agents);
			}
		};

		switch (authMethod) {
			case 'oauth2':
				assert.isString(prop_creds.oauth2);
				assert.strictEqual(prop_creds.oauth2, creds.oAuth2AccessToken);
				assert.isFalse(isAnonymous);
				assert.notExists(jar);
				assertAgents(true);
				break;
			case 'oauth1':
				assert.isObject(prop_creds.oauth1);
				assert.instanceOf(prop_creds.oauth1?.instance, OAuth);
				assert.isString(prop_creds.oauth1?.accessToken);
				assert.strictEqual(prop_creds.oauth1?.accessToken, creds.accessToken);
				assert.isString(prop_creds.oauth1?.accessSecret);
				assert.strictEqual(prop_creds.oauth1?.accessSecret, creds.accessSecret);
				assert.isFalse(isAnonymous);
				assert.notExists(jar);
				assertAgents(true);
				break;
			case 'botpassword':
				assert.isObject(prop_creds.user);
				assert.isString(prop_creds.user?.username);
				assert.strictEqual(prop_creds.user?.username, creds.username);
				assert.isString(prop_creds.user?.password);
				assert.strictEqual(prop_creds.user?.password, creds.password);
				assert.isFalse(isAnonymous);
				assert.instanceOf(jar, CookieJar);
				assertAgents(false);
				break;
			case 'anonymous':
				assert.isTrue(prop_creds.anonymous);
				assert.isTrue(isAnonymous);
				assert.instanceOf(jar, CookieJar);
				assertAgents(false);
		}
	});

	it('should initialize Axios client', function () {
		// @ts-expect-error - Protected property
		const axios = getMwbot().axios;

		assert.isFunction(axios?.request);
	});

	it('should preserve user request configuration', function () {
		const mwbot = getMwbot();
		const userMwbotOptions = mwbot.userMwbotOptions;
		const userRequestOptions = mwbot.userRequestOptions;

		const apiUrl = getApiUrl(testDomain);
		assert.strictEqual(userMwbotOptions.apiUrl, apiUrl);
		assert.strictEqual(userRequestOptions.url, apiUrl);
	});

	it('should initialize internal state', function () {
		const mwbot = getMwbot();

		// @ts-expect-error - Protected property
		const abortions = mwbot.abortions;
		assert.instanceOf(abortions, Set);
		assert.isEmpty(abortions);

		// @ts-expect-error - Protected property
		assert.deepEqual(mwbot.tokens, {});

		// @ts-expect-error - Protected property
		assert.isNull(mwbot.lastRequestTime);
	});

	it('should expose request defaults', function () {
		assert.deepEqual(Mwbot.defaultRequestOptions, {
			method: 'GET',
			headers: {
				'User-Agent': `mwbot-ts/${MWBOT_VERSION} (https://github.com/Dr4goniez/mwbot-ts)`,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept-Encoding': 'gzip'
			},
			params: {
				action: 'query',
				format: 'json',
				formatversion: '2',
				maxlag: 5
			},
			timeout: 60 * 1000, // 60 seconds
			responseType: 'json',
			responseEncoding: 'utf8'
		});
	});

	it('should expose default interval actions', function () {
		assert.deepEqual(
			// @ts-expect-error - Protected getter
			Mwbot.defaultIntervalActions,
			['edit', 'move', 'upload']
		);
	});

	it('should expose utility modules', function () {
		assert.exists(Mwbot.Util);
		assert.exists(Mwbot.String);
	});

	it('should expose populated site information', function () {
		const mwbot = getMwbot();

		// @ts-expect-error - Protected property
		const info = mwbot._info;

		assert.isObject(info);
		assert.isNotEmpty(info);

		assert.isObject(mwbot.info);
		assert.isNotEmpty(mwbot.info);

		assert.deepEqual(info, mwbot.info);

		assert.isArray(info.functionhooks);
		assert.isNotEmpty(info.functionhooks);

		assert.isObject(info.general);
		assert.isNotEmpty(info.general);

		assert.isArray(info.magicwords);
		assert.isNotEmpty(info.magicwords);

		assert.isArray(info.interwikimap);
		assert.isNotEmpty(info.interwikimap);

		assert.isObject(info.namespaces);
		assert.isNotEmpty(info.namespaces);

		assert.isArray(info.namespacealiases);
		assert.isNotEmpty(info.namespacealiases);

		assert.isObject(info.user);
		assert.isNotEmpty(info.user);
	});

	it('should expose parser classes', function () {
		const mwbot = getMwbot();

		// @ts-expect-error - Protected property
		assert.strictEqual(mwbot._Title.name, 'Title');
		assert.strictEqual(mwbot.Title.name, 'Title');

		// @ts-expect-error - Protected property
		assert.strictEqual(mwbot._Template.name, 'Template');
		assert.strictEqual(mwbot.Template.name, 'Template');

		// @ts-expect-error - Protected property
		assert.strictEqual(mwbot._ParserFunction.name, 'ParserFunction');
		assert.strictEqual(mwbot.ParserFunction.name, 'ParserFunction');

		// @ts-expect-error - Protected property
		assert.strictEqual(mwbot._Wikilink.name, 'Wikilink');
		assert.strictEqual(mwbot.Wikilink.name, 'Wikilink');

		// @ts-expect-error - Protected property
		assert.strictEqual(mwbot._FileWikilink.name, 'FileWikilink');
		assert.strictEqual(mwbot.FileWikilink.name, 'FileWikilink');

		// @ts-expect-error - Protected property
		assert.strictEqual(mwbot._RawWikilink.name, 'RawWikilink');
		assert.strictEqual(mwbot.RawWikilink.name, 'RawWikilink');

		// @ts-expect-error - Protected property
		assert.strictEqual(mwbot._Wikitext.name, 'Wikitext');
		assert.strictEqual(mwbot.Wikitext.name, 'Wikitext');
	});

}