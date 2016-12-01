#!/usr/bin/env node
"use strict";

var init = require("../lib/init");
var pkg = require("../package.json");

var run = module.exports = init;

if (require.main === module) {
  run({
    script: "builder-init",
    version: pkg.version
  }, function (err) {
    // TODO: REAL LOGGING
    // https://github.com/FormidableLabs/builder-init/issues/4
    if (err) {
      // Try to get full stack, then full string if not.
      console.error(err.stack || err.toString()); // eslint-disable-line no-console
    }

    process.exit(err ? err.code || 1 : 0); // eslint-disable-line no-process-exit
  });
}
