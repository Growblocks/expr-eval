import {
  INUMBER,
  IOP1,
  IOP2,
  IOP3,
  IVAR,
  IVARNAME,
  IFUNCALL,
  IFUNDEF,
  IEXPR,
  IMEMBER,
  IENDSTATEMENT,
  IARRAY,
} from "./instruction";

export default function expressionToSQL(tokens) {
  var nstack = [];
  var n1, n2, n3;
  var f, args, argCount;
  for (var i = 0; i < tokens.length; i++) {
    var item = tokens[i];
    var type = item.type;
    if (type === INUMBER) {
      if (typeof item.value === "number" && item.value < 0) {
        nstack.push("(" + item.value + ")");
      } else if (Array.isArray(item.value)) {
        nstack.push("[" + item.value.map(escapeValue).join(", ") + "]");
      } else {
        nstack.push(escapeValue(item.value));
      }
    } else if (type === IOP2) {
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = item.value;
      if (f === "^") {
        nstack.push(`POWER(${n1}, ${n2})`);
      } else if (f === "and") {
        nstack.push(`(${n1} AND ${n2})`);
      } else if (f === "or") {
        nstack.push(`(${n1} OR ${n2})`);
      } else {
        nstack.push(`(${n1} ${f} ${n2})`);
      }
    } else if (type === IOP3) {
      n3 = nstack.pop();
      n2 = nstack.pop();
      n1 = nstack.pop();
      f = item.value;
      if (f === "?") {
        nstack.push(`CASE WHEN ${n1} THEN ${n2} ELSE ${n3} END`);
      } else {
        throw new Error("Invalid Expression");
      }
    } else if (type === IVAR || type === IVARNAME) {
      nstack.push(item.value);
    } else if (type === IOP1) {
      n1 = nstack.pop();
      f = item.value;
      if (f === "-" || f === "+") {
        nstack.push(`(${f}${n1})`);
      } else if (f === "not") {
        nstack.push(`(NOT ${n1})`);
      } else {
        nstack.push(`${f}(${n1})`);
      }
    } else if (type === IFUNCALL) {
      argCount = item.value;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop());
      }
      f = nstack.pop();
      nstack.push(`${f}(${args.join(", ")})`);
    } else if (type === IFUNDEF) {
      n2 = nstack.pop();
      argCount = item.value;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop());
      }
      n1 = nstack.pop();
      nstack.push(`(${n1}(${args.join(", ")}) = ${n2})`);
    } else if (type === IMEMBER) {
      n1 = nstack.pop();
      nstack.push(`${n1}.${item.value}`);
    } else if (type === IARRAY) {
      argCount = item.value;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop());
      }
      nstack.push(`[${args.join(", ")}]`);
    } else if (type === IEXPR) {
      nstack.push(`(${expressionToSQL(item.value)})`);
    } else if (type === IENDSTATEMENT) {
      // no-op
    } else {
      throw new Error("Invalid Expression");
    }
  }
  if (nstack.length > 1) {
    nstack = [nstack.join(";")];
  }
  return String(nstack[0]);
}

function escapeValue(v) {
  if (typeof v === "string") {
    return JSON.stringify(v)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }
  return v;
}
