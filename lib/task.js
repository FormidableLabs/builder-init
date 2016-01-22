"use strict";

var spawn = require("child_process").spawn;
var _  = require("lodash");
var async  = require("async");
var chalk = require("chalk");
var nopt = require("nopt");
var temp = require("temp").track(); // track: Clean up all files on process exit.
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
 * @param {Object} opts.env     Environment object to mutate (Default `process.env`)
 * @returns {void}
 */
var Task = module.exports = function (opts) {
  opts = opts || {};
  this.env = opts.env || process.env;

  // Parse args.
  var argv = opts.argv || process.argv;
  var parsed = nopt(OPTIONS, SHORT_OPTIONS, argv);
  this.archetypes = parsed.argv.remain;

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

  process.stdout.write(
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
    }).join("\n") + "\n\n"
  );

  callback();
};

Task.prototype.version = function (callback) {
  process.stdout.write(pkg.version);
  callback();
};

Task.prototype.init = function (callback) {
  var archetype = this.archetypes[0];

  if (this.archetypes.length !== 1) {
    return callback(new Error(
      "Must specify exactly 1 archetype to install. Found " + this.archetypes.length +
      " archetypes: " + this.archetypes.join(", ")));
  }

  // Create a temporary directory to stash the gzip file, unzip it and return
  // the paths for use in template ingestion.
  async.auto({
    tmpDir: temp.mkdir.bind(temp, "builder-init"),

    npmPack: ["tmpDir", function (cb, results) {
      cb = _.once(cb);

      // Use `npm pack MODULE` to do the dirty work of installing off of file, npm
      // git, github, etc.
      //
      // See: https://docs.npmjs.com/cli/pack
      var proc = spawn("npm", ["pack", archetype], {
        cwd: results.tmpDir,
        env: this.env
      });
      proc.on("error", cb);
      proc.on("close", cb);
    }],

    unzip: ["npmPack", function (cb, results) {
      cb();
    }]


  }, callback);

};

Task.prototype.execute = function (callback) {
  this.task(callback);
};
