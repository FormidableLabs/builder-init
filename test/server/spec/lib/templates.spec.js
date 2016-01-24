"use strict";

var Templates = require("../../../../lib/templates");
var base = require("../base.spec");

describe("lib/templates", function () {

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

    describe("nonexistent templates directory", function () {
      var instance;

      beforeEach(function () {
        instance = new Templates({
          src: "nonexistent-dir",
          dest: "nonexistent-dir-dest"
        });
        process = instance.process.bind(instance);
      });

      it("allows nonexistent directory", function (done) {
        process(function (err) {
          expect(err).to.not.be.ok;
          done();
        });
      });
    });

    describe("empty templates directory", function () {
      var instance;

      beforeEach(function () {
        base.mockFs({
          "empty-dir": {
            "another-empty-dir": {}
          }
        });

        instance = new Templates({
          src: "empty-dir",
          dest: "empty-dir-dest"
        });
        process = instance.process.bind(instance);
      });

      it("allows empty directory", function (done) {
        process(function (err) {
          expect(err).to.not.be.ok;
          done();
        });
      });
    });

    describe("gitignore file", function () {
      var instance;

      beforeEach(function () {
        base.mockFs({
          "src": {
            ".gitignore": "coverage",
            "COPY.txt": "Should be copied",
            coverage: {
              "NO_COPY.txt": "Should not be copied"
            }
          }
        });

        instance = new Templates({
          src: "src",
          dest: "dest",
          data: base.addPromptDefaults() // Always get these from prompts
        });
        process = instance.process.bind(instance);
      });

      it("ignores .gitignore'd files", function (done) {
        process(function (err) {
          if (err) { return done(err); }

          expect(base.fileRead("dest/.gitignore")).to.equal("coverage");
          expect(base.fileRead("dest/COPY.txt")).to.equal("Should be copied");
          expect(base.fileExists("dest/coverage")).to.be.false;
          expect(base.fileExists("dest/coverage/NO_COPY.txt")).to.be.false;

          done();
        });
      });
    });

    describe("gitignore template", function () {
      var instance;

      beforeEach(function () {
        base.mockFs({
          "src": {
            "{{gitignore}}": "coverage", // Use token name per our guidelines
            "COPY.txt": "Should be copied",
            coverage: {
              "NO_COPY.txt": "Should not be copied"
            }
          }
        });

        instance = new Templates({
          src: "src",
          dest: "dest",
          data: base.addPromptDefaults() // Always get these from prompts
        });
        process = instance.process.bind(instance);
      });

      it("ignores .gitignore'd files", function (done) {
        process(function (err) {
          if (err) { return done(err); }

          expect(base.fileRead("dest/.gitignore")).to.equal("coverage");
          expect(base.fileRead("dest/COPY.txt")).to.equal("Should be copied");
          expect(base.fileExists("dest/coverage")).to.be.false;
          expect(base.fileExists("dest/coverage/NO_COPY.txt")).to.be.false;

          done();
        });
      });
    });

    describe("basic templates", function () {
      var basicTemplates;

      beforeEach(function () {
        // Mock filesystem
        base.mockFs({
          basic: {
            src: {
              "index.js": "var <%= codeName %> = require(\"./<%= code %>.js\");\n\n" +
                "module.exports[<%= codeName %>] = <%= codeName %>;\n",
              "{{code}}.js": "module.exports = {\n" +
                "  greeting: \"Hello <%= username %>\"\n" +
                "};"
            },
            "README.md": "# Basic Tests\n\n" +
              "These files are to test out basic interpolation for file name and contents.\n",
            "{{text}}.md": "<%= username %>'s very own file\n"
          }
        });

        // Leave `data` empty for later hacking.
        basicTemplates = new Templates({
          src: "basic",
          dest: "basic-dest"
        });

        process = basicTemplates.process.bind(basicTemplates);
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

        process(function (err) {
          if (err) { return done(err); }

          expect(base.fileRead("basic-dest/README.md")).to.contain("Basic Tests");
          expect(base.fileRead("basic-dest/the-textz.md")).to.contain("Billy");
          expect(base.fileRead("basic-dest/src/index.js"))
            .to.contain("TheCodez").and
            .to.contain("the-codez");
          expect(base.fileRead("basic-dest/src/the-codez.js")).to.contain("Billy");

          done();
        });
      });
    });
  });
});
