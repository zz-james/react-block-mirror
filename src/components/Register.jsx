import React from "react";
import Byte from "./Byte";

const Registers = () => {
  return (
    <table>
      <tr>
        <td>
          Program Counter:
          <br />
          <Byte value={1} />
        </td>
        <td>
          Stack Pointer:
          <br />
          <Byte value={2} />
        </td>
        <td>
          Accumulator:
          <br />
          <Byte value={3} />
        </td>
        <td>
          X reg:
          <br />
          <Byte value={4} />
        </td>
        <td>
          Y reg:
          <br />
          <Byte value={5} />
        </td>
        <td>
          Processor Status:
          <br />
          <Byte value={6} />
        </td>
      </tr>
    </table>
  );
};

export default Registers;
