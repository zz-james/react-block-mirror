import React from "react";
import Page from "./Page";
import { MemoryContextProvider } from "../contexts/Memory";

const App = () => {
  return (
    <MemoryContextProvider>
      <div>
        <h1>my react app</h1>
        <Page page={0} />
      </div>
    </MemoryContextProvider>
  );
};

export default App;
