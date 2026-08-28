"use client";

import { useRef, useState } from "react";
import { cx } from "../cx";

/**
 * Copies the sibling <pre>. Reading the text out of the DOM rather than
 * taking it as a prop keeps the code itself off the client bundle.
 */
export function CopyButton() {
  const ref = useRef<HTMLButtonElement>(null);
  const [done, setDone] = useState(false);

  async function copy() {
    const figure = ref.current?.closest("figure");
    const text = figure?.querySelector("pre")?.textContent ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={copy}
      className={cx("copy")}
      data-done={done ? "1" : undefined}
      aria-label="Copy code to clipboard"
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}
