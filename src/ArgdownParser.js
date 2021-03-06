"use strict";

import chevrotain, { Parser } from "chevrotain";
import { ArgdownLexer } from "./ArgdownLexer.js";
import { ArgdownErrorMessageProvider } from "./ArgdownErrorMessageProvider.js";

const createRuleNode = (name, children) => {
  const firstChild = children[0];
  const lastChild = children[children.length - 1];
  return {
    name,
    startLine: firstChild.startLine,
    startColumn: firstChild.startColumn,
    endLine: lastChild.endLine,
    endColumn: lastChild.endColumn,
    children
  };
};

class ArgdownParser extends chevrotain.Parser {
  constructor(input, lexer) {
    super(input, lexer.tokens, {
      errorMessageProvider: ArgdownErrorMessageProvider,
      recoveryEnabled: true
    });
    let $ = this;
    $.lexer = lexer;

    $.argdown = $.RULE("argdown", () => {
      $.OPTION1(() => {
        $.CONSUME1(lexer.Emptyline);
      });
      // OR caching. see: http://sap.github.io/chevrotain/docs/FAQ.html#major-performance-benefits
      let atLeastOne = $.AT_LEAST_ONE_SEP({
        SEP: lexer.Emptyline,
        DEF: () =>
          $.OR(
            $.c1 ||
              ($.c1 = [
                {
                  ALT: () => $.SUBRULE($.heading)
                },
                {
                  ALT: () => $.SUBRULE($.statement)
                },
                {
                  ALT: () => $.SUBRULE($.argument)
                },
                {
                  ALT: () => $.SUBRULE($.argumentDefinition)
                },
                {
                  ALT: () => $.SUBRULE($.argumentReference)
                },
                {
                  ALT: () => $.SUBRULE($.orderedList)
                },
                {
                  ALT: () => $.SUBRULE($.unorderedList)
                }
              ])
          )
      });

      return {
        name: "argdown",
        children: atLeastOne.values
      };
    });

    $.heading = $.RULE("heading", () => {
      let children = [];
      children.push($.CONSUME(lexer.HeadingStart));
      $.AT_LEAST_ONE({
        DEF: () => children.push($.SUBRULE($.statementContent))
      });
      return createRuleNode("heading", children);
    });
    $.argument = $.RULE("argument", () => {
      let children = [];
      children.push($.SUBRULE($.argumentStatement));
      $.AT_LEAST_ONE({
        DEF: () => {
          children.push($.SUBRULE($.argumentBody));
        }
      });
      return createRuleNode("argument", children);
    });
    $.argumentBody = $.RULE("argumentBody", () => {
      let children = [];
      $.MANY({
        DEF: () => {
          children.push($.SUBRULE2($.argumentStatement));
        }
      });
      children.push($.SUBRULE($.inference));
      children.push($.SUBRULE1($.argumentStatement));
      return createRuleNode("argumentBody", children);
    });
    $.argumentStatement = $.RULE("argumentStatement", () => {
      let children = [];
      children.push($.CONSUME(lexer.StatementNumber));
      children.push($.SUBRULE($.statement));
      return createRuleNode("argumentStatement", children);
    });
    $.inference = $.RULE("inference", () => {
      let children = [];
      children.push($.CONSUME(lexer.InferenceStart));
      $.OPTION1(() => {
        children.push($.SUBRULE($.inferenceRules));
      });
      $.OPTION2(() => {
        children.push($.SUBRULE($.metadata));
      });
      children.push($.CONSUME(lexer.InferenceEnd));
      return createRuleNode("inference", children);
    });
    $.inferenceRules = $.RULE("inferenceRules", () => {
      let children = [];
      $.AT_LEAST_ONE_SEP1({
        SEP: lexer.ListDelimiter,
        DEF: () => children.push($.SUBRULE($.freestyleText))
      });
      return {
        name: "inferenceRules",
        children: children
      };
    });
    $.metadata = $.RULE("metadata", () => {
      let children = [];
      children.push($.CONSUME(lexer.MetadataStart));
      $.AT_LEAST_ONE_SEP({
        SEP: lexer.MetadataStatementEnd,
        DEF: () => children.push($.SUBRULE($.metadataStatement))
      });
      children.push($.CONSUME(lexer.MetadataEnd));
      return {
        name: "metadata",
        children: children
      };
    });
    $.metadataStatement = $.RULE("metadataStatement", () => {
      let children = [];
      children.push($.SUBRULE1($.freestyleText));
      $.CONSUME(lexer.Colon);
      $.AT_LEAST_ONE_SEP({
        SEP: lexer.ListDelimiter,
        DEF: () => children.push($.SUBRULE2($.freestyleText))
      });
      return {
        name: "metadataStatement",
        children: children
      };
    });

    $.orderedList = $.RULE("orderedList", () => {
      let children = [];
      children.push($.CONSUME(lexer.Indent));
      $.AT_LEAST_ONE(() => children.push($.SUBRULE($.orderedListItem)));
      children.push($.CONSUME(lexer.Dedent));
      return {
        name: "orderedList",
        startLine: children[0].startLine,
        children: children
      };
    });
    $.unorderedList = $.RULE("unorderedList", () => {
      let children = [];
      children.push($.CONSUME(lexer.Indent));
      $.AT_LEAST_ONE(() => children.push($.SUBRULE($.unorderedListItem)));
      children.push($.CONSUME(lexer.Dedent));
      return {
        name: "unorderedList",
        startLine: children[0].startLine,
        children: children
      };
    });

    $.unorderedListItem = $.RULE("unorderedListItem", () => {
      let children = [];
      children.push($.CONSUME(lexer.UnorderedListItem));
      children.push($.SUBRULE($.statement));
      return createRuleNode("unorderedListItem", children);
    });
    $.orderedListItem = $.RULE("orderedListItem", () => {
      let children = [];
      children.push($.CONSUME(lexer.OrderedListItem));
      children.push($.SUBRULE($.statement));
      return createRuleNode("orderedListItem", children);
    });

    $.argumentReference = $.RULE("argumentReference", () => {
      let children = [];
      children.push($.CONSUME(lexer.ArgumentReference));
      $.OPTION(() => {
        children.push($.SUBRULE($.argumentRelations));
      });
      return createRuleNode("argumentReference", children);
    });

    $.argumentDefinition = $.RULE("argumentDefinition", () => {
      let children = [];
      children.push($.CONSUME(lexer.ArgumentDefinition));
      children.push($.SUBRULE2($.statementContent));
      $.OPTION1(() => {
        children.push($.SUBRULE($.argumentRelations));
      });
      return createRuleNode("argumentDefinition", children);
    });

    $.statement = $.RULE("statement", () => {
      let children = [];
      children[0] = $.OR([
        {
          ALT: () => $.SUBRULE1($.statementContent)
        },
        {
          ALT: () => $.CONSUME(lexer.StatementReference)
        },
        {
          ALT: () => {
            let children = [];
            children.push($.CONSUME(lexer.StatementDefinition));
            children.push($.SUBRULE3($.statementContent));
            return createRuleNode("statementDefinition", children);
          }
        }
        // , {
        // ALT: () => {
        //     let children = [];
        //     children.push($.CONSUME(lexer.StatementReferenceByNumber));
        //     return {
        //         name: "statementReferenceByNumber",
        //         children: children
        //     };
        // }},{
        // ALT: () => {
        //     let children = [];
        //     children.push($.CONSUME(lexer.StatementDefinitionByNumber));
        //     children.push($.SUBRULE2($.statementContent));
        //     return {
        //         name: "statementDefinitionByNumber",
        //         children: children
        //     };
        // }
        //}
      ]);
      $.OPTION(() => {
        children.push($.SUBRULE($.statementRelations));
      });
      return createRuleNode("statement", children);
    });

    $.statementRelations = $.RULE("statementRelations", () => {
      let children = [];
      children.push($.CONSUME(lexer.Indent));
      // OR caching. see: http://sap.github.io/chevrotain/docs/FAQ.html#major-performance-benefits
      let atLeastOne = $.AT_LEAST_ONE(() =>
        $.OR(
          $.c2 ||
            ($.c2 = [
              {
                ALT: () => $.SUBRULE($.incomingSupport)
              },
              {
                ALT: () => $.SUBRULE($.incomingAttack)
              },
              {
                ALT: () => $.SUBRULE($.outgoingSupport)
              },
              {
                ALT: () => $.SUBRULE($.outgoingAttack)
              },
              {
                ALT: () => $.SUBRULE($.contradiction)
              },
              {
                ALT: () => $.SUBRULE($.incomingUndercut)
              }
            ])
        )
      );
      children = children.concat(atLeastOne);
      children.push($.CONSUME(lexer.Dedent));
      return createRuleNode("relations", children);
    });
    $.argumentRelations = $.RULE("argumentRelations", () => {
      let children = [];
      children.push($.CONSUME(lexer.Indent));
      // OR caching. see: http://sap.github.io/chevrotain/docs/FAQ.html#major-performance-benefits
      let atLeastOne = $.AT_LEAST_ONE(() =>
        $.OR(
          $.c3 ||
            ($.c3 = [
              {
                ALT: () => $.SUBRULE($.incomingSupport)
              },
              {
                ALT: () => $.SUBRULE($.incomingAttack)
              },
              {
                ALT: () => $.SUBRULE($.outgoingSupport)
              },
              {
                ALT: () => $.SUBRULE($.outgoingAttack)
              },
              {
                ALT: () => $.SUBRULE($.incomingUndercut)
              },
              {
                ALT: () => $.SUBRULE($.outgoingUndercut)
              }
            ])
        )
      );
      children = children.concat(atLeastOne);
      children.push($.CONSUME(lexer.Dedent));
      return createRuleNode("relations", children);
    });
    $.incomingSupport = $.RULE("incomingSupport", () => {
      let children = [];
      children.push($.CONSUME(lexer.IncomingSupport));
      $.OR({
        DEF: [
          { ALT: () => children.push($.SUBRULE($.statement)) },
          { ALT: () => children.push($.SUBRULE($.argumentDefinition)) },
          { ALT: () => children.push($.SUBRULE($.argumentReference)) }
        ]
      });

      return createRuleNode("incomingSupport", children);
    });
    $.incomingAttack = $.RULE("incomingAttack", () => {
      let children = [];
      children.push($.CONSUME(lexer.IncomingAttack));
      $.OR({
        DEF: [
          { ALT: () => children.push($.SUBRULE($.statement)) },
          { ALT: () => children.push($.SUBRULE($.argumentDefinition)) },
          { ALT: () => children.push($.SUBRULE($.argumentReference)) }
        ]
      });
      return createRuleNode("incomingAttack", children);
    });
    $.incomingUndercut = $.RULE("incomingUndercut", () => {
      let children = [];
      children.push($.CONSUME(lexer.IncomingUndercut));
      $.OR({
        DEF: [
          { ALT: () => children.push($.SUBRULE($.argumentDefinition)) },
          { ALT: () => children.push($.SUBRULE($.argumentReference)) }
        ]
      });
      return createRuleNode("incomingUndercut", children);
    });
    $.outgoingUndercut = $.RULE("outgoingUndercut", () => {
      let children = [];
      children.push($.CONSUME(lexer.OutgoingUndercut));
      $.OR({
        DEF: [
          { ALT: () => children.push($.SUBRULE($.statement)) },
          { ALT: () => children.push($.SUBRULE($.argumentDefinition)) },
          { ALT: () => children.push($.SUBRULE($.argumentReference)) }
        ]
      });
      return createRuleNode("outgoingUndercut", children);
    });

    $.outgoingSupport = $.RULE("outgoingSupport", () => {
      let children = [];
      children.push($.CONSUME(lexer.OutgoingSupport));
      $.OR({
        DEF: [
          { ALT: () => children.push($.SUBRULE($.statement)) },
          { ALT: () => children.push($.SUBRULE($.argumentDefinition)) },
          { ALT: () => children.push($.SUBRULE($.argumentReference)) }
        ]
      });
      return createRuleNode("outgoingSupport", children);
    });
    $.outgoingAttack = $.RULE("outgoingAttack", () => {
      let children = [];
      children.push($.CONSUME(lexer.OutgoingAttack));
      $.OR({
        DEF: [
          { ALT: () => children.push($.SUBRULE($.statement)) },
          { ALT: () => children.push($.SUBRULE($.argumentDefinition)) },
          { ALT: () => children.push($.SUBRULE($.argumentReference)) }
        ]
      });
      return createRuleNode("outgoingAttack", children);
    });
    $.contradiction = $.RULE("contradiction", () => {
      let children = [];
      children.push($.CONSUME(lexer.Contradiction));
      children.push($.SUBRULE($.statement));
      return createRuleNode("contradiction", children);
    });

    $.bold = $.RULE("bold", () => {
      let children = [];
      $.OR([
        {
          ALT: () => {
            children.push($.CONSUME(lexer.UnderscoreBoldStart));
            children.push($.SUBRULE1($.statementContent));
            children.push($.CONSUME(lexer.UnderscoreBoldEnd));
          }
        },
        {
          ALT: () => {
            children.push($.CONSUME(lexer.AsteriskBoldStart));
            children.push($.SUBRULE2($.statementContent));
            children.push($.CONSUME(lexer.AsteriskBoldEnd));
          }
        }
      ]);
      return createRuleNode("bold", children);
    });
    $.italic = $.RULE("italic", () => {
      let children = [];
      $.OR([
        {
          ALT: () => {
            children.push($.CONSUME(lexer.UnderscoreItalicStart));
            children.push($.SUBRULE3($.statementContent));
            children.push($.CONSUME(lexer.UnderscoreItalicEnd));
          }
        },
        {
          ALT: () => {
            children.push($.CONSUME(lexer.AsteriskItalicStart));
            children.push($.SUBRULE4($.statementContent));
            children.push($.CONSUME(lexer.AsteriskItalicEnd));
          }
        }
      ]);
      return createRuleNode("italic", children);
    });
    $.statementContent = $.RULE("statementContent", () => {
      let children = [];
      // OR caching. see: http://sap.github.io/chevrotain/docs/FAQ.html#major-performance-benefits
      let atLeastOne = $.AT_LEAST_ONE(() =>
        $.OR(
          $.c4 ||
            ($.c4 = [
              {
                ALT: () => $.SUBRULE($.freestyleText)
              },
              {
                ALT: () => $.CONSUME(lexer.Link)
              },
              {
                ALT: () => $.SUBRULE($.bold)
              },
              {
                ALT: () => $.SUBRULE($.italic)
              },
              {
                ALT: () => $.CONSUME(lexer.Tag)
              },
              {
                ALT: () => $.CONSUME(lexer.ArgumentMention)
              },
              {
                ALT: () => $.CONSUME(lexer.StatementMention)
              }
              // , {
              //     ALT: () => children.push($.CONSUME(lexer.StatementMentionByNumber))
              // }
            ])
        )
      );
      children = atLeastOne;
      return createRuleNode("statementContent", children);
    });

    $.freestyleText = $.RULE("freestyleText", () => {
      let children = [];
      $.AT_LEAST_ONE(() =>
        $.OR([
          {
            ALT: () => children.push($.CONSUME(lexer.Freestyle))
          },
          {
            ALT: () => children.push($.CONSUME(lexer.UnusedControlChar))
          },
          {
            ALT: () => children.push($.CONSUME(lexer.EscapedChar))
          }
        ])
      );
      return createRuleNode("freestyleText", children);
    });
    // very important to call this after all the rules have been defined.
    // otherwise the parser may not work correctly as it will lack information
    // derived during the self analysis phase.
    Parser.performSelfAnalysis(this);
  }

  astToString(value) {
    return this.logAstRecursively(value, "", "");
  }
  astToJsonString(value) {
    return JSON.stringify(value, null, 2);
  }
  logAstRecursively(value, pre, str) {
    if (value === undefined) {
      str += "undefined";
      return str;
    } else if (value.tokenType) {
      str += value.tokenType.tokenName;
      return str;
    }
    str += value.name;
    if (value.children && value.children.length > 0) {
      let nextPre = pre + " |";
      for (let child of value.children) {
        str += "\n" + nextPre + "__";
        str = this.logAstRecursively(child, nextPre, str);
      }
      str += "\n" + pre;
    }
    return str;
  }
}

module.exports = {
  ArgdownParser: new ArgdownParser("", ArgdownLexer)
};
