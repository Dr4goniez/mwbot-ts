/**
 * Copy this file to "./testwiki.js" and run the following command
 * to execute arbitrary tests against the testwiki server.
 *
 * npm run test:oneoff-testwiki -- {oauth2|oauth1|botpassword|anonymous}
 *
 * Requirements:
 * - "tests/integration/testwiki/credentials.json" must exist.
 */

import { Mwbot } from '../../dist/build/Mwbot.js';
import { redirectConsoleToFile } from './internal/logging.js';
import { getTestwikiInitOptions } from './internal/testwiki-provider.js';

// Comment out this line to output console messages to the terminal
redirectConsoleToFile();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mwbot = await Mwbot.init({
	...getTestwikiInitOptions(),
	loggerOptions: {
		outputErrors: true,
	},
});
