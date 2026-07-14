/**
 * Copy this file to "./localwiki.js" and run the following commands
 * to execute arbitrary tests against the localwiki server.
 *
 * npm run test:setup -- {oauth2|oauth1|botpassword|anonymous}
 * npm run test:oneoff-localwiki
 */

import { Mwbot } from '../../dist/build/Mwbot.js';
import { getLocalwikiInitOptions } from './providers/localwiki-provider.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mwbot = await Mwbot.init({
	...(await getLocalwikiInitOptions()),
	loggerOptions: {
		outputErrors: true,
	},
});