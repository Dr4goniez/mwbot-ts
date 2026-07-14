import { Console } from 'node:console';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import rootDir from '../../scripts/root-dir.js';
import { disableLoggerColors } from '../../dist/build/internal/Logger.js';

const outputDir = resolve(rootDir, 'logs');
if (!existsSync(outputDir)) {
	mkdirSync(outputDir);
}

/**
 * Redirects all subsequent console output to a timestamped log file.
 *
 * This helper is intended for one-off integration tests where writing logs to
 * a file is more convenient than printing them to the terminal. Call it near
 * the beginning of the test script before any output is produced.
 */
export function redirectConsoleToFile() {
	const file = new Date()
		.toISOString()
		.replace(/[:.]/g, '-')
		+ '.log';
	const outputPath = resolve(outputDir, file);

	disableLoggerColors();

	global.console = new Console({
		stdout: createWriteStream(outputPath),
		stderr: createWriteStream(outputPath),
	});
}