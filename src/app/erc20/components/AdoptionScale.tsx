import { cx } from "../cx";
import { TableScroll } from "./TableScroll";

/*
  Not generated. The rest of the page comes from the research document, whose
  onchain corpus stops at the end of 2016; this section carries it forward to
  the date the standard was actually ratified, using Ethereum History's own
  index. Its numbers are counted here, so they are stated here.
*/

/**
 * Contracts whose runtime bytecode contains all six ERC-20 selectors,
 * by substring match over the runtime hex:
 *
 *   totalSupply()                              18160ddd
 *   balanceOf(address)                         70a08231
 *   transfer(address,uint256)                  a9059cbb
 *   transferFrom(address,address,uint256)      23b872dd
 *   approve(address,uint256)                   095ea7b3
 *   allowance(address,address)                 dd62ed3e
 *
 * That is the method §21.7 of the research settled on, because unlike an
 * opcode walk it cannot desynchronise on contracts with data in the blob.
 */
const BY_YEAR = [
  { year: "2015", indexed: 6_024, allSix: 0, note: "None. The interface did not exist yet." },
  {
    year: "2016",
    indexed: 24_113,
    allSix: 726,
    note: "The research counts 1,014 over a full export of mainnet create traces.",
  },
  {
    year: "2017",
    indexed: 159_938,
    allSix: 7_569,
    note: "The year the standard was merged, and the year adoption became ordinary.",
  },
];

export function AdoptionScale() {
  return (
    <>
      <p className={cx("eyebrow")}>Scale</p>
      <h2>How many tokens, and when</h2>
      <p className={cx("lede")}>
        The standard was ratified on 11 September 2017. Thousands of contracts were
        already implementing it.
      </p>

      <div className={cx("stats")} style={{ marginBottom: "2.5rem" }}>
        <div className={cx("stat")}>
          <b>0</b>
          <span>contracts carrying all six in 2015, the year the wiki page was started</span>
        </div>
        <div className={cx("stat")}>
          <b>1,014</b>
          <span>in 2016, the first four days after the specification stopped moving</span>
        </div>
        <div className={cx("stat")}>
          <b>3,460</b>
          <span>
            already deployed by <span className={cx("mono")}>2017-09-11</span>, the day
            it was merged as Final
          </span>
        </div>
        <div className={cx("stat")}>
          <b>7,569</b>
          <span>through the end of 2017, in this archive&rsquo;s index alone</span>
        </div>
      </div>

      <TableScroll>
        <table className={cx("table--stack")}>
          <thead>
            <tr>
              <th>Year</th>
              <th className={cx("num")}>Contracts indexed</th>
              <th className={cx("num")}>All six members</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {BY_YEAR.map((row) => (
              <tr key={row.year}>
                <td data-label="Year" className={cx("mono")}>
                  {row.year}
                </td>
                <td data-label="Contracts indexed" className={cx("num")}>
                  {row.indexed.toLocaleString("en-US")}
                </td>
                <td data-label="All six members" className={cx("num")}>
                  <strong>{row.allSix.toLocaleString("en-US")}</strong>
                </td>
                <td data-label="Note">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>

      <p className={cx("tnote")}>
        Counted over Ethereum History&rsquo;s contract index by substring match on the
        six selectors, the same test the research uses.
      </p>

      <h3 className={cx("sub sub--gap")}>The gap between use and ratification</h3>
      <div className={cx("prose")}>
        <p>
          The specification stopped moving on 6 January 2016. The first contract carrying
          all six members appeared four days later. The pull request that turned the
          GitHub issue into a file was opened on 24 April 2017, sixteen months after that,
          and it was merged as Final on 11 September 2017, twenty months after.
        </p>
        <p>
          By the day of the merge this archive already holds 3,460 contracts carrying the
          complete interface, of which 1,653 predate the pull request that first wrote the
          specification down as a document. Whatever the standard did for Ethereum, it did
          not do it by being ratified. It was in use for the better part of two years
          before anyone finished the paperwork, and the timeline above is the record of
          people agreeing on it in the open, one rename at a time, without waiting.
        </p>
      </div>

      <div className={cx("callout callout--warn")} style={{ marginTop: "2rem" }}>
        <strong>These are floors, not totals.</strong> The counts come from the contracts
        this archive has indexed, which is not every contract ever created. For 2016 the
        test finds 726 where the research&rsquo;s own export of mainnet create traces finds
        1,014: the two agree on 723 of the 726, so the method matches and the coverage does
        not. The archive holds roughly seven in ten of the 2016 set, so the 2017 figures
        here should be read as lower bounds on a larger number, not as a census.
      </div>
    </>
  );
}
