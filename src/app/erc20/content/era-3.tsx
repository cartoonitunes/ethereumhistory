// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";
import { TimelineEra, TimelineEvent } from "../components/Timeline";

export function Era3() {
  return (
    <>
      <TimelineEra
        id="era-3"
        span={"2 December 2015 – 28 January 2016"}
        title={"Settling the interface"}
        blurb={
          <>
            The specification goes backwards before it goes forwards. Implementation reaches the final shape three weeks before the specification does, and mainnet reaches it four days after. This is also the period in which the Ethereum Foundation publishes a token tutorial that neither names the standard nor implements it.
          </>
        }
      >
        <TimelineEvent
          id="ev-regression-approval-is-renamed-approved"
          src="eips"
          star
          date={"2015-12-02"}
          times={["09:28:55Z"]}
          mobileWhen={"2015-12-02 · 09:28:55Z"}
          title={"Regression: Approval is renamed Approved"}
          tags={[{ label: "frozeman", actor: true }, { label: "ethereum/EIPs #20", actor: false }, { label: "revision 13", actor: false }, { label: "2,754 bytes", actor: false }]}
          summary={
            <>
            Revision 13 moves away from the final form.
            {" "}
            <span className={cx("mono")}>Approval</span>
            {" "}
            becomes
            {" "}
            <span className={cx("mono")}>Approved</span>
            , and a second event
            {" "}
            <span className={cx("mono")}>Unapproved</span>
            {" "}
            is added. The standard is further from its final state on 2 December than it was on 20 November.
            </>
          }
        >
          <p>
            The rename is consistent with the design at that moment: if
            {" "}
            <code>unapprove</code>
            {" "}
            is a real method, it needs its own event, and a pair called
            {" "}
            <code>Approved</code>
            {" "}
            and
            {" "}
            <code>Unapproved</code>
            {" "}
            is more symmetrical than
            {" "}
            <code>Approval</code>
            {" "}
            and
            {" "}
            <code>Unapproved</code>
            . The whole branch is abandoned five weeks later when
            {" "}
            <code>approve</code>
            {" "}
            is redefined as absolute and
            {" "}
            <code>unapprove</code>
            {" "}
            stops being needed.
          </p>
          <CodeBlock lang="sol" code={"function totalSupply()\nfunction balanceOf(address _owner)\nfunction transfer(address _to, uint256 _value)\nfunction transferFrom(address _from, address _to, uint256 _value)\nfunction approve(address _spender, uint256 _value)\nfunction unapprove(address _spender)\nfunction allowance(address _owner, address _spender)\n\nevent Transfer(address indexed _from, address indexed _to, uint256 _value)\nevent Approved(address indexed _owner, address indexed _spender, uin256 _value)\nevent Unapproved(address indexed _owner, address indexed _spender)"} />
          <p>
            Revision 14, fifty-three minutes later, is a one-byte change: the
            {" "}
            <span className={cx("mono")}>uin256</span>
            {" "}
            typo introduced on 20 November is finally corrected to
            {" "}
            <span className={cx("mono")}>uint256</span>
            .
          </p>
          <p>
            The regression propagates. ConsenSys/Tokens follows it on the same day at 13:24:54Z with “Added unapprove”, and the wiki follows it on 16 December with “update to latest Token standard draft”. For five weeks the specification, the reference implementation and the wiki all agree on an interface that no longer exists.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Snapshot carried by</span>
              <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-161234094" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                comment 161234094, frozeman
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>GH Archive file</span>
              <span className={cx("val mono")}>data.gharchive.org/2015-12-02-9.json.gz</span>
            </li>
            <li>
              <span className={cx("lbl")}>Into code</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/f3c0fc1bddfc95ec2e561c8f5beb6ba09b123228" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ConsenSys/Tokens f3c0fc1 · Added unapprove
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Into the wiki</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/551fce2aa68fe00a80b79dfaf590068e7b697e0d" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                551fce2 · 2015-12-16T02:00:37Z
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifacts</span>
              <span className={cx("val mono")}>raw/issue20-bodies/r13-…md, r14-…md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-foundation-s-token-tutorial"
          src="blog"
          star
          date={"2015-12-03"}
          times={[]}
          mobileWhen={"2015-12-03"}
          title={"The Foundation's token tutorial"}
          tags={[{ label: "Alex Van de Sande", actor: true }, { label: "blog.ethereum.org", actor: false }, { label: "gist 21935dc…", actor: false }]}
          summary={
            <>
            Alex Van de Sande's “Ethereum in practice part 1” is the Foundation's canonical token tutorial. It links a gist that is character-for-character identical to the source MistCoin was compiled from, and it never uses the words ERC-20, ERC20, EIP-20 or “token standard”.
            </>
          }
        >
          <p>
            Full title:
            {" "}
            <em>“Ethereum in practice part 1: how to build your own cryptocurrency without touching a line of code”</em>
            . Published two weeks after issue #20 was filed.
          </p>
          <p>
            The post contains no inline Solidity. It instructs the reader to load the contract into the browser-based compiler from a gist:
            {" "}
            <span className={cx("mono")}>chriseth.github.io/browser-solidity/?gist=21935dc37c5bfbe92e5a</span>
            . Its only description of what the token implements is:
          </p>
          <blockquote>
            Since all tokens implement some basic features in a standard way, this also means that your token will be instantly compatible with the ethereum wallet and any other client or contract that uses the same standards.
            <cite>Verbatim</cite>
          </blockquote>
          <p>
            It also concedes the wallet's discovery limitation directly:
            {" "}
            <em>“the wallet only tracks tokens it knows about, and you have to add these manually.”</em>
          </p>
          <h4>What the linked gist contains</h4>
          <CodeBlock lang="sol" code={"contract MyToken {\n    event Transfer(address indexed from, address indexed to, uint256 value);\n    function MyToken(uint256 _supply, string _name, string _symbol, uint8 _decimals)\n    function transfer(address _to, uint256 _value)\n}"} />
          <p>
            One method and one event. As of December 2015 the Ethereum Foundation's own public tutorial for creating a token neither named the standard nor implemented it.
          </p>
          <div className={cx("callout")}>
            <strong>
              Gist
              {" "}
              <span className={cx("mono")}>21935dc37c5bfbe92e5a</span>
              , created 2015-12-01T18:37:25Z, is character-for-character identical to frozeman's gist revision
              {" "}
              <span className={cx("mono")}>7bcfaef3</span>
              , the revision MistCoin was compiled from.
            </strong>
            {" "}
            Verified by
            {" "}
            <span className={cx("mono")}>diff</span>
            , and independently by compilation: built with
            {" "}
            <span className={cx("mono")}>solc 0.1.6+commit.d41f8b7c</span>
            {" "}
            with the optimizer on, the blog post's gist produces MistCoin's exact 716-byte runtime and its exact 1,150-byte creation prefix. The token contract the Foundation published to the world on 3 December 2015 is, byte for byte, the contract deployed as MistCoin on 3 November.
          </div>
          <h4>The post left a measurable trace onchain</h4>
          <p>
            The tutorial tells the reader to enter
            {" "}
            <em>
              “10,000 as the supply, any name you want,
              {" "}
              <code>"%"</code>
              {" "}
              for a symbol and 2 decimal places.”
            </em>
            {" "}
            That instruction is visible in the constructor arguments of contracts deployed afterwards.
          </p>
          <TableScroll>
            <table>
              <thead>
                <tr>
                  <th>Deployed</th>
                  <th className={cx("num")}>n</th>
                  <th>Constructor symbol is "%"</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Deployed" className={cx("mono")}>
                    2015-11-03 to 2015-12-02
                  </td>
                  <td data-label="n" className={cx("num")}>
                    21
                  </td>
                  <td data-label={"Constructor symbol is \"%\""}>
                    1 (5%)
                  </td>
                </tr>
                <tr>
                  <td data-label="Deployed" className={cx("mono")}>
                    2015-12-03 to 2016-01-06
                  </td>
                  <td data-label="n" className={cx("num")}>
                    97
                  </td>
                  <td data-label={"Constructor symbol is \"%\""}>
                    <strong>42 (43%)</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <h4>Weekly MyToken-shaped deployments</h4>
          <CodeBlock lang="text" caption={"Contracts with the exact MyToken shape, by week"} code={"week of 2015-11-02:  17   (Wallet 0.3.5 ships)\nweek of 2015-11-09:  10\nweek of 2015-11-16:   2\nweek of 2015-11-23:   2\nweek of 2015-11-30:  36   (blog post, 2015-12-03)\nweek of 2015-12-07:  33\nweek of 2015-12-14:  17\nweek of 2015-12-21:  10\nweek of 2015-12-28:   8\nweek of 2016-01-04:   5"} />
          <p>
            Two spikes, both attributable: eight deployments on 3 November, the day Wallet 0.3.5 shipped, and fifteen each on 4 and 5 December, the two days after the blog post. From the week of 23 November to the week of 30 November is an eighteenfold jump.
          </p>
          <div className={cx("callout callout--warn")}>
            <strong>Caveat on the "%" signal.</strong>
            {" "}
            The Wallet 0.3.5 release notes of 3 November also suggested
            {" "}
            <code>"%"</code>
            {" "}
            as a symbol, with three decimals rather than two. The rise in its frequency therefore measures readership, not novelty. The correlation between the post and the deployment spike is strong and the mechanism is plausible, but this is correlational evidence from timing, not proof of causation.
          </div>
          <h4>Two circulating argument layouts</h4>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>Layout</th>
                  <th>Constructor</th>
                  <th>Published in</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Layout" className={cx("mono")}>
                    rev≤4
                  </td>
                  <td data-label="Constructor" className={cx("mono")}>
                    (uint256 _supply, string _name, uint8 _decimals, string _symbol)
                  </td>
                  <td data-label="Published in">
                    anonymous gist
                    {" "}
                    <span className={cx("mono")}>909d02…</span>
                    {" "}
                    of 2015-10-30, linked by Wallet 0.3.5; frozeman gist revisions 1 to 4
                  </td>
                </tr>
                <tr>
                  <td data-label="Layout" className={cx("mono")}>
                    rev5
                  </td>
                  <td data-label="Constructor" className={cx("mono")}>
                    (uint256 _supply, string _name, string _symbol, uint8 _decimals)
                  </td>
                  <td data-label="Published in">
                    frozeman gist revision
                    {" "}
                    <span className={cx("mono")}>7bcfaef3</span>
                    {" "}
                    of 2015-11-03; blog gist
                    {" "}
                    <span className={cx("mono")}>21935dc…</span>
                    {" "}
                    of 2015-12-01
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p>
            Of the 118 window deployments whose constructor arguments decode cleanly, 94 carry the
            {" "}
            <span className={cx("mono")}>rev5</span>
            {" "}
            layout and 24 the
            {" "}
            <span className={cx("mono")}>rev≤4</span>
            {" "}
            layout. The two published sources are distinguishable in the deployed bytes, in roughly a four-to-one ratio favouring the one the blog post carried.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Post</span>
              <a href="https://blog.ethereum.org/2015/12/03/how-to-build-your-own-cryptocurrency" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                blog.ethereum.org/2015/12/03/how-to-build-your-own-cryptocurrency
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Gist</span>
              <a href="https://gist.github.com/21935dc37c5bfbe92e5a" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                21935dc37c5bfbe92e5a
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Gist revision</span>
              <span className={cx("val mono")}>
                e055b2f271def0a188cc2da13c75a190cc770dfa, single revision, created 2015-12-01T18:37:25Z
              </span>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifacts</span>
              <span className={cx("val mono")}>
                raw/gists/mytoken-blogpost-21935dc37c5bfbe92e5a-20151201.sol, raw/onchain/window-token-census.tsv, raw/onchain/decode-constructor-args.py
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-only-contract-in-the-window-with-totalsupply"
          src="chain"
          date={"2015-12-14"}
          times={["08:55:58Z"]}
          mobileWhen={"2015-12-14 · 08:55:58Z · block 689,715"}
          title={"The only contract in the window with totalSupply"}
          tags={[{ label: "mainnet", actor: false }, { label: "3 of 6", actor: false }]}
          summary={
            <>
            <span className={cx("mono")}>SubEthaNomic</span>
            , symbol
            {" "}
            <span className={cx("mono")}>SEN</span>
            , at
            {" "}
            <span className={cx("mono")}>
              <Addr a="0xCc0eE510BC4b5CD4D31Da49f672AB5aa6806F70a" />
            </span>
            . Across 2,941 contracts with runtime bytecode in the drafting window, exactly one implements
            {" "}
            <span className={cx("mono")}>totalSupply()</span>
            .
            </>
          }
        >
          <p>
            It carries
            {" "}
            <code>balanceOf</code>
            ,
            {" "}
            <code>totalSupply</code>
            ,
            {" "}
            <code>transfer</code>
            ,
            {" "}
            <code>name</code>
            ,
            {" "}
            <code>symbol</code>
            {" "}
            and the
            {" "}
            <code>Transfer</code>
            {" "}
            event. No allowance machinery at all. It is one of only ten contracts in the window that reach three of the six, and the only one of the ten that is not part of the 9-contract prototype cluster from early November.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/onchain/window-token-vocabulary-hits.json</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-derp-approve-is-not-a-noun"
          src="code"
          star
          date={"2015-12-21"}
          times={["14:28:42Z", "15:55:57Z"]}
          mobileWhen={"2015-12-21 · 14:28:42Z and 15:55:57Z"}
          title={"“Derp. Approve is not a noun.”"}
          tags={[{ label: "Simon de la Rouviere", actor: true }, { label: "ConsenSys/Tokens", actor: false }, { label: "finding 3", actor: false }]}
          summary={
            <>
            Two commits ninety minutes apart. The first deletes
            {" "}
            <span className={cx("mono")}>unapprove</span>
            {" "}
            and renames the event
            {" "}
            <span className={cx("mono")}>Approve</span>
            . The second fixes the name to
            {" "}
            <span className={cx("mono")}>Approval</span>
            . The result is the first publicly available file containing exactly the ERC-20 interface and nothing else, sixteen days before the specification says the same thing.
            </>
          }
        >
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>UTC</th>
                  <th>SHA</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    14:28:42Z
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    <a href="https://github.com/ConsenSys/Tokens/commit/9b898290319b735ef6e59e8f8f2a415f65271df6" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      9b89829
                    </a>
                  </td>
                  <td data-label="Change">
                    “Absolute approval”.
                    {" "}
                    <span className={cx("mono")}>unapprove()</span>
                    {" "}
                    deleted, event renamed
                    {" "}
                    <span className={cx("mono")}>Approve</span>
                    .
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    15:55:57Z
                  </td>
                  <td data-label="SHA" className={cx("mono")}>
                    <a href="https://github.com/ConsenSys/Tokens/commit/c3a3426bb1c8ac8aac627d246cc4e011273dd6c4" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      c3a3426
                    </a>
                  </td>
                  <td data-label="Change">
                    “Derp. Approve is not a noun.”
                    {" "}
                    <span className={cx("mono")}>Approve</span>
                    {" "}
                    becomes
                    {" "}
                    <span className={cx("mono")}>Approval</span>
                    .
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p>
            “Absolute approval” is the decision that removes
            {" "}
            <code>unapprove</code>
            : once
            {" "}
            <code>approve</code>
            {" "}
            overwrites the allowance rather than adding to it, setting it to zero
            {" "}
            <em>is</em>
            {" "}
            unapproving, and a separate method is redundant. That is the design argument the specification adopts on 6 January. The code makes it first.
          </p>
          <h4>Token.sol at c3a3426, complete</h4>
          <CodeBlock lang="sol" caption={"ConsenSys/Tokens Token_Contracts/contracts/Token.sol, verbatim, whole file"} code={"contract Token {\n\n    function totalSupply() constant returns (uint256 supply) {}\n    function balanceOf(address _owner) constant returns (uint256 balance) {}\n    function transfer(address _to, uint256 _value) returns (bool success) {}\n    function transferFrom(address _from, address _to, uint256 _value) returns (bool success) {}\n    function approve(address _spender, uint256 _value) returns (bool success) {}\n    function allowance(address _owner, address _spender) constant returns (uint256 remaining) {}\n\n    event Transfer(address indexed _from, address indexed _to, uint256 _value);\n    event Approval(address indexed _owner, address indexed _spender, uint256 _value);\n}"} />
          <p>
            This is finding 3. Every declaration matches the final standard, and there is nothing else in the file. The word ERC does not appear in it, in the commit message, or anywhere in the repository at this date.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/c3a3426bb1c8ac8aac627d246cc4e011273dd6c4" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                c3a3426bb1c8ac8aac627d246cc4e011273dd6c4
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Blob</span>
              <a href="https://github.com/ConsenSys/Tokens/blob/c3a3426bb1c8ac8aac627d246cc4e011273dd6c4/Token_Contracts/contracts/Token.sol" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                Token_Contracts/contracts/Token.sol
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/code-snapshots/ConsenSysTokens-c3a3426-Token.sol</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-ethereum-org-drops-sendcoin-and-adopts-transfer"
          src="guide"
          star
          date={"2015-12-23"}
          times={["19:36:12Z"]}
          mobileWhen={"2015-12-23 · 19:36:12Z"}
          title={"ethereum.org drops sendCoin and adopts transfer"}
          tags={[{ label: "Alexandre Van de Sande", actor: true }, { label: "ethereum/ethereum-org", actor: false }, { label: "2 of 6", actor: false }]}
          summary={
            <>
            Commit message “add the DAO page”. The token contract is replaced with the
            {" "}
            <span className={cx("mono")}>MyToken</span>
            {" "}
            shape:
            {" "}
            <span className={cx("mono")}>balanceOf</span>
            ,
            {" "}
            <span className={cx("mono")}>transfer</span>
            ,
            {" "}
            <span className={cx("mono")}>event Transfer</span>
            , plus
            {" "}
            <span className={cx("mono")}>name</span>
            ,
            {" "}
            <span className={cx("mono")}>symbol</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>decimals</span>
            . The link to the wiki standard is removed and not replaced.
            </>
          }
        >
          <p>
            Two days after ConsenSys reached the exact interface, and fourteen days before the specification froze, the Foundation's own token page moves off the Frontier vocabulary. It does not move to the specification. It moves to the contract from the December blog post, which is the contract deployed as MistCoin.
          </p>
          <CodeBlock lang="sol" caption={"ethereum-org views/content/token.md at b0abb37, contract opening"} code={"contract MyToken { \n    /* Public variables of the token */\n    string public name;\n    string public symbol;\n    uint8 public decimals;\n\n    /* This creates an array with all balances */\n    mapping (address => uint256) public balanceOf;\n\n    /* This generates a public event on the blockchain that will notify clients */\n    event Transfer(address indexed from, address indexed to, uint256 value);\n\n    /* Initializes contract with initial supply tokens to the creator of the contract */\n    function myToken(uint256 initialSupply, string tokenName, uint8 decimalUnits, string tokenSymbol) {"} />
          <p>
            Two of the six required methods, one of the two required events, three of three optional members: the same score as MistCoin, and the same shape the wallet rendered. The
            {" "}
            <code>Transfer</code>
            {" "}
            event is indexed here, which the Frontier Guide's
            {" "}
            <code>CoinTransfer</code>
            {" "}
            never was.
          </p>
          <p>
            The same commit removes the “Meta coin standard” link to
            {" "}
            <span className={cx("mono")}>Standardized_Contract_APIs</span>
            {" "}
            that had been on the page since July. From this date ethereum.org's token page points at no standard at all.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ethereum/ethereum-org/commit/b0abb37" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ethereum-org b0abb37 · add the DAO page
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Author date</span>
              <span className={cx("val mono")}>2015-12-23 17:36:12 -0200</span>
            </li>
            <li>
              <span className={cx("lbl")}>Link removal</span>
              <span className={cx("val mono")}>
                “Meta coin standard” added 33b1217 (2015-07-15), removed b0abb37 (2015-12-23). No other commit touches the string.
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-dao-is-still-running-the-superseded-interface"
          src="code"
          date={"2015-12-29"}
          times={["10:55:42Z"]}
          mobileWhen={"2015-12-29 · 10:55:42Z"}
          title={"The DAO is still running the superseded interface"}
          tags={[{ label: "CJentzsch", actor: true }, { label: "slockit/DAO", actor: false }, { label: "1 of 6", actor: false }]}
          summary={
            <>
            Eight days after ConsenSys shipped the exact final interface, the largest token contract of the era carries one of the six, plus six members that had already been removed from the specification.
            </>
          }
        >
          <CodeBlock lang="sol" caption={"slockit/DAO Token.sol at 95d85c6"} code={"function transfer(uint _value, address _to)\nfunction transferFrom(address _from, uint _value, address _to)\nfunction balanceOf(address _addr)\nfunction approve(address _addr)\nfunction unapprove(address _addr)\nfunction isApprovedFor(address _target, address _proxy)\nfunction approveOnce(address _addr, uint256 _maxValue)\nfunction isApprovedOnceFor(address _target, address _proxy)\n\nevent Transfer(address indexed from, address indexed to, uint256 value)\nevent AddressApproval(address indexed addr, address indexed proxy, bool result)\nevent AddressApprovalOnce(address indexed addr, address indexed proxy, uint256 value)"} />
          <p>
            This is the October wiki, not the December issue.
            {" "}
            <code>transfer</code>
            {" "}
            still takes value before recipient, a form the wiki had already corrected two months earlier, on 28 October. The DAO adopts the exact final interface on 16 January 2016, and two days after that ConsenSys imports the DAO contract's NatSpec back into its own.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/slockit/DAO/commit/95d85c6f48325ea923cfc755beb819398c733bd7" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                95d85c6 · update DAO
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/code-snapshots/slockitDAO-95d85c6-Token.sol</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-a-readme-calls-issue-20-de-facto-finalised"
          src="code"
          star
          date={"2016-01-01"}
          times={["08:56:36Z"]}
          mobileWhen={"2016-01-01 · 08:56:36Z"}
          title={"A README calls issue #20 “de facto finalised”"}
          tags={[{ label: "Simon de la Rouviere", actor: true }, { label: "ConsenSys/Tokens", actor: false }]}
          summary={
            <>
            The first README in any code repository to point at the issue. It appears five days before the issue body actually reaches its final form.
            </>
          }
        >
          <blockquote>
            It follows the cutting edge standards (which is de facto finalised by the community here: https://github.com/ethereum/EIPs/issues/20)
            <cite>ConsenSys/Tokens README at bbbff96, verbatim</cite>
          </blockquote>
          <p>
            The claim is true of the code and premature about the document. ConsenSys/Tokens had held the exact interface since 21 December. The issue body still said
            {" "}
            <code>unapprove</code>
            ,
            {" "}
            <code>Approved</code>
            {" "}
            and
            {" "}
            <code>Unapproved</code>
            , and would for another five days.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/bbbff96cceece1666260d034adef93763d3296e1" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                bbbff96 · Udpated README for public.
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-specification-reaches-its-final-form"
          src="eips"
          star
          date={"2016-01-06"}
          times={["10:28:48Z"]}
          mobileWhen={"2016-01-06 · 10:28:48Z"}
          title={"The specification reaches its final form"}
          tags={[{ label: "frozeman", actor: true }, { label: "ethereum/EIPs #20", actor: false }, { label: "revision 15", actor: false }, { label: "2,351 bytes", actor: false }]}
          summary={
            <>
            Revision 15.
            {" "}
            <span className={cx("mono")}>approve</span>
            {" "}
            becomes absolute,
            {" "}
            <span className={cx("mono")}>unapprove</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>Unapproved</span>
            {" "}
            are deleted,
            {" "}
            <span className={cx("mono")}>Approved</span>
            {" "}
            is renamed back to
            {" "}
            <span className={cx("mono")}>Approval</span>
            . Six methods, two events, nothing extra. Forty-eight days after the issue was filed.
            </>
          }
        >
          <p>
            This is finding 4, and it is a bound rather than a timestamp. The issue thread was silent between 2015-12-02T10:22:08Z and 2016-01-06T10:12:13Z, so no snapshot exists inside that window. What the evidence supports exactly: the final interface was
            {" "}
            <strong>not</strong>
            {" "}
            present at 10:12:13Z and
            {" "}
            <strong>was</strong>
            {" "}
            present at 10:28:48Z, sixteen minutes and thirty-five seconds later.
          </p>
          <h4>The body, verbatim, complete</h4>
          <CodeBlock lang="text" caption={"2,351 bytes. Carried by the comment at 2016-01-06T10:28:48Z."} code={"```\nERC: 20\nTitle: Token standard\nStatus: Draft\nType: Informational\nCreated: 19-11.2015\nResolution: https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs\n```\n# Abstract\n\nThe following describes standard functions a token contract can implement.\n\n# Motivation\n\nThose will allow dapps and wallets to handle tokens across multiple interfaces/dapps.\n\nThe most important here are, `transfer`, `balanceOf`, `decimals` and the `Transfer` event.\n\n# Specification\n\n## Token\n\n### Methods\n\n\n#### totalSupply\n\n```js\nfunction totalSupply() constant returns (uint256 supply)\n```\nGet the total token supply\n\n#### balanceOf\n\n```js\nfunction balanceOf(address _owner) constant returns (uint256 balance)\n```\nGet the account balance of another account with address `_owner`\n\n#### transfer\n\n```js\nfunction transfer(address _to, uint256 _value) returns (bool success)\n```\nSend `_value` amount of tokens to address `_to`\n\n#### transferFrom\n\n```js\nfunction transferFrom(address _from, address _to, uint256 _value) returns (bool success)\n```\nSend `_value` amount of tokens from address `_from` to address `_to`\n\nThe `transferFrom` method is used for a withdraw workflow, allowing contracts to send tokens on your behalf, for example to \"deposit\" to a contract address and/or to charge fees in sub-currencies; the command should fail unless the `_from` account has deliberately authorized the sender of the message via some mechanism; we propose these standardized APIs for approval:\n\n#### approve\n\n```js\nfunction approve(address _spender, uint256 _value) returns (bool success)\n```\nAllow _spender to withdraw from your account, multiple times, up to the _value amount. If this function is called again it overwrites the current allowance with _value.\n\n#### allowance\n\n```js\nfunction allowance(address _owner, address _spender) constant returns (uint256 remaining)\n```\nReturns the amount which `_spender ` is still allowed to withdraw from `_owner`\n\n\n### Events\n#### Transfer\n\n```js\nevent Transfer(address indexed _from, address indexed _to, uint256 _value)\n```\nTriggered when tokens are transferred.\n\n#### Approval\n\n```js\nevent Approval(address indexed _owner, address indexed _spender, uint256 _value)\n```\nTriggered whenever `approve(address _spender, uint256 _value)` is called."} />
          <p>
            Three details are worth noting in that text. The Motivation still recommends
            {" "}
            <code>decimals</code>
            , which was removed six weeks earlier and is not defined anywhere below. The word “coins” from the original has been replaced by “tokens” throughout. And the sentence defining
            {" "}
            <code>approve</code>
            {" "}
            as overwriting rather than accumulating,
            {" "}
            <em>“If this function is called again it overwrites the current allowance with _value”</em>
            , is the sentence that makes
            {" "}
            <code>unapprove</code>
            {" "}
            unnecessary and is the direct descendant of ConsenSys's “Absolute approval” commit sixteen days earlier.
          </p>
          <h4>What happened next, the same morning</h4>
          <ul>
            <li>
              <span className={cx("mono")}>10:48:26Z</span>
              , twenty minutes later, caktux mirrors it on the wiki: “update to latest draft - approve() now absolute, remove unapprove() and Unapproved(), Approved() renamed to Approval()”.
            </li>
            <li>
              <span className={cx("mono")}>20:55:55Z</span>
              , revision 16, a twelve-byte change. The body then does not change again across
              {" "}
              <strong>111 consecutive comment snapshots</strong>
              , until 28 October 2016. That is genuine stability, not a gap in coverage.
            </li>
          </ul>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Snapshot carried by</span>
              <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-169288676" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                comment 169288676, frozeman
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>GH Archive file</span>
              <span className={cx("val mono")}>data.gharchive.org/2016-01-06-10.json.gz</span>
            </li>
            <li>
              <span className={cx("lbl")}>Wiki mirror</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/02c64c1f61ad418982ed9f014f329838b61a8c12" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                02c64c1 · 2016-01-06T10:48:26Z
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/issue20-bodies/r15-20160106T102848Z.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-first-contract-on-mainnet-carrying-all-six-selectors"
          src="chain"
          star
          date={"2016-01-10"}
          times={["00:21:08Z"]}
          mobileWhen={"2016-01-10 · 00:21:08Z · block 824,235"}
          title={"First contract on mainnet carrying all six selectors"}
          tags={[{ label: "mainnet", actor: false }, { label: "finding 8", actor: false }]}
          summary={
            <>
            <span className={cx("mono")}>
              <Addr a="0x99146Bab2bB34D9Ca49EC4f0c82De3E5789ae22e" />
            </span>
            , 6,701 bytes. Four days after the specification stopped moving. It carries the interface and is not a token: its supply reads zero at every block checked and it has never emitted a
            {" "}
            <span className={cx("mono")}>Transfer</span>
            .
            </>
          }
        >
          <dl className={cx("deflist")}>
            <div>
              <dt>Address</dt>
              <dd className={cx("mono")}>
                <Addr a="0x99146Bab2bB34D9Ca49EC4f0c82De3E5789ae22e" />
              </dd>
            </div>
            <div>
              <dt>Deployed</dt>
              <dd className={cx("mono")}>2016-01-10T00:21:08Z, block 824,235</dd>
            </div>
            <div>
              <dt>Deployer</dt>
              <dd className={cx("mono")}>
                <Addr a="0x4f53269e422711d4725F7381444c7F66F7D05788" />
              </dd>
            </div>
            <div>
              <dt>Runtime size</dt>
              <dd className={cx("mono")}>6,701 bytes</dd>
            </div>
            <div>
              <dt>Contents</dt>
              <dd>
                All six methods. Both the
                {" "}
                <span className={cx("mono")}>Transfer</span>
                {" "}
                and
                {" "}
                <span className={cx("mono")}>Approval</span>
                {" "}
                topics. Plus
                {" "}
                <span className={cx("mono")}>owner()</span>
                {" "}
                and 45 further unrecognised selectors.
              </dd>
            </div>
            <div>
              <dt>Supply</dt>
              <dd>
                <span className={cx("mono")}>totalSupply()</span>
                {" "}
                returns zero at the block after deployment, five thousand blocks later, forty thousand blocks later, and at block 913,198. It has never emitted a
                {" "}
                <span className={cx("mono")}>Transfer</span>
                .
              </dd>
            </div>
          </dl>
          <p>
            Carrying the interface and being a token are different claims, and this contract separates them. It is the Digix gold ledger, and this deployment and the one that follows it eleven hours later,
            {" "}
            <span className={cx("mono")}>
              <Addr a="0xB2dd0dc22c7D103928650AbD260935Ef9EF40CFc" />
            </span>
            , are staging runs: the same 6,701 bytes, no supply, no transfer, ever. The ledger that went into service is the third, on 14 January.
          </p>
          <p>
            The gap this closes is the central empirical result of the reconstruction. Between 3 November 2015 and 6 January 2016, across 2,941 contracts with runtime bytecode,
            {" "}
            <strong>nothing implements more than three of the six</strong>
            , and
            {" "}
            <strong>
              nothing at all implements
              {" "}
              <code>approve</code>
              {" "}
              or
              {" "}
              <code>allowance</code>
            </strong>
            . The allowance model, the half of ERC-20 that makes exchanges possible and the half that consumed almost all of the argument on the issue, has zero deployed instances during the period in which it was being specified.
          </p>
          <p>
            See the
            {" "}
            <a href="#onchain">onchain section</a>
            {" "}
            for the full census and the adoption curve.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/onchain/y2016-final-six-4plus.json</span>
            </li>
            <li>
              <span className={cx("lbl")}>Detection</span>
              <span className={cx("val")}>
                Opcode walk over the runtime blob, cross-checked by substring match. See Method.
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-first-contract-with-the-interface-and-a-real-supply"
          src="chain"
          star
          date={"2016-01-14"}
          times={["15:22:33Z"]}
          mobileWhen={"2016-01-14 · 15:22:33Z · block 847,527"}
          title={"The first contract with the interface and a real supply"}
          tags={[{ label: "mainnet", actor: false }, { label: "finding 9", actor: false }]}
          summary={
            <>
            <span className={cx("mono")}>
              <Addr a="0x55b9a11c2e8351b4Ffc7b11561148bfaC9977855" />
            </span>
            , Digix Gold 1.0, 6,770 bytes. The first contract that is a token and not only an interface: a supply exists from the block after it was deployed. It is not fully compliant with EIP-20, and the defects are in the event shape.
            </>
          }
        >
          <dl className={cx("deflist")}>
            <div>
              <dt>Address</dt>
              <dd className={cx("mono")}>
                <Addr a="0x55b9a11c2e8351b4Ffc7b11561148bfaC9977855" />
              </dd>
            </div>
            <div>
              <dt>Deployed</dt>
              <dd className={cx("mono")}>2016-01-14T15:22:33Z, block 847,527</dd>
            </div>
            <div>
              <dt>Deployer</dt>
              <dd className={cx("mono")}>
                <Addr a="0x4f53269e422711d4725F7381444c7F66F7D05788" />
              </dd>
            </div>
            <div>
              <dt>Runtime size</dt>
              <dd className={cx("mono")}>6,770 bytes</dd>
            </div>
            <div>
              <dt>Supply</dt>
              <dd className={cx("mono")}>1,400,331,016,000</dd>
            </div>
            <div>
              <dt>
                First
                {" "}
                <span className={cx("mono")}>Transfer</span>
              </dt>
              <dd className={cx("mono")}>block 937,821</dd>
            </div>
          </dl>
          <p>
            Four tests separate a token from a contract that merely exposes the interface, and this is the first deployment to pass all four. It carries the six selectors, among 38 other functions. It has a real supply:
            {" "}
            <span className={cx("mono")}>totalSupply()</span>
            {" "}
            returns 1,400,331,016,000 at block 847,528, the block after deployment, and the same value at every block sampled between there and block 937,821, so it was never an empty ledger waiting to be filled. It was meant as a token, being the address Digix names in its own
            {" "}
            <span className={cx("mono")}>gold-tokens-interface</span>
            {" "}
            repository and the one MyEtherWallet's token list carries as DGX 1.0. And it emits
            {" "}
            <span className={cx("mono")}>Transfer</span>
            {" "}
            when tokens move, from block 937,821 onward.
          </p>
          <p>
            The two Digix ledgers deployed four days earlier hold the identical interface and fail every test but the first. Their supply reads zero at deployment, five thousand blocks later, forty thousand blocks later, and at block 913,198, and neither has emitted a
            {" "}
            <span className={cx("mono")}>Transfer</span>
            {" "}
            in its life. They are staging deployments of the contract this one became.
          </p>
          <p>
            <strong>What it is not is fully compliant with EIP-20.</strong>
            {" "}
            Run on a mainnet fork it breaks two mandatory requirements, both visible in what it emits:
          </p>
          <ul className={cx("sources")} style={{ listStyle: "none" }}>
            <li>
              <span className={cx("lbl")}>Event shape</span>
              <span className={cx("val")}>
                <span className={cx("mono")}>Transfer</span>
                {" "}
                is declared with
                {" "}
                <span className={cx("mono")}>_value</span>
                {" "}
                indexed. Every one it has emitted carries
                {" "}
                <strong>four topics and an empty data field</strong>
                . EIP-20 requires three topics with the value in data, so a reader following the standard finds no amount at all.
              </span>
            </li>
            <li>
              <span className={cx("lbl")}>Wrong sender</span>
              <span className={cx("val")}>
                <span className={cx("mono")}>transferFrom</span>
                {" "}
                names the
                {" "}
                <strong>spender</strong>
                {" "}
                as
                {" "}
                <span className={cx("mono")}>_from</span>
                , not the owner whose balance moved. One call emits three
                {" "}
                <span className={cx("mono")}>Transfer</span>
                {" "}
                events, one of them a fee leg, and the movement leg attributes the debit to the wrong account.
              </span>
            </li>
          </ul>
          <p>
            Both are properties of the deployed runtime, unchanged since 2016 and reproducible at any block. The first contract that satisfies every EIP-20 requirement arrives on
            {" "}
            <a href="#ev-first-compliant">20 March 2016</a>
            , sixty-six days later.
          </p>
          <p>
            The first ERC-20 token cannot be verified on Etherscan. It belongs to a Digix system compiled by solc v0.1.7 commit
            {" "}
            <span className={cx("mono")}>c806b9bc</span>
            , a build that exists in the Solidity history and was never published to solc-bin, so no released compiler reproduces its bytecode.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Interface</span>
              <a href="https://github.com/DigixGlobal/gold-tokens-interface" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                DigixGlobal/gold-tokens-interface
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Detection</span>
              <span className={cx("val")}>
                Selector walk over the runtime, then
                {" "}
                <span className={cx("mono")}>totalSupply()</span>
                {" "}
                at historical blocks and a log scan on the
                {" "}
                <span className={cx("mono")}>Transfer</span>
                {" "}
                topic.
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-dao-adopts-the-exact-interface"
          src="code"
          date={"2016-01-16"}
          times={["14:34:37Z"]}
          mobileWhen={"2016-01-16 · 14:34:37Z"}
          title={"The DAO adopts the exact interface"}
          tags={[{ label: "CJentzsch", actor: true }, { label: "slockit/DAO", actor: false }, { label: "6 of 6", actor: false }]}
          summary={
            <>
            “update Token.sol to new standard”. Six of six, no extras. Two days later ConsenSys imports this contract's NatSpec into its own.
            </>
          }
        >
          <CodeBlock lang="sol" code={"function totalSupply()\nfunction balanceOf(address _owner)\nfunction transfer(address _to, uint256 _value)\nfunction transferFrom(address _from, address _to, uint256 _value)\nfunction approve(address _spender, uint256 _value)\nfunction allowance(address _owner, address _spender)\n\nevent Transfer(address indexed _from, address indexed _to, uint256 _value)\nevent Approval(address indexed _owner, address indexed _spender, uint256 _value)"} />
          <p>
            Documentation flows in the opposite direction to the interface. The interface went from the issue to ConsenSys to the DAO. The NatSpec goes from the DAO back to ConsenSys, on 18 January, with the commit message “Added NATSPEC from Christoph Jentzsch's Slock.it Token Contract.”
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/slockit/DAO/commit/bf27cf75370a06d17d512890c833904b06c73f25" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                bf27cf7 · update Token.sol to new standard
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>NatSpec import</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/cebd132031192ba85fd6c14476d79766b19d04a3" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ConsenSys/Tokens cebd132 · 2016-01-18T09:27:41Z
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/code-snapshots/slockitDAO-bf27cf7-Token.sol</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-implement-erc-20-the-first-commit-message-to-name-the-standa"
          src="code"
          star
          date={"2016-01-25"}
          times={["00:39:07Z"]}
          mobileWhen={"2016-01-25 · 00:39:07Z"}
          title={"“implement ERC 20”, the first commit message to name the standard"}
          tags={[{ label: "ethers", actor: true }, { label: "ConsenSys/Tokens", actor: false }, { label: "finding: first naming", actor: false }]}
          summary={
            <>
            A single-line change to a source comment. It is the moment the reference implementation stopped citing the wiki page and started citing the issue. The code does not change.
            </>
          }
        >
          <CodeBlock lang="diff" caption={"ConsenSys/Tokens 85610c3, complete diff"} code={"diff --git a/Token_Contracts/contracts/Standard_Token.sol b/Token_Contracts/contracts/Standard_Token.sol\nindex ab28fea..28f1ceb 100644\n--- a/Token_Contracts/contracts/Standard_Token.sol\n+++ b/Token_Contracts/contracts/Standard_Token.sol\n@@ -1,7 +1,7 @@\n /*Most, basic default, standardised Token contract.\n Allows the creation of a token with a finite issued amount to the creator.\n \n-Based on standardised APIs: https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs\n+Implements ERC 20 Token standard: https://github.com/ethereum/EIPs/issues/20\n .*/\n \n import \"Token\";"} />
          <p>
            Two months after the issue was filed and five weeks after the code was already correct, someone writes the standard's name down in a repository for the first time. The name lags the thing by a wide margin at every stage of this trail.
          </p>
          <h4>The naming sequence</h4>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>UTC</th>
                  <th>What</th>
                  <th>Where</th>
                  <th>Text</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-01-01T08:56:36Z
                  </td>
                  <td data-label="What">
                    First README pointing at issue #20
                  </td>
                  <td data-label="Where" className={cx("mono")}>
                    ConsenSys/Tokens bbbff96
                  </td>
                  <td data-label="Text">
                    “de facto finalised by the community here”
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-01-25T00:39:07Z
                  </td>
                  <td data-label="What">
                    First commit message naming ERC 20
                  </td>
                  <td data-label="Where" className={cx("mono")}>
                    ConsenSys/Tokens 85610c3
                  </td>
                  <td data-label="Text" className={cx("mono")}>
                    implement ERC 20
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-02-08T20:06:34Z
                  </td>
                  <td data-label="What">
                    First closed-up form “ERC20”
                  </td>
                  <td data-label="Where" className={cx("mono")}>
                    ConsenSys/Tokens aba060b
                  </td>
                  <td data-label="Text">
                    “Commented out TransferFrom to reflect current uncertainty in ERC20.”
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-04-16T19:14:35Z
                  </td>
                  <td data-label="What">
                    Wiki commit naming ERC20
                  </td>
                  <td data-label="Where" className={cx("mono")}>
                    ethereum/wiki f3f6a74
                  </td>
                  <td data-label="Text">
                    “further highlight ERC20”
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-04-24T19:55:53Z
                  </td>
                  <td data-label="What">
                    First repo named
                    {" "}
                    <span className={cx("mono")}>erc20</span>
                    ; first Solidity
                    {" "}
                    <span className={cx("mono")}>contract ERC20</span>
                  </td>
                  <td data-label="Where" className={cx("mono")}>
                    dapphub/erc20 e970781
                  </td>
                  <td data-label="Text" className={cx("mono")}>
                    erc20 type definition
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            “First” here means first across the sources enumerated in
            {" "}
            <a href="#method">Method</a>
            . Commit-message evidence outside those repositories was sampled through GH Archive rather than exhaustively searched.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/85610c3ed1a614453fe32834a2694dd9ec000de9" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                85610c3ed1a614453fe32834a2694dd9ec000de9
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Author</span>
              <span className={cx("val")}>{"ethers <ethereum@outlook.com>"}</span>
            </li>
            <li>
              <span className={cx("lbl")}>Author date</span>
              <span className={cx("val mono")}>2016-01-24 16:39:07 -0800</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-first-erc-20-transfer"
          src="chain"
          star
          date={"2016-01-27"}
          times={["16:54:44Z"]}
          mobileWhen={"2016-01-27 · 16:54:44Z · block 913,198"}
          title={"The first ERC-20 transfer"}
          tags={[{ label: "mainnet", actor: false }, { label: "finding 10", actor: false }]}
          summary={
            <>
            elcoin,
            {" "}
            <span className={cx("mono")}>
              <Addr a="0xa04bf47F0E9D1745D254b9B89f304c7d7ad121Aa" />
            </span>
            . One account pays another 1,000,000 units, two hours after the contract was deployed. The first time a token moves under this interface. The contract itself is not compliant: its ERC-20 entry points return false and do nothing.
            </>
          }
        >
          <dl className={cx("deflist")}>
            <div>
              <dt>Address</dt>
              <dd className={cx("mono")}>
                <Addr a="0xa04bf47F0E9D1745D254b9B89f304c7d7ad121Aa" />
              </dd>
            </div>
            <div>
              <dt>Deployed</dt>
              <dd className={cx("mono")}>2016-01-27T14:47:57Z, block 912,760</dd>
            </div>
            <div>
              <dt>
                First
                {" "}
                <span className={cx("mono")}>Transfer</span>
              </dt>
              <dd className={cx("mono")}>2016-01-27T16:54:44Z, block 913,198</dd>
            </div>
            <div>
              <dt>From</dt>
              <dd className={cx("mono")}>
                <Addr a="0x48175Da4c20313bcb6B62d74937d3fF985885701" />
              </dd>
            </div>
            <div>
              <dt>To</dt>
              <dd className={cx("mono")}>
                <Addr a="0x96CB25A6445648A56352677D6C80600F769F2642" />
              </dd>
            </div>
            <div>
              <dt>Value</dt>
              <dd className={cx("mono")}>1,000,000</dd>
            </div>
          </dl>
          <p>
            Not a mint. The sender is the deployer's own account, not the zero address, so this is one holder paying another rather than a supply being created. The contract answers
            {" "}
            <span className={cx("mono")}>name()</span>
            {" "}
            with a bytes32 that decodes to
            {" "}
            <span className={cx("mono")}>elcoin</span>
            , and answers neither
            {" "}
            <span className={cx("mono")}>symbol()</span>
            {" "}
            nor
            {" "}
            <span className={cx("mono")}>decimals()</span>
            , both of which were optional and arrived later.
          </p>
          <p>
            Thirteen days separate the first token from the first transfer, and in that window no contract carrying the interface moved a single token. Digix Gold, deployed first, did not emit its own first
            {" "}
            <span className={cx("mono")}>Transfer</span>
            {" "}
            until block 937,821.
          </p>
          <p>
            <strong>The event is real, the interface behind it is not.</strong>
            {" "}
            elcoin holds all six selectors, but its own ERC-20 entry points do nothing. Called on a fork,
            {" "}
            <span className={cx("mono")}>transfer</span>
            ,
            {" "}
            <span className={cx("mono")}>approve</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>transferFrom</span>
            {" "}
            each
            {" "}
            <strong>return false, move no balance and emit no event</strong>
            , from a funded holder as readily as from an empty account. The contract asks a security registry at
            {" "}
            <span className={cx("mono")}>
              <Addr a="0xa95b9127e7102dCFa3869c47ee12a0Ec85C261C5" />
            </span>
            {" "}
            whether the caller is permitted, receives zero, and returns. The behaviour is identical at block 950,000 and at the head of the chain, so this is not a later configuration change.
          </p>
          <p>
            Every transfer elcoin recorded, all 1,450 of them, was driven through a platform controller rather than through
            {" "}
            <span className={cx("mono")}>transfer</span>
            . The chain also records the other half of that:
            {" "}
            <strong>
              every direct call to
              {" "}
              <span className={cx("mono")}>transfer(address,uint256)</span>
              {" "}
              in elcoin's history failed.
            </strong>
            {" "}
            It is an asset on a permissioned platform that exposes the ERC-20 shape, not a contract that behaves as ERC-20 requires.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Detection</span>
              <span className={cx("val")}>
                Log scan on topic
                {" "}
                <span className={cx("mono")}>ddf252ad…</span>
                {" "}
                from each candidate's deployment block, earliest first.
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-first-minimal-erc-20-on-mainnet"
          src="chain"
          date={"2016-01-28"}
          times={["14:01:48Z"]}
          mobileWhen={"2016-01-28 · 14:01:48Z · block 917,622"}
          title={"The first minimal ERC-20 on mainnet"}
          tags={[{ label: "mainnet", actor: false }, { label: "finding 11", actor: false }]}
          summary={
            <>
            <span className={cx("mono")}>
              <Addr a="0x37Dca38b1CBB2Cd043910eC46fe82Ddb9e38F00d" />
            </span>
            , 754 bytes. A dispatcher containing the six selectors and nothing else. A real token, with a supply of 1,000,000 that has never moved. It meets nine of the ten requirements of EIP-20 as finalised, and the tenth was written after it was deployed.
            </>
          }
        >
          <dl className={cx("deflist")}>
            <div>
              <dt>Address</dt>
              <dd className={cx("mono")}>
                <Addr a="0x37Dca38b1CBB2Cd043910eC46fe82Ddb9e38F00d" />
              </dd>
            </div>
            <div>
              <dt>Deployed</dt>
              <dd className={cx("mono")}>2016-01-28T14:01:48Z, block 917,622</dd>
            </div>
            <div>
              <dt>Deployer</dt>
              <dd className={cx("mono")}>
                <Addr a="0x16893e10b99A59afd2C60331E0B49241d4d4d7cC" />
              </dd>
            </div>
            <div>
              <dt>Runtime size</dt>
              <dd className={cx("mono")}>754 bytes</dd>
            </div>
            <div>
              <dt>Contents</dt>
              <dd>
                Exactly
                {" "}
                <span className={cx("mono")}>totalSupply</span>
                ,
                {" "}
                <span className={cx("mono")}>balanceOf</span>
                ,
                {" "}
                <span className={cx("mono")}>transfer</span>
                ,
                {" "}
                <span className={cx("mono")}>transferFrom</span>
                ,
                {" "}
                <span className={cx("mono")}>approve</span>
                ,
                {" "}
                <span className={cx("mono")}>allowance</span>
                . Both event topics. Zero unrecognised selectors. No
                {" "}
                <span className={cx("mono")}>name</span>
                ,
                {" "}
                <span className={cx("mono")}>symbol</span>
                {" "}
                or
                {" "}
                <span className={cx("mono")}>decimals</span>
                .
              </dd>
            </div>
            <div>
              <dt>Supply</dt>
              <dd className={cx("mono")}>1,000,000, all of it the deployer's</dd>
            </div>
            <div>
              <dt>
                <span className={cx("mono")}>Transfer</span>
                {" "}
                events
              </dt>
              <dd>None, ever</dd>
            </div>
          </dl>
          <p>
            It is a token, not a bare interface.
            {" "}
            <span className={cx("mono")}>totalSupply()</span>
            {" "}
            returns 1,000,000 and
            {" "}
            <span className={cx("mono")}>balanceOf</span>
            {" "}
            of the deployer returns the same, so the whole supply sits where it was created and has never moved: the contract has not emitted a single
            {" "}
            <span className={cx("mono")}>Transfer</span>
            . The source Etherscan serves for it has no constructor, which is what makes the supply look impossible. Etherscan verifies against the deployed runtime, and constructor code never reaches the runtime, so a verified source can be missing the constructor that set the contract's opening state. The chain is the record, not the source.
          </p>
          <p>
            This is the deployed counterpart of ConsenSys's
            {" "}
            <span className={cx("mono")}>c3a3426</span>
            : the interface and nothing else, on mainnet, thirty-eight days after the same shape appeared in a file. Only 28 contracts across January and February 2016 combined carry all six.
          </p>
          <p>
            <strong>It is one requirement short of full compliance, and the requirement did not exist yet.</strong>
            {" "}
            Executed against all ten obligations of EIP-20 as finalised, it satisfies nine. Both
            {" "}
            <span className={cx("mono")}>transfer</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>transferFrom</span>
            {" "}
            are guarded by
            {" "}
            <span className={cx("mono")}>{"&& _value > 0"}</span>
            , so a transfer of zero returns false and emits nothing, where the finished standard requires it to be treated as an ordinary transfer and to fire
            {" "}
            <span className={cx("mono")}>Transfer</span>
            .
          </p>
          <p>
            That clause is worth dating. It appears in the earliest copy of
            {" "}
            <span className={cx("mono")}>eip-20-token-standard.md</span>
            {" "}
            in the EIPs repository, on 13 July 2017. It is
            {" "}
            <strong>not</strong>
            {" "}
            in the text of issue #20 as filed on 19 November 2015, and it is not in the issue today. Judged against EIP-20 as it was finally written, this contract fails. Judged against the specification as it stood on the day it was deployed, it passes, and it is the first contract that does.
          </p>
          <p>
            Everything else holds: all three mutators return a 32-byte boolean,
            {" "}
            <span className={cx("mono")}>approve</span>
            {" "}
            overwrites rather than accumulates,
            {" "}
            <span className={cx("mono")}>transferFrom</span>
            {" "}
            decrements the allowance, and both events carry three topics with the value in data. It is also the only one of the early candidates with verified source on Etherscan, so the guard can be read rather than inferred.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/onchain/y2016-final-six-4plus.json</span>
            </li>
          </ul>
        </TimelineEvent>
      </TimelineEra>
    </>
  );
}
