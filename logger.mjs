/**
 * @module logger
 *
 * Logs the stdout and stderr output of a specified script to a timestamped file in the `logs/` directory.
 *
 * This module determines whether to run the script using `node` or `ts-node` based on its file extension.
 * It supports `.ts` (TypeScript) and `.js` (JavaScript) files. The resulting log file is named using the
 * current date and time in `YYYYMMDDHHMMSS` format, optionally suffixed with a custom tag.
 *
 * Example usage (from package.json scripts):
 *   "start": "node logger.mjs dist/entry.js"
 *   "test-log": "node logger.mjs src/test.ts _test"
 *
 * Usage:
 *   node logger.mjs <scriptPath> [logSuffix]
 *
 * Parameters:
 *   scriptPath  - Path to the script to execute (.ts or .js)
 *   logSuffix   - Optional suffix to append to the log filename (e.g., '_test')
 *
 * Output:
 *   A file will be created in ./logs/, such as: logs/20250501163045_test.txt
 *
 * Requirements:
 *   - For `.ts` files, `ts-node` must be available in the current environment.
 *   - This script must be executed in a Node.js environment that supports ES Modules (ESM).
 *
 * Notes:
 *   - This script assumes the `logs/` directory is writable and will create it if it doesn't exist.
 *   - Errors thrown by the target script will be captured in the log file.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const [,, scriptPath, logSuffix = ''] = process.argv;

if (!scriptPath) {
	console.error('Usage: node logger.js <scriptPath> [logSuffix]');
	process.exit(1);
}

// Create timestamp like YYYYMMDDHHMMSS
const date = new Date().toISOString()
	.replace(/\.\d+Z$/, '')
	.replace(/[-T:]/g, '');

const logDir = resolve(__dirname, './logs');
if (!existsSync(logDir)) mkdirSync(logDir);

const logFile = join(logDir, `${date}${logSuffix}.txt`);
const ext = extname(scriptPath);

// Choose ts-node or node
const runner = ext === '.ts' ? 'ts-node' : 'node';
const command = `${runner} ${scriptPath} > "${logFile}" 2>&1`;

execSync(command, {stdio: 'inherit'});