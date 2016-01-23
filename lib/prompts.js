"use strict";

var _ = require("lodash");
var async = require("async");
var inquirer = require("inquirer");

/**
 * Default `prompts` and `derived` values added to all prompt calls.
 */
var DEFAULTS = {
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

  // Execute prompts, then derive final data.
  async.auto({
    prompts: function (cb) {
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
