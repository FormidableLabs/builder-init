#!/usr/bin/env node
"use strict";

var init = require("../lib/init");
var pkg = require("../package.json");

var run = module.exports = function (opts, callback) {
  return init(Object.assign({
    script: "builder-init",
    version: pkg.version,
    initFile: "init.js",
    initDir: "init",
    prompts: {
      derived: {
        // Legacy names before underscored lib naming.
        // **Note**: Values from `lib/prompts.DEFAULTS` are resolved _before_
        // these by the prompts logic.
        npmignore: function (data, cb) { cb(null, data._npmignore); },
        gitignore: function (data, cb) { cb(null, data._gitignore); },
        eslintrc: function (data, cb) { cb(null, data._eslintrc); },
        npmrc: function (data, cb) { cb(null, data._npmrc); }
      }
    }
  }, opts), callback);
};

if (require.main === module) {
  run(null, function (err) {
    // TODO: REAL LOGGING
    // https://github.com/FormidableLabs/builder-init/issues/4
    if (err) {
      // Try to get full stack, then full string if not.
      console.error(err.stack || err.toString()); // eslint-disable-line no-console
    }

    process.exit(err ? err.code || 1 : 0); // eslint-disable-line no-process-exit
  });
}
