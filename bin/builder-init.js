#!/usr/bin/env node
"use strict";

var path = require("path");
var async = require("async");

var prompts = require("../lib/prompts");
var Templates = require("../lib/templates");
var Task = require("../lib/task");
var task = new Task();

// Script runner
var run = module.exports = function (callback) {
  // Help, version, etc. - just call straight up.
  if (!task.isInit()) {
    return task.execute(callback);
  }

  // Actual initialization.
  async.auto({
    download: task.execute.bind(task),

    prompts: ["download", function (cb, results) {
      prompts(results.download.init, cb);
    }],

    templates: ["prompts", function (cb, results) {
      if (!results.prompts.destination) {
        return cb(new Error("Destination field missing from prompts"));
      }

      var templates = new Templates({
        src: results.download.src,
        dest: path.resolve(results.prompts.destination),
        data: results.prompts
      });

      templates.process(cb);
    }]
  }, callback);
};

if (require.main === module) {
  run(function (err) {
    // TODO: REAL LOGGING
    // https://github.com/FormidableLabs/builder-init/issues/4
    if (err) { console.error(err); } // eslint-disable-line no-console

    process.exit(err ? err.code || 1 : 0); // eslint-disable-line no-process-exit
  });
}
