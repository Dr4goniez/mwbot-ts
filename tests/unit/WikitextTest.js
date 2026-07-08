import { describe } from 'mocha';
import { testWikitextConstructor } from './WikitextTest/WikitextTest-constructor.js';
import { testWikitextProperties } from './WikitextTest/WikitextTest-properties.js';

describe('Mwbot.Wikitext', function () {
	testWikitextConstructor();
	testWikitextProperties();
});