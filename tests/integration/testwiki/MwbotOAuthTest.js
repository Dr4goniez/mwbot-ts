import { describe, it } from 'mocha';
import { assert } from 'chai';
import { Mwbot } from '../../../dist/index.js';

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({
	path: path.resolve(__dirname, '../../docker/.env')
});

describe('OAuth authentication', function () {

	const {
		OAUTH_API,
		OAUTH2_ACCESS_TOKEN,
		OAUTH1A_CONSUMER_TOKEN,
		OAUTH1A_CONSUMER_SECRET,
		OAUTH1A_ACCESS_TOKEN,
		OAUTH1A_ACCESS_SECRET,
	} = /** @type {Record<string, string>} */ (process.env);

	// Ensure the required environment variables are defined
	const requiredVars = {
		OAUTH_API,
		OAUTH2_ACCESS_TOKEN,
		OAUTH1A_CONSUMER_TOKEN,
		OAUTH1A_CONSUMER_SECRET,
		OAUTH1A_ACCESS_TOKEN,
		OAUTH1A_ACCESS_SECRET,
	};

	let variableMissing = false;
	for (const [name, value] of Object.entries(requiredVars)) {
		if (!value) {
			variableMissing = true;
		}
		it(`${name} should be defined`, function () {
			assert.isString(value);
			assert.isNotEmpty(value);
		});
	}

	if (variableMissing) {
		console.warn('Environment variables are missing. Skipping remaining tests.');
		return;
	}

	it('authenticates with OAuth 2.0', async function () {
		const mwbot = await Mwbot.init({
			apiUrl: OAUTH_API,
			credentials: {
				oAuth2AccessToken: OAUTH2_ACCESS_TOKEN,
			},
		});

		assert.isTrue(mwbot instanceof Mwbot);
	});

	it('authenticates with OAuth 1.0a', async function () {
		const mwbot = await Mwbot.init({
			apiUrl: OAUTH_API,
			credentials: {
				consumerToken: OAUTH1A_CONSUMER_TOKEN,
				consumerSecret: OAUTH1A_CONSUMER_SECRET,
				accessToken: OAUTH1A_ACCESS_TOKEN,
				accessSecret: OAUTH1A_ACCESS_SECRET,
			},
		});

		assert.isTrue(mwbot instanceof Mwbot);
	});

});