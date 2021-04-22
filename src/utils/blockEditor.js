import Blockly from "./blockly_shims";
import { TOOLBOXES } from "./toolbox.config";
import { FUNCTION_SIGNATURES_CONFIG } from "./function_signatures.config";
import { METHOD_SIGNATURES_CONFIG } from "./method_signatures.config";
import { BlockMirrorTextToBlocks } from "./textToBlocks";
import { COLOR } from "./color.config";
import { MODULE_FUNCTION_SIGNATURES_CONFIG } from "./module_function_signatures.config";

export class BlockMirrorBlockEditor {
  BLOCKLY_LOADED_CSS = null;

  BLOCKLY_CHANGE_EVENTS = [
    Blockly.Events.CREATE,
    Blockly.Events.DELETE,
    Blockly.Events.CHANGE,
    Blockly.Events.MOVE,
    Blockly.Events.VAR_RENAME,
  ];
  TOOLBOXES = TOOLBOXES;
  static FUNCTION_SIGNATURES = FUNCTION_SIGNATURES_CONFIG;
  static METHOD_SIGNATURES = METHOD_SIGNATURES_CONFIG;

  static MODULE_FUNCTION_IMPORTS = {
    plt: "import matplotlib.pyplot as plt",
    turtle: "import turtle",
  };

  static MODULE_FUNCTION_SIGNATURES = MODULE_FUNCTION_SIGNATURES_CONFIG;

  /**
   * Worth noting - Blockly uses a setTimeOut of 0 steps to make events
   * wait. That has some confusing interaction with trying to make things percolate.
   * @param blockMirror
   * @constructor
   */
  constructor(blockMirror) {
    this.EXTRA_TOOLS = {};
    this.blockMirror = blockMirror;
    this.blockContainer = blockMirror.tags.blockContainer;
    this.blockEditor = blockMirror.tags.blockEditor;
    this.blockArea = blockMirror.tags.blockArea;

    BlockMirrorBlockEditor.FUNCTION_SIGNATURES["assert_equal"] =
      BlockMirrorBlockEditor.MODULE_FUNCTION_SIGNATURES["cisc108"][
        "assert_equal"
      ];
    BlockMirrorBlockEditor.MODULE_FUNCTION_SIGNATURES["matplotlib.pyplot"] =
      BlockMirrorBlockEditor.MODULE_FUNCTION_SIGNATURES["plt"];

    // Null, or the source of the last update
    this.outOfDate_ = null;

    // Have to call BEFORE we inject, or Blockly will delete the css string!
    this.loadBlocklyCSS();

    // Inject Blockly
    let blocklyOptions = {
      media: blockMirror.configuration.blocklyMediaPath,
      zoom: { controls: true },
      comments: false,
      disable: false,
      oneBasedIndex: false,
      readOnly: blockMirror.configuration.readOnly,
      scrollbars: true,
      toolbox: this.makeToolbox(),
    };
    this.workspace = Blockly.inject(
      blockMirror.tags.blockEditor,
      blocklyOptions
    );
    // Configure Blockly
    this.workspace.addChangeListener(this.changed.bind(this));

    // Configure Blockly DIV
    this.blockContainer.style.float = "left";
    this.blockEditor.style.position = "absolute";
    this.blockEditor.style.width = "100%";
    this.blockArea.style.height = blockMirror.configuration.height + "px";

    this.readOnlyDiv_ = null;

    this.blockContainer.style.width = "60%";
    this.blockContainer.style.height = "500px";
    this.blockArea.style.height = "500px";
    // Compute the absolute coordinates and dimensions of blocklyArea.
    let blockArea = this.blockMirror.tags.blockArea;
    let blockEditor = this.blockMirror.tags.blockEditor;
    blockEditor.style.width = blockArea.offsetWidth + "px";
    blockEditor.style.height = blockArea.offsetHeight + "px";
    Blockly.svgResize(this.workspace);
  }

