"use strict";

/**
 * These are _almost_ functional tests as we're basically invoking the entire
 * application, just:
 *
 * - Mocking filesystem
 * - Stubbing stdin to return canned responses to prompts
 */
var mock = require("mock-fs");
var run = require("../../../../bin/builder-init");
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

    it("initializes a simple project"); // TODO

  });

});
