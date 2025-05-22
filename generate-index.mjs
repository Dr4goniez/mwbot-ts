import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const buildDir = resolve(__dirname, './dist/build'); // Path to emitted type files
if (!existsSync(buildDir)) mkdirSync(buildDir);

/**
 * Mapping from a file name to exported object values.
 */
const exportMap = new Map([
	['./build/Mwbot', ['Mwbot']],
	['./build/MwbotError', ['MwbotError']],
	['./build/version', ['MWBOT_VERSION']],
]);
const valueLines = ['module.exports = {'];
const typeLines = ['// Value exports'];

for (const [file, values] of exportMap) {
	valueLines.push(`\t...require('${file}'),`);
	typeLines.push(`export { ${values.join(', ')} } from '${file}';`);
}

valueLines.push('};');
typeLines.push(
	'',
	'// Type exports'
);

// Read files in the build directory
const ignoredFiles = new Set([
	'phpCharMap.d.ts'
]);
readdirSync(buildDir).forEach((file) => {
	if (file.endsWith('.d.ts') && !ignoredFiles.has(file)) {
		typeLines.push(`export type * from './build/${file.replace('.d.ts', '')}';`);
	}
});

// Write to dist/index.js
const indexJsPath = resolve(__dirname, './dist/index.js');
writeFileSync(indexJsPath, valueLines.join('\n'));

// Write to dist/index.d.ts
const indexDtsPath = resolve(__dirname, './dist/index.d.ts');
writeFileSync(indexDtsPath, typeLines.join('\n'));

console.log('Generated dist/index.js and dist/index.d.ts');