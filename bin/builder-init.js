#!/usr/bin/env node
"use strict";

var init = require("../lib/init");

if (require.main === module) {
  init({
    script: "builder-init"
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
