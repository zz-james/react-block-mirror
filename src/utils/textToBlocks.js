import Blockly from "./blockly_shims";
import { COLOR } from "./color.config";
import { FUNCTION_SIGNATURES_CONFIG } from "./function_signatures.config";
import { MODULE_FUNCTION_SIGNATURES_CONFIG } from "./module_function_signatures.config";
import { METHOD_SIGNATURES_CONFIG } from "./method_signatures.config";

function arrayMax(array) {
  return array.reduce(function (a, b) {
    return Math.max(a, b);
  });
}

function arrayMin(array) {
  return array.reduce(function (a, b) {
    return Math.min(a, b);
  });
}

const TOP_LEVEL_NODES = ["Module", "Expression", "Interactive", "Suite"];
const LOCKED_BLOCK = {
  inline: "true",
  deletable: "false",
  movable: "false",
};

// -------------------------------------------------------- //

export class BlockMirrorTextToBlocks {
  static TOP_LEVEL_NODES = ["Module", "Expression", "Interactive", "Suite"];

  FUNCTION_SIGNATURES = FUNCTION_SIGNATURES_CONFIG;
  MODULE_FUNCTION_SIGNATURES = MODULE_FUNCTION_SIGNATURES_CONFIG;
  METHOD_SIGNATURES = METHOD_SIGNATURES_CONFIG;

  constructor(blockMirror) {
    this.blockMirror = blockMirror;
    this.hiddenImports = ["plt"];
    this.strictAnnotations = ["int", "float", "str", "bool"];
    this.TOP_LEVEL_NODES = ["Module", "Expression", "Interactive", "Suite"];
    Blockly.defineBlocksWithJsonArray(BlockMirrorTextToBlocks.BLOCKS);
  }

  static BLOCKS = [];

  static COLOR = COLOR;

  static xmlToString(xml) {
    return new XMLSerializer().serializeToString(xml);
  }

  static raw_block(txt) {
    // TODO: lineno as second parameter!
    return BlockMirrorTextToBlocks.create_block("ast_Raw", 0, { TEXT: txt });
  }

  static create_block(
    type,
    lineNumber,
    fields,
    values,
    settings,
    mutations,
    statements
  ) {
    var newBlock = document.createElement("block");
    // Settings
    newBlock.setAttribute("type", type);
    newBlock.setAttribute("line_number", lineNumber);
    for (let setting in settings) {
      let settingValue = settings[setting];
      newBlock.setAttribute(setting, settingValue);
    }
    // Mutations
    if (mutations !== undefined && Object.keys(mutations).length > 0) {
      let newMutation = document.createElement("mutation");
      for (let mutation in mutations) {
        let mutationValue = mutations[mutation];
        if (mutation.charAt(0) === "@") {
          newMutation.setAttribute(mutation.substr(1), mutationValue);
        } else if (
          mutationValue != null &&
          mutationValue.constructor === Array
        ) {
          for (let i = 0; i < mutationValue.length; i++) {
            let mutationNode = document.createElement(mutation);
            mutationNode.setAttribute("name", mutationValue[i]);
            newMutation.appendChild(mutationNode);
          }
        } else {
          let mutationNode = document.createElement("arg");
          if (mutation.charAt(0) === "!") {
            mutationNode.setAttribute("name", "");
          } else {
            mutationNode.setAttribute("name", mutation);
          }
          if (mutationValue !== null) {
            mutationNode.appendChild(mutationValue);
          }
          newMutation.appendChild(mutationNode);
        }
      }
      newBlock.appendChild(newMutation);
    }
    // Fields
    for (let field in fields) {
      let fieldValue = fields[field];
      let newField = document.createElement("field");
      newField.setAttribute("name", field);
      newField.appendChild(document.createTextNode(fieldValue));
      newBlock.appendChild(newField);
    }
    // Values
    for (let value in values) {
      let valueValue = values[value];
      let newValue = document.createElement("value");
      if (valueValue !== null) {
        newValue.setAttribute("name", value);
        newValue.appendChild(valueValue);
        newBlock.appendChild(newValue);
      }
    }
    // Statements
    if (statements !== undefined && Object.keys(statements).length > 0) {
      for (let statement in statements) {
        let statementValue = statements[statement];
        if (statementValue == null) {
          continue;
        } else {
          for (let i = 0; i < statementValue.length; i += 1) {
            // In most cases, you really shouldn't ever have more than
            //  one statement in this list. I'm not sure Blockly likes
            //  that.
            let newStatement = document.createElement("statement");
            newStatement.setAttribute("name", statement);
            newStatement.appendChild(statementValue[i]);
            newBlock.appendChild(newStatement);
          }
        }
      }
    }
    return newBlock;
  }

