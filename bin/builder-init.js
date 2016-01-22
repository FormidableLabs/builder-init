#!/usr/bin/env node
"use strict";

var path = require("path");
var async = require("async");

var prompts = require("../lib/prompts");
var Templates = require("../lib/templates");
var Task = require("../lib/task");
var task = new Task();

// Our "finish up" helper
var finish = function (err) {
  // TODO: REAL LOGGING
  // https://github.com/FormidableLabs/builder-init/issues/4
  if (err) { console.error(err); } // eslint-disable-line no-console

  process.exit(err ? err.code || 1 : 0); // eslint-disable-line no-process-exit
};

// Start the init fun.
if (task.isInit()) {
  // Actual initialization.
  async.auto({
    download: task.execute.bind(task),

    prompts: ["download", function (cb, results) {
      prompts(results.download.init, cb);
    }],

    templates: ["prompts", function (cb, results) {
      var templates = new Templates({
        src: results.download.src,
        // TODO HERE: CHOOSE A DESTINATION
        // - Default to `cwd() + package name`.
        // - ... or something else???
        dest: path.resolve(process.env.HOME, "Desktop/builder-init-temp"),
        data: results.prompts
      });

      templates.process(cb);
    }]
  }, finish);

} else {
  // Help, version, etc. - just call straight up.
  task.execute(finish);
}
