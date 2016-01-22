"use strict";

var Task = require("../../../../lib/task");

require("../base.spec");

describe("lib/task", function () {

  describe("#execute", function () {

    it("selects help", function (done) {
      sandbox.stub(Task.prototype, "help").yields();
      var task = new Task({ argv: ["node", "builder-init", "-h"] });
      task.execute(function () {
        expect(task.help).to.be.calledOnce;
        done();
      });
    });

    it("selects version", function (done) {
      sandbox.stub(Task.prototype, "version").yields();
      var task = new Task({ argv: ["node", "builder-init", "--version"] });
      task.execute(function () {
        expect(task.version).to.be.calledOnce;
        done();
      });
    });

    it("selects init", function (done) {
      sandbox.stub(Task.prototype, "init").yields();
      var task = new Task({ argv: ["node", "builder-init", "foo-archetype"] });
      task.execute(function () {
        expect(task.init).to.be.calledOnce;
        done();
      });
    });

  });

  describe("#init", function () {

    it("fails if no archetype specified", function (done) {
      var task = new Task({ argv: ["node", "builder-init"] });
      task.execute(function (err) {
        expect(err).to.have.property("message").to.contain("Found 0 archetypes");
        done();
      });
    });

    it("fails if 2 archetypes specified", function (done) {
      var task = new Task({ argv: ["node", "builder-init", "one", "two"] });
      task.execute(function (err) {
        expect(err).to.have.property("message").to.contain("Found 2 archetypes");
        done();
      });
    });

    // TODO: Add mocked module installations.
    it("initializes from file");    // Try with `mock-fs`.
    it("initializes from github");  // Need mocked network / npm.
    it("initializes from git");     // Need mocked network / npm.

  });
});
