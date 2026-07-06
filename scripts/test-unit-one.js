import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import rootDir from './root-dir.mjs';

const name = process.argv[2];
if (!name) {
	console.error('Usage: npm run test:unit-one -- <TestName>');
	process.exit(1);
}

const mochaPath = resolve(
	rootDir,
	'node_modules/mocha/bin/mocha.js'
);
const testFile = resolve(
	rootDir,
	`tests/unit/${name}Test.js`
);

const result = spawnSync(
	process.execPath,
	[mochaPath, testFile],
	{
		stdio: 'inherit',
	}
);

process.exit(result.status ?? 1);