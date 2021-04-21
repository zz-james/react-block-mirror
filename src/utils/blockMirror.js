// import Sk from '@microduino/skuplt';  //can't do this as not an es6 module https://github.com/skulpt/skulpt/issues/794
// also note skulpt is not completely python3 compatable...
import Blockly from "./blockly_shims";
import { BlockMirrorTextToBlocks } from "./textToBlocks";
import { BlockMirrorTextEditor } from "./textEditor";
import { BlockMirrorBlockEditor } from "./blockEditor";


/**

 External visible stuff

 Changing mode/code can fail on the block side

 setMode(mode) -> bool
 setCode(filename, code) -> bool
 setHighlight(line) -> bool
 setReadOnly(isReadOnly)
 setToolbox(string)
 'basic'
 'advanced'
 'complete'
 list[list[string]]
 onChange(event) ->
 onModeChange
 onCodeChange

 getCode() -> string
 getMode() -> string
 getImage(callback)

 lastBlockConversionFailure: {} or null
 */
export class BlockMirror {
  constructor(configuration) {
    this.validateConfiguration(configuration);
    this.initializeVariables();

    if (!this.configuration.skipSkulpt) {
      this.loadSkulpt();
    }

    this.textToBlocks = new BlockMirrorTextToBlocks(this);
    this.textEditor = new BlockMirrorTextEditor(this);
    this.blockEditor = new BlockMirrorBlockEditor(this);

    this.setMode(this.configuration.viewMode);
  }

  validateConfiguration(configuration) {
    this.configuration = {};

    // Container
    if ("container" in configuration) {
      this.configuration.container = configuration.container;
    } else {
      throw new Error('Invalid configuration: Missing "container" property.');
    }

    // blocklyPath
    if ("blocklyMediaPath" in configuration) {
      this.configuration.blocklyMediaPath = configuration.blocklyMediaPath;
    } else {
      this.configuration.blocklyMediaPath = "./public/";
    }

    // Run function
    if ("run" in configuration) {
      this.configuration.run = configuration.run;
    } else {
      this.configuration.run = function () {
        console.log("Ran!");
      };
    }

    // readOnly
    this.configuration["readOnly"] = configuration["readOnly"] || false;

    // height
    this.configuration.height = configuration.height || 500;

    // viewMode
    this.configuration.viewMode = configuration.viewMode || "split";

    // Need to load skulpt?
    this.configuration.skipSkulpt = configuration.skipSkulpt || false;

    // Delay?
    this.configuration.blockDelay = configuration.blockDelay || false;

    // Toolbox
    this.configuration.toolbox = configuration.toolbox || "normal";

    // IsParsons?
    this.isParsons = function () {
      return false;
    };

    // Convert image URLs?
    this.configuration.imageUploadHook =
      configuration.imageUploadHook || ((old) => Promise.resolve(old));
    this.configuration.imageDownloadHook =
      configuration.imageDownloadHook || ((old) => old);
    this.configuration.imageLiteralHook =
      configuration.imageLiteralHook || ((old) => old);
    this.configuration.imageMode = configuration.imageMode || false;
  }

  initializeVariables() {
    this.tags = {
      toolbar: document.createElement("div"),
      blockContainer: document.createElement("div"),
      blockEditor: document.createElement("div"),
      blockArea: document.createElement("div"),
      textSidebar: document.createElement("div"),
      textContainer: document.createElement("div"),
      textArea: document.createElement("textarea"),
    };
    // Toolbar
    this.configuration.container.appendChild(this.tags.toolbar);
    // Block side
    this.configuration.container.appendChild(this.tags.blockContainer);
    this.tags.blockContainer.appendChild(this.tags.blockEditor);
    this.tags.blockContainer.appendChild(this.tags.blockArea);
    // Text side
    this.configuration.container.appendChild(this.tags.textContainer);
    this.tags.textContainer.appendChild(this.tags.textSidebar);
    this.tags.textContainer.appendChild(this.tags.textArea);

    for (let name in this.tags) {
      this.tags[name].style["box-sizing"] = "border-box";
    }

    // Files
    this.code_ = "";
    this.mode_ = null;

    // Update Flags
    this.silenceBlock = false;
    this.silenceBlockTimer = null;
    this.silenceText = false;
    this.silenceModel = 0;
    this.blocksFailed = false;
    this.blocksFailedTimeout = null;
    this.triggerOnChange = null;
    this.firstEdit = true;

    // Toolbox width
    this.blocklyToolboxWidth = 0;

    // Listeners
    this.listeners_ = [];
  }

  loadSkulpt() {
    Sk.configure({
      __future__: Sk.python3,
      read: function (filename) {
        if (
          Sk.builtinFiles === undefined ||
          Sk.builtinFiles["files"][filename] === undefined
        ) {
          throw "File not found: '" + filename + "'";
        }
        return Sk.builtinFiles["files"][filename];
      },
    });
  }

  removeAllChangeListeners() {
    this.listeners_.length = 0;
  }

  removeChangeListener(callback) {
    let index = this.listeners_.indexOf(callback);
    if (index !== -1) {
      this.listeners_.splice(index, 1);
    }
  }

  addChangeListener(callback) {
    this.listeners_.push(callback);
  }

  fireChangeListener(e) {
    for (let i = 0, func; (func = this.listeners_[i]); i++) {
      func(e);
    }
  }

  setCode(code, quietly) {
    this.code_ = code;
    if (!quietly) {
      this.blockEditor.setCode(code, true);
      this.textEditor.setCode(code, true);
    }
    this.fireChangeListener({ name: "changed", value: code });
  }

  getCode() {
    return this.code_;
  }

  getMode() {
    return this.mode_;
  }

  setMode(mode) {
    this.mode_ = mode;
    this.blockEditor.setMode(mode);
    this.textEditor.setMode(mode);
  }

  setImageMode(imageMode) {
    this.configuration.imageMode = imageMode;
    if (imageMode) {
      this.textEditor.enableImages();
    } else {
      this.textEditor.disableImages();
    }
    console.log(imageMode);
  }

  setReadOnly(isReadOnly) {
    this.textEditor.setReadOnly(isReadOnly);
    this.blockEditor.setReadOnly(isReadOnly);
    $(this.configuration.container).toggleClass(
      "block-mirror-read-only",
      isReadOnly
    );
  }

  refresh() {
    this.blockEditor.resized();
    this.textEditor.codeMirror.refresh();
  }

  forceBlockRefresh() {
    this.blockEditor.setCode(this.code_, true);
  }

  VISIBLE_MODES = {
    block: ["block", "split"],
    text: ["text", "split"],
  };

  BREAK_WIDTH = 675;

  setHighlightedLines(lines, style) {
    this.textEditor.setHighlightedLines(lines, style);
    //this.blockEditor.highlightLines(lines, style);
  }

  clearHighlightedLines() {
    this.textEditor.clearHighlightedLines();
    //this.blockEditor.unhighlightLines(lines, style);
  }
}

let ZERO_BLOCK = BlockMirrorTextToBlocks.create_block("ast_Num", null, {
  NUM: 0,
});

BlockMirrorTextToBlocks.getFunctionBlock = function (name, values, module) {
  if (values === undefined) {
    values = {};
  }
  // TODO: hack, we shouldn't be accessing the prototype like this
  let signature;
  let method = false;
  if (module !== undefined) {
    signature =
      BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_SIGNATURES[module][
        name
      ];
  } else if (name.startsWith(".")) {
    signature =
      BlockMirrorTextToBlocks.prototype.METHOD_SIGNATURES[name.substr(1)];
    method = true;
  } else {
    signature = BlockMirrorTextToBlocks.prototype.FUNCTION_SIGNATURES[name];
  }
  let args =
    signature.simple !== undefined
      ? signature.simple
      : signature.full !== undefined
      ? signature.full
      : [];
  let argumentsMutation = {
    "@arguments": args.length,
    "@returns": signature.returns || false,
    "@parameters": true,
    "@method": method,
    "@name": module ? module + "." + name : name,
    "@message": signature.message ? signature.message : name,
    "@premessage": signature.premessage ? signature.premessage : "",
    "@colour": signature.colour ? signature.colour : 0,
    "@module": module || "",
  };
  for (let i = 0; i < args.length; i += 1) {
    argumentsMutation["UNKNOWN_ARG:" + i] = null;
  }
  let newBlock = BlockMirrorTextToBlocks.create_block(
    "ast_Call",
    null,
    {},
    values,
    { inline: true },
    argumentsMutation
  );
  // Return as either statement or expression
  return BlockMirrorTextToBlocks.xmlToString(newBlock);
};

// ----------------------------------------------------------------------------------------------------------------------------------------------- //

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_For",
  message0: "for each item %1 in list %2 : %3 %4",
  args0: [
    {
      type: "input_value",
      name: "TARGET",
    },
    {
      type: "input_value",
      name: "ITER",
    },
    {
      type: "input_dummy",
    },
    {
      type: "input_statement",
      name: "BODY",
    },
  ],
  inputsInline: true,
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.CONTROL,
});

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_ForElse",
  message0: "for each item %1 in list %2 : %3 %4 else: %5 %6",
  args0: [
    {
      type: "input_value",
      name: "TARGET",
    },
    {
      type: "input_value",
      name: "ITER",
    },
    {
      type: "input_dummy",
    },
    {
      type: "input_statement",
      name: "BODY",
    },
    {
      type: "input_dummy",
    },
    {
      type: "input_statement",
      name: "ELSE",
    },
  ],
  inputsInline: true,
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.CONTROL,
});

// ----------------------------------------------------------------------------------------------------------------------------------------------- //

Blockly.Python["ast_For"] = function (block) {
  // For each loop.
  var argument0 =
    Blockly.Python.valueToCode(
      block,
      "TARGET",
      Blockly.Python.ORDER_RELATIONAL
    ) || Blockly.Python.blank;
  var argument1 =
    Blockly.Python.valueToCode(
      block,
      "ITER",
      Blockly.Python.ORDER_RELATIONAL
    ) || Blockly.Python.blank;
  var branchBody =
    Blockly.Python.statementToCode(block, "BODY") || Blockly.Python.PASS;
  var branchElse = Blockly.Python.statementToCode(block, "ELSE");
  var code = "for " + argument0 + " in " + argument1 + ":\n" + branchBody;

  if (branchElse) {
    code += "else:\n" + branchElse;
  }

  return code;
};

// ----------------------------------------------------------------------------------------------------------------------------------------------- //

BlockMirrorTextToBlocks.prototype["ast_For"] = function (node, parent) {
  var target = node.target;
  var iter = node.iter;
  var body = node.body;
  var orelse = node.orelse;
  var blockName = "ast_For";
  var bodies = {
    BODY: this.convertBody(body, node),
  };

  if (orelse.length > 0) {
    blockName = "ast_ForElse";
    bodies["ELSE"] = this.convertBody(orelse, node);
  }

  return BlockMirrorTextToBlocks.create_block(
    blockName,
    node.lineno,
    {},
    {
      ITER: this.convert(iter, node),
      TARGET: this.convert(target, node),
    },
    {},
    {},
    bodies
  );
};

Blockly.Python["ast_ForElse"] = Blockly.Python["ast_For"];
BlockMirrorTextToBlocks.prototype["ast_ForElse"] =
  BlockMirrorTextToBlocks.prototype["ast_For"];
Blockly.Blocks["ast_If"] = {
  init: function init() {
    this.orelse_ = 0;
    this.elifs_ = 0;
    this.appendValueInput("TEST").appendField("if");
    this.appendStatementInput("BODY")
      .setCheck(null)
      .setAlign(Blockly.ALIGN_RIGHT);
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.LOGIC);
    this.updateShape_();
  },
  // TODO: Not mutable currently
  updateShape_: function updateShape_() {
    var latestInput = "BODY";

    for (var i = 0; i < this.elifs_; i++) {
      if (!this.getInput("ELIF" + i)) {
        this.appendValueInput("ELIFTEST" + i).appendField("elif");
        this.appendStatementInput("ELIFBODY" + i).setCheck(null);
      }
    } // Remove deleted inputs.

    while (this.getInput("ELIFTEST" + i)) {
      this.removeInput("ELIFTEST" + i);
      this.removeInput("ELIFBODY" + i);
      i++;
    }

    if (this.orelse_ && !this.getInput("ELSE")) {
      this.appendDummyInput("ORELSETEST").appendField("else:");
      this.appendStatementInput("ORELSEBODY").setCheck(null);
    } else if (!this.orelse_ && this.getInput("ELSE")) {
      block.removeInput("ORELSETEST");
      block.removeInput("ORELSEBODY");
    }

    for (i = 0; i < this.elifs_; i++) {
      if (this.orelse_) {
        this.moveInputBefore("ELIFTEST" + i, "ORELSETEST");
        this.moveInputBefore("ELIFBODY" + i, "ORELSETEST");
      } else if (i + 1 < this.elifs_) {
        this.moveInputBefore("ELIFTEST" + i, "ELIFTEST" + (i + 1));
        this.moveInputBefore("ELIFBODY" + i, "ELIFBODY" + (i + 1));
      }
    }
  },

  /**
   * Create XML to represent the (non-editable) name and arguments.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("orelse", this.orelse_);
    container.setAttribute("elifs", this.elifs_);
    return container;
  },

  /**
   * Parse XML to restore the (non-editable) name and parameters.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.orelse_ = "true" === xmlElement.getAttribute("orelse");
    this.elifs_ = parseInt(xmlElement.getAttribute("elifs"), 10) || 0;
    this.updateShape_();
  },
};

Blockly.Python["ast_If"] = function (block) {
  // Test
  var test =
    "if " +
    (Blockly.Python.valueToCode(block, "TEST", Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank) +
    ":\n"; // Body:

  var body =
    Blockly.Python.statementToCode(block, "BODY") || Blockly.Python.PASS; // Elifs

  var elifs = new Array(block.elifs_);

  for (var i = 0; i < block.elifs_; i++) {
    var elif = block.elifs_[i];
    var clause =
      "elif " +
      (Blockly.Python.valueToCode(
        block,
        "ELIFTEST" + i,
        Blockly.Python.ORDER_NONE
      ) || Blockly.Python.blank);
    clause +=
      ":\n" +
      (Blockly.Python.statementToCode(block, "ELIFBODY" + i) ||
        Blockly.Python.PASS);
    elifs[i] = clause;
  } // Orelse:

  var orelse = "";

  if (this.orelse_) {
    orelse =
      "else:\n" +
      (Blockly.Python.statementToCode(block, "ORELSEBODY") ||
        Blockly.Python.PASS);
  }

  return test + body + elifs.join("") + orelse;
};

BlockMirrorTextToBlocks.prototype["ast_If"] = function (node, parent) {
  var test = node.test;
  var body = node.body;
  var orelse = node.orelse;
  var hasOrelse = false;
  var elifCount = 0;
  var values = {
    TEST: this.convert(test, node),
  };
  var statements = {
    BODY: this.convertBody(body, node),
  };

  while (orelse !== undefined && orelse.length > 0) {
    if (orelse.length === 1) {
      if (orelse[0]._astname === "If") {
        // This is an ELIF
        this.heights.shift();
        values["ELIFTEST" + elifCount] = this.convert(orelse[0].test, node);
        statements["ELIFBODY" + elifCount] = this.convertBody(
          orelse[0].body,
          node
        );
        elifCount++;
      } else {
        hasOrelse = true;
        statements["ORELSEBODY"] = this.convertBody(orelse, node);
      }
    } else {
      hasOrelse = true;
      statements["ORELSEBODY"] = this.convertBody(orelse, node);
    }

    orelse = orelse[0].orelse;
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_If",
    node.lineno,
    {},
    values,
    {},
    {
      "@orelse": hasOrelse,
      "@elifs": elifCount,
    },
    statements
  );
};

Blockly.Blocks["ast_While"] = {
  init: function init() {
    this.orelse_ = 0;
    this.appendValueInput("TEST").appendField("while");
    this.appendStatementInput("BODY")
      .setCheck(null)
      .setAlign(Blockly.ALIGN_RIGHT);
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.CONTROL);
    this.updateShape_();
  },
  // TODO: Not mutable currently
  updateShape_: function updateShape_() {
    var latestInput = "BODY";

    if (this.orelse_ && !this.getInput("ELSE")) {
      this.appendDummyInput("ORELSETEST").appendField("else:");
      this.appendStatementInput("ORELSEBODY").setCheck(null);
    } else if (!this.orelse_ && this.getInput("ELSE")) {
      block.removeInput("ORELSETEST");
      block.removeInput("ORELSEBODY");
    }
  },

  /**
   * Create XML to represent the (non-editable) name and arguments.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("orelse", this.orelse_);
  },

  /**
   * Parse XML to restore the (non-editable) name and parameters.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.orelse_ = "true" === xmlElement.getAttribute("orelse");
    this.updateShape_();
  },
};

Blockly.Python["ast_While"] = function (block) {
  // Test
  var test =
    "while " +
    (Blockly.Python.valueToCode(block, "TEST", Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank) +
    ":\n"; // Body:

  var body =
    Blockly.Python.statementToCode(block, "BODY") || Blockly.Python.PASS; // Orelse:

  var orelse = "";

  if (this.orelse_) {
    orelse =
      "else:\n" +
      (Blockly.Python.statementToCode(block, "ORELSEBODY") ||
        Blockly.Python.PASS);
  }

  return test + body + orelse;
};

BlockMirrorTextToBlocks.prototype["ast_While"] = function (node, parent) {
  var test = node.test;
  var body = node.body;
  var orelse = node.orelse;
  var values = {
    TEST: this.convert(test, node),
  };
  var statements = {
    BODY: this.convertBody(body, node),
  };
  var hasOrelse = false;

  if (orelse !== null && orelse.length > 0) {
    statements["ORELSEBODY"] = this.convertBody(orelse, node);
    hasOrelse = true;
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_While",
    node.lineno,
    {},
    values,
    {},
    {
      "@orelse": hasOrelse,
    },
    statements
  );
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Num",
  message0: "%1",
  args0: [
    {
      type: "field_number",
      name: "NUM",
      value: 0,
    },
  ],
  output: "Number",
  colour: BlockMirrorTextToBlocks.COLOR.MATH,
});

Blockly.Python["ast_Num"] = function (block) {
  // Numeric value.
  var code = parseFloat(block.getFieldValue("NUM"));
  var order;

  if (code == Infinity) {
    code = 'float("inf")';
    order = Blockly.Python.ORDER_FUNCTION_CALL;
  } else if (code == -Infinity) {
    code = '-float("inf")';
    order = Blockly.Python.ORDER_UNARY_SIGN;
  } else {
    order =
      code < 0 ? Blockly.Python.ORDER_UNARY_SIGN : Blockly.Python.ORDER_ATOMIC;
  }

  return [code, order];
};

BlockMirrorTextToBlocks.prototype["ast_Num"] = function (node, parent) {
  var n = node.n;
  return BlockMirrorTextToBlocks.create_block("ast_Num", node.lineno, {
    NUM: Sk.ffi.remapToJs(n),
  });
};

BlockMirrorTextToBlocks.BINOPS = [
  [
    "+",
    "Add",
    Blockly.Python.ORDER_ADDITIVE,
    "Return the sum of the two numbers.",
    "increase",
    "by",
  ],
  [
    "-",
    "Sub",
    Blockly.Python.ORDER_ADDITIVE,
    "Return the difference of the two numbers.",
    "decrease",
    "by",
  ],
  [
    "*",
    "Mult",
    Blockly.Python.ORDER_MULTIPLICATIVE,
    "Return the product of the two numbers.",
    "multiply",
    "by",
  ],
  [
    "/",
    "Div",
    Blockly.Python.ORDER_MULTIPLICATIVE,
    "Return the quotient of the two numbers.",
    "divide",
    "by",
  ],
  [
    "%",
    "Mod",
    Blockly.Python.ORDER_MULTIPLICATIVE,
    "Return the remainder of the first number divided by the second number.",
    "modulo",
    "by",
  ],
  [
    "**",
    "Pow",
    Blockly.Python.ORDER_EXPONENTIATION,
    "Return the first number raised to the power of the second number.",
    "raise",
    "to",
  ],
  [
    "//",
    "FloorDiv",
    Blockly.Python.ORDER_MULTIPLICATIVE,
    "Return the truncated quotient of the two numbers.",
    "floor divide",
    "by",
  ],
  [
    "<<",
    "LShift",
    Blockly.Python.ORDER_BITWISE_SHIFT,
    "Return the left number left shifted by the right number.",
    "left shift",
    "by",
  ],
  [
    ">>",
    "RShift",
    Blockly.Python.ORDER_BITWISE_SHIFT,
    "Return the left number right shifted by the right number.",
    "right shift",
    "by",
  ],
  [
    "|",
    "BitOr",
    Blockly.Python.ORDER_BITWISE_OR,
    "Returns the bitwise OR of the two values.",
    "bitwise OR",
    "using",
  ],
  [
    "^",
    "BitXor",
    Blockly.Python.ORDER_BITWISE_XOR,
    "Returns the bitwise XOR of the two values.",
    "bitwise XOR",
    "using",
  ],
  [
    "&",
    "BitAnd",
    Blockly.Python.ORDER_BITWISE_AND,
    "Returns the bitwise AND of the two values.",
    "bitwise AND",
    "using",
  ],
  [
    "@",
    "MatMult",
    Blockly.Python.ORDER_MULTIPLICATIVE,
    "Return the matrix multiplication of the two numbers.",
    "matrix multiply",
    "by",
  ],
];
var BINOPS_SIMPLE = ["Add", "Sub", "Mult", "Div", "Mod", "Pow"];
var BINOPS_BLOCKLY_DISPLAY_FULL = BlockMirrorTextToBlocks.BINOPS.map(function (
  binop
) {
  return [binop[0], binop[1]];
});
var BINOPS_BLOCKLY_DISPLAY = BINOPS_BLOCKLY_DISPLAY_FULL.filter(function (
  binop
) {
  return BINOPS_SIMPLE.indexOf(binop[1]) >= 0;
});
BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_DISPLAY_FULL = BlockMirrorTextToBlocks.BINOPS.map(
  function (binop) {
    return [binop[4], binop[1]];
  }
);
BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_DISPLAY = BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_DISPLAY_FULL.filter(
  function (binop) {
    return BINOPS_SIMPLE.indexOf(binop[1]) >= 0;
  }
);
var BINOPS_BLOCKLY_GENERATE = {};
BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_PREPOSITION = {};
BlockMirrorTextToBlocks.BINOPS.forEach(function (binop) {
  BINOPS_BLOCKLY_GENERATE[binop[1]] = [" " + binop[0], binop[2]];
  BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_PREPOSITION[binop[1]] = binop[5]; //Blockly.Constants.Math.TOOLTIPS_BY_OP[binop[1]] = binop[3];
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_BinOpFull",
  message0: "%1 %2 %3",
  args0: [
    {
      type: "input_value",
      name: "A",
    },
    {
      type: "field_dropdown",
      name: "OP",
      options: BINOPS_BLOCKLY_DISPLAY_FULL,
    },
    {
      type: "input_value",
      name: "B",
    },
  ],
  inputsInline: true,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.MATH, //"extensions": ["math_op_tooltip"]
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_BinOp",
  message0: "%1 %2 %3",
  args0: [
    {
      type: "input_value",
      name: "A",
    },
    {
      type: "field_dropdown",
      name: "OP",
      options: BINOPS_BLOCKLY_DISPLAY,
    },
    {
      type: "input_value",
      name: "B",
    },
  ],
  inputsInline: true,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.MATH, //"extensions": ["math_op_tooltip"]
});

Blockly.Python["ast_BinOp"] = function (block) {
  // Basic arithmetic operators, and power.
  var tuple = BINOPS_BLOCKLY_GENERATE[block.getFieldValue("OP")];
  var operator = tuple[0] + " ";
  var order = tuple[1];
  var argument0 =
    Blockly.Python.valueToCode(block, "A", order) || Blockly.Python.blank;
  var argument1 =
    Blockly.Python.valueToCode(block, "B", order) || Blockly.Python.blank;
  var code = argument0 + operator + argument1;
  return [code, order];
};

BlockMirrorTextToBlocks.prototype["ast_BinOp"] = function (node, parent) {
  var left = node.left;
  var op = node.op.name;
  var right = node.right;
  var blockName =
    BINOPS_SIMPLE.indexOf(op) >= 0 ? "ast_BinOp" : "ast_BinOpFull";
  return BlockMirrorTextToBlocks.create_block(
    blockName,
    node.lineno,
    {
      OP: op,
    },
    {
      A: this.convert(left, node),
      B: this.convert(right, node),
    },
    {
      inline: true,
    }
  );
};

Blockly.Python["ast_BinOpFull"] = Blockly.Python["ast_BinOp"];
BlockMirrorTextToBlocks.prototype["ast_BinOpFull"] =
  BlockMirrorTextToBlocks.prototype["ast_BinOp"];

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Name",
  message0: "%1",
  args0: [
    {
      type: "field_variable",
      name: "VAR",
      variable: "%{BKY_VARIABLES_DEFAULT_NAME}",
    },
  ],
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.VARIABLES,
  extensions: ["contextMenu_variableSetterGetter_forBlockMirror"],
});
/**
 * Mixin to add context menu items to create getter/setter blocks for this
 * setter/getter.
 * Used by blocks 'ast_Name' and 'ast_Assign'.
 * @mixin
 * @augments Blockly.Block
 * @package
 * @readonly
 */

