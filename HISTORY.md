History
=======

## Unreleased

* Refactor to use [denim](https://github.com/FormidableLabs/denim) as template
  engine.
  [#37](https://github.com/FormidableLabs/builder-init/issues/37)

## 0.3.1

* Refactor so `lib/` is agnostic template engine vs. `bin/` remaining `builder`
  specific.

## 0.3.0

* Add special `_templatesDir` prompt for specifying alternate templates
  (`init/`) directory.
  [#36](https://github.com/FormidableLabs/builder-init/issues/36)
* Update lint, build, publish infrastructure.

## 0.2.4

* Add better documentation / error messages for `require()`'s in `init.js`.
  [#32](https://github.com/FormidableLabs/builder-init/issues/32)

## 0.2.3

* Add support for `{{eslintrc}}` derived file template.

## 0.2.2

* Make `npm pack` spawn Windows-compatible.
  [#27](https://github.com/FormidableLabs/builder-init/issues/27)

## 0.2.1

* Expand full stack traces on errors.
* Add specific message for `<archetype>/init.js` import error.

## 0.2.0

* Update template processing logic to detect and only process text files.
  [#21](https://github.com/FormidableLabs/builder-init/issues/21)
* Add note about private npm and `~/.npmrc`.
  [#22](https://github.com/FormidableLabs/builder-init/issues/22)
* Add `.npmignore` and exclude test files.

## 0.1.0

* Add `archetype` automatic template data member.
  [#18](https://github.com/FormidableLabs/builder-init/issues/18)

## 0.0.1

* Initial release.

[@ryan-roemer]: https://github.com/ryan-roemer
