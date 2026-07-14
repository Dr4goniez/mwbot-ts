import { getApiUrl, getAuthCredentials } from '../../integration/provider.js';

/**
 * @typedef {import('../../integration/provider-types.js').TestDomain} TestDomain
 * @typedef {import('../../../dist/index.js').Credentials} Credentials
 */
/**
 * @typedef {object} BaseInitOptions
 * @property {string} apiUrl
 * @property {Credentials} credentials
 */

const testDomain = 'testwiki';

/**
 * @returns {never}
 */
function dieWithUsage() {
	console.error(`Usage: npm run test:oneoff-${testDomain} -- {oauth2|oauth1|botpassword|anonymous}`);
	process.exit(1);
}

/**
 * @returns {Credentials}
 */
function getCredentials() {
	const authMethod = process.argv[2];
	if (!authMethod) {
		console.error('Error: Authentication method is required.');
		dieWithUsage();
	}

	switch (authMethod) {
		case 'oauth2':
		case 'oauth1':
		case 'botpassword':
		case 'anonymous':
			break;
		default:
			console.error(`Error: Invalid authentication method: '${authMethod}'`);
			dieWithUsage();
	}

	return getAuthCredentials(testDomain, authMethod);
}

/**
 * @returns {BaseInitOptions}
 */
export function getTestwikiInitOptions() {
	return {
		apiUrl: getApiUrl(testDomain),
		credentials: getCredentials(),
	};
}