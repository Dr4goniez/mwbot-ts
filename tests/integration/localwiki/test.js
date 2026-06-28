import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { Mwbot } from '../../../dist/index.js';
import { getApiUrl, getAuthCredentials, getAuthMethod } from '../provider.js';
import { testMwbotAuthentication } from '../MwbotTest-authentication.js';
import { testMwbotConfig } from '../MwbotTest-config.js';
import { testMwbotReadRequests } from '../MwbotTest-request-read.js';
import { testMwbotWriteRequests } from '../MwbotTest-request-write.js';
import { testMwbotLocalEdit } from './MwbotTest-local-edit.js';
import { testMwbotLocalActions } from './MwbotTest-local-actions.js';

const domain = 'localwiki';
const authMethod = getAuthMethod(domain);

describe(`Mwbot via ${authMethod} authentication`, function () {

	const credentials = getAuthCredentials(domain, authMethod);

	/** @type {Mwbot} */
	let mwbot;

	before(async function () {
		try {
			mwbot = await Mwbot.init({
				apiUrl: getApiUrl(domain),
				credentials,
				interval: 0,
				intervalActions: [],
				loggerOptions: {
					suppressInfo: true,
					suppressWarnings: true,
				},
			});
		} catch (e) {
			console.error('Failed to initialize Mwbot');
			throw e;
		}
	});

	it('should authenticate successfully', function () {
		assert.instanceOf(mwbot, /** @type {any} */ (Mwbot));
	});

	testMwbotAuthentication(() => mwbot, domain, authMethod);
	testMwbotConfig(() => mwbot, domain, authMethod);
	testMwbotReadRequests(() => mwbot, domain, authMethod);
	testMwbotWriteRequests(() => mwbot, domain, authMethod);

	testMwbotLocalEdit(() => mwbot, domain, authMethod);
	testMwbotLocalActions(() => mwbot, domain, authMethod);
});