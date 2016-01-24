"use strict";

/**
 * Base server unit test initialization / global before/after's.
 *
 * This file should be `require`'ed by all other test files.
 *
 * **Note**: Because there is a global sandbox server unit tests should always
 * be run in a separate process from other types of tests.
 */
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

  // File stuff
  // NOTE: Sync methods are OK here because mocked and in-memory.
  fileRead: function (filePath) {
    return fs.readFileSync(filePath).toString();
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

beforeEach(function () {
  base.mockFs = mockFs;
  base.sandbox = sinon.sandbox.create({
    useFakeTimers: true
  });
});

afterEach(function () {
  base.mockFs.restore();
  base.sandbox.restore();
});
