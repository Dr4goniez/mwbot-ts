import { getApiUrl, getAuthCredentials, getAuthMethod } from '../../integration/provider.js';

/**
 * @typedef {import('../../integration/provider-types.js').TestDomain} TestDomain
 * @typedef {import('../../../dist/index.js').Credentials} Credentials
 */
/**
 * @typedef {object} BaseInitOptions
 * @property {string} apiUrl
 * @property {Credentials} credentials
 */

/**
 * @type {TestDomain}
 */
const testDomain = 'localwiki';

/**
 * Throws if the localwiki server is unavailable.
 *
 * @returns {Promise<void>}
 */
async function ensureLocalwikiRunning() {
	try {
		const res = await fetch(getApiUrl(testDomain), {
			method: 'HEAD',
		});

		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
	} catch {
		console.error(
			'Cannot connect to http://localhost:8080/api.php.\n\n' +
			'Start the localwiki test environment first:\n\n' +
			'  npm run test:setup -- {oauth2|oauth1|botpassword|anonymous}'
		);
		process.exit(1);
	}
}

/**
 * @returns {Promise<BaseInitOptions>}
 */
export async function getLocalwikiInitOptions() {
	await ensureLocalwikiRunning();

	const authMethod = getAuthMethod(testDomain);
	return {
		apiUrl: getApiUrl(testDomain),
		credentials: getAuthCredentials(testDomain, authMethod),
	};
}