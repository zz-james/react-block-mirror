import React from "react";

const ASTContext = React.createContext();

const ASTContextProvider = ({ children }) => {
  const init = true;
  return <ASTContext.Provider value={{ init }}>{children}</ASTContext.Provider>;
};

const useASTContext = (val) => {
  console.log(val);
  const context = React.useContext(ASTContext);
  if (context === undefined) {
    throw new Error("useASTContext must be used within a ASTContextProvider");
  }

  return context;
};

export { ASTContextProvider, useASTContext };
