// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";

export function Hero() {
  return (
    <>
      <p className={cx("eyebrow")}>A primary-source reconstruction, 2015 to 2017</p>
      <h1>The History of ERC-20</h1>
      <div className={cx("hero-cols")}>
        <div className={cx("hero-lede")}>
          <p className={cx("lede")}>
            The interface now carried by every Ethereum token was assembled member by member between 17 June 2015, when the wiki page that became the proposal was created, and 6 January 2016, after which its text never changed again. EIP-20 was merged as Final twenty months after that, on 11 September 2017, by which time the interface it describes had been on mainnet for a year and eight months. The work is spread across a wiki page, a GitHub issue, a handful of gists, two sets of official documentation and one implementation repository. No single document contains its history. This page reconstructs it from the artifacts that survive.
          </p>
        </div>
        <div className={cx("hero-rest")}>
          <p className={cx("body-copy")}>
            The two members that define what ERC-20 is,
            {" "}
            <code>allowance</code>
            {" "}
            and
            {" "}
            <code>Approval</code>
            , arrived about thirty hours after the issue was filed and five months after the wiki page was started.
          </p>
          <p className={cx("body-copy")}>
            Carrying the six methods and behaving the way the standard requires are separate claims with separate dates. The first contract to deploy the interface appeared on 10 January 2016, four days after the text froze; the first to pair it with a real supply on 14 January; and the first to satisfy every requirement of EIP-20 as finalised on
            {" "}
            <strong>20 March 2016</strong>
            . That last one was established by running the contracts, not by reading them.
          </p>
        </div>
      </div>
      <dl className={cx("hero-meta")}>
        <div>
          <dt>Sources</dt>
          <dd>
            GH Archive hourly event dumps, the
            {" "}
            <span className={cx("mono")}>ethereum/wiki</span>
            {" "}
            git history, the GitHub gist history API, full clones of the relevant contract repositories, and a local export of mainnet
            {" "}
            <span className={cx("mono")}>create</span>
            {" "}
            traces.
          </dd>
        </div>
        <div>
          <dt>Recovered</dt>
          <dd>
            19 body revisions of issue #20, eleven of them reconstructed here for the first time from events that embed the issue body.
          </dd>
        </div>
        <div>
          <dt>Timestamps</dt>
          <dd>
            All UTC. Author dates, not committer dates. Where a source records a local offset, the UTC conversion is shown.
          </dd>
        </div>
        <div>
          <dt>Standard of proof</dt>
          <dd>
            Every claim resolves to a commit SHA, a gist revision, a GitHub comment ID, a named GH Archive file, or a block number.
          </dd>
        </div>
      </dl>
    </>
  );
}
