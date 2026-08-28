// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";

export function Onchain() {
  return (
    <>
      <p className={cx("eyebrow")}>
        3 November 2015 to 6 January 2016
      </p>
      <h2>
        What was deployed
      </h2>
      <p className={cx("lede prose")}>
        This is the empirical test the documentary trail cannot supply. While the standard was being written, what went on mainnet? Every
        {" "}
        <span className={cx("mono")}>create</span>
        {" "}
        trace in the window was collected and every runtime blob decoded.
      </p>
      <div className={cx("stats")} style={{ marginBottom: "2.5rem" }}>
        <div className={cx("stat")}>
          <b>3,062</b>
          <span>contracts created in the window</span>
        </div>
        <div className={cx("stat")}>
          <b>2,941</b>
          <span>with runtime bytecode</span>
        </div>
        <div className={cx("stat")}>
          <b>320</b>
          <span>carrying any token vocabulary</span>
        </div>
        <div className={cx("stat")}>
          <b>3</b>
          <span>highest count of the six reached by any of them</span>
        </div>
      </div>
      <div className={cx("split")}>
        <div>
          <h3 className={cx("sub")}>
            Coverage of the final six
          </h3>
          <TableScroll>
            <table>
              <thead>
                <tr>
                  <th>Members present</th>
                  <th className={cx("num")}>Contracts</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Members present" className={cx("mono")}>
                    0
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    82
                  </td>
                </tr>
                <tr>
                  <td data-label="Members present" className={cx("mono")}>
                    1
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    83
                  </td>
                </tr>
                <tr>
                  <td data-label="Members present" className={cx("mono")}>
                    2
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    145
                  </td>
                </tr>
                <tr>
                  <td data-label="Members present" className={cx("mono")}>
                    3
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    10
                  </td>
                </tr>
                <tr>
                  <td data-label="Members present" className={cx("mono")}>
                    4
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    <strong>0</strong>
                  </td>
                </tr>
                <tr>
                  <td data-label="Members present" className={cx("mono")}>
                    5
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    <strong>0</strong>
                  </td>
                </tr>
                <tr>
                  <td data-label="Members present" className={cx("mono")}>
                    6
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    <strong>0</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            No contract deployed to Ethereum mainnet between 3 November 2015 and 6 January 2016 implements more than three of the six ERC-20 methods.
          </p>
        </div>
        <div>
          <h3 className={cx("sub")}>
            Frequency of each member
          </h3>
          <TableScroll>
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th className={cx("num")}>Contracts</th>
                  <th>Share of the 320</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Member" className={cx("mono")}>
                    balanceOf(address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    207
                  </td>
                  <td data-label="Share of the 320">
                    <span className={cx("bar")}>
                      <span className={cx("bar-track")}>
                        <span className={cx("bar-fill")} style={{ width: "64.7%" }} />
                      </span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td data-label="Member" className={cx("mono")}>
                    transfer(address,uint256)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    185
                  </td>
                  <td data-label="Share of the 320">
                    <span className={cx("bar")}>
                      <span className={cx("bar-track")}>
                        <span className={cx("bar-fill")} style={{ width: "57.8%" }} />
                      </span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td data-label="Member" className={cx("mono")}>
                    transferFrom(…)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    10
                  </td>
                  <td data-label="Share of the 320">
                    <span className={cx("bar")}>
                      <span className={cx("bar-track")}>
                        <span className={cx("bar-fill")} style={{ width: "3.1%" }} />
                      </span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td data-label="Member" className={cx("mono")}>
                    totalSupply()
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    <strong>1</strong>
                  </td>
                  <td data-label="Share of the 320">
                    <span className={cx("bar")}>
                      <span className={cx("bar-track")}>
                        <span className={cx("bar-fill")} style={{ width: "0.3%" }} />
                      </span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td data-label="Member" className={cx("mono")}>
                    approve(address,uint256)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    <strong>0</strong>
                  </td>
                  <td data-label="Share of the 320">
                    <span className={cx("bar")}>
                      <span className={cx("bar-track")} />
                    </span>
                  </td>
                </tr>
                <tr>
                  <td data-label="Member" className={cx("mono")}>
                    allowance(address,address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    <strong>0</strong>
                  </td>
                  <td data-label="Share of the 320">
                    <span className={cx("bar")}>
                      <span className={cx("bar-track")} />
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
        </div>
      </div>
      <div className={cx("callout")} style={{ margin: "2.5rem 0", maxWidth: "56rem" }}>
        <strong>
          Nothing in the window emits
          {" "}
          <code>Approval</code>
          . Nothing in the window implements
          {" "}
          <code>approve(address,uint256)</code>
          {" "}
          or
          {" "}
          <code>allowance(address,address)</code>
          .
        </strong>
        {" "}
        The allowance model, the half of ERC-20 that makes exchanges and later DeFi possible, and the half that consumed almost all of the argument on issue #20, has zero deployed instances during the period in which it was being specified.
      </div>
      <div className={cx("split")}>
        <div>
          <h3 className={cx("sub")}>
            The optional three, and the events
          </h3>
          <TableScroll>
            <table>
              <thead>
                <tr>
                  <th>Member or topic</th>
                  <th className={cx("num")}>Contracts</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Member or topic" className={cx("mono")}>
                    name()
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    172
                  </td>
                </tr>
                <tr>
                  <td data-label="Member or topic" className={cx("mono")}>
                    symbol()
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    142
                  </td>
                </tr>
                <tr>
                  <td data-label="Member or topic" className={cx("mono")}>
                    decimals()
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    140
                  </td>
                </tr>
                <tr>
                  <td data-label="Member or topic" className={cx("mono")}>
                    Transfer(address,address,uint256)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    154
                  </td>
                </tr>
                <tr>
                  <td data-label="Member or topic" className={cx("mono")}>
                    CoinTransfer(address,address,uint256)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    53
                  </td>
                </tr>
                <tr>
                  <td data-label="Member or topic" className={cx("mono")}>
                    CoinSent(address,uint256,address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    2
                  </td>
                </tr>
                <tr>
                  <td data-label="Member or topic" className={cx("mono")}>
                    AddressApproval(address,address,bool)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    1
                  </td>
                </tr>
                <tr>
                  <td data-label="Member or topic" className={cx("mono")}>
                    AddressApprovalOnce(address,address,uint256)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    1
                  </td>
                </tr>
                <tr>
                  <td data-label="Member or topic" className={cx("mono")}>
                    Approval(address,address,uint256)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    <strong>0</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            The three members the standard marks optional are implemented more often than four of the six it requires.
          </p>
        </div>
        <div>
          <h3 className={cx("sub")}>
            The superseded vocabulary
          </h3>
          <TableScroll>
            <table>
              <thead>
                <tr>
                  <th>Superseded member</th>
                  <th className={cx("num")}>Contracts</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Superseded member" className={cx("mono")}>
                    coinBalanceOf(address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    56
                  </td>
                </tr>
                <tr>
                  <td data-label="Superseded member" className={cx("mono")}>
                    approve(address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    12
                  </td>
                </tr>
                <tr>
                  <td data-label="Superseded member" className={cx("mono")}>
                    approveOnce(address,uint256)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    12
                  </td>
                </tr>
                <tr>
                  <td data-label="Superseded member" className={cx("mono")}>
                    isApprovedOnceFor(address,address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    12
                  </td>
                </tr>
                <tr>
                  <td data-label="Superseded member" className={cx("mono")}>
                    isApprovedFor(address,address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    10
                  </td>
                </tr>
                <tr>
                  <td data-label="Superseded member" className={cx("mono")}>
                    unapprove(address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    10
                  </td>
                </tr>
                <tr>
                  <td data-label="Superseded member" className={cx("mono")}>
                    currency()
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    8
                  </td>
                </tr>
                <tr>
                  <td data-label="Superseded member" className={cx("mono")}>
                    balances(address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    6
                  </td>
                </tr>
                <tr>
                  <td data-label="Superseded member" className={cx("mono")}>
                    coinBalance(), disapprove, isApproved, sendCoin, sendCoinFrom
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    2 each
                  </td>
                </tr>
                <tr>
                  <td data-label="Superseded member" className={cx("mono")}>
                    transfer(uint256,address), transferFrom(address,uint256,address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    1 each
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            <code>coinBalanceOf</code>
            , which Gav Wood renamed away on the wiki on 4 October 2015, was still being deployed 56 times through December. 53 of those 56 pair it with the
            {" "}
            <code>CoinTransfer</code>
            {" "}
            event and carry no
            {" "}
            <code>sendCoin</code>
            {" "}
            under the specification's signature: that is the shape of the contract in the
            {" "}
            <a href="#timeline">official Frontier Guide tutorial</a>
            , which never changed. The count of 2 for
            {" "}
            <code>sendCoin</code>
            {" "}
            reflects the scan's vocabulary, not the deployments; see the note below.
          </p>
        </div>
      </div>
      <div className={cx("callout callout--warn")} style={{ margin: "2rem 0", maxWidth: "56rem" }}>
        <strong>
          The
          {" "}
          <code>sendCoin</code>
          {" "}
          row understates its subject.
        </strong>
        {" "}
        The scan's superseded-vocabulary list was built from the wiki, dapp-bin and the DAO, so it tested
        {" "}
        <span className={cx("mono")}>sendCoin(uint256,address)</span>
        , selector
        {" "}
        <span className={cx("mono")}>0xc86a90fe</span>
        . The Ethereum Frontier Guide taught
        {" "}
        <span className={cx("mono")}>sendCoin(address receiver, uint amount)</span>
        , selector
        {" "}
        <span className={cx("mono")}>0x90b98a11</span>
        , which was never tested. Across all of 2015,
        {" "}
        <strong>264 of the 628 token-vocabulary contracts</strong>
        {" "}
        carry
        {" "}
        <code>coinBalanceOf</code>
        {" "}
        together with the
        {" "}
        <code>CoinTransfer</code>
        {" "}
        topic, the guide's exact pairing, and only 7 of those also carry the specification's
        {" "}
        <code>sendCoin</code>
        . The dominant token contract on mainnet in 2015 was not written against the standard being drafted. It was written against the documentation, and the documentation had its own vocabulary.
      </div>
      <h3 className={cx("sub sub--gap")}>
        A sample of what was on mainnet
      </h3>
      <p className={cx("prose")} style={{ color: "var(--ink-2)" }}>
        Of the 320,
        {" "}
        <strong>140 have the exact MyToken shape</strong>
        :
        {" "}
        <code>balanceOf</code>
        ,
        {" "}
        <code>transfer</code>
        ,
        {" "}
        <code>name</code>
        ,
        {" "}
        <code>symbol</code>
        ,
        {" "}
        <code>decimals</code>
        {" "}
        and
        {" "}
        <code>Transfer</code>
        , and nothing else. 118 yield a clean constructor decode. The first row of that census, sorted by block, is MistCoin.
      </p>
      <TableScroll>
        <table className={cx("table--stack")}>
          <thead>
            <tr>
              <th>Deployed (UTC)</th>
              <th>Address</th>
              <th>Name</th>
              <th>Symbol</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2015-11-03T12:03:29Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0xf4eCEd2f682CE333f96f2D8966C613DeD8fC95DD" />
              </td>
              <td data-label="Name">
                <strong>MistCoin</strong>
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                MC
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2015-11-03T18:46:18Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0x796Ed7f47E100984e7aA7ca51D55e9B68eCb1C19" />
              </td>
              <td data-label="Name">
                Whitcoin
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                WHIT
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2015-11-03T22:17:12Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0xDafE447177aEfb05Dd7eDAe2F5781c98A858d320" />
              </td>
              <td data-label="Name">
                UniCoin
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                UNC
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2015-11-03T23:23:36Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0xaB3652FD492FbB0d6b63acB742f3eD12AfBAEf52" />
              </td>
              <td data-label="Name">
                Bizilicas
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                BiZ
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2015-11-04T08:54:38Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0xEFB1775952642353c0386410212D7638c9fB2426" />
              </td>
              <td data-label="Name">
                EtherMusic
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                ETM
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2015-11-08T23:29:00Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0xA1162CBb7F6cc8F8476c5f4783761302a9aBaf69" />
              </td>
              <td data-label="Name">
                Ethereum Unit
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                ETH
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2015-11-12T16:41:26Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0x896BA935dfBe3c5dDFBc1b637bE60964e5244465" />
              </td>
              <td data-label="Name">
                CannabisToken
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                CANN
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2015-11-16T16:46:40Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0x3B683F1ba138A094042e368415d8B9fEF86731A4" />
              </td>
              <td data-label="Name">
                CoinAwesome
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                AWE
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2015-12-04T17:38:17Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0xE671b8Acf6aCD77Ec885EfA7e3C93bE05E887407" />
              </td>
              <td data-label="Name">
                My DAO Shares
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                %
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2015-12-14T08:55:58Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0xCc0eE510BC4b5CD4D31Da49f672AB5aa6806F70a" />
              </td>
              <td data-label="Name">
                SubEthaNomic
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                SEN
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2016-01-06T16:13:52Z
              </td>
              <td data-label="Address" className={cx("mono")}>
                <Addr a="0x5A2EbC3AC433fd6c9Ad2B1a56033Dc2D45945315" />
              </td>
              <td data-label="Name">
                pieshopdollar
              </td>
              <td data-label="Symbol" className={cx("mono")}>
                $
              </td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <p className={cx("tnote")}>
        Not one of these is an ERC-20 token by the finished standard. All of them were, at the time, tokens, because the wallet said so.
      </p>
      <h3 className={cx("sub sub--gap")}>
        When the six appear
      </h3>
      <p className={cx("prose")} style={{ color: "var(--ink-2)" }}>
        The same scan run over all of 2016: 230,818 create traces, 213,112 with runtime bytecode.
      </p>
      <div className={cx("split")}>
        <div>
          <TableScroll>
            <table>
              <thead>
                <tr>
                  <th>Contracts in 2016</th>
                  <th className={cx("num")}>Count</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Contracts in 2016">
                    Four or more of the final six
                  </td>
                  <td data-label="Count" className={cx("num")}>
                    2,295
                  </td>
                </tr>
                <tr>
                  <td data-label="Contracts in 2016">
                    <strong>All six</strong>
                  </td>
                  <td data-label="Count" className={cx("num")}>
                    <strong>1,014</strong>
                  </td>
                </tr>
                <tr>
                  <td data-label="Contracts in 2016">
                    All six plus both final event topics
                  </td>
                  <td data-label="Count" className={cx("num")}>
                    554
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <h4 className={cx("eyebrow")} style={{ marginTop: "1.75rem" }}>Contracts with all six, by month</h4>
          <CodeBlock lang="text" code={"2016-01:   11        2016-07:  101\n2016-02:   17        2016-08:  126\n2016-03:   19        2016-09:  162\n2016-04:   35        2016-10:  115\n2016-05:   34        2016-11:  154\n2016-06:   91        2016-12:  149"} />
        </div>
        <div>
          <p style={{ color: "var(--ink-2)" }}>
            The answer to “does any token from 2015 or 2016 implement all six?” is:
            {" "}
            <strong>none in 2015, and 1,014 in 2016</strong>
            , the first on 10 January 2016, four days after the text stopped moving.
          </p>
          <p style={{ color: "var(--ink-2)" }}>
            Adoption of the specification as written is a 2016 phenomenon that only reaches triple digits per month in June 2016, seven months after issue #20 was filed. Only 28 contracts across January and February 2016 combined carry all six.
          </p>
          <div className={cx("callout callout--warn")} style={{ marginTop: "1.5rem" }}>
            <strong>A methodological caveat, stated because it bit.</strong>
            {" "}
            The opcode walk desynchronises on contracts that embed non-code data in the runtime blob. For the 6,701-byte contract of 10 January it recovered the
            {" "}
            <code>Approval</code>
            {" "}
            topic but missed
            {" "}
            <code>Transfer</code>
            , which is unambiguously present. Every headline count was therefore re-run with plain substring matching over the runtime hex, which cannot desynchronise.
          </div>
        </div>
      </div>
      <h3 className={cx("sub sub--gap")}>
        Two detectors, in exact agreement
      </h3>
      <TableScroll>
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th className={cx("num")}>Opcode walk</th>
              <th className={cx("num")}>Substring</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                totalSupply()
              </td>
              <td data-label="Opcode walk" className={cx("num")}>
                1
              </td>
              <td data-label="Substring" className={cx("num")}>
                1
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                balanceOf(address)
              </td>
              <td data-label="Opcode walk" className={cx("num")}>
                207
              </td>
              <td data-label="Substring" className={cx("num")}>
                207
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                transfer(address,uint256)
              </td>
              <td data-label="Opcode walk" className={cx("num")}>
                185
              </td>
              <td data-label="Substring" className={cx("num")}>
                185
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                transferFrom(address,address,uint256)
              </td>
              <td data-label="Opcode walk" className={cx("num")}>
                10
              </td>
              <td data-label="Substring" className={cx("num")}>
                10
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                approve(address,uint256)
              </td>
              <td data-label="Opcode walk" className={cx("num")}>
                <strong>0</strong>
              </td>
              <td data-label="Substring" className={cx("num")}>
                <strong>0</strong>
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                allowance(address,address)
              </td>
              <td data-label="Opcode walk" className={cx("num")}>
                <strong>0</strong>
              </td>
              <td data-label="Substring" className={cx("num")}>
                <strong>0</strong>
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                Transfer topic
              </td>
              <td data-label="Opcode walk" className={cx("num")}>
                154
              </td>
              <td data-label="Substring" className={cx("num")}>
                154
              </td>
            </tr>
            <tr>
              <td data-label="Member" className={cx("mono")}>
                Approval topic
              </td>
              <td data-label="Opcode walk" className={cx("num")}>
                <strong>0</strong>
              </td>
              <td data-label="Substring" className={cx("num")}>
                <strong>0</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <p className={cx("tnote")}>
        Zero contracts where the substring test found a member the walk missed. The four-byte substring test is the looser of the two: it produces false positives, not false negatives. A zero from both methods is as strong as this corpus can make it.
        {" "}
        <strong>
          The claim that nothing in the window implements
          {" "}
          <code>approve</code>
          {" "}
          or
          {" "}
          <code>allowance</code>
          {" "}
          does not depend on the choice of detector.
        </strong>
      </p>
    </>
  );
}
