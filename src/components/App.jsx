import React, { useState } from "react";
import Page from "./Page";
import Registers from "./Register";
import { MemoryContextProvider } from "../contexts/Memory";

const App = () => {
  const [pageSelect, setPageSelect] = useState(0);
  const size = 32768;
  const pages = size / 256;

  return (
    <MemoryContextProvider size={size}>
      registers:
      <Registers />
      <hr />
      <div>
        <input
          type="range"
          max={pages}
          min={0}
          value={pageSelect}
          onChange={(e) => setPageSelect(e.target.value)}
          step={1}
        />
        <Page page={pageSelect} />
      </div>
    </MemoryContextProvider>
  );
};

export default App;
