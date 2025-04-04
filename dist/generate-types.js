const fs = require('fs');
const path = require('path');

const buildDir = path.resolve(__dirname, '../dist/build'); // Path to emitted type files
const indexDtsPath = path.resolve(__dirname, '../dist/index.d.ts'); // Output file
const ignoredFiles = [
	'phpCharMap.d.ts'
];

// Read files in the build directory
const files = fs.readdirSync(buildDir).reduce((acc, file) => {
	if (file.endsWith('.d.ts') && !ignoredFiles.includes(file)) {
		acc.push(`export * from './build/${file.replace('.d.ts', '')}';`);
	}
	return acc;
}, []);

// Write to dist/index.d.ts
fs.writeFileSync(indexDtsPath, files.join('\n'));

console.log('Generated dist/index.d.ts');