Blockly.Constants.Variables.CUSTOM_CONTEXT_MENU_VARIABLE_GETTER_SETTER_MIXIN_FOR_BLOCK_MIRROR = {
  /**
   * Add menu option to create getter/setter block for this setter/getter.
   * @param {!Array} options List of menu options to add to.
   * @this Blockly.Block
   */
  customContextMenu: function customContextMenu(options) {
    var name;

    if (!this.isInFlyout) {
      // Getter blocks have the option to create a setter block, and vice versa.
      var opposite_type, contextMenuMsg;

      if (this.type === "ast_Name") {
        opposite_type = "ast_Assign";
        contextMenuMsg = Blockly.Msg["VARIABLES_GET_CREATE_SET"];
      } else {
        opposite_type = "ast_Name";
        contextMenuMsg = Blockly.Msg["VARIABLES_SET_CREATE_GET"];
      }

      var option = {
        enabled: this.workspace.remainingCapacity() > 0,
      };
      name = this.getField("VAR").getText();
      option.text = contextMenuMsg.replace("%1", name);
      var xmlField = document.createElement("field");
      xmlField.setAttribute("name", "VAR");
      xmlField.appendChild(document.createTextNode(name));
      var xmlBlock = document.createElement("block");
      xmlBlock.setAttribute("type", opposite_type);
      xmlBlock.appendChild(xmlField);
      option.callback = Blockly.ContextMenu.callbackFactory(this, xmlBlock);
      options.push(option); // Getter blocks have the option to rename or delete that variable.
    } else {
      if (this.type === "ast_Name" || this.type === "variables_get_reporter") {
        var renameOption = {
          text: Blockly.Msg.RENAME_VARIABLE,
          enabled: true,
          callback: Blockly.Constants.Variables.RENAME_OPTION_CALLBACK_FACTORY(
            this
          ),
        };
        name = this.getField("VAR").getText();
        var deleteOption = {
          text: Blockly.Msg.DELETE_VARIABLE.replace("%1", name),
          enabled: true,
          callback: Blockly.Constants.Variables.DELETE_OPTION_CALLBACK_FACTORY(
            this
          ),
        };
        options.unshift(renameOption);
        options.unshift(deleteOption);
      }
    }
  },
};
Blockly.Extensions.registerMixin(
  "contextMenu_variableSetterGetter_forBlockMirror",
  Blockly.Constants.Variables
    .CUSTOM_CONTEXT_MENU_VARIABLE_GETTER_SETTER_MIXIN_FOR_BLOCK_MIRROR
);

Blockly.Python["ast_Name"] = function (block) {
  // Variable getter.
  var code = Blockly.Python.variableDB_.getName(
    block.getFieldValue("VAR"),
    Blockly.Variables.NAME_TYPE
  );
  return [code, Blockly.Python.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_Name"] = function (node, parent) {
  var id = node.id;
  var ctx = node.ctx;

  if (id.v == Blockly.Python.blank) {
    return null;
  } else {
    return BlockMirrorTextToBlocks.create_block("ast_Name", node.lineno, {
      VAR: id.v,
    });
  }
};

Blockly.Blocks["ast_Assign"] = {
  init: function init() {
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
    this.targetCount_ = 1;
    this.simpleTarget_ = true;
    this.updateShape_();
    Blockly.Extensions.apply("contextMenu_variableSetterGetter", this, false);
  },
  updateShape_: function updateShape_() {
    if (!this.getInput("VALUE")) {
      this.appendDummyInput().appendField("set");
      this.appendValueInput("VALUE").appendField("=");
    }

    var i = 0;

    if (this.targetCount_ === 1 && this.simpleTarget_) {
      this.setInputsInline(true);

      if (!this.getInput("VAR_ANCHOR")) {
        this.appendDummyInput("VAR_ANCHOR").appendField(
          new Blockly.FieldVariable("variable"),
          "VAR"
        );
      }

      this.moveInputBefore("VAR_ANCHOR", "VALUE");
    } else {
      this.setInputsInline(true); // Add new inputs.

      for (; i < this.targetCount_; i++) {
        if (!this.getInput("TARGET" + i)) {
          var input = this.appendValueInput("TARGET" + i);

          if (i !== 0) {
            input.appendField("and").setAlign(Blockly.ALIGN_RIGHT);
          }
        }

        this.moveInputBefore("TARGET" + i, "VALUE");
      } // Kill simple VAR

      if (this.getInput("VAR_ANCHOR")) {
        this.removeInput("VAR_ANCHOR");
      }
    } // Remove deleted inputs.

    while (this.getInput("TARGET" + i)) {
      this.removeInput("TARGET" + i);
      i++;
    }
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("targets", this.targetCount_);
    container.setAttribute("simple", this.simpleTarget_);
    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.targetCount_ = parseInt(xmlElement.getAttribute("targets"), 10);
    this.simpleTarget_ = "true" === xmlElement.getAttribute("simple");
    this.updateShape_();
  },
};

Blockly.Python["ast_Assign"] = function (block) {
  // Create a list with any number of elements of any type.
  var value =
    Blockly.Python.valueToCode(block, "VALUE", Blockly.Python.ORDER_NONE) ||
    Blockly.Python.blank;
  var targets = new Array(block.targetCount_);

  if (block.targetCount_ === 1 && block.simpleTarget_) {
    targets[0] = Blockly.Python.variableDB_.getName(
      block.getFieldValue("VAR"),
      Blockly.Variables.NAME_TYPE
    );
  } else {
    for (var i = 0; i < block.targetCount_; i++) {
      targets[i] =
        Blockly.Python.valueToCode(
          block,
          "TARGET" + i,
          Blockly.Python.ORDER_NONE
        ) || Blockly.Python.blank;
    }
  }

  return targets.join(" = ") + " = " + value + "\n";
};

BlockMirrorTextToBlocks.prototype["ast_Assign"] = function (node, parent) {
  var targets = node.targets;
  var value = node.value;
  var values;
  var fields = {};
  var simpleTarget = targets.length === 1 && targets[0]._astname === "Name";

  if (simpleTarget) {
    values = {};
    fields["VAR"] = Sk.ffi.remapToJs(targets[0].id);
  } else {
    values = this.convertElements("TARGET", targets, node);
  }

  values["VALUE"] = this.convert(value, node);
  return BlockMirrorTextToBlocks.create_block(
    "ast_Assign",
    node.lineno,
    fields,
    values,
    {
      inline: "true",
    },
    {
      "@targets": targets.length,
      "@simple": simpleTarget,
    }
  );
};

Blockly.Blocks["ast_AnnAssignFull"] = {
  init: function init() {
    this.appendValueInput("TARGET").setCheck(null).appendField("set");
    this.appendValueInput("ANNOTATION").setCheck(null).appendField(":");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
    this.initialized_ = true;
    this.updateShape_();
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("initialized", this.initialized_);
    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.initialized_ = "true" === xmlElement.getAttribute("initialized");
    this.updateShape_();
  },
  updateShape_: function updateShape_(block) {
    // Add new inputs.
    if (this.initialized_ && !this.getInput("VALUE")) {
      this.appendValueInput("VALUE")
        .appendField("=")
        .setAlign(Blockly.ALIGN_RIGHT);
    }

    if (!this.initialized_ && this.getInput("VALUE")) {
      this.removeInput("VALUE");
    }
  },
};

// ----------------------------------------------------------------------------------------------------------------------------------------------- //

BlockMirrorTextToBlocks.ANNOTATION_OPTIONS = [
  ["int", "int"],
  ["float", "float"],
  ["str", "str"],
  ["bool", "bool"],
  ["None", "None"],
];
BlockMirrorTextToBlocks.ANNOTATION_GENERATE = {};
BlockMirrorTextToBlocks.ANNOTATION_OPTIONS.forEach(function (ann) {
  BlockMirrorTextToBlocks.ANNOTATION_GENERATE[ann[1]] = ann[0];
});
Blockly.Blocks["ast_AnnAssign"] = {
  init: function init() {
    this.appendDummyInput()
      .appendField("set")
      .appendField(new Blockly.FieldVariable("item"), "TARGET")
      .appendField(":")
      .appendField(
        new Blockly.FieldDropdown(BlockMirrorTextToBlocks.ANNOTATION_OPTIONS),
        "ANNOTATION"
      );
    this.appendValueInput("VALUE").setCheck(null).appendField("=");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
    this.strAnnotations_ = false;
    this.initialized_ = true;
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("str", this.strAnnotations_);
    container.setAttribute("initialized", this.initialized_);
    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.strAnnotations_ = "true" === xmlElement.getAttribute("str");
    this.initialized_ = "true" === xmlElement.getAttribute("initialized");
    this.updateShape_();
  },
  updateShape_: function updateShape_(block) {
    // Add new inputs.
    if (this.initialized_ && !this.getInput("VALUE")) {
      this.appendValueInput("VALUE")
        .appendField("=")
        .setAlign(Blockly.ALIGN_RIGHT);
    }

    if (!this.initialized_ && this.getInput("VALUE")) {
      this.removeInput("VALUE");
    }
  },
};

Blockly.Python["ast_AnnAssignFull"] = function (block) {
  // Create a list with any number of elements of any type.
  var target =
    Blockly.Python.valueToCode(block, "TARGET", Blockly.Python.ORDER_NONE) ||
    Blockly.Python.blank;
  var annotation =
    Blockly.Python.valueToCode(
      block,
      "ANNOTATION",
      Blockly.Python.ORDER_NONE
    ) || Blockly.Python.blank;
  var value = "";

  if (this.initialized_) {
    value =
      " = " +
        Blockly.Python.valueToCode(block, "VALUE", Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank;
  }

  return target + ": " + annotation + value + "\n";
};

Blockly.Python["ast_AnnAssign"] = function (block) {
  // Create a list with any number of elements of any type.
  var target = Blockly.Python.variableDB_.getName(
    block.getFieldValue("TARGET"),
    Blockly.Variables.NAME_TYPE
  );
  var annotation = block.getFieldValue("ANNOTATION");

  if (block.strAnnotations_) {
    annotation = Blockly.Python.quote_(annotation);
  }

  var value = "";

  if (this.initialized_) {
    value =
      " = " +
        Blockly.Python.valueToCode(block, "VALUE", Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank;
  }

  return target + ": " + annotation + value + "\n";
};

BlockMirrorTextToBlocks.prototype.getBuiltinAnnotation = function (annotation) {
  var result = false; // Can we turn it into a basic type?

  if (annotation._astname === "Name") {
    result = Sk.ffi.remapToJs(annotation.id);
  } else if (annotation._astname === "Str") {
    result = Sk.ffi.remapToJs(annotation.s);
  } // Potentially filter out unknown annotations

  if (result !== false && this.strictAnnotations) {
    if (this.strictAnnotations.indexOf(result) !== -1) {
      return result;
    } else {
      return false;
    }
  } else {
    return result;
  }
};

BlockMirrorTextToBlocks.prototype["ast_AnnAssign"] = function (node, parent) {
  var target = node.target;
  var annotation = node.annotation;
  var value = node.value;
  var values = {};
  var mutations = {
    "@initialized": false,
  };

  if (value !== null) {
    values["VALUE"] = this.convert(value, node);
    mutations["@initialized"] = true;
  } // TODO: This controls whether the annotation is stored in __annotations__

  var simple = node.simple;
  var builtinAnnotation = this.getBuiltinAnnotation(annotation);

  if (
    target._astname === "Name" &&
    target.id.v !== Blockly.Python.blank &&
    builtinAnnotation !== false
  ) {
    mutations["@str"] = annotation._astname === "Str";
    return BlockMirrorTextToBlocks.create_block(
      "ast_AnnAssign",
      node.lineno,
      {
        TARGET: target.id.v,
        ANNOTATION: builtinAnnotation,
      },
      values,
      {
        inline: "true",
      },
      mutations
    );
  } else {
    values["TARGET"] = this.convert(target, node);
    values["ANNOTATION"] = this.convert(annotation, node);
    return BlockMirrorTextToBlocks.create_block(
      "ast_AnnAssignFull",
      node.lineno,
      {},
      values,
      {
        inline: "true",
      },
      mutations
    );
  }
};

Blockly.Blocks["ast_AugAssign"] = {
  init: function init() {
    var block = this;
    this.simpleTarget_ = true;
    this.allOptions_ = false;
    this.initialPreposition_ = "by";
    this.appendDummyInput("OP")
      .appendField(
        new Blockly.FieldDropdown(
          function () {
            return block.allOptions_
              ? BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_DISPLAY_FULL
              : BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_DISPLAY;
          },
          function (value) {
            var block = this.sourceBlock_;
            block.updatePreposition_(value);
          }
        ),
        "OP_NAME"
      )
      .appendField(" ");
    this.appendDummyInput("PREPOSITION_ANCHOR")
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField("by", "PREPOSITION");
    this.appendValueInput("VALUE");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
    this.updateShape_();
    this.updatePreposition_(this.initialPreposition_);
  },
  updatePreposition_: function updatePreposition_(value) {
    var preposition =
      BlockMirrorTextToBlocks.BINOPS_AUGASSIGN_PREPOSITION[value];
    this.setFieldValue(preposition, "PREPOSITION");
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("simple", this.simpleTarget_);
    container.setAttribute("options", this.allOptions_);
    container.setAttribute("preposition", this.initialPreposition_);
    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.simpleTarget_ = "true" === xmlElement.getAttribute("simple");
    this.allOptions_ = "true" === xmlElement.getAttribute("options");
    this.initialPreposition_ = xmlElement.getAttribute("preposition");
    this.updateShape_();
    this.updatePreposition_(this.initialPreposition_);
  },
  updateShape_: function updateShape_(block) {
    // Add new inputs.
    this.getField("OP_NAME").getOptions(false);

    if (this.simpleTarget_) {
      if (!this.getInput("VAR_ANCHOR")) {
        this.appendDummyInput("VAR_ANCHOR").appendField(
          new Blockly.FieldVariable("variable"),
          "VAR"
        );
        this.moveInputBefore("VAR_ANCHOR", "PREPOSITION_ANCHOR");
      }

      if (this.getInput("TARGET")) {
        this.removeInput("TARGET");
      }
    } else {
      if (this.getInput("VAR_ANCHOR")) {
        this.removeInput("VAR_ANCHOR");
      }

      if (!this.getInput("TARGET")) {
        this.appendValueInput("TARGET");
        this.moveInputBefore("TARGET", "PREPOSITION_ANCHOR");
      }
    }
  },
};

Blockly.Python["ast_AugAssign"] = function (block) {
  // Create a list with any number of elements of any type.
  var target;

  if (block.simpleTarget_) {
    target = Blockly.Python.variableDB_.getName(
      block.getFieldValue("VAR"),
      Blockly.Variables.NAME_TYPE
    );
  } else {
    target =
      Blockly.Python.valueToCode(block, "TARGET", Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank;
  }

  var operator = BINOPS_BLOCKLY_GENERATE[block.getFieldValue("OP_NAME")][0];
  var value =
    Blockly.Python.valueToCode(block, "VALUE", Blockly.Python.ORDER_NONE) ||
    Blockly.Python.blank;
  return target + operator + "= " + value + "\n";
};

BlockMirrorTextToBlocks.prototype["ast_AugAssign"] = function (node, parent) {
  var target = node.target;
  var op = node.op.name;
  var value = node.value;
  var values = {
    VALUE: this.convert(value, node),
  };
  var fields = {
    OP_NAME: op,
  };
  var simpleTarget = target._astname === "Name";

  if (simpleTarget) {
    fields["VAR"] = Sk.ffi.remapToJs(target.id);
  } else {
    values["TARGET"] = this.convert(value, node);
  }

  var preposition = op;
  var allOptions = BINOPS_SIMPLE.indexOf(op) === -1;
  return BlockMirrorTextToBlocks.create_block(
    "ast_AugAssign",
    node.lineno,
    fields,
    values,
    {
      inline: "true",
    },
    {
      "@options": allOptions,
      "@simple": simpleTarget,
      "@preposition": preposition,
    }
  );
};
/* ================================================================================================== */

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Str",
  message0: "%1",
  args0: [
    {
      type: "field_input",
      name: "TEXT",
      value: "",
    },
  ],
  output: "String",
  colour: BlockMirrorTextToBlocks.COLOR.TEXT,
  extensions: ["text_quotes"],
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_StrChar",
  message0: "%1",
  args0: [
    {
      type: "field_dropdown",
      name: "TEXT",
      options: [
        ["\\n", "\n"],
        ["\\t", "\t"],
      ],
    },
  ],
  output: "String",
  colour: BlockMirrorTextToBlocks.COLOR.TEXT,
  extensions: ["text_quotes"],
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_StrMultiline",
  message0: "%1",
  args0: [
    {
      type: "field_multilinetext",
      name: "TEXT",
      value: "",
    },
  ],
  output: "String",
  colour: BlockMirrorTextToBlocks.COLOR.TEXT,
  extensions: ["text_quotes"],
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_StrDocstring",
  message0: "Docstring: %1 %2",
  args0: [
    {
      type: "input_dummy",
    },
    {
      type: "field_multilinetext",
      name: "TEXT",
      value: "",
    },
  ],
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.TEXT,
});
Blockly.Blocks["ast_Image"] = {
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.TEXT);
    this.src_ = "loading.png";
    this.updateShape_();
    this.setOutput(true);
  },
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("src", this.src_);
    return container;
  },
  domToMutation: function domToMutation(xmlElement) {
    this.src_ = xmlElement.getAttribute("src");
    this.updateShape_();
  },
  updateShape_: function updateShape_() {
    var image = this.getInput("IMAGE");

    if (!image) {
      image = this.appendDummyInput("IMAGE");
      image.appendField(
        new Blockly.FieldImage(this.src_, 40, 40, {
          alt: this.src_,
          flipRtl: "FALSE",
        })
      );
    }

    var imageField = image.fieldRow[0];
    imageField.setValue(this.src_);
  },
};

