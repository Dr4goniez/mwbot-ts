import fs from 'node:fs/promises';
import path from 'node:path';
import rootDir from './root-dir.js';

/**
 * Empties the contents of a given directory without deleting the directory itself.
 * @param {string} dirPath Relative to project root
 */
async function emptyDir(dirPath) {
	const absolutePath = path.resolve(rootDir, dirPath);

	try {
		// Create the directory if it doesn't exist
		await fs.mkdir(absolutePath, { recursive: true });

		const entries = await fs.readdir(absolutePath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(absolutePath, entry.name);

			if (entry.isDirectory()) {
				await fs.rm(fullPath, { recursive: true, force: true });
			} else {
				await fs.unlink(fullPath);
			}
		}

		console.log(`Emptied directory: ${absolutePath}`);
	} catch (err) {
		console.error(`Failed to empty directory: ${/** @type {any} */ (err).message}`);
		process.exit(1);
	}
}

const targetDir = process.argv[2];
if (!targetDir) {
	console.error('Usage: node empty-dir.mjs <directory-path>');
	process.exit(1);
}

await emptyDir(targetDir);