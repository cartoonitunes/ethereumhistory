import styles from "./erc20.module.css";

/**
 * Maps the document's semantic class names onto the scoped module.
 * The generated content files carry names like "ev ev--star"; this keeps
 * them readable there while the styles stay scoped to this route.
 */
export function cx(...names: (string | false | null | undefined)[]): string {
  const out: string[] = [];
  for (const group of names) {
    if (!group) continue;
    for (const name of group.split(/\s+/)) {
      if (!name) continue;
      const mapped = (styles as Record<string, string>)[name];
      if (mapped) out.push(mapped);
    }
  }
  return out.join(" ");
}