Blockly.Python["ast_Str"] = function (block) {
  // Text value
  var code = Blockly.Python.quote_(block.getFieldValue("TEXT"));
  code = code.replace("\n", "n");
  return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python["ast_StrChar"] = function (block) {
  // Text value
  var value = block.getFieldValue("TEXT");

  switch (value) {
    case "\n":
      return ["'\\n'", Blockly.Python.ORDER_ATOMIC];

    case "\t":
      return ["'\\t'", Blockly.Python.ORDER_ATOMIC];
  }
};

Blockly.Python["ast_Image"] = function (block) {
  // Text value
  Blockly.Python.definitions_["import_image"] = "from image import Image";
  var code = "Image(" + Blockly.Python.quote_(block.src_) + ")";
  return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};

Blockly.Python["ast_StrMultiline"] = function (block) {
  // Text value
  var code = Blockly.Python.multiline_quote_(block.getFieldValue("TEXT"));
  return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python["ast_StrDocstring"] = function (block) {
  // Text value.
  var code = block.getFieldValue("TEXT");

  if (code.charAt(0) !== "\n") {
    code = "\n" + code;
  }

  if (code.charAt(code.length - 1) !== "\n") {
    code = code + "\n";
  }

  return Blockly.Python.multiline_quote_(code) + "\n";
};

/* ===================================================================================================== */

BlockMirrorTextToBlocks.prototype.isSingleChar = function (text) {
  return text === "\n" || text === "\t";
};

BlockMirrorTextToBlocks.prototype.isDocString = function (node, parent) {
  return (
    parent._astname === "Expr" &&
    parent._parent &&
    ["FunctionDef", "ClassDef"].indexOf(parent._parent._astname) !== -1 &&
    parent._parent.body[0] === parent
  );
};

BlockMirrorTextToBlocks.prototype.isSimpleString = function (text) {
  return text.split("\n").length <= 2 && text.length <= 40;
};

BlockMirrorTextToBlocks.prototype.dedent = function (
  text,
  levels,
  isDocString
) {
  if (!isDocString && text.charAt(0) === "\n") {
    return text;
  }

  var split = text.split("\n");
  var indentation = "    ".repeat(levels);
  var recombined = []; // Are all lines indented?

  for (var i = 0; i < split.length; i++) {
    // This was a blank line, add it unchanged unless its the first line
    if (split[i] === "") {
      if (i !== 0) {
        recombined.push("");
      } // If it has our ideal indentation, add it without indentation
    } else if (split[i].startsWith(indentation)) {
      var unindentedLine = split[i].substr(indentation.length);

      if (unindentedLine !== "" || i !== split.length - 1) {
        recombined.push(unindentedLine);
      } // If it's the first line, then add it unmodified
    } else if (i === 0) {
      recombined.push(split[i]); // This whole structure cannot be uniformly dedented, better give up.
    } else {
      return text;
    }
  }

  return recombined.join("\n");
}; // TODO: Handle indentation intelligently

BlockMirrorTextToBlocks.prototype["ast_Str"] = function (node, parent) {
  var s = node.s;
  var text = Sk.ffi.remapToJs(s);
  /*if (text.startsWith("http") && text.endsWith(".png")) {
      return BlockMirrorTextToBlocks.create_block("ast_Image", node.lineno, {}, {}, {},
          {"@src": text});
  } else*/

  if (this.isSingleChar(text)) {
    return BlockMirrorTextToBlocks.create_block("ast_StrChar", node.lineno, {
      TEXT: text,
    });
  } else if (this.isDocString(node, parent)) {
    var dedented = this.dedent(text, this.levelIndex - 1, true);
    return [
      BlockMirrorTextToBlocks.create_block("ast_StrDocstring", node.lineno, {
        TEXT: dedented,
      }),
    ];
  } else if (text.indexOf("\n") === -1) {
    return BlockMirrorTextToBlocks.create_block("ast_Str", node.lineno, {
      TEXT: text,
    });
  } else {
    var _dedented = this.dedent(text, this.levelIndex - 1, false);

    return BlockMirrorTextToBlocks.create_block(
      "ast_StrMultiline",
      node.lineno,
      {
        TEXT: _dedented,
      }
    );
  }
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Expr",
  message0: "do nothing with %1",
  args0: [
    {
      type: "input_value",
      name: "VALUE",
    },
  ],
  inputsInline: false,
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.PYTHON,
});

Blockly.Python["ast_Expr"] = function (block) {
  // Numeric value.
  var value =
    Blockly.Python.valueToCode(block, "VALUE", Blockly.Python.ORDER_ATOMIC) ||
    Blockly.Python.blank; // TODO: Assemble JavaScript into code variable.

  return value + "\n";
};

BlockMirrorTextToBlocks.prototype["ast_Expr"] = function (node, parent) {
  var value = node.value;
  var converted = this.convert(value, node);

  if (converted.constructor === Array) {
    return converted[0];
  } else if (this.isTopLevel(parent)) {
    return [this.convert(value, node)];
  } else {
    return BlockMirrorTextToBlocks.create_block(
      "ast_Expr",
      node.lineno,
      {},
      {
        VALUE: this.convert(value, node),
      }
    );
  }
};

BlockMirrorTextToBlocks.UNARYOPS = [
  ["+", "UAdd", "Do nothing to the number"],
  ["-", "USub", "Make the number negative"],
  ["not", "Not", "Return the logical opposite of the value."],
  ["~", "Invert", "Take the bit inversion of the number"],
];
BlockMirrorTextToBlocks.UNARYOPS.forEach(function (unaryop) {
  //Blockly.Constants.Math.TOOLTIPS_BY_OP[unaryop[1]] = unaryop[2];
  var fullName = "ast_UnaryOp" + unaryop[1];
  BlockMirrorTextToBlocks.BLOCKS.push({
    type: fullName,
    message0: unaryop[0] + " %1",
    args0: [
      {
        type: "input_value",
        name: "VALUE",
      },
    ],
    inputsInline: false,
    output: null,
    colour:
      unaryop[1] == "Not"
        ? BlockMirrorTextToBlocks.COLOR.LOGIC
        : BlockMirrorTextToBlocks.COLOR.MATH,
  });

  Blockly.Python[fullName] = function (block) {
    // Basic arithmetic operators, and power.
    var order =
      unaryop[1] == "Not"
        ? Blockly.Python.ORDER_LOGICAL_NOT
        : Blockly.Python.ORDER_UNARY_SIGN;
    var argument1 =
      Blockly.Python.valueToCode(block, "VALUE", order) || Blockly.Python.blank;
    var code = unaryop[0] + (unaryop[1] == "Not" ? " " : "") + argument1;
    return [code, order];
  };
});

BlockMirrorTextToBlocks.prototype["ast_UnaryOp"] = function (node, parent) {
  var op = node.op.name;
  var operand = node.operand;
  return BlockMirrorTextToBlocks.create_block(
    "ast_UnaryOp" + op,
    node.lineno,
    {},
    {
      VALUE: this.convert(operand, node),
    },
    {
      inline: false,
    }
  );
};

BlockMirrorTextToBlocks.BOOLOPS = [
  [
    "and",
    "And",
    Blockly.Python.ORDER_LOGICAL_AND,
    "Return whether the left and right both evaluate to True.",
  ],
  [
    "or",
    "Or",
    Blockly.Python.ORDER_LOGICAL_OR,
    "Return whether either the left or right evaluate to True.",
  ],
];
var BOOLOPS_BLOCKLY_DISPLAY = BlockMirrorTextToBlocks.BOOLOPS.map(function (
  boolop
) {
  return [boolop[0], boolop[1]];
});
var BOOLOPS_BLOCKLY_GENERATE = {};
BlockMirrorTextToBlocks.BOOLOPS.forEach(function (boolop) {
  BOOLOPS_BLOCKLY_GENERATE[boolop[1]] = [" " + boolop[0] + " ", boolop[2]];
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_BoolOp",
  message0: "%1 %2 %3",
  args0: [
    {
      type: "input_value",
      name: "A",
    },
    {
      type: "field_dropdown",
      name: "OP",
      options: BOOLOPS_BLOCKLY_DISPLAY,
    },
    {
      type: "input_value",
      name: "B",
    },
  ],
  inputsInline: true,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.LOGIC,
});

Blockly.Python["ast_BoolOp"] = function (block) {
  // Operations 'and', 'or'.
  var operator = block.getFieldValue("OP") === "And" ? "and" : "or";
  var order =
    operator === "and"
      ? Blockly.Python.ORDER_LOGICAL_AND
      : Blockly.Python.ORDER_LOGICAL_OR;
  var argument0 =
    Blockly.Python.valueToCode(block, "A", order) || Blockly.Python.blank;
  var argument1 =
    Blockly.Python.valueToCode(block, "B", order) || Blockly.Python.blank;
  var code = argument0 + " " + operator + " " + argument1;
  return [code, order];
};

BlockMirrorTextToBlocks.prototype["ast_BoolOp"] = function (node, parent) {
  var op = node.op;
  var values = node.values;
  var result_block = this.convert(values[0], node);

  for (var i = 1; i < values.length; i += 1) {
    result_block = BlockMirrorTextToBlocks.create_block(
      "ast_BoolOp",
      node.lineno,
      {
        OP: op.name,
      },
      {
        A: result_block,
        B: this.convert(values[i], node),
      },
      {
        inline: "true",
      }
    );
  }

  return result_block;
};

/* ================================================================================= */

BlockMirrorTextToBlocks.COMPARES = [
  ["==", "Eq", "Return whether the two values are equal."],
  ["!=", "NotEq", "Return whether the two values are not equal."],
  ["<", "Lt", "Return whether the left value is less than the right value."],
  [
    "<=",
    "LtE",
    "Return whether the left value is less than or equal to the right value.",
  ],
  [">", "Gt", "Return whether the left value is greater than the right value."],
  [
    ">=",
    "GtE",
    "Return whether the left value is greater than or equal to the right value.",
  ],
  [
    "is",
    "Is",
    "Return whether the left value is identical to the right value.",
  ],
  [
    "is not",
    "IsNot",
    "Return whether the left value is not identical to the right value.",
  ],
  ["in", "In", "Return whether the left value is in the right value."],
  [
    "not in",
    "NotIn",
    "Return whether the left value is not in the right value.",
  ],
];
var COMPARES_BLOCKLY_DISPLAY = BlockMirrorTextToBlocks.COMPARES.map(function (
  boolop
) {
  return [boolop[0], boolop[1]];
});
var COMPARES_BLOCKLY_GENERATE = {};
BlockMirrorTextToBlocks.COMPARES.forEach(function (boolop) {
  COMPARES_BLOCKLY_GENERATE[boolop[1]] = boolop[0];
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Compare",
  message0: "%1 %2 %3",
  args0: [
    {
      type: "input_value",
      name: "A",
    },
    {
      type: "field_dropdown",
      name: "OP",
      options: COMPARES_BLOCKLY_DISPLAY,
    },
    {
      type: "input_value",
      name: "B",
    },
  ],
  inputsInline: true,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.LOGIC,
});

Blockly.Python["ast_Compare"] = function (block) {
  // Basic arithmetic operators, and power.
  var tuple = COMPARES_BLOCKLY_GENERATE[block.getFieldValue("OP")];
  var operator = " " + tuple + " ";
  var order = Blockly.Python.ORDER_RELATIONAL;
  var argument0 =
    Blockly.Python.valueToCode(block, "A", order) || Blockly.Python.blank;
  var argument1 =
    Blockly.Python.valueToCode(block, "B", order) || Blockly.Python.blank;
  var code = argument0 + operator + argument1;
  return [code, order];
};

BlockMirrorTextToBlocks.prototype["ast_Compare"] = function (node, parent) {
  var ops = node.ops;
  var left = node.left;
  var values = node.comparators;
  var result_block = this.convert(left, node);

  for (var i = 0; i < values.length; i += 1) {
    result_block = BlockMirrorTextToBlocks.create_block(
      "ast_Compare",
      node.lineno,
      {
        OP: ops[i].name,
      },
      {
        A: result_block,
        B: this.convert(values[i], node),
      },
      {
        inline: "true",
      }
    );
  }

  return result_block;
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_AssertFull",
  message0: "assert %1 %2",
  args0: [
    {
      type: "input_value",
      name: "TEST",
    },
    {
      type: "input_value",
      name: "MSG",
    },
  ],
  inputsInline: true,
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.LOGIC,
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Assert",
  message0: "assert %1",
  args0: [
    {
      type: "input_value",
      name: "TEST",
    },
  ],
  inputsInline: true,
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.LOGIC,
});

Blockly.Python["ast_Assert"] = function (block) {
  var test =
    Blockly.Python.valueToCode(block, "TEST", Blockly.Python.ORDER_ATOMIC) ||
    Blockly.Python.blank;
  return "assert " + test + "\n";
};

Blockly.Python["ast_AssertFull"] = function (block) {
  var test =
    Blockly.Python.valueToCode(block, "TEST", Blockly.Python.ORDER_ATOMIC) ||
    Blockly.Python.blank;
  var msg =
    Blockly.Python.valueToCode(block, "MSG", Blockly.Python.ORDER_ATOMIC) ||
    Blockly.Python.blank;
  return "assert " + test + ", " + msg + "\n";
};

BlockMirrorTextToBlocks.prototype["ast_Assert"] = function (node, parent) {
  var test = node.test;
  var msg = node.msg;

  if (msg == null) {
    return BlockMirrorTextToBlocks.create_block(
      "ast_Assert",
      node.lineno,
      {},
      {
        TEST: this.convert(test, node),
      }
    );
  } else {
    return BlockMirrorTextToBlocks.create_block(
      "ast_AssertFull",
      node.lineno,
      {},
      {
        TEST: this.convert(test, node),
        MSG: this.convert(msg, node),
      }
    );
  }
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_NameConstantNone",
  message0: "None",
  args0: [],
  output: "None",
  colour: BlockMirrorTextToBlocks.COLOR.LOGIC,
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_NameConstantBoolean",
  message0: "%1",
  args0: [
    {
      type: "field_dropdown",
      name: "BOOL",
      options: [
        ["True", "TRUE"],
        ["False", "FALSE"],
      ],
    },
  ],
  output: "Boolean",
  colour: BlockMirrorTextToBlocks.COLOR.LOGIC,
});

Blockly.Python["ast_NameConstantBoolean"] = function (block) {
  // Boolean values true and false.
  var code = block.getFieldValue("BOOL") == "TRUE" ? "True" : "False";
  return [code, Blockly.Python.ORDER_ATOMIC];
};

