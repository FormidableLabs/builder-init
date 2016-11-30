"use strict";

/**
 * Base server unit test initialization / global before/after's.
 *
 * This file should be `require`'ed by all other test files.
 *
 * **Note**: Because there is a global sandbox server unit tests should always
 * be run in a separate process from other types of tests.
 */
var path = require("path");
var _ = require("lodash");
var mockFs = require("mock-fs");
var fs = require("fs-extra");
var async = require("async");
var sinon = require("sinon");
var prompts = require("../../../lib/prompts");

// ----------------------------------------------------------------------------
// Base helpers.
// ----------------------------------------------------------------------------
var base = module.exports = {
  // Generic test helpers.
  sandbox: null,
  mockFs: null,
  fixtures: {},

  // File stuff
  // NOTE: Sync methods are OK here because mocked and in-memory.
  fileRead: function (filePath, encoding) {
    return fs.readFileSync(filePath).toString(encoding);
  },
  fileExists: function (filePath) {
    return fs.existsSync(filePath);
  },

  // Prompts helpers.
  PROMPT_DEFAULTS: null,
  addPromptDefaults: function (data) {
    return _.extend({}, base.PROMPT_DEFAULTS, data);
  }
};

// ----------------------------------------------------------------------------
// Global Setup / Teardown
// ----------------------------------------------------------------------------
before(function (done) {
  // Set test environment
  process.env.NODE_ENV = process.env.NODE_ENV || "test";

  var derived = _.mapValues(prompts._DEFAULTS.derived, function (fn) {
    return fn.bind(null, {});
  });

  // Async resolve defaults for all tests here.
  async.auto(derived, function (err, results) {
    // Hard-code in "destination" for test-sensible-default.
    base.PROMPT_DEFAULTS = _.extend({ destination: "destination" }, results);
    done(err);
  });
});

before(function (done) {
  // Before we mock out the filesystem, let's load some buffers!
  async.map([
    "formidagon.png",
    "formidagon.svg",
    "formidagon.tmpl.svg"
  ], function (fixtureName, cb) {
    fs.readFile(path.join(__dirname, "../fixtures", fixtureName), function (err, buffer) {
      if (err) { return void cb(err); }
      base.fixtures[fixtureName] = buffer;
      cb();
    });
  }, done);
});

beforeEach(function () {
  // From this point forward, all `fs` is **mocked**. This means that:
  // - File access through `fs` is mocked.
  // - Lazy `require()`'s may not work (depending on node version).
  base.mockFs = mockFs;
  base.mockFs();

  // Set up sandbox.
  base.sandbox = sinon.sandbox.create({
    useFakeTimers: true
  });
});

afterEach(function () {
  base.mockFs.restore();
  base.sandbox.restore();
});
