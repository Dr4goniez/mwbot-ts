import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { Mwbot } from '../../../dist/index.js';
import { getApiUrl, getAuthCredentials, getAuthMethod } from '../provider.js';

const domain = 'testwiki';
const AUTH_METHOD = getAuthMethod(domain);

describe(`Mwbot via ${AUTH_METHOD} authentication`, function () {

	const credentials = getAuthCredentials(domain, AUTH_METHOD);

	/** @type {Mwbot} */
	let mwbot;

	before(async function () {
		try {
			mwbot = await Mwbot.init({
				apiUrl: getApiUrl(domain),
				credentials,
			});
		} catch (e) {
			console.error('Failed to initialize Mwbot');
			throw e;
		}
	});

	it('should authenticate successfully', function () {
		assert.instanceOf(mwbot, /** @type {any} */ (Mwbot));
	});

});