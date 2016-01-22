[![Travis Status][trav_img]][trav_site]
[![Coverage Status][cov_img]][cov_site]

Builder Initializer
===================

Initialize projects from [builder][] archetypes.


## Installation

Install this package as a global dependency.

```sh
$ npm install -g builder-init
```

Although we generally disfavor global installs, this tool _creates_ new projects
from scratch, so you have to start somewhere...


## Usage

`builder-init` can initialize any package that `npm` can
[install](https://docs.npmjs.com/cli/install), including npm, GitHub, file, etc.

Invocation:

```sh
$ builder-init [flags] <archetype>
```

Flags:

```
  --help
  --version
```

Examples:

```sh
$ builder-init builder-react-component
$ builder-init builder-react-component@0.1.3
$ builder-init FormidableLabs/builder-react-component
$ builder-init FormidableLabs/builder-react-component#v0.1.3
$ builder-init git+ssh://git@github.com:FormidableLabs/builder-react-component.git
$ builder-init git+ssh://git@github.com:FormidableLabs/builder-react-component.git#v0.1.3
$ builder-init /FULL/PATH/TO/builder-react-component
```

Internally, `builder-init` utilizes [`npm pack`](https://docs.npmjs.com/cli/pack)
to download (but not install) an archetype package from npm, GitHub, file, etc.
There is a slight performance penalty for things like local files which have to
be compressed and then expanded again, but we gain the very nice benefit of
allowing `builder-init` to install anything `npm` can in exactly the same
manner that `npm` does.

### Installing from a Relative Path on the Local Filesystem

One exception to the "install like `npm` does" rule is installation from the
**local filesystem**. Internally, `builder-init` creates a temporary directory
to expand the download from `npm pack` and executes the process in that
directory, meaning that relative paths to a target archetype are now incorrect.

Accordingly, if you _want_ to simulate a relative path install, you can try
something like:

```sh
# Mac / Linunx
$ builder-init "${PWD}/../builder-react-component"

# Windows
$ builder-init "%cd%\..\builder-react-component"
```


## Archetype Templates

Authoring a templates for an archetype consists of adding the following to your
archetype source:

* **`init.js`**: A control file for user prompts and data. See, e.g.,
  [`builder-react-component/blob/master/init.js`](https://github.com/FormidableLabs/builder-react-component/blob/master/init.js)
* **`init/`**: A directory of templates to inflate during initialization. See, e.g.,
  [`builder-react-component/blob/master/init/`](https://github.com/FormidableLabs/builder-react-component/blob/master/init)

### Archetype Data

Archetypes provide data for template expansion via an `init.js` file in the
root of the archetype. The structure of the file is:

```js
module.exports = {
  prompts: // Questions and responses for the user
  derived: // Other fields derived from the data provided by the user
};
```

#### User Prompts

User prompts and responses are ingested using [inquirer][]. The `prompts` field
of the `init.js` object can either be an _array_ or _object_ of inquirer
[question objects][inq-questions]. For example:

```js
module.exports = {
  prompts: [
    {
      name: "name",
      message: "What is your name?",
      validate: function (val) {
        // Validate functions return `true` if valid.
        // If invalid, return `false` or an error message.
        return !!val.trim() || "Must enter a name!";
      }
    },
    {
      name: "quest",
      message: "What is your quest?"
    }
  ]
};
```

`builder-init` provides a short-cut of placing the `name` field as the key
value for a `prompts` object instead of an array:

```js
module.exports = {
  prompts: {
    name: {
      message: "What is your name?",
      validate: function (val) { return !!val.trim() || "Must enter a name!"; }
    },
    quest: {
      message: "What is your quest?"
    }
  }
};
```

**Note - Async**: Inquirer has some nice features, one of which is enabling
functions like `validate` to become async by using `this.async()`. For
example:

```js
name: {
  message: "What is your name?",
  validate: function (val) {
    var done = this.async();

    // Let's wait a second.
    setTimeout(function () {
      done(!!val.trim() || "Must enter a name!")
    }, 1000);
  }
}
```

#### Derived Data

Archetype authors may not wish to expose _all_ data for user input. Thus,
`builder-init` supports a simple bespoke scheme for taking the existing user
data and adding derived fields.

The `derived` field of the `init.js` object is an object of functions with
the signature:

```js
derived: {
  // - `data`     All existing data from user prompts.
  // - `callback` Callback of form `(error, derivedData)`
  upperName: function (data, cb) {
    // Uppercase the existing `name` data.
    cb(null, data.name.toUpperCase());
  }
}
```

### Special Data and Scenarios

#### `.npmignore`, `.gitignore`

**The Problem**

The `.npmignore` and `.gitignore` files in an `init/` templates directory are
critical to the correct publishing / git lifecyle of a created project. However,
publishing `init/` to npm as part of publishing the archetype and even
initializing off of a local file path via `npm pack` does not work well with
the basic layout of:

```
init/
  .gitignore
  .npmignore
```

The problem is that the `.npmignore` affects and filters out files that will
be available for template use in an undesirable fashion. For example, in
`builder-react-component` which has an `.npmignore` which includes:

```
demo
test
.editor*
.travis*
```

we would end up following template files excluded by natural `npm` processes:

```
init/.editorconfig
init/.travis.yml
init/test/client/main.js
init/test/client/spec/components/{{componentPath}}.spec.jsx
init/test/client/test.html
init/demo/app.jsx
init/demo/index.html
```

Adding even more complexity to the situation is the fact that if `npm` doesn't
find a `.npmignore` on publishing or `npm pack` it will rename `.gitignore` to
`.npmignore`.

**The Solution**

To address this, we have special `derived` values built in by default to
`builder-init`. You do _not_ need to add them to your `init.js`:

* `{{gitignore}}` -> `.gitignore`
* `{{npmignore}}` -> `.npmignore`

In your archetype `init` directory you should add either / both of these files
with the following names instead of their real ones:

```
init/
  {{gitignore}}
  {{npmignore}}
```

As a side note for your git usage, this now means that `init/.gitignore` doesn't
control the templates anymore and your archetype's root `.gitignore` must
appropriately ignore files in `init/` for git commits.

### Templates Directory Ingestion

`builder-init` mostly just walks the `init/` directory of an archetype looking
for any files with the following features:

* An empty / non-existent `init/` directory is allowed, although nothing will
  be written out.
* If an `init/.gitignore` file is found, the files matched in the templates
  directory will be filtered to ignore any `.gitignore` glob matches. This
  filtering is done at _load_ time before file name template strings are
  expanded (in case that matters).

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
[inquirer]: https://github.com/SBoudrias/Inquirer.js
[inq-questions]: https://github.com/SBoudrias/Inquirer.js#question
[trav_img]: https://api.travis-ci.org/FormidableLabs/builder-init.svg
[trav_site]: https://travis-ci.org/FormidableLabs/builder-init
[cov_img]: https://img.shields.io/coveralls/FormidableLabs/builder-init.svg
[cov_site]: https://coveralls.io/r/FormidableLabs/builder-init
