import Blockly from "blockly";
import toolboxCategories from "./toolbox.config";

export class BlockMirrorBlockEditor {
  BLOCKLY_LOADED_CSS = null;

  BLOCKLY_CHANGE_EVENTS = [
    Blockly.Events.CREATE,
    Blockly.Events.DELETE,
    Blockly.Events.CHANGE,
    Blockly.Events.MOVE,
    Blockly.Events.VAR_RENAME,
  ];

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


    // Inject Blockly
    let blocklyOptions = {
      media: blockMirror.configuration.blocklyMediaPath,
      zoom: { controls: true },
      comments: false,
      disable: false,
      oneBasedIndex: false,
      readOnly: blockMirror.configuration.readOnly,
      scrollbars: true,
      toolbox: toolboxCategories,
    };
    this.workspace = Blockly.inject(
      blockMirror.tags.blockEditor,
      blocklyOptions
    );
    // Configure Blockly
    this.workspace.addChangeListener(this.changed.bind(this));
    Blockly.svgResize(this.workspace);
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
    } 
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

}
