import { expect } from 'chai';
import {ArgdownApplication, ParserPlugin, ModelPlugin, TagPlugin, HtmlExport} from '../src/index.js';
import fs from 'fs';

const app = new ArgdownApplication();
const parserPlugin = new ParserPlugin();
const modelPlugin = new ModelPlugin();
const tagPlugin = new TagPlugin();
app.addPlugin(parserPlugin, 'parse-input');
app.addPlugin(modelPlugin,'build-model');
app.addPlugin(tagPlugin, 'build-model');

describe("HtmlExport", function() {
  let htmlExport = new HtmlExport();
  app.addPlugin(htmlExport, "export-html");
  it("can export Argdown", function(){
    let request = {
      process: ['parse-input', 'build-model', 'export-html'],
      input: "# Title\n\n[Statement]: Hello World!\n +<Argument>\n\n<Argument>: Description 1 \< 2"
    }
    let result = app.run(request);
    //console.log(result.html);
    expect(result.html).to.equal(`<!doctype html><html lang="en"><head><meta charset="utf8"><title>Title</title><link rel="stylesheet" href=./argdown.css"></head><body><div class="argdown"><h1 data-line="1" id="heading-title" class="has-line heading">Title</h1><div data-line="has-line 3" class="statement"><span id=statement-statement" class="definition statement-definition definiendum">[<span class="title statement-title">Statement</span>]: </span>Hello World!<div class="relations"><div data-line="4" class="has-line outgoing support relation"><div class="outgoing support relation-symbol"><span>+</span></div><a href="#argument-argument" data-line="4" class="has-line reference argument-reference">&lt;<span class="title argument-title">Argument</span>&gt; </a></div></div></div><div id="argument-argument" data-line="6" class="has-line definition argument-definition"><span class="definiendum argument-definiendum">&lt;<span class="title argument-title">Argument</span>&gt;: </span><span class="argument-definiens definiens description">Description 1 &lt; 2</span></div></div></body></html>`);
  });
  it("can export the argdown intro", function(){
    let source = fs.readFileSync("./test/intro.argdown", 'utf8');
    let result = app.run({process: ['parse-input','build-model','export-html'], input:source});
    expect(result.lexerErrors).to.be.empty;
    expect(result.parserErrors).to.be.empty;
  });  
  it("can create class names for tags", function(){
    let source = `[Statement 1]: #tag1
      + [Statement 2]: #tag2
        - [Statement 3]: #tag3`;
    let result = app.run({process: ['parse-input','build-model'], input:source});
    expect(result.tagsDictionary).to.exist;
    expect(Object.keys(result.tagsDictionary).length).to.be.equal(3);
    expect(result.tagsDictionary["tag1"].cssClass).to.be.equal("tag-tag1 tag0");
    expect(result.tagsDictionary["tag1"].index).to.be.equal(0);
    expect(result.tagsDictionary["tag2"].cssClass).to.be.equal("tag-tag2 tag1");
    expect(result.tagsDictionary["tag2"].index).to.be.equal(1);
    expect(result.tagsDictionary["tag3"].cssClass).to.be.equal("tag-tag3 tag2");
    expect(result.tagsDictionary["tag3"].index).to.be.equal(2);
    expect(result.statements["Statement 1"].sortedTags).to.exist;
    expect(result.statements["Statement 1"].sortedTags.length).to.equal(1);
  });
  it("can export titles with ranges", function(){
    let source = `# title _italic_ **bold**`;
    let result = app.run({process: ['parse-input','build-model', 'export-html'], input:source, html:{headless:true}});
    expect(result.html).to.equal(`<div class="argdown"><h1 data-line="1" id="heading-title-italic-bold" class="has-line heading">title <i>italic</i> <b>bold</b></h1></div>`);
  });
});