  // ------------------------------------------------------------------------------ //

  convertSourceToCodeBlock(python_source) {
    var xml = document.createElement("xml");
    xml.appendChild(BlockMirrorTextToBlocks.raw_block(python_source));
    return BlockMirrorTextToBlocks.xmlToString(xml);
  }

  /**
   * The main function for converting a string representation of Python
   * code to the Blockly XML representation.
   *
   * @param {string} filename - The filename being parsed.
   * @param {string} python_source - The string representation of Python
   *      code (e.g., "a = 0").
   * @returns {Object} An object which will either have the converted
   *      source code or an error message and the code as a code-block.
   */
  convertSource(filename, python_source) {
    let xml = document.createElement("xml");
    // Attempt parsing - might fail!
    let parse,
      ast = null,
      symbol_table,
      error;
    let badChunks = [];
    let originalSource = python_source;
    this.source = python_source.split("\n");
    let previousLine = 1 + this.source.length;
    while (ast === null) {
      if (python_source.trim() === "") {
        if (badChunks.length) {
          xml.appendChild(
            BlockMirrorTextToBlocks.raw_block(badChunks.join("\n"))
          );
        }
        return {
          xml: BlockMirrorTextToBlocks.xmlToString(xml),
          error: null,
          rawXml: xml,
        };
      }
      try {
        parse = Sk.parse(filename, python_source);
        ast = Sk.astFromParse(parse.cst, filename, parse.flags);
      } catch (e) {
        //console.error(e);
        error = e;
        if (
          e.traceback &&
          e.traceback.length &&
          e.traceback[0].lineno &&
          e.traceback[0].lineno < previousLine
        ) {
          previousLine = e.traceback[0].lineno - 1;
          badChunks = badChunks.concat(this.source.slice(previousLine));
          this.source = this.source.slice(0, previousLine);
          python_source = this.source.join("\n");
        } else {
          //console.error(e);
          xml.appendChild(BlockMirrorTextToBlocks.raw_block(originalSource));
          return {
            xml: BlockMirrorTextToBlocks.xmlToString(xml),
            error: error,
            rawXml: xml,
          };
        }
      }
    }
    this.comments = {};
    for (let commentLocation in parse.comments) {
      let lineColumn = commentLocation.split(",");
      let yLocation = parseInt(lineColumn[0], 10);
      this.comments[yLocation] = parse.comments[commentLocation];
    }
    this.highestLineSeen = 0;
    this.levelIndex = 0;
    this.nextExpectedLine = 0;
    this.measureNode(ast);
    var converted = this.convert(ast);
    if (converted !== null) {
      for (var block = 0; block < converted.length; block += 1) {
        xml.appendChild(converted[block]);
      }
    }
    if (badChunks.length) {
      xml.appendChild(BlockMirrorTextToBlocks.raw_block(badChunks.join("\n")));
    }
    return {
      xml: BlockMirrorTextToBlocks.xmlToString(xml),
      error: null,
      lineMap: this.lineMap,
      comments: this.comments,
      rawXml: xml,
    };
  }

  recursiveMeasure(node, nextBlockLine) {
    if (node === undefined) {
      return;
    }
    var myNext = nextBlockLine;
    if ("orelse" in node && node.orelse.length > 0) {
      if (node.orelse.length === 1 && node.orelse[0]._astname === "If") {
        myNext = node.orelse[0].lineno - 1;
      } else {
        myNext = node.orelse[0].lineno - 1 - 1;
      }
    }
    this.heights.push(nextBlockLine);
    if ("body" in node) {
      for (let i = 0; i < node.body.length; i++) {
        let next;
        if (i + 1 === node.body.length) {
          next = myNext;
        } else {
          next = node.body[i + 1].lineno - 1;
        }
        this.recursiveMeasure(node.body[i], next);
      }
    }
    if ("orelse" in node) {
      for (let i = 0; i < node.orelse.length; i++) {
        let next;
        if (i === node.orelse.length) {
          next = nextBlockLine;
        } else {
          next = 1 + (node.orelse[i].lineno - 1);
        }
        this.recursiveMeasure(node.orelse[i], next);
      }
    }
  }

