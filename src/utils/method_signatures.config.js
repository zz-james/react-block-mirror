import { COLOR } from "./color.config";

export const METHOD_SIGNATURES_CONFIG = {
  conjugate: { returns: true, colour: COLOR.MATH },
  trunc: { returns: true, colour: COLOR.MATH },
  floor: { returns: true, colour: COLOR.MATH },
  ceil: { returns: true, colour: COLOR.MATH },
  bit_length: { returns: true, colour: COLOR.MATH },
  to_bytes: { returns: true, colour: COLOR.MATH },
  from_bytes: { returns: true, colour: COLOR.MATH },
  as_integer_ratio: {
    returns: true,
    colour: COLOR.MATH,
  },
  is_integer: { returns: true, colour: COLOR.MATH },
  hex: { returns: true, colour: COLOR.MATH },
  fromhex: { returns: true, colour: COLOR.MATH },
  __iter__: {
    returns: true,
    colour: COLOR.SEQUENCES,
  },
  __next__: {
    returns: true,
    colour: COLOR.SEQUENCES,
  },
  index: { returns: true, colour: COLOR.LIST },
  count: { returns: true, colour: COLOR.LIST },
  append: {
    returns: false,
    full: ["x"],
    message: "append",
    premessage: "to list",
    colour: COLOR.LIST,
  },
  clear: { returns: false, colour: COLOR.SEQUENCES },
  copy: { returns: true, colour: COLOR.LIST },
  extend: { returns: false, colour: COLOR.LIST },
  insert: { returns: false, colour: COLOR.LIST },
  pop: { returns: true, colour: COLOR.SEQUENCES },
  remove: { returns: false, colour: COLOR.SEQUENCES },
  reverse: { returns: false, colour: COLOR.LIST },
  sort: { returns: false, colour: COLOR.LIST },
  capitalize: { returns: true, colour: COLOR.TEXT },
  casefold: { returns: true, colour: COLOR.TEXT },
  center: { returns: true, colour: COLOR.TEXT },
  encode: { returns: true, colour: COLOR.TEXT },
  endswith: { returns: true, colour: COLOR.TEXT },
  expandtabs: { returns: true, colour: COLOR.TEXT },
  find: { returns: true, colour: COLOR.TEXT },
  format: { returns: true, colour: COLOR.TEXT },
  format_map: { returns: true, colour: COLOR.TEXT },
  isalnum: { returns: true, colour: COLOR.TEXT },
  isalpha: { returns: true, colour: COLOR.TEXT },
  isascii: { returns: true, colour: COLOR.TEXT },
  isdecimal: { returns: true, colour: COLOR.TEXT },
  isdigit: { returns: true, colour: COLOR.TEXT },
  isidentifier: { returns: true, colour: COLOR.TEXT },
  islower: { returns: true, colour: COLOR.TEXT },
  isnumeric: { returns: true, colour: COLOR.TEXT },
  isprintable: { returns: true, colour: COLOR.TEXT },
  isspace: { returns: true, colour: COLOR.TEXT },
  istitle: { returns: true, colour: COLOR.TEXT },
  isupper: { returns: true, colour: COLOR.TEXT },
  join: { returns: true, colour: COLOR.TEXT },
  ljust: { returns: true, colour: COLOR.TEXT },
  lower: { returns: true, colour: COLOR.TEXT },
  lstrip: { returns: true, colour: COLOR.TEXT },
  maketrans: { returns: true, colour: COLOR.TEXT },
  partition: { returns: true, colour: COLOR.TEXT },
  replace: {
    returns: true,
    full: ["old", "new", "count"],
    simple: ["old", "new"],
    colour: COLOR.TEXT,
  },
  rfind: { returns: true, colour: COLOR.TEXT },
  rindex: { returns: true, colour: COLOR.TEXT },
  rjust: { returns: true, colour: COLOR.TEXT },
  rpartition: { returns: true, colour: COLOR.TEXT },
  rsplit: { returns: true, colour: COLOR.TEXT },
  rstrip: { returns: true, colour: COLOR.TEXT },
  split: { returns: true, colour: COLOR.TEXT },
  splitlines: { returns: true, colour: COLOR.TEXT },
  startswith: { returns: true, colour: COLOR.TEXT },
  strip: { returns: true, colour: COLOR.TEXT },
  swapcase: { returns: true, colour: COLOR.TEXT },
  title: { returns: true, colour: COLOR.TEXT },
  translate: { returns: true, colour: COLOR.TEXT },
  upper: { returns: true, colour: COLOR.TEXT },
  zfill: { returns: true, colour: COLOR.TEXT },
  decode: { returns: true, colour: COLOR.TEXT },
  __eq__: { returns: true, colour: COLOR.LOGIC },
  tobytes: { returns: true, colour: COLOR.PYTHON },
  tolist: { returns: true, colour: COLOR.PYTHON },
  release: { returns: false, colour: COLOR.PYTHON },
  cast: { returns: false, colour: COLOR.PYTHON },
  isdisjoint: { returns: true, colour: COLOR.SET },
  issubset: { returns: true, colour: COLOR.SET },
  issuperset: { returns: true, colour: COLOR.SET },
  union: { returns: true, colour: COLOR.SET },
  intersection: { returns: true, colour: COLOR.SET },
  difference: { returns: true, colour: COLOR.SET },
  symmetric_difference: {
    returns: true,
    colour: COLOR.SET,
  },
  update: { returns: false, colour: COLOR.SET },
  intersection_update: {
    returns: false,
    colour: COLOR.SET,
  },
  difference_update: {
    returns: false,
    colour: COLOR.SET,
  },
  symmetric_difference_update: {
    returns: false,
    colour: COLOR.SET,
  },
  add: { returns: false, colour: COLOR.SET },
  discard: { returns: false, colour: COLOR.SET },
  fromkeys: {
    returns: true,
    colour: COLOR.DICTIONARY,
  },
  get: { returns: true, colour: COLOR.DICTIONARY },
  items: { returns: true, colour: COLOR.DICTIONARY },
  keys: { returns: true, colour: COLOR.DICTIONARY },
  popitem: {
    returns: true,
    colour: COLOR.DICTIONARY,
  },
  setdefault: {
    returns: false,
    colour: COLOR.DICTIONARY,
  },
  values: { returns: true, colour: COLOR.DICTIONARY },
  __enter__: { returns: true, colour: COLOR.CONTROL },
  __exit__: { returns: true, colour: COLOR.CONTROL },
  mro: { returns: true, colour: COLOR.OO },
  __subclasses__: { returns: true, colour: COLOR.OO },
};
