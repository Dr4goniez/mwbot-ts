import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { resolve } from 'node:path';
import rootDir from './root-dir.mjs';

const buildDir = resolve(rootDir, 'dist/build');
if (!existsSync(buildDir)) {
	mkdirSync(buildDir);
}

/**
 * Mapping from a file name to exported object values.
 */
const exportMap = new Map([
	['./build/Mwbot', ['Mwbot']],
	['./build/MwbotError', ['MwbotError']],
	['./build/version', ['MWBOT_VERSION']],
]);
const valueLines = [];
const typeLines = ['// Value exports'];

for (const [file, values] of exportMap) {
	valueLines.push(`export * from '${file}.js';`);
	typeLines.push(`export { ${values.join(', ')} } from '${file}';`);
}

typeLines.push(
	'',
	'// Type exports'
);

// Read files in the build directory
const ignoredFiles = new Set([
	'Logger.d.ts',
	'phpCharMap.d.ts',
]);
for (const file of readdirSync(buildDir)) {
	if (file.endsWith('.d.ts') && !ignoredFiles.has(file)) {
		typeLines.push(`export * from './build/${file.replace(/\.d\.ts$/, '')}';`);
	}
}

// Write to dist/index.js
const indexJsPath = resolve(rootDir, 'dist/index.js');
writeFileSync(indexJsPath, valueLines.join('\n'));

// Write to dist/index.d.ts
const indexDtsPath = resolve(rootDir, 'dist/index.d.ts');
writeFileSync(indexDtsPath, typeLines.join('\n'));

console.log('Generated dist/index.js and dist/index.d.ts');