// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";

export function MistCoin() {
  return (
    <>
      <p className={cx("eyebrow")}>
        Deployed 3 November 2015
      </p>
      <h2>
        MistCoin
      </h2>
      <p className={cx("lede prose")}>
        Deployed 3 November 2015 at 12:03:29Z, sixteen days before issue #20 was filed. What the deployed bytecode contains, where the source came from, and where the contract sits in the record.
      </p>
      <dl className={cx("deflist")} style={{ maxWidth: "54rem", marginBottom: "2.5rem" }}>
        <div>
          <dt>Contract</dt>
          <dd className={cx("mono")}>
            <Addr a="0xf4eCEd2f682CE333f96f2D8966C613DeD8fC95DD" />
          </dd>
        </div>
        <div>
          <dt>Deployed</dt>
          <dd className={cx("mono")}>2015-11-03T12:03:29Z, block 483,325</dd>
        </div>
        <div>
          <dt>Transaction</dt>
          <dd className={cx("mono")}>0x74349ce6…54a7</dd>
        </div>
        <div>
          <dt>Deployer</dt>
          <dd className={cx("mono")}>
            <Addr a="0x9b22a80D5c7B3374a05b446081f97d0A34079e7F" />
          </dd>
        </div>
        <div>
          <dt>Name, symbol</dt>
          <dd className={cx("mono")}>MistCoin, MC</dd>
        </div>
        <div>
          <dt>Supply</dt>
          <dd>100,000,000 raw units at 2 decimals, so 1,000,000 MC</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd className={cx("mono")}>716 bytes</dd>
        </div>
        <div>
          <dt>Creation payload</dt>
          <dd className={cx("mono")}>1,406 bytes = 1,150 code + 256 bytes of ABI-encoded constructor arguments</dd>
        </div>
      </dl>
      <div className={cx("split")}>
        <div>
          <h3 className={cx("sub")}>
            What the deployed bytecode contains
          </h3>
          <p style={{ color: "var(--ink-2)" }}>
            Decoded by walking the dispatcher. The
            {" "}
            <strong>complete</strong>
            {" "}
            set of
            {" "}
            <span className={cx("mono")}>PUSH4</span>
            {" "}
            operands in the 716-byte runtime is five, and the complete set of
            {" "}
            <span className={cx("mono")}>PUSH32</span>
            {" "}
            operands is one. Not a sample. All of them.
          </p>
          <CodeBlock lang="text" code={"0x06fdde03  name()\n0x313ce567  decimals()\n0x70a08231  balanceOf(address)\n0x95d89b41  symbol()\n0xa9059cbb  transfer(address,uint256)\n\n0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\n            Transfer(address,address,uint256)"} />
        </div>
        <div>
          <h3 className={cx("sub")}>
            Against the finished standard
          </h3>
          <TableScroll>
            <table>
              <thead>
                <tr>
                  <th>EIP-20 member</th>
                  <th>Required?</th>
                  <th className={cx("ctr")}>In MistCoin</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    totalSupply()
                  </td>
                  <td data-label="Required?">
                    required
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    balanceOf(address)
                  </td>
                  <td data-label="Required?">
                    required
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-y")}>
                    ✔
                  </td>
                </tr>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    transfer(address,uint256)
                  </td>
                  <td data-label="Required?">
                    required
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-y")}>
                    ✔ *
                  </td>
                </tr>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    transferFrom(address,address,uint256)
                  </td>
                  <td data-label="Required?">
                    required
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    approve(address,uint256)
                  </td>
                  <td data-label="Required?">
                    required
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    allowance(address,address)
                  </td>
                  <td data-label="Required?">
                    required
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    Transfer(address,address,uint256)
                  </td>
                  <td data-label="Required?">
                    required
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-y")}>
                    ✔
                  </td>
                </tr>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    Approval(address,address,uint256)
                  </td>
                  <td data-label="Required?">
                    required
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-n")}>
                    –
                  </td>
                </tr>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    name()
                  </td>
                  <td data-label="Required?">
                    optional
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-y")}>
                    ✔
                  </td>
                </tr>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    symbol()
                  </td>
                  <td data-label="Required?">
                    optional
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-y")}>
                    ✔
                  </td>
                </tr>
                <tr>
                  <td data-label="EIP-20 member" className={cx("mono")}>
                    decimals()
                  </td>
                  <td data-label="Required?">
                    optional
                  </td>
                  <td data-label="In MistCoin" className={cx("ctr m-y")}>
                    ✔
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            * Same selector, but the deployed
            {" "}
            <code>transfer</code>
            {" "}
            returns nothing. EIP-20 specifies
            {" "}
            <span className={cx("mono")}>returns (bool success)</span>
            . The dispatcher pushes return address
            {" "}
            <span className={cx("mono")}>0x0045</span>
            , which is a
            {" "}
            <span className={cx("mono")}>JUMPDEST</span>
            {" "}
            immediately followed by
            {" "}
            <span className={cx("mono")}>STOP</span>
            .
          </p>
        </div>
      </div>
      <div className={cx("callout")} style={{ margin: "2.5rem 0", maxWidth: "54rem" }}>
        <strong>Score: 2 of 6 required methods, 1 of 2 required events, 3 of 3 optional members.</strong>
      </div>
      <h3 className={cx("sub sub--gap")}>
        Bytecode-verified provenance
      </h3>
      <p className={cx("prose")} style={{ color: "var(--ink-2)" }}>
        The source is not inferred from resemblance. It was recompiled with a period-correct compiler and matched byte for byte.
      </p>
      <dl className={cx("deflist")} style={{ maxWidth: "54rem" }}>
        <div>
          <dt>Source</dt>
          <dd>
            Gist
            {" "}
            <a href="https://gist.github.com/frozeman/20c8b5658349b003b08d" className={cx("ext")} target="_blank" rel="noopener noreferrer">
              frozeman/20c8b5658349b003b08d
            </a>
            {" "}
            revision
            {" "}
            <span className={cx("mono")}>7bcfaef3be689c81f8ee20ddb190031efe8fc110</span>
            , committed 2015-11-03T12:03:46Z
          </dd>
        </div>
        <div>
          <dt>Compiler</dt>
          <dd className={cx("mono")}>solc 0.1.6-d41f8b7c/.-Emscripten/clang/int (soljson-v0.1.6+commit.d41f8b7.js)</dd>
        </div>
        <div>
          <dt>Settings</dt>
          <dd>Optimizer enabled</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>
            716 bytes,
            {" "}
            <strong>exact match</strong>
            {" "}
            to the deployed runtime
          </dd>
        </div>
        <div>
          <dt>Creation</dt>
          <dd>
            1,150 bytes,
            {" "}
            <strong>exact prefix match</strong>
            {" "}
            to the deployed creation payload, with exactly 256 bytes of constructor arguments appended
          </dd>
        </div>
      </dl>
      <p className={cx("prose")} style={{ marginTop: "1.5rem", color: "var(--ink-2)" }}>
        The previous gist revision,
        {" "}
        <span className={cx("mono")}>759cddeb</span>
        {" "}
        of 11:59:12Z, produces the same runtime but a different creation prefix: it diverges at byte 41, in the constructor's argument handling. Decoding MistCoin's 256-byte argument tail settles which one was deployed.
      </p>
      <CodeBlock lang="text" caption={"MistCoin creation payload, constructor argument tail, decoded"} code={"[0] 0x…05f5e100   uint256 _supply   = 100,000,000\n[1] 0x…00000080   offset -> \"MistCoin\"\n[2] 0x…000000c0   offset -> \"MC\"\n[3] 0x…00000002   uint8   _decimals = 2"} />
      <p className={cx("prose")} style={{ marginTop: "1.25rem", color: "var(--ink-2)" }}>
        The order is
        {" "}
        <span className={cx("mono")}>(_supply, _name, _symbol, _decimals)</span>
        . Revision
        {" "}
        <span className={cx("mono")}>759cddeb</span>
        {" "}
        declares
        {" "}
        <span className={cx("mono")}>(_supply, _name, _decimals, _symbol)</span>
        .
        {" "}
        <strong>
          MistCoin was compiled from revision
          {" "}
          <span className={cx("mono")}>7bcfaef3</span>
        </strong>
        , the revision saved seventeen seconds after the block that contains the deployment.
      </p>
      <h3 className={cx("sub sub--gap")}>
        Where it sits in the record
      </h3>
      <div className={cx("split")}>
        <div>
          <h4 className={cx("eyebrow")}>Earlier contracts with the core three</h4>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>First occurrence</th>
                  <th>UTC</th>
                  <th>Contract</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="First occurrence" className={cx("mono")}>
                    balanceOf(address)
                  </td>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-08-08T16:05:56Z
                    <br />
                    block 54,180
                  </td>
                  <td data-label="Contract" className={cx("mono")}>
                    <Addr a="0x5fC8AeFc86884f0792995c015ff12647fafA0d83" />
                  </td>
                </tr>
                <tr>
                  <td data-label="First occurrence" className={cx("mono")}>
                    transfer(address,uint256)
                  </td>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-08-19T09:36:20Z
                    <br />
                    block 110,635
                  </td>
                  <td data-label="Contract" className={cx("mono")}>
                    <Addr a="0x65c4E65113DB14f8c15702883791cCA9E66C5Ed2" />
                  </td>
                </tr>
                <tr>
                  <td data-label="First occurrence" className={cx("mono")}>
                    Transfer event
                  </td>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-23T09:41:56Z
                    <br />
                    block 426,661
                  </td>
                  <td data-label="Contract" className={cx("mono")}>
                    <Addr a="0x3C655ccb35666579511489af88153517fc58b017" />
                  </td>
                </tr>
                <tr>
                  <td data-label="First occurrence">
                    <strong>All three together</strong>
                  </td>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-23T09:41:56Z
                    <br />
                    block 426,661
                  </td>
                  <td data-label="Contract" className={cx("mono")}>
                    <Addr a="0x3C655ccb35666579511489af88153517fc58b017" />
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            Measured across every contract created on mainnet from Frontier launch to 2015-12-31: 6,187
            {" "}
            <span className={cx("mono")}>create</span>
            {" "}
            traces, 5,724 with runtime bytecode, 628 carrying token vocabulary. By that measure MistCoin is the tenth contract to carry
            {" "}
            <code>balanceOf</code>
            ,
            {" "}
            <code>transfer</code>
            {" "}
            and the
            {" "}
            <code>Transfer</code>
            {" "}
            event together, eleven days after the first.
          </p>
          <p className={cx("tnote")}>
            The nine earlier ones are not nine independent tokens. They are a prototyping run by two addresses over eight days, detailed in the
            {" "}
            <a href="#timeline">timeline entry for 23 October 2015</a>
            .
            {" "}
            <strong>
              Not one of the nine has
              {" "}
              <code>name</code>
              ,
              {" "}
              <code>symbol</code>
              {" "}
              or
              {" "}
              <code>decimals</code>
              .
            </strong>
            {" "}
            They had a balance and a transfer. None had anything a wallet could label.
          </p>
        </div>
        <div>
          <h4 className={cx("eyebrow")}>What it is first at</h4>
          <p style={{ color: "var(--ink-2)" }}>
            MistCoin is the first contract on Ethereum mainnet carrying the complete shape the Ethereum Wallet rendered:
            {" "}
            <code>balanceOf</code>
            ,
            {" "}
            <code>transfer</code>
            {" "}
            and
            {" "}
            <code>Transfer</code>
            ,
            {" "}
            <strong>and</strong>
            {" "}
            <code>name</code>
            ,
            {" "}
            <code>symbol</code>
            {" "}
            and
            {" "}
            <code>decimals</code>
            . It is number one of 130 such contracts in 2015. The second arrives 6 hours 24 minutes later.
          </p>
          <div className={cx("callout")}>
            <strong>MistCoin is the first token contract that the official Ethereum Wallet could display.</strong>
            {" "}
            Not the first contract with
            {" "}
            <code>transfer</code>
            , and not an implementation of a standard that did not yet exist. The first that the wallet could render with a name, a symbol and a decimal point, on the day the wallet gained the ability to render one.
          </div>
          <p style={{ color: "var(--ink-2)", marginTop: "1.25rem" }}>
            It is also, per an index of 12,023,046 contracts, the earliest of 173 contracts across all of Ethereum history sharing its exact runtime bytecode. It is the genesis member of the MyToken family, which is the largest single artifact of the 2015 tutorial.
          </p>
        </div>
      </div>
      <h3 className={cx("sub sub--gap")}>
        Who made it
      </h3>
      <div className={cx("split")}>
        <div>
          <p style={{ color: "var(--ink-2)" }}>
            MistCoin was deployed by
            {" "}
            <strong>Fabian Vogelsteller</strong>
            , from the address
            {" "}
            <span className={cx("mono")}>
              <Addr a="0x9b22a80D5c7B3374a05b446081f97d0A34079e7F" />
            </span>
            . He wrote the
            {" "}
            <span className={cx("mono")}>MyToken</span>
            {" "}
            gist it was compiled from that morning, and he authored and published Ethereum Wallet 0.3.5, the release that gave the wallet its token feature, later the same day. He has described the deployment publicly since.
          </p>
          <p style={{ color: "var(--ink-2)" }}>
            Its first transfer sent half the supply to
            {" "}
            <strong>Alex Van de Sande</strong>
            . Both were at the Ethereum Foundation: Vogelsteller built the wallet and Mist, Van de Sande led its user experience. A month later Van de Sande wrote the Foundation's tutorial on creating a token,
            {" "}
            <a href="https://blog.ethereum.org/2015/12/03/how-to-build-your-own-cryptocurrency" className={cx("ext")} target="_blank" rel="noopener noreferrer">
              “Ethereum in practice part 1”
            </a>
            , which shipped this contract's source to a general audience.
          </p>
          <h4 className={cx("eyebrow")} style={{ marginTop: "1.75rem" }}>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Fabian on MistCoin</span>
              <a href="https://www.reddit.com/r/ethereum/s/ormEwaQzvO" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                reddit.com/r/ethereum
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Wallet announcement</span>
              <a href="https://www.reddit.com/r/ethereum/s/RaFWsX2fTj" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                reddit.com/r/ethereum
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Release 0.3.5</span>
              <a href="https://github.com/ethereum/mist/releases/tag/0.3.5" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                github.com/ethereum/mist/releases/tag/0.3.5
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Source gist</span>
              <a href="https://gist.github.com/frozeman/20c8b5658349b003b08d" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                frozeman/20c8b5658349b003b08d
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={cx("eyebrow")}>What the chain shows that week</h4>
          <p style={{ color: "var(--ink-2)" }}>
            The deployment was the end of a short run of rehearsals, and the traces show the shape of the work rather than a single moment.
          </p>
          <ul style={{ color: "var(--ink-2)", fontSize: "var(--step--1)", paddingLeft: "1.15rem", marginTop: ".75rem" }}>
            <li style={{ marginBottom: ".45rem" }}>
              In all of 2015 the MistCoin address deployed exactly
              {" "}
              <strong>two</strong>
              {" "}
              contracts carrying token vocabulary: MistCoin itself, and
              {" "}
              <span className={cx("mono")}>
                <Addr a="0xE274d18EF7b194A1EDEbB04cfE297CFe1489ef65" />
              </span>
              {" "}
              on 26 October, the same pattern rehearsed eight days earlier.
            </li>
            <li style={{ marginBottom: ".45rem" }}>
              That rehearsal is byte-identical to a contract deployed two minutes and twelve seconds later by
              {" "}
              <span className={cx("mono")}>
                <Addr a="0xB1a2B43A7433dd150BB82227eD519Cd6b142d382" />
              </span>
              , which was running a twelve-contract prototyping campaign across six bytecode families over the same weeks. Two addresses putting the same build on mainnet two minutes apart.
            </li>
            <li>
              The final deployment sits seventeen seconds before the gist revision it was compiled from, and one hour forty minutes before the wallet release that shipped the feature.
            </li>
          </ul>
          <p style={{ color: "var(--ink-2)", marginTop: "1rem" }}>
            Read together with the gist and release history, this is a client feature and its first example token being finished on the same morning, hours before the release went out.
          </p>
        </div>
      </div>
      <h3 className={cx("sub sub--gap")}>
        What the standard was that day
      </h3>
      <div className={cx("prose")}>
        <p>
          On 3 November 2015 the standard was the wiki page, and issue #20 did not exist. The wiki had held the names
          {" "}
          <code>balanceOf</code>
          {" "}
          and
          {" "}
          <code>transfer</code>
          {" "}
          for thirty and twenty-eight days respectively, and their final parameter order for six days, so MistCoin's two methods do match the page as it stood.
        </p>
        <p>
          What the page also specified, and MistCoin does not implement, is the entire rest of it:
          {" "}
          <code>transferFrom</code>
          , and five approval members,
          {" "}
          <code>approve</code>
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
          , plus the events
          {" "}
          <code>AddressApproval</code>
          {" "}
          and
          {" "}
          <code>AddressApprovalOnce</code>
          . There was no
          {" "}
          <code>totalSupply</code>
          {" "}
          on the page yet, no
          {" "}
          <code>allowance</code>
          {" "}
          and no
          {" "}
          <code>Approval</code>
          . Those three arrive on 18, 20 and 20 November. MistCoin implements the two members of the October wiki that a wallet needed, and none of the eight it did not.
        </p>
        <p>
          This is a fact about the calendar rather than about the contract. A token deployed sixteen days before the proposal was written cannot implement the proposal. What it did do was establish the shape the wallet rendered, which a few hundred contracts copied over the following two months.
        </p>
      </div>
    </>
  );
}