  measureNode(node) {
    this.heights = [];
    this.recursiveMeasure(node, this.source.length - 1);
    this.heights.shift();
  }

  getSourceCode(frm, to) {
    var lines = this.source.slice(frm - 1, to);
    // Strip out any starting indentation.
    if (lines.length > 0) {
      var indentation = lines[0].search(/\S/);
      for (var i = 0; i < lines.length; i++) {
        lines[i] = lines[i].substring(indentation);
      }
    }
    return lines.join("\n");
  }

  convertBody(node, parent) {
    this.levelIndex += 1;
    let is_top_level = this.isTopLevel(parent);
    // Empty body, return nothing
    /*if (node.length === 0) {
        return null;
    }*/

    // Final result list
    var children = [], // The complete set of peers
      root = null, // The top of the current peer
      current = null, // The bottom of the current peer
      levelIndex = this.levelIndex;

    function addPeer(peer) {
      if (root == null) {
        children.push(peer);
      } else {
        children.push(root);
      }
      root = peer;
      current = peer;
    }

    function finalizePeers() {
      if (root != null) {
        children.push(root);
      }
    }

    function nestChild(child) {
      if (root == null) {
        root = child;
        current = child;
      } else if (current == null) {
        root = current;
      } else {
        var nextElement = document.createElement("next");
        nextElement.appendChild(child);
        current.appendChild(nextElement);
        current = child;
      }
    }

    var lineNumberInBody = 0,
      lineNumberInProgram,
      previousLineInProgram = null,
      distance,
      skipped_line,
      commentCount,
      previousHeight = null,
      previousWasStatement = false,
      visitedFirstLine = false,
      wasFirstLine = false;

    // Iterate through each node
    for (var i = 0; i < node.length; i++) {
      lineNumberInBody += 1;

      lineNumberInProgram = node[i].lineno;
      distance = 0;
      wasFirstLine = true;
      if (previousLineInProgram != null) {
        distance = lineNumberInProgram - previousLineInProgram - 1;
        wasFirstLine = false;
      }
      lineNumberInBody += distance;

      // Handle earlier comments
      commentCount = 0;
      for (let commentLineInProgram in this.comments) {
        if (commentLineInProgram < lineNumberInProgram) {
          let commentChild = this.ast_Comment(
            this.comments[commentLineInProgram],
            commentLineInProgram
          );
          if (previousLineInProgram == null) {
            nestChild(commentChild);
          } else {
            let skipped_previous_line =
              Math.abs(previousLineInProgram - commentLineInProgram) > 1;
            if (is_top_level && skipped_previous_line) {
              addPeer(commentChild);
            } else {
              nestChild(commentChild);
            }
          }
          previousLineInProgram = commentLineInProgram;
          this.highestLineSeen = Math.max(
            this.highestLineSeen,
            parseInt(commentLineInProgram, 10)
          );
          distance = lineNumberInProgram - previousLineInProgram;
          delete this.comments[commentLineInProgram];
          commentCount += 1;
        }
      }

      distance = lineNumberInProgram - this.highestLineSeen;
      this.highestLineSeen = Math.max(
        lineNumberInProgram,
        this.highestLineSeen
      );

      // Now convert the actual node
      var height = this.heights.shift();
      var originalSourceCode = this.getSourceCode(lineNumberInProgram, height);
      var newChild = this.convertStatement(node[i], originalSourceCode, parent);

      // Skip null blocks (e.g., imports)
      if (newChild == null) {
        continue;
      }

      skipped_line = distance > 1;
      previousLineInProgram = lineNumberInProgram;
      previousHeight = height;

      // Handle top-level expression blocks
      if (is_top_level && newChild.constructor === Array) {
        addPeer(newChild[0]);
        // Handle skipped line
      } else if (is_top_level && skipped_line && visitedFirstLine) {
        addPeer(newChild);
        // The previous line was not a Peer
      } else if (is_top_level && !previousWasStatement) {
        addPeer(newChild);
        // Otherwise, always embed it in there.
      } else {
        nestChild(newChild);
      }
      previousWasStatement = newChild.constructor !== Array;

      visitedFirstLine = true;
    }

    // Handle comments that are on the very last line
    var lastLineNumber = lineNumberInProgram + 1;
    if (lastLineNumber in this.comments) {
      let commentChild = this.ast_Comment(
        this.comments[lastLineNumber],
        lastLineNumber
      );
      if (is_top_level && !previousWasStatement) {
        addPeer(commentChild);
      } else {
        nestChild(commentChild);
      }
      delete this.comments[lastLineNumber];
    }

    // Handle any extra comments that stuck around
    if (is_top_level) {
      for (var commentLineInProgram in this.comments) {
        let commentChild = this.ast_Comment(
          this.comments[commentLineInProgram],
          commentLineInProgram
        );
        distance = commentLineInProgram - previousLineInProgram;
        if (previousLineInProgram == null) {
          addPeer(commentChild);
        } else if (distance > 1) {
          addPeer(commentChild);
        } else {
          nestChild(commentChild);
        }
        previousLineInProgram = commentLineInProgram;
        delete this.comments[lastLineNumber];
      }
    }

    finalizePeers();

    this.levelIndex -= 1;

    return children;
  }

