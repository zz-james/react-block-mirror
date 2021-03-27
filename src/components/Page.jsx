import React from "react";
import Byte from "./Byte";

const TableRow = ({ row }) =>
  [...Array(16)].map((_, col, __) => (
    <td>
      {(col + 16 * row).toString(16)}
      <br />
      <Byte />
    </td>
  ));

const Page = () => (
  <table>
    <tbody>
      {[...Array(16)].map((_, row, __) => (
        <tr>
          <TableRow row={row} />
        </tr>
      ))}
    </tbody>
  </table>
);

export default Page;
