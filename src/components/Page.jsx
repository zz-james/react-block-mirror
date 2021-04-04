import React from "react";
import Byte from "./Byte";
import {useMemoryContext} from "../contexts/Memory";

const TableRow = ({ value, row }) =>
  [...value].map((byte, col, __) => (
    <td>
      {(col + 16 * row).toString(16)}
      <br />
      <Byte value={byte} />
    </td>
  ));

const Page = ({ page }) => {
  const {memory} = useMemoryContext(page);

  return (
    <>
      <p>page {page}</p>

      <table>
        <tbody>
          {[...Array(16)].map((_, row, __) => (
            <tr>
              <TableRow row={row} value={memory.slice(row*16,row*16+16)} />
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default Page;
