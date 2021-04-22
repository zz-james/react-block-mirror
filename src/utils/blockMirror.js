// import Sk from '@microduino/skuplt';  //can't do this as not an es6 module https://github.com/skulpt/skulpt/issues/794
// also note skulpt is not completely python3 compatable...
import Blockly from "./blockly_shims";
import { BlockMirrorTextToBlocks } from "./textToBlocks";
import { BlockMirrorTextEditor } from "./textEditor";
import { BlockMirrorBlockEditor } from "./blockEditor";
import { addAstTypes } from "./ast/index";

export class BlockMirror {
  VISIBLE_MODES = {
    block: ["block", "split"],
    text: ["text", "split"],
  };

  BREAK_WIDTH = 675;

  constructor(configuration) {
    // add ast types to Blockly and texttoblocks
    const [_, BlockMirrorTextToBlocksPlus] = addAstTypes([
      Blockly,
      BlockMirrorTextToBlocks,
    ]);

    this.validateConfiguration(configuration);
    this.initializeVariables();

    if (!this.configuration.skipSkulpt) {
      this.loadSkulpt();
    }

    this.textToBlocks = new BlockMirrorTextToBlocksPlus(this);
    this.textEditor = new BlockMirrorTextEditor(this);
    this.blockEditor = new BlockMirrorBlockEditor(this);
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

  refresh() {
    this.blockEditor.resized();
    this.textEditor.codeMirror.refresh();
  }

  forceBlockRefresh() {
    this.blockEditor.setCode(this.code_, true);
  }

}
