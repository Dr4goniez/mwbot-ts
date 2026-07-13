import { describe } from 'mocha';
import { testWikitextConstructor } from './WikitextTest/WikitextTest-constructor.js';
import { testWikitextProperties } from './WikitextTest/WikitextTest-properties.js';
import { testWikitextTags } from './WikitextTest/WikitextTest-tags.js';
import { testWikitextSections } from './WikitextTest/WikitextTest-sections.js';
import { testWikitextParameters } from './WikitextTest/WikitextTest-parameters.js';
import { testWikitextWikilinks } from './WikitextTest/WikitextTest-wikilinks.js';
import { testWikitextTemplates } from './WikitextTest/WikitextTest-templates.js';

describe('Mwbot.Wikitext', function () {
	testWikitextConstructor();
	testWikitextProperties();
	testWikitextTags();
	testWikitextSections();
	testWikitextParameters();
	testWikitextWikilinks();
	testWikitextTemplates();
});