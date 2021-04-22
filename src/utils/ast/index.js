import { add_ast_AnnAssign } from "./ast_AnnAssign";
import { add_ast_Assert } from "./ast_Assert";
import { add_ast_Assign } from "./ast_Assign";
import { add_ast_Attribute } from "./ast_Attribute";
import { add_ast_AugAssign } from "./ast_AugAssign";
import { add_ast_BinOp } from "./ast_BinOp";
import { add_ast_BoolOp } from "./ast_BoolOp";
import { add_ast_Break } from "./ast_Break";
import { add_ast_Call } from "./ast_Call";
import { add_ast_ClassDef } from "./ast_ClassDef";
import { add_ast_Comment } from "./ast_Comment";
import { add_ast_Compare } from "./ast_Compare";
import { add_ast_Comp } from "./ast_Comp";
import { add_ast_Continue } from "./ast_Continue";
import { add_ast_Delete } from "./ast_Delete";
import { add_ast_Dict } from "./ast_Dict";
import { add_ast_Expr } from "./ast_Expr";
import { add_ast_For } from "./ast_For";
import { add_ast_FunctionDef } from "./ast_FunctionDef";
import { add_ast_Global } from "./ast_Global";
import { add_ast_IfExp } from "./ast_IfExp";
import { add_ast_If } from "./ast_If";
import { add_ast_Import } from "./ast_Import";
import { add_ast_Lambda } from "./ast_Lambda";
import { add_ast_List } from "./ast_List";
import { add_ast_NameConstant } from "./ast_NameConstant";
import { add_ast_Name } from "./ast_Name";
import { add_ast_Nonlocal } from "./ast_Nonlocal";
import { add_ast_Num } from "./ast_Num";
import { add_ast_Raise } from "./ast_Raise";
import { add_ast_Raw } from "./ast_Raw";
import { add_ast_Return } from "./ast_Return";
import { add_ast_Set } from "./ast_Set";
import { add_ast_Starred } from "./ast_Starred";
import { add_ast_Str } from "./ast_Str";
import { add_ast_Subscript } from "./ast_Subscript";
import { add_ast_Try } from "./ast_Try";
import { add_ast_Tuple } from "./ast_Tuple";
import { add_ast_UnaryOp } from "./ast_UnaryOp";
import { add_ast_While } from "./ast_While";
import { add_ast_With } from "./ast_With";
import { add_ast_YieldFrom } from "./ast_YieldFrom";
import { add_ast_Yield } from "./ast_Yield";

const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

export const addAstTypes = pipe(
  add_ast_AnnAssign,
  add_ast_Assert,
  add_ast_Assign,
  add_ast_Attribute,
  add_ast_AugAssign,
  add_ast_BinOp,
  add_ast_BoolOp,
  add_ast_Break,
  add_ast_Call,
  add_ast_ClassDef,
  add_ast_Comment,
  add_ast_Compare,
  add_ast_Comp,
  add_ast_Continue,
  add_ast_Delete,
  add_ast_Dict,
  add_ast_Expr,
  add_ast_For,
  add_ast_FunctionDef,
  add_ast_Global,
  add_ast_IfExp,
  add_ast_If,
  add_ast_Import,
  add_ast_Lambda,
  add_ast_List,
  add_ast_NameConstant,
  add_ast_Name,
  add_ast_Nonlocal,
  add_ast_Num,
  add_ast_Raise,
  add_ast_Raw,
  add_ast_Return,
  add_ast_Set,
  add_ast_Starred,
  add_ast_Str,
  add_ast_Subscript,
  add_ast_Try,
  add_ast_Tuple,
  add_ast_UnaryOp,
  add_ast_While,
  add_ast_With,
  add_ast_YieldFrom,
  add_ast_Yield
);
