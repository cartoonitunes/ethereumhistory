// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";
import { TimelineEra, TimelineEvent } from "../components/Timeline";

export function Era2() {
  return (
    <>
      <TimelineEra
        id="era-2"
        span={"17 November 2015 – 30 November 2015"}
        title={"The proposal"}
        blurb={
          <>
            Two weeks in which the standard acquires its number, loses five members, and gains the two that define it. Everything here happens on a gist, an issue thread, a poll page and one repository, and most of it happens within seventy-two hours.
          </>
        }
      >
        <TimelineEvent
          id="ev-the-draft-that-becomes-issue-20"
          src="gist"
          star
          date={"2015-11-17"}
          times={["10:24:27Z"]}
          mobileWhen={"2015-11-17 · 10:24:27Z"}
          title={"The draft that becomes issue #20"}
          tags={[{ label: "frozeman", actor: true }, { label: "gist 090ae32…", actor: false }, { label: "revision 1 of 6", actor: false }]}
          summary={
            <>
            Fabian Vogelsteller creates gist
            {" "}
            <span className={cx("mono")}>090ae32041bcfe120824</span>
            , “Token proposal”. Eight methods and three events, five of the eight methods being approval machinery. Two days later this text is posted as an EIP.
            </>
          }
        >
          <p>
            The gist is written in the same shape the issue will use: a method list with a prose paragraph for each. It is the document ethers cites two days later when updating the wiki, and it is the direct source of the issue body.
          </p>
          <h4>Revision 1, complete method list</h4>
          <CodeBlock lang="sol" code={"transfer(address _to, uint256 _value) returns (bool success)\ntransferFrom(address _from, address _to, uint256 _value) returns (bool success)\nbalanceOf(address _address) constant returns (uint256 balance)\n\napprove(address _address) returns (bool _success)\nunapprove(address _address) returns (bool _success)\nisApprovedFor(address _target, address _proxy) constant returns (bool _r)\napproveOnce(address _address, uint256 _maxValue) returns (bool _success)\nisApprovedOnceFor(address _target, address _proxy) returns (uint256 _maxValue)\n\nTransfer(address indexed from, address indexed to, uint256 value)\nAddressApproval(address indexed address, address indexed proxy, bool result)\nAddressApprovalOnce(address indexed address, address indexed proxy, uint256 value)"} />
          <p>
            Five of the eight methods are the approval system: a full-custody
            {" "}
            <code>approve</code>
            , its
            {" "}
            <code>unapprove</code>
            , a query, a one-time variant and that variant's query. Of the five, exactly one survives, and only after being redefined. There is no
            {" "}
            <code>totalSupply</code>
            {" "}
            and no
            {" "}
            <code>allowance</code>
            .
          </p>
          <p>
            The paragraph introducing the approval members is the one Buterin wrote on the wiki seventeen months earlier, carried across almost unedited:
          </p>
          <blockquote>
            The
            {" "}
            <code>transferFrom</code>
            {" "}
            method is used for a "direct debit" workflow, allowing contracts to send coins on your behalf, for example to "deposit" to a contract address and/or to charge fees in sub-currencies; the command should fail unless the
            {" "}
            <code>_from</code>
            {" "}
            account has deliberately authorized the sender of the message via some mechanism; we propose these standardized APIs for approval:
            <cite>Token proposal gist, revision 1, verbatim</cite>
          </blockquote>
          <h4>All six revisions</h4>
          <TableScroll>
            <table className={cx("matrix")}>
              <thead>
                <tr>
                  <th>Rev</th>
                  <th>UTC</th>
                  <th className={cx("num")}>Bytes</th>
                  <th className={cx("ctr")}>totalSupply</th>
                  <th className={cx("ctr")}>balanceOf</th>
                  <th className={cx("ctr")}>transfer</th>
                  <th className={cx("ctr")}>transferFrom</th>
                  <th className={cx("ctr")}>approve</th>
                  <th className={cx("ctr")}>allowance</th>
                  <th className={cx("ctr")}>Transfer</th>
                  <th className={cx("ctr")}>Approval</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={cx("mono")}>
                    v1
                  </td>
                  <td className={cx("mono")}>
                    2015-11-17T10:24:27Z
                  </td>
                  <td className={cx("num")}>
                    2604
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-p")}>
                    ~
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
                <tr>
                  <td className={cx("mono")}>
                    v2
                  </td>
                  <td className={cx("mono")}>
                    2015-11-17T15:25:23Z
                  </td>
                  <td className={cx("num")}>
                    2619
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-p")}>
                    ~
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
                <tr>
                  <td className={cx("mono")}>
                    v3
                  </td>
                  <td className={cx("mono")}>
                    2015-11-17T18:48:06Z
                  </td>
                  <td className={cx("num")}>
                    2709
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-p")}>
                    ~
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
                <tr>
                  <td className={cx("mono")}>
                    v4
                  </td>
                  <td className={cx("mono")}>
                    2015-11-18T08:59:46Z
                  </td>
                  <td className={cx("num")}>
                    2817
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-p")}>
                    ~
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
                <tr>
                  <td className={cx("mono")}>
                    v5
                  </td>
                  <td className={cx("mono")}>
                    2016-12-13T09:30:08Z
                  </td>
                  <td className={cx("num")}>
                    2874
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-p")}>
                    ~
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
                <tr>
                  <td className={cx("mono")}>
                    v6
                  </td>
                  <td className={cx("mono")}>
                    2016-12-13T09:30:35Z
                  </td>
                  <td className={cx("num")}>
                    2904
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-p")}>
                    ~
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                  <td className={cx("ctr m-y")}>
                    ✔
                  </td>
                  <td className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            Revisions 5 and 6, thirteen months later, add only a banner: “This is outdated: The ERC-20 is here”. The gist never gains
            {" "}
            <code>allowance</code>
            {" "}
            or
            {" "}
            <code>Approval</code>
            . Those two members are born on the issue, not here.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Gist</span>
              <a href="https://gist.github.com/frozeman/090ae32041bcfe120824" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                frozeman/090ae32041bcfe120824
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Revision 1</span>
              <a href="https://gist.github.com/frozeman/090ae32041bcfe120824/d3c1475afd436dbf1b04158bebf552851ffb6cb8" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                d3c1475afd436dbf1b04158bebf552851ffb6cb8
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifacts</span>
              <span className={cx("val mono")}>raw/gists/tokenproposal-*.txt</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-totalsupply-appears-for-the-first-time-anywhere"
          src="gist"
          star
          date={"2015-11-18"}
          times={["08:59:46Z"]}
          mobileWhen={"2015-11-18 · 08:59:46Z"}
          title={"totalSupply appears for the first time anywhere"}
          tags={[{ label: "frozeman", actor: true }, { label: "gist 090ae32…", actor: false }, { label: "revision 4", actor: false }]}
          summary={
            <>
            Gist revision 4. Unlike every other member of ERC-20,
            {" "}
            <span className={cx("mono")}>totalSupply</span>
            {" "}
            is not a rename of something older. It is newly invented, 16 hours 29 minutes before the wiki has it and 24 hours 53 minutes before issue #20 is opened.
            </>
          }
        >
          <p>
            Every other member of the final eight can be traced to an ancestor with a different name.
            {" "}
            <code>balanceOf</code>
            {" "}
            was
            {" "}
            <code>coinBalanceOf</code>
            ,
            {" "}
            <code>transfer</code>
            {" "}
            was
            {" "}
            <code>sendCoin</code>
            ,
            {" "}
            <code>allowance</code>
            {" "}
            was
            {" "}
            <code>isApprovedFor</code>
            ,
            {" "}
            <code>Transfer</code>
            {" "}
            was
            {" "}
            <code>CoinTransfer</code>
            {" "}
            and before that
            {" "}
            <code>CoinSent</code>
            .
            {" "}
            <code>totalSupply</code>
            {" "}
            has no ancestor.
          </p>
          <p>
            It reaches implementation code the same day, 4 hours 7 minutes later, in ConsenSys/Tokens.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Gist revision</span>
              <a href="https://gist.github.com/frozeman/090ae32041bcfe120824/e7abcdde39e2ba576a170b07e06c5f84017dc267" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                e7abcdde39e2ba576a170b07e06c5f84017dc267
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Into code</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/45c5488cf03c556265713c63c63e52da413dc1c8" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ConsenSys/Tokens 45c5488 · 2015-11-18T13:07:05Z
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Into the wiki</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/e5e56c010ecbea97416168f9e838ca99245ac874" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                e5e56c0 · 2015-11-19T01:29:04Z
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-wiki-is-updated-from-the-gist-and-issue-19-is-opened"
          src="eips"
          date={"2015-11-19"}
          times={["01:29:04Z", "01:31:08Z"]}
          mobileWhen={"2015-11-19 · 01:29:04Z and 01:31:08Z"}
          title={"The wiki is updated from the gist, and issue #19 is opened"}
          tags={[{ label: "ethers", actor: true }, { label: "ethereum/wiki", actor: false }, { label: "ethereum/EIPs", actor: false }]}
          summary={
            <>
            ethers copies the gist into the wiki with the message “updating from https://gist.github.com/frozeman/090ae32041bcfe120824”, then two minutes later opens issue #19, “APIs for Transferable Fungibles”. It is closed in favour of #20 nine hours later.
            </>
          }
        >
          <p>
            For about eight hours there are two competing token EIPs. Issue #19 is opened at 01:31:08Z, issue #20 at 09:52:56Z, and #19 is closed at 10:36:26Z, less than an hour after #20 appears. The number that the standard carries for the rest of its life is decided in that window.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Wiki</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/e5e56c010ecbea97416168f9e838ca99245ac874" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                e5e56c0 · updating from the gist
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Issue</span>
              <a href="https://github.com/ethereum/EIPs/issues/19" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ethereum/EIPs issue #19
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-issue-20-is-opened-erc-token-standard"
          src="eips"
          star
          date={"2015-11-19"}
          times={["09:52:56Z"]}
          mobileWhen={"2015-11-19 · 09:52:56Z"}
          title={"Issue #20 is opened: “ERC: Token standard”"}
          tags={[{ label: "frozeman", actor: true }, { label: "ethereum/EIPs #20", actor: false }, { label: "revision 1 of 19", actor: false }, { label: "3,334 bytes", actor: false }]}
          summary={
            <>
            Four of the six methods, in final form. An
            {" "}
            <code>approve</code>
            {" "}
            that takes no amount. No
            {" "}
            <code>allowance</code>
            , no
            {" "}
            <code>Approval</code>
            {" "}
            event, and five members that are not in the standard today. This is the body exactly as posted, recovered from the
            {" "}
            <span className={cx("mono")}>IssuesEvent</span>
            {" "}
            payload.
            </>
          }
        >
          <div className={cx("callout")}>
            GitHub did not record issue-body edit history until late 2016. The API returns
            {" "}
            <span className={cx("mono")}>diff: null</span>
            {" "}
            for this issue and serves only the current text. The document that defines ERC-20 has no visible history at the place it lives. Everything below is recovered from GH Archive event payloads, which embed the entire parent issue object including its body as it stood at that instant. See
            {" "}
            <a href="#method">Method</a>
            .
          </div>
          <h4>Members as posted</h4>
          <CodeBlock lang="sol" code={"function decimals()\nfunction totalSupply()\nfunction balanceOf(address _address)\nfunction transfer(address _to, uint256 _value)\nfunction transferFrom(address _from, address _to, uint256 _value)\nfunction approve(address _address)\nfunction unapprove(address _address)\nfunction isApprovedFor(address _target, address _proxy)\nfunction approveOnce(address _address, uint256 _maxValue)\nfunction isApprovedOnceFor(address _target, address _proxy)\n\nevent Transfer(address indexed _from, address indexed _to, uint256 _value)\nevent AddressApproval(address indexed _address, address indexed _proxy, bool _result)\nevent AddressApprovalOnce(address indexed _address, address indexed _proxy, uint256 _value)"} />
          <p>
            Ten methods, of which four match the final standard by name and signature. Three events, of which one survives. Five members here do not exist in ERC-20 today:
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
            ,
            {" "}
            <code>isApprovedOnceFor</code>
            .
          </p>
          <h4>The body as posted, verbatim</h4>
          <CodeBlock lang="text" caption={"3,334 bytes. Recovered from the IssuesEvent/opened payload in data.gharchive.org/2015-11-19-9.json.gz. Reproduced complete, including the unclosed code fence in the original."} code={"The following describes standard functions a token contract can implement. Those will allow dapps and wallets to handle tokens across multiple interfaces/dapps.\n\nThe most important here are, `transfer`, `balanceOf`, `decimals` and the `Transfer` event.\n\n```js\n## Token\n\n### Methods\n\n#### decimals\n\n```js\nfunction decimals() constant returns (uint256 decimals)\n```\nReturns the number of decimal points this token requires, e.g. `2`\n\n\n#### totalSupply\n\n```js\nfunction totalSupply() constant returns (uint256 supply)\n```\nGet the total coin supply\n\n#### balanceOf\n\n```js\nfunction balanceOf(address _address) constant returns (uint256 balance)\n```\nGet the account balance of another account with address `_address`\n\n#### transfer\n\n```js\nfunction transfer(address _to, uint256 _value) returns (bool _success)\n```\nSend `_value` amount of coins to address `_to`\n\n#### transferFrom\n\n```js\nfunction transferFrom(address _from, address _to, uint256 _value) returns (bool success)\n```\nSend `_value` amount of coins from address `_from` to address `_to`\n\nThe `transferFrom` method is used for a \"direct debit\" workflow, allowing contracts to send coins on your behalf, for example to \"deposit\" to a contract address and/or to charge fees in sub-currencies; the command should fail unless the `_from` account has deliberately authorized the sender of the message via some mechanism; we propose these standardized APIs for approval:\n\n#### approve\n\n```js\nfunction approve(address _address) returns (bool success)\n```\nAllow `_address ` to direct debit from your account with full custody. Only implement if absolutely required and use carefully. See `approveOnce` below for a more limited method.\n\n#### unapprove\n\n```js\nfunction unapprove(address _address) returns (bool success)\n```\nUnapprove address `_address ` to direct debit from your account if it was previously approved. Must reset both one-time and full custody approvals.\n\n#### isApprovedFor\n\n```js\nfunction isApprovedFor(address _target, address _proxy) constant returns (bool success)\n```\nReturns 1 if `_proxy` is allowed to direct debit from `_target`\n\n#### approveOnce\n\n```js\nfunction approveOnce(address _address, uint256 _maxValue) returns (bool success)\n```\nMakes a one-time approval for `_address ` to send a maximum amount of currency equal to `_maxValue`\n\n#### isApprovedOnceFor\n\n```js\nfunction isApprovedOnceFor(address _target, address _proxy) returns (uint256 maxValue)\n```\nReturns `_maxValue` if `_proxy` is allowed to direct debit the returned `maxValue` from address `_target` only once. The approval must be reset on any transfer by `_proxy` of `_maxValue` or less.\n\n### Events\n#### Transfer\n\n```js\nevent Transfer(address indexed _from, address indexed _to, uint256 _value)\n```\nTriggered when tokens are transferred.\n\n#### AddressApproval\n\n```js\nevent AddressApproval(address indexed _address, address indexed _proxy, bool _result)\n```\nTriggered when an `_address` approves `_proxy` to direct debit from their account.\n\n#### AddressApprovalOnce\n\n```js\nevent AddressApprovalOnce(address indexed _address, address indexed _proxy, uint256 _value)\n```\nTriggered when an `_address` approves `_proxy` to direct debit from their account only once for a maximum of `_value`\n\n```"} />
          <p>
            Two sentences in that text are worth marking. The first line of the Motivation is the standard's actual purpose, and it does not mention exchanges, allowances or contract-to-contract accounting at all. The second is the ranking:
            {" "}
            <em>
              “The most important here are,
              {" "}
              <code>transfer</code>
              ,
              {" "}
              <code>balanceOf</code>
              ,
              {" "}
              <code>decimals</code>
              {" "}
              and the
              {" "}
              <code>Transfer</code>
              {" "}
              event.”
            </em>
            {" "}
            That sentence names
            {" "}
            <code>decimals</code>
            , which is removed from the standard seven days later, and it survives into the final text unedited, still naming
            {" "}
            <code>decimals</code>
            , long after the member itself is gone.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Issue</span>
              <a href="https://github.com/ethereum/EIPs/issues/20" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ethereum/EIPs issue #20
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>GH Archive file</span>
              <a href="http://data.gharchive.org/2015-11-19-9.json.gz" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                data.gharchive.org/2015-11-19-9.json.gz
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Origin</span>
              <span className={cx("val mono")}>IssuesEvent / opened</span>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/issue20-bodies/r01-20151119T095256Z.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-issue-gets-a-number"
          src="eips"
          date={"2015-11-19"}
          times={["15:33:05Z"]}
          mobileWhen={"2015-11-19 · 15:33:05Z"}
          title={"The issue gets a number"}
          tags={[{ label: "frozeman", actor: true }, { label: "ethereum/EIPs #20", actor: false }, { label: "revision 4", actor: false }, { label: "3,553 bytes", actor: false }]}
          summary={
            <>
            Revision 4 adds an EIP header block to the top of the body. It is the first time the document identifies itself as ERC 20. The interface below it is unchanged: still four of six.
            </>
          }
        >
          <h4>The header, as it still reads in the final text</h4>
          <CodeBlock lang="text" code={"ERC: 20\nTitle: Token standard\nStatus: Draft\nType: Informational\nCreated: 19-11.2015\nResolution: https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs"} />
          <p>
            The malformed date,
            {" "}
            <span className={cx("mono")}>19-11.2015</span>
            , is in the original and is never corrected. The
            {" "}
            <span className={cx("mono")}>Resolution</span>
            {" "}
            line points back at the wiki page, which at this moment does not carry the same interface as the issue and will not for another seven weeks.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Snapshot carried by</span>
              <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-158091127" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                comment 158091127, niran
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>GH Archive file</span>
              <span className={cx("val mono")}>data.gharchive.org/2015-11-19-15.json.gz</span>
            </li>
            <li>
              <span className={cx("lbl")}>Edit window</span>
              <span className={cx("val mono")}>after 2015-11-19T12:24:52Z, at or before 15:33:05Z</span>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/issue20-bodies/r04-20151119T153305Z.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-pave-the-cowpaths"
          src="eips"
          date={"2015-11-19"}
          times={["16:31:57Z"]}
          mobileWhen={"2015-11-19 · 16:31:57Z"}
          title={"“Pave the cowpaths”"}
          tags={[{ label: "alexvandesande", actor: true }, { label: "ethereum/EIPs #20", actor: false }, { label: "comment 158110210", actor: false }]}
          summary={
            <>
            Six hours and thirty-nine minutes after the issue is filed, Alex Van de Sande posts the design doctrine that keeps the standard small: implement what everyone already agrees on, and let real use decide the rest.
            </>
          }
        >
          <blockquote>
            @ethers decimals, name and symbol are important for displaying to the end user. […] Regarding the approve/cheque discussion, I feel that we should always use focus on paving cow paths: implement what everyone is on absolute consensus as the basic "standard" and then allow real world usage dictate how to better define more advanced use cases.
            <cite>Verbatim, with the source's own ellipsis. Link text inlined.</cite>
          </blockquote>
          <p>
            This is the argument that prevailed. The approval system was cut from five members to two, and the three optional members were kept. It is also the argument that produces the gap this whole reconstruction measures: the standard describes an allowance model that almost nobody implements, while the wallet ships a definition of “token” that almost everybody implements.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Comment</span>
              <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-158110210" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                issuecomment-158110210
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-approve-gains-an-amount"
          src="eips"
          date={"2015-11-19"}
          times={["19:07:35Z"]}
          mobileWhen={"2015-11-19 · 19:07:35Z"}
          title={"approve gains an amount"}
          tags={[{ label: "frozeman", actor: true }, { label: "ethereum/EIPs #20", actor: false }, { label: "revision 5", actor: false }, { label: "2,988 bytes", actor: false }]}
          summary={
            <>
            Revision 5.
            {" "}
            <span className={cx("mono")}>approve(address _for, uint256 _value)</span>
            .
            {" "}
            <span className={cx("mono")}>approveOnce</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>isApprovedOnceFor</span>
            {" "}
            are deleted. Five of the six methods now stand in final form, on the day the issue opened.
            </>
          }
        >
          <p>
            The one-time approval is gone and the full-custody approval has been replaced by a capped one. The two ideas merged: instead of “approve with no limit” plus “approve once up to a maximum”, there is one
            {" "}
            <code>approve</code>
            {" "}
            that takes an amount. This is the single most consequential edit in the standard's history, and it happens nine hours and fifteen minutes after the issue was posted.
          </p>
          <CodeBlock lang="sol" code={"function decimals()\nfunction totalSupply()\nfunction balanceOf(address _address)\nfunction transfer(address _to, uint256 _value)\nfunction transferFrom(address _from, address _to, uint256 _value)\nfunction approve(address _for, uint256 _value)\nfunction unapprove(address _address)\nfunction isApprovedFor(address _allowed, address _for)\n\nevent Transfer(address indexed _from, address indexed _to, uint256 _value)\nevent AddressApproval(address indexed _address, address indexed _proxy, bool _result)\nevent AddressApprovalOnce(address indexed _address, address indexed _proxy, uint256 _value)"} />
          <p>
            The parameter names are not yet
            {" "}
            <code>_spender</code>
            . The query is still
            {" "}
            <code>isApprovedFor</code>
            . The two events are still the superseded ones. All of that changes the next afternoon.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>GH Archive file</span>
              <span className={cx("val mono")}>data.gharchive.org/2015-11-19-19.json.gz</span>
            </li>
            <li>
              <span className={cx("lbl")}>Edit window</span>
              <span className={cx("val mono")}>after 2015-11-19T19:00:41Z, at or before 19:07:35Z</span>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/issue20-bodies/r05-20151119T190735Z.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-allowance-and-approval-appear-and-all-eight-members-co-exist"
          src="eips"
          star
          date={"2015-11-20"}
          times={["15:53:42Z"]}
          mobileWhen={"2015-11-20 · 15:53:42Z"}
          title={"allowance and Approval appear, and all eight members co-exist"}
          tags={[{ label: "frozeman", actor: true }, { label: "ethereum/EIPs #20", actor: false }, { label: "revision 7", actor: false }, { label: "2,750 bytes", actor: false }]}
          summary={
            <>
            Revision 7.
            {" "}
            <span className={cx("mono")}>isApprovedFor</span>
            {" "}
            becomes
            {" "}
            <span className={cx("mono")}>allowance</span>
            .
            {" "}
            <span className={cx("mono")}>AddressApproval</span>
            {" "}
            becomes
            {" "}
            <span className={cx("mono")}>Approval</span>
            . Thirty hours after the issue was filed, the six methods and both events exist together in one document for the first time anywhere.
            </>
          }
        >
          <p>
            The two members that make ERC-20 what it is, and that exchanges and later DeFi protocols are built on, are the last two to arrive. Both arrive as renames, in an edit between two comments three minutes and forty-four seconds apart.
          </p>
          <CodeBlock lang="sol" code={"function decimals()\nfunction totalSupply()\nfunction balanceOf(address _address)\nfunction transfer(address _to, uint256 _value)\nfunction transferFrom(address _from, address _to, uint256 _value)\nfunction approve(address _spender, uint256 _value)\nfunction unapprove(address _spender)\nfunction allowance(address _address, address _spender)\n\nevent Transfer(address indexed _from, address indexed _to, uint256 _value)\nevent Approval(address indexed _address, address indexed _spender, uin256 _value)"} />
          <p className={cx("tnote")}>
            The
            {" "}
            <span className={cx("mono")}>uin256</span>
            {" "}
            in the
            {" "}
            <code>Approval</code>
            {" "}
            declaration is a typo in the original. It persists through revisions 7 to 13 and is not corrected until revision 14 on 2 December 2015.
          </p>
          <p>
            Two members that are not in the final standard are still here:
            {" "}
            <code>decimals</code>
            {" "}
            and
            {" "}
            <code>unapprove</code>
            . The parameter names are still
            {" "}
            <code>_address</code>
            {" "}
            rather than
            {" "}
            <code>_owner</code>
            . Revision 8, two minutes and twenty-four seconds later, is a thirteen-byte change.
          </p>
          <div className={cx("callout")}>
            This is finding 1. Every earlier document is missing at least one member. Every later one is a refinement of this shape. If a single date is wanted for the interface, this one has a better claim than the day the issue was opened.
          </div>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Snapshot carried by</span>
              <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-158439737" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                comment 158439737, frozeman
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>GH Archive file</span>
              <span className={cx("val mono")}>data.gharchive.org/2015-11-20-15.json.gz</span>
            </li>
            <li>
              <span className={cx("lbl")}>Edit window</span>
              <span className={cx("val mono")}>after 2015-11-20T15:49:58Z, at or before 15:53:42Z</span>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/issue20-bodies/r07-20151120T155342Z.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-poll-on-which-members-to-keep"
          src="wiki"
          date={"2015-11-21"}
          times={["13:31:28Z"]}
          mobileWhen={"2015-11-21 · 13:31:28Z"}
          title={"The poll on which members to keep"}
          tags={[{ label: "ethers", actor: true }, { label: "ethereum/wiki", actor: false }, { label: "9 revisions", actor: false }]}
          summary={
            <>
            ethers creates a wiki page where participants list which members they want IN and which OUT. Twelve people vote over five days.
            {" "}
            <span className={cx("mono")}>decimals</span>
            {" "}
            is the member most often listed OUT, and it is removed from the issue body five days later.
            </>
          }
        >
          <h4>The page, verbatim</h4>
          <CodeBlock lang="text" caption={"ethereum/wiki, Poll for token proposal EIP 20, final state"} code={"Poll for https://github.com/ethereum/EIPs/issues/20\n\ngithub username | IN       | OUT      | NextEIP*? | Comments\n----------------|----------------|---------------|-----------------------------------|---------\nexample           |  Set1, identifier | decimals, approve, unapprove, allowance | YES |\nchristianlundkvist|  Set1             | decimals                                | YES |\nnmushegian        |  Set1             | decimals                                | YES |\njoeykrug          |  Set1, identifier | ?                                       | ?   |\nkoeppelmann       |  Set1, identifier | ?                                       | ?   |\nGeorgi87          |  Set1, identifier | decimals                                | Yes |\nniran             |  Set1             | decimals                                | YES?|\nethers            |  Set1, identifier | decimals                                | YES |\nsimondlr          |  Set1             | decimals                                | YES |\nfrozeman          |  Set1, decimals   |                                         | NO  |\nalexvandesande    |  Set1, decimals   |                                         |     |\ncaktux            |  Set1, decimals   |                                         |     |\nfirecar96         |  Set1             | decimals, identifier                    | YES |\n\n\n* Set1 = balanceOf, transfer, transferFrom, totalSupply, approve, unapprove, allowance\n* \"identifier\" = https://github.com/ethereum/EIPs/issues/20#issuecomment-158436720 and the discussion\n* NextEIP means should the OUT items be in separate EIP/s or be in EIP20 itself but marked Optional.  YES means separate EIP/s, NO means keep in EIP20 and mark it Optional."} />
          <p>
            <span className={cx("mono")}>Set1</span>
            {" "}
            is the final six plus
            {" "}
            <code>unapprove</code>
            . Nobody voted against
            {" "}
            <code>unapprove</code>
            {" "}
            except the example row, and it survived this poll. It was not dropped until
            {" "}
            <code>approve</code>
            {" "}
            was redefined as absolute, six weeks later.
          </p>
          <p>
            The three people who voted to keep
            {" "}
            <code>decimals</code>
            {" "}
            are frozeman, alexvandesande and caktux: the author of the proposal, the author of the optional three, and the person who maintained the wiki copy. They lost.
          </p>
          <h4>Page revisions</h4>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>UTC</th>
                  <th>Author</th>
                  <th>Message</th>
                  <th>SHA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-21T13:31:28Z
                  </td>
                  <td data-label="Author">
                    ethers
                  </td>
                  <td data-label="Message">
                    Created Poll for token proposal EIP 20 (markdown)
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    0604d8f1
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-25T19:15:21Z
                  </td>
                  <td data-label="Author">
                    ethers
                  </td>
                  <td data-label="Message">
                    Updated Poll for token proposal EIP 20 (markdown)
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    cad8db58
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-25T19:26:05Z
                  </td>
                  <td data-label="Author">
                    ethers
                  </td>
                  <td data-label="Message">
                    Updated Poll for token proposal EIP 20 (markdown)
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    574050aa
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-25T19:29:14Z
                  </td>
                  <td data-label="Author">
                    ethers
                  </td>
                  <td data-label="Message">
                    add alexvandesande
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    3af24c1d
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-25T19:31:25Z
                  </td>
                  <td data-label="Author">
                    ethers
                  </td>
                  <td data-label="Message">
                    Updated Poll for token proposal EIP 20 (markdown)
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    f3713a7f
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-25T19:37:36Z
                  </td>
                  <td data-label="Author">
                    ethers
                  </td>
                  <td data-label="Message">
                    better format with identifier
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    61466494
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-25T19:38:33Z
                  </td>
                  <td data-label="Author">
                    Niran Babalola
                  </td>
                  <td data-label="Message">
                    Updated Poll for token proposal EIP 20 (markdown)
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    41d4f528
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-25T22:45:22Z
                  </td>
                  <td data-label="Author">
                    caktux
                  </td>
                  <td data-label="Message">
                    decimals
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    5733dc2d
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-26T09:58:56Z
                  </td>
                  <td data-label="Author">
                    Fabian Vogelsteller
                  </td>
                  <td data-label="Message">
                    Updated Poll for token proposal EIP 20 (markdown)
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    e55064c5
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-26T09:59:13Z
                  </td>
                  <td data-label="Author">
                    Fabian Vogelsteller
                  </td>
                  <td data-label="Message">
                    Updated Poll for token proposal EIP 20 (markdown)
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    7074a665
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Page</span>
              <a href="https://github.com/ethereum/wiki/wiki/Outdated:-Poll-for-token-proposal-EIP-20" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                Outdated: Poll for token proposal EIP 20
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/wiki-revisions/_poll-page-final.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-decimals-is-removed-from-the-specification"
          src="eips"
          star
          date={"2015-11-26"}
          times={["10:34:22Z"]}
          mobileWhen={"2015-11-26 · 10:34:22Z"}
          title={"decimals is removed from the specification"}
          tags={[{ label: "ethereum/EIPs #20", actor: false }, { label: "revision 11", actor: false }, { label: "2,631 bytes", actor: false }]}
          summary={
            <>
            Revision 11, 156 bytes smaller than revision 10. The member the wallet actually used, and the one the opening sentence names as most important, is voted out of the standard seven days after it was proposed.
            </>
          }
        >
          <p>
            Revision 10, sixty-nine minutes earlier, had already done the other cleanup:
            {" "}
            <span className={cx("mono")}>_address</span>
            {" "}
            becomes
            {" "}
            <span className={cx("mono")}>_owner</span>
            {" "}
            throughout, giving
            {" "}
            <code>balanceOf(address _owner)</code>
            {" "}
            and
            {" "}
            <code>allowance(address _owner, address _spender)</code>
            {" "}
            their final parameter names.
          </p>
          <CodeBlock lang="sol" caption={"Revision 11, members. Only unapprove is now non-standard."} code={"function totalSupply()\nfunction balanceOf(address _owner)\nfunction transfer(address _to, uint256 _value)\nfunction transferFrom(address _from, address _to, uint256 _value)\nfunction approve(address _spender, uint256 _value)\nfunction unapprove(address _spender)\nfunction allowance(address _owner, address _spender)\n\nevent Transfer(address indexed _from, address indexed _to, uint256 _value)\nevent Approval(address indexed _owner, address indexed _spender, uin256 _value)"} />
          <p>
            One member stands between this and the finished standard:
            {" "}
            <code>unapprove</code>
            . It takes another six weeks to remove.
          </p>
          <div className={cx("callout callout--warn")}>
            <code>decimals</code>
            {" "}
            is deleted from the specification but not from the sentence recommending it. “The most important here are,
            {" "}
            <code>transfer</code>
            ,
            {" "}
            <code>balanceOf</code>
            ,
            {" "}
            <code>decimals</code>
            {" "}
            and the
            {" "}
            <code>Transfer</code>
            {" "}
            event” is still in the body at revision 15, the first exact statement of the final interface, six weeks after the member itself was removed. The standard recommends a member it does not define.
          </div>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Snapshot carried by</span>
              <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-159872082" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                comment 159872082, simondlr
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>GH Archive file</span>
              <span className={cx("val mono")}>data.gharchive.org/2015-11-26-10.json.gz</span>
            </li>
            <li>
              <span className={cx("lbl")}>Edit window</span>
              <span className={cx("val mono")}>after 2015-11-26T09:25:09Z, at or before 10:34:22Z</span>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/issue20-bodies/r11-20151126T103422Z.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-first-compilable-solidity-with-all-six-and-both-events"
          src="code"
          star
          date={"2015-11-30"}
          times={["21:06:17Z"]}
          mobileWhen={"2015-11-30 · 21:06:17Z"}
          title={"First compilable Solidity with all six and both events"}
          tags={[{ label: "Simon de la Rouviere", actor: true }, { label: "ConsenSys/Tokens", actor: false }]}
          summary={
            <>
            ConsenSys/Tokens
            {" "}
            <span className={cx("mono")}>Token.sol</span>
            {" "}
            at
            {" "}
            <span className={cx("mono")}>4ba2396</span>
            , “Refactored to current standards.” Ten days after the interface first existed as prose, it exists as code.
            {" "}
            <span className={cx("mono")}>unapprove</span>
            {" "}
            is still declared.
            </>
          }
        >
          <CodeBlock lang="sol" code={"function totalSupply()\nfunction balanceOf(address _owner)\nfunction transfer(address _to, uint256 _value)\nfunction transferFrom(address _from, address _to, uint256 _value)\nfunction approve(address _spender, uint256 _value)\nfunction unapprove(address _spender)\nfunction allowance(address _owner, address _spender)\n\nevent Transfer(address indexed _from, address indexed _to, uint256 _value)\nevent Approval(address indexed _owner, address indexed _spender, uint256 _value)"} />
          <p>
            This is finding 2. Note that the typo in the specification,
            {" "}
            <span className={cx("mono")}>uin256</span>
            , does not appear here: the implementation writes
            {" "}
            <span className={cx("mono")}>uint256</span>
            , because it has to compile. The specification is corrected two days later.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/4ba2396ec3bcdae4d3135c3bdb093760b84fd692" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                4ba2396 · Refactored to current standards.
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/code-snapshots/ConsenSysTokens-4ba2396-Token.sol</span>
            </li>
          </ul>
        </TimelineEvent>
      </TimelineEra>
    </>
  );
}