Blockly.Python["ast_NameConstantNone"] = function (block) {
  // Boolean values true and false.
  var code = "None";
  return [code, Blockly.Python.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_NameConstant"] = function (
  node,
  parent
) {
  var value = node.value;

  if (value === Sk.builtin.none.none$) {
    return BlockMirrorTextToBlocks.create_block(
      "ast_NameConstantNone",
      node.lineno,
      {}
    );
  } else if (value === Sk.builtin.bool.true$) {
    return BlockMirrorTextToBlocks.create_block(
      "ast_NameConstantBoolean",
      node.lineno,
      {
        BOOL: "TRUE",
      }
    );
  } else if (value === Sk.builtin.bool.false$) {
    return BlockMirrorTextToBlocks.create_block(
      "ast_NameConstantBoolean",
      node.lineno,
      {
        BOOL: "FALSE",
      }
    );
  }
};

Blockly.Blocks["ast_List"] = {
  /**
   * Block for creating a list with any number of elements of any type.
   * @this Blockly.Block
   */
  init: function init() {
    this.setHelpUrl(Blockly.Msg["LISTS_CREATE_WITH_HELPURL"]);
    this.setColour(BlockMirrorTextToBlocks.COLOR.LIST);
    this.itemCount_ = 3;
    this.updateShape_();
    this.setOutput(true, "List");
    this.setMutator(new Blockly.Mutator(["ast_List_create_with_item"]));
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("items", this.itemCount_);
    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
    this.updateShape_();
  },

  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function decompose(workspace) {
    var containerBlock = workspace.newBlock("ast_List_create_with_container");
    containerBlock.initSvg();
    var connection = containerBlock.getInput("STACK").connection;

    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock("ast_List_create_with_item");
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }

    return containerBlock;
  },

  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function compose(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK"); // Count number of inputs.

    var connections = [];

    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    } // Disconnect any children that don't belong.

    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput("ADD" + i).connection.targetConnection;

      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }

    this.itemCount_ = connections.length;
    this.updateShape_(); // Reconnect any child blocks.

    for (var i = 0; i < this.itemCount_; i++) {
      Blockly.Mutator.reconnect(connections[i], this, "ADD" + i);
    }
  },

  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function saveConnections(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    var i = 0;

    while (itemBlock) {
      var input = this.getInput("ADD" + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },

  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function updateShape_() {
    if (this.itemCount_ && this.getInput("EMPTY")) {
      this.removeInput("EMPTY");
    } else if (!this.itemCount_ && !this.getInput("EMPTY")) {
      this.appendDummyInput("EMPTY").appendField("create empty list []");
    } // Add new inputs.

    for (var i = 0; i < this.itemCount_; i++) {
      if (!this.getInput("ADD" + i)) {
        var input = this.appendValueInput("ADD" + i);

        if (i == 0) {
          input.appendField("create list with [");
        } else {
          input.appendField(",").setAlign(Blockly.ALIGN_RIGHT);
        }
      }
    } // Remove deleted inputs.

    while (this.getInput("ADD" + i)) {
      this.removeInput("ADD" + i);
      i++;
    } // Add the trailing "]"

    if (this.getInput("TAIL")) {
      this.removeInput("TAIL");
    }

    if (this.itemCount_) {
      this.appendDummyInput("TAIL")
        .appendField("]")
        .setAlign(Blockly.ALIGN_RIGHT);
    }
  },
};
Blockly.Blocks["ast_List_create_with_container"] = {
  /**
   * Mutator block for list container.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.LIST);
    this.appendDummyInput().appendField("Add new list elements below");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};
Blockly.Blocks["ast_List_create_with_item"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.LIST);
    this.appendDummyInput().appendField("Element");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

Blockly.Python["ast_List"] = function (block) {
  // Create a list with any number of elements of any type.
  var elements = new Array(block.itemCount_);

  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] =
      Blockly.Python.valueToCode(block, "ADD" + i, Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank;
  }

  var code = "[" + elements.join(", ") + "]";
  return [code, Blockly.Python.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_List"] = function (node, parent) {
  var elts = node.elts;
  var ctx = node.ctx;
  return BlockMirrorTextToBlocks.create_block(
    "ast_List",
    node.lineno,
    {},
    this.convertElements("ADD", elts, node),
    {
      inline: elts.length > 3 ? "false" : "true",
    },
    {
      "@items": elts.length,
    }
  );
};

Blockly.Blocks["ast_Tuple"] = {
  /**
   * Block for creating a tuple with any number of elements of any type.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.TUPLE);
    this.itemCount_ = 3;
    this.updateShape_();
    this.setOutput(true, "Tuple");
    this.setMutator(new Blockly.Mutator(["ast_Tuple_create_with_item"]));
  },

  /**
   * Create XML to represent tuple inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("items", this.itemCount_);
    return container;
  },

  /**
   * Parse XML to restore the tuple inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
    this.updateShape_();
  },

  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function decompose(workspace) {
    var containerBlock = workspace.newBlock("ast_Tuple_create_with_container");
    containerBlock.initSvg();
    var connection = containerBlock.getInput("STACK").connection;

    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock("ast_Tuple_create_with_item");
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }

    return containerBlock;
  },

  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function compose(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK"); // Count number of inputs.

    var connections = [];

    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    } // Disconnect any children that don't belong.

    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput("ADD" + i).connection.targetConnection;

      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }

    this.itemCount_ = connections.length;
    this.updateShape_(); // Reconnect any child blocks.

    for (var i = 0; i < this.itemCount_; i++) {
      Blockly.Mutator.reconnect(connections[i], this, "ADD" + i);
    }
  },

  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function saveConnections(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    var i = 0;

    while (itemBlock) {
      var input = this.getInput("ADD" + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },

  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function updateShape_() {
    if (this.itemCount_ && this.getInput("EMPTY")) {
      this.removeInput("EMPTY");
    } else if (!this.itemCount_ && !this.getInput("EMPTY")) {
      this.appendDummyInput("EMPTY").appendField("()");
    } // Add new inputs.

    for (var i = 0; i < this.itemCount_; i++) {
      if (!this.getInput("ADD" + i)) {
        var input = this.appendValueInput("ADD" + i);

        if (i === 0) {
          input.appendField("(").setAlign(Blockly.ALIGN_RIGHT);
        } else {
          input.appendField(",").setAlign(Blockly.ALIGN_RIGHT);
        }
      }
    } // Remove deleted inputs.

    while (this.getInput("ADD" + i)) {
      this.removeInput("ADD" + i);
      i++;
    } // Add the trailing "]"

    if (this.getInput("TAIL")) {
      this.removeInput("TAIL");
    }

    if (this.itemCount_) {
      var tail = this.appendDummyInput("TAIL");

      if (this.itemCount_ === 1) {
        tail.appendField(",)");
      } else {
        tail.appendField(")");
      }

      tail.setAlign(Blockly.ALIGN_RIGHT);
    }
  },
};
Blockly.Blocks["ast_Tuple_create_with_container"] = {
  /**
   * Mutator block for tuple container.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.TUPLE);
    this.appendDummyInput().appendField("Add new tuple elements below");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};
Blockly.Blocks["ast_Tuple_create_with_item"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.TUPLE);
    this.appendDummyInput().appendField("Element");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

Blockly.Python["ast_Tuple"] = function (block) {
  // Create a tuple with any number of elements of any type.
  var elements = new Array(block.itemCount_);

  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] =
      Blockly.Python.valueToCode(block, "ADD" + i, Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank;
  }

  var requiredComma = "";

  if (block.itemCount_ == 1) {
    requiredComma = ", ";
  }

  var code = "(" + elements.join(", ") + requiredComma + ")";
  return [code, Blockly.Python.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_Tuple"] = function (node, parent) {
  var elts = node.elts;
  var ctx = node.ctx;
  return BlockMirrorTextToBlocks.create_block(
    "ast_Tuple",
    node.lineno,
    {},
    this.convertElements("ADD", elts, node),
    {
      inline: elts.length > 4 ? "false" : "true",
    },
    {
      "@items": elts.length,
    }
  );
};

Blockly.Blocks["ast_Set"] = {
  /**
   * Block for creating a set with any number of elements of any type.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SET);
    this.itemCount_ = 3;
    this.updateShape_();
    this.setOutput(true, "Set");
    this.setMutator(new Blockly.Mutator(["ast_Set_create_with_item"]));
  },

  /**
   * Create XML to represent set inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("items", this.itemCount_);
    return container;
  },

  /**
   * Parse XML to restore the set inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
    this.updateShape_();
  },

  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function decompose(workspace) {
    var containerBlock = workspace.newBlock("ast_Set_create_with_container");
    containerBlock.initSvg();
    var connection = containerBlock.getInput("STACK").connection;

    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock("ast_Set_create_with_item");
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }

    return containerBlock;
  },

  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function compose(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK"); // Count number of inputs.

    var connections = [];

    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    } // Disconnect any children that don't belong.

    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput("ADD" + i).connection.targetConnection;

      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }

    this.itemCount_ = connections.length;
    this.updateShape_(); // Reconnect any child blocks.

    for (var i = 0; i < this.itemCount_; i++) {
      Blockly.Mutator.reconnect(connections[i], this, "ADD" + i);
    }
  },

  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function saveConnections(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    var i = 0;

    while (itemBlock) {
      var input = this.getInput("ADD" + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },

  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function updateShape_() {
    if (this.itemCount_ && this.getInput("EMPTY")) {
      this.removeInput("EMPTY");
    } else if (!this.itemCount_ && !this.getInput("EMPTY")) {
      this.appendDummyInput("EMPTY").appendField("create empty set");
    } // Add new inputs.

    for (var i = 0; i < this.itemCount_; i++) {
      if (!this.getInput("ADD" + i)) {
        var input = this.appendValueInput("ADD" + i);

        if (i === 0) {
          input.appendField("create set with {").setAlign(Blockly.ALIGN_RIGHT);
        } else {
          input.appendField(",").setAlign(Blockly.ALIGN_RIGHT);
        }
      }
    } // Remove deleted inputs.

    while (this.getInput("ADD" + i)) {
      this.removeInput("ADD" + i);
      i++;
    } // Add the trailing "]"

    if (this.getInput("TAIL")) {
      this.removeInput("TAIL");
    }

    if (this.itemCount_) {
      this.appendDummyInput("TAIL")
        .appendField("}")
        .setAlign(Blockly.ALIGN_RIGHT);
    }
  },
};
Blockly.Blocks["ast_Set_create_with_container"] = {
  /**
   * Mutator block for set container.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SET);
    this.appendDummyInput().appendField("Add new set elements below");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};
Blockly.Blocks["ast_Set_create_with_item"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SET);
    this.appendDummyInput().appendField("Element");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

Blockly.Python["ast_Set"] = function (block) {
  // Create a set with any number of elements of any type.
  if (block.itemCount_ === 0) {
    return ["set()", Blockly.Python.ORDER_FUNCTION_CALL];
  }

  var elements = new Array(block.itemCount_);

  for (var i = 0; i < block.itemCount_; i++) {
    elements[i] =
      Blockly.Python.valueToCode(block, "ADD" + i, Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank;
  }

  var code = "{" + elements.join(", ") + "}";
  return [code, Blockly.Python.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_Set"] = function (node, parent) {
  var elts = node.elts;
  return BlockMirrorTextToBlocks.create_block(
    "ast_Set",
    node.lineno,
    {},
    this.convertElements("ADD", elts, node),
    {
      inline: elts.length > 3 ? "false" : "true",
    },
    {
      "@items": elts.length,
    }
  );
};

Blockly.Blocks["ast_DictItem"] = {
  init: function init() {
    this.appendValueInput("KEY").setCheck(null);
    this.appendValueInput("VALUE").setCheck(null).appendField(":");
    this.setInputsInline(true);
    this.setOutput(true, "DictPair");
    this.setColour(BlockMirrorTextToBlocks.COLOR.DICTIONARY);
  },
};
Blockly.Blocks["ast_Dict"] = {
  /**
   * Block for creating a dict with any number of elements of any type.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.DICTIONARY);
    this.itemCount_ = 3;
    this.updateShape_();
    this.setOutput(true, "Dict");
    this.setMutator(new Blockly.Mutator(["ast_Dict_create_with_item"]));
  },

  /**
   * Create XML to represent dict inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("items", this.itemCount_);
    return container;
  },

  /**
   * Parse XML to restore the dict inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
    this.updateShape_();
  },

  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function decompose(workspace) {
    var containerBlock = workspace.newBlock("ast_Dict_create_with_container");
    containerBlock.initSvg();
    var connection = containerBlock.getInput("STACK").connection;

    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock("ast_Dict_create_with_item");
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }

    return containerBlock;
  },

  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function compose(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK"); // Count number of inputs.

    var connections = [];

    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    } // Disconnect any children that don't belong.

    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput("ADD" + i).connection.targetConnection;

      if (connection && connections.indexOf(connection) == -1) {
        var key = connection.getSourceBlock().getInput("KEY");

        if (key.connection.targetConnection) {
          key.connection.targetConnection.getSourceBlock().unplug(true);
        }

        var value = connection.getSourceBlock().getInput("VALUE");

        if (value.connection.targetConnection) {
          value.connection.targetConnection.getSourceBlock().unplug(true);
        }

        connection.disconnect();
        connection.getSourceBlock().dispose();
      }
    }

    this.itemCount_ = connections.length;
    this.updateShape_(); // Reconnect any child blocks.

    for (var i = 0; i < this.itemCount_; i++) {
      Blockly.Mutator.reconnect(connections[i], this, "ADD" + i);

      if (!connections[i]) {
        var _itemBlock = this.workspace.newBlock("ast_DictItem");

        _itemBlock.setDeletable(false);

        _itemBlock.setMovable(false);

        _itemBlock.initSvg();

        this.getInput("ADD" + i).connection.connect(
          _itemBlock.outputConnection
        );

        _itemBlock.render(); //this.get(itemBlock, 'ADD'+i)
      }
    }
  },

  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function saveConnections(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    var i = 0;

    while (itemBlock) {
      var input = this.getInput("ADD" + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },

  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function updateShape_() {
    if (this.itemCount_ && this.getInput("EMPTY")) {
      this.removeInput("EMPTY");
    } else if (!this.itemCount_ && !this.getInput("EMPTY")) {
      this.appendDummyInput("EMPTY").appendField("empty dictionary");
    } // Add new inputs.

    for (var i = 0; i < this.itemCount_; i++) {
      if (!this.getInput("ADD" + i)) {
        var input = this.appendValueInput("ADD" + i).setCheck("DictPair");

        if (i === 0) {
          input.appendField("create dict with").setAlign(Blockly.ALIGN_RIGHT);
        }
      }
    } // Remove deleted inputs.

    while (this.getInput("ADD" + i)) {
      this.removeInput("ADD" + i);
      i++;
    } // Add the trailing "}"

    /*
    if (this.getInput('TAIL')) {
        this.removeInput('TAIL');
    }
    if (this.itemCount_) {
        let tail = this.appendDummyInput('TAIL')
            .appendField('}');
        tail.setAlign(Blockly.ALIGN_RIGHT);
    }*/
  },
};
Blockly.Blocks["ast_Dict_create_with_container"] = {
  /**
   * Mutator block for dict container.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.DICTIONARY);
    this.appendDummyInput().appendField("Add new dict elements below");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};
Blockly.Blocks["ast_Dict_create_with_item"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.DICTIONARY);
    this.appendDummyInput().appendField("Element");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};

Blockly.Python["ast_Dict"] = function (block) {
  // Create a dict with any number of elements of any type.
  var elements = new Array(block.itemCount_);

  for (var i = 0; i < block.itemCount_; i++) {
    var child = block.getInputTargetBlock("ADD" + i);

    if (child === null || child.type != "ast_DictItem") {
      elements[i] = Blockly.Python.blank + ": " + Blockly.Python.blank;
      continue;
    }

    var key =
      Blockly.Python.valueToCode(child, "KEY", Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank;
    var value =
      Blockly.Python.valueToCode(child, "VALUE", Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank;
    elements[i] = key + ": " + value;
  }

  var code = "{" + elements.join(", ") + "}";
  return [code, Blockly.Python.ORDER_ATOMIC];
};

BlockMirrorTextToBlocks.prototype["ast_Dict"] = function (node, parent) {
  var keys = node.keys;
  var values = node.values;

  if (keys === null) {
    return BlockMirrorTextToBlocks.create_block(
      "ast_Dict",
      node.lineno,
      {},
      {},
      {
        inline: "false",
      },
      {
        "@items": 0,
      }
    );
  }

  var elements = {};

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = values[i];
    elements["ADD" + i] = BlockMirrorTextToBlocks.create_block(
      "ast_DictItem",
      node.lineno,
      {},
      {
        KEY: this.convert(key, node),
        VALUE: this.convert(value, node),
      },
      this.LOCKED_BLOCK
    );
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_Dict",
    node.lineno,
    {},
    elements,
    {
      inline: "false",
    },
    {
      "@items": keys.length,
    }
  );
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Starred",
  message0: "*%1",
  args0: [
    {
      type: "input_value",
      name: "VALUE",
    },
  ],
  inputsInline: false,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.VARIABLES,
});

Blockly.Python["ast_Starred"] = function (block) {
  // Basic arithmetic operators, and power.
  var order = Blockly.Python.ORDER_NONE;
  var argument1 =
    Blockly.Python.valueToCode(block, "VALUE", order) || Blockly.Python.blank;
  var code = "*" + argument1;
  return [code, order];
};

BlockMirrorTextToBlocks.prototype["ast_Starred"] = function (node, parent) {
  var value = node.value;
  var ctx = node.ctx;
  return BlockMirrorTextToBlocks.create_block(
    "ast_Starred",
    node.lineno,
    {},
    {
      VALUE: this.convert(value, node),
    },
    {
      inline: true,
    }
  );
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_IfExp",
  message0: "%1 if %2 else %3",
  args0: [
    {
      type: "input_value",
      name: "BODY",
    },
    {
      type: "input_value",
      name: "TEST",
    },
    {
      type: "input_value",
      name: "ORELSE",
    },
  ],
  inputsInline: true,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.LOGIC,
});

Blockly.Python["ast_IfExp"] = function (block) {
  var test =
    Blockly.Python.valueToCode(
      block,
      "TEST",
      Blockly.Python.ORDER_CONDITIONAL
    ) || Blockly.Python.blank;
  var body =
    Blockly.Python.valueToCode(
      block,
      "BODY",
      Blockly.Python.ORDER_CONDITIONAL
    ) || Blockly.Python.blank;
  var orelse =
    Blockly.Python.valueToCode(
      block,
      "ORELSE",
      Blockly.Python.ORDER_CONDITIONAL
    ) || Blockly.Python.blank;
  return [
    body + " if " + test + " else " + orelse + "\n",
    Blockly.Python.ORDER_CONDITIONAL,
  ];
};

BlockMirrorTextToBlocks.prototype["ast_IfExp"] = function (node, parent) {
  var test = node.test;
  var body = node.body;
  var orelse = node.orelse;
  return BlockMirrorTextToBlocks.create_block(
    "ast_IfExp",
    node.lineno,
    {},
    {
      TEST: this.convert(test, node),
      BODY: this.convert(body, node),
      ORELSE: this.convert(orelse, node),
    }
  );
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_AttributeFull",
  lastDummyAlign0: "RIGHT",
  message0: "%1 . %2",
  args0: [
    {
      type: "input_value",
      name: "VALUE",
    },
    {
      type: "field_input",
      name: "ATTR",
      text: "default",
    },
  ],
  inputsInline: true,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.OO,
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Attribute",
  message0: "%1 . %2",
  args0: [
    {
      type: "field_variable",
      name: "VALUE",
      variable: "variable",
    },
    {
      type: "field_input",
      name: "ATTR",
      text: "attribute",
    },
  ],
  inputsInline: true,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.OO,
});

Blockly.Python["ast_Attribute"] = function (block) {
  // Text value.
  var value = Blockly.Python.variableDB_.getName(
    block.getFieldValue("VALUE"),
    Blockly.Variables.NAME_TYPE
  );
  var attr = block.getFieldValue("ATTR");
  var code = value + "." + attr;
  return [code, Blockly.Python.ORDER_MEMBER];
};

Blockly.Python["ast_AttributeFull"] = function (block) {
  // Text value.
  var value =
    Blockly.Python.valueToCode(block, "VALUE", Blockly.Python.ORDER_NONE) ||
    Blockly.Python.blank;
  var attr = block.getFieldValue("ATTR");
  var code = value + "." + attr;
  return [code, Blockly.Python.ORDER_MEMBER];
};

BlockMirrorTextToBlocks.prototype["ast_Attribute"] = function (node, parent) {
  var value = node.value;
  var attr = node.attr; //if (value.constructor)

  if (value._astname == "Name") {
    return BlockMirrorTextToBlocks.create_block("ast_Attribute", node.lineno, {
      VALUE: Sk.ffi.remapToJs(value.id),
      ATTR: Sk.ffi.remapToJs(attr),
    });
  } else {
    return BlockMirrorTextToBlocks.create_block(
      "ast_AttributeFull",
      node.lineno,
      {
        ATTR: Sk.ffi.remapToJs(attr),
      },
      {
        VALUE: this.convert(value, node),
      }
    );
  }
}; // TODO: Support stuff like "append" where the message is after the value input
// TODO: Handle updating function/method definition -> update call
// TODO: Do a pretraversal to determine if a given function returns

Blockly.Blocks["ast_Call"] = {
  /**
   * Block for calling a procedure with no return value.
   * @this Blockly.Block
   */
  init: function init() {
    this.givenColour_ = BlockMirrorTextToBlocks.COLOR.FUNCTIONS;
    this.setInputsInline(true); // Regular ('NAME') or Keyword (either '**' or '*NAME')

    this.arguments_ = [];
    this.argumentVarModels_ = []; // acbart: Added count to keep track of unused parameters

    this.argumentCount_ = 0;
    this.quarkConnections_ = {};
    this.quarkIds_ = null; // acbart: Show parameter names, if they exist

    this.showParameterNames_ = false; // acbart: Whether this block returns

    this.returns_ = true; // acbart: added simpleName to handle complex function calls (e.g., chained)

    this.isMethod_ = false;
    this.name_ = null;
    this.message_ = "function";
    this.premessage_ = "";
    this.module_ = "";
    this.updateShape_();
  },

  /**
   * Returns the name of the procedure this block calls.
   * @return {string} Procedure name.
   * @this Blockly.Block
   */
  getProcedureCall: function getProcedureCall() {
    return this.name_;
  },

  /**
   * Notification that a procedure is renaming.
   * If the name matches this block's procedure, rename it.
   * Also rename if it was previously null.
   * @param {string} oldName Previous name of procedure.
   * @param {string} newName Renamed procedure.
   * @this Blockly.Block
   */
  renameProcedure: function renameProcedure(oldName, newName) {
    if (this.name_ === null || Blockly.Names.equals(oldName, this.name_)) {
      this.name_ = newName;
      this.updateShape_();
    }
  },

  /**
   * Notification that the procedure's parameters have changed.
   * @param {!Array.<string>} paramNames New param names, e.g. ['x', 'y', 'z'].
   * @param {!Array.<string>} paramIds IDs of params (consistent for each
   *     parameter through the life of a mutator, regardless of param renaming),
   *     e.g. ['piua', 'f8b_', 'oi.o'].
   * @private
   * @this Blockly.Block
   */
  setProcedureParameters_: function setProcedureParameters_(
    paramNames,
    paramIds
  ) {
    // Data structures:
    // this.arguments = ['x', 'y']
    //     Existing param names.
    // this.quarkConnections_ {piua: null, f8b_: Blockly.Connection}
    //     Look-up of paramIds to connections plugged into the call block.
    // this.quarkIds_ = ['piua', 'f8b_']
    //     Existing param IDs.
    // Note that quarkConnections_ may include IDs that no longer exist, but
    // which might reappear if a param is reattached in the mutator.
    var defBlock = Blockly.Procedures.getDefinition(
      this.getProcedureCall(),
      this.workspace
    );
    var mutatorOpen =
      defBlock && defBlock.mutator && defBlock.mutator.isVisible();

    if (!mutatorOpen) {
      this.quarkConnections_ = {};
      this.quarkIds_ = null;
    }

    if (!paramIds) {
      // Reset the quarks (a mutator is about to open).
      return false;
    } // Test arguments (arrays of strings) for changes. '\n' is not a valid
    // argument name character, so it is a valid delimiter here.

    if (paramNames.join("\n") == this.arguments_.join("\n")) {
      // No change.
      this.quarkIds_ = paramIds;
      return false;
    }

    if (paramIds.length !== paramNames.length) {
      throw RangeError("paramNames and paramIds must be the same length.");
    }

    this.setCollapsed(false);

    if (!this.quarkIds_) {
      // Initialize tracking for this block.
      this.quarkConnections_ = {};
      this.quarkIds_ = [];
    } // Switch off rendering while the block is rebuilt.

    var savedRendered = this.rendered;
    this.rendered = false; // Update the quarkConnections_ with existing connections.

    for (var i = 0; i < this.arguments_.length; i++) {
      var input = this.getInput("ARG" + i);

      if (input) {
        var connection = input.connection.targetConnection;
        this.quarkConnections_[this.quarkIds_[i]] = connection;

        if (
          mutatorOpen &&
          connection &&
          paramIds.indexOf(this.quarkIds_[i]) === -1
        ) {
          // This connection should no longer be attached to this block.
          connection.disconnect();
          connection.getSourceBlock().bumpNeighbours_();
        }
      }
    } // Rebuild the block's arguments.

    this.arguments_ = [].concat(paramNames);
    this.argumentCount_ = this.arguments_.length; // And rebuild the argument model list.

    this.argumentVarModels_ = [];
    /*
    // acbart: Function calls don't create variables, what do they know?
    for (let i = 0; i < this.arguments_.length; i++) {
        let argumentName = this.arguments_[i];
        var variable = Blockly.Variables.getVariable(
            this.workspace, null, this.arguments_[i], '');
        if (variable) {
            this.argumentVarModels_.push(variable);
        }
    }*/

    this.updateShape_();
    this.quarkIds_ = paramIds; // Reconnect any child blocks.

    if (this.quarkIds_) {
      for (var _i4 = 0; _i4 < this.arguments_.length; _i4++) {
        var quarkId = this.quarkIds_[_i4];

        if (quarkId in this.quarkConnections_) {
          var _connection = this.quarkConnections_[quarkId];

          if (!Blockly.Mutator.reconnect(_connection, this, "ARG" + _i4)) {
            // Block no longer exists or has been attached elsewhere.
            delete this.quarkConnections_[quarkId];
          }
        }
      }
    } // Restore rendering and show the changes.

    this.rendered = savedRendered;

    if (this.rendered) {
      this.render();
    }

    return true;
  },

  /**
   * Modify this block to have the correct number of arguments.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function updateShape_() {
    // If it's a method, add in the caller
    if (this.isMethod_ && !this.getInput("FUNC")) {
      var func = this.appendValueInput("FUNC"); // If there's a premessage, add it in

      if (this.premessage_ !== "") {
        func.appendField(this.premessage_);
      }
    } else if (!this.isMethod_ && this.getInput("FUNC")) {
      this.removeInput("FUNC");
    }

    var drawnArgumentCount = this.getDrawnArgumentCount_();
    var message = this.getInput("MESSAGE_AREA"); // Zero arguments, just do {message()}

    if (drawnArgumentCount === 0) {
      if (message) {
        message.removeField("MESSAGE");
      } else {
        message = this.appendDummyInput("MESSAGE_AREA").setAlign(
          Blockly.ALIGN_RIGHT
        );
      }

      message.appendField(
        new Blockly.FieldLabel(this.message_ + " ("),
        "MESSAGE"
      ); // One argument, no MESSAGE_AREA
    } else if (message) {
      this.removeInput("MESSAGE_AREA");
    } // Process arguments

    var i;

    for (i = 0; i < drawnArgumentCount; i++) {
      var argument = this.arguments_[i];
      var argumentName = this.parseArgument_(argument);

      if (i === 0) {
        argumentName = this.message_ + " (" + argumentName;
      }

      var field = this.getField("ARGNAME" + i);

      if (field) {
        // Ensure argument name is up to date.
        // The argument name field is deterministic based on the mutation,
        // no need to fire a change event.
        Blockly.Events.disable();

        try {
          field.setValue(argumentName);
        } finally {
          Blockly.Events.enable();
        }
      } else {
        // Add new input.
        field = new Blockly.FieldLabel(argumentName);
        this.appendValueInput("ARG" + i)
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField(field, "ARGNAME" + i)
          .init();
      }

      if (argumentName) {
        field.setVisible(true);
      } else {
        field.setVisible(false);
      }
    } // Closing parentheses

    if (!this.getInput("CLOSE_PAREN")) {
      this.appendDummyInput("CLOSE_PAREN")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(new Blockly.FieldLabel(")"));
    } // Move everything into place

    if (drawnArgumentCount === 0) {
      if (this.isMethod_) {
        this.moveInputBefore("FUNC", "MESSAGE_AREA");
      }

      this.moveInputBefore("MESSAGE_AREA", "CLOSE_PAREN");
    } else {
      if (this.isMethod_) {
        this.moveInputBefore("FUNC", "CLOSE_PAREN");
      }
    }

    for (var j = 0; j < i; j++) {
      this.moveInputBefore("ARG" + j, "CLOSE_PAREN");
    } // Set return state

    this.setReturn_(this.returns_, false); // Remove deleted inputs.

    while (this.getInput("ARG" + i)) {
      this.removeInput("ARG" + i);
      i++;
    }

    this.setColour(this.givenColour_);
  },

  /**
   * Create XML to represent the (non-editable) name and arguments.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    var name = this.getProcedureCall();
    container.setAttribute("name", name === null ? "*" : name);
    container.setAttribute("arguments", this.argumentCount_);
    container.setAttribute("returns", this.returns_);
    container.setAttribute("parameters", this.showParameterNames_);
    container.setAttribute("method", this.isMethod_);
    container.setAttribute("message", this.message_);
    container.setAttribute("premessage", this.premessage_);
    container.setAttribute("module", this.module_);
    container.setAttribute("colour", this.givenColour_);

    for (var i = 0; i < this.arguments_.length; i++) {
      var parameter = document.createElement("arg");
      parameter.setAttribute("name", this.arguments_[i]);
      container.appendChild(parameter);
    }

    return container;
  },

  /**
   * Parse XML to restore the (non-editable) name and parameters.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.name_ = xmlElement.getAttribute("name");
    this.name_ = this.name_ === "*" ? null : this.name_;
    this.argumentCount_ = parseInt(xmlElement.getAttribute("arguments"), 10);
    this.showParameterNames_ = "true" === xmlElement.getAttribute("parameters");
    this.returns_ = "true" === xmlElement.getAttribute("returns");
    this.isMethod_ = "true" === xmlElement.getAttribute("method");
    this.message_ = xmlElement.getAttribute("message");
    this.premessage_ = xmlElement.getAttribute("premessage");
    this.module_ = xmlElement.getAttribute("module");
    this.givenColour_ = parseInt(xmlElement.getAttribute("colour"), 10);
    var args = [];
    var paramIds = [];

    for (var i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
      if (childNode.nodeName.toLowerCase() === "arg") {
        args.push(childNode.getAttribute("name"));
        paramIds.push(childNode.getAttribute("paramId"));
      }
    }

    var result = this.setProcedureParameters_(args, paramIds);

    if (!result) {
      this.updateShape_();
    }

    if (this.name_ !== null) {
      this.renameProcedure(this.getProcedureCall(), this.name_);
    }
  },

  /**
   * Return all variables referenced by this block.
   * @return {!Array.<!Blockly.VariableModel>} List of variable models.
   * @this Blockly.Block
   */
  getVarModels: function getVarModels() {
    return this.argumentVarModels_;
  },

  /**
   * Add menu option to find the definition block for this call.
   * @param {!Array} options List of menu options to add to.
   * @this Blockly.Block
   */
  customContextMenu: function customContextMenu(options) {
    if (!this.workspace.isMovable()) {
      // If we center on the block and the workspace isn't movable we could
      // loose blocks at the edges of the workspace.
      return;
    }

    var workspace = this.workspace;
    var block = this; // Highlight Definition

    var option = {
      enabled: true,
    };
    option.text = Blockly.Msg["PROCEDURES_HIGHLIGHT_DEF"];
    var name = this.getProcedureCall();

    option.callback = function () {
      var def = Blockly.Procedures.getDefinition(name, workspace);

      if (def) {
        workspace.centerOnBlock(def.id);
        def.select();
      }
    };

    options.push(option); // Show Parameter Names

    options.push({
      enabled: true,
      text: "Show/Hide parameters",
      callback: function callback() {
        block.showParameterNames_ = !block.showParameterNames_;
        block.updateShape_();
        block.render();
      },
    }); // Change Return Type

    options.push({
      enabled: true,
      text: this.returns_ ? "Make statement" : "Make expression",
      callback: function callback() {
        block.returns_ = !block.returns_;
        block.setReturn_(block.returns_, true);
      },
    });
  },

  /**
   * Notification that the procedure's return state has changed.
   * @param {boolean} returnState New return state
   * @param forceRerender Whether to render
   * @this Blockly.Block
   */
  setReturn_: function setReturn_(returnState, forceRerender) {
    this.unplug(true);

    if (returnState) {
      this.setPreviousStatement(false);
      this.setNextStatement(false);
      this.setOutput(true);
    } else {
      this.setOutput(false);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }

    if (forceRerender) {
      if (this.rendered) {
        this.render();
      }
    }
  },
  //defType_: 'procedures_defnoreturn',
  parseArgument_: function parseArgument_(argument) {
    if (argument.startsWith("KWARGS:")) {
      // KWARG
      return "unpack";
    } else if (argument.startsWith("KEYWORD:")) {
      return argument.substring(8) + "=";
    } else {
      if (this.showParameterNames_) {
        if (argument.startsWith("KNOWN_ARG:")) {
          return argument.substring(10) + "=";
        }
      }
    }

    return "";
  },
  getDrawnArgumentCount_: function getDrawnArgumentCount_() {
    return Math.min(this.argumentCount_, this.arguments_.length);
  },
};

