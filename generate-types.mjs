import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildDir = resolve(__dirname, './dist/build'); // Path to emitted type files
const indexDtsPath = resolve(__dirname, './dist/index.d.ts'); // Output file
if (!existsSync(buildDir)) mkdirSync(buildDir);

const ignoredFiles = [
	'phpCharMap.d.ts'
];
const files = [
	'// Value exports',
	"export { Mwbot } from './build/Mwbot';",
	"export { MwbotError } from './build/MwbotError';",
	"export { MWBOT_VERSION } from './build/version';",
	'',
	'// Type exports'
];

// Read files in the build directory
readdirSync(buildDir).forEach((file) => {
	if (file.endsWith('.d.ts') && !ignoredFiles.includes(file)) {
		files.push(`export type * from './build/${file.replace('.d.ts', '')}';`);
	}
});

// Write to dist/index.d.ts
writeFileSync(indexDtsPath, files.join('\n'));

console.log('Generated dist/index.d.ts');
