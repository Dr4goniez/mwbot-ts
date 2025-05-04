# mwbot-ts

[![npm version](https://img.shields.io/npm/v/mwbot-ts.svg)](https://www.npmjs.com/package/mwbot-ts)
[![GitHub License](https://img.shields.io/github/license/Dr4goniez/mwbot-ts)](https://github.com/Dr4goniez/mwbot-ts)
![node-current](https://img.shields.io/node/v/mwbot-ts)

[🐙 GitHub](https://github.com/Dr4goniez/mwbot-ts) - [📦 npm](https://www.npmjs.com/package/mwbot-ts) - [📘 API Documentation](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html)

*In code examples in this guide and the API documentation, `Mwbot` refers to the **class**, while the lowercase `mwbot` refers to an **instance** of the class.*

<hr>

**mwbot-ts** is a MediaWiki bot framework for Node.js that works with both JavaScript and TypeScript. It offers a highly customizable core class and a bot-friendly wikitext parser for common operations. Portions of the source code are adapted from [mwbot](https://github.com/gesinn-it-pub/mwbot), [mwn](https://github.com/siddharthvp/mwn), [types-mediawiki](https://github.com/wikimedia-gadgets/types-mediawiki), and [MediaWiki core](https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/refs/heads/master).

**Main features**:

* Supports all core authentication methods: `OAuth 2.0`, `OAuth 1.0a`, and `BotPasswords`. Anonymous access is also supported for non-write requests.
* Uses [Axios](https://axios-http.com/) to perform HTTP requests, with responses automatically normalized to a consistent JSON format (`{"formatversion": "2"}` is enabled by default). For full control, the <code>[rawRequest](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#rawrequest)</code> method is also available.
* Automatically handles common MediaWiki API complexities, such as converting boolean values into a PHP-compatible format, optimizing request headers to reduce bandwidth usage, managing the `maxlag` parameter for server load (default: 5 seconds), and retrying failed HTTP requests under appropriate conditions. See also [mw:API:Data formats](https://www.mediawiki.org/wiki/API:Data_formats) and [mw:API:Etiquette](https://www.mediawiki.org/wiki/API:Etiquette).
* Fetches and caches edit tokens automatically. POST requests for database *write* operations can be made via <code>[postWithToken](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#postwithtoken)</code> or <code>[postWithCsrfToken](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#postwithcsrftoken)</code>, which closely mirror the functionality of MediaWiki’s built-in `mediawiki.Api` module.
* Manages intervals between write requests automatically. By default, the framework enforces at least a 5-second gap between successful `action=edit`, `action=move`, and `action=upload` requests, relieving clients of manual throttling.
* Built around an extensible core class, `Mwbot`, which is designed to be subclassed — making it easy to implement shared logic, custom workflows, or application-specific behavior.
* Handles HTTP request errors in a unified manner via the [MwbotError](#error-handling) class, with [all internal error codes documented](https://dr4goniez.github.io/mwbot-ts/interfaces/MwbotError.MwbotErrorCodes.html) for easy debugging.
* Provides an intuitive wikitext parser for common bot operations, such as modifying template parameters and replacing wikilink targets. This functionality is centralized in the [Wikitext](#wikitext-parser) class.
* [A production bot running on Japanese Wikipedia](https://github.com/Dr4goniez/dragobot) is available as a reference implementation of this framework.

To install the package, run:
```bash
npm install mwbot-ts
```

[![Download stats](https://nodei.co/npm/mwbot-ts.png?downloads=true&downloadRank=true)](https://nodei.co/npm/mwbot-ts/)

<details>
<summary><big><b>Table of contents:</b></big></summary>

1. [The core class](#the-core-class)
    1. [Create an instance](#create-an-instance)
    2. [Request methods](#request-methods)
        1. [Basic request methods](#basic-request-methods)
        2. [Utility request methods](#utility-request-methods)
        3. [Token-related methods](#token-related-methods)
        4. [Edit-related methods](#edit-related-methods)
        5. [Other utility methods](#other-utility-methods)
    3. [Extend the class](#extend-the-class)
2. [Error handling](#error-handling)
3. [Wikitext parser](#wikitext-parser)
4. [Other classes and accessors](#other-classes-and-accessors)
    1. [mwbot.Title](#mwbottitle)
    2. [mwbot.config](#mwbotconfig)
    3. [Mwbot.Util](#mwbotutil)
    4. [Mwbot.String](#mwbotstring)
    5. [Template-related classes](#template-related-classes)
    6. [Wikilink-related classes](#wikilink-related-classes)

</details>

## The core class
`mwbot-ts` exports three primary values (along with several types and interfaces):
* [Mwbot](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html) - The core class, which centralizes all auxiliary functionality.
* [MwbotError](#error-handling) - A class for standardized error handling.
* `MWBOT_VERSION` - A constant that stores the package version.

### Create an instance
To create a new `Mwbot` instance, use the static method [Mwbot.init](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#init). This method serves as the entry point for all initialization processes: It sets the API endpoint, defines default request parameters, validates login credentials or OAuth consumer secrets, fetches the site's metadata, and prepares all site-info-dependent auxiliary classes.

<details>
<summary>Mwbot.init:</summary>

```ts
import { Mwbot } from 'mwbot-ts';

Mwbot.init(initOptions, defaultRequestOptions).then((mwbot) => {
  // Use `mwbot` for your purposes...
});
```

</details>

The `Mwbot.init` method requires a [MwbotInitOptions](https://dr4goniez.github.io/mwbot-ts/types/Mwbot.MwbotInitOptions.html) object, which consists of [MwbotOptions](https://dr4goniez.github.io/mwbot-ts/interfaces/Mwbot.MwbotOptions.html) and [Credentials](https://dr4goniez.github.io/mwbot-ts/types/Mwbot.Credentials.html). This object is used to initialize default instance options and authentication credentials:

<details>
<summary>MwbotInitOptions:</summary>

```ts
import { Mwbot, MwbotInitOptions } from 'mwbot-ts';

const initOptions: MwbotInitOptions = {
  /**
   * The API endpoint. This property is required.
   */
  apiUrl: 'https://en.wikipedia.org/w/api.php', // Required
  /**
   * User agent for the application. Typed as optional, but should always be included
   * per https://www.mediawiki.org/wiki/API:Etiquette#The_User-Agent_header
   */
  userAgent: 'MyCoolBot/1.0.0 (https://github.com/Foo/MyCoolBot)', // Example
  /**
   * Default interval (in milliseconds) between specific actions.
   */
  interval: 5000, // Defaults to 5 seconds; optional
  /**
   * API actions between which to enforce an interval.
   */
  intervalActions: ['edit', 'move', 'upload'], // Defaults to these 3; optional
  /**
   * Whether to suppress warnings returned by the API.
   */
  suppressWarnings: false, // Defaults to false

  // One of the following must be provided for authentification:
  credentials: {
    oAuth2AccessToken: 'Your OAuth 2.0 access token'
  },
  credentials: {
    consumerToken: 'Your OAuth 1.0a consumer token',
    consumerSecret: 'Your OAuth 1.0a consumer secret',
    accessToken: 'Your OAuth 1.0a access token',
    accessSecret: 'Your OAuth 1.0a access secret'
  },
  credentials: {
    username: 'Your bot username',
    password: 'Your bot password'
  },
  credentials: {
    anonymous: true // For anonymous access; the client will be limited to non-write requests
  }
};

Mwbot.init(initOptions).then((mwbot) => {
  // Use `mwbot` for your purposes...
});
```

</details>

For full flexibility, `MwbotOptions` can later be updated using the [setMwbotOptions](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#setmwbotoptions) method. However, altering `apiUrl` after initialization is not recommended, as `mwbot` instances depend on site-specific metadata. As a best practice, limit the use of this method to updating interval-related options, and consider creating a new instance instead.

The second argument of `Mwbot.init` is a [MwbotRequestConfig](https://dr4goniez.github.io/mwbot-ts/interfaces/Mwbot.MwbotRequestConfig.html) object, which is an extension of the [Axios request config](https://axios-http.com/docs/req_config). If provided, this configuration will be applied to every HTTP request made using the instance. See also [Mwbot.defaultRequestOptions](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#defaultrequestoptions) for default settings.

<details>
<summary>Additional notes:</summary>

In general, there is no need to set custom request configurations. The following options, in particular, should not be altered unless you know exactly what you’re doing:

(Properties of `MwbotRequestConfig`)
* `method` - Use `GET` for read-only requests whenever possible. `POST` is not cacheable and may be routed to a distant datacenter in multi-datacenter setups (such as Wikimedia sites).
* `headers['Content-Type']` - The MediaWiki API only supports [<code>application/x-www-form-urlencoded</code> and <code>multipart/form-data</code>](https://www.mediawiki.org/wiki/API:Data_formats#Input). The framework selects the appropriate content type automatically.
* `headers['Accept-Encoding']` - Handles data compression to [optimize bandwidth usage](https://www.mediawiki.org/wiki/API:Etiquette#Request_limit).
* `params.format` - Should always be `'json'`, as [all other formats have been deprecated or removed](https://www.mediawiki.org/wiki/API:Data_formats#Output). `mwbot-ts` enforces this by throwing an error if the specification is missing.
* `params.formatversion` - The framework assumes `{"formatversion": "2"}` to define types and interfaces. Changing this breaks type expectations and offers no benefit.
* `responseType` - Should be left unchanged, as with `params.format`; otherwise, it may cause an `invalidjson` error.
* `responseEncoding` - Modifying this may cause garbled text unless handled carefully.

</details>

### Request methods
#### Basic request methods
For basic API calls, `mwbot-ts` provides the [<code>get</code>](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#get) and [<code>post</code>](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#post) methods, both built on the method-neutral [<code>request</code>](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#request) method. For read-only queries with long parameters, the [<code>nonwritePost</code>](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#nonwritePost) method serves as a POST-based alternative to `get`, helping avoid [<code>414 URI Too Long</code>](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/414) errors. For full control over requests, use [<code>rawRequest</code>](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#rawRequest). To cancel all in-flight requests, use [<code>abort</code>](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#abort).

<details>
<summary>get</summary>

```ts
// Use for standard GET-based queries (read-only, short parameters)
mwbot.get({
  action: 'query',
  titles: 'Wikipedia:Sandbox',
  prop: 'info',
  format: 'json',
  formatversion: '2'
})
.then(console.log);
```

</details>

<details>
<summary>post</summary>

```ts
// Use for standard write operations or when POST is required
mwbot.post({
  action: 'purge',
  titles: 'Wikipedia:Sandbox',
  format: 'json',
  formatversion: '2'
})
.then(console.log);
```

</details>

<details>
<summary>nonwritePost</summary>

```ts
// Use when GET would exceed URL limits
mwbot.nonwritePost({
  action: 'query',
  list: 'blocks',
  bkusers: [/* very long field */], // Note: `mwbot-ts` accepts array inputs
  bklimit: 'max',
  format: 'json',
  formatversion: '2'
})
.then(console.log);
```

</details>

<details>
<summary>rawRequest</summary>

```ts
// Performs a raw HTTP GET request to an arbitrary external API
const res = await mwbot.rawRequest({
  method: 'GET',
  url: 'https://api.github.com/repos/nodejs/node',
  headers: {
    'User-Agent': `mwbot-ts/${MWBOT_VERSION} (https://github.com/Dr4goniez/mwbot-ts)`
  },
  timeout: 10000,
  responseType: 'json'
});

console.log(res.data.full_name); // "nodejs/node"
```

</details>

<details>
<summary>abort</summary>

```ts
// Cancels all ongoing HTTP requests issued by this instance
mwbot.abort();
```

</details>

#### Utility request methods
The [continuedRequest](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#continuedrequest) method simplifies handling [API continuation](https://www.mediawiki.org/wiki/API:Continue). It returns a `Promise` that resolves to a single merged API response instead of an array, allowing you to process the result as if you had made just one request:

<details>
<summary>continuedRequest</summary>

```ts
// Performs an API request with automatic continuation
// By default, the maximum number of continuations is 10
mwbot.continuedRequest({
  action: 'query',
  list: 'logevents',
  leprop: 'ids|title|timestamp',
  letype: 'newusers',
  lelimit: 'max',
  format: 'json',
  formatversion: '2'
})
.then(console.log); // Merged object response
```

</details>

The [massRequest](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#massrequest) method makes it easier to work with API parameters that accept multiple values. It automatically splits long fields into batches and bundles the results for you (see also the [apilimit](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#apilimit) getter):

<details>
<summary>massRequest</summary>

```ts
// Performs batched API requests when a multi-value field exceeds the limit
// Automatically splits the field and bundles the responses
mwbot.massRequest({
  action: 'query',
  list: 'blocks',
  bkprop: 'user|timestamp|expiry|restrictions|flags',
  bklimit: 'max',
  bkusers: [/* very long field */],
  format: 'json',
  formatversion: '2'
}, 'bkusers')
.then(console.log); // Array response
```

</details>

#### Token-related methods
When working with the MediaWiki API, handling tokens for database *write* actions can be tedious: you need to manage cookies and sessions, fetch a token in one request, and include it in a subsequent write request — while ensuring the request method and encoding are correct. The [postWithToken](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#postwithtoken) method automates this process. It caches tokens for you and appends the required `token` property to your request parameters:

<details>
<summary>postWithToken</summary>

```ts
// Example for using a "watch" token
mwbot.postWithToken('watch', {
  action: 'watch',
  titles: 'Wikipedia:Sandbox',
  format: 'json',
  formatversion: '2',
  // `token` parameter automatically appended
})
.then(console.log);
```

</details>

See also [postWithCsrfToken](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#postwithcsrftoken), a shorthand method for the commonly used `csrf` token.

#### Edit-related methods
`mwbot-ts` provides the following four methods for editing pages:
* [create](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#create) - Creates a new page. If the page already exists, the `Promise` is rejected with an `articleexists` error. There's no need to pre-check for existence.
* [save](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#save) - Saves a content to an existing page. By default, it rejects if the page does not exist.
* [newSection](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#newsection) - Adds a new section to a page.
* [edit](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#edit) - Fetches the latest revision of a page, applies a transformation function, and submits the modified content. **Automatically handles edit conflicts up to 3 times**.

All of these methods return a `Promise` that resolves with an [ApiResponseEditSuccess](https://dr4goniez.github.io/mwbot-ts/types/Mwbot.ApiResponseEditSuccess.html) object or rejects with a `MwbotError` (see [#Error handling](#error-handling)). When the `Promise` resolves, the `result` field is always `'Success'`, and all other cases are handled with a rejection. In other words, there is no need to inspect the response object to verify whether the edit succeeded: When `then()` is called, that's a success, and when `catch()` is called, that's a failure.

<details>
<summary>ApiResponseEditSuccess</summary>

```
{
  new: true,
  result: 'Success', // This will NEVER be anything but 'Success'
  pageid: 165499,
  title: 'Bar',
  contentmodel: 'wikitext',
  oldrevid: 0,
  newrevid: 654607,
  newtimestamp: '2025-04-15T11:32:49Z',
  watched: true
}
```

</details>

<details>
<summary>create</summary>

```ts
// Creates a page titled 'Bar'
mwbot.create(
  'Bar',            // Page title
  '* Test. --~~~~', // Page content
  'test'            // Optional edit summary
)
.then(console.log);
```

</details>

<details>
<summary>save</summary>

```ts
// Edits an existing page titled 'Foo' and replaces its entire content
mwbot.save(
  'Foo',            // The page title
  '* Test. --~~~~', // The page content
  'test'            // Optional edit summary
)
.then(console.log);
```

</details>

<details>
<summary>newSection</summary>

```ts
// Adds a new section to page 'Foo'
mwbot.newSection(
  'Foo',              // The page title
  'Bot notice',       // The section title
  'Hi. ~~~~',         // The section content
  'Bot: Notification' // Optional edit summary
)
.then(console.log);
```

</details>

<details>
<summary>edit</summary>

```ts
// Edits 'Bar' by transforming the existing content
mwbot.edit(
  'Bar',
  (wikitext, revision) => {
    const newContent = wikitext.content + '\n* Test. --~~~~';
    return { text: newContent }; // Parameters to `action=edit`
  }
)
.then(console.log);
```

</details>

To handle edit failures, all you need to do is:

<details>
<summary>Handling edit failures</summary>

```ts
import { MwbotError } from 'mwbot-ts';

// ...

const response = await mwbot.save(...args).catch((err: MwbotError) => err);
if (response instanceof MwbotError) {
  if (response.code !== 'aborted') {
    console.error(response); // MwbotError object
  }
} else {
  console.log(response); // ApiResponseEditSuccess
}
```

</details>

#### Other utility methods
`mwbot-ts` also provides helper methods for common tasks, while intentionally keeping the core API minimal. Versatile utility methods may be added on request, and such requests are always welcome.😊

<details>
<summary>parse</summary>

```ts
// Run the parser via the API
mwbot.parse({
  page: 'WP:SAND',
  redirects: true,
  prop: 'sections'
});
```

</details>

<details>
<summary>purge</summary>

```ts
// Purges the server-side cache for the specified page(s)
mwbot.purge(['Wikipedia:Sandbox', 'Wikipedia_talk:Sandbox']);
```

</details>

<details>
<summary>read</summary>

```ts
// Reads the content of a single page
mwbot.read('Wikipedia:Sandbox');
```
```ts
// Reads the contents of multiple pages
mwbot.read(['Wikipedia:Sandbox', 'Wikipedia_talk:Sandbox']);
```

</details>

### Extend the class
Different bot operators have different needs, and it's common to define custom functions using native framework methods. For example, a quick way to check whether a page exists might look like this:

<details>
<summary>Implement an <code>exists()</code> function</summary>

```ts
const exists = async (title: string): Promise<boolean> => {
  // mwbot.read() rejects if the page doesn't exist
  const res = await mwbot.read(title).catch(() => false);
  return !!res; // true if the page exists; otherwise false
};
```

</details>

This works, but it comes with a few limitations:
* You need to manually pass around an initialized `mwbot` instance, especially if the function lives in a separate module.
* Native methods aren't always the most efficient for your specific needs. In this case, `mwbot.read()` fetches the entire page content, which is overkill if you only want to check existence.

A more scalable and idiomatic solution is to extend the `Mwbot` class. Subclassing lets you define custom behavior as instance methods while preserving access to all built-in functionality and internal configuration. You avoid wiring up external helpers and instead encapsulate logic cleanly within the class.

<details>
<summary>Implement an <code>exists()</code> <i>method</i></summary>

```ts
import { Mwbot } from 'mwbot-ts';

class Mwbot2 extends Mwbot {

  /**
   * Checks if the given page exists. Returns `null` if the request fails.
   * @param title
   */
  exists(title: string): Promise<boolean | null> {
    return this.get({
      action: 'query',
      titles: title,
      format: 'json',
      formatversion: '2'
    }).then((res) => {
      const page = res.query?.pages?.[0];
      return page ? !page.missing : null;
    }).catch(() => null);
  }

}

Mwbot2.init(initOptions).then(async (mwbot) => {

  // ✓ Fully type-safe, no TypeScript errors
  const sandExists = await mwbot.exists('Wikipedia:Sandbox');
  console.log(sandExists);

  // ✓ Superclass methods and properties are still accessible
  console.log(mwbot.config.get('wgNamespaceIds'));

});
```

> **Note**: The `exists()` method above is intended as **a simple example**. In production, it should also account for false positives. For instance, if the input title is invalid, the response may lack a `missing` property, leading this method to incorrectly return `true` (see [this example](https://en.wikipedia.org/w/api.php?action=query&formatversion=2&&titles={)).

</details>

Extending the class also allows you to optimize or customize default request behavior. For example, if you'd like your `purge()` call to include the [<code>forcerecursivelinkupdate</code>](https://www.mediawiki.org/wiki/API:Purge#purge:forcerecursivelinkupdate) parameter by default, you can define your own specialized method:

<details>
<summary>Implement a <code>purgeDeep()</code> method</summary>

```ts
class Mwbot2 extends Mwbot {

  purgeDeep(
    titles: (string | Title)[],
    additionalParams: ApiParams = {},
    requestOptions: MwbotRequestConfig = {}
  ) {
    additionalParams = Object.assign(
      { forcerecursivelinkupdate: true },
      additionalParams
    );
    return this.purge(titles, additionalParams, requestOptions);
  }

}
```

</details>

> **Tip**: When extending the class, always choose unique method names. Avoid overriding built-in methods, as some rely on others internally.<br>If you're using TypeScript, it's highly recommended to enable the `noImplicitOverride` option in your `tsconfig.json`. This ensures you’ll get a compile-time error if you accidentally reuse a name that already exists, or is added in a version update.

## Error handling
`mwbot-ts` uses a custom error class named [MwbotError](https://dr4goniez.github.io/mwbot-ts/classes/MwbotError.MwbotError.html) to standardize error handling. When [Mwbot](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html)'s request methods reject with an error, they **always** return an instance of `MwbotError` with a full stack trace.

This design addresses a key shortcoming of the original `mwbot` framework — that is, it was often unclear what properties an error object would contain. In contrast, `MwbotError` instances always include a `code` and `info` property, closely mirroring the error structure used by MediaWiki’s built-in `mediawiki.Api` module when returning API error responses.

<details>
<summary>For example:</summary>

```ts
mwbot.post({
  action: 'edit',
  title: 'Wikipedia:Sandbox',
  appendtext: '\n* Test. --~~~~',
  format: 'json',
  formatversion: '2'
})
.catch(console.error);
```
```
MwbotError: The "token" parameter must be set.
    at Function.newFromResponse (W:\Programming\Git\home\mwbot-ts\src\MwbotError.ts:119:10)
    at Mwbot._request (W:\Programming\Git\home\mwbot-ts\src\Mwbot.ts:1062:27)
    at processTicksAndRejections (node:internal/process/task_queues:95:5) {
  type: 'api',
  code: 'missingparam',
  info: 'The "token" parameter must be set.',
  data: {
    error: {
      docref: 'See https://ja.wikipedia.org/w/api.php for API usage. Subscribe to the mediawiki-api-announce mailing list at &lt;https://lists.wikimedia.org/postorius/lists/mediawiki-api-announce.lists.wikimedia.org/&gt; for notice of API deprecations and breaking changes.'
    }
  }
}
```

</details>

The `type` property categorizes the error source:

 * `'api'`: An error originating directly from the MediaWiki API.
 * `'api_mwbot'`: An error defined internally by `mwbot-ts`, such as generic HTTP errors returned from Axios.
 * `'fatal'`: A logic or implementation error occurring within the client itself.

Given this consistent structure, a single `catch` block can gracefully handle virtually any error:

<details>
<summary>Error handling with <code>Promise.prototype.catch</code>:</summary>

```ts
import { MwbotError } from 'mwbot-ts';

// ...

const response = await mwbot.request(params).catch((err: MwbotError) => err);
if (response instanceof MwbotError) {
  if (response.code !== 'aborted') {
    console.error(response); // MwbotError object
  }
} else {
  console.log(response); // JSON response
}
```

</details>

For a complete list of possible error codes, refer to the [MwbotErrorCodes](https://dr4goniez.github.io/mwbot-ts/interfaces/MwbotError.MwbotErrorCodes.html) documentation.

## Wikitext parser
The [Wikitext](https://dr4goniez.github.io/mwbot-ts/interfaces/Wikitext.WikitextStatic.html) class, accesible via `mwbot.Wikitext`, facilitates common bot operations involving wikitext parsing. It currently supports five types of wiki markup:

* `<tag></tag>`
* `== section ==`
* `{{{parameter}}}`
* `{{template}}`, including (double-braced) [magic words](https://www.mediawiki.org/wiki/Help:Magic_words) and [parser functions](https://www.mediawiki.org/wiki/Help:Extension:ParserFunctions).
* `[[wikilink]]`

For each markup type, the class provides `parse**` and `modify**` methods, where `**` denotes the type (e.g., [<code>parseTemplates</code>](https://dr4goniez.github.io/mwbot-ts/interfaces/Wikitext.Wikitext.html#parsetemplates)).

To create a new instance, use the constructor or the static [newFromTitle](https://dr4goniez.github.io/mwbot-ts/interfaces/Wikitext.Wikitext.html#parsetemplates) method, which fetches the content of a page and returns a `Promise` resolving to a `Wikitext` instance:

<details>
<summary><code>Wikitext.constructor</code></summary>

```ts
const wikitext = new mwbot.Wikitext('some wikitext');
```

</details>

<details>
<summary><code>Wikitext.newFromTitle</code></summary>

```ts
const wikitext = await mwbot.Wikitext.newFromTitle('Wikipedia:Sandbox');
```

</details>

The parsing and modification methods are available as instance methods:

<details>
<summary><code>wikitext.parseTags</code></summary>

```ts
const text =
  'My name is <b>Foo</b><!-- not "Bar"! -->.\n' +
  'You can ping me using <nowiki>{{PingFoo}}</nowiki>.';

const wikitext = new mwbot.Wikitext(text);
console.log(wikitext.parseTags());
```
```
[
  [Object: null prototype] {
    name: 'b',
    text: [Getter],
    start: '<b>',
    content: 'Foo',
    end: '</b>',
    startIndex: 11,
    endIndex: 21,
    nestLevel: 0,
    void: false,
    unclosed: false,
    selfClosing: false,
    skip: false,
    index: 0,
    parent: null,
    children: Set(0) {}
  },
  [Object: null prototype] {
    name: '!--',
    text: [Getter],
    start: '<!--',
    content: ' not "Bar"! ',
    end: '-->',
    startIndex: 21,
    endIndex: 40,
    nestLevel: 0,
    void: false,
    unclosed: false,
    selfClosing: false,
    skip: false,
    index: 1,
    parent: null,
    children: Set(0) {}
  },
  [Object: null prototype] {
    name: 'nowiki',
    text: [Getter],
    start: '<nowiki>',
    content: '{{PingFoo}}',
    end: '</nowiki>',
    startIndex: 64,
    endIndex: 92,
    nestLevel: 0,
    void: false,
    unclosed: false,
    selfClosing: false,
    skip: false,
    index: 2,
    parent: null,
    children: Set(0) {}
  }
]
```

</details>

<details>
<summary><code>wikitext.parseSections</code></summary>

```ts
const text =
  '== Foo ==\n' +
  '=== Bar ===\n' +
  '[[Main page]]\n' +
  '== Baz ==\n' +
  '[[Another page]]';

const wikitext = new mwbot.Wikitext(text);
console.log(wikitext.parseSections());
```
```
[
  [Object: null prototype] {
    heading: '',
    title: 'top',
    level: 1,
    index: 0,
    startIndex: 0,
    endIndex: 0,
    content: '',
    text: [Getter],
    parent: null,
    children: Set(0) {}
  },
  [Object: null prototype] {
    heading: '== Foo ==\n',
    title: 'Foo',
    level: 2,
    index: 1,
    startIndex: 0,
    endIndex: 36,
    content: '=== Bar ===\n[[Main page]]\n',
    text: [Getter],
    parent: null,
    children: Set(1) { 2 }
  },
  [Object: null prototype] {
    heading: '=== Bar ===\n',
    title: 'Bar',
    level: 3,
    index: 2,
    startIndex: 10,
    endIndex: 36,
    content: '[[Main page]]\n',
    text: [Getter],
    parent: 1,
    children: Set(0) {}
  },
  [Object: null prototype] {
    heading: '== Baz ==\n',
    title: 'Baz',
    level: 2,
    index: 3,
    startIndex: 36,
    endIndex: 62,
    content: '[[Another page]]',
    text: [Getter],
    parent: null,
    children: Set(0) {}
  }
]
```

</details>

<details>
<summary><code>wikitext.parseParameters</code></summary>

```ts
const text =
  '{{#if:{{{1|}}}\n' +
  '<!--|{{{type}}}-->' +
  '|{{{1}}}\n' +
  '|{{{2|empty}}}\n' +
  '}}';

const wikitext = new mwbot.Wikitext(text);
console.log(wikitext.parseParameters());
```
```
[
  [Object: null prototype] {
    key: '1',
    value: '',
    text: '{{{1|}}}',
    index: 0,
    startIndex: 6,
    endIndex: 14,
    nestLevel: 0,
    skip: false,
    parent: null,
    children: Set(0) {}
  },
  [Object: null prototype] {
    key: 'type',
    value: null,
    text: '{{{type}}}',
    index: 1,
    startIndex: 20,
    endIndex: 30,
    nestLevel: 0,
    skip: true,
    parent: null,
    children: Set(0) {}
  },
  [Object: null prototype] {
    key: '1',
    value: null,
    text: '{{{1}}}',
    index: 2,
    startIndex: 34,
    endIndex: 41,
    nestLevel: 0,
    skip: false,
    parent: null,
    children: Set(0) {}
  },
  [Object: null prototype] {
    key: '2',
    value: 'empty',
    text: '{{{2|empty}}}',
    index: 3,
    startIndex: 43,
    endIndex: 56,
    nestLevel: 0,
    skip: false,
    parent: null,
    children: Set(0) {}
  }
]
```

</details>

<details>
<summary><code>wikitext.parseTemplates</code></summary>

```ts
const text =
  '{{Foo\n' +
  '|anchor={{#if:{{ns:0}}|Foo|Bar}}\n' +
  '|logo=[[File:Img.png|thumb|Mr. [[Foo]]|300px]]\n' +
  '}}';

const wikitext = new mwbot.Wikitext(text);
console.dir(wikitext.parseTemplates(), {depth: null});
```
```
[
  ParsedTemplate {
    title: Title {
      namespace: 10,
      title: 'Foo',
      fragment: null,
      colon: '',
      interwiki: '',
      local_interwiki: false
    },
    params: [Object: null prototype] {
      anchor: {
        key: 'anchor',
        value: '{{#if:{{ns:0}}|Foo|Bar}}',
        text: [Getter],
        unnamed: false,
        duplicates: []
      },
      logo: {
        key: 'logo',
        value: '[[File:Img.png|thumb|Mr. [[Foo]]|300px]]',
        text: [Getter],
        unnamed: false,
        duplicates: []
      }
    },
    rawTitle: 'Foo\n',
    text: '{{Foo\n' +
      '|anchor={{#if:{{ns:0}}|Foo|Bar}}\n' +
      '|logo=[[File:Img.png|thumb|Mr. [[Foo]]|300px]]\n' +
      '}}',
    index: 0,
    startIndex: 0,
    endIndex: 88,
    nestLevel: 0,
    skip: false,
    parent: null,
    children: Set(1) { 1 }
  },
  ParsedParserFunction {
    params: [ '{{ns:0}}', 'Foo', 'Bar' ],
    hook: '#if:',
    canonicalHook: '#if:',
    rawHook: '#if:',
    text: '{{#if:{{ns:0}}|Foo|Bar}}',
    index: 1,
    startIndex: 14,
    endIndex: 38,
    nestLevel: 1,
    skip: false,
    parent: 0,
    children: Set(2) { 1, 2 }
  },
  ParsedParserFunction {
    params: [ '0' ],
    hook: 'ns:',
    canonicalHook: 'ns:',
    rawHook: 'ns:',
    text: '{{ns:0}}',
    index: 2,
    startIndex: 20,
    endIndex: 28,
    nestLevel: 2,
    skip: false,
    parent: 1,
    children: Set(0) {}
  }
]
```
</details>

<details>
<summary><code>wikitext.parseWikilinks</code></summary>

```ts
const text =
  '[[File:Img.png|thumb|right|300px]]\n' +
  "'''Foo''' is a [[metasyntactic variable]]<!--[[metavariable]]-->.";

const wikitext = new mwbot.Wikitext(text);
console.dir(wikitext.parseWikilinks(), {depth: null});
```
```
[
  ParsedFileWikilink {
    params: [ 'thumb', 'right', '300px' ],
    title: Title {
      namespace: 6,
      title: 'Img.png',
      fragment: null,
      colon: '',
      interwiki: '',
      local_interwiki: false
    },
    rawTitle: 'File:Img.png',
    text: '[[File:Img.png|thumb|right|300px]]',
    index: 0,
    startIndex: 0,
    endIndex: 34,
    nestLevel: 0,
    skip: false,
    parent: null,
    children: Set(0) {}
  },
  ParsedWikilink {
    title: Title {
      namespace: 0,
      title: 'Metasyntactic_variable',
      fragment: null,
      colon: '',
      interwiki: '',
      local_interwiki: false
    },
    rawTitle: 'metasyntactic variable',
    text: '[[metasyntactic variable]]',
    index: 1,
    startIndex: 50,
    endIndex: 76,
    nestLevel: 0,
    skip: false,
    parent: null,
    children: Set(0) {}
  },
  ParsedWikilink {
    title: Title {
      namespace: 0,
      title: 'Metavariable',
      fragment: null,
      colon: '',
      interwiki: '',
      local_interwiki: false
    },
    rawTitle: 'metavariable',
    text: '[[metavariable]]',
    index: 2,
    startIndex: 80,
    endIndex: 96,
    nestLevel: 0,
    skip: true,
    parent: null,
    children: Set(0) {}
  }
]
```

</details>

In many cases, you can skip calling the parsing methods:
* You can use the corresponding `modify**` methods directly, which internally call the appropriate `parse**` method and apply a transformation via a callback function. Each callback receives one element from the parsed array.
* You can call a modification method from inside the callback function of [<code>mwbot.edit()</code>](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#edit) (referred to as "[transformation predicate](https://dr4goniez.github.io/mwbot-ts/types/Mwbot.TransformationPredicate.html)"), which takes a `Wikitext` instance as its first argument.

<details>
<summary><code>wikitext.modifyTags</code></summary>

```ts
// Example: Remove empty <noinclude> tags from "Wikipedia:Sandbox"
const result = await mwbot.edit('Wikipedia:Sandbox', (wikitext) => {

  const oldContent = wikitext.content;
  const newContent = wikitext.modifyTags((tag, _i, _arr) => {
    const isEmptyNoinclude =
      tag.name === 'noinclude' &&
      // Ignore e.g., <nowiki><noinclude></noinclude></nowiki>
      !tag.skip &&
      // Ignore <noinclude />
      !tag.selfClosing &&
      // Eliminate uncertainty
      !tag.unclosed &&
      // Has no content or only whitespace
      !tag.content?.trim();

    // A string return indicates "replace `tag.text` with this value";
    // `null` means no change.
    return isEmptyNoinclude ? '' : null;
  });

  if (oldContent === newContent) {
    // A tranformation predicate returning `null` will cancel the edit
    // via a Promise rejection with an "aborted" error code
    console.log('Edit cancelled.');
    return null;
  }

  // Return API parameters for `action=edit`
  // Partial specification is acceptable because `edit()` provides default parameters
  return { text: newContent };

}).catch((err: MwbotError) => err);

// Uniform error handling
if (result instanceof MwbotError) {
  if (result.code !== 'aborted') {
    console.error(result); // Failure
  }
} else {
  console.log(result); // Success
}
```

</details>

<details>
<summary><code>wikitext.modifySections</code></summary>

```ts
// Example: Insert {{Section resolved}} to the beginning of second-level sections
const text =
  '== Foo ==<!--\n-->\n' +
  '* Foo. --~~~~\n' +
  '=== Foo2 ===\n' +
  '* Foo2. --~~~~\n' +
  '== Bar ==\n' +
  '* Bar. --~~~~\n' +
  '== Baz ==\n' +
  '* Baz. --~~~~';

const wikitext = new mwbot.Wikitext(text);
const content = wikitext.modifySections((section) => {
  // Do not modify sections that are not level 2
  if (section.level !== 2) {
    return null;
  }

  // Check whether the section heading ends with a newline; if not, add one
  const newline = section.heading.endsWith('\n') ? '' : '\n';

  // Insert the template between the heading and the content
  return section.heading + newline + '{{Section resolved|1=~~~~}}\n' + section.content;
});
console.log(content);
```
```
== Foo ==<!--
-->
{{Section resolved|1=~~~~}}
* Foo. --~~~~
=== Foo2 ===
* Foo2. --~~~~
== Bar ==
{{Section resolved|1=~~~~}}
* Bar. --~~~~
== Baz ==
{{Section resolved|1=~~~~}}
* Baz. --~~~~
```

</details>

<details>
<summary><code>wikitext.modifyParameters</code></summary>

```ts
// Rename {{{1}}} to {{{User}}}
const text =
  '{{#if:{{{1|}}}\n' +
  '|{{{1}}}\n' +
  '|{{{Ip|Foo}}}\n' +
  '}}';

const wikitext = new mwbot.Wikitext(text);
const content = wikitext.modifyParameters((parameter) => {
  if (parameter.key === '1' && !parameter.skip) {
    const value = parameter.value !== null ? '|' + parameter.value : '';
    return '{{{User' + value + '}}}';
  } else {
    return null;
  }
});
console.log(content);
```
```
{{#if:{{{User|}}}
|{{{User}}}
|{{{Ip|Foo}}}
}}
```

</details>

<details>
<summary><code>wikitext.modifyTemplates</code></summary>

```ts
// Add "|done" to {{Status}} and leave a bot comment
const text =
  '=== Global lock for Foo ===\n' +
  '{{Status}}\n' +
  '*{{LockHide|1=Foo}}\n' +
  'Long-term abuse. [[User:Bar|Bar]] ([[User talk:Bar|talk]]) 00:00, 1 January 2025 (UTC)';

const wikitext = new mwbot.Wikitext(text);

// Modify {{Status}}
let status: ParsedTemplate | null = null;
let content = wikitext.modifyTemplates((template) => {
  if (status) {
    return null;
  }
  const isStatus =
    mwbot.Template.is(template, 'ParsedTemplate') &&
    template.title.getPrefixedDb() === 'Template:Status' &&
    !template.skip;
  if (isStatus) {
    status = template;
    return template
      .insertParam('1', 'done', true, 'end')
      .stringify({suppressKeys: ['1']});
  }
  return null;
});
if (status === null) {
  return;
}

// Leave a bot comment
const containingSection = wikitext.identifySection(status);
if (!containingSection) {
  return;
}
content = wikitext.modifySections((section) => {
  if (section.index === containingSection.index) {
    return section.text.trim() + "\n: '''Robot clerk note:''' {{done}} by Baz. ~~~~\n";
  }
  return null;
});

console.log(content);
```
```
=== Global lock for Foo ===
{{Status|done}}
*{{LockHide|1=Foo}}
Long-term abuse. [[User:Bar|Bar]] ([[User talk:Bar|talk]]) 00:00, 1 January 2025 (UTC)
: '''Robot clerk note:''' {{done}} by Baz. ~~~~

```

</details>

<details>
<summary><code>wikitext.modifyWikilinks</code></summary>

```ts
// Replace all instances of [[Category:Foo]] with [[Category:Bar]]
const text =
  'This category belongs to [[:Category:Foo]].\n' +
  '[[Category:Foo|*]]';

const wikitext = new mwbot.Wikitext(text);
const NS_CATEGORY = mwbot.config.get('wgNamespaceIds').category;

const content = wikitext.modifyWikilinks((link) => {
  const isFoo =
    mwbot.Wikilink.is(link, 'ParsedWikilink') &&
    link.title.getNamespaceId() === NS_CATEGORY && link.title.getMain() === 'Foo' &&
    !link.skip;
  if (isFoo) {
    const colon = link.title.hadLeadingColon() ? ':' : '';
    link.setTitle(colon + 'Category:Bar'); // Preserve the leading colon, if present
    return link.stringify();
  }
  return null;
});
console.log(content);
```
```
This category belongs to [[:Category:Bar]].
[[Category:Bar|*]]
```

</details>

<details>
<summary>Notes on nested markups</summary>

When a modifying markup has another markup (of the same type) nested within it, modifications can end up overwriting changes made to the parent markup. To handle this safely, use the `context` object, which is passed as the fourth argument to the `ModificationPredicate`:

<details>
<summary>Nested markup showcases</summary>

```ts
// Showcase 1
const text = '{{Foo|1={{Bar}}}}';
const wikitext = new mwbot.Wikitext(text);
const newContent = wikitext.modifyTemplates((temp, i) => {
  if (i === 0) {
    return (temp as ParsedTemplate).insertParam('1', 'My name is Foo.').stringify();
    // Replaces the entire first parameter of {{Foo}} with "My name is Foo.",
    // removing the original nested {{Bar}} entirely.
    // Result: {{Foo|1=My name is Foo.}}
  } else {
    return (temp as ParsedTemplate).insertParam('1', 'bar').stringify();
    // Modifies the inner {{Bar}} template by inserting 1=bar.
    // Result: {{Bar|1=bar}}

    // Then, this modified {{Bar}} is reinserted into {{Foo}} as its first parameter.
    // Because the original {{Bar}} and the string "My name" are both 7 characters long,
    // the replacement keeps the trailing " is Foo." from the previous call.

    // So, the final output is:
    // => {{Foo|1={{Bar|1=bar}} is Foo.}}
  }
});
console.log(newContent); // {{Foo|1={{Bar|1=bar}} is Foo.}}
```
```ts
// Showcase 2: Demonstrating parent-child template modification with context awareness
const text = '{{Foo|1={{Bar}}}}';
const wikitext = new mwbot.Wikitext(text);
const newContent = wikitext.modifyTemplates((temp, i, _arr, context) => {
  if (i === 0) {
    return (temp as ParsedTemplate).insertParam('1', 'My name is Foo.').stringify();
    // This modifies the outer {{Foo}} template by replacing its first parameter value.
    // The original value `{{Bar}}` is entirely replaced with the string "My name is Foo."
    // => {{Foo|1=My name is Foo.}}

    // As a result, the inner {{Bar}} is no longer present in the final wikitext.
    // Therefore, there's no point in modifying {{Bar}} separately.
  }

  // Only modify {{Bar}} if it was not overwritten by its parent.
  else if (!context.touched) {
    return (temp as ParsedTemplate).insertParam('1', 'bar').stringify();
    // This would modify {{Bar}} into {{Bar|1=bar}}, but in this case it won't happen,
    // because the parent {{Foo}} was already modified and discarded the original {{Bar}}.
  }

  return null; // No change
});

console.log(newContent); // Output: {{Foo|1=My name is Foo.}}
```

</details>

</details>

## Other classes and accessors
### mwbot.Title
A class that parses MediaWiki page titles into an object structure, adapted and expanded from the native [`mediawiki.Title`](https://doc.wikimedia.org/mediawiki-core/master/js/mw.Title.html) module.

This extended class is accessible via [mwbot.Title](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#title) (an instance member), and provides support for parsing interwiki titles — a feature exclusive to `mwbot-ts`.

### mwbot.config
Mirrors the native [`mw.config`](https://www.mediawiki.org/wiki/Manual:Interface/JavaScript#mw.config), which provides access to MediaWiki's `wg`-configuration variables. While site and user information initialized by `Mwbot.init` can be accessed via [`mwbot.info`](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#info), [`mwbot.config`](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#config) further simplifies handling this data by relieving clients of the burden of normalizing the relevant objects.

<details>
<summary>Example usage of <code>mwbot.config</code></summary>

```ts
const config = mwbot.config;
console.log(config.get('wgFormattedNamespaces'));
console.log(config.get('wgUserRights')); // This key is exclusive to mwbot-ts
```

</details>

See [ConfigData](https://dr4goniez.github.io/mwbot-ts/interfaces/Mwbot.ConfigData.html) for available keys.

### Mwbot.Util
A class that exports the framework's internal utility functions for use by the client, accessible via [`Mwbot.Util`](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#util) (a static member).

This class should not be confused with the native [`mediawiki.util`](https://doc.wikimedia.org/mediawiki-core/master/js/module-mediawiki.util.html) module. Note that `mwbot-ts` uses the npm package [`ip-wiki`](https://www.npmjs.com/package/ip-wiki?activeTab=readme) for IP string normalization. `Mwbot.Util` does not handle this on its own. Since the package is registered as a dependency, you do not need to install it separately; you can directly require or import `ip-wiki` for manipulating IP and CIDR addresses.

### Mwbot.String
A class that provides functions for string manipulation, accessible via [`Mwbot.String`](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#string) (a static member). It is a copy of the native [`mediawiki.String`](https://doc.wikimedia.org/mediawiki-core/master/js/module-mediawiki.String.html) module, included to support the functionality of `mwbot.Title`.

### Template-related classes
`{{double-braced}}` wiki markups can be constructed as objects using [`mwbot.Template`](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#template) and [`mwbot.ParserFunction`](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#parserfunction), which are lazy-loaded instance members.
* `mwbot.Template`: Parses `{{template}}` markups into an object structure.
* `mwbot.ParserFunction`: Parses `{{#function}}` markups into an object structure.

### Wikilink-related classes
`[[double-bracketed]]` wiki markups can be constructed as objects using [`mwbot.Wikilink`](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#wikilink) and [`mwbot.FileWikilink`](https://dr4goniez.github.io/mwbot-ts/classes/Mwbot.Mwbot.html#filewikilink), which are lazy-loaded instance members.
* `mwbot.Wikilink`: Parses non-file `[[wikilink]]` markups into an object structure.
* `mwbot.FileWikilink`: Parses file `[[wikilink]]` markups into an object structure.