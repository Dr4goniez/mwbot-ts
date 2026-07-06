import { describe, it, before, beforeEach } from 'mocha';
import { assert } from 'chai';
import * as sinon from 'sinon';
import { assertThrowsMwbotError, getTestMwbot } from './MwbotTest-fixtures.js';

describe('Mwbot.Wikilink', function () {
	/**
	 * @type {Awaited<ReturnType<getTestMwbot>>}
	 */
	let mwbot;

	before(async function () {
		mwbot = await getTestMwbot('named');
	});

	describe('WikilinkBase', function () {
		describe('validateTitle()', function () {
			/**
			 * @typedef {import('../../dist/index.js').Title} Title
			 */
			/**
			 * @type {(title: string | Title) => Title}
			 */
			let validateTitle;

			beforeEach(function () {
				// @ts-expect-error - Testing a protected method
				validateTitle = mwbot.Wikilink.validateTitle.bind(mwbot.Wikilink);
			});

			it('should return a Title from a string', function () {
				const title = validateTitle('Foo');

				assert.instanceOf(title, mwbot.Title);
				assert.strictEqual(title.getMain(), 'Foo');
			});

			it('should reject an empty string', function () {
				assertThrowsMwbotError(
					() => validateTitle(''),
					'unparsabletitle'
				);
			});

			it('should clone a Title instance', function () {
				const input = new mwbot.Title('Foo');
				const output = validateTitle(input);

				assert.notStrictEqual(output, input);
				assert.strictEqual(
					output.getPrefixedDb(),
					input.getPrefixedDb()
				);
			});

			it('should reject invalid input types', function () {
				assertThrowsMwbotError(
					// @ts-expect-error - Passing a number
					() => validateTitle(123),
					'typemismatch'
				);
			});
		});

		describe('getDisplay()', function () {
			it('should return the internal display text', function () {
				const display = 'Bar';
				const lnk = new mwbot.Wikilink('Foo', 'Bar');

				assert.strictEqual(lnk.getDisplay(), display);
			});

			it('should return the string title when no display text is set', function () {
				const lnk = new mwbot.Wikilink('Foo');
				// @ts-expect-error - Protected property
				sinon.stub(lnk, '_title').value('Foo');

				assert.strictEqual(lnk.getDisplay(), 'Foo');

				sinon.restore();
			});

			it('should return a trimmed string title when no display text is set', function () {
				const lnk = new mwbot.Wikilink('Foo');
				// @ts-expect-error - Protected property
				sinon.stub(lnk, '_title').value('  Foo  ');

				// Title.clean should trim _title
				assert.strictEqual(lnk.getDisplay(), 'Foo');

				sinon.restore();
			});

			it('should return the stringified Title when no display text is set', function () {
				const title = new mwbot.Title('Foo#Bar');
				const lnk = new mwbot.Wikilink(title);

				assert.deepPropertyVal(lnk, '_title', title);
				assert.strictEqual(lnk.title.getMain(), 'Foo');
				assert.strictEqual(lnk.title.getFragment(), 'Bar');
				assert.strictEqual(
					lnk.getDisplay(),
					title.getPrefixedText({ fragment: true })
				);
			});
		});

		describe('setDisplay()', function () {
			it('should trim the provided display text', function () {
				const lnk = new mwbot.Wikilink('Foo');

				lnk.setDisplay('  Bar  ');

				assert.propertyVal(lnk, '_display', 'Bar');
			});

			it('should set a new display text when a non-empty string is provided', function () {
				const lnk = new mwbot.Wikilink('Foo');

				lnk.setDisplay('Bar');

				assert.propertyVal(lnk, '_display', 'Bar');
			});

			it('should unset the display text when an empty string is provided', function () {
				const lnk = new mwbot.Wikilink('Foo', 'Bar');

				lnk.setDisplay('');

				assert.propertyVal(lnk, '_display', null);
			});

			it('should unset the display text when a whitespace-only string is provided', function () {
				const lnk = new mwbot.Wikilink('Foo', 'Bar');

				lnk.setDisplay('  ');

				assert.propertyVal(lnk, '_display', null);
			});

			it('should unset the display text when null is provided', function () {
				const lnk = new mwbot.Wikilink('Foo', 'Bar');

				lnk.setDisplay(null);

				assert.propertyVal(lnk, '_display', null);
			});

			it('should return itself', function () {
				const lnk = new mwbot.Wikilink('Foo');

				assert.strictEqual(lnk.setDisplay('Bar'), lnk);
			});

			it('should throw on an invalid display value', function () {
				const lnk = new mwbot.Wikilink('Foo', 'Bar');

				assertThrowsMwbotError(
					// @ts-expect-error - Passing a number
					() => lnk.setDisplay(123),
					'typemismatch'
				);
			});
		});

		describe('hasDisplay()', function () {
			it('should return true when a display text is set', function () {
				const lnk = new mwbot.Wikilink('Foo', 'Bar');

				assert.isTrue(lnk.hasDisplay());
			});

			it('should return false when initialized with an empty display text', function () {
				const lnk = new mwbot.Wikilink('Foo', '');

				assert.isFalse(lnk.hasDisplay());
			});

			it('should return false when no display text is set', function () {
				const lnk = new mwbot.Wikilink('Foo');

				assert.isFalse(lnk.hasDisplay());
			});
		});
	});

	describe('Wikilink', function () {
		describe('constructor()', function () {
			it('should create an instance from a string', function () {
				const lnk = new mwbot.Wikilink('Foo');

				assert.instanceOf(lnk.title, mwbot.Title);
				assert.strictEqual(lnk.title.getPrefixedDb(), 'Foo');
				assert.isFalse(lnk.hasDisplay());
			});

			it('should create an instance from a Title', function () {
				const title = new mwbot.Title('Foo#Bar');
				const lnk = new mwbot.Wikilink(title);

				assert.strictEqual(
					lnk.title.getPrefixedDb(),
					title.getPrefixedDb()
				);
				assert.strictEqual(
					lnk.title.getFragment(),
					title.getFragment()
				);
			});

			it('should clone the provided Title', function () {
				const title = new mwbot.Title('Foo');
				const lnk = new mwbot.Wikilink(title);

				assert.notStrictEqual(lnk.title, title);
				assert.strictEqual(
					lnk.title.getPrefixedDb(),
					title.getPrefixedDb()
				);
			});

			it('should trim the display text', function () {
				const lnk = new mwbot.Wikilink('Foo', '  Bar  ');

				assert.strictEqual(lnk.getDisplay(), 'Bar');
			});

			it('should reject a file title without a leading colon', function () {
				assertThrowsMwbotError(
					() => new mwbot.Wikilink('File:Foo'),
					'invalidinput'
				);
			});

			it('should accept a file title with a leading colon', function () {
				const lnk = new mwbot.Wikilink(':File:Foo');

				assert.strictEqual(
					lnk.title.getPrefixedText({ colon: true }),
					':File:Foo'
				);
			});

			it('should reject an unparsable title', function () {
				assertThrowsMwbotError(
					() => new mwbot.Wikilink(''),
					'unparsabletitle'
				);
			});

			it('should reject invalid input types', function () {
				assertThrowsMwbotError(
					// @ts-expect-error - Passing a number
					() => new mwbot.Wikilink(123),
					'typemismatch'
				);
			});
		});

		describe('is()', function () {
			// The success paths should be tested in WikitextTest.js

			it('should throw on an invalid input', function () {
				assertThrowsMwbotError(
					// @ts-expect-error = Passing an unsupported class name
					() => mwbot.Wikilink.is({}, 'Unknown'),
					'invalidinput'
				);
			});
		});

		describe('setTitle()', function () {
			it('should set a new title from a string', function () {
				const lnk = new mwbot.Wikilink('Foo');

				assert.isTrue(lnk.setTitle('Bar'));
				assert.strictEqual(lnk.title.getPrefixedDb(), 'Bar');
			});

			it('should set a new title from a Title', function () {
				const title = new mwbot.Title('Bar#Baz');
				const lnk = new mwbot.Wikilink('Foo');

				assert.isTrue(lnk.setTitle(title));
				assert.notStrictEqual(lnk.title, title);
				assert.strictEqual(
					lnk.title.getPrefixedText({ fragment: true }),
					title.getPrefixedText({ fragment: true })
				);
			});

			it('should reject a file title', function () {
				const lnk = new mwbot.Wikilink('Foo');

				assert.isFalse(lnk.setTitle('File:Bar'));
				assert.strictEqual(lnk.title.getPrefixedDb(), 'Foo');
			});

			it('should reject an invalid title', function () {
				const lnk = new mwbot.Wikilink('Foo');

				assert.isFalse(lnk.setTitle(''));
				assert.strictEqual(lnk.title.getPrefixedDb(), 'Foo');
			});

			it('should log the error when verbose is true', function () {
				const spy = sinon.stub(console, 'error');
				const lnk = new mwbot.Wikilink('Foo');

				assert.isFalse(lnk.setTitle('', true));
				sinon.assert.calledOnce(spy);

				sinon.restore();
			});
		});

		describe('toFileWikilink()', function () {
			it('should create a FileWikilink', function () {
				const lnk = new mwbot.Wikilink('Foo', 'Bar');
				const file = lnk.toFileWikilink('File:Example.png');

				assert.instanceOf(file, mwbot.FileWikilink);
				assert.strictEqual(file.title.getPrefixedDb(), 'File:Example.png');
				assert.strictEqual(file.getParam(0), 'Bar');
			});

			it('should return null on failure', function () {
				const lnk = new mwbot.Wikilink('Foo');

				assert.isNull(lnk.toFileWikilink(''));
			});

			it('should log the error when verbose is true', function () {
				const spy = sinon.stub(console, 'error');
				const lnk = new mwbot.Wikilink('Foo');

				assert.isNull(lnk.toFileWikilink('', true));
				sinon.assert.calledOnce(spy);

				sinon.restore();
			});
		});

		describe('stringify()', function () {
			it('should stringify a wikilink without a display text', function () {
				const lnk = new mwbot.Wikilink('Foo');

				assert.strictEqual(lnk.stringify(), '[[Foo]]');
			});

			it('should stringify a wikilink with a display text', function () {
				const lnk = new mwbot.Wikilink('Foo', 'Bar');

				assert.strictEqual(lnk.stringify(), '[[Foo|Bar]]');
			});

			it('should stringify a title with a fragment', function () {
				const lnk = new mwbot.Wikilink('Foo#Bar');

				assert.strictEqual(lnk.stringify(), '[[Foo#Bar]]');
			});

			it('should preserve a leading colon', function () {
				const lnk = new mwbot.Wikilink(':Category:Foo');

				assert.strictEqual(lnk.stringify(), '[[:Category:Foo]]');
			});

			it('should stringify both a leading colon and a fragment', function () {
				const lnk = new mwbot.Wikilink(':Category:Foo#Bar');

				assert.strictEqual(lnk.stringify(), '[[:Category:Foo#Bar]]');
			});

			it('should suppress the display text when requested', function () {
				const lnk = new mwbot.Wikilink('Foo', 'Bar');

				assert.strictEqual(
					lnk.stringify({ suppressDisplay: true }),
					'[[Foo]]'
				);
			});
		});

		describe('toString()', function () {
			it('should return the same result as stringify()', function () {
				const lnk = new mwbot.Wikilink('Foo', 'Bar');

				assert.strictEqual(
					lnk.toString(),
					lnk.stringify()
				);
			});
		});
	});
});