  isTopLevel(parent) {
    return !parent || this.TOP_LEVEL_NODES.indexOf(parent._astname) !== -1;
  }

  convert(node, parent) {
    let functionName = "ast_" + node._astname;
    if (this[functionName] === undefined) {
      throw new Error("Could not find function: " + functionName);
    }
    node._parent = parent;
    return this[functionName](node, parent);
  }

  convertStatement(node, full_source, parent) {
    try {
      return this.convert(node, parent);
    } catch (e) {
      let heights = this.getChunkHeights(node);
      let extractedSource = this.getSourceCode(
        arrayMin(heights),
        arrayMax(heights)
      );
      console.error(e);
      return BlockMirrorTextToBlocks.raw_block(extractedSource);
    }
  }

  getChunkHeights(node) {
    let lineNumbers = [];
    if (node.hasOwnProperty("lineno")) {
      lineNumbers.push(node.lineno);
    }
    if (node.hasOwnProperty("body")) {
      for (let i = 0; i < node.body.length; i += 1) {
        let subnode = node.body[i];
        lineNumbers = lineNumbers.concat(this.getChunkHeights(subnode));
      }
    }
    if (node.hasOwnProperty("orelse")) {
      for (let i = 0; i < node.orelse.length; i += 1) {
        let subnode = node.orelse[i];
        lineNumbers = lineNumbers.concat(this.getChunkHeights(subnode));
      }
    }
    return lineNumbers;
  }

  convertElements(key, values, parent) {
    var output = {};
    for (var i = 0; i < values.length; i++) {
      output[key + i] = this.convert(values[i], parent);
    }
    return output;
  }

  ast_Pass() {
    return null; //block("controls_pass");
  }

  ast_Module(node) {
    return this.convertBody(node.body, node);
  }

  ast_Suite(node) {
    return this.convertBody(node.body, node);
  }

  ast_Interactive(node) {
    return this.convertBody(node.body, node);
  }

  ast_Expression(node) {
    return this.convertBody(node.body, node);
  }

  ast_Image(node, parent, bmttb) {
    if (!bmttb.blockMirror.configuration.imageMode) {
      throw "Not using image constructor";
    }
    if (node.args.length !== 1) {
      throw "More than one argument to Image constructor";
    }
    if (node.args[0]._astname !== "Str") {
      throw "First argument for Image constructor must be string literal";
    }
    return BlockMirrorTextToBlocks.create_block(
      "ast_Image",
      node.lineno,
      {},
      {},
      {},
      { "@src": Sk.ffi.remapToJs(node.args[0].s) }
    );
  }