Blockly.Python["ast_Call"] = function (block) {
  // TODO: Handle import
  if (block.module_) {
    Blockly.Python.definitions_["import_" + block.module_] =
      BlockMirrorTextToBlocks.prototype.MODULE_FUNCTION_IMPORTS[block.module_];
  } // Blockly.Python.definitions_['import_matplotlib'] = 'import matplotlib.pyplot as plt';
  // Get the caller

  var funcName = "";

  if (block.isMethod_) {
    funcName =
      Blockly.Python.valueToCode(
        block,
        "FUNC",
        Blockly.Python.ORDER_FUNCTION_CALL
      ) || Blockly.Python.blank;
  }

  funcName += this.name_; // Build the arguments

  var args = [];

  for (var i = 0; i < block.arguments_.length; i++) {
    var value =
      Blockly.Python.valueToCode(block, "ARG" + i, Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank;
    var argument = block.arguments_[i];

    if (argument.startsWith("KWARGS:")) {
      args[i] = "**" + value;
    } else if (argument.startsWith("KEYWORD:")) {
      args[i] = argument.substring(8) + "=" + value;
    } else {
      args[i] = value;
    }
  } // Return the result

  var code = funcName + "(" + args.join(", ") + ")";

  if (block.returns_) {
    return [code, Blockly.Python.ORDER_FUNCTION_CALL];
  } else {
    return code + "\n";
  }
};

BlockMirrorTextToBlocks.prototype.getAsModule = function (node) {
  if (node._astname === "Name") {
    return Sk.ffi.remapToJs(node.id);
  } else if (node._astname === "Attribute") {
    var origin = this.getAsModule(node.value);

    if (origin !== null) {
      return origin + "." + Sk.ffi.remapToJs(node.attr);
    }
  } else {
    return null;
  }
}; //                              messageBefore, message, name
// function call: print() -> "print" ([message]) ; print
// Module function: plt.show() -> "show plot" ([plot]) ; plt.show
// Method call: "test".title() -> "make" [str] "title case" () ; .title ; isMethod = true

Blockly.Blocks["ast_Raise"] = {
  init: function init() {
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.EXCEPTIONS);
    this.exc_ = true;
    this.cause_ = false;
    this.appendDummyInput().appendField("raise");
    this.updateShape_();
  },
  updateShape_: function updateShape_() {
    if (this.exc_ && !this.getInput("EXC")) {
      this.appendValueInput("EXC").setCheck(null);
    } else if (!this.exc_ && this.getInput("EXC")) {
      this.removeInput("EXC");
    }

    if (this.cause_ && !this.getInput("CAUSE")) {
      this.appendValueInput("CAUSE").setCheck(null).appendField("from");
    } else if (!this.cause_ && this.getInput("CAUSE")) {
      this.removeInput("CAUSE");
    }

    if (this.cause_ && this.exc_) {
      this.moveInputBefore("EXC", "CAUSE");
    }
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("exc", this.exc_);
    container.setAttribute("cause", this.cause_);
    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.exc_ = "true" === xmlElement.getAttribute("exc");
    this.cause_ = "true" === xmlElement.getAttribute("cause");
    this.updateShape_();
  },
};

Blockly.Python["ast_Raise"] = function (block) {
  if (this.exc_) {
    var exc =
      Blockly.Python.valueToCode(block, "EXC", Blockly.Python.ORDER_NONE) ||
      Blockly.Python.blank;

    if (this.cause_) {
      var cause =
        Blockly.Python.valueToCode(block, "CAUSE", Blockly.Python.ORDER_NONE) ||
        Blockly.Python.blank;
      return "raise " + exc + " from " + cause + "\n";
    } else {
      return "raise " + exc + "\n";
    }
  } else {
    return "raise" + "\n";
  }
};

BlockMirrorTextToBlocks.prototype["ast_Raise"] = function (node, parent) {
  var exc = node.exc;
  var cause = node.cause;
  var values = {};
  var hasExc = false,
    hasCause = false;

  if (exc !== null) {
    values["EXC"] = this.convert(exc, node);
    hasExc = true;
  }

  if (cause !== null) {
    values["CAUSE"] = this.convert(cause, node);
    hasCause = true;
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_Raise",
    node.lineno,
    {},
    values,
    {},
    {
      "@exc": hasExc,
      "@cause": hasCause,
    }
  );
};

Blockly.Blocks["ast_Delete"] = {
  init: function init() {
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
    this.targetCount_ = 1;
    this.appendDummyInput().appendField("delete");
    this.updateShape_();
  },
  updateShape_: function updateShape_() {
    // Add new inputs.
    for (var i = 0; i < this.targetCount_; i++) {
      if (!this.getInput("TARGET" + i)) {
        var input = this.appendValueInput("TARGET" + i);

        if (i !== 0) {
          input.appendField(",").setAlign(Blockly.ALIGN_RIGHT);
        }
      }
    } // Remove deleted inputs.

    while (this.getInput("TARGET" + i)) {
      this.removeInput("TARGET" + i);
      i++;
    }
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("targets", this.targetCount_);
    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.targetCount_ = parseInt(xmlElement.getAttribute("targets"), 10);
    this.updateShape_();
  },
};

Blockly.Python["ast_Delete"] = function (block) {
  // Create a list with any number of elements of any type.
  var elements = new Array(block.targetCount_);

  for (var i = 0; i < block.targetCount_; i++) {
    elements[i] =
      Blockly.Python.valueToCode(
        block,
        "TARGET" + i,
        Blockly.Python.ORDER_NONE
      ) || Blockly.Python.blank;
  }

  var code = "del " + elements.join(", ") + "\n";
  return code;
};

BlockMirrorTextToBlocks.prototype["ast_Delete"] = function (node, parent) {
  var targets = node.targets;
  return BlockMirrorTextToBlocks.create_block(
    "ast_Delete",
    node.lineno,
    {},
    this.convertElements("TARGET", targets, node),
    {
      inline: "true",
    },
    {
      "@targets": targets.length,
    }
  );
};

Blockly.Blocks["ast_Subscript"] = {
  init: function init() {
    this.setInputsInline(true);
    this.setOutput(true);
    this.setColour(BlockMirrorTextToBlocks.COLOR.SEQUENCES);
    this.sliceKinds_ = ["I"];
    this.appendValueInput("VALUE").setCheck(null);
    this.appendDummyInput("OPEN_BRACKET").appendField("[");
    this.appendDummyInput("CLOSE_BRACKET").appendField("]");
    this.updateShape_();
  },
  setExistence: function setExistence(label, exist, isDummy) {
    if (exist && !this.getInput(label)) {
      if (isDummy) {
        return this.appendDummyInput(label);
      } else {
        return this.appendValueInput(label);
      }
    } else if (!exist && this.getInput(label)) {
      this.removeInput(label);
    }

    return null;
  },
  createSlice_: function createSlice_(i, kind) {
    // ,
    var input = this.setExistence("COMMA" + i, i !== 0, true);

    if (input) {
      input.appendField(",");
    } // Single index

    var isIndex = kind.charAt(0) === "I";
    input = this.setExistence("INDEX" + i, isIndex, false); // First index

    input = this.setExistence(
      "SLICELOWER" + i,
      !isIndex && "1" === kind.charAt(1),
      false
    ); // First colon

    input = this.setExistence("SLICECOLON" + i, !isIndex, true);

    if (input) {
      input.appendField(":").setAlign(Blockly.ALIGN_RIGHT);
    } // Second index

    input = this.setExistence(
      "SLICEUPPER" + i,
      !isIndex && "1" === kind.charAt(2),
      false
    ); // Second colon and third index

    input = this.setExistence(
      "SLICESTEP" + i,
      !isIndex && "1" === kind.charAt(3),
      false
    );

    if (input) {
      input.appendField(":").setAlign(Blockly.ALIGN_RIGHT);
    }
  },
  updateShape_: function updateShape_() {
    // Add new inputs.
    for (var i = 0; i < this.sliceKinds_.length; i++) {
      this.createSlice_(i, this.sliceKinds_[i]);
    }

    for (var j = 0; j < i; j++) {
      if (j !== 0) {
        this.moveInputBefore("COMMA" + j, "CLOSE_BRACKET");
      }

      var kind = this.sliceKinds_[j];

      if (kind.charAt(0) === "I") {
        this.moveInputBefore("INDEX" + j, "CLOSE_BRACKET");
      } else {
        if (kind.charAt(1) === "1") {
          this.moveInputBefore("SLICELOWER" + j, "CLOSE_BRACKET");
        }

        this.moveInputBefore("SLICECOLON" + j, "CLOSE_BRACKET");

        if (kind.charAt(2) === "1") {
          this.moveInputBefore("SLICEUPPER" + j, "CLOSE_BRACKET");
        }

        if (kind.charAt(3) === "1") {
          this.moveInputBefore("SLICESTEP" + j, "CLOSE_BRACKET");
        }
      }
    } // Remove deleted inputs.

    while (this.getInput("TARGET" + i) || this.getInput("SLICECOLON")) {
      this.removeInput("COMMA" + i, true);

      if (this.getInput("INDEX" + i)) {
        this.removeInput("INDEX" + i);
      } else {
        this.removeInput("SLICELOWER" + i, true);
        this.removeInput("SLICECOLON" + i, true);
        this.removeInput("SLICEUPPER" + i, true);
        this.removeInput("SLICESTEP" + i, true);
      }

      i++;
    }
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");

    for (var i = 0; i < this.sliceKinds_.length; i++) {
      var parameter = document.createElement("arg");
      parameter.setAttribute("name", this.sliceKinds_[i]);
      container.appendChild(parameter);
    }

    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.sliceKinds_ = [];

    for (var i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
      if (childNode.nodeName.toLowerCase() === "arg") {
        this.sliceKinds_.push(childNode.getAttribute("name"));
      }
    }

    this.updateShape_();
  },
};

