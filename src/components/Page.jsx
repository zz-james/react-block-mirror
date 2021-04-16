import React from "react";
import { useASTContext } from "../contexts/AST";

const Page = ({ val }) => {
  const memory = useASTContext(val);

  return (
    <>
      <p>page</p>
    </>
  );
};

export default Page;
