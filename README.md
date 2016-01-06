[![Travis Status][trav_img]][trav_site]
[![Coverage Status][cov_img]][cov_site]

Builder Initializer
===================

A project generator for [builder][] archetypes.

## Installation

Install this package as a global dependency.

```sh
$ npm install -g builder-init
```

Although we generally disfavor global installs, this tool _creates_ new projects
from scratch, so you have to start somewhere...

## Usage

```
TODO: Add usage, documentation.
https://github.com/FormidableLabs/builder-init/issues/6
```


## Templates

### Application

Presently, _all_ files in the `init/` directory of an archetype are parsed as
templates. We will reconsider this over time if escaping the template syntax
becomes problematic.

### Template Parsing

`builder-init` uses Lodash templates, with the following customizations:

* ERB-style templates are the only supported format. The new ES-style template
  strings are disabled because the underlying processed code is likely to
  include JS code with ES templates.
* HTML escaping by default is disabled so that we can easily process `<`, `>`,
  etc. symbols in JS.

The Lodash templates documentation can be found at:
https://github.com/lodash/lodash/blob/master/lodash.js#L12302-L12365

And, here's a quick refresher:

**Variables**

```js
var compiled = _.template("Hi <%= user %>!");
console.log(compiled({ user: "Bob" }));
// => "Hi Bob!"
```

```js
var compiled = _.template(
  "Hi <%= _.map(users, function (u) { return u.toUpperCase(); }).join(\", \") %>!");
console.log(compiled({ users: ["Bob", "Sally"] }));
// => Hi BOB, SALLY!
```

**JavaScript Interpolation**

```js
var compiled = _.template(
  "Hi <% _.each(users, function (u, i) { %>" +
    "<%- i === 0 ? '' : ', ' %>" +
    "<%- u.toUpperCase() %>" +
  "<% }); %>!");
console.log(compiled({ users: ["Bob", "Sally"] }));
// => Hi BOB, SALLY!
```

### File Name Parsing

In addition file _content_, `builder-init` also interpolates and parses file
_names_ using an alternate template parsing scheme, inspired by Mustache
templates. (The rationale for this is that ERB syntax is not file-system
compliant on all OSes).

So, if we have data: `packageName: "whiz-bang-component"` and want to create
a file-system path:

```
src/components/whiz-bang-component.jsx
```

The source archetype should contain a full file path like:

```
init/src/components/{{packageName}}.jsx
```

`builder-init` will validate the expanded file tokens to detect clashes with
other static file names provided by the generator.


[builder]: https://github.com/FormidableLabs/builder
[trav_img]: https://api.travis-ci.org/FormidableLabs/builder-init.svg
[trav_site]: https://travis-ci.org/FormidableLabs/builder-init
[cov_img]: https://img.shields.io/coveralls/FormidableLabs/builder-init.svg
[cov_site]: https://coveralls.io/r/FormidableLabs/builder-init
