"use strict";

var childProc = require("child_process");
var path = require("path");
var zlib = require("zlib");
var _ = require("lodash");
var fs = require("fs-extra");
var async = require("async");
var chalk = require("chalk");
var nopt = require("nopt");
var tar = require("tar");
var temp = require("temp").track(); // track: Clean up all files on process exit.
var pkg = require("../package.json");

var OPTIONS = {
  "help": Boolean,
  "version": Boolean,
  "prompts": String
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
  this.promptsOverrides = (parsed.prompts || "").trim();
  this.archetypes = parsed.argv.remain;

  // Decide task.
  this.task = this.init;
  if (parsed.version) {
    this.task = this.version;
  } else if (parsed.help || this.archetypes.length === 0) {
    this.task = this.help;
  }
};

/**
 * Selected task _is_ initialize.
 *
 * @returns {Boolean} `true` if initialize task
 */
Task.prototype.isInit = function () {
  return this.task === this.init;
};

/**
 * Help.
 *
 * ```sh
 * $ builder-init [-h|--help]
 * ```
 *
 * @param   {Function} callback   Callback function `(err)`
 * @returns {void}
 */
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
      ["(npm)   ", "builder-react-component@0.2.0"],
      ["(github)", "FormidableLabs/builder-react-component"],
      ["(github)", "FormidableLabs/builder-react-component#v0.2.0"],
      ["(git)   ", "git+ssh://git@github.com:FormidableLabs/builder-react-component.git"],
      ["(git)   ", "git+ssh://git@github.com:FormidableLabs/builder-react-component.git#v0.2.0"],
      ["(file)  ", "/FULL/PATH/TO/builder-react-component"]
    ].map(function (pairs) {
      return "  " + chalk.red(pairs[0]) + " builder-init " + chalk.cyan(pairs[1]);
    }).join("\n") + "\n\n"
  );

  callback();
};

/**
 * Version.
 *
 * ```sh
 * $ builder-init [-v|--version]
 * ```
 *
 * @param   {Function} callback   Callback function `(err)`
 * @returns {void}
 */
Task.prototype.version = function (callback) {
  process.stdout.write(pkg.version + "\n");
  callback();
};

// Expose extracted event for testing.
Task.prototype._onExtracted = function (callback) {
  return callback;
};

// Expose `require()` for testing.
Task.prototype._lazyRequire = function (mod) {
  return require(mod); // eslint-disable-line global-require
};

/**
 * Download an archetype and expand it for templating use.
 *
 * ```sh
 * $ builder-init <archetype>
 * ```
 *
 * @param   {Function} callback   Callback function `(err, { init: OBJ, src: DIR_PATH })`
 * @returns {void}
 */
