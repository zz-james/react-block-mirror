import React from "react";
import Page from "./Page";
import { ASTContextProvider } from "../contexts/AST";

const App = () => {
  return (
    <ASTContextProvider value={true}>
      <Page val={1} />
    </ASTContextProvider>
  );
};

export default App;
