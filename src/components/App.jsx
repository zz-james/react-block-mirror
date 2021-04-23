import React, { useRef, useEffect } from "react";
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

  return <div ref={editorElement}></div>;
};

export default App;