  ast_Call(node, parent) {
    var func = node.func;
    var args = node.args;
    var keywords = node.keywords; // Can we make any guesses about this based on its name?

    var signature = null;
    var isMethod = false;
    var module = null;
    var premessage = "";
    var message = "";
    var name = "";
    var caller = null;
    var colour = COLOR.FUNCTIONS;

    if (func._astname === "Name") {
      message = name = Sk.ffi.remapToJs(func.id);

      if (name in this.FUNCTION_SIGNATURES) {
        signature = this.FUNCTION_SIGNATURES[Sk.ffi.remapToJs(func.id)];
      }
    } else if (func._astname === "Attribute") {
      isMethod = true;
      caller = func.value;
      var potentialModule = this.getAsModule(caller);
      var attributeName = Sk.ffi.remapToJs(func.attr);
      message = "." + attributeName;

      if (potentialModule in this.MODULE_FUNCTION_SIGNATURES) {
        signature = this.MODULE_FUNCTION_SIGNATURES[potentialModule][
          attributeName
        ];
        module = potentialModule;
        message = name = potentialModule + message;
        isMethod = false;
      } else if (attributeName in this.METHOD_SIGNATURES) {
        signature = this.METHOD_SIGNATURES[attributeName];
        name = message;
      } else {
        name = message;
      }
    } else {
      isMethod = true;
      message = "";
      name = "";
      caller = func; // (lambda x: x)()
    }

    var returns = true;

    if (signature !== null && signature !== undefined) {
      if (signature.custom) {
        try {
          return signature.custom(node, parent, this);
        } catch (e) {
          console.error(e); // We tried to be fancy and failed, better fall back to default behavior!
        }
      }

      if ("returns" in signature) {
        returns = signature.returns;
      }

      if ("message" in signature) {
        message = signature.message;
      }

      if ("premessage" in signature) {
        premessage = signature.premessage;
      }

      if ("colour" in signature) {
        colour = signature.colour;
      }
    }

    returns = returns || parent._astname !== "Expr";
    var argumentsNormal = {}; // TODO: do I need to be limiting only the *args* length, not keywords?

    var argumentsMutation = {
      "@arguments":
        (args !== null ? args.length : 0) +
        (keywords !== null ? keywords.length : 0),
      "@returns": returns,
      "@parameters": true,
      "@method": isMethod,
      "@name": name,
      "@message": message,
      "@premessage": premessage,
      "@colour": colour,
      "@module": module || "",
    }; // Handle arguments

    var overallI = 0;

    if (args !== null) {
      for (var i = 0; i < args.length; i += 1, overallI += 1) {
        argumentsNormal["ARG" + overallI] = this.convert(args[i], node);
        argumentsMutation["UNKNOWN_ARG:" + overallI] = null;
      }
    }

    if (keywords !== null) {
      for (var _i5 = 0; _i5 < keywords.length; _i5 += 1, overallI += 1) {
        var keyword = keywords[_i5];
        var arg = keyword.arg;
        var value = keyword.value;

        if (arg === null) {
          argumentsNormal["ARG" + overallI] = this.convert(value, node);
          argumentsMutation["KWARGS:" + overallI] = null;
        } else {
          argumentsNormal["ARG" + overallI] = this.convert(value, node);
          argumentsMutation["KEYWORD:" + Sk.ffi.remapToJs(arg)] = null;
        }
      }
    } // Build actual block

    var newBlock;

    if (isMethod) {
      argumentsNormal["FUNC"] = this.convert(caller, node);
      newBlock = BlockMirrorTextToBlocks.create_block(
        "ast_Call",
        node.lineno,
        {},
        argumentsNormal,
        {
          inline: true,
        },
        argumentsMutation
      );
    } else {
      newBlock = BlockMirrorTextToBlocks.create_block(
        "ast_Call",
        node.lineno,
        {},
        argumentsNormal,
        {
          inline: true,
        },
        argumentsMutation
      );
    } // Return as either statement or expression

    if (returns) {
      return newBlock;
    } else {
      return [newBlock];
    }
  }
}

// Blockly.Python['blank'] = '___';
