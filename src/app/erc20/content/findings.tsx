// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";

export function Findings() {
  return (
    <>
      <p className={cx("eyebrow")}>
        What the reconstruction establishes
      </p>
      <h2>
        Findings
      </h2>
      <p className={cx("lede prose")}>
        Each row is a question with a single dated answer and a single artifact. The dates are not approximate.
      </p>
      <div className={cx("stats")} style={{ marginBottom: "2.5rem" }}>
        <div className={cx("stat")}>
          <b>19</b>
          <span>recovered body revisions of issue #20, eleven of them for the first time</span>
        </div>
        <div className={cx("stat")}>
          <b>54</b>
          <span>revisions of the wiki page that preceded it</span>
        </div>
        <div className={cx("stat")}>
          <b>0</b>
          <span>
            contracts implementing
            {" "}
            <span className={cx("mono")}>approve</span>
            {" "}
            or
            {" "}
            <span className={cx("mono")}>allowance</span>
            {" "}
            while the standard was being written
          </span>
        </div>
      </div>
      <TableScroll>
        <table className={cx("table--stack table--findings")}>
          <caption className={cx("vh")}>
            Findings of the reconstruction
          </caption>
          <thead>
            <tr>
              <th className={cx("num")}>#</th>
              <th>Question</th>
              <th>Answer (UTC)</th>
              <th>Artifact</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="#" className={cx("num")}>
                1
              </td>
              <td data-label="Question">
                All six methods and both events first co-exist anywhere
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                2015-11-20T15:53:42Z
              </td>
              <td data-label="Artifact">
                <span className={cx("mono")}>ethereum/EIPs</span>
                {" "}
                issue #20 body, revision 7. Prose spec, still carrying
                {" "}
                <span className={cx("mono")}>decimals</span>
                {" "}
                and
                {" "}
                <span className={cx("mono")}>unapprove</span>
                .
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                2
              </td>
              <td data-label="Question">
                First compilable Solidity containing all six and both events
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                2015-11-30T21:06:17Z
              </td>
              <td data-label="Artifact">
                ConsenSys/Tokens
                {" "}
                <span className={cx("mono")}>Token.sol</span>
                {" "}
                at
                {" "}
                <span className={cx("mono")}>4ba2396</span>
                . Still declares
                {" "}
                <span className={cx("mono")}>unapprove</span>
                .
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                3
              </td>
              <td data-label="Question">
                First file containing exactly the final interface, nothing extra
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                2015-12-21T15:55:57Z
              </td>
              <td data-label="Artifact">
                ConsenSys/Tokens
                {" "}
                <span className={cx("mono")}>Token.sol</span>
                {" "}
                at
                {" "}
                <span className={cx("mono")}>c3a3426</span>
                , “Derp. Approve is not a noun.”
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                4
              </td>
              <td data-label="Question">
                First time the specification itself states exactly the final interface
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                between 2016-01-06T10:12:13Z
                <br />
                and 2016-01-06T10:28:48Z
              </td>
              <td data-label="Artifact">
                Issue #20 body revision 15. The bound is the gap between two comments.
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                5
              </td>
              <td data-label="Question">
                Wiki mirrors the final interface
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                2016-01-06T10:48:26Z
              </td>
              <td data-label="Artifact">
                <span className={cx("mono")}>ethereum/wiki</span>
                {" "}
                <span className={cx("mono")}>02c64c1</span>
                {" "}
                by caktux, twenty minutes after the issue.
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                6
              </td>
              <td data-label="Question">
                Contracts deployed 2015-11-03 to 2016-01-06 implementing all six
              </td>
              <td data-label="Answer (UTC)">
                <strong>None.</strong>
                {" "}
                The maximum reached is three of six, and
                {" "}
                <span className={cx("mono")}>approve</span>
                {" "}
                and
                {" "}
                <span className={cx("mono")}>allowance</span>
                {" "}
                have
                {" "}
                <strong>zero</strong>
                {" "}
                instances by two independent detectors.
              </td>
              <td data-label="Artifact">
                3,062 contracts, 2,941 with runtime bytecode. Counted member by member under
                {" "}
                <a href="#onchain">What was deployed</a>
                .
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                7
              </td>
              <td data-label="Question">
                First contract on mainnet that
                {" "}
                <em>deploys the ERC-20 interface</em>
                , meaning all six selectors are present in its dispatcher
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                2016-01-10T00:21:08Z
                <br />
                block 824,235
              </td>
              <td data-label="Artifact">
                <span className={cx("mono")}>
                  <Addr a="0x99146Bab2bB34D9Ca49EC4f0c82De3E5789ae22e" />
                </span>
                , four days after the spec froze. It carries the interface and is not a token: supply reads zero at every block checked, and it has never emitted a
                {" "}
                <span className={cx("mono")}>Transfer</span>
                .
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                8
              </td>
              <td data-label="Question">
                First contract with the
                {" "}
                <em>interface and a real supply</em>
                , that is, the first that is a token rather than a bare interface
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                2016-01-14T15:22:33Z
                <br />
                block 847,527
              </td>
              <td data-label="Artifact">
                <span className={cx("mono")}>
                  <Addr a="0x55b9a11c2e8351b4Ffc7b11561148bfaC9977855" />
                </span>
                , Digix Gold 1.0. Supply 1,400,331,016,000 at the block after deployment, unchanged at every block sampled since. Not fully compliant with EIP-20; what breaks is in
                {" "}
                <a href="#compliance">the compliance table</a>
                .
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                9
              </td>
              <td data-label="Question">
                First ERC-20
                {" "}
                <span className={cx("mono")}>Transfer</span>
                {" "}
                event on mainnet
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                2016-01-27T16:54:44Z
                <br />
                block 913,198
              </td>
              <td data-label="Artifact">
                <span className={cx("mono")}>
                  <Addr a="0xa04bf47F0E9D1745D254b9B89f304c7d7ad121Aa" />
                </span>
                , elcoin. Deployer to another account, 1,000,000 units. Not a mint from the zero address, and not driven through the ERC-20 entry points, which do nothing.
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                10
              </td>
              <td data-label="Question">
                First contract whose dispatcher is exactly the six and nothing else
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                2016-01-28T14:01:48Z
                <br />
                block 917,622
              </td>
              <td data-label="Artifact">
                <span className={cx("mono")}>
                  <Addr a="0x37Dca38b1CBB2Cd043910eC46fe82Ddb9e38F00d" />
                </span>
                , 754 bytes. Nine of the ten requirements of EIP-20 as finalised, and all of the standard as it stood the day it was deployed.
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                11
              </td>
              <td data-label="Question">
                First contract
                {" "}
                <em>fully compliant with EIP-20 as finalised</em>
                , tested by execution against all ten requirements
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                2016-03-20T11:09:16Z
                <br />
                block 1,184,107
              </td>
              <td data-label="Artifact">
                <span className={cx("mono")}>
                  <Addr a="0xacFD9D15fA769EaBb68410c4c675Ff2030f26416" />
                </span>
                , 2,356 bytes. An ether wrapper:
                {" "}
                <span className={cx("mono")}>deposit()</span>
                {" "}
                mints,
                {" "}
                <span className={cx("mono")}>withdraw(uint256)</span>
                {" "}
                burns,
                {" "}
                <span className={cx("mono")}>totalSupply()</span>
                {" "}
                returns the contract's own ether balance.
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                12
              </td>
              <td data-label="Question">
                First fully compliant contract that is an
                {" "}
                <em>independently issued token</em>
                , rather than a wrapper over ether, and that was actually used
              </td>
              <td data-label="Answer (UTC)" className={cx("mono")}>
                2016-03-28T18:12:05Z
                <br />
                block 1,233,109
              </td>
              <td data-label="Artifact">
                <span className={cx("mono")}>
                  <Addr a="0xC66eA802717bFb9833400264Dd12c2bCeAa34a6d" />
                </span>
                ,
                {" "}
                <span className={cx("mono")}>DSTokenFrontend</span>
                {" "}
                from
                {" "}
                <span className={cx("mono")}>dapphub/dappsys</span>
                {" "}
                0.1.2. MakerDAO's original MKR. Eight days after the ether wrapper, and unlike it, in use ever since.
              </td>
            </tr>
            <tr>
              <td data-label="#" className={cx("num")}>
                13
              </td>
              <td data-label="Question">
                The source in the Foundation's 2015-12-03 tutorial
              </td>
              <td data-label="Answer (UTC)">
                Byte-identical to MistCoin's source
              </td>
              <td data-label="Artifact">
                Gist
                {" "}
                <span className={cx("mono")}>21935dc…</span>
                {" "}
                equals gist revision
                {" "}
                <span className={cx("mono")}>7bcfaef3</span>
                . Both compile to MistCoin's exact bytecode.
              </td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <div className={cx("callout")} style={{ marginTop: "2rem", maxWidth: "54rem" }}>
        On
        {" "}
        <strong>19 November 2015</strong>
        , the day issue #20 was filed and the date normally cited as the birth of ERC-20, the proposal contained four of the six methods, an
        {" "}
        <code>approve</code>
        {" "}
        that took no amount, no
        {" "}
        <code>allowance</code>
        , no
        {" "}
        <code>Approval</code>
        {" "}
        event, and five members that do not exist in the standard today:
        {" "}
        <code>decimals</code>
        ,
        {" "}
        <code>unapprove</code>
        ,
        {" "}
        <code>isApprovedFor</code>
        ,
        {" "}
        <code>approveOnce</code>
        {" "}
        and
        {" "}
        <code>isApprovedOnceFor</code>
        .
      </div>
    </>
  );
}
