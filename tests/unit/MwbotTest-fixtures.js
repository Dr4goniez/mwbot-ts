export function getFakeSiteAndUserInfo() {
	/* eslint-disable @stylistic/comma-dangle */
	return {
		"batchcomplete": true,
		"query": {
			"userinfo": {
				"id": 2,
				"name": "Admin",
				"rights": [
					"createaccount",
					"read",
					"edit",
					"createpage",
					"createtalk",
					"viewmyprivateinfo",
					"editmyprivateinfo",
					"editmyoptions"
				]
			},
			"functionhooks": [
				"ns",
				"nse",
				"urlencode",
				"lcfirst",
				"ucfirst",
				"lc",
				"uc",
				"localurl",
				"localurle",
				"fullurl",
				"fullurle",
				"canonicalurl",
				"canonicalurle",
				"formatnum",
				"grammar",
				"gender",
				"plural",
				"formal",
				"bidi",
				"numberingroup",
				"language",
				"padleft",
				"padright",
				"anchorencode",
				"defaultsort",
				"filepath",
				"pagesincategory",
				"pagesize",
				"protectionlevel",
				"protectionexpiry",
				"pagename",
				"pagenamee",
				"fullpagename",
				"fullpagenamee",
				"subpagename",
				"subpagenamee",
				"rootpagename",
				"rootpagenamee",
				"basepagename",
				"basepagenamee",
				"talkpagename",
				"talkpagenamee",
				"subjectpagename",
				"subjectpagenamee",
				"pageid",
				"revisionid",
				"revisionday",
				"revisionday2",
				"revisionmonth",
				"revisionmonth1",
				"revisionyear",
				"revisiontimestamp",
				"revisionuser",
				"cascadingsources",
				"namespace",
				"namespacee",
				"namespacenumber",
				"talkspace",
				"talkspacee",
				"subjectspace",
				"subjectspacee",
				"numberofarticles",
				"numberoffiles",
				"numberofusers",
				"numberofactiveusers",
				"numberofpages",
				"numberofadmins",
				"numberofedits",
				"bcp47",
				"dir",
				"interwikilink",
				"interlanguagelink",
				"contentmodel",
				"int",
				"special",
				"speciale",
				"tag",
				"formatdate",
				"displaytitle"
			],
			"general": {
				"mainpage": "Main Page",
				"base": "http://localhost:8080/index.php/Main_Page",
				"sitename": "Wikipedia",
				"mainpageisdomainroot": false,
				"logo": "http://localhost:8080/resources/assets/change-your-logo.svg",
				"generator": "MediaWiki 1.45.3",
				"phpversion": "8.3.31",
				"phpsapi": "apache2handler",
				"dbtype": "mysql",
				"dbversion": "12.3.2-MariaDB-ubu2404",
				"imagewhitelistenabled": false,
				"langconversion": true,
				"linkconversion": true,
				"titleconversion": true,
				"linkprefixcharset": "",
				"linkprefix": "",
				"linktrail": "/^([a-z]+)(.*)$/sD",
				"legaltitlechars": " %!\"$&'()*,\\-.\\/0-9:;=?@A-Z\\\\^_`a-z~\\x80-\\xFF+",
				"invalidusernamechars": "@:>=",
				"allunicodefixes": false,
				"case": "first-letter",
				"lang": "en",
				"fallback": [],
				"rtl": false,
				"fallback8bitEncoding": "windows-1252",
				"readonly": false,
				"writeapi": true,
				"maxarticlesize": 2097152,
				"timezone": "UTC",
				"timeoffset": 0,
				"articlepath": "/index.php/$1",
				"scriptpath": "",
				"script": "/index.php",
				"variantarticlepath": false,
				"server": "http://localhost:8080",
				"servername": "localhost",
				"wikiid": "mwbot_ts",
				"time": "2026-06-11T12:21:01Z",
				"misermode": false,
				"uploadsenabled": false,
				"maxuploadsize": 104857600,
				"minuploadchunksize": 1024,
				"galleryoptions": {
					"imagesPerRow": 0,
					"imageWidth": 120,
					"imageHeight": 120,
					"captionLength": true,
					"showBytes": true,
					"showDimensions": true,
					"mode": "traditional"
				},
				"thumblimits": {
					"0": 120,
					"1": 150,
					"2": 180,
					"3": 200,
					"4": 250,
					"5": 300
				},
				"imagelimits": {
					"0": {
						"width": 320,
						"height": 240
					},
					"1": {
						"width": 640,
						"height": 480
					},
					"2": {
						"width": 800,
						"height": 600
					},
					"3": {
						"width": 1024,
						"height": 768
					},
					"4": {
						"width": 1280,
						"height": 1024
					},
					"5": {
						"width": 2560,
						"height": 2048
					}
				},
				"favicon": "http://localhost:8080/favicon.ico",
				"centralidlookupprovider": "local",
				"allcentralidlookupproviders": [
					"local"
				],
				"interwikimagic": true,
				"magiclinks": {
					"ISBN": false,
					"PMID": false,
					"RFC": false
				},
				"categorycollation": "uppercase",
				"nofollowlinks": true,
				"nofollownsexceptions": [],
				"nofollowdomainexceptions": [
					"mediawiki.org"
				],
				"externallinktarget": false
			},
			"magicwords": [
				{
					"name": "!",
					"aliases": [
						"!"
					],
					"case-sensitive": true
				},
				{
					"name": "=",
					"aliases": [
						"="
					],
					"case-sensitive": true
				},
				{
					"name": "anchorencode",
					"aliases": [
						"ANCHORENCODE"
					],
					"case-sensitive": false
				},
				{
					"name": "articlepath",
					"aliases": [
						"ARTICLEPATH"
					],
					"case-sensitive": false
				},
				{
					"name": "basepagename",
					"aliases": [
						"BASEPAGENAME"
					],
					"case-sensitive": true
				},
				{
					"name": "basepagenamee",
					"aliases": [
						"BASEPAGENAMEE"
					],
					"case-sensitive": true
				},
				{
					"name": "bcp47",
					"aliases": [
						"#bcp47"
					],
					"case-sensitive": true
				},
				{
					"name": "bidi",
					"aliases": [
						"BIDI:"
					],
					"case-sensitive": false
				},
				{
					"name": "canonicalurl",
					"aliases": [
						"CANONICALURL:"
					],
					"case-sensitive": false
				},
				{
					"name": "canonicalurle",
					"aliases": [
						"CANONICALURLE:"
					],
					"case-sensitive": false
				},
				{
					"name": "cascadingsources",
					"aliases": [
						"CASCADINGSOURCES"
					],
					"case-sensitive": true
				},
				{
					"name": "contentlanguage",
					"aliases": [
						"CONTENTLANGUAGE",
						"CONTENTLANG"
					],
					"case-sensitive": true
				},
				{
					"name": "contentmodel",
					"aliases": [
						"#contentmodel"
					],
					"case-sensitive": true
				},
				{
					"name": "contentmodel_canonical",
					"aliases": [
						"canonical"
					],
					"case-sensitive": true
				},
				{
					"name": "contentmodel_local",
					"aliases": [
						"local"
					],
					"case-sensitive": true
				},
				{
					"name": "currentday",
					"aliases": [
						"CURRENTDAY"
					],
					"case-sensitive": true
				},
				{
					"name": "currentday2",
					"aliases": [
						"CURRENTDAY2"
					],
					"case-sensitive": true
				},
				{
					"name": "currentdayname",
					"aliases": [
						"CURRENTDAYNAME"
					],
					"case-sensitive": true
				},
				{
					"name": "currentdow",
					"aliases": [
						"CURRENTDOW"
					],
					"case-sensitive": true
				},
				{
					"name": "currenthour",
					"aliases": [
						"CURRENTHOUR"
					],
					"case-sensitive": true
				},
				{
					"name": "currentmonth",
					"aliases": [
						"CURRENTMONTH",
						"CURRENTMONTH2"
					],
					"case-sensitive": true
				},
				{
					"name": "currentmonth1",
					"aliases": [
						"CURRENTMONTH1"
					],
					"case-sensitive": true
				},
				{
					"name": "currentmonthabbrev",
					"aliases": [
						"CURRENTMONTHABBREV"
					],
					"case-sensitive": true
				},
				{
					"name": "currentmonthname",
					"aliases": [
						"CURRENTMONTHNAME"
					],
					"case-sensitive": true
				},
				{
					"name": "currentmonthnamegen",
					"aliases": [
						"CURRENTMONTHNAMEGEN"
					],
					"case-sensitive": true
				},
				{
					"name": "currenttime",
					"aliases": [
						"CURRENTTIME"
					],
					"case-sensitive": true
				},
				{
					"name": "currenttimestamp",
					"aliases": [
						"CURRENTTIMESTAMP"
					],
					"case-sensitive": true
				},
				{
					"name": "currentversion",
					"aliases": [
						"CURRENTVERSION"
					],
					"case-sensitive": true
				},
				{
					"name": "currentweek",
					"aliases": [
						"CURRENTWEEK"
					],
					"case-sensitive": true
				},
				{
					"name": "currentyear",
					"aliases": [
						"CURRENTYEAR"
					],
					"case-sensitive": true
				},
				{
					"name": "defaultsort",
					"aliases": [
						"DEFAULTSORT:",
						"DEFAULTSORTKEY:",
						"DEFAULTCATEGORYSORT:"
					],
					"case-sensitive": true
				},
				{
					"name": "defaultsort_noerror",
					"aliases": [
						"noerror"
					],
					"case-sensitive": false
				},
				{
					"name": "defaultsort_noreplace",
					"aliases": [
						"noreplace"
					],
					"case-sensitive": false
				},
				{
					"name": "dir",
					"aliases": [
						"#dir"
					],
					"case-sensitive": true
				},
				{
					"name": "directionmark",
					"aliases": [
						"DIRECTIONMARK",
						"DIRMARK"
					],
					"case-sensitive": true
				},
				{
					"name": "displaytitle",
					"aliases": [
						"DISPLAYTITLE"
					],
					"case-sensitive": true
				},
				{
					"name": "displaytitle_noerror",
					"aliases": [
						"noerror"
					],
					"case-sensitive": false
				},
				{
					"name": "displaytitle_noreplace",
					"aliases": [
						"noreplace"
					],
					"case-sensitive": false
				},
				{
					"name": "expectunusedcategory",
					"aliases": [
						"__EXPECTUNUSEDCATEGORY__"
					],
					"case-sensitive": true
				},
				{
					"name": "expectunusedtemplate",
					"aliases": [
						"__EXPECTUNUSEDTEMPLATE__"
					],
					"case-sensitive": true
				},
				{
					"name": "filepath",
					"aliases": [
						"FILEPATH:"
					],
					"case-sensitive": false
				},
				{
					"name": "forcetoc",
					"aliases": [
						"__FORCETOC__"
					],
					"case-sensitive": false
				},
				{
					"name": "formal",
					"aliases": [
						"#FORMAL:"
					],
					"case-sensitive": true
				},
				{
					"name": "formatdate",
					"aliases": [
						"formatdate",
						"dateformat"
					],
					"case-sensitive": false
				},
				{
					"name": "formatnum",
					"aliases": [
						"FORMATNUM"
					],
					"case-sensitive": false
				},
				{
					"name": "fullpagename",
					"aliases": [
						"FULLPAGENAME"
					],
					"case-sensitive": true
				},
				{
					"name": "fullpagenamee",
					"aliases": [
						"FULLPAGENAMEE"
					],
					"case-sensitive": true
				},
				{
					"name": "fullurl",
					"aliases": [
						"FULLURL:"
					],
					"case-sensitive": false
				},
				{
					"name": "fullurle",
					"aliases": [
						"FULLURLE:"
					],
					"case-sensitive": false
				},
				{
					"name": "gender",
					"aliases": [
						"GENDER:"
					],
					"case-sensitive": false
				},
				{
					"name": "grammar",
					"aliases": [
						"GRAMMAR:"
					],
					"case-sensitive": false
				},
				{
					"name": "hiddencat",
					"aliases": [
						"__HIDDENCAT__"
					],
					"case-sensitive": true
				},
				{
					"name": "img_alt",
					"aliases": [
						"alt=$1"
					],
					"case-sensitive": true
				},
				{
					"name": "img_baseline",
					"aliases": [
						"baseline"
					],
					"case-sensitive": true
				},
				{
					"name": "img_border",
					"aliases": [
						"border"
					],
					"case-sensitive": true
				},
				{
					"name": "img_bottom",
					"aliases": [
						"bottom"
					],
					"case-sensitive": true
				},
				{
					"name": "img_center",
					"aliases": [
						"center",
						"centre"
					],
					"case-sensitive": true
				},
				{
					"name": "img_class",
					"aliases": [
						"class=$1"
					],
					"case-sensitive": true
				},
				{
					"name": "img_framed",
					"aliases": [
						"frame",
						"framed",
						"enframed"
					],
					"case-sensitive": true
				},
				{
					"name": "img_frameless",
					"aliases": [
						"frameless"
					],
					"case-sensitive": true
				},
				{
					"name": "img_lang",
					"aliases": [
						"lang=$1"
					],
					"case-sensitive": true
				},
				{
					"name": "img_left",
					"aliases": [
						"left"
					],
					"case-sensitive": true
				},
				{
					"name": "img_link",
					"aliases": [
						"link=$1"
					],
					"case-sensitive": true
				},
				{
					"name": "img_manualthumb",
					"aliases": [
						"thumbnail=$1",
						"thumb=$1"
					],
					"case-sensitive": true
				},
				{
					"name": "img_middle",
					"aliases": [
						"middle"
					],
					"case-sensitive": true
				},
				{
					"name": "img_none",
					"aliases": [
						"none"
					],
					"case-sensitive": true
				},
				{
					"name": "img_page",
					"aliases": [
						"page=$1",
						"page $1"
					],
					"case-sensitive": true
				},
				{
					"name": "img_right",
					"aliases": [
						"right"
					],
					"case-sensitive": true
				},
				{
					"name": "img_sub",
					"aliases": [
						"sub"
					],
					"case-sensitive": true
				},
				{
					"name": "img_super",
					"aliases": [
						"super",
						"sup"
					],
					"case-sensitive": true
				},
				{
					"name": "img_text_bottom",
					"aliases": [
						"text-bottom"
					],
					"case-sensitive": true
				},
				{
					"name": "img_text_top",
					"aliases": [
						"text-top"
					],
					"case-sensitive": true
				},
				{
					"name": "img_thumbnail",
					"aliases": [
						"thumb",
						"thumbnail"
					],
					"case-sensitive": true
				},
				{
					"name": "img_top",
					"aliases": [
						"top"
					],
					"case-sensitive": true
				},
				{
					"name": "img_upright",
					"aliases": [
						"upright",
						"upright=$1",
						"upright $1"
					],
					"case-sensitive": true
				},
				{
					"name": "img_width",
					"aliases": [
						"$1px"
					],
					"case-sensitive": true
				},
				{
					"name": "index",
					"aliases": [
						"__INDEX__"
					],
					"case-sensitive": true
				},
				{
					"name": "int",
					"aliases": [
						"INT:"
					],
					"case-sensitive": false
				},
				{
					"name": "interlanguagelink",
					"aliases": [
						"#interlanguagelink"
					],
					"case-sensitive": true
				},
				{
					"name": "interwikilink",
					"aliases": [
						"#interwikilink"
					],
					"case-sensitive": true
				},
				{
					"name": "language",
					"aliases": [
						"#LANGUAGE"
					],
					"case-sensitive": false
				},
				{
					"name": "language_option_bcp47",
					"aliases": [
						"bcp47"
					],
					"case-sensitive": true
				},
				{
					"name": "lc",
					"aliases": [
						"LC:"
					],
					"case-sensitive": false
				},
				{
					"name": "lcfirst",
					"aliases": [
						"LCFIRST:"
					],
					"case-sensitive": false
				},
				{
					"name": "localday",
					"aliases": [
						"LOCALDAY"
					],
					"case-sensitive": true
				},
				{
					"name": "localday2",
					"aliases": [
						"LOCALDAY2"
					],
					"case-sensitive": true
				},
				{
					"name": "localdayname",
					"aliases": [
						"LOCALDAYNAME"
					],
					"case-sensitive": true
				},
				{
					"name": "localdow",
					"aliases": [
						"LOCALDOW"
					],
					"case-sensitive": true
				},
				{
					"name": "localhour",
					"aliases": [
						"LOCALHOUR"
					],
					"case-sensitive": true
				},
				{
					"name": "localmonth",
					"aliases": [
						"LOCALMONTH",
						"LOCALMONTH2"
					],
					"case-sensitive": true
				},
				{
					"name": "localmonth1",
					"aliases": [
						"LOCALMONTH1"
					],
					"case-sensitive": true
				},
				{
					"name": "localmonthabbrev",
					"aliases": [
						"LOCALMONTHABBREV"
					],
					"case-sensitive": true
				},
				{
					"name": "localmonthname",
					"aliases": [
						"LOCALMONTHNAME"
					],
					"case-sensitive": true
				},
				{
					"name": "localmonthnamegen",
					"aliases": [
						"LOCALMONTHNAMEGEN"
					],
					"case-sensitive": true
				},
				{
					"name": "localtime",
					"aliases": [
						"LOCALTIME"
					],
					"case-sensitive": true
				},
				{
					"name": "localtimestamp",
					"aliases": [
						"LOCALTIMESTAMP"
					],
					"case-sensitive": true
				},
				{
					"name": "localurl",
					"aliases": [
						"LOCALURL:"
					],
					"case-sensitive": false
				},
				{
					"name": "localurle",
					"aliases": [
						"LOCALURLE:"
					],
					"case-sensitive": false
				},
				{
					"name": "localweek",
					"aliases": [
						"LOCALWEEK"
					],
					"case-sensitive": true
				},
				{
					"name": "localyear",
					"aliases": [
						"LOCALYEAR"
					],
					"case-sensitive": true
				},
				{
					"name": "lossless",
					"aliases": [
						"LOSSLESS"
					],
					"case-sensitive": false
				},
				{
					"name": "msg",
					"aliases": [
						"MSG:"
					],
					"case-sensitive": false
				},
				{
					"name": "msgnw",
					"aliases": [
						"MSGNW:"
					],
					"case-sensitive": false
				},
				{
					"name": "namespace",
					"aliases": [
						"NAMESPACE"
					],
					"case-sensitive": true
				},
				{
					"name": "namespacee",
					"aliases": [
						"NAMESPACEE"
					],
					"case-sensitive": true
				},
				{
					"name": "namespacenumber",
					"aliases": [
						"NAMESPACENUMBER"
					],
					"case-sensitive": true
				},
				{
					"name": "newsectionlink",
					"aliases": [
						"__NEWSECTIONLINK__"
					],
					"case-sensitive": true
				},
				{
					"name": "nocommafysuffix",
					"aliases": [
						"NOSEP"
					],
					"case-sensitive": false
				},
				{
					"name": "nocontentconvert",
					"aliases": [
						"__NOCONTENTCONVERT__",
						"__NOCC__"
					],
					"case-sensitive": false
				},
				{
					"name": "noeditsection",
					"aliases": [
						"__NOEDITSECTION__"
					],
					"case-sensitive": false
				},
				{
					"name": "nogallery",
					"aliases": [
						"__NOGALLERY__"
					],
					"case-sensitive": false
				},
				{
					"name": "noindex",
					"aliases": [
						"__NOINDEX__"
					],
					"case-sensitive": true
				},
				{
					"name": "nonewsectionlink",
					"aliases": [
						"__NONEWSECTIONLINK__"
					],
					"case-sensitive": true
				},
				{
					"name": "notitleconvert",
					"aliases": [
						"__NOTITLECONVERT__",
						"__NOTC__"
					],
					"case-sensitive": false
				},
				{
					"name": "notoc",
					"aliases": [
						"__NOTOC__"
					],
					"case-sensitive": false
				},
				{
					"name": "ns",
					"aliases": [
						"NS:"
					],
					"case-sensitive": false
				},
				{
					"name": "nse",
					"aliases": [
						"NSE:"
					],
					"case-sensitive": false
				},
				{
					"name": "numberingroup",
					"aliases": [
						"NUMBERINGROUP",
						"NUMINGROUP"
					],
					"case-sensitive": true
				},
				{
					"name": "numberofactiveusers",
					"aliases": [
						"NUMBEROFACTIVEUSERS"
					],
					"case-sensitive": true
				},
				{
					"name": "numberofadmins",
					"aliases": [
						"NUMBEROFADMINS"
					],
					"case-sensitive": true
				},
				{
					"name": "numberofarticles",
					"aliases": [
						"NUMBEROFARTICLES"
					],
					"case-sensitive": true
				},
				{
					"name": "numberofedits",
					"aliases": [
						"NUMBEROFEDITS"
					],
					"case-sensitive": true
				},
				{
					"name": "numberoffiles",
					"aliases": [
						"NUMBEROFFILES"
					],
					"case-sensitive": true
				},
				{
					"name": "numberofpages",
					"aliases": [
						"NUMBEROFPAGES"
					],
					"case-sensitive": true
				},
				{
					"name": "numberofusers",
					"aliases": [
						"NUMBEROFUSERS"
					],
					"case-sensitive": true
				},
				{
					"name": "padleft",
					"aliases": [
						"PADLEFT"
					],
					"case-sensitive": false
				},
				{
					"name": "padright",
					"aliases": [
						"PADRIGHT"
					],
					"case-sensitive": false
				},
				{
					"name": "pageid",
					"aliases": [
						"PAGEID"
					],
					"case-sensitive": false
				},
				{
					"name": "pagelanguage",
					"aliases": [
						"PAGELANGUAGE"
					],
					"case-sensitive": true
				},
				{
					"name": "pagename",
					"aliases": [
						"PAGENAME"
					],
					"case-sensitive": true
				},
				{
					"name": "pagenamee",
					"aliases": [
						"PAGENAMEE"
					],
					"case-sensitive": true
				},
				{
					"name": "pagesincategory",
					"aliases": [
						"PAGESINCATEGORY",
						"PAGESINCAT"
					],
					"case-sensitive": true
				},
				{
					"name": "pagesincategory_all",
					"aliases": [
						"all"
					],
					"case-sensitive": false
				},
				{
					"name": "pagesincategory_files",
					"aliases": [
						"files"
					],
					"case-sensitive": false
				},
				{
					"name": "pagesincategory_pages",
					"aliases": [
						"pages"
					],
					"case-sensitive": false
				},
				{
					"name": "pagesincategory_subcats",
					"aliases": [
						"subcats"
					],
					"case-sensitive": false
				},
				{
					"name": "pagesinnamespace",
					"aliases": [
						"PAGESINNAMESPACE:",
						"PAGESINNS:"
					],
					"case-sensitive": true
				},
				{
					"name": "pagesize",
					"aliases": [
						"PAGESIZE"
					],
					"case-sensitive": true
				},
				{
					"name": "plural",
					"aliases": [
						"PLURAL:"
					],
					"case-sensitive": false
				},
				{
					"name": "protectionexpiry",
					"aliases": [
						"PROTECTIONEXPIRY"
					],
					"case-sensitive": true
				},
				{
					"name": "protectionlevel",
					"aliases": [
						"PROTECTIONLEVEL"
					],
					"case-sensitive": true
				},
				{
					"name": "raw",
					"aliases": [
						"RAW:"
					],
					"case-sensitive": false
				},
				{
					"name": "rawsuffix",
					"aliases": [
						"R"
					],
					"case-sensitive": true
				},
				{
					"name": "redirect",
					"aliases": [
						"#REDIRECT"
					],
					"case-sensitive": false
				},
				{
					"name": "revisionday",
					"aliases": [
						"REVISIONDAY"
					],
					"case-sensitive": true
				},
				{
					"name": "revisionday2",
					"aliases": [
						"REVISIONDAY2"
					],
					"case-sensitive": true
				},
				{
					"name": "revisionid",
					"aliases": [
						"REVISIONID"
					],
					"case-sensitive": true
				},
				{
					"name": "revisionmonth",
					"aliases": [
						"REVISIONMONTH"
					],
					"case-sensitive": true
				},
				{
					"name": "revisionmonth1",
					"aliases": [
						"REVISIONMONTH1"
					],
					"case-sensitive": true
				},
				{
					"name": "revisionsize",
					"aliases": [
						"REVISIONSIZE"
					],
					"case-sensitive": true
				},
				{
					"name": "revisiontimestamp",
					"aliases": [
						"REVISIONTIMESTAMP"
					],
					"case-sensitive": true
				},
				{
					"name": "revisionuser",
					"aliases": [
						"REVISIONUSER"
					],
					"case-sensitive": true
				},
				{
					"name": "revisionyear",
					"aliases": [
						"REVISIONYEAR"
					],
					"case-sensitive": true
				},
				{
					"name": "rootpagename",
					"aliases": [
						"ROOTPAGENAME"
					],
					"case-sensitive": true
				},
				{
					"name": "rootpagenamee",
					"aliases": [
						"ROOTPAGENAMEE"
					],
					"case-sensitive": true
				},
				{
					"name": "safesubst",
					"aliases": [
						"SAFESUBST:"
					],
					"case-sensitive": false
				},
				{
					"name": "scriptpath",
					"aliases": [
						"SCRIPTPATH"
					],
					"case-sensitive": false
				},
				{
					"name": "server",
					"aliases": [
						"SERVER"
					],
					"case-sensitive": false
				},
				{
					"name": "servername",
					"aliases": [
						"SERVERNAME"
					],
					"case-sensitive": false
				},
				{
					"name": "sitename",
					"aliases": [
						"SITENAME"
					],
					"case-sensitive": true
				},
				{
					"name": "special",
					"aliases": [
						"special"
					],
					"case-sensitive": false
				},
				{
					"name": "speciale",
					"aliases": [
						"speciale"
					],
					"case-sensitive": false
				},
				{
					"name": "staticredirect",
					"aliases": [
						"__STATICREDIRECT__"
					],
					"case-sensitive": true
				},
				{
					"name": "stylepath",
					"aliases": [
						"STYLEPATH"
					],
					"case-sensitive": false
				},
				{
					"name": "subjectpagename",
					"aliases": [
						"SUBJECTPAGENAME",
						"ARTICLEPAGENAME"
					],
					"case-sensitive": true
				},
				{
					"name": "subjectpagenamee",
					"aliases": [
						"SUBJECTPAGENAMEE",
						"ARTICLEPAGENAMEE"
					],
					"case-sensitive": true
				},
				{
					"name": "subjectspace",
					"aliases": [
						"SUBJECTSPACE",
						"ARTICLESPACE"
					],
					"case-sensitive": true
				},
				{
					"name": "subjectspacee",
					"aliases": [
						"SUBJECTSPACEE",
						"ARTICLESPACEE"
					],
					"case-sensitive": true
				},
				{
					"name": "subpagename",
					"aliases": [
						"SUBPAGENAME"
					],
					"case-sensitive": true
				},
				{
					"name": "subpagenamee",
					"aliases": [
						"SUBPAGENAMEE"
					],
					"case-sensitive": true
				},
				{
					"name": "subst",
					"aliases": [
						"SUBST:"
					],
					"case-sensitive": false
				},
				{
					"name": "tag",
					"aliases": [
						"tag"
					],
					"case-sensitive": false
				},
				{
					"name": "talkpagename",
					"aliases": [
						"TALKPAGENAME"
					],
					"case-sensitive": true
				},
				{
					"name": "talkpagenamee",
					"aliases": [
						"TALKPAGENAMEE"
					],
					"case-sensitive": true
				},
				{
					"name": "talkspace",
					"aliases": [
						"TALKSPACE"
					],
					"case-sensitive": true
				},
				{
					"name": "talkspacee",
					"aliases": [
						"TALKSPACEE"
					],
					"case-sensitive": true
				},
				{
					"name": "toc",
					"aliases": [
						"__TOC__"
					],
					"case-sensitive": false
				},
				{
					"name": "uc",
					"aliases": [
						"UC:"
					],
					"case-sensitive": false
				},
				{
					"name": "ucfirst",
					"aliases": [
						"UCFIRST:"
					],
					"case-sensitive": false
				},
				{
					"name": "urlencode",
					"aliases": [
						"URLENCODE:"
					],
					"case-sensitive": false
				},
				{
					"name": "url_path",
					"aliases": [
						"PATH"
					],
					"case-sensitive": false
				},
				{
					"name": "url_query",
					"aliases": [
						"QUERY"
					],
					"case-sensitive": false
				},
				{
					"name": "url_wiki",
					"aliases": [
						"WIKI"
					],
					"case-sensitive": false
				},
				{
					"name": "userlanguage",
					"aliases": [
						"USERLANGUAGE"
					],
					"case-sensitive": true
				}
			],
			"interwikimap": [
				{
					"prefix": "acronym",
					"url": "https://www.acronymfinder.com/~/search/af.aspx?string=exact&Acronym=$1",
					"protorel": false
				},
				{
					"prefix": "arxiv",
					"url": "https://www.arxiv.org/abs/$1",
					"protorel": false
				},
				{
					"prefix": "c2",
					"url": "https://wiki.c2.com/?$1",
					"protorel": false
				},
				{
					"prefix": "commons",
					"url": "https://commons.wikimedia.org/wiki/$1",
					"protorel": false,
					"api": "https://commons.wikimedia.org/w/api.php"
				},
				{
					"prefix": "dictionary",
					"url": "https://www.dict.org/bin/Dict?Database=*&Form=Dict1&Strategy=*&Query=$1",
					"protorel": false
				},
				{
					"prefix": "doi",
					"url": "https://dx.doi.org/$1",
					"protorel": false
				},
				{
					"prefix": "elibre",
					"url": "http://enciclopedia.us.es/index.php/$1",
					"protorel": false,
					"api": "http://enciclopedia.us.es/api.php"
				},
				{
					"prefix": "emacswiki",
					"url": "https://www.emacswiki.org/emacs/$1",
					"protorel": false
				},
				{
					"prefix": "fandom",
					"url": "https://community.fandom.com/wiki/w:c:$1",
					"protorel": false
				},
				{
					"prefix": "foldoc",
					"url": "https://foldoc.org/?$1",
					"protorel": false
				},
				{
					"prefix": "freebsdman",
					"url": "https://www.FreeBSD.org/cgi/man.cgi?apropos=1&query=$1",
					"protorel": false
				},
				{
					"prefix": "google",
					"url": "https://www.google.com/search?q=$1",
					"protorel": false
				},
				{
					"prefix": "googlegroups",
					"url": "https://groups.google.com/groups?q=$1",
					"protorel": false
				},
				{
					"prefix": "hammondwiki",
					"url": "https://www.dairiki.org/HammondWiki/$1",
					"protorel": false
				},
				{
					"prefix": "hrwiki",
					"url": "http://www.hrwiki.org/wiki/$1",
					"protorel": false,
					"api": "http://www.hrwiki.org/w/api.php"
				},
				{
					"prefix": "imdb",
					"url": "https://www.imdb.com/find?q=$1&tt=on",
					"protorel": false
				},
				{
					"prefix": "lojban",
					"url": "https://mw.lojban.org/papri/$1",
					"protorel": false
				},
				{
					"prefix": "meatball",
					"url": "http://meatballwiki.org/wiki/$1",
					"protorel": false
				},
				{
					"prefix": "mediawikiwiki",
					"url": "https://www.mediawiki.org/wiki/$1",
					"protorel": false,
					"api": "https://www.mediawiki.org/w/api.php"
				},
				{
					"prefix": "memoryalpha",
					"url": "https://memory-alpha.fandom.com/wiki/$1",
					"protorel": false,
					"api": "https://memory-alpha.fandom.com/api.php"
				},
				{
					"prefix": "metawikimedia",
					"url": "https://meta.wikimedia.org/wiki/$1",
					"protorel": false,
					"api": "https://meta.wikimedia.org/w/api.php"
				},
				{
					"prefix": "mozillawiki",
					"url": "https://wiki.mozilla.org/$1",
					"protorel": false,
					"api": "https://wiki.mozilla.org/api.php"
				},
				{
					"prefix": "mw",
					"url": "https://www.mediawiki.org/wiki/$1",
					"protorel": false,
					"api": "https://www.mediawiki.org/w/api.php"
				},
				{
					"prefix": "oeis",
					"url": "https://oeis.org/$1",
					"protorel": false
				},
				{
					"prefix": "pmid",
					"url": "https://www.ncbi.nlm.nih.gov/pubmed/$1?dopt=Abstract",
					"protorel": false
				},
				{
					"prefix": "pythoninfo",
					"url": "https://wiki.python.org/moin/$1",
					"protorel": false
				},
				{
					"prefix": "rfc",
					"url": "https://datatracker.ietf.org/doc/html/rfc$1",
					"protorel": false
				},
				{
					"prefix": "senseislibrary",
					"url": "https://senseis.xmp.net/?$1",
					"protorel": false
				},
				{
					"prefix": "shoutwiki",
					"url": "https://www.shoutwiki.com/wiki/$1",
					"protorel": false,
					"api": "https://www.shoutwiki.com/w/api.php"
				},
				{
					"prefix": "theopedia",
					"url": "https://www.theopedia.com/$1",
					"protorel": false
				},
				{
					"prefix": "tmbw",
					"url": "https://www.tmbw.net/wiki/$1",
					"protorel": false,
					"api": "https://tmbw.net/wiki/api.php"
				},
				{
					"prefix": "twiki",
					"url": "https://twiki.org/cgi-bin/view/$1",
					"protorel": false
				},
				{
					"prefix": "uncyclopedia",
					"url": "https://en.uncyclopedia.co/wiki/$1",
					"protorel": false,
					"api": "https://en.uncyclopedia.co/w/api.php"
				},
				{
					"prefix": "usemod",
					"url": "https://www.usemod.org/cgi-bin/wiki.pl?$1",
					"protorel": false
				},
				{
					"prefix": "wikia",
					"url": "https://community.fandom.com/wiki/w:c:$1",
					"protorel": false
				},
				{
					"prefix": "wikibooks",
					"url": "https://en.wikibooks.org/wiki/$1",
					"protorel": false,
					"api": "https://en.wikibooks.org/w/api.php"
				},
				{
					"prefix": "wikidata",
					"url": "https://www.wikidata.org/wiki/$1",
					"protorel": false,
					"api": "https://www.wikidata.org/w/api.php"
				},
				{
					"prefix": "wikihow",
					"url": "https://www.wikihow.com/$1",
					"protorel": false,
					"api": "https://www.wikihow.com/api.php"
				},
				{
					"prefix": "wikimedia",
					"url": "https://foundation.wikimedia.org/wiki/$1",
					"protorel": false,
					"api": "https://foundation.wikimedia.org/w/api.php"
				},
				{
					"prefix": "wikinews",
					"url": "https://en.wikinews.org/wiki/$1",
					"protorel": false,
					"api": "https://en.wikinews.org/w/api.php"
				},
				{
					"prefix": "wikipedia",
					"url": "https://en.wikipedia.org/wiki/$1",
					"protorel": false,
					"api": "https://en.wikipedia.org/w/api.php"
				},
				{
					"prefix": "wikiquote",
					"url": "https://en.wikiquote.org/wiki/$1",
					"protorel": false,
					"api": "https://en.wikiquote.org/w/api.php"
				},
				{
					"prefix": "wikisource",
					"url": "https://wikisource.org/wiki/$1",
					"protorel": false,
					"api": "https://wikisource.org/w/api.php"
				},
				{
					"prefix": "wikispecies",
					"url": "https://species.wikimedia.org/wiki/$1",
					"protorel": false,
					"api": "https://species.wikimedia.org/w/api.php"
				},
				{
					"prefix": "wikiversity",
					"url": "https://en.wikiversity.org/wiki/$1",
					"protorel": false,
					"api": "https://en.wikiversity.org/w/api.php"
				},
				{
					"prefix": "wikivoyage",
					"url": "https://en.wikivoyage.org/wiki/$1",
					"protorel": false,
					"api": "https://en.wikivoyage.org/w/api.php"
				},
				{
					"prefix": "wikiwikiweb",
					"url": "http://wiki.c2.com/?$1",
					"protorel": false
				},
				{
					"prefix": "wikt",
					"url": "https://en.wiktionary.org/wiki/$1",
					"protorel": false,
					"api": "https://en.wiktionary.org/w/api.php"
				},
				{
					"prefix": "wiktionary",
					"url": "https://en.wiktionary.org/wiki/$1",
					"protorel": false,
					"api": "https://en.wiktionary.org/w/api.php"
				}
			],
			"namespaces": {
				"-2": {
					"id": -2,
					"case": "first-letter",
					"name": "Media",
					"subpages": false,
					"canonical": "Media",
					"content": false,
					"nonincludable": false
				},
				"-1": {
					"id": -1,
					"case": "first-letter",
					"name": "Special",
					"subpages": false,
					"canonical": "Special",
					"content": false,
					"nonincludable": false
				},
				"0": {
					"id": 0,
					"case": "first-letter",
					"name": "",
					"subpages": false,
					"content": true,
					"nonincludable": false
				},
				"1": {
					"id": 1,
					"case": "first-letter",
					"name": "Talk",
					"subpages": true,
					"canonical": "Talk",
					"content": false,
					"nonincludable": false
				},
				"2": {
					"id": 2,
					"case": "first-letter",
					"name": "User",
					"subpages": true,
					"canonical": "User",
					"content": false,
					"nonincludable": false
				},
				"3": {
					"id": 3,
					"case": "first-letter",
					"name": "User talk",
					"subpages": true,
					"canonical": "User talk",
					"content": false,
					"nonincludable": false
				},
				"4": {
					"id": 4,
					"case": "first-letter",
					"name": "Wikipedia",
					"subpages": true,
					"canonical": "Project",
					"content": false,
					"nonincludable": false
				},
				"5": {
					"id": 5,
					"case": "first-letter",
					"name": "Wikipedia talk",
					"subpages": true,
					"canonical": "Project talk",
					"content": false,
					"nonincludable": false
				},
				"6": {
					"id": 6,
					"case": "first-letter",
					"name": "File",
					"subpages": false,
					"canonical": "File",
					"content": false,
					"nonincludable": false
				},
				"7": {
					"id": 7,
					"case": "first-letter",
					"name": "File talk",
					"subpages": true,
					"canonical": "File talk",
					"content": false,
					"nonincludable": false
				},
				"8": {
					"id": 8,
					"case": "first-letter",
					"name": "MediaWiki",
					"subpages": true,
					"canonical": "MediaWiki",
					"content": false,
					"nonincludable": false,
					"namespaceprotection": "editinterface"
				},
				"9": {
					"id": 9,
					"case": "first-letter",
					"name": "MediaWiki talk",
					"subpages": true,
					"canonical": "MediaWiki talk",
					"content": false,
					"nonincludable": false
				},
				"10": {
					"id": 10,
					"case": "first-letter",
					"name": "Template",
					"subpages": true,
					"canonical": "Template",
					"content": false,
					"nonincludable": false
				},
				"11": {
					"id": 11,
					"case": "first-letter",
					"name": "Template talk",
					"subpages": true,
					"canonical": "Template talk",
					"content": false,
					"nonincludable": false
				},
				"12": {
					"id": 12,
					"case": "first-letter",
					"name": "Help",
					"subpages": true,
					"canonical": "Help",
					"content": false,
					"nonincludable": false
				},
				"13": {
					"id": 13,
					"case": "first-letter",
					"name": "Help talk",
					"subpages": true,
					"canonical": "Help talk",
					"content": false,
					"nonincludable": false
				},
				"14": {
					"id": 14,
					"case": "first-letter",
					"name": "Category",
					"subpages": false,
					"canonical": "Category",
					"content": false,
					"nonincludable": false
				},
				"15": {
					"id": 15,
					"case": "first-letter",
					"name": "Category talk",
					"subpages": true,
					"canonical": "Category talk",
					"content": false,
					"nonincludable": false
				}
			},
			"namespacealiases": [
				{
					"id": 6,
					"alias": "Image"
				},
				{
					"id": 7,
					"alias": "Image talk"
				}
			]
		}
	};
	/* eslint-enable @stylistic/comma-dangle */
}