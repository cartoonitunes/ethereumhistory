import type { ReactNode } from "react";
import { cx } from "../cx";

/*
  Declaration and control words carry the emphasis. Types get their own,
  quieter colour: in this dialect nearly every other token is a type, and one
  accent across the whole block reads as noise.
*/
const KW =
  "\\b(contract|library|interface|function|event|modifier|constructor|returns|constant|public|private|internal|external|payable|indexed|if|else|for|while|throw|revert|return|import|is|new|this|def|and|or|not|in)\\b";
const TY =
  "\\b(mapping|struct|enum|var|memory|storage|calldata|address|bool|string|bytes|bytes32|uint|uint8|uint256|int|int256|true|false|set|len)\\b";

const TOKEN = new RegExp(
  "(\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*|#[^\\n]*)" + // 1 comment
    "|(\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*')" + // 2 string
    "|(\\b0x[0-9a-fA-F]+\\b|\\b\\d[\\d_]*\\b)" + // 3 number
    "|" +
    KW + // 4 keyword
    "|" +
    TY, // 5 type
  "g",
);

const CLASS_FOR_GROUP = ["c-com", "c-str", "c-num", "c-kw", "c-typ"];

function tokenize(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN.exec(code)) !== null) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const group = m.slice(1).findIndex(Boolean);
    out.push(
      <span key={key++} className={cx(CLASS_FOR_GROUP[group])}>
        {m[group + 1]}
      </span>,
    );
    last = TOKEN.lastIndex;
    if (m.index === TOKEN.lastIndex) TOKEN.lastIndex++;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

function diffify(code: string): ReactNode[] {
  return code.split("\n").map((line, i) => {
    const nl = i > 0 ? "\n" : "";
    if (/^\+\+\+|^---|^@@|^diff |^index /.test(line)) {
      return (
        <span key={i} className={cx("d-hd")}>
          {nl + line}
        </span>
      );
    }
    if (line.startsWith("+")) {
      return (
        <span key={i} className={cx("d-add")}>
          {nl + line}
        </span>
      );
    }
    if (line.startsWith("-")) {
      return (
        <span key={i} className={cx("d-del")}>
          {nl + line}
        </span>
      );
    }
    return nl + line;
  });
}

/** Highlighting runs on the server, so no highlighter reaches the browser. */
export function highlight(code: string, lang: string): ReactNode[] {
  if (lang === "diff") return diffify(code);
  if (lang === "text") return [code];
  return tokenize(code);
}