Task.prototype.init = function (callback) {
  // Validation.
  if (this.archetypes.length !== 1) {
    return void callback(new Error(
      "Must specify exactly 1 archetype to install. Found " + this.archetypes.length +
      " archetypes: " + this.archetypes.join(", ")));
  }

  var self = this;
  self.archetype = self.archetypes[0];
  self.archName = path.basename(self.archetype);

  // Create a temporary directory to stash the gzip file, unzip it and return
  // the paths for use in template ingestion.
  async.auto({
    tmpDir: temp.mkdir.bind(temp, "builder-init"),

    npmPack: ["tmpDir", function (results, cb) {
      cb = _.once(cb);

      // Set up command and arguments assuming Linux / Mac.
      var cmd = "npm";
      var args = ["pack", self.archetype];

      // Detect and adjust commands if windows.
      var isWin = /^win/.test(process.platform);
      if (isWin) {
        cmd = "cmd";
        args = ["/c", "npm"].concat(args);
      }

      // Use `npm pack MODULE` to do the dirty work of installing off of file, npm
      // git, github, etc.
      //
      // See: https://docs.npmjs.com/cli/pack
      var proc = childProc.spawn(cmd, args, {
        cwd: results.tmpDir,
        env: self.env,
        stdio: "inherit"
      });
      proc.on("error", cb);
      proc.on("close", function (code) {
        cb(code === 0 ? null : new Error(
          "'npm pack " + self.archetype + "' exited with error code: " + code));
      });
    }],

    gzFilePath: ["npmPack", function (results, cb) {
      fs.readdir(results.tmpDir, function (err, files) {
        if (err) { return void cb(err); }

        if (files.length !== 1) {
          return void cb(
            new Error("Should have exactly 1 downloaded file. Found: " + files.join(", ")));
        }

        var file = files[0];
        if (!/\.tgz$/.test(file)) {
          return void cb(new Error("File should have tgz suffix. Found: " + file));
        }

        cb(null, path.resolve(results.tmpDir, file));
      });
    }],

    extracted: ["gzFilePath", function (results, cb) {
      // Ensure called once, and adds our extracted hook.
      cb = _.once(self._onExtracted(cb));

      var extractedDir = path.resolve(results.tmpDir, "extracted");

      fs.createReadStream(results.gzFilePath)
        .pipe(zlib.createUnzip())
        .pipe(new tar.Extract({
          path: extractedDir,
          strip: 1 // Get rid of `<archetype-name>/` level of directory
        }))
        .on("error", cb)
        .on("close", cb.bind(null, null, extractedDir));
    }],

    pkg: ["extracted", function (results, cb) {
      var pkgPath = path.resolve(results.tmpDir, "extracted/package.json");
      fs.readJson(pkgPath, function (err, data) {
        if (err && err.code === "ENOENT") { return void cb(null, {}); } // Allow empty.
        cb(err, data);
      });
    }],

    devPkg: ["extracted", function (results, cb) {
      var pkgPath = path.resolve(results.tmpDir, "extracted/dev/package.json");
      fs.readJson(pkgPath, function (err, data) {
        if (err && err.code === "ENOENT") { return void cb(null, {}); } // Allow empty.
        cb(err, data);
      });
    }],

    // Check if `extracted/init.js` exists. This allows us to distinguish
    // between:
    //
    // 1. a missing `init.js` which is allowed.
    // 2. a not found error _in_ `init.js` which is not allowed.
    //
    // https://github.com/FormidableLabs/builder-init/issues/32
    initExists: ["extracted", function (results, cb) {
      var initPath = path.resolve(results.tmpDir, "extracted/init.js");

      fs.stat(initPath, function (err) {
        if (err) {
          // Doesn't exist.
          if (err.code === "ENOENT") {
            return void cb(null, false);
          }

          // Actual error
          return void cb(err);
        }

        // Exists.
        cb(null, true);
      });

    }],

    init: ["extracted", "initExists", function (results, cb) {
      var overrides = self.promptsOverrides ? { overrides: self.promptsOverrides } : {};

      // Skip reading init if doesn't exist.
      if (!results.initExists) {
        return void cb(null, overrides);
      }

      // If exists, try to require in.
      var initPath = path.resolve(results.tmpDir, "extracted/init.js");
      var init;

      try {
        init = self._lazyRequire(initPath);

        return void cb(null, _.extend(init, overrides));

      } catch (err) {
        // Enhance error message.
        err.message += "\n[builder-init] Error while importing '" + self.archName + "/init.js'";

        return void cb(err);
      }
    }],

    checkTemplates: ["extracted", function (results, cb) {
      var templatesPath = path.resolve(results.tmpDir, "extracted/init");
      fs.stat(templatesPath, function (err, stats) {
        if (err) {
          if (err.code === "ENOENT") {
            return void cb(new Error("Archetype '" + self.archName + "/init' directory not found"));
          }

          return void cb(err);
        }

        if (!stats.isDirectory()) {
          return void cb(new Error(
            "Archetype '" + self.archName + "/init' exists, but is not a directory"));
        }

        cb();
      });
    }]

  }, function (err, results) {
    if (err) { return void callback(err); }

    callback(null, {
      init: results.init || {},
      archetype: {
        package: results.pkg,
        devPackage: results.devPkg
      },
      src: path.resolve(results.tmpDir, "extracted/init")
    });
  });
};

Task.prototype.execute = function (callback) {
  this.task(callback);
};
