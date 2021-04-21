import { COLOR } from "./color.config";

export const MODULE_FUNCTION_SIGNATURES_CONFIG = {
  cisc108: {
    assert_equal: {
      returns: false,
      simple: ["left", "right"],
      message: "assert_equal",
      colour: COLOR.PYTHON,
    },
  },
  turtle: {},
  plt: {
    show: {
      returns: false,
      simple: [],
      message: "show plot canvas",
      colour: COLOR.PLOTTING,
    },
    hist: {
      returns: false,
      simple: ["values"],
      message: "plot histogram",
      colour: COLOR.PLOTTING,
    },
    plot: {
      returns: false,
      simple: ["values"],
      message: "plot line",
      colour: COLOR.PLOTTING,
    },
    scatter: {
      returns: false,
      simple: ["xs", "ys"],
      message: "plot scatter",
      colour: COLOR.PLOTTING,
    },
    title: {
      returns: false,
      simple: ["label"],
      message: "make plot's title",
      colour: COLOR.PLOTTING,
    },
    xlabel: {
      returns: false,
      simple: ["label"],
      message: "make plot's x-axis label",
      colour: COLOR.PLOTTING,
    },
    ylabel: {
      returns: false,
      simple: ["label"],
      message: "make plot's y-axis label",
      colour: COLOR.PLOTTING,
    },
  },
};
