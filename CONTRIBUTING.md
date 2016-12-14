Contributing
============

## Notes

The test dependencies hackily reuse `denim`'s tests, so we need all the
`devDependencies` in `denim` in: https://github.com/FormidableLabs/denim/blob/master/package.json

## Publishing

Before publishing a new release, make sure to:

* Run `npm run builder:check`
* Run `npm run builder:build` to rebuild the TOCs in markdown docs. Commit the
  file changes.
