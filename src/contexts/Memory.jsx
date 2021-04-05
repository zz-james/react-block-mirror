import React, { useRef } from "react";

const MemoryContext = React.createContext();

const MemoryContextProvider = ({ size, children }) => {
  if (size % 256 !== 0) {
    throw new Error("Memory size must be a multiple of 256");
  }

  const buffer = new ArrayBuffer(size);

  const numberOfPages = size / 256;

  let pages = []; // array of 256 byte pages

  for (let i = 0; i <= numberOfPages; i++) {
    pages[i] = new Uint8Array(buffer, i * 256);
  }

  return (
    <MemoryContext.Provider value={{ pages }}>
      {children}
    </MemoryContext.Provider>
  );
};

const useMemoryContext = (page) => {
  const context = React.useContext(MemoryContext);
  if (context === undefined) {
    throw new Error(
      "useMemoryContext must be used within a MemoryContextProvider"
    );
  }

  return context.pages[page];
};

export { MemoryContextProvider, useMemoryContext };
