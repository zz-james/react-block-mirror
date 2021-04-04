import React, { useRef } from "react";

const buffer = new ArrayBuffer(256);


const MemoryContext = React.createContext();


const MemoryContextProvider = ({ children }) => {

  const page = useRef(new Uint8Array(buffer, 0));

  page.current[0] = 255;
  page.current[8] = 255;
  page.current[255] = 128;

  const memory = page.current

  return (
    <MemoryContext.Provider
      value={{memory}}
    >
      {children}
    </MemoryContext.Provider>
  );
}

const useMemoryContext = () => {
  const context = React.useContext(MemoryContext);
  if (context === undefined) {
    throw new Error(
      "useMemoryContext must be used within a MemoryContextProvider"
    );
  }

  return context;
}

export { MemoryContextProvider, useMemoryContext };
