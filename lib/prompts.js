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
        return void done("Must specify a destination directory");
      }

      fs.stat(val, function (err) {
        if (err && err.code === "ENOENT") { return void done(true); }

        return void done("Destination directory must not already exist");
      });
    }
  },
  derived: {
    // TODO: UNDERSCORE DEFAULTS
    // `.npmignore` and `.gitignore` need to be proxied as a template to avoid
    //  NPM losing dev files in `init/` when uploading and executing `npm pack`
    // so we provide them by default here.
    _npmignore: function (data, cb) { cb(null, ".npmignore"); },
    _gitignore: function (data, cb) { cb(null, ".gitignore"); },
    _eslintrc: function (data, cb) { cb(null, ".eslintrc"); },
    _npmrc: function (data, cb) { cb(null, ".npmrc"); }
  }
};

/**
 * Prompt user for input, validate, and add derived fields to final data object.
 *
 * @param {Object}    init        Initialization configuration (`prompts`, `derived`)
 * @param {Object}    [defaults]  Defaults merged in with lib defaults (`prompts`, `derived`)
 * @param {Function}  callback    Calls back with `(err, data)`
 * @returns {void}
 */
// eslint-disable-next-line max-statements
module.exports = function (init, defaults, callback) {
  if (arguments.length === 2) { // eslint-disable-line no-magic-numbers
    callback = defaults;
    defaults = {};
  }

  // Params
  defaults = defaults || {};

  // Validate.
  if (!init) { return void callback(new Error("Invalid init object")); }
  if (init.prompts && !(_.isArray(init.prompts) || _.isObject(init.prompts))) {
    return void callback(new Error("Invalid prompts type: " + typeof init.prompts));
  }

  var promptsBase = init.prompts && !_.isArray(init.prompts) ? {} : [];
  var prompts = _.extend(promptsBase, DEFAULTS.prompts, defaults.prompts, init.prompts);
  var dest = _.extend({}, DEFAULTS.destination, defaults.destination, init.destination);

  // Mutate objects to arrays if needed.
  prompts = _.isArray(prompts) ? prompts : _.map(prompts, function (val, key) {
    return _.extend({ name: key }, val);
  });

  // Add in special `destination` prompt field if not provided by `init.js`
  if (!_.includes(prompts, { name: "destination" })) {
    prompts.push(_.merge({ name: "destination" }, dest));
  }

  // Prompt overrides to skip actual user input.
  var overrides;
  if (init.overrides) {
    try {
      overrides = module.exports._parseOverrides(init.overrides);
    } catch (err) {
      return void callback(new Error("Prompt overrides loading failed with: " + err.message));
    }
  }

  // Execute prompts, then derive final data.
  async.auto({
    prompts: function (cb) {
      // Allow `--prompts=JSON_STRING` overrides.
      if (overrides) { return void cb(null, overrides); }

      // Get user prompts. No error, because will prompt user for new input.
      inquirer.prompt(prompts, function (data) { cb(null, data); });
    },
    derived: ["prompts", function (results, cb) {
      // Create object of functions bound to user input data and invoke.
      var data = _.clone(results.prompts);

      // Add deriveds in order of built-in defaults, program, then init.
      async.eachSeries([
        DEFAULTS.derived,
        defaults.derived,
        init.derived
      ], function (derivedObj, eachCb) {
        var fns = _.mapValues(derivedObj, function (fn) { return fn.bind(null, data); });

        async.auto(fns, function (err, eachResults) {
          // Mutate data.
          data = _.merge(data, eachResults);

          eachCb(err);
        });
      }, function (err) {
        cb(err, data);
      });
    }]
  }, function (err, results) {
    var data = results ? _.extend({}, results.prompts, results.derived) : null;
    callback(err, data);
  });
};

/**
 * Parse overrides string into object.
 *
 * Also handles a few scenarios like surrounding single / double quotes.
 *
 * @param   {String} str  JSON string
 * @returns {Object}      JS object
 */
module.exports._parseOverrides = function (str) {
  // Remove quotes.
  str = str
    .trim()
    .replace(/^"{(.*)}"$/, "{$1}")
    .replace(/^'{(.*)}'$/, "{$1}");

  return JSON.parse(str);
};

// Expose helpers for testing.
module.exports._DEFAULTS = DEFAULTS;
