export const add_ast_Yield = ([Blockly, BlockMirrorTextToBlocks]) => {
  BlockMirrorTextToBlocks.BLOCKS.push({
    type: "ast_YieldFull",
    message0: "yield %1",
    args0: [{ type: "input_value", name: "VALUE" }],
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
    let value = node.value;

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
  return [Blockly, BlockMirrorTextToBlocks];
};
