#!/usr/bin/env node
"use strict";

// TODO: Remove vendor deps if possible (???)
var _ = require("lodash");
var async = require("async");
var fs = require("fs-extra");

var path = require("path");
var init = require("../lib/init");
var pkg = require("../package.json");

var run = module.exports = function (opts, callback) {
  return init(_.merge({
    script: "builder-init",
    version: pkg.version,
    initFile: "init.js",
    prompts: {
      derived: {
        // Directory containing templates
        _templatesDir: function (data, cb) { cb(null, "init"); },

        // Custom fields
        archetype: function (data, cb) {
          var extractedPath = data._extractedModulePath;
          async.auto({
            package: function (extractCb) {
              var pkgPath = path.resolve(extractedPath, "package.json");
              fs.readJson(pkgPath, function (err, pkgData) {
                if (err && err.code === "ENOENT") { return void extractCb(null, {}); }
                extractCb(err, pkgData);
              });
            },

            devPackage: function (extractCb) {
              var pkgPath = path.resolve(extractedPath, "dev/package.json");
              fs.readJson(pkgPath, function (err, pkgData) {
                if (err && err.code === "ENOENT") { return void extractCb(null, {}); }
                extractCb(err, pkgData);
              });
            }
          }, cb);
        },

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
