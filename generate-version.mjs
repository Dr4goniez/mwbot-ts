import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Read version from package.json
const pkgPath = resolve(__dirname, './package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const version = pkg.version;

// Generate version.ts content
const output = `export const MWBOT_VERSION = ${JSON.stringify(version)};`;

// Write to src/version.ts
const outputPath = resolve(__dirname, './src/version.ts');
writeFileSync(outputPath, output, 'utf-8');

console.log(`MWBOT_VERSION = ${version} written to src/version.ts`);