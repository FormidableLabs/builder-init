"use strict";

var fs = require("fs");
var _ = require("lodash");
var async = require("async");
var inquirer = require("inquirer");

/**
 * Default prompts values added to all prompt calls.
 */
var DEFAULTS = {
  destination: {
    message: "Destination directory to write",
    validate: function (val) {
      var done = this.async();

      if (!val) {
        return done("Must specify a destination directory");
      }

      fs.stat(val, function (err) {
        if (err && err.code === "ENOENT") { return done(true); }

        return done("Destination directory must not already exist");
      });
    }
  },
  derived: {
    // `.npmignore` and `.gitignore` need to be proxied as a template to avoid
    //  NPM losing dev files in `init/` when uploading and executing `npm pack`
    // so we provide them by default here.
    npmignore: function (data, cb) { cb(null, ".npmignore"); },
    gitignore: function (data, cb) { cb(null, ".gitignore"); }
  }
};

/**
 * Prompt user for input, validate, and add derived fields to final data object.
 *
 * @param {Object}    init      Initialization configuration (`prompts`, `derived`)
 * @param {Function}  callback  Calls back with `(err, data)`
 * @returns {void}
 */
module.exports = function (init, callback) {
  if (!init) { return callback(new Error("Invalid init object")); }

  // Give a default value to allow for empty prompts.
  var prompts = init.prompts || [];

  // Validate.
  if (!(_.isArray(prompts) || _.isObject(prompts))) {
    return callback(new Error("Invalid prompts type: " + typeof prompts));
  }

  // Mutate objects to arrays if needed.
  prompts = _.isArray(prompts) ? prompts : _.map(prompts, function (val, key) {
    return _.extend({ name: key }, val);
  });

  // Add in special `destination` prompt field if not provided by `init.js`
  if (!_.contains(prompts, { name: "destination" })) {
    prompts.push(_.merge({ name: "destination" }, DEFAULTS.destination, init.destination));
  }

  // Prompt overrides to skip actual user input.
  var overrides;
  if (init.overrides) {
    try {
      overrides = JSON.parse(init.overrides);
    } catch (err) {
      return callback(new Error("Prompt override loading failed with: " + err.message));
    }
  }

  // Execute prompts, then derive final data.
  async.auto({
    prompts: function (cb) {
      // Allow `--prompts=JSON_STRING` overrides.
      if (overrides) { return cb(null, overrides); }

      // Get user prompts. No error, because will prompt user for new input.
      inquirer.prompt(prompts, function (data) { cb(null, data); });
    },
    derived: ["prompts", function (cb, results) {
      // Create object of functions bound to user input data and invoke.
      var derived = _({})
        .extend(DEFAULTS.derived, init.derived)
        .mapValues(function (fn) { return fn.bind(null, results.prompts); })
        .value();

      async.auto(derived, cb);
    }]
  }, function (err, results) {
    var data = results ? _.extend({}, results.prompts, results.derived) : null;
    callback(err, data);
  });
};

// Expose helpers for testing.
module.exports._DEFAULTS = DEFAULTS;
