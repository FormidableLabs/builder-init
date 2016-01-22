"use strict";

var Task = require("../../../../lib/task");

require("../base.spec");

describe("lib/task", function () {

  describe("#execute", function () {
    beforeEach(function () {
      sandbox.stub(Task.prototype, "help").yields();
      sandbox.stub(Task.prototype, "version").yields();
      sandbox.stub(Task.prototype, "init").yields();
    });

    it("selects help", function (done) {
      var task = new Task({ argv: ["node", "builder-init", "-h"] });
      task.execute(function () {
        expect(task.help).to.be.calledOnce;
        done();
      });
    });

    it("selects version", function (done) {
      var task = new Task({ argv: ["node", "builder-init", "--version"] });
      task.execute(function () {
        expect(task.version).to.be.calledOnce;
        done();
      });
    });

    it("selects init", function (done) {
      var task = new Task({ argv: ["node", "builder-init", "foo-archetype"] });
      task.execute(function () {
        expect(task.init).to.be.calledOnce;
        done();
      });
    });
  })
});
