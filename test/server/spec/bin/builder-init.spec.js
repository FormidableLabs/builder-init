"use strict";

/**
 * These are _almost_ functional tests as we're basically invoking the entire
 * application, just:
 *
 * - Mocking filesystem
 * - Stubbing stdin to return canned responses to prompts
 */
var childProc = require("child_process");
var crypto = require("crypto");
var temp = require("temp").track();
var _ = require("lodash");
var Prompt = require("inquirer/lib/prompts/base");

var run = require("../../../../bin/builder-init");
var Task = require("../../../../lib/task");
var pkg = require("../../../../package.json");

var base = require("../base.spec");

// Helpers
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

// Mock key I/O parts of the flow.
/*eslint-disable max-statements*/
var mockFlow = function (extracted, root) {
  // Returned object.
  var stubs = {};

  // Fake filesystem for before and after (stubbed) extraction.
  var hash = crypto.randomBytes(10).toString("hex");
  var tmpDir = "tmp-dir-" + hash;
  var fsObj = _.extend({}, root);
  fsObj[tmpDir] = {
    "mock-archetype-0.0.1.tgz": ""
  };

  var extractedObj = _.cloneDeep(fsObj);
  extractedObj[tmpDir] = _.merge({}, fsObj[tmpDir], extracted ? { extracted: extracted } : null);

  base.mockFs(fsObj);

  // Stub out creating a temp directory with a _known_ name.
  base.sandbox.stub(temp, "mkdir").yields(null, tmpDir);

  // Immediately call `close` with success exit.
  stubs.spawnOn = base.sandbox.stub();
  stubs.spawnOn.withArgs("error").returns();
  stubs.spawnOn.withArgs("close").yields(0);

  // Override the `npm pack` process to just fail / succeed.
  stubs.spawn = base.sandbox.stub(childProc, "spawn").returns({
    on: stubs.spawnOn
  });

  // Use our special hook to change the filesystem as if we expanded a
  // real download.
  base.sandbox.stub(Task.prototype, "_onExtracted", function (callback) {
    base.mockFs(extractedObj);

    return callback;
  });

  stubs.prompt = base.sandbox.stub(Prompt.prototype, "run").yields("dest");

  return stubs;
};
/*eslint-enable max-statements*/

describe("bin/builder-init", function () {

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

  describe("errors", function () {

    it("errors on missing init/ and no init.js", stdioWrap(function (done) {
      mockFlow({});
      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message").that.contains("init' directory not found");
        done();
      });
    }));

    it("errors on missing init/ with init.js", stdioWrap(function (done) {
      mockFlow({
        "init.js": "module.exports = {};"
      });
      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message").that.contains("init' directory not found");
        done();
      });
    }));

    it("errors on init/ not a directory", stdioWrap(function (done) {
      mockFlow({
        "init": "file, not a directory"
      });
      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message").that.contains("exists, but is not a directory");
        done();
      });
    }));

    it("errors when destination already exists", stdioWrap(function (done) {
      mockFlow({
        "init": {}
      }, {
        "dest": {} // Will collide with default destination.
      });

      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message").that.contains("dest already exists");
        done();
      });
    }));

    it("errors on failed npm pack download", stdioWrap(function (done) {
      var stubs = mockFlow({
        "init": {}
      });

      // Fake npm pack download error.
      stubs.spawnOn.reset();
      stubs.spawnOn.withArgs("error").returns();
      stubs.spawnOn.withArgs("close").yields(1);

      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message").that.contains("exited with error code: 1");
        done();
      });
    }));

    it("errors on invalid --prompts data", stdioWrap(function (done) {
      mockFlow({
        "init.js": "module.exports = " + JSON.stringify({
          prompts: {
            name: { message: "a name" }
          }
        }) + ";",
        "init": {}
      });
      run({ argv: ["node", "builder-init", "archetype", "--prompts=INVALID"] }, function (err) {
        expect(err).to.have.property("message").that.contains("Prompt overrides loading failed");
        done();
      });
    }));

  });

  describe(".npmignore and .gitignore complexities", function () {

    it("errors on .npmignore collision", stdioWrap(function (done) {
      mockFlow({
        "init": {
          ".npmignore": "",
          "{{npmignore}}": ""
        }
      });
      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message")
          .that.contains("Encountered 1 file path conflict").and
          .that.contains("npmignore");

        done();
      });
    }));

    it("errors on .gitignore collision", stdioWrap(function (done) {
      mockFlow({
        "init": {
          ".gitignore": "",
          "{{gitignore}}": ""
        }
      });
      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message")
          .that.contains("Encountered 1 file path conflict").and
          .that.contains("gitignore");

        done();
      });
    }));

    it("errors on .gitignore and .npmignore collisions", stdioWrap(function (done) {
      mockFlow({
        "init": {
          ".gitignore": "",
          "{{gitignore}}": "",
          ".npmignore": "",
          "{{npmignore}}": ""
        }
      });
      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message")
          .that.contains("Encountered 2 file path conflicts").and
          .that.contains("gitignore").and
          .that.contains("npmignore");

        done();
      });
    }));

    it("expands .gitignore and excludes ignored files", stdioWrap(function (done) {
      var stubs = mockFlow({
        "init.js": "module.exports = " + JSON.stringify({
          prompts: {
            fileName: { message: "a file name" },
            varName: { message: "a variable name" }
          }
        }) + ";",
        "init": {
          "{{gitignore}}": "coverage",
          "coverage": {
            "a-file": "shouldn't be copied"
          },
          "{{fileName}}.js": "module.exports = { <%= varName %>: 'foo' };"
        }
      });

      // Note: These have to match prompt fields + `destination` in order.
      stubs.prompt
        .reset()
        .onCall(0).yields("file-name")
        .onCall(1).yields("myCoolVar")
        .onCall(2).yields("dest");

      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        if (err) { return done(err); }

        expect(base.fileRead("dest/.gitignore")).to.contain("coverage");
        expect(base.fileRead("dest/file-name.js")).to.contain("myCoolVar: 'foo'");
        expect(base.fileExists("dest/coverage/a-file")).to.be.false;

        done();
      });
    }));

  });

  describe("basic", function () {

    it("allows no init.js and empty init/", stdioWrap(function (done) {
      mockFlow({
        "init": {}
      });
      run({ argv: ["node", "builder-init", "mock-archetype"] }, done);
    }));

    it("allows no init.js with init/", stdioWrap(function (done) {
      mockFlow({
        "init": {
          "foo.js": "module.exports = { foo: 42 };"
        }
      });

      run({ argv: ["node", "builder-init", "mock-archetype"] }, function (err) {
        if (err) { return done(err); }

        expect(base.fileRead("dest/foo.js")).to.contain("foo: 42");

        done();
      });
    }));

    it("initializes a simple project"); // TODO
    it("expands templates"); // TODO
    it("handles all the bells and whistles"); // TODO
    it("handles --prompts data"); // TODO

  });

});
