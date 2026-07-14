import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import semver from 'semver';
import rootDir from './root-dir.js';

const lockFilePath = resolve(rootDir, 'package-lock.json');

if (!existsSync(lockFilePath)) {
	console.error('Cannot find package-lock.json.');
	process.exit(1);
}

/** @type {{packages?: Record<string, {dev?: boolean, engines?: {node?: string}}>} } */
const lockFile = JSON.parse(readFileSync(lockFilePath, 'utf8'));

/** @type {{path: string, range: string}[]} */
const ranges = [];

/** @type {semver.SemVer[]} */
const candidates = [];

for (const [path, pkg] of Object.entries(lockFile.packages ?? {})) {
	if (path === '') continue;
	if (pkg.dev) continue;

	const range = pkg.engines?.node;
	if (!range) continue;

	ranges.push({ path, range });

	const min = semver.minVersion(range);
	if (min) {
		candidates.push(min);
	}
}

if (!ranges.length) {
	console.log('No engines.node found.');
	process.exit(0);
}

// Remove duplicates
const uniqueCandidates = Array.from(
	new Map(candidates.map(v => [v.version, v])).values()
).sort(semver.compare);

const required = uniqueCandidates.find((candidate) => {
	return ranges.every(({ range }) => semver.satisfies(candidate, range));
});
if (!required) {
	console.error('No Node.js version satisfies all dependency engine requirements.');

	for (const { path, range } of ranges) {
		console.error(`${path}: ${range}`);
	}

	process.exit(1);
}

console.log(`Minimum required Node.js: v${required.version}`);