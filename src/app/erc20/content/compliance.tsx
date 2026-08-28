// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";

export function Compliance() {
  return (
    <>
      <p className={cx("eyebrow")}>
        Four definitions
      </p>
      <h2>
        What compliance meant
      </h2>
      <p className={cx("lede prose")}>
        Four readings are in circulation, and they date differently. The corpus lets each be dated precisely. The first three are answerable from documents and bytecode. The fourth is answerable only by running the code.
      </p>
      <div className={cx("cards")}>
        <div className={cx("card")}>
          <h4>1. As the wallet defined it</h4>
          <p>
            <code>balanceOf</code>
            ,
            {" "}
            <code>transfer</code>
            ,
            {" "}
            <code>Transfer</code>
            . This is the operative definition for the whole period. It is what the Ethereum Wallet's ABI required from 23 October 2015, what Alex Van de Sande told the issue thread as late as 15 March 2016, and what 154 of the 320 token-vocabulary contracts deployed between 3 November 2015 and 6 January 2016 implement.
          </p>
          <p>
            By this definition MistCoin complies, along with nine earlier contracts and about 150 later ones. It is a different question from EIP-20's required set, and for the whole of this period it is the question that decided whether a token was usable.
          </p>
        </div>
        <div className={cx("card")}>
          <h4>2. As the specification defines it</h4>
          <p>
            All six methods, both events. First stated in prose on 2015-11-20T15:53:42Z. First expressed exactly, with nothing extra, on 2015-12-21T15:55:57Z in ConsenSys/Tokens. First stated exactly by the specification itself on 2016-01-06.
          </p>
          <p>
            <strong>Zero contracts in that same window meet it. Zero implement even four of the six.</strong>
            {" "}
            <code>approve</code>
            {" "}
            and
            {" "}
            <code>allowance</code>
            {" "}
            have no deployed instances at all in it, and
            {" "}
            <code>Approval</code>
            {" "}
            is emitted by nothing.
          </p>
        </div>
        <div className={cx("card")}>
          <h4>3. As applied retroactively</h4>
          <p>
            The reading under which a 2015 contract “is” ERC-20 because ERC-20 later described something like it. This is not a property of the contract. It is a property of the reader.
          </p>
          <p>
            It is also unfalsifiable, which is why it is worth naming rather than arguing with.
          </p>
        </div>
        <div className={cx("card")}>
          <h4>4. As EIP-20 finally required it</h4>
          <p>
            Not the selectors but the behaviour: the return values, the event shape, the allowance arithmetic, and transfers of zero. Definition 2 can be answered from bytecode. This one cannot, because a function that returns a boolean and one that returns nothing share a selector, and indexing
            {" "}
            <code>_value</code>
            {" "}
            does not change an event's topic hash.
          </p>
          <p>
            First met on
            {" "}
            <strong>2016-03-20T11:09:16Z</strong>
            , block 1,184,107, by
            {" "}
            <span className={cx("mono")}>
              <Addr a="0xacFD9D15fA769EaBb68410c4c675Ff2030f26416" />
            </span>
            . Nothing in 2015 meets it, and neither does any of the 34 qualifying contracts deployed before that block.
          </p>
        </div>
      </div>
      <div className={cx("prose")} style={{ marginTop: "2.5rem" }}>
        <p>
          The gap between the first two definitions is the whole finding. The standard was written by people who were, at the same time, shipping a client that did not require it. The wallet's
          {" "}
          <span className={cx("mono")}>tokenInterface.js</span>
          {" "}
          wanted
          {" "}
          <code>name</code>
          ,
          {" "}
          <code>symbol</code>
          {" "}
          and
          {" "}
          <code>decimals</code>
          , none of which ERC-20 requires, and did not want
          {" "}
          <code>totalSupply</code>
          ,
          {" "}
          <code>transferFrom</code>
          ,
          {" "}
          <code>approve</code>
          {" "}
          or
          {" "}
          <code>allowance</code>
          , four of the six that it does.
        </p>
        <p>
          <strong>
            A 2015 token is answering the first definition, because it is the only one that had been written. Judged against the second, every contract of that year is being measured against a document from its own future.
          </strong>
        </p>
        <p>
          One note on how compliance is scored on this page. Text-identity and ABI-identity are different tests, and only the second determines whether two contracts interoperate.
          {" "}
          <span className={cx("mono")}>dapphub/erc20</span>
          {" "}
          reads as three of six by literal declaration text, because
          {" "}
          <span className={cx("mono")}>uint</span>
          {" "}
          and
          {" "}
          <span className={cx("mono")}>uint256</span>
          {" "}
          are different strings, and six of six by canonical selector. The selector count is the one that matters, and it settles definition 2 and stops there. It cannot settle definition 4, so for that question every candidate was executed.
        </p>
      </div>
      <h3 className={cx("sub sub--gap")}>
        Definition 4, tested by execution
      </h3>
      <p className={cx("prose")} style={{ color: "var(--ink-2)" }}>
        Every contract deployed in 2015 or 2016 whose dispatcher carries all six selectors was collected, 1,014 of them, all in 2016. All 34 deployed before the first one to pass were then run on an
        {" "}
        <span className={cx("mono")}>anvil</span>
        {" "}
        mainnet fork and checked against all ten obligations of EIP-20 as finalised: real transactions, receipts read for the logs actually emitted,
        {" "}
        <span className={cx("mono")}>eth_call</span>
        {" "}
        used to measure return width. The milestones of that pass, in order:
      </p>
      <TableScroll>
        <table className={cx("table--stack")}>
          <caption className={cx("vh")}>
            Strict EIP-20 compliance of the earliest candidates
          </caption>
          <thead>
            <tr>
              <th>Deployed (UTC)</th>
              <th>Contract</th>
              <th>Deploys the interface</th>
              <th>Interface and a real supply</th>
              <th>Fully compliant</th>
              <th>What breaks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2016-01-10
                <br />
                824,235
              </td>
              <td data-label="Contract">
                <span className={cx("mono")}>
                  <Addr a="0x99146Bab2bB34D9Ca49EC4f0c82De3E5789ae22e" />
                </span>
                <br />
                Digix gold ledger
              </td>
              <td data-label="Deploys the interface">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Interface and a real supply">
                <span className={cx("m-n")}>–</span>
              </td>
              <td data-label="Fully compliant">
                <span className={cx("m-n")}>–</span>
              </td>
              <td data-label="What breaks">
                Supply is zero at every block checked, so it is an interface and not a token.
                {" "}
                <span className={cx("mono")}>Transfer</span>
                {" "}
                indexes
                {" "}
                <span className={cx("mono")}>_value</span>
                ;
                {" "}
                <span className={cx("mono")}>transferFrom</span>
                {" "}
                reports the spender as
                {" "}
                <span className={cx("mono")}>_from</span>
                .
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2016-01-14
                <br />
                847,527
              </td>
              <td data-label="Contract">
                <span className={cx("mono")}>
                  <Addr a="0x55b9a11c2e8351b4Ffc7b11561148bfaC9977855" />
                </span>
                <br />
                <strong>Digix Gold 1.0</strong>
              </td>
              <td data-label="Deploys the interface">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Interface and a real supply">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Fully compliant">
                <span className={cx("m-n")}>–</span>
              </td>
              <td data-label="What breaks">
                <strong>Event shape.</strong>
                {" "}
                <span className={cx("mono")}>Transfer</span>
                {" "}
                indexes
                {" "}
                <span className={cx("mono")}>_value</span>
                , so it emits four topics and an empty data field.
                {" "}
                <span className={cx("mono")}>transferFrom</span>
                {" "}
                names the spender as
                {" "}
                <span className={cx("mono")}>_from</span>
                {" "}
                rather than the owner.
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2016-01-27
                <br />
                912,760
              </td>
              <td data-label="Contract">
                <span className={cx("mono")}>
                  <Addr a="0xa04bf47F0E9D1745D254b9B89f304c7d7ad121Aa" />
                </span>
                <br />
                <strong>elcoin</strong>
              </td>
              <td data-label="Deploys the interface">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Interface and a real supply">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Fully compliant">
                <span className={cx("m-n")}>–</span>
              </td>
              <td data-label="What breaks">
                <strong>The entry points do nothing.</strong>
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
                return false, move no balance and emit no event. Its transfers were driven through a controller.
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2016-01-28
                <br />
                917,622
              </td>
              <td data-label="Contract">
                <span className={cx("mono")}>
                  <Addr a="0x37Dca38b1CBB2Cd043910eC46fe82Ddb9e38F00d" />
                </span>
              </td>
              <td data-label="Deploys the interface">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Interface and a real supply">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Fully compliant">
                <span className={cx("m-p")}>~</span>
              </td>
              <td data-label="What breaks">
                <strong>Zero-value transfers only.</strong>
                {" "}
                Nine of ten. A guard of
                {" "}
                <span className={cx("mono")}>{"&& _value > 0"}</span>
                {" "}
                makes a transfer of zero return false and emit nothing. The earliest copy of that requirement is dated July 2017 and it is absent from issue #20, so it post-dates this contract.
              </td>
            </tr>
            <tr>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2016-02-25
                <br />
                1,059,698
              </td>
              <td data-label="Contract">
                <span className={cx("mono")}>
                  <Addr a="0xb345180D0a2c791d4943a239f8eBb50eFA01C81a" />
                </span>
              </td>
              <td data-label="Deploys the interface">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Interface and a real supply">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Fully compliant">
                <span className={cx("m-p")}>~</span>
              </td>
              <td data-label="What breaks">
                The same code as the row below except one comparison,
                {" "}
                <span className={cx("mono")}>ADD GT</span>
                {" "}
                against
                {" "}
                <span className={cx("mono")}>ADD LT ISZERO</span>
                . Under the strict form a transfer of zero throws.
              </td>
            </tr>
            <tr style={{ background: "var(--accent-soft)" }}>
              <td data-label="Deployed (UTC)" className={cx("mono")}>
                2016-03-20
                <br />
                1,184,107
              </td>
              <td data-label="Contract">
                <span className={cx("mono")}>
                  <Addr a="0xacFD9D15fA769EaBb68410c4c675Ff2030f26416" />
                </span>
                <br />
                <strong>ether wrapper</strong>
              </td>
              <td data-label="Deploys the interface">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Interface and a real supply">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="Fully compliant">
                <span className={cx("m-y")}>✔</span>
              </td>
              <td data-label="What breaks">
                <strong>Nothing. All ten.</strong>
                {" "}
                Verified at the head of the chain and on a fork pinned 93 blocks after deployment. Never used: one transaction, its creation. Its twin
                {" "}
                <span className={cx("mono")}>
                  <Addr a="0xd654bDD32FC99471455e86C2E7f7D7b6437e9179" />
                </span>
                , 81 blocks later, is the one that saw traffic.
              </td>
            </tr>
          </tbody>
        </table>
      </TableScroll>
      <p className={cx("tnote")}>
        The middle two columns are bytecode and state questions and were answered as such. The third is a behavioural question and was answered by execution. A contract can hold every selector, hold a real supply, and still not behave the way the standard requires, which is what the first three rows are.
      </p>
      <p className={cx("prose")} style={{ color: "var(--ink-2)", marginTop: "1.5rem" }}>
        The pass above stops at the first contract to satisfy definition 4, and that contract is an ether wrapper that was never used. The first fully compliant contract that is an
        {" "}
        <em>issued token</em>
        {" "}
        and that saw real traffic arrives eight days later:
        {" "}
        <span className={cx("mono")}>
          <Addr a="0xC66eA802717bFb9833400264Dd12c2bCeAa34a6d" />
        </span>
        , dappsys 0.1.2's
        {" "}
        <span className={cx("mono")}>DSTokenFrontend</span>
        , 28 March 2016, which is MakerDAO's original MKR and has emitted transfers ever since. It is
        {" "}
        <a href="#timeline">in the timeline</a>
        {" "}
        with its own evidence.
      </p>
      <div className={cx("callout callout--warn")} style={{ margin: "2rem 0", maxWidth: "56rem" }}>
        <strong>One requirement carries a date of its own.</strong>
        {" "}
        “Transfers of 0 values MUST be treated as normal transfers and fire the
        {" "}
        <code>Transfer</code>
        {" "}
        event” is in EIP-20 as finalised and in the earliest copy of
        {" "}
        <span className={cx("mono")}>eip-20-token-standard.md</span>
        {" "}
        in the EIPs repository, dated 13 July 2017. It is not in issue #20 as filed on 19 November 2015, and it is not in the issue today. It is also the only requirement separating
        {" "}
        <span className={cx("mono")}>
          <Addr a="0xacFD9D15fA769EaBb68410c4c675Ff2030f26416" />
        </span>
        {" "}
        from candidates as much as seven weeks earlier. Applying it to a contract from early 2016 is applying a rule written after the fact, which is worth saying plainly rather than burying:
        {" "}
        <strong>
          by EIP-20 as finalised the answer is 20 March 2016; by the specification as it stood when these contracts were deployed the answer is
          {" "}
          <span className={cx("mono")}>
            <Addr a="0x37Dca38b1CBB2Cd043910eC46fe82Ddb9e38F00d" />
          </span>
          , 28 January 2016.
        </strong>
        {" "}
        Both dates are stated here, and neither is presented as the only one.
      </div>
    </>
  );
}
