"use strict";

var chalk = require("chalk");
var nopt = require("nopt");
var pkg = require("../package.json");

var OPTIONS = {
  "help": Boolean,
  "version": Boolean
};

var SHORT_OPTIONS = {
  "h": ["--help"],
  "v": ["--version"]
};

/**
 * Task wrapper.
 *
 * @param {Object} opts         Options object
 * @param {Array}  opts.argv    Arguments array (Default: `process.argv`)
 * @returns {void}
 */
var Task = module.exports = function (opts) {
  // Parse args.
  opts = opts || {};
  var argv = opts.argv || process.argv;
  var parsed = nopt(OPTIONS, SHORT_OPTIONS, argv);

  // Decide task.
  this.task = this.init;
  if (parsed.help) {
    this.task = this.help;
  } else if (parsed.version) {
    this.task = this.version;
  }
};

Task.prototype.help = function (callback) {
  var flags = Object.keys(OPTIONS).map(function (key) {
    return "  --" + chalk.cyan(key);
  }).join("\n");

  /*eslint-disable no-console*/
  console.log(
    chalk.green.bold("Usage") + ": \n\n  builder-init [flags] <archetype>" +
    "\n\n" + chalk.green.bold("Flags") + ": \n\n" + flags +
    "\n\n" + chalk.green.bold("Examples") + ": \n\n" +
    "`builder-init` can install templates from any source that `npm` can, e.g.:\n\n" +
    [
      ["(npm)   ", "builder-react-component"],
      ["(npm)   ", "builder-react-component@0.1.3"],
      ["(github)", "FormidableLabs/builder-react-component"],
      ["(github)", "FormidableLabs/builder-react-component#v0.1.3"],
      ["(git)   ", "git+ssh://git@github.com:FormidableLabs/builder-react-component.git"],
      ["(git)   ", "git+ssh://git@github.com:FormidableLabs/builder-react-component.git#v0.1.3"],
      ["(file)  ", "../builder-react-component"]
    ].map(function (pairs) {
      return "  " + chalk.red(pairs[0]) + " builder-init " + chalk.cyan(pairs[1]);
    }).join("\n") + "\n"
  );
  /*eslint-enable no-console*/

  callback();
};

Task.prototype.version = function (callback) {
  console.log(pkg.version); // eslint-disable-line no-console
  callback();
};

Task.prototype.init = function (callback) {
  console.log("TODO INIT"); // eslint-disable-line no-console
  callback();
};

Task.prototype.execute = function (callback) {
  this.task(callback);
};
