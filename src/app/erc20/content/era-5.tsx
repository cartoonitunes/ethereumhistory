// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";
import { TimelineEra, TimelineEvent } from "../components/Timeline";

export function Era5() {
  return (
    <>
      <TimelineEra
        id="era-5"
        span={"7 December 2016 – 29 September 2017"}
        title={"Formal adoption"}
        blurb={
          <>
            The events that turn a GitHub issue into a numbered, merged, Final standard. The first three fall outside the corpus this page is built from and are marked as such, with dashed markers, so that nothing here is mistaken for evidence gathered in the same way as everything above. The fourth is from the ethereum.org clone and carries its commit.
          </>
        }
      >
        <TimelineEvent
          id="ev-an-erc-category-is-created-in-eip-1"
          src="eips"
          outOfCorpus
          date={"2016-12-07"}
          times={[]}
          mobileWhen={"2016-12-07"}
          title={"An “ERC” category is created in EIP-1"}
          tags={[{ label: "outside the corpus", actor: false }, { label: "no artifact held", actor: false }]}
          summary={
            <>
            Hudson Jameson adds ERC as a category to the EIP process document, giving the label the standard had been using informally for thirteen months an official definition.
            {" "}
            <em>Not evidenced by this corpus.</em>
            </>
          }
        >
          <div className={cx("callout callout--warn")}>
            <strong>No artifact for this event is held in the collection behind this page.</strong>
            {" "}
            The reconstruction covers
            {" "}
            <span className={cx("mono")}>ethereum/EIPs</span>
            {" "}
            issue #20, the wiki, the gists, the implementation repositories and the onchain corpus, through late 2016. It contains no EIP-1 revision history and no pull request data. The date and description above are supplied context, not a finding, and carry no citation because there is no primary source here to cite.
          </div>
          <p>
            Note the ordering it implies, which the rest of this page does support: the term “ERC” was in use in a commit message from 25 January 2016, in a repository name from 24 April 2016, and in the issue's own header block from 19 November 2015. The category is defined last.
          </p>
        </TimelineEvent>
        <TimelineEvent
          id="ev-fabian-vogelsteller-submits-the-standard-as-a-pull-request"
          src="eips"
          outOfCorpus
          date={"2017-04-24"}
          times={[]}
          mobileWhen={"2017-04-24"}
          title={"Fabian Vogelsteller submits the standard as a pull request"}
          tags={[{ label: "outside the corpus", actor: false }, { label: "no artifact held", actor: false }]}
          summary={
            <>
            Pull request #610 against
            {" "}
            <span className={cx("mono")}>ethereum/EIPs</span>
            , moving the text out of the issue and into a file in the repository. Seventeen months after the issue was opened.
            {" "}
            <em>Not evidenced by this corpus.</em>
            </>
          }
        >
          <div className={cx("callout callout--warn")}>
            <strong>No artifact for this event is held in the collection behind this page.</strong>
            {" "}
            The corpus holds 285 GH Archive events for issue #20 and 479 for the repository as a whole, all from 2015 and 2016, plus the comment index. It holds no pull request records. The date and number above are supplied context, not a finding.
          </div>
          <p>
            What this page does establish about the same interval is that nothing in the text changed after 29 November 2016, so whatever was submitted in April 2017 was a document that had been stable for months.
          </p>
        </TimelineEvent>
        <TimelineEvent
          id="ev-merged-as-final"
          src="eips"
          outOfCorpus
          date={"2017-09-11"}
          times={[]}
          mobileWhen={"2017-09-11"}
          title={"Merged as Final"}
          tags={[{ label: "outside the corpus", actor: false }, { label: "no artifact held", actor: false }]}
          summary={
            <>
            EIP-20 reaches Final status, one year and ten months after issue #20 was opened, and one year and eight months after the interface it describes stopped changing.
            {" "}
            <em>Not evidenced by this corpus.</em>
            </>
          }
        >
          <div className={cx("callout callout--warn")}>
            <strong>No artifact for this event is held in the collection behind this page.</strong>
            {" "}
            The date above is supplied context, not a finding.
          </div>
          <p>
            Placed against the dated findings on this page, the interval is the point. The specification's text froze on 6 January 2016. The first mainnet contract carrying the six selectors appeared on 10 January 2016, and the first that was actually a token on 14 January 2016. A thousand and fourteen contracts carried all six methods before the end of 2016. The formal status arrived after all of that.
          </p>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-word-erc20-reaches-ethereum-org-as-a-filename"
          src="guide"
          star
          date={"2017-09-29"}
          times={["21:22:55Z"]}
          mobileWhen={"2017-09-29 · 21:22:55Z"}
          title={"The word ERC20 reaches ethereum.org, as a filename"}
          tags={[{ label: "Alex Van de Sande", actor: true }, { label: "ethereum/ethereum-org", actor: false }, { label: "first naming", actor: false }]}
          summary={
            <>
            Commit “Separate solidity files” moves the inline contracts into
            {" "}
            <span className={cx("mono")}>solidity/</span>
            , one of them named
            {" "}
            <span className={cx("mono")}>token-erc20.sol</span>
            . It is the first and only occurrence of the string in the repository, eighteen days after EIP-20 became Final.
            </>
          }
        >
          <p>
            Searching the whole repository across all 1,210 commits from 2015-03-07 to 2019-04-17:
          </p>
          <TableScroll>
            <table>
              <thead>
                <tr>
                  <th>String</th>
                  <th>First commit that introduces it</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="String" className={cx("mono")}>
                    ERC20
                  </td>
                  <td data-label="First commit that introduces it" className={cx("mono")}>
                    298cb09, 2017-09-29, in the filename
                    {" "}
                    <span className={cx("mono")}>solidity/token-erc20.sol</span>
                  </td>
                </tr>
                <tr>
                  <td data-label="String" className={cx("mono")}>
                    ERC-20
                  </td>
                  <td data-label="First commit that introduces it">
                    <strong>never</strong>
                  </td>
                </tr>
                <tr>
                  <td data-label="String" className={cx("mono")}>
                    ERC 20
                  </td>
                  <td data-label="First commit that introduces it">
                    <strong>never</strong>
                  </td>
                </tr>
                <tr>
                  <td data-label="String" className={cx("mono")}>
                    EIPs/issues/20
                  </td>
                  <td data-label="First commit that introduces it">
                    <strong>never</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p>
            And in
            {" "}
            <span className={cx("mono")}>views/content/token.md</span>
            {" "}
            itself, the page a reader actually saw, the substring
            {" "}
            <span className={cx("mono")}>ERC</span>
            {" "}
            never appears in any of its 117 revisions, through the last commit in the repository.
          </p>
          <div className={cx("callout")}>
            <strong>The Ethereum Foundation's own token page never named the standard in prose.</strong>
            {" "}
            It linked the wiki as the “Meta coin standard” from July to December 2015, then linked nothing. The only place ERC20 is written anywhere on the site is a Solidity filename, added eighteen days after EIP-20 reached Final status on 11 September 2017.
          </div>
          <p>
            That closes the loop with the Frontier Guide. Neither of the Foundation's two documentation properties adopted the name while the standard was being written, and only one of them ever adopted the interface.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ethereum/ethereum-org/commit/298cb09" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ethereum-org 298cb09 · Separate solidity files (#693)
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Author date</span>
              <span className={cx("val mono")}>2017-09-29 18:22:55 -0300</span>
            </li>
            <li>
              <span className={cx("lbl")}>Method</span>
              <span className={cx("val mono")}>
                {"git log --all -S\"<string>\" over the full clone; and a scan of all 117 revisions of views/content/token.md for the substring ERC"}
              </span>
            </li>
          </ul>
        </TimelineEvent>
      </TimelineEra>
    </>
  );
}