  /**
   * creates XML string to define toolbox
   * @param {} toolboxPython 
   * @returns 
   */
  toolboxPythonToBlocks(toolboxPython) {
    Blockly.Variables._HIDE_GETTERS_SETTERS = false;
    return toolboxPython
      .map((category) => {
        if (typeof category === "string") {
          return category;
        }
        let colour = BlockMirrorTextToBlocks.COLOR[category.colour];
        let header = `<category name="${category.name}" colour="${colour}"`;
        if (category.custom) {
          header += ` custom="${category.custom}">`;
        } else {
          header += ">";
        }
        let body = (category.blocks || [])
          .map((code) => {
            let result = this.blockMirror.textToBlocks.convertSource(
              "toolbox.py",
              code
            );
            return result.rawXml.innerHTML.toString();
          })
          .join("\n");
        let footer = "</category>";
        if (category["hideGettersSetters"]) {
          Blockly.Variables._HIDE_GETTERS_SETTERS = true;
        }
        return [header, body, footer].join("\n");
      })
      .join("\n");
  }

  makeToolbox() {
    let toolbox = this.blockMirror.configuration.toolbox;
    // Use palette if it exists, otherwise assume its a custom one.
    if (toolbox in this.TOOLBOXES) {
      toolbox = this.TOOLBOXES[toolbox];
    }
    // Convert if necessary
    if (typeof toolbox !== "string") {
      toolbox = this.toolboxPythonToBlocks(toolbox);
    }
    // TODO: Fix Hack, this should be configurable by instance rather than by class
    for (let name in BlockMirrorBlockEditor.EXTRA_TOOLS) {
      toolbox += BlockMirrorBlockEditor.EXTRA_TOOLS[name];
    }
    return '<xml id="toolbox" style="display:none">' + toolbox + "</xml>";
  }

  remakeToolbox() {
    this.workspace.updateToolbox(this.makeToolbox());
    this.resized();
  }

  /**
   * Retrieves the current width of the Blockly Toolbox, unless
   * we're in read-only mode (when there is no toolbox).
   * @returns {Number} The current width of the toolbox.
   */
  getToolbarWidth() {
    return this.workspace.toolbox_.width;
  }

  /**
   * Attempts to update the model for the current code file from the
   * block workspace. Might be prevented if an update event was already
   * percolating.
   */
  getCode() {
    return Blockly.Python.workspaceToCode(this.workspace);
  }

  /**
   * Attempts to update the model for the current code file from the
   * block workspace. Might be prevented if an update event was already
   * percolating.
   */
  setCode(code, quietly) {
    // here's where the python source text gets converted to blockly xml.
    let result = this.blockMirror.textToBlocks.convertSource(
      "__main__.py",
      code
    );
    if (quietly) {
      Blockly.Events.disable();
    }
    try {
      let xml_code = Blockly.Xml.textToDom(result.xml);
      this.workspace.clear();
      Blockly.Xml.domToWorkspace(xml_code, this.workspace);
      if (this.blockMirror.isParsons()) {
        this.workspace.shuffle();
      } else {
        this.workspace.cleanUp();
      }
    } catch (error) {
      console.error(error);
    }
    if (quietly) {
      Blockly.Events.enable();
    } else {
      this.blockMirror.setCode(code, true);
    }
    this.outOfDate_ = null;
  }

  changed(event) {
    if (
      (event === undefined ||
        this.BLOCKLY_CHANGE_EVENTS.indexOf(event.type) !== -1) &&
      !this.workspace.isDragging()
    ) {
      let newCode = this.getCode();
      this.blockMirror.textEditor.setCode(newCode, true);
      this.blockMirror.setCode(newCode, true);
    }
  }

  loadBlocklyCSS() {
    if (!this.BLOCKLY_LOADED_CSS) {
      let result = [".blocklyDraggable {}"];
      result = result.concat(Blockly.Css.CONTENT);
      if (Blockly.FieldDate) {
        result = result.concat(Blockly.FieldDate.CSS);
      }
      result = result.join("\n");
      // Strip off any trailing slash (either Unix or Windows).
      result = result.replace(/<<<PATH>>>/g, Blockly.Css.mediaPath_);
      this.BLOCKLY_LOADED_CSS = result;
    }
  }

}
