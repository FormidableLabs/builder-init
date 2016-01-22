"use strict";

var path = require("path");
var _ = require("lodash");
var async = require("async");
var fs = require("fs-extra");
var ignoreParser = require("gitignore-parser");

// Lodash template setup.
//
// HACK: Force ERB style by cloning regexp source. There's a `===` check for
// "unchanged" that adds in the ES stuff.
// https://github.com/lodash/lodash/blob/3.6.2-npm-packages/lodash.template/index.js#L26-L27
_.templateSettings.interpolate = new RegExp(_.templateSettings.interpolate.source);
// Remove HTML escaping.
_.templateSettings.escape = null;

/**
 * Templates wrapper object.
 *
 * @param {Object}    opts      Options
 * @param {String}    opts.src  Template source file path
 * @param {String}    opts.dest Processed output file path
 * @param {Object}    opts.data Template data
 * @returns {void}
 */
var Templates = module.exports = function (opts) {
  opts = opts || {};
  this.src = opts.src;
  this.dest = opts.dest;
  this.data = opts.data || {};
};

// Curly-brace template regexp for filename parsing.
Templates.prototype.FILENAME_RE = /\{\{([^\}]+?)\}\}/g;

// Start or end curly special types.
Templates.prototype.START_END_RE = /\{\{|\}\}/;

/**
 * Resolve / parse file name into full destination path.
 *
 * Uses a very simple curly-brace templating scheme of:
 *
 * ```
 * "{{foo}}.js" -> ({foo: "bar"}) -> "bar.js"
 * ```
 *
 * Notes
 * - Throws error on unmatched tokens missing in `this.data`.
 * - Throws error if finds token start / end within matched text.
 *
 * @param {String}    dest  File path name or template string
 * @returns {String}        Resolved file path name
 */
Templates.prototype.resolveFilename = function (dest) {
  if (!dest) { return ""; }

  var self = this;
  return dest.replace(self.FILENAME_RE, function (raw, token) {
    if (self.START_END_RE.test(token)) {
      throw new Error("Forbidden template characters in: '" + token + "' for path: " + dest);
    }

    var data = self.data[token];
    if (!data) {
      throw new Error("Unknown token: '" + token + "' for path: " + dest);
    }

    return data;
  });
};

/**
 * Read single input file and callback with data object.
 *
 * ```js
 * {
 *   dest: /OUTPUT/PATH
 *   content: RAW_STRING_CONTENT
 * }
 * ```
 *
 * @param {Object}    opts      Options
 * @param {String}    opts.src  Template source file path
 * @param {String}    opts.dest Unparsed output file path
 * @param {Function}  callback  Callback function `(err, data)`
 * @returns {void}
 */
Templates.prototype.readTemplate = function (opts, callback) {
  fs.readFile(opts.src, function (err, buffer) {
    callback(err, { dest: opts.dest, content: (buffer || "").toString() });
  });
};

/**
 * Parse and inflate template object with data.
 *
 * ```js
 * {
 *   dest: /OUTPUT/PATH
 *   content: PROCESSED_STRING_CONTENT
 * }
 * ```
 *
 * @param {Object}    opts          Options
 * @param {String}    opts.dest     Unparsed output file path
 * @param {String}    opts.content  Unparsed output file contents
 * @returns {Object}                Processed data object
 */
Templates.prototype.processTemplate = function (opts) {
  // File path: Bespoke {{}} parsing
  var dest = this.resolveFilename(opts.dest, this.data);

  // Content: Lodash template
  var compiled = _.template(opts.content.toString());
  var content = compiled(this.data);

  return { dest: dest, content: content };
};

/**
 * Write template file to disk, creating intermediate paths.
 *
 * @param {Object}    opts          Options
 * @param {String}    opts.dest     Processed output file path
 * @param {String}    opts.content  Processed output file contents
 * @param {Function}  callback      Callback function `(err)`
 * @returns {void}
 */
Templates.prototype.writeTemplate = function (opts, callback) {
  async.series([
    fs.ensureFile.bind(fs, opts.dest),
    fs.writeFile.bind(fs, opts.dest, opts.content)
  ], callback);
};

/**
 * Statefully load templates. (Does not process templates).
 *
 * ```
 * [
 *   { dest: "RAW_PATH_01", content: "RAW_CONTENT_01" },
 *   { dest: "RAW_PATH_02", content: "RAW_CONTENT_02" }
 * ]
 * ```
 *
 * @param {Function} callback  Callback function `(err, tmpls)`
 * @returns {void}
 */
