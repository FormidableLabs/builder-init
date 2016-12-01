"use strict";

/**
 * These are _almost_ functional tests as we're basically invoking the entire
 * application, just:
 *
 * - Mocking filesystem
 * - Stubbing stdin to return canned responses to prompts
 */
var init = require("../../../../bin/builder-init");

var base = require("../base.spec");

var util = require("../../util")(base);
var stdioWrap = util.stdioWrap;
var mockFlow = util.mockFlow;

var SCRIPT = "builder-init";

describe("bin/builder-init", function () {

  describe("errors", function () {

    it("errors on missing init/ and no init.js", stdioWrap(function (done) {
      mockFlow({});
      init({ argv: ["node", SCRIPT, "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message").that.contains("init' directory not found");
        done();
      });
    }));

    it("errors on missing init/ with init.js", stdioWrap(function (done) {
      mockFlow({
        "init.js": "module.exports = {};"
      });
      init({ argv: ["node", SCRIPT, "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message").that.contains("init' directory not found");
        done();
      });
    }));

    it("errors on init/ not a directory", stdioWrap(function (done) {
      mockFlow({
        "init": "file, not a directory"
      });
      init({ argv: ["node", SCRIPT, "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message").that.contains("exists, but is not a directory");
        done();
      });
    }));

    it("errors on invalid init.js", stdioWrap(function (done) {
      mockFlow({
        "init.js": "BAD_CODE {",
        "init": {
          "{{name}}.txt": "A <%= name %>."
        }
      });
      init({ argv: ["node", SCRIPT, "mock-archetype"] }, function (err) {
        expect(err).to.have.property("message")
          .that.contains("[" + SCRIPT + "] Error while importing 'mock-archetype/init.js'").and
          .that.contains("Unexpected token {");

        done();
      });
    }));

  });

  describe("basic", function () {

    it("allows no init.js and empty init/", stdioWrap(function (done) {
      mockFlow({
        "init": {}
      });
      init({ argv: ["node", SCRIPT, "mock-archetype"] }, done);
    }));

    it("allows no init.js with init/", stdioWrap(function (done) {
      mockFlow({
        "init": {
          "foo.js": "module.exports = { foo: 42 };"
        }
      });

      init({ argv: ["node", SCRIPT, "mock-archetype"] }, function (err) {
        if (err) { return void done(err); }

        expect(base.fileRead("dest/foo.js")).to.contain("foo: 42");

        done();
      });
    }));

    it("allows overriding templates dir", stdioWrap(function (done) {
      var stubs = mockFlow({
        "init.js": "module.exports = " + JSON.stringify({
          prompts: {
            _templatesDir: { message: "new templates dir" }
          }
        }) + ";",
        "different-tmpl": {
          "README.md": "My readme"
        }
      });

      // Note: These have to match prompt fields + `destination` in order.
      stubs.prompt
        .reset()
        .onCall(0).yields("different-tmpl")
        .onCall(1).yields("dest");

      init({ argv: ["node", SCRIPT, "mock-archetype"] }, function (err) {
        if (err) { return void done(err); }

        expect(base.fileRead("dest/README.md")).to.contain("My readme");

        done();
      });
    }));

    it("adds archetype prod/dev package.json", stdioWrap(function (done) {
      var stubs = mockFlow({
        "package.json": JSON.stringify({
          version: "0.1.2"
        }),
        "dev": {
          "package.json": JSON.stringify({
            version: "0.1.1"
          })
        },
        "init.js": "module.exports = " + JSON.stringify({
          prompts: {
            fileName: { message: "a file name" },
            varName: { message: "a variable name" }
          }
        }) + ";",
        "init": {
          "README.md": "My readme",
          "{{fileName}}.js": "module.exports = { <%= varName %>: 'foo' };",
          "package.json": JSON.stringify({
            dependencies: {
              "mock-archetype":
                "<%= archetype.package.version ? '^' + archetype.package.version : '*' %>"
            },
            devDependencies: {
              "mock-archetype-dev":
                "<%= archetype.devPackage.version ? '^' + archetype.devPackage.version : '*' %>"
            }
          }, null, 2)
        }
      });

      // Note: These have to match prompt fields + `destination` in order.
      stubs.prompt
        .reset()
        .onCall(0).yields("file-name")
        .onCall(1).yields("myCoolVar")
        .onCall(2).yields("dest");

      init({ argv: ["node", SCRIPT, "mock-archetype"] }, function (err) {
        if (err) { return void done(err); }

        expect(base.fileRead("dest/README.md")).to.contain("My readme");
        expect(base.fileRead("dest/file-name.js")).to.contain("myCoolVar: 'foo'");
        expect(base.fileRead("dest/package.json"))
          .to.contain("\"mock-archetype\": \"^0.1.2\"").and
          .to.contain("\"mock-archetype-dev\": \"^0.1.1\"");

        done();
      });
    }));

    it("initializes a basic project", stdioWrap(function (done) {
      var stubs = mockFlow({
        "init.js": "module.exports = " + JSON.stringify({
          prompts: {
            fileName: { message: "a file name" },
            varName: { message: "a variable name" }
          }
        }) + ";",
        "init": {
          "{{npmignore}}": "coverage",
          "{{gitignore}}": "coverage",
          "README.md": "My readme",
          "package.json": JSON.stringify({
            dependencies: {
              "mock-archetype":
                "<%= archetype.package.version ? '^' + archetype.package.version : '*' %>"
            },
            devDependencies: {
              "mock-archetype-dev":
                "<%= archetype.devPackage.version ? '^' + archetype.devPackage.version : '*' %>"
            }
          }, null, 2),
          "{{fileName}}.js": "module.exports = { <%= varName %>: 'foo' };",
          "test": {
            "client": {
              "spec": {
                "{{fileName}}.spec.js": "describe('<%= fileName %>');"
              }
            }
          }
        }
      });

      // Note: These have to match prompt fields + `destination` in order.
      stubs.prompt
        .reset()
        .onCall(0).yields("file-name")
        .onCall(1).yields("myCoolVar")
        .onCall(2).yields("dest");

      init({ argv: ["node", SCRIPT, "mock-archetype"] }, function (err) {
        if (err) { return void done(err); }

        expect(base.fileRead("dest/.npmignore")).to.contain("coverage");
        expect(base.fileRead("dest/.gitignore")).to.contain("coverage");
        expect(base.fileRead("dest/README.md")).to.contain("My readme");
        expect(base.fileRead("dest/file-name.js")).to.contain("myCoolVar: 'foo'");
        expect(base.fileRead("dest/test/client/spec/file-name.spec.js"))
          .to.contain("describe('file-name');");
        expect(base.fileRead("dest/package.json"))
          .to.contain("\"mock-archetype\": \"*\"").and
          .to.contain("\"mock-archetype-dev\": \"*\"");

        done();
      });
    }));

    it("handles --prompts data with 'archetype' field", stdioWrap(function (done) {
      mockFlow({
        "package.json": JSON.stringify({
          version: "0.1.2"
        }),
        "init.js": "module.exports = " + JSON.stringify({
          prompts: {
            name: { message: "a name" }
          }
        }) + ";",
        "init": {
          "{{name}}.txt": "A <%= _.capitalize(name) %>.",
          "package.json": JSON.stringify({
            dependencies: {
              "mock-archetype":
                "<%= archetype.package.version ? '^' + archetype.package.version : '*' %>"
            }
          }, null, 2)
        }
      });

      var prompts = "--prompts='" + JSON.stringify({
        name: "chester",
        destination: "dest"
      }) + "'";

      init({ argv: ["node", SCRIPT, "archetype", prompts] }, function (err) {
        if (err) { return void done(err); }

        expect(base.fileRead("dest/chester.txt")).to.contain("A Chester.");
        expect(base.fileRead("dest/package.json")).to.contain("\"mock-archetype\": \"^0.1.2\"");

        done();
      });
    }));

  });
});
