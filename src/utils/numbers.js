export const decToHex = (d) =>
  ("0" + Number(d).toString(16)).slice(-2).toUpperCase();
