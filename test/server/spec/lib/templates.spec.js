"use strict";

var path = require("path");
var _ = require("lodash");
var Templates = require("../../../../lib/templates");

require("../base.spec");

describe("lib/templates", function () {
  var basicTemplates;
  var basicRawTmpls;

  before(function (done) {
    // File I/O: Do a one-time load of the basic fixtures.
    // Leave `dest`, `data` empty for later hacking.
    basicTemplates = new Templates({
      src: path.join(__dirname, "../../fixtures/basic"),
      dest: path.join(__dirname, "../../fixtures/basic-dest")
    });
    basicTemplates.load(function (err, tmpls) {
      basicRawTmpls = tmpls;
      done(err);
    });
  });

  afterEach(function () {
    // Reset data for persistent `basicTemplates` object as tests are allowed
    // to hack this up.
    basicTemplates.data = {};
  });

  describe("#resolveFilename", function () {
    var resolveFilename;

    before(function () {
      // Reuse object
      var instance = new Templates({
        data: {
          fruit: "apple",
          vegetable: "tomato"
        }
      });
      resolveFilename = instance.resolveFilename.bind(instance);
    });

    it("handles base cases", function () {
      expect(resolveFilename()).to.equal("");
      expect(resolveFilename(null)).to.equal("");
      expect(resolveFilename(undefined)).to.equal("");
    });

    it("passes through non-template strings", function () {
      expect(resolveFilename("a")).to.equal("a");
      expect(resolveFilename("{{}}")).to.equal("{{}}");
      expect(resolveFilename("{singlecurly}.js")).to.equal("{singlecurly}.js");
      expect(resolveFilename("foo/bar.txt")).to.equal("foo/bar.txt");
    });

    it("resolves single tokens", function () {
      expect(resolveFilename("{{fruit}}.js")).to.equal("apple.js");
      expect(resolveFilename("foo/{{vegetable}}/bar.txt")).to.equal("foo/tomato/bar.txt");
    });

    it("resolves multiple tokens", function () {
      expect(resolveFilename("foo/{{vegetable}}/{{fruit}}.txt")).to.equal("foo/tomato/apple.txt");
    });

    it("throws error on unmatched tokens", function () {
      expect(function () {
        resolveFilename("{{tree}}.js");
      }).to.throw(/Unknown/);
      expect(function () {
        resolveFilename("foo/{{vegetable}}/{{extra}}/{{fruit}}.txt");
      }).to.throw(/Unknown/);
    });

    it("throws errors on tokens in tokens", function () {
      expect(function () {
        resolveFilename("{{ihaz{{fruit}}}}.js");
      }).to.throw(/Forbidden/);
      expect(function () {
        resolveFilename("{{{{fruit}}}}.js");
      }).to.throw(/Forbidden/);
    });
  });


  describe("#processTemplate", function () {
    var instance;
    var processTemplate;

    beforeEach(function () {
      instance = new Templates();
      processTemplate = instance.processTemplate.bind(instance);
    });

    it("handles non-parsed content", function () {
      expect(processTemplate({ dest: "foo", content: "" }))
        .to.eql({ dest: "foo", content: "" });
      expect(processTemplate({ dest: "bar/bar", content: "Hi" }))
        .to.eql({ dest: "bar/bar", content: "Hi" });
    });

    it("leaves ES template strings untouched", function () {
      expect(processTemplate({ dest: "foo", content: "var foo = `${bar} yo`;" }))
        .to.eql({ dest: "foo", content: "var foo = `${bar} yo`;" });
      expect(processTemplate({ dest: "foo", content: "var foo = { bar: `${bar} yo` };" }))
        .to.eql({ dest: "foo", content: "var foo = { bar: `${bar} yo` };" });
    });

    it("parses file content", function () {
      instance.data = { bar: "42" };
      expect(processTemplate({ dest: "foo", content: "var foo = <%=bar%>;" }))
        .to.eql({ dest: "foo", content: "var foo = 42;" });
      expect(processTemplate({ dest: "foo", content: "var foo = {bar: <%= bar %>};" }))
        .to.eql({ dest: "foo", content: "var foo = {bar: 42};" });
    });

    it("parses file names", function () {
      instance.data = { file: "the-stuffz", bar: "23" };
      expect(processTemplate({ dest: "{{file}}.js", content: "var foo = <%=bar%>;" }))
        .to.eql({ dest: "the-stuffz.js", content: "var foo = 23;" });
      expect(processTemplate({ dest: "{{file}}/bar/{{bar}}.js", content: "HI" }))
        .to.eql({ dest: "the-stuffz/bar/23.js", content: "HI" });
    });
  });

  describe("#process", function () {
    var process;

    describe("empty templates", function () {
      var instance;

      beforeEach(function () {
        instance = new Templates({
          src: path.join(__dirname, "../../fixtures/nonexistent"),
          dest: path.join(__dirname, "../../fixtures/nonexistent-dest")
        });
        process = instance.process.bind(instance);

        // Ensure no file i/o and reuse already loaded source templates
        sandbox.stub(instance, "load").yields(null, []);
        sandbox.stub(instance, "writeTemplate").yields();
      });

      it("succeeds with no writes", function (done) {
        process(function (err) {
          expect(err).to.not.be.ok;
          expect(instance.writeTemplate).not.to.be.called;
          done();
        });
      });
    });

    describe("basic fixture", function () {
      beforeEach(function () {
        process = basicTemplates.process.bind(basicTemplates);

        // Ensure no file i/o and reuse already loaded source templates
        sandbox.stub(basicTemplates, "load").yields(null, basicRawTmpls);
        sandbox.stub(basicTemplates, "writeTemplate").yields(null);
      });

      it("errors on missing data value", function (done) {
        // Data is missing `text`.
        basicTemplates.data = {
          code: "the-codez",
          codeName: "TheCodez",
          username: "Billy"
        };

        process(function (err) {
          expect(err)
            .to.be.ok.and
            .to.have.property("message").and
              .to.contain("Unknown").and
              .to.contain("text");

          done();
        });
      });

      it("errors on file name expansion clash", function (done) {
        // `text` value clashes with real file.
        basicTemplates.data = {
          code: "the-codez",
          codeName: "TheCodez",
          text: "README",
          username: "Billy"
        };

        process(function (err) {
          expect(err)
            .to.be.ok.and
            .to.have.property("message").and
              .to.contain("Encountered 1 file path conflict").and
              .to.contain("README");

          done();
        });
      });

      it("writes out correct templates", function (done) {
        // Hack in valid data.
        basicTemplates.data = {
          code: "the-codez",
          codeName: "TheCodez",
          text: "the-textz",
          username: "Billy"
        };

        process(function (err, procTmpls) {
          expect(err).to.not.be.ok;

          // Wrote 4 files (stubbed).
          expect(basicTemplates.writeTemplate)
            .to.be.called.and
            .to.have.callCount(4);

          // Check the resultant templates.
          expect(procTmpls).to.have.length(4);

          var procObj = _(procTmpls)
            .map(function (val) { return [path.relative(__dirname, val.dest), val.content]; })
            .object()
            .value();

          var procPaths = _(procObj).keys().sortBy(_.identity).value();
          expect(procPaths).to.deep.equal([
            "../../fixtures/basic-dest/README.md",
            "../../fixtures/basic-dest/src/index.js",
            "../../fixtures/basic-dest/src/the-codez.js",
            "../../fixtures/basic-dest/the-textz.md"
          ]);

          expect(procObj).to.have.property("../../fixtures/basic-dest/README.md").and
            .to.contain("Basic Tests");

          expect(procObj).to.have.property("../../fixtures/basic-dest/the-textz.md").and
            .to.contain("Billy");

          expect(procObj).to.have.property("../../fixtures/basic-dest/src/index.js").and
            .to.contain("TheCodez").and
            .to.contain("the-codez");

          expect(procObj).to.have.property("../../fixtures/basic-dest/src/the-codez.js").and
            .to.contain("Billy");

          done();
        });
      });
    });
  });
});
