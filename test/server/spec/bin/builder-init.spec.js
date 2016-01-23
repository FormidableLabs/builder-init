"use strict";

/**
 * These are _almost_ functional tests as we're basically invoking the entire
 * application, just:
 *
 * - Mocking filesystem
 * - Stubbing stdin to return canned responses to prompts
 */
var run = require("../../../../bin/builder-init");

require("../base.spec");

describe("bin/builder-init", function () {

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
