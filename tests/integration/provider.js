import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {import('./provider-types.js').TestDomain} TestDomain
 */
/**
 * @typedef {import('./provider-types.js').AuthMethod} AuthMethod
 */
/**
 * @param {TestDomain} testDomain
 * @param {AuthMethod} authMethod
 * @returns {import('../../dist/index.js').Credentials}
 */
export function getAuthCredentials(testDomain, authMethod) {
	const credsJson = resolve(__dirname, testDomain, 'credentials.json');

	if (!existsSync(credsJson)) {
		throw new Error(`${credsJson} does not exist`);
	}

	const credentials = JSON.parse(readFileSync(credsJson, 'utf-8'));
	if (
		typeof credentials !== 'object' ||
		credentials === null ||
		Array.isArray(credentials)
	) {
		throw new Error('Invalid credentials.json');
	}

	/**
	 * @typedef {import('../../dist/index.js').Credentials} Credentials
	 */
	/**
	 * @type {Exclude<keyof Credentials, 'anonymous'>[]}
	 */
	const requiredKeys = [];

	switch (authMethod) {
		case 'oauth2':
			requiredKeys.push('oAuth2AccessToken');
			break;
		case 'oauth1':
			requiredKeys.push('consumerToken', 'consumerSecret', 'accessToken', 'accessSecret');
			break;
		case 'botpassword':
			requiredKeys.push('username', 'password');
			break;
		case 'anonymous':
			return { anonymous: true };
	}

	/**
	 * @type {Credentials}
	 */
	const json = Object.create(null);
	/**
	 * @type {Set<Exclude<keyof Credentials, 'anonymous'>>}
	 */
	const missingKeys = new Set();

	for (const key of requiredKeys) {
		const value = credentials[key];
		if (typeof value !== 'string' || value === '') {
			missingKeys.add(key);
			continue;
		}
		json[key] = value;
	}

	if (missingKeys.size) {
		throw new Error('Authentication data not found: ' + Array.from(missingKeys).join(', '));
	}

	return json;
}

/**
 * @param {TestDomain} testDomain
 * @returns {AuthMethod}
 */
export function getAuthMethod(testDomain) {
	if (testDomain === 'localwiki') {
		dotenv.config({
			path: resolve(__dirname, testDomain, '.env'),
		});
	}

	const authMethod = process.env.AUTH_METHOD;
	switch (authMethod) {
		case 'oauth2':
		case 'oauth1':
		case 'botpassword':
		case 'anonymous':
			return authMethod;
		default:
			throw new Error('Invalid AUTH_METHOD: ' + String(authMethod));
	}
}

/**
 * @param {TestDomain} testDomain
 * @returns {string}
 */
export function getApiUrl(testDomain) {
	switch (testDomain) {
		case 'localwiki': return 'http://localhost:8080/api.php';
		case 'testwiki': return 'https://test.wikipedia.org/w/api.php';
		default: throw new Error('Invalid test domain: ' + String(testDomain));
	}
}