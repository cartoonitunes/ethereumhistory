import { cx } from "../cx";
import { CopyButton } from "./CopyButton";
import { highlight } from "./highlight";

interface CodeBlockProps {
  code: string;
  lang?: string;
  caption?: string;
}

export function CodeBlock({ code, lang = "text", caption }: CodeBlockProps) {
  return (
    <figure className={cx("codeblock")}>
      <div className={cx("code-bar")}>
        {caption ? <figcaption>{caption}</figcaption> : <span aria-hidden="true" />}
        <CopyButton />
      </div>
      <pre>
        <code>{highlight(code, lang)}</code>
      </pre>
    </figure>
  );
}
