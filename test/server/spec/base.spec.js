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
var async = require("async");
var sinon = require("sinon");
var prompts = require("../../../lib/prompts");

// Export some helpers.
var base = module.exports;
base.sandbox = null;
base.PROMPT_DEFAULTS = null;
base.addPromptDefaults = function (data) {
  return _.extend({}, base.PROMPT_DEFAULTS, data);
};

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
  base.sandbox = sinon.sandbox.create({
    useFakeTimers: true
  });
});

afterEach(function () {
  base.sandbox.restore();
});
