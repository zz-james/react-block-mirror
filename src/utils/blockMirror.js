// import Sk from '@microduino/skuplt';  //can't do this as not an es6 module https://github.com/skulpt/skulpt/issues/794
// also note skulpt is not completely python3 compatable...

import Blockly from "blockly";
import "blockly/blocks";
import "blockly/python";
import * as En from "blockly/msg/en-gb";
import { BlockMirrorTextToBlocks } from "./textToBlocks";
import { BlockMirrorTextEditor } from "./textEditor";
import { BlockMirrorBlockEditor } from "./blockEditor";
import { addAstTypes } from "./ast/index";

Blockly.setLocale(En);
Blockly.Python['blank'] = '___';
export class BlockMirror {

  constructor(configuration) {
    // add ast types to Blockly and texttoblocks
    const [_, BlockMirrorTextToBlocksPlus] = addAstTypes([
      Blockly,
      BlockMirrorTextToBlocks,
    ]);

    this.validateConfiguration(configuration);
    this.createElements();

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

  createElements() {
    this.tags = {
      toolbar: document.createElement("div"),
      blockContainer: document.createElement("div"),
      blockEditor: document.createElement("div"),
      blockArea: document.createElement("div"),
      textSidebar: document.createElement("div"),
      textContainer: document.createElement("div"),
      textArea: document.createElement("textarea"),
    };

    this.tags.toolbar.className = "toolbar";
    this.tags.blockContainer.className = "blockContainer";
    this.tags.blockEditor.className = "blockEditor";
    this.tags.blockArea.className = "blockArea";
    this.tags.textSidebar.className = "textSidebar";
    this.tags.textContainer.className = "textContainer";
    this.tags.textArea.className = "textArea";

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

}
