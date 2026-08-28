// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";

export function Colophon() {
  return (
    <>
      <p>
        Compiled from primary sources. All timestamps UTC. Every claim on this page resolves to a commit SHA, a gist revision, a GitHub comment ID, a named GH Archive file or a block number, except where a section is explicitly marked as falling outside the corpus.
      </p>
      <p style={{ marginTop: "1.25rem" }}>
        Principal sources:
        {" "}
        <a href="https://github.com/ethereum/EIPs/issues/20" className={cx("ext")} target="_blank" rel="noopener noreferrer">
          ethereum/EIPs issue #20
        </a>
        {" "}
        ·
        {" "}
        <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs" className={cx("ext")} target="_blank" rel="noopener noreferrer">
          ethereum/wiki Standardized_Contract_APIs
        </a>
        {" "}
        ·
        {" "}
        <a href="https://github.com/ConsenSys/Tokens" className={cx("ext")} target="_blank" rel="noopener noreferrer">
          ConsenSys/Tokens
        </a>
        {" "}
        ·
        {" "}
        <a href="https://github.com/dapphub/erc20" className={cx("ext")} target="_blank" rel="noopener noreferrer">
          dapphub/erc20
        </a>
        {" "}
        ·
        {" "}
        <a href="https://www.gharchive.org/" className={cx("ext")} target="_blank" rel="noopener noreferrer">
          GH Archive
        </a>
      </p>
    </>
  );
}
