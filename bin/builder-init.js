#!/usr/bin/env node
"use strict";

// TODO: Remove vendor deps if possible (???)
var async = require("async");

var fs = require("fs");
var path = require("path");

var init = require("../lib/init");
var pkg = require("../package.json");

// Helpers
var extend = function (base, obj) {
  return Object.keys(obj).reduce(function (memo, key) {
    memo[key] = obj[key];
    return memo;
  }, base);
};

var readJson = function (filePath, callback) {
  fs.readFile(filePath, function (err, data) {
    if (err) {
      if (err.code === "ENOENT") { return void callback(null, {}); }

      return void callback(err);
    }

    var json;
    try {
      json = JSON.parse(data);
    } catch (jsonErr) {
      return void callback(jsonErr);
    }

    callback(null, json);
  });
};

// Runner
var run = module.exports = function (opts, callback) {
  return init(extend({
    script: "builder-init",
    version: pkg.version,
    initFile: "init.js",
    prompts: {
      derived: {
        // Directory containing templates
        _templatesDir: function (data, cb) { cb(null, "init"); },

        // Custom fields
        archetype: function (data, cb) {
          // TODO: Document `_extractedModulePath` in extracted project.
          var extractedPath = data._extractedModulePath;
          async.auto({
            package: readJson.bind(null, path.resolve(extractedPath, "package.json")),
            devPackage: readJson.bind(null, path.resolve(extractedPath, "dev/package.json"))
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

// Script
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
