'use strict';

var _chai = require('chai');

var _index = require('../src/index.js');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = new _index.ArgdownApplication();
var parserPlugin = new _index.ParserPlugin();
var modelPlugin = new _index.ModelPlugin();
var tagPlugin = new _index.TagPlugin();
app.addPlugin(parserPlugin, 'parse-input');
app.addPlugin(modelPlugin, 'build-model');
app.addPlugin(tagPlugin, 'build-model');

describe("HtmlExport", function () {
  var htmlExport = new _index.HtmlExport();
  app.addPlugin(htmlExport, "export-html");
  it("can export Argdown", function () {
    var request = {
      process: ['parse-input', 'build-model', 'export-html'],
      input: "# Title\n\n[Statement]: Hello World!\n +<Argument>\n\n<Argument>: Description 1 \< 2"
    };
    var result = app.run(request);
    //console.log(result.html);
    (0, _chai.expect)(result.html).to.equal('<!doctype html><html lang="en"><head><meta charset="utf8"><title>Title</title><link rel="stylesheet" href=./argdown.css"></head><body><div class="argdown"><h1 data-line="1" id="heading-title" class="has-line heading">Title</h1><div data-line="has-line 3" class="statement"><span id=statement-statement" class="definition statement-definition definiendum">[<span class="title statement-title">Statement</span>]: </span>Hello World!<div class="relations"><div data-line="4" class="has-line outgoing support relation"><div class="outgoing support relation-symbol"><span>+</span></div><a href="#argument-argument" data-line="4" class="has-line reference argument-reference">&lt;<span class="title argument-title">Argument</span>&gt; </a></div></div></div><div id="argument-argument" data-line="6" class="has-line definition argument-definition"><span class="definiendum argument-definiendum">&lt;<span class="title argument-title">Argument</span>&gt;: </span><span class="argument-definiens definiens description">Description 1 &lt; 2</span></div></div></body></html>');
  });
  it("can export the argdown intro", function () {
    var source = _fs2.default.readFileSync("./test/intro.argdown", 'utf8');
    var result = app.run({ process: ['parse-input', 'build-model', 'export-html'], input: source });
    (0, _chai.expect)(result.lexerErrors).to.be.empty;
    (0, _chai.expect)(result.parserErrors).to.be.empty;
  });
  it("can create class names for tags", function () {
    var source = '[Statement 1]: #tag1\n      + [Statement 2]: #tag2\n        - [Statement 3]: #tag3';
    var result = app.run({ process: ['parse-input', 'build-model'], input: source });
    (0, _chai.expect)(result.tagsDictionary).to.exist;
    (0, _chai.expect)(Object.keys(result.tagsDictionary).length).to.be.equal(3);
    (0, _chai.expect)(result.tagsDictionary["tag1"].cssClass).to.be.equal("tag-tag1 tag0");
    (0, _chai.expect)(result.tagsDictionary["tag1"].index).to.be.equal(0);
    (0, _chai.expect)(result.tagsDictionary["tag2"].cssClass).to.be.equal("tag-tag2 tag1");
    (0, _chai.expect)(result.tagsDictionary["tag2"].index).to.be.equal(1);
    (0, _chai.expect)(result.tagsDictionary["tag3"].cssClass).to.be.equal("tag-tag3 tag2");
    (0, _chai.expect)(result.tagsDictionary["tag3"].index).to.be.equal(2);
    (0, _chai.expect)(result.statements["Statement 1"].sortedTags).to.exist;
    (0, _chai.expect)(result.statements["Statement 1"].sortedTags.length).to.equal(1);
  });
  it("can export titles with ranges", function () {
    var source = '# title _italic_ **bold**';
    var result = app.run({ process: ['parse-input', 'build-model', 'export-html'], input: source, html: { headless: true } });
    (0, _chai.expect)(result.html).to.equal('<div class="argdown"><h1 data-line="1" id="heading-title-italic-bold" class="has-line heading">title <i>italic</i> <b>bold</b></h1></div>');
  });
});
//# sourceMappingURL=html-export.spec.js.map