Templates.prototype.load = function (callback) {
  var self = this;

  async.auto({
    // ------------------------------------------------------------------------
    // Require empty target destination.
    // ------------------------------------------------------------------------
    checkEmpty: function (cb) {
      fs.stat(self.dest, function (err) {
        if (err) {
          // Proxy all errors except not found.
          return cb(err.code === "ENOENT" ? null : err);
        }

        // Otherwise exists.
        cb(new Error("Path: " + self.dest + " already exists"));
      });
    },

    // ------------------------------------------------------------------------
    // Walk the entire filesystem tree for the source templates.
    // ------------------------------------------------------------------------
    walkTemplates: ["checkEmpty", function (cb) {
      cb = _.once(cb);
      var tmpls = [];

      fs.walk(self.src)
        .on("data", function (item) {
          if (item.stats.isFile()) {
            // Only track real files (we'll `mkdir -p` when creating).
            tmpls.push(item);
          } else if (!item.stats.isDirectory()) {
            // Validation: We only handle real files / directories for now.
            return cb(new Error("Source: " + item.path + " is not a file or directory"));
          }
        })
        .on("error", function (err) {
          // Proxy all errors except not found with an empty template array.
          return cb(err.code === "ENOENT" ? null : err, []);
        })
        .on("end", function (err) {
          return cb(err, tmpls);
        });
    }],

    // ------------------------------------------------------------------------
    // Ingest ignore file and filter.
    // ------------------------------------------------------------------------
    loadIgnore: function (cb) {
      fs.readFile(path.join(self.src, ".gitignore"), function (err, data) {
        // Process error to allow "not found".
        err = (err || {}).code === "ENOENT" ? null : err;

        cb(err, data);
      });
    },

    filterTemplates: ["walkTemplates", "loadIgnore", function (cb, results) {
      // Get ignore filter (if any).
      var ignoreSrc = (results.loadIgnore || "").toString();
      if (!ignoreSrc) {
        return cb(null, results.walkTemplates);
      }

      // Have ignores. Process and filter.
      var gitignore = ignoreParser.compile(ignoreSrc);
      var filtered = results.walkTemplates.filter(function (stat) {
        var relPath = path.relative(self.src, stat.path);
        return gitignore.accepts(relPath);
      });

      cb(null, filtered);
    }],

    // ------------------------------------------------------------------------
    // Read source templates and process in memory.
    // ------------------------------------------------------------------------
    readTemplates: ["filterTemplates", function (cb, results) {
      async.map(results.filterTemplates, function (item, tmplCb) {
        var relPath = path.relative(self.src, item.path);
        var dest = path.resolve(self.dest, relPath);

        self.readTemplate({
          src: item.path,
          dest: dest
        }, tmplCb);
      }, cb);
    }]
  }, function (err, results) {
    callback(err, (results || {}).readTemplates);
  });
};

/**
 * Read, process, and write out templates.
 *
 * Array of processed template data objects is returned.
 *
 * @param {Function} callback  Callback function `(err, data)`
 * @returns {void}
 */
Templates.prototype.process = function (callback) {
  var self = this;

  async.auto({
    // ------------------------------------------------------------------------
    // Load all templates from disk.
    // ------------------------------------------------------------------------
    load: self.load.bind(self),

    // ------------------------------------------------------------------------
    // Process templates in memory.
    // ------------------------------------------------------------------------
    procTemplates: ["load", function (cb, results) {
      var processed;

      try {
        processed = _.map(results.load, self.processTemplate.bind(self));
      } catch (err) {
        return cb(err);
      }

      cb(null, processed);
    }],

    // ------------------------------------------------------------------------
    // Validate processed templates.
    // ------------------------------------------------------------------------
    validateTemplates: ["procTemplates", function (cb, results) {
      var tmpls = results.procTemplates;

      // Check that all paths are unique after template processing.
      // We're trying to avoid a perverse situation wherein an expanded template
      // name clashes with a static file path.
      var nameConflicts = _(tmpls)
        // Convert to groups of `NAME: COUNT`
        .groupBy("dest")
        .mapValues(function (items) { return items.length; })
        // Switch to `[NAME, COUNT]`
        .pairs()
        // Keep only COUNT > 1 (aka "not unique")
        .filter(function (pair) { return pair[1] > 1; })
        // Return our offending keys.
        .map(function (pair) { return pair[0]; })
        .value();

      var numConflicts = nameConflicts.length;
      if (numConflicts > 0) {
        console.log("TODO HERE tmpls", _.pick(tmpls, "dest"));
        return cb(new Error("Encountered " + numConflicts +
          " file path conflict" + (numConflicts > 1 ? "s" : "") +
          " when resolving: " + nameConflicts.join(", ")));
      }

      // Valid: Just proxy on original templates.
      cb(null, tmpls);
    }],

    // ------------------------------------------------------------------------
    // Write processed templates to disk.
    // ------------------------------------------------------------------------
    writeTemplates: ["validateTemplates", function (cb, results) {
      async.map(results.procTemplates, self.writeTemplate.bind(self), cb);
    }]
  }, function (err, results) {
    // Callback with full processed templates.
    callback(err, (results || {}).procTemplates);
  });
};
