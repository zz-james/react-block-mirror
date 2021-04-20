import React, { useRef, useEffect } from "react";
import Page from "./Page";
import Toolbar from "./Toolbar";
import { BlockMirror } from "../utils/blockMirror";

const App = () => {
  const editorElement = useRef(null);
  let editor;
  useEffect(() => {
    const configuration = {
      container: editorElement.current,
      blockDelay: 1,
    };

    editor = new BlockMirror(configuration);
  }, []);

  return (
    <div ref={editorElement}>
      <Toolbar />
      <Page val={1} />
    </div>
  );
};

export default App;
