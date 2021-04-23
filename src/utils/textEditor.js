export class BlockMirrorTextEditor {
  constructor(blockMirror) {
    this.blockMirror = blockMirror;
    this.textContainer = blockMirror.tags.textContainer;
    this.textArea = blockMirror.tags.textArea;
    this.textSidebar = blockMirror.tags.textSidebar;

    this.highlightedHandles = [];

    // notification
    this.silentEvents_ = false;

    // Do we need to force an update?
    this.outOfDate_ = null;

    // Use a timer to swallow updates
    this.updateTimer_ = null;

    let codeMirrorOptions = {
      mode: {
        name: "python",
        version: 3,
        singleLineStringErrors: false,
      },
      readOnly: blockMirror.configuration.readOnly,
      showCursorWhenSelecting: true,
      lineNumbers: true,
      firstLineNumber: 1,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      matchBrackets: true,
      extraKeys: {
        Tab: "indentMore",
        "Shift-Tab": "indentLess",
        "Ctrl-Enter": blockMirror.run,
        Esc: function (cm) {
          if (cm.getOption("fullScreen")) {
            cm.setOption("fullScreen", false);
          } else {
            cm.display.input.blur();
          }
        },
        F11: function (cm) {
          cm.setOption("fullScreen", !cm.getOption("fullScreen"));
        },
      },
      // TODO: Hide gutters when short on space
      foldGutter: true,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
    };
    this.codeMirror = CodeMirror.fromTextArea(this.textArea, codeMirrorOptions);
    this.codeMirror.on("change", this.changed.bind(this));
    this.codeMirror.setSize(null, "100%");
    this.imageMarkers = [];

    this.textContainer.style.height = "500px";

    this.codeMirror.getWrapperElement().style.display = "block";
    this.codeMirror.refresh();
  }

  setCode(code, quietly) {
    this.silentEvents_ = quietly;

    // Defaults to a single blank line
    code = code === undefined || code.trim() === "" ? "\n" : code;

    this.codeMirror.setValue(code);
    this.outOfDate_ = null;
  }

  getCode() {
    return this.codeMirror.getValue();
  }

  changed() {
    if (!this.silentEvents_) {
      let handleChange = () => {
        let newCode = this.getCode();
        this.blockMirror.blockEditor.setCode(newCode, true);
      };
      if (this.blockMirror.configuration.blockDelay === false) {
        handleChange();
      } else {
        if (this.updateTimer_ !== null) {
          clearTimeout(this.updateTimer_);
        }
        this.updateTimer_ = setTimeout(
          handleChange,
          this.blockMirror.configuration.blockDelay
        );
      }
    }
    this.silentEvents_ = false;
  }
}
