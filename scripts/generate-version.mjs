import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import rootDir from './root-dir.mjs';

// Read version from package.json
const packageJson = resolve(rootDir, 'package.json');
const pkg = JSON.parse(readFileSync(packageJson, 'utf-8'));
const version = pkg.version;

// Generate version.ts content
const output = `export const MWBOT_VERSION = ${JSON.stringify(version)};`;

// Write to src/version.ts
const outputPath = resolve(rootDir, 'src/version.ts');
writeFileSync(outputPath, output, 'utf-8');

console.log(`MWBOT_VERSION = ${version} written to src/version.ts`);