[![Travis Status][trav_img]][trav_site]
[![Coverage Status][cov_img]][cov_site]

Builder Initializer
===================

Initialize projects from [builder][] archetypes.


<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Usage](#usage)
  - [Installing from a Relative Path on the Local Filesystem](#installing-from-a-relative-path-on-the-local-filesystem)
  - [Automating Prompts](#automating-prompts)
- [Archetype Templates](#archetype-templates)
  - [Archetype Data](#archetype-data)
    - [Imports and Dependencies](#imports-and-dependencies)
    - [User Prompts](#user-prompts)
    - [Derived Data](#derived-data)
  - [Special Data and Scenarios](#special-data-and-scenarios)
    - [`.npmignore`, `.gitignore`](#npmignore-gitignore)
    - [`<archetype>/package.json`, `<archetype>/dev/package.json`](#archetypepackagejson-archetypedevpackagejson)
  - [Templates Directory Ingestion](#templates-directory-ingestion)
  - [Template Parsing](#template-parsing)
  - [File Name Parsing](#file-name-parsing)
- [Tips, Tricks, & Notes](#tips-tricks-&-notes)
  - [npmrc File](#npmrc-file)
- [Archetype Development Guide](#archetype-development-guide)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

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
  --prompts
```

Examples:

```sh
$ builder-init builder-react-component
$ builder-init builder-react-component@0.2.0
$ builder-init FormidableLabs/builder-react-component
$ builder-init FormidableLabs/builder-react-component#v0.2.0
$ builder-init git+ssh://git@github.com:FormidableLabs/builder-react-component.git
$ builder-init git+ssh://git@github.com:FormidableLabs/builder-react-component.git#v0.2.0
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
# Mac / Linux
$ builder-init "${PWD}/../builder-react-component"

# Windows
$ builder-init "%cd%\..\builder-react-component"
```

### Automating Prompts

To facilitate automation, notably testing an archetype by generating a project
with `builder-init` and running the project's tests as part of CI, there is a
special `--prompts=JSON_OBJECT` flag that skips the actual input prompts and
injects fields straight from a JSON object.

```sh
$ builder-init <archetype> \
  --prompts'{"name":"bob","quest":"popcorn","destination":"my-project"}'
```

Note that _all_ required fields must be provided in the JSON object, no defaults
are used, and the init process will fail if there are any missing fields.
**Tip**: You will need a `destination` value, which is added to all prompts.

A working example is available at:
[`builder-react-component/.travis.yml`](https://github.com/FormidableLabs/builder-react-component/blob/master/.travis.yml)
which initializes the archetype's templates for a fresh project with canned
`--prompts` values, npm installs dependencies, then runs the same `builder`
tasks used in the project's CI.


## Archetype Templates

Authoring templates for an archetype consists of adding the following to your
archetype source:

* **`init.js`**: A control file for user prompts and data. See, e.g.,
  [`builder-react-component/blob/master/init.js`](https://github.com/FormidableLabs/builder-react-component/blob/master/init.js)
* **`init/`**: A directory of templates to inflate during initialization. See, e.g.,
  [`builder-react-component/blob/master/init/`](https://github.com/FormidableLabs/builder-react-component/blob/master/init)

For example, in `builder-react-component`, we have a control file and templates
as follows:

```
init.js
init/
  .babelrc
  .builderrc
  .editorconfig
  .travis.yml
  CONTRIBUTING.md
  demo/app.jsx
  demo/index.html
  LICENSE.txt
  package.json
  README.md
  src/components/{{componentPath}}.jsx
  src/index.js
  test/client/main.js
  test/client/spec/components/{{componentPath}}.spec.jsx
  test/client/test.html
  {{gitignore}}
  {{npmignore}}
```

### Archetype Data

Archetypes provide data for template expansion via an `init.js` file in the
root of the archetype. The structure of the file is:

```js
module.exports = {
  destination:  // A special prompt for output destination directory.
  prompts:      // Questions and responses for the user
  derived:      // Other fields derived from the data provided by the user
};
```

Note that `builder-init` requires `destination` output directories to not exist
before writing for safety and initialization sanity.

#### Imports and Dependencies

The `init.js` file is `require`-ed from a temporary `extracted` directory
containing the full archetype. However, an `npm install` is not run in the
archetype directory prior to starting the initialization process. This means
that you can `require` in:

* Files contained in the archetype itself.
* Any standard node libraries. (E.g., `require("path")`, `require("fs")`).

Unfortunately, you cannot require third party libraries or things that may
be found in `<archetype>/node_modules/`. (E.g., `require("lodash")`).

This is a good thing, because the common case is that you will need nearly
_none_ of the dependencies in `init.js` prompting that are used in the archetype
itself, so `builder-init` remains lightening quick by _not_ needing to do any
`npm install`-ing.

There is a [future ticket](https://github.com/FormidableLabs/builder-init/issues/32)
to consider supporting custom `npm` dependencies in the `init.js file.

#### User Prompts

User prompts and responses are ingested using [inquirer][]. The `prompts` field
of the `init.js` object can either be an _array_ or _object_ of inquirer
[question objects][inq-questions]. For example:

```js
module.exports = {
  // Destination directory to write files to.
  //
  // This field is deep merged and added _last_ to the prompts so that archetype
  // authors can add `default` values or override the default message. You
  // could further override the `validate` function, but we suggest using the
  // existing default as it checks the directory does not already exist (which
  // is enforced later in code).
  destination: {
    default: function (data) {
      // Use the early `name` prompt as the default value for our dest directory
      return data.name;
    }
  },

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

The `.npmrc`, `.npmignore`, and `.gitignore` files in an `init/` templates
directory are critical to the correct publishing / git lifecycle of a created
project. However, publishing `init/` to npm as part of publishing the archetype
and even initializing off of a local file path via `npm pack` does not work well
with the basic layout of:

```
init/
  .gitignore
  .npmignore
  .npmrc
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

natural `npm` processes would exclude all of the following template files:

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
* `{{npmrc}}` -> `.npmrc`
* `{{eslintrc}}` -> `.eslintrc`

In your archetype `init` directory you should add any / none of these files
with the following names instead of their real ones:

```
init/
  {{gitignore}}
  {{npmignore}}
  {{npmrc}}
  {{eslintrc}}
```

As a side note for your git usage, this now means that `init/.gitignore` doesn't
control the templates anymore and your archetype's root `.gitignore` must
appropriately ignore files in `init/` for git commits.

#### `<archetype>/package.json`, `<archetype>/dev/package.json`

There is often a "chicken vs. egg" situation of an archetype under update vs.
the `init/` templates installed from and using the archetype. To help a variety
of situations, we provide a special `archetype` data variable with the
following data:

```
archetype:
  package       // `<archetype>/package.json` if it exists, else `{}`
  devPackage    // `<archetype>/dev/package.json` if it exists, else `{}`
```

This enables you to have "always correct" version values for `init/package.json`
by doing something like:

```js
{
  "dependencies": {
    "builder": "^2.5.0",
    "builder-react-component": "<%= archetype.package.version ? '^' + archetype.package.version : '*' %>"
  },
  "devDependencies": {
    "builder-react-component-dev": "<%= archetype.devPackage.version ? '^' + archetype.devPackage.version : '*' %>",
  }
}
```

In your template content.


### Templates Directory Ingestion

`builder-init` mostly just walks the `init/` directory of an archetype looking
for any files with the following features:

* An empty / non-existent `init/` directory is allowed, although nothing will
  be written out.
* If an `init/.gitignore` file is found, the files matched in the templates
  directory will be filtered to ignore any `.gitignore` glob matches. This
  filtering is done at _load_ time before file name template strings are
  expanded (in case that matters).

`builder-init` tries to intelligently determine if files in the `init/`
directory are actually text template files with the following heuristic:

1. Inspect the magic numbers for known text files and opportunistically the
   byte range of the file buffer with https://github.com/gjtorikian/isBinaryFile.
   If binary bytes detected, don't process.
2. Inspect the magic numbers for known binary types with
   https://github.com/sindresorhus/file-type
   If known binary type detected, don't process.
3. Otherwise, try to process as a template.

If this heuristic approach proves too complicated / problematic, we'll consider
a more significant revision of processing with something more heavy-handed like
an opt-in file naming scheme or a blessed "unprocessed" directory
(such as `init-raw/`).

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


## Tips, Tricks, & Notes

### npmrc File

If you use Private npm, or a non-standard registry, or anything leveraging a
custom [`npmrc`](https://docs.npmjs.com/files/npmrc) file, you need to set
a **user** (`~/.npmrc`) or **global** (`$PREFIX/etc/npmrc`) npmrc file.

`builder-init` relies on `npm pack` under the hood and runs from a temporary
directory completely outside of the current working directory. So, while
`npm info <module>` or `npm pack <module>` would work just fine with an
`.npmrc` file in the current working directory, `builder-init` will not.


## Archetype Development Guide

There is a "chicken vs. egg" problem when developing changes to both an
archetype _and_ the `init/` templates. Here is a workflow that should be
appropriate for most scenarios using `builder-react-component` as an example.

First, `npm link` your archetype and its `-dev` version if applicable.

```sh
# Link prod archetype
$ cd /PATH/TO/builder-react-component
$ npm link

# Link dev archetype (if you have one)
$ cd dev
$ npm link
```

Next, install off _directory_ in workspace of your choosing:

```sh
$ cd /PATH/TO/TEMP_WORKSPACE
$ npm install -g builder-init
$ builder-init /PATH/TO/builder-react-component
# ... answer prompts, etc.

[builder-init] New builder-react-component project is ready at: PROJECT_NAME
```

Then, change to project directory, npm link as appropriate and install.

```sh
$ cd PROJECT_NAME
$ npm link builder-react-component
$ npm link builder-react-component-dev
$ npm install
```

You can check you are using the appropriately symlinked modules on Mac/Linux
with:

```sh
$ ls -l node_modules | grep ^l
lrwxr-xr-x   1 USER  COMPUTER Users    64 Jan 29 16:20 builder-react-component -> ../../../../.nvm/v4.2.4/lib/node_modules/builder-react-component
lrwxr-xr-x   1 USER  COMPUTER Users    68 Jan 29 16:20 builder-react-component-dev -> ../../../../.nvm/v4.2.4/lib/node_modules/builder-react-component-dev
```

All actions in your generated project will now use your "under development"
archetype on your local filesystem.

*Side Note* - our CI checks for initializing a new project from scratch for
archetypes like `builder-react-component` pretty much follows this exact scheme.
See our above section on [Automating Prompts](#automating-prompts) for links
and other setup information.

[builder]: https://github.com/FormidableLabs/builder
[inquirer]: https://github.com/SBoudrias/Inquirer.js
[inq-questions]: https://github.com/SBoudrias/Inquirer.js#question
[trav_img]: https://api.travis-ci.org/FormidableLabs/builder-init.svg
[trav_site]: https://travis-ci.org/FormidableLabs/builder-init
[cov_img]: https://img.shields.io/coveralls/FormidableLabs/builder-init.svg
[cov_site]: https://coveralls.io/r/FormidableLabs/builder-init
