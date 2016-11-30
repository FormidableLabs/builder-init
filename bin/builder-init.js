#!/usr/bin/env node
"use strict";

var path = require("path");
var _ = require("lodash");
var async = require("async");
var chalk = require("chalk");

var prompts = require("../lib/prompts");
var Templates = require("../lib/templates");
var Task = require("../lib/task");

/**
 * Script runner
 *
 * @param {Object}    opts       Options object for Task.
 * @param {Array}     opts.argv  Arguments array (Default: `process.argv`)
 * @param {Object}    opts.env   Environment object to mutate (Default `process.env`)
 * @param {Function}  callback   Callback from script run `(err, results)`.
 * @returns {void}
 */
var run = module.exports = function (opts, callback) {
  var task = new Task(opts);
  var bin = chalk.green.bold("[builder-init]");

  // Help, version, etc. - just call straight up.
  if (!task.isInit()) {
    return void task.execute(callback);
  }

  // Actual initialization.
  async.auto({
    download: task.execute.bind(task),

    prompts: ["download", function (results, cb) {
      process.stdout.write(
        bin + " Preparing templates for: " + chalk.magenta(task.archName) + "\n"
      );

      prompts(results.download.init, cb);
    }],

    templates: ["prompts", function (results, cb) {
      if (!results.prompts.destination) {
        return void cb(new Error("Destination field missing from prompts"));
      }

      var templates = new Templates({
        src: results.download.src,
        dest: path.resolve(results.prompts.destination),
        data: _.extend({
          archetype: results.download.archetype
        }, results.prompts)
      });

      templates.process(function (err, outFiles) {
        if (err) { return void cb(err); }

        process.stdout.write(
          "\n" + bin + " Wrote files: \n" +
          (outFiles || []).map(function (obj) {
            return " - " + chalk.cyan(path.relative(process.cwd(), obj.dest));
          }).join("\n") + "\n"
        );

        cb();
      });
    }]
  }, function (err, results) {
    if (!err) {
      process.stdout.write(
        "\n" + bin + " New " + chalk.magenta(task.archName) + " project is ready at: " +
        chalk.cyan(path.relative(process.cwd(), results.prompts.destination)) + "\n"
      );
    }

    callback(err);
  });
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
