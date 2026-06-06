import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { Mwbot } from '../../../dist/index.js';
import dotenv from 'dotenv';

dotenv.config({
	path: new URL('./.env', import.meta.url)
});

const AUTH_CREDENTIALS = (() => {
	const AUTH_CREDENTIALS = process.env.AUTH_CREDENTIALS;
	if (typeof AUTH_CREDENTIALS === 'string') {
		return /** @type {import('../../../dist/index.js').Credentials} */ (JSON.parse(AUTH_CREDENTIALS));
	}
	throw new Error('AUTH_CREDENTIALS is not set in environment variables.');
})();
const AUTH_METHOD = process.env.AUTH_METHOD || 'unknown';

describe(`Mwbot via ${AUTH_METHOD} authorization`, function () {

	/** @type {Mwbot} */
	let mwbot;

	before(async function () {
		mwbot = await Mwbot.init({
			apiUrl: 'http://localhost:8080/api.php',
			credentials: AUTH_CREDENTIALS,
		});
	});

	it('should authenticate successfully', function () {
		assert.instanceOf(mwbot, /** @type {any} */ (Mwbot));
	});

});