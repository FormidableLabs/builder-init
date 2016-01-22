"use strict";

/**
 * These are _almost_ functional tests as we're basically invoking the entire
 * application, just:
 *
 * - Mocking filesystem
 * - Stubbing stdin to return canned responses to prompts
 */
require("../base.spec");

describe("bin/builder-init", function () {

  describe("base cases", function () {

    it("handles no init.js"); // TODO
    it("handles no init/"); // TODO
    it("handles no init/ and no init.js"); // TODO

  });

  describe(".npmignore and .gitignore complexities", function () {

    it("errors on .npmignore collision"); // TODO
    it("errors on .gitignore collision"); // TODO
    it("expands .gitignore"); // TODO
    it("expands .npmignore"); // TODO
    it("expands .npmignore and .gitignore"); // TODO

  });

});
