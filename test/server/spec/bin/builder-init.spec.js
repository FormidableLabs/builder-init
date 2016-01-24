"use strict";

/**
 * These are _almost_ functional tests as we're basically invoking the entire
 * application, just:
 *
 * - Mocking filesystem
 * - Stubbing stdin to return canned responses to prompts
 */
var childProc = require("child_process");
var temp = require("temp").track();
var path = require("path");
var Prompt = require("inquirer/lib/prompts/base");

var mock = require("mock-fs");
var fs = require("fs-extra");
var run = require("../../../../bin/builder-init");
var Task = require("../../../../lib/task");
var pkg = require("../../../../package.json");

var base = require("../base.spec");

// **Note**: It would be great to just stub stderr, stdout in beforeEach,
// but then we don't get test output. So, we manually stub with this wrapper.
var stdioWrap = function (fn) {

  return function (done) {
    base.sandbox.stub(process.stdout, "write");

    var _done = function (err) {
      process.stdout.write.restore();
      done(err);
    };

    try {
      return fn(_done);
    } catch (err) {
      return _done(err);
    }
  };
};

describe.only("bin/builder-init", function () {

  beforeEach(function () {
    // Default: empty mocked filesystem.
    mock();
  });

  afterEach(function () {
    mock.restore();
  });

  describe("non-init", function () {

    it("displays help on no args", stdioWrap(function (done) {
      run({ argv: ["node", "builder-init"] }, function (err) {
        if (err) { return done(err); }

        expect(process.stdout.write).to.be.calledWithMatch("builder-init [flags] <archetype>");

        done();
      });
    }));

    it("displays help on -h", stdioWrap(function (done) {
      run({ argv: ["node", "builder-init", "-h"] }, function (err) {
        if (err) { return done(err); }

        expect(process.stdout.write).to.be.calledWithMatch("builder-init [flags] <archetype>");

        done();
      });
    }));

    it("displays version on -v", stdioWrap(function (done) {
      run({ argv: ["node", "builder-init", "-v"] }, function (err) {
        if (err) { return done(err); }

        expect(process.stdout.write).to.be.calledWithMatch(pkg.version);

        done();
      });
    }));

  });

  describe("base cases", function () {

    it("errors on missing init/ and init.js"); // TODO
    it("errors on missing init/ and no init.js"); // TODO
    it("errors on init/ not a directory"); // TODO
    it("errors on failed npm pack download"); // TODO
    it("allows no init.js and empty init/"); // TODO

  });

  describe(".npmignore and .gitignore complexities", function () {

    it("errors on .npmignore collision"); // TODO
    it("errors on .gitignore collision"); // TODO
    it("expands .gitignore"); // TODO
    it("expands .gitignore and excludes ignored files"); // TODO
    it("expands .npmignore"); // TODO
    it("expands .npmignore and .gitignore"); // TODO

  });

  describe("output destination", function () {

    it("errors when destination already exists"); // TODO

  });

  describe("basic", function () {

    it.only("initializes a simple project", stdioWrap(function (done) {
      // TODO: Abstract to the helper at top.
      // TODO: Need to make dirs actually random b/c of `require()` in there.
      mock({
        "tmp-dir": {
          "mock-archetype-0.0.1.tgz": ""
        }
      });

      // Stub out creating a temp directory with a _known_ name.
      base.sandbox.stub(temp, "mkdir").yields(null, "tmp-dir");

      // Override the `npm pack` process to just fail / succeed.
      base.sandbox.stub(childProc, "spawn").returns({
        on: base.sandbox.stub().withArgs("close").yields()
      });

      // Use our special hook to change the filesystem as if we expanded a
      // real download.
      base.sandbox.stub(Task.prototype, "_onExtracted", function (callback) {
        mock({
          "tmp-dir": {
            "mock-archetype-0.0.1.tgz": "",
            "extracted": {
              "init.js": "module.exports = {};",
              "init": {
                "foo.js": "module.exports = { foo: 42 };"
              }
            }
          }
        });

        return callback;
      });

      base.sandbox.stub(Prompt.prototype, "run").yields("dest")

      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        if (err) { return done(err); }

        expect(base.fileRead("dest/foo.js")).to.contain("foo: 42");

        done();
      });
    }));

  });

});
