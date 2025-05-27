import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Empties the contents of a given directory without deleting the directory itself.
 * @param {string} dirPath The absolute or relative path to the directory.
 */
async function emptyDir(dirPath) {
	const absolutePath = path.resolve(__dirname, dirPath);
	try {
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
		console.error(`Failed to empty directory: ${err.message}`);
		process.exit(1);
	}
}

// Allow directory path from command line argument
const targetDir = process.argv[2];
if (!targetDir) {
	console.error('Usage: node empty-dir.mjs <directory-path>');
	process.exit(1);
}

await emptyDir(targetDir);