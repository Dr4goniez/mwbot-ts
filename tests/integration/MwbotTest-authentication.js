import { describe, it } from 'mocha';
import { assert } from 'chai';
import { getAuthCredentials } from './provider.js';
import OAuth from 'oauth-1.0a';

/**
 * @type {import('./provider-types.js').MwbotTestSuite}
 */
export function testMwbotAuthentication(getMwbot, testDomain, authMethod) {
	describe('Mwbot authentication', function () {

		it('should set appropriate credentials based on auth method', function () {
			const mwbot = getMwbot();
			// @ts-expect-error - Protected property
			const internalCredentials = mwbot.credentials;
			const creds = getAuthCredentials(testDomain, authMethod);

			switch (authMethod) {
				case 'oauth2':
					assert.isString(internalCredentials.oauth2);
					assert.strictEqual(internalCredentials.oauth2, creds.oAuth2AccessToken);
					break;
				case 'oauth1':
					assert.isObject(internalCredentials.oauth1);
					assert.instanceOf(internalCredentials.oauth1?.instance, OAuth);
					assert.isString(internalCredentials.oauth1?.accessToken);
					assert.strictEqual(internalCredentials.oauth1?.accessToken, creds.accessToken);
					assert.isString(internalCredentials.oauth1?.accessSecret);
					assert.strictEqual(internalCredentials.oauth1?.accessSecret, creds.accessSecret);
					break;
				case 'botpassword':
					assert.isObject(internalCredentials.user);
					assert.isString(internalCredentials.user?.username);
					assert.strictEqual(internalCredentials.user?.username, creds.username);
					assert.isString(internalCredentials.user?.password);
					assert.strictEqual(internalCredentials.user?.password, creds.password);
					break;
				case 'anonymous':
					assert.isTrue(internalCredentials.anonymous);
					break;
			}
		});

		it('should correctly identify if OAuth is configured', function () {
			const mwbot = getMwbot();
			// @ts-expect-error - Protected method
			assert.strictEqual(mwbot.usingOAuth(), authMethod === 'oauth2' || authMethod === 'oauth1');
		});

	});
}
