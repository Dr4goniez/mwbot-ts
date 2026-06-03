import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { Mwbot } from '../../../src/Mwbot';

describe('Mwbot with BotPassword', function () {

	let mwbot: Mwbot;

	before(async function () {
		mwbot = await Mwbot.init({
			apiUrl: 'http://localhost:8080/api.php',
			credentials: {
				username: 'Admin@adminbot',
				password: '12345678901234567890123456789012',
			},
		});
	});

	it('should authenticate successfully', function () {
		assert.isTrue(mwbot instanceof Mwbot);
	});

});
