"use strict";

var Task = require("../../../../lib/task");
var pkg = require("../../../../package.json");
var base = require("../base.spec");

describe("lib/task", function () {

  describe("#execute", function () {

    it("selects help", function (done) {
      base.sandbox.stub(Task.prototype, "help").yields();
      var task = new Task({ argv: ["node", "builder-init", "-h"] });
      task.execute(function () {
        expect(task.isInit()).to.be.false;
        expect(task.help).to.be.calledOnce;
        done();
      });
    });

    it("selects version", function (done) {
      base.sandbox.stub(Task.prototype, "version").yields();
      var task = new Task({ argv: ["node", "builder-init", "--version"] });
      task.execute(function () {
        expect(task.isInit()).to.be.false;
        expect(task.version).to.be.calledOnce;
        done();
      });
    });

    it("selects init", function (done) {
      base.sandbox.stub(Task.prototype, "init").yields();
      var task = new Task({ argv: ["node", "builder-init", "foo-archetype"] });
      task.execute(function () {
        expect(task.isInit()).to.be.true;
        expect(task.init).to.be.calledOnce;
        done();
      });
    });

  });

  describe("#help", function () {

    it("displays help", function (done) {
      base.sandbox.stub(process.stdout, "write");
      base.sandbox.spy(Task.prototype, "help");
      var task = new Task({ argv: ["node", "builder-init", "--help"] });
      task.execute(function (err) {
        if (err) { return void done(err); }
        expect(task.help).to.be.calledOnce;
        expect(process.stdout.write)
          .to.be.calledOnce.and
          .to.be.calledWithMatch("builder-init [flags] <module>");

        done();
      });
    });

  });

  describe("#version", function () {

    it("displays version", function (done) {
      base.sandbox.stub(process.stdout, "write");
      base.sandbox.spy(Task.prototype, "version");
      var task = new Task({ argv: ["node", "builder-init", "-v"] });
      task.execute(function (err) {
        if (err) { return void done(err); }
        expect(task.version).to.be.calledOnce;
        expect(process.stdout.write)
          .to.be.calledOnce.and
          .to.be.calledWithMatch(pkg.version);

        done();
      });
    });

  });

  describe("#init", function () {

    it("displys help if no module specified", function (done) {
      base.sandbox.stub(Task.prototype, "help").yields();
      var task = new Task({ argv: ["node", "builder-init"] });
      task.execute(function () {
        expect(task.isInit()).to.be.false;
        expect(task.help).to.be.calledOnce;
        done();
      });
    });

    it("fails if 2 module specified", function (done) {
      var task = new Task({ argv: ["node", "builder-init", "one", "two"] });
      task.execute(function (err) {
        expect(err).to.have.property("message").to.contain("Found 2 modules");
        done();
      });
    });

  });
});
