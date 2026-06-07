import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dieWithUsage = () => {
	console.error('Usage: npm run test:testwiki -- {oauth2|oauth1|botpassword|anonymous}');
	process.exit(1);
};

const authMethod = process.argv[2];
if (!authMethod) {
	console.error('Error: Authentication method is required.');
	dieWithUsage();
}

let createdCredentialsFile = false;
const credsJson = resolve(__dirname, 'credentials.json');

switch (authMethod) {
	case 'oauth2':
	case 'oauth1':
	case 'botpassword':
	case 'anonymous': {
		if (existsSync(credsJson)) {
			// Use local data if running locally
			try {
				const credentials = JSON.parse(readFileSync(credsJson, 'utf-8'));
				if (
					typeof credentials !== 'object' ||
					credentials === null ||
					Array.isArray(credentials)
				) {
					throw new Error();
				}
			} catch {
				console.error('Error: Invalid credentials.json');
				process.exit(1);
			}
		} else {
			// Running on a remote machine: write credentials.json
			/**
			 * @param {string} name
			 * @param {Set<string>} missing
			 * @returns {string | undefined}
			 */
			const getEnvironmentVariable = (name, missing) => {
				const val = process.env[name];
				if (typeof val !== 'string') {
					missing.add(name);
				}
				return val;
			};
			const missingVars = new Set();
			/**
			 * @type {import('../../../dist/index.js').Credentials}
			 */
			const json = Object.create(null);

			switch (authMethod) {
				case 'oauth2':
					json.oAuth2AccessToken = getEnvironmentVariable('OAUTH2_ACCESS_TOKEN', missingVars);
					break;
				case 'oauth1':
					json.consumerToken = getEnvironmentVariable('OAUTH1A_CONSUMER_TOKEN', missingVars);
					json.consumerSecret = getEnvironmentVariable('OAUTH1A_CONSUMER_SECRET', missingVars);
					json.accessToken = getEnvironmentVariable('OAUTH1A_ACCESS_TOKEN', missingVars);
					json.accessSecret = getEnvironmentVariable('OAUTH1A_ACCESS_SECRET', missingVars);
					break;
				case 'botpassword':
					json.username = getEnvironmentVariable('BOT_USERNAME', missingVars);
					json.password = getEnvironmentVariable('BOT_PASSWORD', missingVars);
					break;
				case 'anonymous':
					json.anonymous = true;
					break;
			}

			if (missingVars.size) {
				console.error('Missing environment variable(s): ' + Array.from(missingVars).join(', '));
				process.exit(1);
			}
			writeFileSync(credsJson, JSON.stringify(json));
			createdCredentialsFile = true;
		}
		break;
	}
	default:
		console.error(`Error: Invalid authentication method: '${authMethod}'`);
		dieWithUsage();
}

const mochaPath = resolve(__dirname, '../../../node_modules/mocha/bin/mocha.js');
const testFile = join(__dirname, 'test.js');
let exitCode = 1;

try {
	const result = spawnSync(
		process.execPath,
		[
			mochaPath,
			'--timeout',
			'30000',
			testFile
		],
		{
			stdio: 'inherit',
			env: {
				...process.env,
				AUTH_METHOD: authMethod,
			},
		}
	);
	exitCode = result.status ?? 1;
} finally {
	if (createdCredentialsFile) {
		rmSync(credsJson, { force: true });
	}
}

process.exit(exitCode);