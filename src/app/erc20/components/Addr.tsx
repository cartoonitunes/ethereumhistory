import Link from "next/link";
import { cx } from "../cx";

/**
 * A contract address in the document text. Always shown in full, never
 * truncated, and always a link into the archive's own record for it.
 */
export function Addr({ a }: { a: string }) {
  return (
    <Link href={`/contract/${a.toLowerCase()}`} className={cx("mono")} title={a}>
      {a}
    </Link>
  );
}