Blockly.Python["ast_Subscript"] = function (block) {
  // Create a list with any number of elements of any type.
  var value =
    Blockly.Python.valueToCode(block, "VALUE", Blockly.Python.ORDER_MEMBER) ||
    Blockly.Python.blank;
  var slices = new Array(block.sliceKinds_.length);

  for (var i = 0; i < block.sliceKinds_.length; i++) {
    var kind = block.sliceKinds_[i];

    if (kind.charAt(0) === "I") {
      slices[i] =
        Blockly.Python.valueToCode(
          block,
          "INDEX" + i,
          Blockly.Python.ORDER_MEMBER
        ) || Blockly.Python.blank;
    } else {
      slices[i] = "";

      if (kind.charAt(1) === "1") {
        slices[i] +=
          Blockly.Python.valueToCode(
            block,
            "SLICELOWER" + i,
            Blockly.Python.ORDER_MEMBER
          ) || Blockly.Python.blank;
      }

      slices[i] += ":";

      if (kind.charAt(2) === "1") {
        slices[i] +=
          Blockly.Python.valueToCode(
            block,
            "SLICEUPPER" + i,
            Blockly.Python.ORDER_MEMBER
          ) || Blockly.Python.blank;
      }

      if (kind.charAt(3) === "1") {
        slices[i] +=
          ":" +
            Blockly.Python.valueToCode(
              block,
              "SLICESTEP" + i,
              Blockly.Python.ORDER_MEMBER
            ) || Blockly.Python.blank;
      }
    }
  }

  var code = value + "[" + slices.join(", ") + "]";
  return [code, Blockly.Python.ORDER_MEMBER];
};

var isWeirdSliceCase = function isWeirdSliceCase(slice) {
  return (
    slice.lower == null &&
    slice.upper == null &&
    slice.step !== null &&
    slice.step._astname === "NameConstant" &&
    slice.step.value === Sk.builtin.none.none$
  );
};

BlockMirrorTextToBlocks.prototype.addSliceDim = function (
  slice,
  i,
  values,
  mutations,
  node
) {
  var sliceKind = slice._astname;

  if (sliceKind === "Index") {
    values["INDEX" + i] = this.convert(slice.value, node);
    mutations.push("I");
  } else if (sliceKind === "Slice") {
    var L = "0",
      U = "0",
      S = "0";

    if (slice.lower !== null) {
      values["SLICELOWER" + i] = this.convert(slice.lower, node);
      L = "1";
    }

    if (slice.upper !== null) {
      values["SLICEUPPER" + i] = this.convert(slice.upper, node);
      U = "1";
    }

    if (slice.step !== null && !isWeirdSliceCase(slice)) {
      values["SLICESTEP" + i] = this.convert(slice.step, node);
      S = "1";
    }

    mutations.push("S" + L + U + S);
  }
};

BlockMirrorTextToBlocks.prototype["ast_Subscript"] = function (node, parent) {
  var value = node.value;
  var slice = node.slice;
  var ctx = node.ctx;
  var values = {
    VALUE: this.convert(value, node),
  };
  var mutations = [];
  var sliceKind = slice._astname;

  if (sliceKind === "ExtSlice") {
    for (var i = 0; i < slice.dims.length; i += 1) {
      var dim = slice.dims[i];
      this.addSliceDim(dim, i, values, mutations, node);
    }
  } else {
    this.addSliceDim(slice, 0, values, mutations, node);
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_Subscript",
    node.lineno,
    {},
    values,
    {
      inline: "true",
    },
    {
      arg: mutations,
    }
  );
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_comprehensionFor",
  message0: "for %1 in %2",
  args0: [
    {
      type: "input_value",
      name: "TARGET",
    },
    {
      type: "input_value",
      name: "ITER",
    },
  ],
  inputsInline: true,
  output: "ComprehensionFor",
  colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES,
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_comprehensionIf",
  message0: "if %1",
  args0: [
    {
      type: "input_value",
      name: "TEST",
    },
  ],
  inputsInline: true,
  output: "ComprehensionIf",
  colour: BlockMirrorTextToBlocks.COLOR.SEQUENCES,
});
Blockly.Blocks["ast_Comp_create_with_container"] = {
  /**
   * Mutator block for dict container.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SEQUENCES);
    this.appendDummyInput().appendField("Add new comprehensions below");
    this.appendDummyInput().appendField("   For clause");
    this.appendStatementInput("STACK");
    this.contextMenu = false;
  },
};
Blockly.Blocks["ast_Comp_create_with_for"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SEQUENCES);
    this.appendDummyInput().appendField("For clause");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};
Blockly.Blocks["ast_Comp_create_with_if"] = {
  /**
   * Mutator block for adding items.
   * @this Blockly.Block
   */
  init: function init() {
    this.setColour(BlockMirrorTextToBlocks.COLOR.SEQUENCES);
    this.appendDummyInput().appendField("If clause");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.contextMenu = false;
  },
};
BlockMirrorTextToBlocks.COMP_SETTINGS = {
  ListComp: {
    start: "[",
    end: "]",
    color: BlockMirrorTextToBlocks.COLOR.LIST,
  },
  SetComp: {
    start: "{",
    end: "}",
    color: BlockMirrorTextToBlocks.COLOR.SET,
  },
  GeneratorExp: {
    start: "(",
    end: ")",
    color: BlockMirrorTextToBlocks.COLOR.SEQUENCES,
  },
  DictComp: {
    start: "{",
    end: "}",
    color: BlockMirrorTextToBlocks.COLOR.DICTIONARY,
  },
};
["ListComp", "SetComp", "GeneratorExp", "DictComp"].forEach(function (kind) {
  Blockly.Blocks["ast_" + kind] = {
    /**
     * Block for creating a dict with any number of elements of any type.
     * @this Blockly.Block
     */
    init: function init() {
      this.setStyle("loop_blocks");
      this.setColour(BlockMirrorTextToBlocks.COMP_SETTINGS[kind].color);
      this.itemCount_ = 3;
      var input = this.appendValueInput("ELT").appendField(
        BlockMirrorTextToBlocks.COMP_SETTINGS[kind].start
      );

      if (kind === "DictComp") {
        input.setCheck("DictPair");
      }

      this.appendDummyInput("END_BRACKET").appendField(
        BlockMirrorTextToBlocks.COMP_SETTINGS[kind].end
      );
      this.updateShape_();
      this.setOutput(true);
      this.setMutator(
        new Blockly.Mutator([
          "ast_Comp_create_with_for",
          "ast_Comp_create_with_if",
        ])
      );
    },

    /**
     * Create XML to represent dict inputs.
     * @return {!Element} XML storage element.
     * @this Blockly.Block
     */
    mutationToDom: function mutationToDom() {
      var container = document.createElement("mutation");
      container.setAttribute("items", this.itemCount_);
      return container;
    },

    /**
     * Parse XML to restore the dict inputs.
     * @param {!Element} xmlElement XML storage element.
     * @this Blockly.Block
     */
    domToMutation: function domToMutation(xmlElement) {
      this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
      this.updateShape_();
    },

    /**
     * Populate the mutator's dialog with this block's components.
     * @param {!Blockly.Workspace} workspace Mutator's workspace.
     * @return {!Blockly.Block} Root block in mutator.
     * @this Blockly.Block
     */
    decompose: function decompose(workspace) {
      var containerBlock = workspace.newBlock("ast_Comp_create_with_container");
      containerBlock.initSvg();
      var connection = containerBlock.getInput("STACK").connection;
      var generators = [];

      for (var i = 1; i < this.itemCount_; i++) {
        var generator = this.getInput("GENERATOR" + i).connection;
        var createName = void 0;

        if (
          generator.targetConnection.getSourceBlock().type ===
          "ast_comprehensionIf"
        ) {
          createName = "ast_Comp_create_with_if";
        } else if (
          generator.targetConnection.getSourceBlock().type ===
          "ast_comprehensionFor"
        ) {
          createName = "ast_Comp_create_with_for";
        } else {
          throw Error(
            "Unknown block type: " +
              generator.targetConnection.getSourceBlock().type
          );
        }

        var itemBlock = workspace.newBlock(createName);
        itemBlock.initSvg();
        connection.connect(itemBlock.previousConnection);
        connection = itemBlock.nextConnection;
        generators.push(itemBlock);
      }

      return containerBlock;
    },

    /**
     * Reconfigure this block based on the mutator dialog's components.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    compose: function compose(containerBlock) {
      var itemBlock = containerBlock.getInputTargetBlock("STACK"); // Count number of inputs.

      var connections = [containerBlock.valueConnection_];
      var blockTypes = ["ast_Comp_create_with_for"];

      while (itemBlock) {
        connections.push(itemBlock.valueConnection_);
        blockTypes.push(itemBlock.type);
        itemBlock =
          itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      } // Disconnect any children that don't belong.

      for (var i = 1; i < this.itemCount_; i++) {
        var connection = this.getInput("GENERATOR" + i).connection
          .targetConnection;

        if (connection && connections.indexOf(connection) === -1) {
          var connectedBlock = connection.getSourceBlock();

          if (connectedBlock.type === "ast_comprehensionIf") {
            var testField = connectedBlock.getInput("TEST");

            if (testField.connection.targetConnection) {
              testField.connection.targetConnection
                .getSourceBlock()
                .unplug(true);
            }
          } else if (connectedBlock.type === "ast_comprehensionFor") {
            var iterField = connectedBlock.getInput("ITER");

            if (iterField.connection.targetConnection) {
              iterField.connection.targetConnection
                .getSourceBlock()
                .unplug(true);
            }

            var targetField = connectedBlock.getInput("TARGET");

            if (targetField.connection.targetConnection) {
              targetField.connection.targetConnection
                .getSourceBlock()
                .unplug(true);
            }
          } else {
            throw Error("Unknown block type: " + connectedBlock.type);
          }

          connection.disconnect();
          connection.getSourceBlock().dispose();
        }
      }

      this.itemCount_ = connections.length;
      this.updateShape_(); // Reconnect any child blocks.

      for (var i = 1; i < this.itemCount_; i++) {
        Blockly.Mutator.reconnect(connections[i], this, "GENERATOR" + i); // TODO: glitch when inserting into middle, deletes children values

        if (!connections[i]) {
          var createName = void 0;

          if (blockTypes[i] === "ast_Comp_create_with_if") {
            createName = "ast_comprehensionIf";
          } else if (blockTypes[i] === "ast_Comp_create_with_for") {
            createName = "ast_comprehensionFor";
          } else {
            throw Error("Unknown block type: " + blockTypes[i]);
          }

          var _itemBlock2 = this.workspace.newBlock(createName);

          _itemBlock2.setDeletable(false);

          _itemBlock2.setMovable(false);

          _itemBlock2.initSvg();

          this.getInput("GENERATOR" + i).connection.connect(
            _itemBlock2.outputConnection
          );

          _itemBlock2.render(); //this.get(itemBlock, 'ADD'+i)
        }
      }
    },

    /**
     * Store pointers to any connected child blocks.
     * @param {!Blockly.Block} containerBlock Root block in mutator.
     * @this Blockly.Block
     */
    saveConnections: function saveConnections(containerBlock) {
      containerBlock.valueConnection_ = this.getInput(
        "GENERATOR0"
      ).connection.targetConnection;
      var itemBlock = containerBlock.getInputTargetBlock("STACK");
      var i = 1;

      while (itemBlock) {
        var input = this.getInput("GENERATOR" + i);
        itemBlock.valueConnection_ = input && input.connection.targetConnection;
        i++;
        itemBlock =
          itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
      }
    },

    /**
     * Modify this block to have the correct number of inputs.
     * @private
     * @this Blockly.Block
     */
    updateShape_: function updateShape_() {
      // Add new inputs.
      for (var i = 0; i < this.itemCount_; i++) {
        if (!this.getInput("GENERATOR" + i)) {
          var input = this.appendValueInput("GENERATOR" + i);

          if (i === 0) {
            input.setCheck("ComprehensionFor");
          } else {
            input.setCheck(["ComprehensionFor", "ComprehensionIf"]);
          }

          this.moveInputBefore("GENERATOR" + i, "END_BRACKET");
        }
      } // Remove deleted inputs.

      while (this.getInput("GENERATOR" + i)) {
        this.removeInput("GENERATOR" + i);
        i++;
      }
    },
  };

  Blockly.Python["ast_" + kind] = function (block) {
    // elt
    var elt;

    if (kind === "DictComp") {
      var child = block.getInputTargetBlock("ELT");

      if (child === null || child.type !== "ast_DictItem") {
        elt = Blockly.Python.blank + ": " + Blockly.Python.blank;
      } else {
        var key =
          Blockly.Python.valueToCode(child, "KEY", Blockly.Python.ORDER_NONE) ||
          Blockly.Python.blank;
        var value =
          Blockly.Python.valueToCode(
            child,
            "VALUE",
            Blockly.Python.ORDER_NONE
          ) || Blockly.Python.blank;
        elt = key + ": " + value;
      }
    } else {
      elt =
        Blockly.Python.valueToCode(block, "ELT", Blockly.Python.ORDER_NONE) ||
        Blockly.Python.blank;
    } // generators

    var elements = new Array(block.itemCount_);
    var BAD_DEFAULT =
      elt + " for " + Blockly.Python.blank + " in" + Blockly.Python.blank;

    for (var i = 0; i < block.itemCount_; i++) {
      var _child = block.getInputTargetBlock("GENERATOR" + i);

      if (_child === null) {
        elements[i] = BAD_DEFAULT;
      } else if (_child.type === "ast_comprehensionIf") {
        var test =
          Blockly.Python.valueToCode(
            _child,
            "TEST",
            Blockly.Python.ORDER_NONE
          ) || Blockly.Python.blank;
        elements[i] = "if " + test;
      } else if (_child.type === "ast_comprehensionFor") {
        var target =
          Blockly.Python.valueToCode(
            _child,
            "TARGET",
            Blockly.Python.ORDER_NONE
          ) || Blockly.Python.blank;
        var iter =
          Blockly.Python.valueToCode(
            _child,
            "ITER",
            Blockly.Python.ORDER_NONE
          ) || Blockly.Python.blank;
        elements[i] = "for " + target + " in " + iter;
      } else {
        elements[i] = BAD_DEFAULT;
      }
    } // Put it all together

    var code =
      BlockMirrorTextToBlocks.COMP_SETTINGS[kind].start +
      elt +
      " " +
      elements.join(" ") +
      BlockMirrorTextToBlocks.COMP_SETTINGS[kind].end;
    return [code, Blockly.Python.ORDER_ATOMIC];
  };

  BlockMirrorTextToBlocks.prototype["ast_" + kind] = function (node, parent) {
    var generators = node.generators;
    var elements = {};

    if (kind === "DictComp") {
      var key = node.key;
      var value = node.value;
      elements["ELT"] = BlockMirrorTextToBlocks.create_block(
        "ast_DictItem",
        node.lineno,
        {},
        {
          KEY: this.convert(key, node),
          VALUE: this.convert(value, node),
        },
        {
          inline: "true",
          deletable: "false",
          movable: "false",
        }
      );
    } else {
      var elt = node.elt;
      elements["ELT"] = this.convert(elt, node);
    }

    var DEFAULT_SETTINGS = {
      inline: "true",
      deletable: "false",
      movable: "false",
    };
    var g = 0;

    for (var i = 0; i < generators.length; i++) {
      var target = generators[i].target;
      var iter = generators[i].iter;
      var ifs = generators[i].ifs;
      var is_async = generators[i].is_async;
      elements["GENERATOR" + g] = BlockMirrorTextToBlocks.create_block(
        "ast_comprehensionFor",
        node.lineno,
        {},
        {
          ITER: this.convert(iter, node),
          TARGET: this.convert(target, node),
        },
        DEFAULT_SETTINGS
      );
      g += 1;

      if (ifs) {
        for (var j = 0; j < ifs.length; j++) {
          elements["GENERATOR" + g] = BlockMirrorTextToBlocks.create_block(
            "ast_comprehensionIf",
            node.lineno,
            {},
            {
              TEST: this.convert(ifs[j], node),
            },
            DEFAULT_SETTINGS
          );
          g += 1;
        }
      }
    }

    return BlockMirrorTextToBlocks.create_block(
      "ast_" + kind,
      node.lineno,
      {},
      elements,
      {
        inline: "false",
      },
      {
        "@items": g,
      }
    );
  };
}); // TODO: what if a user deletes a parameter through the context menu?
// The mutator container

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_FunctionHeaderMutator",
  message0: "Setup parameters below: %1 %2 returns %3",
  args0: [
    {
      type: "input_dummy",
    },
    {
      type: "input_statement",
      name: "STACK",
      align: "RIGHT",
    },
    {
      type: "field_checkbox",
      name: "RETURNS",
      checked: true,
      align: "RIGHT",
    },
  ],
  colour: BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
  enableContextMenu: false,
}); // The elements you can put into the mutator

[
  ["Parameter", "Parameter", "", false, false],
  ["ParameterType", "Parameter with type", "", true, false],
  ["ParameterDefault", "Parameter with default value", "", false, true],
  [
    "ParameterDefaultType",
    "Parameter with type and default value",
    "",
    true,
    true,
  ],
  ["ParameterVararg", "Variable length parameter", "*", false, false],
  [
    "ParameterVarargType",
    "Variable length parameter with type",
    "*",
    true,
    false,
  ],
  ["ParameterKwarg", "Keyworded Variable length parameter", "**", false],
  [
    "ParameterKwargType",
    "Keyworded Variable length parameter with type",
    "**",
    true,
    false,
  ],
].forEach(function (parameterTypeTuple) {
  var parameterType = parameterTypeTuple[0],
    parameterDescription = parameterTypeTuple[1],
    parameterPrefix = parameterTypeTuple[2],
    parameterTyped = parameterTypeTuple[3],
    parameterDefault = parameterTypeTuple[4];
  BlockMirrorTextToBlocks.BLOCKS.push({
    type: "ast_FunctionMutant" + parameterType,
    message0: parameterDescription,
    previousStatement: null,
    nextStatement: null,
    colour: BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
    enableContextMenu: false,
  });
  var realParameterBlock = {
    type: "ast_Function" + parameterType,
    output: "Parameter",
    message0: parameterPrefix + (parameterPrefix ? " " : "") + "%1",
    args0: [
      {
        type: "field_variable",
        name: "NAME",
        variable: "param",
      },
    ],
    colour: BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
    enableContextMenu: false,
    inputsInline: parameterTyped && parameterDefault,
  };

  if (parameterTyped) {
    realParameterBlock["message0"] += " : %2";
    realParameterBlock["args0"].push({
      type: "input_value",
      name: "TYPE",
    });
  }

  if (parameterDefault) {
    realParameterBlock["message0"] += " = %" + (parameterTyped ? 3 : 2);
    realParameterBlock["args0"].push({
      type: "input_value",
      name: "DEFAULT",
    });
  }

  BlockMirrorTextToBlocks.BLOCKS.push(realParameterBlock);

  Blockly.Python["ast_Function" + parameterType] = function (block) {
    var name = Blockly.Python.variableDB_.getName(
      block.getFieldValue("NAME"),
      Blockly.Variables.NAME_TYPE
    );
    var typed = "";

    if (parameterTyped) {
      typed =
        ": " +
        (Blockly.Python.valueToCode(block, "TYPE", Blockly.Python.ORDER_NONE) ||
          Blockly.Python.blank);
    }

    var defaulted = "";

    if (parameterDefault) {
      defaulted =
        "=" +
        (Blockly.Python.valueToCode(
          block,
          "DEFAULT",
          Blockly.Python.ORDER_NONE
        ) || Blockly.Python.blank);
    }

    return [
      parameterPrefix + name + typed + defaulted,
      Blockly.Python.ORDER_ATOMIC,
    ];
  };
}); // TODO: Figure out an elegant "complexity" flag feature to allow different levels of Mutators

