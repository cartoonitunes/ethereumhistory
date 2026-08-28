// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";

export function Members() {
  return (
    <>
      <p className={cx("eyebrow")}>
        Method by method
      </p>
      <h2>
        When each member appeared
      </h2>
      <p className={cx("lede prose")}>
        Seven of the eight members are renames of something older. One,
        {" "}
        <code>totalSupply</code>
        , is newly invented. The two that define the standard are the last to arrive.
      </p>
      <TableScroll>
        <table className={cx("table--stack")}>
          <thead>
            <tr>
              <th>Member</th>
              <th>First public appearance (UTC)</th>
              <th>Author</th>
              <th>Artifact</th>
              <th>Replaced</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                balanceOf
              </td>
              <td data-label="First public appearance (UTC)" className={cx("mono")}>
                2015-10-04T15:07:06Z
              </td>
              <td data-label="Author">
                Gav Wood
              </td>
              <td data-label="Artifact">
                <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/607b6ac9c090c45c10e05a00c172793811d02621" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                  ethereum/wiki 607b6ac
                </a>
              </td>
              <td data-label="Replaced" className={cx("mono")}>
                coinBalanceOf
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                Transfer (event)
              </td>
              <td data-label="First public appearance (UTC)" className={cx("mono")}>
                2015-10-04T15:07:06Z
              </td>
              <td data-label="Author">
                Gav Wood
              </td>
              <td data-label="Artifact">
                Same commit
              </td>
              <td data-label="Replaced" className={cx("mono")}>
                CoinTransfer
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                transfer
              </td>
              <td data-label="First public appearance (UTC)" className={cx("mono")}>
                2015-10-06T12:57:06Z
              </td>
              <td data-label="Author">
                Simon de la Rouviere
              </td>
              <td data-label="Artifact">
                <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/bfc39cb5edefe8d40b3b4056de7ccb49eb1dbc4e" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                  ethereum/wiki bfc39cb
                </a>
              </td>
              <td data-label="Replaced" className={cx("mono")}>
                sendCoin
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                transferFrom
              </td>
              <td data-label="First public appearance (UTC)" className={cx("mono")}>
                2015-10-06T12:57:30Z
              </td>
              <td data-label="Author">
                Simon de la Rouviere
              </td>
              <td data-label="Artifact">
                <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/9721a6be9f6207629d0c58f349aa90ce5890cd13" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                  ethereum/wiki 9721a6b
                </a>
              </td>
              <td data-label="Replaced">
                <span className={cx("mono")}>sendCoinFrom</span>
                , via the typo
                {" "}
                <span className={cx("mono")}>trasnferFrom</span>
                {" "}
                24 seconds earlier
              </td>
            </tr>
            <tr>
              <td data-label="Member">
                final
                {" "}
                <span className={cx("mono")}>transfer</span>
                {" "}
                /
                {" "}
                <span className={cx("mono")}>transferFrom</span>
                {" "}
                signatures
              </td>
              <td data-label="First public appearance (UTC)" className={cx("mono")}>
                2015-10-28T13:44:47Z
              </td>
              <td data-label="Author">
                Fabian Vogelsteller
              </td>
              <td data-label="Artifact">
                <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/0627f2404a6f031d523e263e65cbf0353769f6b1" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                  ethereum/wiki 0627f24
                </a>
              </td>
              <td data-label="Replaced">
                Parameter order reversed
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                totalSupply
              </td>
              <td data-label="First public appearance (UTC)" className={cx("mono")}>
                2015-11-18T08:59:46Z
              </td>
              <td data-label="Author">
                frozeman
              </td>
              <td data-label="Artifact">
                <a href="https://gist.github.com/frozeman/090ae32041bcfe120824/e7abcdde39e2ba576a170b07e06c5f84017dc267" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                  gist e7abcdd
                </a>
              </td>
              <td data-label="Replaced">
                Newly invented
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                approve(address,uint256)
              </td>
              <td data-label="First public appearance (UTC)" className={cx("mono")}>
                2015-11-19T19:07:35Z
              </td>
              <td data-label="Author">
                frozeman
              </td>
              <td data-label="Artifact">
                Issue #20 revision 5
              </td>
              <td data-label="Replaced" className={cx("mono")}>
                approve(address)
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                allowance
              </td>
              <td data-label="First public appearance (UTC)" className={cx("mono")}>
                2015-11-20T15:53:42Z
              </td>
              <td data-label="Author">
                frozeman
              </td>
              <td data-label="Artifact">
                Issue #20 revision 7
              </td>
              <td data-label="Replaced" className={cx("mono")}>
                isApprovedFor
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                Approval (event)
              </td>
              <td data-label="First public appearance (UTC)" className={cx("mono")}>
                2015-11-20T15:53:42Z
              </td>
              <td data-label="Author">
                frozeman
              </td>
              <td data-label="Artifact">
                Issue #20 revision 7
              </td>
              <td data-label="Replaced" className={cx("mono")}>
                AddressApproval
              </td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <h3 className={cx("sub sub--gap")}>
        Members that existed and were removed
      </h3>
      <TableScroll>
        <table className={cx("table--stack")}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Present from</th>
              <th>Removed</th>
              <th>Where</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                decimals()
              </td>
              <td data-label="Present from" className={cx("mono")}>
                2015-11-19T09:52:56Z, issue #20 revision 1
              </td>
              <td data-label="Removed" className={cx("mono")}>
                2015-11-26T10:34:22Z, revision 11
              </td>
              <td data-label="Where">
                Voted out on the wiki poll
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                unapprove()
              </td>
              <td data-label="Present from">
                Wiki 2015-09-02, as
                {" "}
                <span className={cx("mono")}>disapprove</span>
                {" "}
                from 2015-08-24
              </td>
              <td data-label="Removed" className={cx("mono")}>
                2016-01-06 in the issue, 2015-12-21 in code
              </td>
              <td data-label="Where">
                Removed when
                {" "}
                <span className={cx("mono")}>approve</span>
                {" "}
                became absolute
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                approveOnce / isApprovedOnceFor
              </td>
              <td data-label="Present from">
                Wiki 2015-06-18 and 2015-08-24
              </td>
              <td data-label="Removed" className={cx("mono")}>
                2015-11-19T19:07:35Z, revision 5
              </td>
              <td data-label="Where">
                Merged into a capped
                {" "}
                <span className={cx("mono")}>approve</span>
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                isApproved
              </td>
              <td data-label="Present from">
                Wiki 2015-06-18
              </td>
              <td data-label="Removed">
                Wiki 2015-09-06
              </td>
              <td data-label="Where" />
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                AddressApproval, AddressApprovalOnce
              </td>
              <td data-label="Present from">
                Wiki 2015-08-24
              </td>
              <td data-label="Removed">
                Issue #20 revision 7
              </td>
              <td data-label="Where">
                Replaced by
                {" "}
                <span className={cx("mono")}>Approval</span>
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                Approved, Unapproved
              </td>
              <td data-label="Present from">
                Issue #20 revision 13, 2015-12-02
              </td>
              <td data-label="Removed" className={cx("mono")}>
                2016-01-06
              </td>
              <td data-label="Where">
                Short-lived regression
              </td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <div className={cx("callout")} style={{ marginTop: "2rem", maxWidth: "54rem" }}>
        The elapsed time from the first final name (
        <code>balanceOf</code>
        , 4 October 2015) to the last (
        <code>allowance</code>
        {" "}
        and
        {" "}
        <code>Approval</code>
        , 20 November 2015) is
        {" "}
        <strong>47 days</strong>
        . The elapsed time from the creation of the wiki page to the last is
        {" "}
        <strong>5 months and 3 days</strong>
        . Almost all of the interface's design happened in a seven-week span, and the decisive part of it in about thirty hours.
      </div>
    </>
  );
}
