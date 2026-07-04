import { describe, it, before, beforeEach } from 'mocha';
import { assert } from 'chai';
import { getTestMwbot } from './MwbotTest-fixtures.js';

describe('Mwbot.Title', function () {
	/**
	 * @type {Awaited<ReturnType<getTestMwbot>>}
	 */
	let mwbot;
	/**
	 * @type {number}
	 */
	let NS_MAIN;
	/**
	 * @type {number}
	 */
	let NS_PROJECT;
	/**
	 * @type {number}
	 */
	let NS_TEMPLATE;
	/**
	 * @type {number}
	 */
	let NS_CATEGORY;

	before(async function () {
		mwbot = await getTestMwbot('named');

		const wgNamespaceIds = mwbot.config.get('wgNamespaceIds');
		NS_MAIN = wgNamespaceIds[''];
		NS_PROJECT = wgNamespaceIds.project;
		NS_TEMPLATE = wgNamespaceIds.template;
		NS_CATEGORY = wgNamespaceIds.category;
	});

	/**
	 * @typedef {object} TestData
	 * @property {string} input The input title to test.
	 * @property {() => number} [defaultNamespace] The default namespace to use.
	 * @property {string} [output] The output title to test. If missing, expect it to be invalid.
	 * @property {import('../../dist/index.js').TitleOutputOptions} [options]
	 * @property {(title: import('../../dist/index.js').Title) => void} [test] Additional tests.
	 */
	/**
	 * @type {Record<string, TestData>}
	 */
	const testData = {
		'should remove Unicode bidi characters': {
			input: 'Foo\u200EBar',
			output: 'FooBar',
		},
		'should reject forbidden Unicode characters': {
			input: 'Foo\uFFFDBar',
		},
		'should preserve leading colons when requested': {
			input: ':Category:Sandbox',
			output: ':Category:Sandbox',
			options: { colon: true },
			test: (title) => {
				assert.isTrue(title.hadLeadingColon());
				assert.strictEqual(title.getNamespaceId(), NS_CATEGORY);
			},
		},
		'should omit leading colons by default': {
			input: ':Foo',
			output: 'Foo',
			test: (title) => {
				assert.isTrue(title.hadLeadingColon());
				assert.strictEqual(title.getNamespaceId(), NS_MAIN);
			},
		},
		'should ignore duplicate underscores around leading colons': {
			input: ':__Category:_Foo',
			output: 'Category:Foo',
			test: (title) => {
				assert.isTrue(title.hadLeadingColon());
				assert.strictEqual(title.getNamespaceId(), NS_CATEGORY);
			},
		},
		'should reject empty titles': {
			input: '',
		},
		'should reject colon-only titles': {
			input: ':',
		},
		'should reject titles that would be considered empty after normalization': {
			input: '__  _',
		},
		'should parse namespace prefixes and normalize the title': {
			input: 'Template:foo bar',
			output: 'Template:Foo_bar',
			test: (title) => {
				assert.strictEqual(title.getNamespaceId(), NS_TEMPLATE);
				assert.strictEqual(title.getNamespacePrefix(), 'Template:');
				assert.strictEqual(title.getMain(), 'Foo_bar');
				assert.strictEqual(title.getMainText(), 'Foo bar');
			},
		},
		'should resolve multiple namespace prefixes': {
			input: 'Category:Template:Foo',
			output: 'Category:Template:Foo',
			test: (title) => {
				assert.strictEqual(title.getNamespaceId(), NS_CATEGORY);
				assert.strictEqual(title.getNamespacePrefix(), 'Category:');
				assert.strictEqual(title.getMain(), 'Template:Foo');
			},
		},
		'should reject "Talk:namespace:x" type titles': {
			input: ': _Talk:_File :x',
		},
		'should reject "Talk:interwiki:x" type titles': {
			input: ': _Talk:_wikt :x',
		},
		'should accept mixed-case namespace names': {
			input: 'CaTeGoRy:Foo',
			output: 'Category:Foo',
			test: (title) => {
				assert.strictEqual(title.getNamespaceId(), NS_CATEGORY);
			},
		},
		'should accept namespace names with spaces': {
			input: 'User talk:Example',
			output: 'User_talk:Example',
		},
		'should accept namespace names with underscores': {
			input: 'User_talk:Example',
			output: 'User_talk:Example',
		},
		'should use the provided default namespace': {
			input: 'Foo',
			output: 'Category:Foo',
			defaultNamespace: () => NS_CATEGORY,
			test: (title) => {
				assert.strictEqual(title.getNamespaceId(), NS_CATEGORY);
			},
		},
		'should parse single-interwiki titles': {
			input: 'w:Main Page',
			output: 'w:Main_Page',
			test: (title) => {
				assert.isTrue(title.isExternal());
				assert.strictEqual(title.getInterwiki(), 'w:');
				assert.strictEqual(title.getNamespaceId(), NS_MAIN);
				assert.strictEqual(title.getMain(), 'Main_Page');
			},
		},
		'should suppress interwiki prefixes when requested': {
			input: 'w:Main Page',
			output: 'Main_Page',
			options: { interwiki: false },
			test: (title) => {
				assert.isTrue(title.isExternal());
				assert.strictEqual(title.getInterwiki(), 'w:');
			},
		},
		'should erase local interwiki prefixes': {
			input: 'mwbot_ts:Main Page',
			output: 'Main_Page',
			test: (title) => {
				assert.isFalse(title.isExternal());
				assert.isTrue(title.wasLocalInterwiki());
			},
		},
		'should resolve empty local interwiki links to the main page': {
			input: 'mwbot_ts:',
			output: 'Main_Page',
			test: (title) => {
				assert.isFalse(title.isExternal());
				assert.isTrue(title.wasLocalInterwiki());
			},
		},
		'should parse multiple-interwiki titles': {
			input: 'w:en:Main Page',
			output: 'w:en:Main_Page',
			test: (title) => {
				assert.isTrue(title.isExternal());
				assert.strictEqual(title.getInterwiki(), 'w:en:');
				assert.strictEqual(title.getNamespaceId(), NS_MAIN);
				assert.strictEqual(title.getMain(), 'Main_Page');
			},
		},
		'should retain casing in interwiki titles': {
			input: 'w:en:foo bar',
			output: 'w:en:foo_bar',
			test: (title) => {
				assert.isTrue(title.isExternal());
				assert.strictEqual(title.getInterwiki(), 'w:en:');
				assert.strictEqual(title.getNamespaceId(), NS_MAIN);
				assert.strictEqual(title.getMain(), 'foo_bar');
			},
		},
		'should support colon-prefixed interwiki titles': {
			input: ':w:en:Foo',
			output: 'w:en:Foo',
			test: (title) => {
				assert.isTrue(title.isExternal());
				assert.isTrue(title.hadLeadingColon());
				assert.strictEqual(title.getInterwiki(), 'w:en:');
				assert.strictEqual(title.getNamespaceId(), NS_MAIN);
				assert.strictEqual(title.getMain(), 'Foo');
			},
		},
		'should prioritize namespace over interwiki': {
			input: 'wikipedia:wikipedia:Foo',
			output: 'Wikipedia:Wikipedia:Foo',
			test: (title) => {
				assert.isFalse(title.isExternal());
				assert.strictEqual(title.getInterwiki(), '');
				assert.strictEqual(title.getNamespaceId(), NS_PROJECT);
				assert.strictEqual(title.getMain(), 'Wikipedia:Foo');
			},
		},
		'should support an initial colon after an interwiki prefix': {
			input: 'w::Category:Foo',
			output: 'w:Category:Foo',
			test: (title) => {
				assert.isTrue(title.isExternal());
				assert.strictEqual(title.getInterwiki(), 'w:');
				assert.strictEqual(title.getNamespaceId(), NS_MAIN);
				assert.strictEqual(title.getMain(), 'Category:Foo');
			},
		},
		'should normalize mixed-case interwiki prefixes': {
			input: 'W:Foo',
			output: 'w:Foo',
			test: (title) => {
				assert.isTrue(title.isExternal());
				assert.strictEqual(title.getInterwiki(), 'w:');
			},
		},
		'should parse fragments': {
			input: 'Foo#Section',
			output: 'Foo#Section',
			options: { fragment: true },
			test: (title) => {
				assert.strictEqual(title.getPrefixedDb(), 'Foo');
				assert.strictEqual(title.getFragment(), 'Section');
			},
		},
		'should discard empty fragments': {
			input: 'Foo#',
			output: 'Foo',
			options: { fragment: true },
			test: (title) => {
				assert.strictEqual(title.getPrefixedDb(), 'Foo');
				assert.strictEqual(title.getFragment(), '');
			},
		},
		'should omit fragments by default': {
			input: 'Foo#Bar',
			output: 'Foo',
		},
		'should replace underscores with spaces in fragments': {
			input: 'Foo#_bar baz',
			output: 'Foo# bar baz',
			options: { fragment: true },
			test: (title) => {
				assert.strictEqual(title.getPrefixedDb(), 'Foo');
				assert.strictEqual(title.getFragment(), ' bar baz');
			},
		},
		'should keep additional hashes inside fragments': {
			input: 'Foo#Bar#Baz',
			output: 'Foo#Bar#Baz',
			options: { fragment: true },
			test: (title) => {
				assert.strictEqual(title.getPrefixedDb(), 'Foo');
				assert.strictEqual(title.getFragment(), 'Bar#Baz');
			},
		},
		'should reject titles containing magic tilde sequences': {
			input: 'Foo~~~Bar',
		},
		'should combine output options correctly': {
			input: ':w:Foo#Bar',
			output: ':Foo#Bar',
			options: {
				colon: true,
				interwiki: false,
				fragment: true,
			},
			test: (title) => {
				assert.isTrue(title.hadLeadingColon());
				assert.isTrue(title.isExternal());
				assert.strictEqual(title.getInterwiki(), 'w:');
				assert.strictEqual(title.getFragment(), 'Bar');
			},
		},
	};

	describe('constructor', () => {
		for (const [description, { input, output, defaultNamespace, options, test = () => {} }] of Object.entries(testData)) {
			it(description, () => {
				if (output) {
					const title = new mwbot.Title(input, defaultNamespace?.());

					assert.instanceOf(title, mwbot.Title);
					assert.strictEqual(title.getPrefixedDb(options), output);
					test(title);
				} else {
					assert.throws(() => new mwbot.Title(input));
				}
			});
		}

		it('should throw for non-string inputs', () => {
			assert.throws(() => new mwbot.Title(/** @type {any} */ (null)));
			assert.throws(() => new mwbot.Title(/** @type {any} */ (undefined)));
			assert.throws(() => new mwbot.Title(/** @type {any} */ (123)));
		});
	});

	describe('newFromText()', () => {
		for (const [description, { input, output, defaultNamespace, options, test = () => {} }] of Object.entries(testData)) {
			it(description, () => {
				const title = mwbot.Title.newFromText(input, defaultNamespace?.());

				if (output) {
					assert.instanceOf(title, mwbot.Title);
					assert.strictEqual(title.getPrefixedDb(options), output);
					test(title);
				} else {
					assert.isNull(title);
				}
			});
		}

		it('should use the provided default namespace', () => {
			const title = mwbot.Title.newFromText('Foo', NS_CATEGORY);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getNamespaceId(), NS_CATEGORY);
			assert.strictEqual(title.getPrefixedDb(), 'Category:Foo');
		});

		it('should ignore the default namespace when an explicit namespace is present', () => {
			const title = mwbot.Title.newFromText(
				'Template:Foo',
				NS_CATEGORY
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getNamespaceId(), NS_TEMPLATE);
			assert.strictEqual(title.getPrefixedDb(), 'Template:Foo');
		});

		it('should reset the default namespace when a leading colon is used', () => {
			const title = mwbot.Title.newFromText(
				':Foo',
				NS_CATEGORY
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getNamespaceId(), NS_MAIN);
			assert.strictEqual(title.getPrefixedDb(), 'Foo');
		});

		it('should throw for non-string inputs', () => {
			assert.throws(() => mwbot.Title.newFromText(/** @type {any} */ (null)));
			assert.throws(() => mwbot.Title.newFromText(/** @type {any} */ (undefined)));
			assert.throws(() => mwbot.Title.newFromText(/** @type {any} */ (123)));
		});
	});

	describe('newFromUserInput()', () => {
		/**
		 * @type {Record<string, TestData>}
		 */
		const userInputTestData = {
			'should trim whitespace': {
				input: '  Foo  ',
				output: 'Foo',
			},
			'should use the provided default namespace': {
				input: 'Foo',
				output: 'Category:Foo',
				defaultNamespace: () => NS_CATEGORY,
				test: (title) => {
					assert.strictEqual(title.getNamespaceId(), NS_CATEGORY);
				},
			},
			'should ignore the default namespace when an explicit namespace is present': {
				input: 'Template:Foo',
				output: 'Template:Foo',
				defaultNamespace: () => NS_CATEGORY,
				test: (title) => {
					assert.strictEqual(title.getNamespaceId(), NS_TEMPLATE);
				},
			},
			'should reset the default namespace when a leading colon is used': {
				input: ':Foo',
				output: 'Foo',
				defaultNamespace: () => NS_CATEGORY,
				test: (title) => {
					assert.strictEqual(title.getNamespaceId(), NS_MAIN);
				},
			},
			// sanitize()
			'should remove signature sequences': {
				input: 'Foo~~~Bar',
				output: 'FooBar',
			},
			'should remove control characters': {
				input: 'Foo\x00Bar',
				output: 'FooBar',
			},
			'should sanitize HTML-like characters': {
				input: 'Foo<Bar>',
				output: 'Foo(Bar)',
			},
			'should sanitize HTML entities': {
				input: 'Foo&nbsp;Bar',
				output: 'Foo&_nbsp;Bar',
			},
			'should sanitize URL escape sequences': {
				input: 'Foo%20Bar',
				output: 'Foo%_20Bar',
			},
			'should sanitize directory traversal': {
				input: 'File:../../../foo.jpg',
				output: 'File:..-..-..-foo.jpg',
			},
			// File namespace
			'should sanitize file names': {
				input: 'File:foo<bar>.jpg',
				output: 'File:Foo(bar).jpg',
			},
			'should reject file names without extensions': {
				input: 'File:foo',
			},
			'should reject file names with empty extensions': {
				input: 'File:foo.',
			},
			'should replace slashes in uploaded file names': {
				input: 'File:foo/bar.jpg',
				output: 'File:Foo-bar.jpg',
			},
			'should replace colons in uploaded file names': {
				input: 'File:foo:bar.jpg',
				output: 'File:Foo-bar.jpg',
			},
		};

		for (const [description, { input, output, defaultNamespace, options, test = () => {} }] of Object.entries(userInputTestData)) {
			it(description, () => {
				const title = mwbot.Title.newFromUserInput(input, defaultNamespace?.());

				if (output) {
					assert.instanceOf(title, mwbot.Title);
					assert.strictEqual(title.getPrefixedDb(options), output);
					test(title);
				} else {
					assert.isNull(title);
				}
			});
		}

		it('should not apply file sanitization when forUploading is false', () => {
			const title = mwbot.Title.newFromUserInput(
				'File:foo/bar.jpg',
				NS_MAIN,
				{ forUploading: false }
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getPrefixedDb(), 'File:Foo/bar.jpg');
		});

		it('should sanitize Media namespace titles like uploaded files', () => {
			const title = mwbot.Title.newFromUserInput(
				'Media:foo/bar.jpg'
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getPrefixedDb(), 'Media:Foo-bar.jpg');
		});

		it('should trim ordinary titles exceeding the byte limit', () => {
			const input = 'a'.repeat(300);
			const title = mwbot.Title.newFromUserInput(input);

			assert.instanceOf(title, mwbot.Title);
			assert.isAtMost(title.getMain().length, 255);
		});
	});

	describe('newFromFileName()', () => {
		it('should create a file title', () => {
			const title = mwbot.Title.newFromFileName('Example.jpg');

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getPrefixedDb(), 'File:Example.jpg');
		});

		it('should sanitize file names', () => {
			const title = mwbot.Title.newFromFileName('foo<bar>.jpg');

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getPrefixedDb(), 'File:Foo(bar).jpg');
		});

		it('should reject file names without extensions', () => {
			assert.isNull(
				mwbot.Title.newFromFileName('Example')
			);
		});
	});

	describe('makeTitle', () => {
		it('should return null for unknown namespaces', () => {
			assert.isNull(mwbot.Title.makeTitle(999999, 'Foo'));
		});

		it('should prepend interwiki prefixes', () => {
			const title = mwbot.Title.makeTitle(
				NS_MAIN,
				'Foo',
				'',
				'w'
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getPrefixedDb(), 'w:Foo');
		});

		it('should normalize interwiki prefixes', () => {
			const title = mwbot.Title.makeTitle(
				NS_MAIN,
				'Foo',
				'',
				'W'
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getPrefixedDb(), 'w:Foo');
		});

		it('should add a trailing colon to interwiki prefixes', () => {
			const title = mwbot.Title.makeTitle(
				NS_MAIN,
				'Foo',
				'',
				'w'
			);

			assert.instanceOf(title, mwbot.Title);
			assert.isTrue(title.isExternal());
			assert.strictEqual(title.getInterwiki(), 'w:');
		});

		it('should not add a trailing colon if the provided interwiki prefixes already have one', () => {
			const title = mwbot.Title.makeTitle(
				NS_MAIN,
				'Foo',
				'',
				'w:'
			);

			assert.instanceOf(title, mwbot.Title);
			assert.isTrue(title.isExternal());
			assert.strictEqual(title.getInterwiki(), 'w:');
		});

		it('should create titles in the requested namespace', () => {
			const title = mwbot.Title.makeTitle(
				NS_CATEGORY,
				'Sandbox'
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getPrefixedDb(), 'Category:Sandbox');
		});

		it('should override namespace when "title" contains a namespace prefix', () => {
			const title = mwbot.Title.makeTitle(
				NS_CATEGORY,
				'Template:Foo'
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getNamespaceId(), NS_CATEGORY);
			assert.strictEqual(title.getPrefixedDb(), 'Category:Template:Foo');
		});

		it('should treat the main namespace like newFromText', () => {
			const title = mwbot.Title.makeTitle(
				NS_MAIN,
				'Category:Sandbox'
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getNamespaceId(), NS_CATEGORY);
		});

		it('should append fragments', () => {
			const title = mwbot.Title.makeTitle(
				NS_MAIN,
				'Foo',
				'Bar'
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getPrefixedDb({ fragment: true }), 'Foo#Bar');
			assert.strictEqual(title.getFragment(), 'Bar');
		});

		it('should support hashed fragments as inputs', () => {
			const title = mwbot.Title.makeTitle(
				NS_MAIN,
				'Foo',
				'#Bar'
			);

			assert.instanceOf(title, mwbot.Title);
			assert.strictEqual(title.getPrefixedDb({ fragment: true }), 'Foo#Bar');
			assert.strictEqual(title.getFragment(), 'Bar');
		});

		it('should return null when the generated title is invalid', () => {
			assert.isNull(
				mwbot.Title.makeTitle(
					NS_MAIN,
					'Foo~~~Bar'
				)
			);
		});

		it('should return null when the generated title has an invalid namespace combination', () => {
			assert.isNull(
				mwbot.Title.makeTitle(
					NS_MAIN,
					'Talk:File:Example.png'
				)
			);
		});
	});

	describe('normalize()', () => {
		for (const [description, { input, output, defaultNamespace, options = {} }] of Object.entries(testData)) {
			it(description, () => {
				const title = mwbot.Title.normalize(input, { namespace: defaultNamespace?.(), ...options });

				if (output) {
					assert.isString(title);
					assert.strictEqual(title, output);
				} else {
					assert.isNull(title);
				}
			});
		}

		it('should throw when the input is not a string', () => {
			assert.throws(
				() => mwbot.Title.normalize(/** @type {never} */ (123)),
				/title.*string/i
			);
		});

		it('should support api format', () => {
			assert.strictEqual(
				mwbot.Title.normalize('Foo_bar', { format: 'api' }),
				'Foo bar'
			);
		});

		it('should support api format together with fragments', () => {
			assert.strictEqual(
				mwbot.Title.normalize('Foo_bar#Bar_baz', {
					format: 'api',
					fragment: true,
				}),
				'Foo bar#Bar baz'
			);
		});

		it('should support api format together with suppressed interwiki prefixes', () => {
			assert.strictEqual(
				mwbot.Title.normalize('w:Foo_bar', {
					format: 'api',
					interwiki: false,
				}),
				'Foo bar'
			);
		});

		it('should support all normalization options together', () => {
			assert.strictEqual(
				mwbot.Title.normalize(':w:Foo_bar#Bar_baz', {
					colon: true,
					interwiki: false,
					fragment: true,
					format: 'api',
				}),
				':Foo bar#Bar baz'
			);
		});
	});

	describe('isTalkNamespace()', () => {
		it('should identify talk namespaces', () => {
			assert.isTrue(mwbot.Title.isTalkNamespace(1));
			assert.isTrue(mwbot.Title.isTalkNamespace(3));
			assert.isTrue(mwbot.Title.isTalkNamespace(15));
		});

		it('should reject subject namespaces', () => {
			assert.isFalse(mwbot.Title.isTalkNamespace(0));
			assert.isFalse(mwbot.Title.isTalkNamespace(2));
			assert.isFalse(mwbot.Title.isTalkNamespace(4));
		});

		it('should reject negative namespaces', () => {
			assert.isFalse(mwbot.Title.isTalkNamespace(-1));
			assert.isFalse(mwbot.Title.isTalkNamespace(-2));
		});
	});

	describe('exists()', () => {
		beforeEach(() => {
			mwbot.Title.exist.pages = {};
		});

		it('should return null for unknown titles', () => {
			assert.isNull(mwbot.Title.exists('Foo'));
		});

		it('should store existing pages', () => {
			mwbot.Title.exist.set('Foo');

			assert.isTrue(mwbot.Title.exists('Foo'));
		});

		it('should store non-existing pages', () => {
			mwbot.Title.exist.set('Foo', false);

			assert.isFalse(mwbot.Title.exists('Foo'));
		});

		it('should accept arrays of titles', () => {
			mwbot.Title.exist.set(['Foo', 'Bar']);

			assert.isTrue(mwbot.Title.exists('Foo'));
			assert.isTrue(mwbot.Title.exists('Bar'));
		});

		it('should accept Title instances', () => {
			mwbot.Title.exist.set('Foo');

			assert.isTrue(
				mwbot.Title.exists(new mwbot.Title('Foo'))
			);
		});

		it('should overwrite previous values', () => {
			mwbot.Title.exist.set('Foo');
			mwbot.Title.exist.set('Foo', false);

			assert.isFalse(mwbot.Title.exists('Foo'));
		});

		it('should throw for invalid arguments', () => {
			assert.throws(() => mwbot.Title.exists(/** @type {any} */ (123)));
		});
	});

	describe('normalizeExtension()', () => {
		const cases = {
			'should normalize htm': ['htm', 'html'],
			'should normalize jpeg': ['jpeg', 'jpg'],
			'should normalize mpeg': ['mpeg', 'mpg'],
			'should normalize tiff': ['tiff', 'tif'],
			'should normalize ogv': ['ogv', 'ogg'],

			'should lowercase extensions': ['PNG', 'png'],
			'should preserve ordinary extensions': ['pdf', 'pdf'],
			'should preserve numeric extensions': ['7Z', '7z'],

			'should reject empty strings': ['', ''],
			'should reject punctuation': ['jp*g', ''],
			'should reject dots': ['.jpg', ''],
			'should reject spaces': ['jpg ', ''],
			'should reject non-ascii letters': ['éxt', ''],
		};

		for (const [description, [input, output]] of Object.entries(cases)) {
			it(description, () => {
				assert.strictEqual(
					mwbot.Title.normalizeExtension(input),
					output
				);
			});
		}
	});

	describe('normalizeUsername()', () => {
		it('should capitalize the first letter', () => {
			assert.strictEqual(
				mwbot.Title.normalizeUsername('foo'),
				'Foo'
			);
		});

		it('should trim whitespace', () => {
			assert.strictEqual(
				mwbot.Title.normalizeUsername('  foo  '),
				'Foo'
			);
		});

		it('should preserve Georgian first letters', () => {
			assert.strictEqual(
				mwbot.Title.normalizeUsername('აბგ'),
				'აბგ'
			);
		});

		it('should normalize IP addresses', () => {
			assert.strictEqual(
				mwbot.Title.normalizeUsername('127.0.0.1'),
				'127.0.0.1'
			);
		});

		it('should reject invalid IPv4 strings', () => {
			assert.isNull(
				mwbot.Title.normalizeUsername('999.999.999.999')
			);
		});

		it('should reject usernames containing invalid characters', () => {
			for (const name of [
				'Foo/Bar',
				'Foo@Bar',
				'Foo#Bar',
				'Foo<Bar',
				'Foo>Bar',
				'Foo[Bar',
				'Foo]Bar',
				'Foo|Bar',
				'Foo{Bar',
				'Foo}Bar',
				'Foo:Bar',
			]) {
				assert.isNull(
					mwbot.Title.normalizeUsername(name),
					name
				);
			}
		});

		it('should return null for non-string inputs', () => {
			assert.isNull(
				mwbot.Title.normalizeUsername(/** @type {never} */ (123))
			);
		});

		it('should use PHP-compatible uppercasing', () => {
			assert.strictEqual(
				mwbot.Title.normalizeUsername('ᾀfoo'),
				'ᾈfoo'
			);
		});
	});

	describe('clean()', () => {
		const LRM = '\u200E';
		const RLM = '\u200F';
		const LRE = '\u202A';
		const RLO = '\u202E';

		it('should return the same string if there are no Bidi characters or extra spaces', () => {
			assert.strictEqual(mwbot.Title.clean('hello world'), 'hello world');
		});

		it('should trim leading and trailing spaces by default (trim = true)', () => {
			assert.strictEqual(mwbot.Title.clean('  hello world  \n'), 'hello world');
		});

		it('should preserve leading and trailing spaces when trim = false is passed', () => {
			assert.strictEqual(mwbot.Title.clean('  hello world  ', false), '  hello world  ');
		});

		it('should remove all Unicode Bidi control characters from the string', () => {
			const input = `hello${LRM} ${LRE}world${RLO}`;
			assert.strictEqual(mwbot.Title.clean(input), 'hello world');
		});

		it('should correctly remove Bidi characters and trim spaces at the same time', () => {
			const input = `  ${RLM}hello world${LRE}  `;
			assert.strictEqual(mwbot.Title.clean(input), 'hello world');
		});

		it('should remove Bidi characters but preserve spaces when trim = false', () => {
			const input = `  ${RLM}hello world${LRE}  `;
			assert.strictEqual(mwbot.Title.clean(input, false), '  hello world  ');
		});

		it('should return an empty string if the input consists only of Bidi characters', () => {
			const input = `${LRM}${RLM}${LRE}${RLO}`;
			assert.strictEqual(mwbot.Title.clean(input), '');
			assert.strictEqual(mwbot.Title.clean(input, false), '');
		});
	});

	describe('phpCharToUpper()', () => {
		const cases = {
			'should uppercase ordinary ASCII characters': ['a', 'A'],
			'should preserve ordinary uppercase characters': ['A', 'A'],

			// overridden to "unchanged" (0 in toUpperMap)
			'should preserve ß': ['ß', 'ß'],
			'should preserve Georgian characters': ['ა', 'ა'],

			// explicit mapping
			'should apply PHP-specific mappings': ['ᾀ', 'ᾈ'],
		};

		for (const [description, [input, output]] of Object.entries(cases)) {
			it(description, () => {
				assert.strictEqual(
					mwbot.Title.phpCharToUpper(input),
					output
				);
			});
		}
	});

	describe('phpCharToLower()', () => {
		const cases = {
			'should lowercase ordinary ASCII characters': ['A', 'a'],
			'should preserve ordinary lowercase characters': ['a', 'a'],

			// explicit mapping
			'should apply PHP-specific mappings': ['ᾈ', 'ᾀ'],

			// fallback
			'should preserve ß': ['ß', 'ß'],
		};

		for (const [description, [input, output]] of Object.entries(cases)) {
			it(description, () => {
				assert.strictEqual(
					mwbot.Title.phpCharToLower(input),
					output
				);
			});
		}
	});

	describe('uc()', () => {
		it('should uppercase ordinary strings', () => {
			assert.strictEqual(
				mwbot.Title.uc('hello'),
				'HELLO'
			);
		});

		it('should apply PHP-specific mappings', () => {
			assert.strictEqual(
				mwbot.Title.uc('ᾀabc'),
				'ᾈABC'
			);
		});

		it('should preserve characters overridden with 0', () => {
			assert.strictEqual(
				mwbot.Title.uc('ßabc'),
				'ßABC'
			);
		});

		it('should return an empty string', () => {
			assert.strictEqual(
				mwbot.Title.uc(''),
				''
			);
		});
	});

	describe('lc()', () => {
		it('should lowercase ordinary strings', () => {
			assert.strictEqual(
				mwbot.Title.lc('HELLO'),
				'hello'
			);
		});

		it('should apply PHP-specific mappings', () => {
			assert.strictEqual(
				mwbot.Title.lc('ᾈABC'),
				'ᾀabc'
			);
		});

		it('should preserve characters without overrides', () => {
			assert.strictEqual(
				mwbot.Title.lc('ßABC'),
				'ßabc'
			);
		});

		it('should return an empty string', () => {
			assert.strictEqual(
				mwbot.Title.lc(''),
				''
			);
		});
	});
});