Blockly.Blocks["ast_FunctionDef"] = {
  init: function init() {
    this.appendDummyInput()
      .appendField("define")
      .appendField(new Blockly.FieldTextInput("function"), "NAME");
    this.decoratorsCount_ = 0;
    this.parametersCount_ = 0;
    this.hasReturn_ = false;
    this.mutatorComplexity_ = 0;
    this.appendStatementInput("BODY").setCheck(null);
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.FUNCTIONS);
    this.updateShape_();
    this.setMutator(
      new Blockly.Mutator([
        "ast_FunctionMutantParameter",
        "ast_FunctionMutantParameterType",
      ])
    );
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("decorators", this.decoratorsCount_);
    container.setAttribute("parameters", this.parametersCount_);
    container.setAttribute("returns", this.hasReturn_);
    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.decoratorsCount_ = parseInt(xmlElement.getAttribute("decorators"), 10);
    this.parametersCount_ = parseInt(xmlElement.getAttribute("parameters"), 10);
    this.hasReturn_ = "true" === xmlElement.getAttribute("returns");
    this.updateShape_();
  },
  setReturnAnnotation_: function setReturnAnnotation_(status) {
    var currentReturn = this.getInput("RETURNS");

    if (status) {
      if (!currentReturn) {
        this.appendValueInput("RETURNS")
          .setCheck(null)
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField("returns");
      }

      this.moveInputBefore("RETURNS", "BODY");
    } else if (!status && currentReturn) {
      this.removeInput("RETURNS");
    }

    this.hasReturn_ = status;
  },
  updateShape_: function updateShape_() {
    // Set up decorators and parameters
    var block = this;
    var position = 1;
    [
      ["DECORATOR", "decoratorsCount_", null, "decorated by"],
      ["PARAMETER", "parametersCount_", "Parameter", "parameters:"],
    ].forEach(function (childTypeTuple) {
      var childTypeName = childTypeTuple[0],
        countVariable = childTypeTuple[1],
        inputCheck = childTypeTuple[2],
        childTypeMessage = childTypeTuple[3];

      for (var i = 0; i < block[countVariable]; i++) {
        if (!block.getInput(childTypeName + i)) {
          var input = block
            .appendValueInput(childTypeName + i)
            .setCheck(inputCheck)
            .setAlign(Blockly.ALIGN_RIGHT);

          if (i === 0) {
            input.appendField(childTypeMessage);
          }
        }

        block.moveInputBefore(childTypeName + i, "BODY");
      } // Remove deleted inputs.

      while (block.getInput(childTypeName + i)) {
        block.removeInput(childTypeName + i);
        i++;
      }
    }); // Set up optional Returns annotation

    this.setReturnAnnotation_(this.hasReturn_);
  },

  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function decompose(workspace) {
    var containerBlock = workspace.newBlock("ast_FunctionHeaderMutator");
    containerBlock.initSvg(); // Check/uncheck the allow statement box.

    if (this.getInput("RETURNS")) {
      containerBlock.setFieldValue(
        this.hasReturn_ ? "TRUE" : "FALSE",
        "RETURNS"
      );
    } else {
      // TODO: set up "canReturns" for lambda mode
      //containerBlock.getField('RETURNS').setVisible(false);
    } // Set up parameters

    var connection = containerBlock.getInput("STACK").connection;
    var parameters = [];

    for (var i = 0; i < this.parametersCount_; i++) {
      var parameter = this.getInput("PARAMETER" + i).connection;
      var sourceType = parameter.targetConnection.getSourceBlock().type;
      var createName =
        "ast_FunctionMutant" + sourceType.substring("ast_Function".length);
      var itemBlock = workspace.newBlock(createName);
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
      parameters.push(itemBlock);
    }

    return containerBlock;
  },

  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function compose(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK"); // Count number of inputs.

    var connections = [];
    var blockTypes = [];

    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      blockTypes.push(itemBlock.type);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    } // Disconnect any children that don't belong.

    for (var i = 0; i < this.parametersCount_; i++) {
      var connection = this.getInput("PARAMETER" + i).connection
        .targetConnection;

      if (connection && connections.indexOf(connection) === -1) {
        // Disconnect all children of this block
        var connectedBlock = connection.getSourceBlock();

        for (var j = 0; j < connectedBlock.inputList.length; j++) {
          var field = connectedBlock.inputList[j].connection;

          if (field && field.targetConnection) {
            field.targetConnection.getSourceBlock().unplug(true);
          }
        }

        connection.disconnect();
        connection.getSourceBlock().dispose();
      }
    }

    this.parametersCount_ = connections.length;
    this.updateShape_(); // Reconnect any child blocks.

    for (var _i6 = 0; _i6 < this.parametersCount_; _i6++) {
      Blockly.Mutator.reconnect(connections[_i6], this, "PARAMETER" + _i6);

      if (!connections[_i6]) {
        var createName =
          "ast_Function" +
          blockTypes[_i6].substring("ast_FunctionMutant".length);

        var _itemBlock3 = this.workspace.newBlock(createName);

        _itemBlock3.setDeletable(false);

        _itemBlock3.setMovable(false);

        _itemBlock3.initSvg();

        this.getInput("PARAMETER" + _i6).connection.connect(
          _itemBlock3.outputConnection
        );

        _itemBlock3.render(); //this.get(itemBlock, 'ADD'+i)
      }
    } // Show/hide the returns annotation

    var hasReturns = containerBlock.getFieldValue("RETURNS");

    if (hasReturns !== null) {
      hasReturns = hasReturns === "TRUE";

      if (this.hasReturn_ != hasReturns) {
        if (hasReturns) {
          this.setReturnAnnotation_(true);
          Blockly.Mutator.reconnect(this.returnConnection_, this, "RETURNS");
          this.returnConnection_ = null;
        } else {
          var returnConnection = this.getInput("RETURNS").connection;
          this.returnConnection_ = returnConnection.targetConnection;

          if (this.returnConnection_) {
            var returnBlock = returnConnection.targetBlock();
            returnBlock.unplug();
            returnBlock.bumpNeighbours_();
          }

          this.setReturnAnnotation_(false);
        }
      }
    }
  },

  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function saveConnections(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock("STACK");
    var i = 0;

    while (itemBlock) {
      var input = this.getInput("PARAMETER" + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },
};

Blockly.Python["ast_FunctionDef"] = function (block) {
  // Name
  var name = Blockly.Python.variableDB_.getName(
    block.getFieldValue("NAME"),
    Blockly.Variables.NAME_TYPE
  ); // Decorators

  var decorators = new Array(block.decoratorsCount_);

  for (var i = 0; i < block.decoratorsCount_; i++) {
    var decorator =
      Blockly.Python.valueToCode(
        block,
        "DECORATOR" + i,
        Blockly.Python.ORDER_NONE
      ) || Blockly.Python.blank;
    decorators[i] = "@" + decorator + "\n";
  } // Parameters

  var parameters = new Array(block.parametersCount_);

  for (var _i7 = 0; _i7 < block.parametersCount_; _i7++) {
    parameters[_i7] =
      Blockly.Python.valueToCode(
        block,
        "PARAMETER" + _i7,
        Blockly.Python.ORDER_NONE
      ) || Blockly.Python.blank;
  } // Return annotation

  var returns = "";

  if (this.hasReturn_) {
    returns =
      " -> " +
        Blockly.Python.valueToCode(
          block,
          "RETURNS",
          Blockly.Python.ORDER_NONE
        ) || Blockly.Python.blank;
  } // Body

  var body =
    Blockly.Python.statementToCode(block, "BODY") || Blockly.Python.PASS;
  return (
    decorators.join("") +
    "def " +
    name +
    "(" +
    parameters.join(", ") +
    ")" +
    returns +
    ":\n" +
    body
  );
};

BlockMirrorTextToBlocks.prototype.parseArg = function (
  arg,
  type,
  lineno,
  values,
  node
) {
  var settings = {
    movable: false,
    deletable: false,
  };

  if (arg.annotation === null) {
    return BlockMirrorTextToBlocks.create_block(
      type,
      lineno,
      {
        NAME: Sk.ffi.remapToJs(arg.arg),
      },
      values,
      settings
    );
  } else {
    values["TYPE"] = this.convert(arg.annotation, node);
    return BlockMirrorTextToBlocks.create_block(
      type + "Type",
      lineno,
      {
        NAME: Sk.ffi.remapToJs(arg.arg),
      },
      values,
      settings
    );
  }
};

BlockMirrorTextToBlocks.prototype.parseArgs = function (
  args,
  values,
  lineno,
  node
) {
  var positional = args.args,
    vararg = args.vararg,
    kwonlyargs = args.kwonlyargs,
    kwarg = args.kwarg,
    defaults = args.defaults,
    kw_defaults = args.kw_defaults;
  var totalArgs = 0; // args (positional)

  if (positional !== null) {
    // "If there are fewer defaults, they correspond to the last n arguments."
    var defaultOffset = defaults ? defaults.length - positional.length : 0;

    for (var i = 0; i < positional.length; i++) {
      var childValues = {};
      var type = "ast_FunctionParameter";

      if (defaults[defaultOffset + i]) {
        childValues["DEFAULT"] = this.convert(
          defaults[defaultOffset + i],
          node
        );
        type += "Default";
      }

      values["PARAMETER" + totalArgs] = this.parseArg(
        positional[i],
        type,
        lineno,
        childValues,
        node
      );
      totalArgs += 1;
    }
  } // *arg

  if (vararg !== null) {
    values["PARAMETER" + totalArgs] = this.parseArg(
      vararg,
      "ast_FunctionParameterVararg",
      lineno,
      {},
      node
    );
    totalArgs += 1;
  } // keyword arguments that must be referenced by name

  if (kwonlyargs !== null) {
    for (var _i8 = 0; _i8 < kwonlyargs.length; _i8++) {
      var _childValues = {};
      var _type = "ast_FunctionParameter";

      if (kw_defaults[_i8]) {
        _childValues["DEFAULT"] = this.convert(kw_defaults[_i8], node);
        _type += "Default";
      }

      values["PARAMETER" + totalArgs] = this.parseArg(
        kwonlyargs[_i8],
        _type,
        lineno,
        _childValues,
        node
      );
      totalArgs += 1;
    }
  } // **kwarg

  if (kwarg) {
    values["PARAMETER" + totalArgs] = this.parseArg(
      kwarg,
      "ast_FunctionParameterKwarg",
      lineno,
      {},
      node
    );
    totalArgs += 1;
  }

  return totalArgs;
};

BlockMirrorTextToBlocks.prototype["ast_FunctionDef"] = function (node, parent) {
  var name = node.name;
  var args = node.args;
  var body = node.body;
  var decorator_list = node.decorator_list;
  var returns = node.returns;
  var values = {};

  if (decorator_list !== null) {
    for (var i = 0; i < decorator_list.length; i++) {
      values["DECORATOR" + i] = this.convert(decorator_list[i], node);
    }
  }

  var parsedArgs = 0;

  if (args !== null) {
    parsedArgs = this.parseArgs(args, values, node.lineno, node);
  }

  var hasReturn =
    returns !== null &&
    (returns._astname !== "NameConstant" ||
      returns.value !== Sk.builtin.none.none$);

  if (hasReturn) {
    values["RETURNS"] = this.convert(returns, node);
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_FunctionDef",
    node.lineno,
    {
      NAME: Sk.ffi.remapToJs(name),
    },
    values,
    {
      inline: "false",
    },
    {
      "@decorators": decorator_list === null ? 0 : decorator_list.length,
      "@parameters": parsedArgs,
      "@returns": hasReturn,
    },
    {
      BODY: this.convertBody(body, node),
    }
  );
};

Blockly.Blocks["ast_Lambda"] = {
  init: function init() {
    this.appendDummyInput().appendField("lambda").setAlign(Blockly.ALIGN_RIGHT);
    this.decoratorsCount_ = 0;
    this.parametersCount_ = 0;
    this.hasReturn_ = false;
    this.appendValueInput("BODY")
      .appendField("body")
      .setAlign(Blockly.ALIGN_RIGHT)
      .setCheck(null);
    this.setInputsInline(false);
    this.setOutput(true);
    this.setColour(BlockMirrorTextToBlocks.COLOR.FUNCTIONS);
    this.updateShape_();
  },
  mutationToDom: Blockly.Blocks["ast_FunctionDef"].mutationToDom,
  domToMutation: Blockly.Blocks["ast_FunctionDef"].domToMutation,
  updateShape_: Blockly.Blocks["ast_FunctionDef"].updateShape_,
  setReturnAnnotation_: Blockly.Blocks["ast_FunctionDef"].setReturnAnnotation_,
};

Blockly.Python["ast_Lambda"] = function (block) {
  // Parameters
  var parameters = new Array(block.parametersCount_);

  for (var i = 0; i < block.parametersCount_; i++) {
    parameters[i] =
      Blockly.Python.valueToCode(
        block,
        "PARAMETER" + i,
        Blockly.Python.ORDER_NONE
      ) || Blockly.Python.blank;
  } // Body

  var body =
    Blockly.Python.valueToCode(block, "BODY", Blockly.Python.ORDER_LAMBDA) ||
    Blockly.Python.PASS;
  return [
    "lambda " + parameters.join(", ") + ": " + body,
    Blockly.Python.ORDER_LAMBDA,
  ];
};

BlockMirrorTextToBlocks.prototype["ast_Lambda"] = function (node, parent) {
  var args = node.args;
  var body = node.body;
  var values = {
    BODY: this.convert(body, node),
  };
  var parsedArgs = 0;

  if (args !== null) {
    parsedArgs = this.parseArgs(args, values, node.lineno);
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_Lambda",
    node.lineno,
    {},
    values,
    {
      inline: "false",
    },
    {
      "@decorators": 0,
      "@parameters": parsedArgs,
      "@returns": false,
    }
  );
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_ReturnFull",
  message0: "return %1",
  args0: [
    {
      type: "input_value",
      name: "VALUE",
    },
  ],
  inputsInline: true,
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Return",
  message0: "return",
  inputsInline: true,
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
});

Blockly.Python["ast_Return"] = function (block) {
  return "return\n";
};

Blockly.Python["ast_ReturnFull"] = function (block) {
  var value =
    Blockly.Python.valueToCode(block, "VALUE", Blockly.Python.ORDER_ATOMIC) ||
    Blockly.Python.blank;
  return "return " + value + "\n";
};

BlockMirrorTextToBlocks.prototype["ast_Return"] = function (node, parent) {
  var value = node.value;

  if (value == null) {
    return BlockMirrorTextToBlocks.create_block("ast_Return", node.lineno);
  } else {
    return BlockMirrorTextToBlocks.create_block(
      "ast_ReturnFull",
      node.lineno,
      {},
      {
        VALUE: this.convert(value, node),
      }
    );
  }
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_YieldFull",
  message0: "yield %1",
  args0: [
    {
      type: "input_value",
      name: "VALUE",
    },
  ],
  inputsInline: false,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
});
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Yield",
  message0: "yield",
  inputsInline: false,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
});

Blockly.Python["ast_Yield"] = function (block) {
  return ["yield", Blockly.Python.ORDER_LAMBDA];
};

Blockly.Python["ast_YieldFull"] = function (block) {
  var value =
    Blockly.Python.valueToCode(block, "VALUE", Blockly.Python.ORDER_LAMBDA) ||
    Blockly.Python.blank;
  return ["yield " + value, Blockly.Python.ORDER_LAMBDA];
};

BlockMirrorTextToBlocks.prototype["ast_Yield"] = function (node, parent) {
  var value = node.value;

  if (value == null) {
    return BlockMirrorTextToBlocks.create_block("ast_Yield", node.lineno);
  } else {
    return BlockMirrorTextToBlocks.create_block(
      "ast_YieldFull",
      node.lineno,
      {},
      {
        VALUE: this.convert(value, node),
      }
    );
  }
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_YieldFrom",
  message0: "yield from %1",
  args0: [
    {
      type: "input_value",
      name: "VALUE",
    },
  ],
  inputsInline: false,
  output: null,
  colour: BlockMirrorTextToBlocks.COLOR.FUNCTIONS,
});

Blockly.Python["ast_YieldFrom"] = function (block) {
  var value =
    Blockly.Python.valueToCode(block, "VALUE", Blockly.Python.ORDER_LAMBDA) ||
    Blockly.Python.blank;
  return ["yield from " + value, Blockly.Python.ORDER_LAMBDA];
};

BlockMirrorTextToBlocks.prototype["ast_YieldFrom"] = function (node, parent) {
  var value = node.value;
  return BlockMirrorTextToBlocks.create_block(
    "ast_YieldFrom",
    node.lineno,
    {},
    {
      VALUE: this.convert(value, node),
    }
  );
};

Blockly.Blocks["ast_Global"] = {
  init: function init() {
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.VARIABLES);
    this.nameCount_ = 1;
    this.appendDummyInput("GLOBAL").appendField("make global", "START_GLOBALS");
    this.updateShape_();
  },
  updateShape_: function updateShape_() {
    var input = this.getInput("GLOBAL"); // Update pluralization

    if (this.getField("START_GLOBALS")) {
      this.setFieldValue(
        this.nameCount_ > 1 ? "make globals" : "make global",
        "START_GLOBALS"
      );
    } // Update fields

    for (var i = 0; i < this.nameCount_; i++) {
      if (!this.getField("NAME" + i)) {
        if (i !== 0) {
          input.appendField(",").setAlign(Blockly.ALIGN_RIGHT);
        }

        input.appendField(new Blockly.FieldVariable("variable"), "NAME" + i);
      }
    } // Remove deleted fields.

    while (this.getField("NAME" + i)) {
      input.removeField("NAME" + i);
      i++;
    } // Delete and re-add ending field

    if (this.getField("END_GLOBALS")) {
      input.removeField("END_GLOBALS");
    }

    input.appendField("available", "END_GLOBALS");
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("names", this.nameCount_);
    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.nameCount_ = parseInt(xmlElement.getAttribute("names"), 10);
    this.updateShape_();
  },
};

Blockly.Python["ast_Global"] = function (block) {
  // Create a list with any number of elements of any type.
  var elements = new Array(block.nameCount_);

  for (var i = 0; i < block.nameCount_; i++) {
    elements[i] = Blockly.Python.variableDB_.getName(
      block.getFieldValue("NAME" + i),
      Blockly.Variables.NAME_TYPE
    );
  }

  return "global " + elements.join(", ") + "\n";
};

BlockMirrorTextToBlocks.prototype["ast_Global"] = function (node, parent) {
  var names = node.names;
  var fields = {};

  for (var i = 0; i < names.length; i++) {
    fields["NAME" + i] = Sk.ffi.remapToJs(names[i]);
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_Global",
    node.lineno,
    fields,
    {},
    {
      inline: "true",
    },
    {
      "@names": names.length,
    }
  );
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Break",
  message0: "break",
  inputsInline: false,
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.CONTROL,
});

Blockly.Python["ast_Break"] = function (block) {
  return "break\n";
};

BlockMirrorTextToBlocks.prototype["ast_Break"] = function (node, parent) {
  return BlockMirrorTextToBlocks.create_block("ast_Break", node.lineno);
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Continue",
  message0: "continue",
  inputsInline: false,
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.CONTROL,
});

Blockly.Python["ast_Continue"] = function (block) {
  return "continue\n";
};

BlockMirrorTextToBlocks.prototype["ast_Continue"] = function (node, parent) {
  return BlockMirrorTextToBlocks.create_block("ast_Continue", node.lineno);
};

