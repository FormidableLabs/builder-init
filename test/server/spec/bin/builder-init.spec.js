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

});
