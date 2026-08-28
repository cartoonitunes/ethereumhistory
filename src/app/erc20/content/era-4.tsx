// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";
import { TimelineEra, TimelineEvent } from "../components/Timeline";

export function Era4() {
  return (
    <>
      <TimelineEra
        id="era-4"
        span={"8 February 2016 – 13 December 2016"}
        title={"Adopting the name"}
        blurb={
          <>
            The interface has stopped changing. What happens through 2016 is that the phrase “ERC20” detaches from the issue number and becomes the name of a thing, while the wiki page that started it stops specifying anything and defers.
          </>
        }
      >
        <TimelineEvent
          id="ev-the-closed-up-form-erc20"
          src="code"
          date={"2016-02-08"}
          times={["20:06:34Z"]}
          mobileWhen={"2016-02-08 · 20:06:34Z"}
          title={"The closed-up form: “ERC20”"}
          tags={[{ label: "Simon de la Rouviere", actor: true }, { label: "ConsenSys/Tokens", actor: false }]}
          summary={
            <>
            “Commented out TransferFrom to reflect current uncertainty in ERC20.” The first use of the name without a space, two weeks after the first use with one.
            </>
          }
        >
          <p>
            The commit message is also evidence that the standard was not settled in practice even after the text froze. A
            {" "}
            <span className={cx("mono")}>TransferFrom</span>
            {" "}
            event had been added on 30 January and is commented out nine days later, explicitly because of “current uncertainty”.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/aba060bf4aad04ae3f9d8b24c746f4c5eecfcc22" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                aba060b
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Event added</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/8fb1f31bed0d9309ec353bda5439be671c2a0d00" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                8fb1f31 · Added in TransferFrom event, 2016-01-30T13:10:17Z
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-approve-and-transferfrom-reach-ethereum-org"
          src="guide"
          date={"2016-02-12"}
          times={["19:22:49Z"]}
          mobileWhen={"2016-02-12 · 19:22:49Z"}
          title={"approve and transferFrom reach ethereum.org"}
          tags={[{ label: "Alexandre Van de Sande", actor: true }, { label: "ethereum/ethereum-org", actor: false }]}
          summary={
            <>
            The allowance model appears on the Foundation's token page for the first time, five weeks after the specification froze and three months after it was written into issue #20.
            </>
          }
        >
          <p>
            Commit message: “Added improve this button. Removed old images”. The page roughly doubles in size, from 14.8 KB to 36.1 KB, and gains an advanced token section carrying
            {" "}
            <code>approve</code>
            {" "}
            and
            {" "}
            <code>transferFrom</code>
            .
          </p>
          <p>
            The ordering across the Foundation's own properties is the point.
            {" "}
            <code>approve</code>
            {" "}
            and
            {" "}
            <code>allowance</code>
            {" "}
            entered the specification on 19 and 20 November 2015. They reach ethereum.org on 12 February 2016. The go-ethereum wiki tutorial behind the Frontier Guide never gains them at all.
          </p>
          <p>
            Even here the page does not name the standard. The word ERC does not appear.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ethereum/ethereum-org/commit/88c217e" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ethereum-org 88c217e · Added improve this button. Removed old images
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Author date</span>
              <span className={cx("val mono")}>2016-02-12 17:22:49 -0200</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-van-de-sande-s-own-implementation"
          src="gist"
          date={"2016-02-13"}
          times={["18:38:56Z"]}
          mobileWhen={"2016-02-13 · 18:38:56Z"}
          title={"Van de Sande's own implementation"}
          tags={[{ label: "alexvandesande", actor: true }, { label: "gist 0d1a998…", actor: false }, { label: "5 of 6", actor: false }]}
          summary={
            <>
            Gist
            {" "}
            <span className={cx("mono")}>alexvandesande/0d1a998d949e26942212</span>
            , “Token Standard”. Five of six by signature, missing
            {" "}
            <span className={cx("mono")}>totalSupply</span>
            , and no
            {" "}
            <span className={cx("mono")}>Approval</span>
            {" "}
            event. Its
            {" "}
            <code>approve</code>
            {" "}
            calls back into the spender.
            </>
          }
        >
          <CodeBlock lang="sol" code={"contract tokenRecipient { function sendApproval(address _from, uint256 _value, address _token); }\n\ncontract MyToken {\n    string public name; string public symbol; uint8 public decimals;\n    mapping (address => uint256) public balanceOf;\n    mapping (address => mapping (address => uint)) public allowance;\n    mapping (address => mapping (address => uint)) public spentAllowance;\n    event Transfer(address indexed from, address indexed to, uint256 value);\n\n    function transfer(address _to, uint256 _value) { … }\n    function approve(address _spender, uint256 _value) returns (bool success) {\n        allowance[msg.sender][_spender] = _value;\n        tokenRecipient spender = tokenRecipient(_spender);\n        spender.sendApproval(msg.sender, _value, this);\n    }\n    function transferFrom(address _from, address _to, uint256 _value) returns (bool success) { … }\n    function () { throw; }\n}"} />
          <p>
            <code>allowance</code>
            {" "}
            is present as a public-mapping getter rather than a declared function, which produces the same selector. The
            {" "}
            <code>spentAllowance</code>
            {" "}
            mapping means
            {" "}
            <code>approve</code>
            {" "}
            here sets a cumulative cap rather than the remaining allowance, which is not the final semantics.
          </p>
          <p>
            The
            {" "}
            <code>tokenRecipient.sendApproval</code>
            {" "}
            callback, renamed
            {" "}
            <code>receiveApproval</code>
            {" "}
            in his next comment three days later, is the direct ancestor of the
            {" "}
            <code>approveAndCall</code>
            {" "}
            and
            {" "}
            <code>receiveApproval</code>
            {" "}
            pattern that shipped in the ethereum.org token tutorial and propagated into thousands of 2017 token contracts. It is not part of ERC-20.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Gist</span>
              <a href="https://gist.github.com/alexvandesande/0d1a998d949e26942212" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                alexvandesande/0d1a998d949e26942212
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Revision</span>
              <span className={cx("val mono")}>a7f33cd9e905b4b0819c38c265a7ca2903f43ab7</span>
            </li>
            <li>
              <span className={cx("lbl")}>Posted to the issue</span>
              <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-183720260" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                issuecomment-183720260
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/gists/avsa-token-standard-a7f33cd9-20160213.sol</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-all-your-token-need-is-balanceof-and-transfer"
          src="eips"
          star
          date={"2016-03-15"}
          times={["13:28:32Z"]}
          mobileWhen={"2016-03-15 · 13:28:32Z"}
          title={"“All your token need is balanceOf and transfer”"}
          tags={[{ label: "alexvandesande", actor: true }, { label: "ethereum/EIPs #20", actor: false }, { label: "comment 196816918", actor: false }]}
          summary={
            <>
            Four months after MistCoin and two months after the specification froze, the Foundation's UX lead is still telling token authors on the standard's own issue thread that two methods and one event are sufficient.
            </>
          }
        >
          <blockquote>
            In order to work on the Ethereum Wallet all your token need is to implement correctly
            {" "}
            <code>balanceOf</code>
            {" "}
            and
            {" "}
            <code>transfer</code>
            {" "}
            and their corresponding events. We are waiting for all others but the latest proposed standard is kept updated at ethereum.org/token
            <cite>Verbatim</cite>
          </blockquote>
          <p>
            This is the single most useful sentence in the whole issue for dating what “compliance” meant. It is stated by the person who built the client that defined the requirement, on the standard's own thread, and it corroborates the wallet ABI evidence from the other direction. See
            {" "}
            <a href="#compliance">Compliance</a>
            .
          </p>
          <h4>His other interventions on the thread</h4>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>UTC</th>
                  <th>Comment</th>
                  <th>Substance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-19T16:31:57Z
                  </td>
                  <td data-label="Comment" className={cx("mono")}>
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-158110210" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      158110210
                    </a>
                  </td>
                  <td data-label="Substance">
                    Defends
                    {" "}
                    <span className={cx("mono")}>decimals</span>
                    ,
                    {" "}
                    <span className={cx("mono")}>name</span>
                    ,
                    {" "}
                    <span className={cx("mono")}>symbol</span>
                    ; states the “pave the cowpaths” doctrine
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-30T19:13:48Z
                  </td>
                  <td data-label="Comment" className={cx("mono")}>
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-160729345" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      160729345
                    </a>
                  </td>
                  <td data-label="Substance">
                    Proposes
                    {" "}
                    <span className={cx("mono")}>int256</span>
                    {" "}
                    over
                    {" "}
                    <span className={cx("mono")}>uint256</span>
                    {" "}
                    so tokens can represent debt. Rejected.
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-12-02T16:00:32Z
                  </td>
                  <td data-label="Comment" className={cx("mono")}>
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-161344667" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      161344667
                    </a>
                  </td>
                  <td data-label="Substance">
                    Continues the signed-balance argument
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-02-13T18:42:35Z
                  </td>
                  <td data-label="Comment" className={cx("mono")}>
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-183720260" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      183720260
                    </a>
                  </td>
                  <td data-label="Substance">
                    Posts an implementation with
                    {" "}
                    <span className={cx("mono")}>approve</span>
                    {" "}
                    plus a recipient callback
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-02-16T12:18:18Z
                    <br />
                    2016-02-16T12:24:17Z
                  </td>
                  <td data-label="Comment" className={cx("mono")}>
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-184661092" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      184661092
                    </a>
                    ,
                    {" "}
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-184662479" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      184662479
                    </a>
                  </td>
                  <td data-label="Substance">
                    Argues
                    {" "}
                    <span className={cx("mono")}>approve</span>
                    {" "}
                    should always notify the spender; proposes
                    {" "}
                    <span className={cx("mono")}>bytes metadata</span>
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-02-17T12:39:09Z
                  </td>
                  <td data-label="Comment" className={cx("mono")}>
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-185181532" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      185181532
                    </a>
                  </td>
                  <td data-label="Substance">
                    Had originally wanted hooks on
                    {" "}
                    <span className={cx("mono")}>transfer</span>
                    {" "}
                    too; was talked out of it
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-03-01T18:17:32Z
                    <br />
                    2016-03-01T22:23:11Z
                  </td>
                  <td data-label="Comment" className={cx("mono")}>
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-190839646" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      190839646
                    </a>
                    ,
                    {" "}
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-190933561" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      190933561
                    </a>
                  </td>
                  <td data-label="Substance">
                    Refers to the member as
                    {" "}
                    <span className={cx("mono")}>decimalPlaces()</span>
                    {" "}
                    and to
                    {" "}
                    <span className={cx("mono")}>baseUnit</span>
                    {" "}
                    as prior art
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-03-15T13:28:32Z
                  </td>
                  <td data-label="Comment" className={cx("mono")}>
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-196816918" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      196816918
                    </a>
                  </td>
                  <td data-label="Substance">
                    <strong>The operative statement of what compliance meant</strong>
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-04-12
                    <br />
                    2016-04-15
                    <br />
                    2016-04-19
                  </td>
                  <td data-label="Comment" className={cx("mono")}>
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-208944198" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      208944198
                    </a>
                    ,
                    {" "}
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-210397271" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      210397271
                    </a>
                    ,
                    {" "}
                    <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-211868211" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      211868211
                    </a>
                  </td>
                  <td data-label="Substance">
                    <span className={cx("mono")}>transfer</span>
                    {" "}
                    and
                    {" "}
                    <span className={cx("mono")}>balanceOf</span>
                    {" "}
                    are settled,
                    {" "}
                    <span className={cx("mono")}>approve</span>
                    {" "}
                    is not; asks for a
                    {" "}
                    <span className={cx("mono")}>standard</span>
                    {" "}
                    version variable
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/gharchive-events/issue20-events.jsonl</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-first-compliant"
          src="chain"
          star
          date={"2016-03-20"}
          times={["11:09:16Z"]}
          mobileWhen={"2016-03-20 · 11:09:16Z · block 1,184,107"}
          title={"The first fully ERC-20 compliant contract"}
          tags={[{ label: "mainnet", actor: false }, { label: "finding 12", actor: false }]}
          summary={
            <>
            <span className={cx("mono")}>
              <Addr a="0xacFD9D15fA769EaBb68410c4c675Ff2030f26416" />
            </span>
            , 2,356 bytes. An ether wrapper. The first contract on mainnet that satisfies all ten requirements of EIP-20 as finalised when its own code is executed. It was never used.
            </>
          }
        >
          <dl className={cx("deflist")}>
            <div>
              <dt>Address</dt>
              <dd className={cx("mono")}>
                <Addr a="0xacFD9D15fA769EaBb68410c4c675Ff2030f26416" />
              </dd>
            </div>
            <div>
              <dt>Deployed</dt>
              <dd className={cx("mono")}>2016-03-20T11:09:16Z, block 1,184,107</dd>
            </div>
            <div>
              <dt>Deployer</dt>
              <dd className={cx("mono")}>
                <Addr a="0x3a77633f26ddD2cf58D1fea2C889098565cA5C8C" />
              </dd>
            </div>
            <div>
              <dt>Runtime size</dt>
              <dd className={cx("mono")}>2,356 bytes</dd>
            </div>
            <div>
              <dt>Contents</dt>
              <dd>
                The six required methods, both event topics, plus
                {" "}
                <span className={cx("mono")}>deposit()</span>
                {" "}
                and
                {" "}
                <span className={cx("mono")}>withdraw(uint256)</span>
                . No
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
              <dt>Use</dt>
              <dd>One transaction in its life, its own creation. Zero logs.</dd>
            </div>
          </dl>
          <p>
            It is an ether wrapper, the pattern later made familiar by WETH.
            {" "}
            <span className={cx("mono")}>deposit()</span>
            {" "}
            credits the caller with the ether sent,
            {" "}
            <span className={cx("mono")}>withdraw(uint256)</span>
            {" "}
            returns it, and
            {" "}
            <span className={cx("mono")}>totalSupply()</span>
            {" "}
            reports the contract's own ether balance rather than a stored figure, so supply and backing cannot drift apart. It emits the same
            {" "}
            <span className={cx("mono")}>Deposit</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>Withdrawal</span>
            {" "}
            topics that canonical WETH9 would later use.
          </p>
          <p>
            <strong>Compliance here is a claim about behaviour, so it was tested by behaviour.</strong>
            {" "}
            The contract was run on a mainnet fork, funded through its own
            {" "}
            <span className={cx("mono")}>deposit()</span>
            {" "}
            rather than by writing storage, and every obligation checked against real transactions: receipts read for the events actually emitted,
            {" "}
            <span className={cx("mono")}>eth_call</span>
            {" "}
            used to measure the width of each return value. It passes all ten, and passes them twice, once at the head of the chain and once on a fork pinned 93 blocks after its deployment under the hardfork rules of the day.
          </p>
          <p>
            Reaching this point took a single opcode. The contract deployed on 25 February,
            {" "}
            <span className={cx("mono")}>
              <Addr a="0xb345180D0a2c791d4943a239f8eBb50eFA01C81a" />
            </span>
            , is the same code for its first 2,342 bytes and differs only in the tail bounds helper, which compares with
            {" "}
            <span className={cx("mono")}>ADD GT</span>
            {" "}
            where this one compares with
            {" "}
            <span className={cx("mono")}>ADD LT ISZERO</span>
            . Strict against inclusive. Under the strict form an amount of zero fails the check and the call throws, which is why the February contract rejects zero-value transfers and this one accepts them. That one comparison is the whole twenty-three day gap.
          </p>
          <div className={cx("callout callout--warn")} style={{ margin: "1.25rem 0" }}>
            <strong>Two things this claim does not say.</strong>
            {" "}
            It does not say this contract has
            {" "}
            <span className={cx("mono")}>name</span>
            ,
            {" "}
            <span className={cx("mono")}>symbol</span>
            {" "}
            or
            {" "}
            <span className={cx("mono")}>decimals</span>
            , because it has none. Those three are optional in EIP-20 and their absence does not affect compliance, but anyone who reads “fully compliant” as including them will want a later contract. Unknown selectors on this contract fall through to
            {" "}
            <span className={cx("mono")}>deposit()</span>
            , so
            {" "}
            <span className={cx("mono")}>name()</span>
            {" "}
            appears to answer; that is the fallback, not a metadata function. And it does not say this contract was important. It was never used. The address that carried this code into service is its byte-identical twin
            {" "}
            <span className={cx("mono")}>
              <Addr a="0xd654bDD32FC99471455e86C2E7f7D7b6437e9179" />
            </span>
            , deployed 81 blocks later the same morning by the same account, which went on to record 806 logs and 363 transfers from June 2016.
          </div>
          <p>
            Everything deployed before it fails. All 34 contracts carrying the six selectors that predate this block were executed the same way and every one breaks at least one requirement: thirteen return no boolean from
            {" "}
            <span className={cx("mono")}>transfer</span>
            , four return no data at all from
            {" "}
            <span className={cx("mono")}>totalSupply()</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>balanceOf()</span>
            , three index
            {" "}
            <span className={cx("mono")}>_value</span>
            {" "}
            in
            {" "}
            <span className={cx("mono")}>Transfer</span>
            , one has ERC-20 entry points that do nothing, and the remaining thirteen reject transfers of zero, some of them emitting the wrong events besides.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Corpus</span>
              <span className={cx("val")}>
                Every
                {" "}
                <span className={cx("mono")}>create</span>
                {" "}
                trace of 2015 and 2016, 6,187 and 230,818 respectively, internal creates included. 2015 yields no contract with all six selectors; 2016 yields 1,014.
              </span>
            </li>
            <li>
              <span className={cx("lbl")}>Detection</span>
              <span className={cx("val")}>
                PUSH-aware disassembly for selector presence, then execution on an
                {" "}
                <span className={cx("mono")}>anvil</span>
                {" "}
                mainnet fork for behaviour. Balances obtained through each contract's own mint path where one exists, otherwise by impersonating a live holder.
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-first-compliant-issued-token"
          src="chain"
          star
          date={"2016-03-28"}
          times={["18:12:05Z"]}
          mobileWhen={"2016-03-28 · 18:12:05Z · block 1,233,109"}
          title={"The first fully compliant token anyone actually used"}
          tags={[{ label: "mainnet", actor: false }, { label: "dapphub/dappsys", actor: false }, { label: "finding 12", actor: false }]}
          summary={
            <>
            <span className={cx("mono")}>
              <Addr a="0xC66eA802717bFb9833400264Dd12c2bCeAa34a6d" />
            </span>
            ,
            {" "}
            <span className={cx("mono")}>DSTokenFrontend</span>
            {" "}
            from dappsys 0.1.2. An independently issued token rather than a wrapper over ether, and the original MKR. Eight days after the ether wrapper, and still moving a decade later.
            </>
          }
        >
          <dl className={cx("deflist")}>
            <div>
              <dt>Address</dt>
              <dd className={cx("mono")}>
                <Addr a="0xC66eA802717bFb9833400264Dd12c2bCeAa34a6d" />
              </dd>
            </div>
            <div>
              <dt>Deployed</dt>
              <dd className={cx("mono")}>2016-03-28T18:12:05Z, block 1,233,109</dd>
            </div>
            <div>
              <dt>Deployer</dt>
              <dd className={cx("mono")}>
                <Addr a="0x5c83154239485698b694b8cD5953e8669d07b49E" />
              </dd>
            </div>
            <div>
              <dt>Runtime size</dt>
              <dd className={cx("mono")}>3,040 bytes</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                Verified on Etherscan as
                {" "}
                <span className={cx("mono")}>DSTokenFrontend</span>
                , flattened from
                {" "}
                <span className={cx("mono")}>dapphub/dappsys</span>
                {" "}
                at tag
                {" "}
                <span className={cx("mono")}>0.1.2</span>
                , commit
                {" "}
                <span className={cx("mono")}>8ddd3f3</span>
              </dd>
            </div>
          </dl>
          <p>
            The 20 March contract is fully compliant and was never used: one transaction in its life, its own creation. This one is the other thing. It carries all six selectors and both event topics, it is a token whose supply was issued rather than backed by deposited ether, and it went on to be used for ten years.
          </p>
          <h4>What it is</h4>
          <p>
            <span className={cx("mono")}>DSTokenFrontend</span>
            {" "}
            is the front half of a three-part design that would become familiar: a thin, permanent address that holds no state and proxies every call to a swappable
            {" "}
            <span className={cx("mono")}>DSTokenController</span>
            , which in turn keeps balances and approvals in two separate database contracts. The frontend emits
            {" "}
            <span className={cx("mono")}>Transfer</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>Approval</span>
            {" "}
            itself, through
            {" "}
            <span className={cx("mono")}>emitTransfer</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>emitApproval</span>
            {" "}
            callbacks the controller invokes, so the logs stay at one address across an upgrade. That address is MakerDAO's original MKR, deployed through
            {" "}
            <span className={cx("mono")}>DSTokenFactory.buildDSTokenFrontend()</span>
            {" "}
            eight months before the first Sai release, and dappsys is the library MakerDAO's later
            {" "}
            <span className={cx("mono")}>DSToken</span>
            {" "}
            grew out of.
          </p>
          <p>
            Its
            {" "}
            <span className={cx("mono")}>token/erc20.sol</span>
            {" "}
            splits the interface into
            {" "}
            <span className={cx("mono")}>ERC20Stateless</span>
            ,
            {" "}
            <span className={cx("mono")}>ERC20Stateful</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>ERC20Events</span>
            , the three constant methods, the three that write, and the two events. That is the standard as issue #20 had left it fourteen months earlier, reproduced from the issue by someone building on it rather than debating it.
          </p>
          <h4>Use</h4>
          <p>
            Counted from the contract's own logs: 23,553
            {" "}
            <span className={cx("mono")}>Transfer</span>
            {" "}
            events across 4,569 distinct addresses, the first on 9 April 2016 and the most recent in June 2026. 444 of those transfers carry a value of zero and were logged anyway, which is the requirement that separated the 20 March contract from the seven-weeks-earlier candidates, satisfied here in production thousands of times over.
          </p>
          <div className={cx("callout callout--warn")}>
            <strong>Two bounds on the word “first”.</strong>
            {" "}
            The behavioural pass behind the 20 March finding covered every contract carrying the six selectors up to that block. Between it and this one, this archive's index holds five more: the wrapper's byte-identical twin
            {" "}
            <span className={cx("mono")}>
              <Addr a="0xd654bDD32FC99471455e86C2E7f7D7b6437e9179" />
            </span>
            {" "}
            and three others, none of them an issued token. And the transfer counts move: they were read at block 25,286,742 and the contract is still live.
          </div>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Contract</span>
              <a href="https://etherscan.io/address/0xc66ea802717bfb9833400264dd12c2bceaa34a6d" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                etherscan.io · DSTokenFrontend
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Library</span>
              <a href="https://github.com/dapphub/dappsys" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                github.com/dapphub/dappsys
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Method</span>
              <span className={cx("val")}>
                Selectors by substring match over the deployed runtime; usage by walking every
                {" "}
                <span className={cx("mono")}>Transfer</span>
                {" "}
                log the address has emitted, deduplicated by transaction hash and log index.
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-first-repository-named-erc20"
          src="code"
          star
          date={"2016-04-24"}
          times={["19:55:53Z"]}
          mobileWhen={"2016-04-24 · 19:55:53Z"}
          title={"The first repository named erc20"}
          tags={[{ label: "Nikolai Mushegian", actor: true }, { label: "dapphub/erc20", actor: false }, { label: "6 of 6 by selector", actor: false }]}
          summary={
            <>
            Nikolai Mushegian commits “erc20 type definition”. It is the first repository whose entire purpose is the interface, and the first Solidity file named
            {" "}
            <span className={cx("mono")}>erc20.sol</span>
            {" "}
            declaring
            {" "}
            <span className={cx("mono")}>contract ERC20</span>
            .
            </>
          }
        >
          <p>
            Cloned and read from the initial commit.
            {" "}
            <span className={cx("mono")}>README.md</span>
            {" "}
            in full:
            {" "}
            <em>“dapple package for ERC20 token type interface”</em>
            .
            {" "}
            <span className={cx("mono")}>dappfile</span>
            {" "}
            declares
            {" "}
            <span className={cx("mono")}>name: erc20</span>
            .
          </p>
          <h4>contracts/erc20.sol at that commit, complete</h4>
          <CodeBlock lang="sol" code={"contract ERC20 {\n    function totalSupply() constant returns (uint);\n    function balanceOf(address who) constant returns (uint);\n    function allowance(address owner, address spender) constant returns (uint);\n\n    function transfer(address to, uint value) returns (bool ok);\n    function transferFrom(address from, address to, uint value) returns (bool ok);\n    function approve(address spender, uint value) returns (bool ok);\n\n    event Transfer(address indexed from, address indexed to, uint value);\n    event Approval(address indexed owner, address indexed spender, uint value);\n}"} />
          <p>
            Six methods, two events, nothing else. Scored by literal declaration text against the final signatures this reads as three of six, because
            {" "}
            <span className={cx("mono")}>uint</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>uint256</span>
            {" "}
            are different strings. They are the same ABI type. Scored by canonical selector, which is what interoperability actually depends on, it is six of six and both events match:
          </p>
          <CodeBlock lang="text" code={"totalSupply()                          0x18160ddd\nbalanceOf(address)                     0x70a08231\nallowance(address,address)             0xdd62ed3e\ntransfer(address,uint256)              0xa9059cbb\ntransferFrom(address,address,uint256)  0x23b872dd\napprove(address,uint256)               0x095ea7b3\nTransfer(address,address,uint256)      0xddf252ad…b3ef\nApproval(address,address,uint256)      0x8c5be1e5…b925"} />
          <div className={cx("callout callout--warn")}>
            Two qualifications on “first repo named erc20”. The repository was originally under the
            {" "}
            <strong>nexusdev</strong>
            {" "}
            organisation, not dapphub, visible in the merge commit
            {" "}
            <span className={cx("mono")}>7e8cb92</span>
            {" "}
            of 2016-08-08: “Merge branch 'master' of github.com:nexusdev/erc20”. And “first” remains scoped to a
            {" "}
            <span className={cx("mono")}>gh search repos</span>
            {" "}
            sweep over 2015 and 2016 by name and description. It is not a claim about every repository that has ever existed.
          </div>
          <p>
            The base implementation arrives sixteen minutes later in
            {" "}
            <span className={cx("mono")}>c0b1dfc</span>
            , “copy base implementation and tests from dappsys”. The repository keeps its purpose:
            {" "}
            <span className={cx("mono")}>fc53f48</span>
            {" "}
            of 2017-02-02 reduces it back to the interface, and the file survives through solc 0.5.0 and 0.6.6.
          </p>
          <h4>No repository created in 2015 has ERC20 in its name or description</h4>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Repository</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Created" className={cx("mono")}>
                    2016-02-22
                  </td>
                  <td data-label="Repository" className={cx("mono")}>
                    daifoundation/maker-otc
                  </td>
                  <td data-label="Description">
                    The OasisDEX protocol, simple onchain market for ERC20 tokens
                  </td>
                </tr>
                <tr>
                  <td data-label="Created" className={cx("mono")}>
                    2016-04-24
                  </td>
                  <td data-label="Repository" className={cx("mono")}>
                    dapphub/erc20
                  </td>
                  <td data-label="Description">
                    erc20 interface definition container package
                  </td>
                </tr>
                <tr>
                  <td data-label="Created" className={cx("mono")}>
                    2016-05-11
                  </td>
                  <td data-label="Repository" className={cx("mono")}>
                    nexusdev/token-freezer
                  </td>
                  <td data-label="Description">
                    Multi-tenant ERC-20 token locker
                  </td>
                </tr>
                <tr>
                  <td data-label="Created" className={cx("mono")}>
                    2016-08-04
                  </td>
                  <td data-label="Repository" className={cx("mono")}>
                    BangkitSedar/ERC20-Token-Standard
                  </td>
                  <td data-label="Description">
                    ERC20 Token Standard
                  </td>
                </tr>
                <tr>
                  <td data-label="Created" className={cx("mono")}>
                    2016-08-10
                  </td>
                  <td data-label="Repository" className={cx("mono")}>
                    dapphub/ds-eth-token
                  </td>
                  <td data-label="Description">
                    ERC20 ETH token wrapper
                  </td>
                </tr>
                <tr>
                  <td data-label="Created" className={cx("mono")}>
                    2016-08-15
                  </td>
                  <td data-label="Repository" className={cx("mono")}>
                    dapphub/ds-token
                  </td>
                  <td data-label="Description">
                    A simple and sufficient ERC20 implementation
                  </td>
                </tr>
                <tr>
                  <td data-label="Created" className={cx("mono")}>
                    2016-11-08
                  </td>
                  <td data-label="Repository" className={cx("mono")}>
                    Giveth/minime
                  </td>
                  <td data-label="Description">
                    MiniMe Token. ERC20 compatible clonable token
                  </td>
                </tr>
                <tr>
                  <td data-label="Created" className={cx("mono")}>
                    2016-12-02
                  </td>
                  <td data-label="Repository" className={cx("mono")}>
                    danfinlay/human-standard-token-abi
                  </td>
                  <td data-label="Description">
                    A JSON ABI for the Ethereum ERC 20 Token Standard
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            A search for “token standard” restricted to Solidity over the same two years returns zero results.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/dapphub/erc20/commit/e9707811d80ab36fecc67deb3a75a41adda3a954" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                e9707811d80ab36fecc67deb3a75a41adda3a954
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Blob</span>
              <a href="https://github.com/dapphub/erc20/blob/e9707811d80ab36fecc67deb3a75a41adda3a954/contracts/erc20.sol" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                contracts/erc20.sol
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Author date</span>
              <span className={cx("val mono")}>2016-04-24 15:55:53 -0400</span>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/code-snapshots/dapphub-erc20-e970781-erc20-INITIAL.sol</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-wiki-stops-specifying-the-interface"
          src="wiki"
          date={"2016-05-20"}
          times={["20:38:26Z"]}
          mobileWhen={"2016-05-20 · 20:38:26Z"}
          title={"The wiki stops specifying the interface"}
          tags={[{ label: "ethers", actor: true }, { label: "ethereum/wiki", actor: false }, { label: "revision 46", actor: false }]}
          summary={
            <>
            “Transferable Fungibles is ERC 20”. Revision 46 replaces the interface section with a pointer to the issue. The page that started the standard eleven months earlier stops describing it.
            </>
          }
        >
          <p>
            Revisions 46 onward no longer specify anything. From this date the issue is the only document that defines ERC-20, which is also the reason its edit history had to be reconstructed from event payloads.
          </p>
          <p>
            ConsenSys makes the same separation a week earlier, on 13 May:
            {" "}
            <span className={cx("mono")}>StandardToken.sol</span>
            {" "}
            is made ERC20-only, and
            {" "}
            <span className={cx("mono")}>HumanStandardToken.sol</span>
            {" "}
            is created to carry
            {" "}
            <code>name</code>
            ,
            {" "}
            <code>symbol</code>
            {" "}
            and
            {" "}
            <code>decimals</code>
            . The optional three finally get their own file.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Wiki revision</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/eca915a3cec12164d87887ecd3c7f1305939ecca" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                eca915a · Transferable Fungibles is ERC 20
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>ConsenSys split</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/5252384b9a7a27d2a07d146276b253fb0873d0ac" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                5252384 · 2016-05-13T19:16:16Z
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-totalsupply-is-briefly-dropped-then-restored"
          src="eips"
          date={"2016-11-02"}
          times={["09:47:51Z", "2016-11-29"]}
          mobileWhen={"2016-11-02 · 09:47:51Z, and 2016-11-29 · 09:49:56Z"}
          title={"totalSupply is briefly dropped, then restored"}
          tags={[{ label: "frozeman", actor: true }, { label: "ethereum/EIPs #20", actor: false }, { label: "revisions 18 & 19", actor: false }]}
          summary={
            <>
            Revision 18 removes
            {" "}
            <span className={cx("mono")}>totalSupply</span>
            {" "}
            from the body. Revision 19, twenty-seven days later, restores it as
            {" "}
            <span className={cx("mono")}>returns (uint256 totalSupply)</span>
            . That is the text still live on the issue.
            </>
          }
        >
          <p>
            Between revision 16 on 6 January 2016 and revision 17 on 1 November 2016 the body did not change across 111 consecutive comment snapshots. The three late revisions are the only movement in the text after the standard froze.
          </p>
          <p>
            The last of the nineteen recovered revisions, on 2016-11-29, is the body as it stands. Two weeks after that, on 13 December 2016, frozeman marks his original proposal gist outdated with a banner pointing at the issue.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Revision 18</span>
              <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-257817926" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                comment 257817926
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Gist banner</span>
              <a href="https://gist.github.com/frozeman/090ae32041bcfe120824/e7d0cf0dec402aad7e690cb5255bb2ec04e4ee89" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                gist revision e7d0cf0, 2016-12-13T09:30:35Z
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifacts</span>
              <span className={cx("val mono")}>raw/issue20-bodies/r18-…md, r19-…md</span>
            </li>
          </ul>
        </TimelineEvent>
      </TimelineEra>
    </>
  );
}
