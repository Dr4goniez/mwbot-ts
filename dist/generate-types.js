const fs = require('fs');
const path = require('path');

const buildDir = path.resolve(__dirname, '../dist/build'); // Path to emitted type files
const indexDtsPath = path.resolve(__dirname, '../dist/index.d.ts'); // Output file
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
fs.readdirSync(buildDir).forEach((file) => {
	if (file.endsWith('.d.ts') && !ignoredFiles.includes(file)) {
		files.push(`export type * from './build/${file.replace('.d.ts', '')}';`);
	}
});

// Write to dist/index.d.ts
fs.writeFileSync(indexDtsPath, files.join('\n'));

console.log('Generated dist/index.d.ts');
