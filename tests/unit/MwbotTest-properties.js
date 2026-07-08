import { describe, it, before } from 'mocha';
import { assert } from 'chai';
import { Mwbot, MWBOT_VERSION } from '../../dist/index.js';
import { Logger } from '../../dist/build/internal/Logger.js';
import { getTestMwbot } from './MwbotTest-fixtures.js';
import { CookieJar } from 'tough-cookie';

export function testMwbotProperties() {
	describe('Properties and default setting generators', function () {
		describe('getDefaultRequestOptions()', function () {
			it('should match defined defaults', function () {
				assert.deepEqual(Mwbot.getDefaultRequestOptions(), {
					method: 'GET',
					headers: {
						'User-Agent': `mwbot-ts/${MWBOT_VERSION} (https://github.com/Dr4goniez/mwbot-ts)`,
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept-Encoding': 'gzip',
					},
					params: {
						action: 'query',
						format: 'json',
						formatversion: '2',
						maxlag: 5,
					},
					timeout: 60 * 1000, // 60 seconds
					responseType: 'json',
					responseEncoding: 'utf8',
				});
			});
		});

		describe('getDefaultIntervalActions()', function () {
			it('should match defined defaults', function () {
				assert.deepEqual(
					// @ts-expect-error - Protected method
					Mwbot.getDefaultIntervalActions(),
					['edit', 'move', 'upload']
				);
			});
		});

		describe('Static modules', function () {
			it('should expose Util module', function () {
				assert.exists(Mwbot.Util);
			});

			it('should expose String module', function () {
				assert.exists(Mwbot.String);
			});
		});

		describe('Instance properties', function () {
			/**
			 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
			 * @readonly
			 */
			let mwbot;

			before(async function () {
				mwbot = await getTestMwbot('named');
			});

			it('should expose the base credentials object', function () {
				// @ts-expect-error - Protected property
				assert.isObject(mwbot.credentials);
			});

			it('should expose Axios client', function () {
				// @ts-expect-error - Protected property
				assert.isFunction(mwbot.axios?.request);
			});

			it('should expose CookieJar', function () {
				// @ts-expect-error - Protected property
				assert.instanceOf(mwbot.jar, CookieJar);
			});

			it('should expose abort controllers as an empty Set', function () {
				// @ts-expect-error - Protected property
				const abortions = mwbot.abortions;

				assert.instanceOf(abortions, Set);
				assert.isEmpty(abortions);
			});

			it('should expose tokens as an empty object', function () {
				// @ts-expect-error - Protected property
				assert.deepEqual(mwbot.tokens, Object.create(null));
			});

			it('should expose lastRequestTime as null', function () {
				// @ts-expect-error - Protected property
				assert.isNull(mwbot.lastRequestTime);
			});

			it('should expose Logger', function () {
				// @ts-expect-error - Protected property
				assert.instanceOf(mwbot.logger, Logger);
			});
		});

		describe('info', function () {
			/**
			 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
			 * @readonly
			 */
			let mwbot;

			before(async function () {
				mwbot = await getTestMwbot('named');
			});

			it('should mirror internal _info state to public info getter', function () {
				// @ts-expect-error - Protected property
				const _info = mwbot._info;

				assert.isObject(_info);
				assert.isNotEmpty(_info);
				assert.isObject(mwbot.info);
				assert.isNotEmpty(mwbot.info);
				assert.deepEqual(_info, mwbot.info);
				assert.notStrictEqual(_info, mwbot.info);
			});

			it('should expose user object', function () {
				assert.isObject(mwbot.info.user);
				assert.isNotEmpty(mwbot.info.user);
			});

			it('should expose general object', function () {
				assert.isObject(mwbot.info.general);
				assert.isNotEmpty(mwbot.info.general);
			});

			it('should expose namespaces object', function () {
				assert.isObject(mwbot.info.namespaces);
				assert.isNotEmpty(mwbot.info.namespaces);
			});

			it('should expose namespacealiases array', function () {
				assert.isArray(mwbot.info.namespacealiases);
				assert.isNotEmpty(mwbot.info.namespacealiases);
			});

			it('should expose magicwords array', function () {
				assert.isArray(mwbot.info.magicwords);
				assert.isNotEmpty(mwbot.info.magicwords);
			});

			it('should expose interwikimap array', function () {
				assert.isArray(mwbot.info.interwikimap);
				assert.isNotEmpty(mwbot.info.interwikimap);
			});

			it('should expose extensions array', function () {
				assert.isArray(mwbot.info.extensions);
				assert.isNotEmpty(mwbot.info.extensions);
			});

			it('should expose extensiontags array', function () {
				assert.isArray(mwbot.info.extensiontags);
				assert.isNotEmpty(mwbot.info.extensiontags);
			});

			it('should expose functionhooks array', function () {
				assert.isArray(mwbot.info.functionhooks);
				assert.isNotEmpty(mwbot.info.functionhooks);
			});
		});

		describe('Parser classes', function () {
			/**
			 * @type {Awaited<ReturnType<typeof getTestMwbot>>}
			 * @readonly
			 */
			let mwbot;

			before(async function () {
				mwbot = await getTestMwbot('named');
			});

			/** @type {const} */ ([
				'Title',
				'Template',
				'ParserFunction',
				'Wikilink',
				'FileWikilink',
				'RawWikilink',
				'Wikitext',
			]).forEach((name) => {
				it(`should expose ${name} class`, function () {
					assert.strictEqual(mwbot[`_${name}`].name, name);
					assert.strictEqual(mwbot[name].name, name);
				});
			});
		});
	});
}