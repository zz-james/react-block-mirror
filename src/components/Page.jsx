import React from "react";
import Byte from "./Byte";
import { useMemoryContext } from "../contexts/Memory";
import { decToHex } from "../utils/numbers";

const TableRow = ({ value, row, page }) =>
  [...value].map((byte, col, __) => (
    <td key={col}>
      {decToHex(page)}
      {decToHex(col + 16 * row)}
      <br />
      <Byte value={byte} />
    </td>
  ));

const Page = ({ page }) => {
  const memory = useMemoryContext(page);

  return (
    <>
      <p>page {decToHex(page)}</p>

      <table>
        <tbody>
          {[...Array(16)].map((_, row, __) => (
            <tr key={row}>
              <TableRow
                row={row}
                page={page}
                value={memory.slice(row * 16, row * 16 + 16)}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

export default Page;