BlockMirrorTextToBlocks.HANDLERS_CATCH_ALL = 0;
BlockMirrorTextToBlocks.HANDLERS_NO_AS = 1;
BlockMirrorTextToBlocks.HANDLERS_COMPLETE = 3;
Blockly.Blocks["ast_Try"] = {
  init: function init() {
    this.handlersCount_ = 0;
    this.handlers_ = [];
    this.hasElse_ = false;
    this.hasFinally_ = false;
    this.appendDummyInput().appendField("try:");
    this.appendStatementInput("BODY")
      .setCheck(null)
      .setAlign(Blockly.ALIGN_RIGHT);
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.EXCEPTIONS);
    this.updateShape_();
  },
  // TODO: Not mutable currently
  updateShape_: function updateShape_() {
    for (var i = 0; i < this.handlersCount_; i++) {
      if (this.handlers_[i] === BlockMirrorTextToBlocks.HANDLERS_CATCH_ALL) {
        this.appendDummyInput().appendField("except");
      } else {
        this.appendValueInput("TYPE" + i)
          .setCheck(null)
          .appendField("except");

        if (this.handlers_[i] === BlockMirrorTextToBlocks.HANDLERS_COMPLETE) {
          this.appendDummyInput()
            .appendField("as")
            .appendField(new Blockly.FieldVariable("item"), "NAME" + i);
        }
      }

      this.appendStatementInput("HANDLER" + i).setCheck(null);
    }

    if (this.hasElse_) {
      this.appendDummyInput().appendField("else:");
      this.appendStatementInput("ORELSE").setCheck(null);
    }

    if (this.hasFinally_) {
      this.appendDummyInput().appendField("finally:");
      this.appendStatementInput("FINALBODY").setCheck(null);
    }
  },

  /**
   * Create XML to represent the (non-editable) name and arguments.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("orelse", this.hasElse_);
    container.setAttribute("finalbody", this.hasFinally_);
    container.setAttribute("handlers", this.handlersCount_);

    for (var i = 0; i < this.handlersCount_; i++) {
      var parameter = document.createElement("arg");
      parameter.setAttribute("name", this.handlers_[i]);
      container.appendChild(parameter);
    }

    return container;
  },

  /**
   * Parse XML to restore the (non-editable) name and parameters.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.hasElse_ = "true" === xmlElement.getAttribute("orelse");
    this.hasFinally_ = "true" === xmlElement.getAttribute("finalbody");
    this.handlersCount_ = parseInt(xmlElement.getAttribute("handlers"), 10);
    this.handlers_ = [];

    for (var i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
      if (childNode.nodeName.toLowerCase() === "arg") {
        this.handlers_.push(parseInt(childNode.getAttribute("name"), 10));
      }
    }

    this.updateShape_();
  },
};

Blockly.Python["ast_Try"] = function (block) {
  // Try:
  var body =
    Blockly.Python.statementToCode(block, "BODY") || Blockly.Python.PASS; // Except clauses

  var handlers = new Array(block.handlersCount_);

  for (var i = 0; i < block.handlersCount_; i++) {
    var level = block.handlers_[i];
    var clause = "except";

    if (level !== BlockMirrorTextToBlocks.HANDLERS_CATCH_ALL) {
      clause +=
        " " +
          Blockly.Python.valueToCode(
            block,
            "TYPE" + i,
            Blockly.Python.ORDER_NONE
          ) || Blockly.Python.blank;

      if (level === BlockMirrorTextToBlocks.HANDLERS_COMPLETE) {
        clause +=
          " as " +
          Blockly.Python.variableDB_.getName(
            block.getFieldValue("NAME" + i),
            Blockly.Variables.NAME_TYPE
          );
      }
    }

    clause +=
      ":\n" +
      (Blockly.Python.statementToCode(block, "HANDLER" + i) ||
        Blockly.Python.PASS);
    handlers[i] = clause;
  } // Orelse:

  var orelse = "";

  if (this.hasElse_) {
    orelse =
      "else:\n" +
      (Blockly.Python.statementToCode(block, "ORELSE") || Blockly.Python.PASS);
  } // Finally:

  var finalbody = "";

  if (this.hasFinally_) {
    finalbody =
      "finally:\n" +
      (Blockly.Python.statementToCode(block, "FINALBODY") ||
        Blockly.Python.PASS);
  }

  return "try:\n" + body + handlers.join("") + orelse + finalbody;
};

BlockMirrorTextToBlocks.prototype["ast_Try"] = function (node, parent) {
  var body = node.body;
  var handlers = node.handlers;
  var orelse = node.orelse;
  var finalbody = node.finalbody;
  var fields = {};
  var values = {};
  var mutations = {
    "@ORELSE": orelse !== null && orelse.length > 0,
    "@FINALBODY": finalbody !== null && finalbody.length > 0,
    "@HANDLERS": handlers.length,
  };
  var statements = {
    BODY: this.convertBody(body, node),
  };

  if (orelse !== null) {
    statements["ORELSE"] = this.convertBody(orelse, node);
  }

  if (finalbody !== null && finalbody.length) {
    statements["FINALBODY"] = this.convertBody(finalbody, node);
  }

  var handledLevels = [];

  for (var i = 0; i < handlers.length; i++) {
    var handler = handlers[i];
    statements["HANDLER" + i] = this.convertBody(handler.body, node);

    if (handler.type === null) {
      handledLevels.push(BlockMirrorTextToBlocks.HANDLERS_CATCH_ALL);
    } else {
      values["TYPE" + i] = this.convert(handler.type, node);

      if (handler.name === null) {
        handledLevels.push(BlockMirrorTextToBlocks.HANDLERS_NO_AS);
      } else {
        handledLevels.push(BlockMirrorTextToBlocks.HANDLERS_COMPLETE);
        fields["NAME" + i] = Sk.ffi.remapToJs(handler.name.id);
      }
    }
  }

  mutations["ARG"] = handledLevels;
  return BlockMirrorTextToBlocks.create_block(
    "ast_Try",
    node.lineno,
    fields,
    values,
    {},
    mutations,
    statements
  );
};

Blockly.Blocks["ast_ClassDef"] = {
  init: function init() {
    this.decorators_ = 0;
    this.bases_ = 0;
    this.keywords_ = 0;
    this.appendDummyInput("HEADER")
      .appendField("Class")
      .appendField(new Blockly.FieldVariable("item"), "NAME");
    this.appendStatementInput("BODY").setCheck(null);
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.OO);
    this.updateShape_();
  },
  // TODO: Not mutable currently
  updateShape_: function updateShape_() {
    for (var i = 0; i < this.decorators_; i++) {
      var input = this.appendValueInput("DECORATOR" + i)
        .setCheck(null)
        .setAlign(Blockly.ALIGN_RIGHT);

      if (i === 0) {
        input.appendField("decorated by");
      }

      this.moveInputBefore("DECORATOR" + i, "BODY");
    }

    for (var _i9 = 0; _i9 < this.bases_; _i9++) {
      var _input = this.appendValueInput("BASE" + _i9)
        .setCheck(null)
        .setAlign(Blockly.ALIGN_RIGHT);

      if (_i9 === 0) {
        _input.appendField("inherits from");
      }

      this.moveInputBefore("BASE" + _i9, "BODY");
    }

    for (var _i10 = 0; _i10 < this.keywords_; _i10++) {
      this.appendValueInput("KEYWORDVALUE" + _i10)
        .setCheck(null)
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(
          new Blockly.FieldTextInput("metaclass"),
          "KEYWORDNAME" + _i10
        )
        .appendField("=");
      this.moveInputBefore("KEYWORDVALUE" + _i10, "BODY");
    }
  },

  /**
   * Create XML to represent the (non-editable) name and arguments.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("decorators", this.decorators_);
    container.setAttribute("bases", this.bases_);
    container.setAttribute("keywords", this.keywords_);
    return container;
  },

  /**
   * Parse XML to restore the (non-editable) name and parameters.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.decorators_ = parseInt(xmlElement.getAttribute("decorators"), 10);
    this.bases_ = parseInt(xmlElement.getAttribute("bases"), 10);
    this.keywords_ = parseInt(xmlElement.getAttribute("keywords"), 10);
    this.updateShape_();
  },
};

Blockly.Python["ast_ClassDef"] = function (block) {
  // Name
  var name = Blockly.Python.variableDB_.getName(
    block.getFieldValue("NAME"),
    Blockly.Variables.NAME_TYPE
  ); // Decorators

  var decorators = new Array(block.decorators_);

  for (var i = 0; i < block.decorators_; i++) {
    var decorator =
      Blockly.Python.valueToCode(
        block,
        "DECORATOR" + i,
        Blockly.Python.ORDER_NONE
      ) || Blockly.Python.blank;
    decorators[i] = "@" + decorator + "\n";
  } // Bases

  var bases = new Array(block.bases_);

  for (var _i11 = 0; _i11 < block.bases_; _i11++) {
    bases[_i11] =
      Blockly.Python.valueToCode(
        block,
        "BASE" + _i11,
        Blockly.Python.ORDER_NONE
      ) || Blockly.Python.blank;
  } // Keywords

  var keywords = new Array(block.keywords_);

  for (var _i12 = 0; _i12 < block.keywords_; _i12++) {
    var _name = block.getFieldValue("KEYWORDNAME" + _i12);

    var value =
      Blockly.Python.valueToCode(
        block,
        "KEYWORDVALUE" + _i12,
        Blockly.Python.ORDER_NONE
      ) || Blockly.Python.blank;

    if (_name == "**") {
      keywords[_i12] = "**" + value;
    } else {
      keywords[_i12] = _name + "=" + value;
    }
  } // Body:

  var body =
    Blockly.Python.statementToCode(block, "BODY") || Blockly.Python.PASS; // Put it together

  var args = bases.concat(keywords);
  args = args.length === 0 ? "" : "(" + args.join(", ") + ")";
  return decorators.join("") + "class " + name + args + ":\n" + body;
};

BlockMirrorTextToBlocks.prototype["ast_ClassDef"] = function (node, parent) {
  var name = node.name;
  var bases = node.bases;
  var keywords = node.keywords;
  var body = node.body;
  var decorator_list = node.decorator_list;
  var values = {};
  var fields = {
    NAME: Sk.ffi.remapToJs(name),
  };

  if (decorator_list !== null) {
    for (var i = 0; i < decorator_list.length; i++) {
      values["DECORATOR" + i] = this.convert(decorator_list[i], node);
    }
  }

  if (bases !== null) {
    for (var _i13 = 0; _i13 < bases.length; _i13++) {
      values["BASE" + _i13] = this.convert(bases[_i13], node);
    }
  }

  if (keywords !== null) {
    for (var _i14 = 0; _i14 < keywords.length; _i14++) {
      values["KEYWORDVALUE" + _i14] = this.convert(keywords[_i14].value, node);
      var arg = keywords[_i14].arg;

      if (arg === null) {
        fields["KEYWORDNAME" + _i14] = "**";
      } else {
        fields["KEYWORDNAME" + _i14] = Sk.ffi.remapToJs(arg);
      }
    }
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_ClassDef",
    node.lineno,
    fields,
    values,
    {
      inline: "false",
    },
    {
      "@decorators": decorator_list === null ? 0 : decorator_list.length,
      "@bases": bases === null ? 0 : bases.length,
      "@keywords": keywords === null ? 0 : keywords.length,
    },
    {
      BODY: this.convertBody(body, node),
    }
  );
}; // TODO: direct imports are not variables, because you can do stuff like:
//         import os.path
//       What should the variable be? Blockly will mangle it, but we should really be
//       doing something more complicated here with namespaces (probably make `os` the
//       variable and have some kind of list of attributes. But that's in the fading zone.

Blockly.Blocks["ast_Import"] = {
  init: function init() {
    this.nameCount_ = 1;
    this.from_ = false;
    this.regulars_ = [true];
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.PYTHON);
    this.updateShape_();
  },
  // TODO: Not mutable currently
  updateShape_: function updateShape_() {
    // Possible FROM part
    if (this.from_ && !this.getInput("FROM")) {
      this.appendDummyInput("FROM")
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("from")
        .appendField(new Blockly.FieldTextInput("module"), "MODULE");
    } else if (!this.from_ && this.getInput("FROM")) {
      this.removeInput("FROM");
    } // Import clauses

    for (var i = 0; i < this.nameCount_; i++) {
      var input = this.getInput("CLAUSE" + i);

      if (!input) {
        input = this.appendDummyInput("CLAUSE" + i).setAlign(
          Blockly.ALIGN_RIGHT
        );

        if (i === 0) {
          input.appendField("import");
        }

        input.appendField(new Blockly.FieldTextInput("default"), "NAME" + i);
      }

      if (this.regulars_[i] && this.getField("AS" + i)) {
        input.removeField("AS" + i);
        input.removeField("ASNAME" + i);
      } else if (!this.regulars_[i] && !this.getField("AS" + i)) {
        input
          .appendField("as", "AS" + i)
          .appendField(new Blockly.FieldVariable("alias"), "ASNAME" + i);
      }
    } // Remove deleted inputs.

    while (this.getInput("CLAUSE" + i)) {
      this.removeInput("CLAUSE" + i);
      i++;
    } // Reposition everything

    if (this.from_ && this.nameCount_ > 0) {
      this.moveInputBefore("FROM", "CLAUSE0");
    }

    for (i = 0; i + 1 < this.nameCount_; i++) {
      this.moveInputBefore("CLAUSE" + i, "CLAUSE" + (i + 1));
    }
  },

  /**
   * Create XML to represent the (non-editable) name and arguments.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("names", this.nameCount_);
    container.setAttribute("from", this.from_);

    for (var i = 0; i < this.nameCount_; i++) {
      var parameter = document.createElement("regular");
      parameter.setAttribute("name", this.regulars_[i]);
      container.appendChild(parameter);
    }

    return container;
  },

  /**
   * Parse XML to restore the (non-editable) name and parameters.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.nameCount_ = parseInt(xmlElement.getAttribute("names"), 10);
    this.from_ = "true" === xmlElement.getAttribute("from");
    this.regulars_ = [];

    for (var i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
      if (childNode.nodeName.toLowerCase() === "regular") {
        this.regulars_.push("true" === childNode.getAttribute("name"));
      }
    }

    this.updateShape_();
  },
};

Blockly.Python["ast_Import"] = function (block) {
  // Optional from part
  var from = "";

  if (this.from_) {
    var moduleName = block.getFieldValue("MODULE");
    from = "from " + moduleName + " ";
    Blockly.Python.imported_["import_" + moduleName] = moduleName;
  } // Create a list with any number of elements of any type.

  var elements = new Array(block.nameCount_);

  for (var i = 0; i < block.nameCount_; i++) {
    var name = block.getFieldValue("NAME" + i);
    elements[i] = name;

    if (!this.regulars_[i]) {
      name = Blockly.Python.variableDB_.getName(
        block.getFieldValue("ASNAME" + i),
        Blockly.Variables.NAME_TYPE
      );
      elements[i] += " as " + name;
    }

    if (!from) {
      Blockly.Python.imported_["import_" + name] = name;
    }
  }

  return from + "import " + elements.join(", ") + "\n";
};

BlockMirrorTextToBlocks.prototype["ast_Import"] = function (node, parent) {
  var names = node.names;
  var fields = {};
  var mutations = {
    "@names": names.length,
  };
  var regulars = [];
  var simpleName = "";

  for (var i = 0; i < names.length; i++) {
    fields["NAME" + i] = Sk.ffi.remapToJs(names[i].name);
    var isRegular = names[i].asname === null;

    if (!isRegular) {
      fields["ASNAME" + i] = Sk.ffi.remapToJs(names[i].asname);
      simpleName = fields["ASNAME" + i];
    } else {
      simpleName = fields["NAME" + i];
    }

    regulars.push(isRegular);
  }

  mutations["regular"] = regulars;

  if (this.hiddenImports.indexOf(simpleName) !== -1) {
    return null;
  }

  if (node._astname === "ImportFrom") {
    // acbart: GTS suggests module can be None for '.' but it's an empty string in Skulpt
    mutations["@from"] = true;
    fields["MODULE"] = ".".repeat(node.level) + Sk.ffi.remapToJs(node.module);
  } else {
    mutations["@from"] = false;
  }

  return BlockMirrorTextToBlocks.create_block(
    "ast_Import",
    node.lineno,
    fields,
    {},
    {
      inline: true,
    },
    mutations
  );
}; // Alias ImportFrom because of big overlap

BlockMirrorTextToBlocks.prototype["ast_ImportFrom"] =
  BlockMirrorTextToBlocks.prototype["ast_Import"];
BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_WithItem",
  output: "WithItem",
  message0: "context %1",
  args0: [
    {
      type: "input_value",
      name: "CONTEXT",
    },
  ],
  enableContextMenu: false,
  colour: BlockMirrorTextToBlocks.COLOR.CONTROL,
  inputsInline: false,
});

Blockly.Python["ast_WithItem"] = function (block) {
  var context =
    Blockly.Python.valueToCode(block, "CONTEXT", Blockly.Python.ORDER_NONE) ||
    Blockly.Python.blank;
  return [context, Blockly.Python.ORDER_NONE];
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_WithItemAs",
  output: "WithItem",
  message0: "context %1 as %2",
  args0: [
    {
      type: "input_value",
      name: "CONTEXT",
    },
    {
      type: "input_value",
      name: "AS",
    },
  ],
  enableContextMenu: false,
  colour: BlockMirrorTextToBlocks.COLOR.CONTROL,
  inputsInline: true,
});

Blockly.Python["ast_WithItemAs"] = function (block) {
  var context =
    Blockly.Python.valueToCode(block, "CONTEXT", Blockly.Python.ORDER_NONE) ||
    Blockly.Python.blank;
  var as =
    Blockly.Python.valueToCode(block, "AS", Blockly.Python.ORDER_NONE) ||
    Blockly.Python.blank;
  return [context + " as " + as, Blockly.Python.ORDER_NONE];
};

Blockly.Blocks["ast_With"] = {
  init: function init() {
    this.appendValueInput("ITEM0").appendField("with");
    this.appendStatementInput("BODY").setCheck(null);
    this.itemCount_ = 1;
    this.renames_ = [false];
    this.setInputsInline(false);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BlockMirrorTextToBlocks.COLOR.CONTROL);
    this.updateShape_();
  },

  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function mutationToDom() {
    var container = document.createElement("mutation");
    container.setAttribute("items", this.itemCount_);

    for (var i = 0; i < this.itemCount_; i++) {
      var parameter = document.createElement("as");
      parameter.setAttribute("name", this.renames_[i]);
      container.appendChild(parameter);
    }

    return container;
  },

  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function domToMutation(xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute("items"), 10);
    this.renames_ = [];

    for (var i = 0, childNode; (childNode = xmlElement.childNodes[i]); i++) {
      if (childNode.nodeName.toLowerCase() === "as") {
        this.renames_.push("true" === childNode.getAttribute("name"));
      }
    }

    this.updateShape_();
  },
  updateShape_: function updateShape_() {
    // With clauses
    for (var i = 1; i < this.itemCount_; i++) {
      var input = this.getInput("ITEM" + i);

      if (!input) {
        input = this.appendValueInput("ITEM" + i);
      }
    } // Remove deleted inputs.

    while (this.getInput("ITEM" + i)) {
      this.removeInput("ITEM" + i);
      i++;
    } // Reposition everything

    for (i = 0; i < this.itemCount_; i++) {
      this.moveInputBefore("ITEM" + i, "BODY");
    }
  },
};

Blockly.Python["ast_With"] = function (block) {
  // Contexts
  var items = new Array(block.itemCount_);

  for (var i = 0; i < block.itemCount_; i++) {
    items[i] =
      Blockly.Python.valueToCode(
        block,
        "ITEM" + i,
        Blockly.Python.ORDER_NONE
      ) || Blockly.Python.blank;
  } // Body

  var body =
    Blockly.Python.statementToCode(block, "BODY") || Blockly.Python.PASS;
  return "with " + items.join(", ") + ":\n" + body;
};

BlockMirrorTextToBlocks.prototype["ast_With"] = function (node, parent) {
  var items = node.items;
  var body = node.body;
  var values = {};
  var mutations = {
    "@items": items.length,
  };
  var renamedItems = [];

  for (var i = 0; i < items.length; i++) {
    var hasRename = items[i].optional_vars;
    renamedItems.push(hasRename);
    var innerValues = {
      CONTEXT: this.convert(items[i].context_expr, node),
    };

    if (hasRename) {
      innerValues["AS"] = this.convert(items[i].optional_vars, node);
      values["ITEM" + i] = BlockMirrorTextToBlocks.create_block(
        "ast_WithItemAs",
        node.lineno,
        {},
        innerValues,
        this.LOCKED_BLOCK
      );
    } else {
      values["ITEM" + i] = BlockMirrorTextToBlocks.create_block(
        "ast_WithItem",
        node.lineno,
        {},
        innerValues,
        this.LOCKED_BLOCK
      );
    }
  }

  mutations["as"] = renamedItems;
  return BlockMirrorTextToBlocks.create_block(
    "ast_With",
    node.lineno,
    {},
    values,
    {
      inline: "false",
    },
    mutations,
    {
      BODY: this.convertBody(body, node),
    }
  );
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Comment",
  message0: "# Comment: %1",
  args0: [
    {
      type: "field_input",
      name: "BODY",
      text: "will be ignored",
    },
  ],
  inputsInline: true,
  previousStatement: null,
  nextStatement: null,
  colour: BlockMirrorTextToBlocks.COLOR.PYTHON,
});

Blockly.Python["ast_Comment"] = function (block) {
  var text_body = block.getFieldValue("BODY");
  return "#" + text_body + "\n";
};

BlockMirrorTextToBlocks.prototype["ast_Comment"] = function (txt, lineno) {
  var commentText = txt.slice(1);
  /*if (commentText.length && commentText[0] === " ") {
      commentText = commentText.substring(1);
  }*/

  return BlockMirrorTextToBlocks.create_block("ast_Comment", lineno, {
    BODY: commentText,
  });
};

BlockMirrorTextToBlocks.BLOCKS.push({
  type: "ast_Raw",
  message0: "Code Block: %1 %2",
  args0: [
    {
      type: "input_dummy",
    },
    {
      type: "field_multilinetext",
      name: "TEXT",
      value: "",
    },
  ],
  colour: BlockMirrorTextToBlocks.COLOR.PYTHON,
  previousStatement: null,
  nextStatement: null,
});

Blockly.Python["ast_Raw"] = function (block) {
  var code = block.getFieldValue("TEXT") + "\n";
  return code;
};
