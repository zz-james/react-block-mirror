import React, { ReactNode, useState } from "react";

const buffer = new ArrayBuffer(256);

const MemoryContext = React.createContext({
  memory: new Uint8Array(buffer, page),
});

// export type Props = {
//   initialSelectedTaskId?: ObjectId;
//   children: ReactNode;
// };

function MemoryContextProvider({ initialValue, children }) {
  const [value, setValue] = useState(initialValue);

  return (
    <MemoryContext.Provider
      value={{
        value,
        setValue,
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
}

function useMemoryContext(page) {
  const context = React.useContext(MemoryContext);
  if (context === undefined) {
    throw new Error(
      "useMemoryContext must be used within a MemoryContextProvider"
    );
  }
  return context;
}

export { MemoryContextProvider, useMemoryContext };
