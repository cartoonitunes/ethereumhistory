// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";

export function Method() {
  return (
    <>
      <p className={cx("eyebrow")}>
        How the dating was done, and where it stops
      </p>
      <h2>
        Method, sources and limits
      </h2>
      <div className={cx("split")}>
        <div>
          <h3 className={cx("sub")}>
            The problem with issue #20
          </h3>
          <p style={{ color: "var(--ink-2)" }}>
            GitHub did not record issue-body edit history until late 2016.
            {" "}
            <span className={cx("mono")}>GET /repos/ethereum/EIPs/issues/20</span>
            {" "}
            returns
            {" "}
            <span className={cx("mono")}>diff: null</span>
            {" "}
            and serves only the current body. The document that defines ERC-20 has no visible history at the place it lives.
          </p>
          <h3 className={cx("sub sub--gap2")}>
            The recovery
          </h3>
          <p style={{ color: "var(--ink-2)" }}>
            Every
            {" "}
            <span className={cx("mono")}>IssueCommentEvent</span>
            {" "}
            in the GitHub public event stream embeds the entire parent issue object, including
            {" "}
            <span className={cx("mono")}>issue.body</span>
            {" "}
            as it stood at that instant. Issue #20 accumulated 284 comments between 2015-11-19 and 2016-12-22. Each is a dated snapshot of the body.
          </p>
          <ol style={{ color: "var(--ink-2)", fontSize: "var(--step--1)", paddingLeft: "1.15rem", marginTop: ".75rem" }}>
            <li style={{ marginBottom: ".35rem" }}>
              Fetch all comments on the issue. 362 comments; 284 fall inside 2015-11 to 2016-12.
            </li>
            <li style={{ marginBottom: ".35rem" }}>
              Map each
              {" "}
              <span className={cx("mono")}>created_at</span>
              {" "}
              to its GH Archive hour. 198 distinct hourly files.
            </li>
            <li style={{ marginBottom: ".35rem" }}>
              Download each. Zero missing or corrupt files, verified with
              {" "}
              <span className={cx("mono")}>gzip -t</span>
              .
            </li>
            <li style={{ marginBottom: ".35rem" }}>
              Filter for the repository and issue number. 285 events: one
              {" "}
              <span className={cx("mono")}>IssuesEvent:opened</span>
              {" "}
              and 284
              {" "}
              <span className={cx("mono")}>IssueCommentEvent</span>
              .
            </li>
            <li>
              De-duplicate
              {" "}
              <span className={cx("mono")}>payload.issue.body</span>
              {" "}
              in timestamp order.
              {" "}
              <strong>19 distinct revisions.</strong>
            </li>
          </ol>
          <p style={{ color: "var(--ink-2)", marginTop: "1rem" }}>
            Eight of these were previously known. Eleven are recovered here for the first time.
          </p>
          <CodeBlock lang="bash" caption={"Reproducing the recovery"} code={"# 1. every comment on issue 20\ngh api --paginate repos/ethereum/EIPs/issues/20/comments \\\n  -q '.[]|[.created_at,(.id|tostring),.user.login,.html_url]|@tsv' > comments.tsv\n\n# 2. the distinct GH Archive hours those comments fall in\nawk -F'\\t' '{gsub(\"T\",\"-\",$1); split($1,a,\"-\");\n             printf \"%s-%s-%s-%d\\n\",a[1],a[2],a[3],a[4]+0}' comments.tsv | sort -u > hours.txt\n\n# 3. fetch them\nxargs -P 8 -I{} curl -s -o {}.json.gz http://data.gharchive.org/{}.json.gz < hours.txt\n\n# 4. pull the embedded issue body out of every event\n#    (write per-file, never to a shared stdout: parallel writes interleave\n#     and corrupt the JSON)\nfor f in *.json.gz; do gzcat \"$f\" | grep -a 'ethereum/EIPs' > \"parts/${f%.json.gz}.jsonl\"; done\ncat parts/*.jsonl | jq -c 'select((.payload.issue.number//0)==20)' \\\n  | jq -r '[.created_at,((.payload.issue.body//\"\")|@base64)]|@tsv' | sort | uniq -f0"} />
          <p className={cx("tnote")}>
            2015-era GH Archive rows store
            {" "}
            <span className={cx("mono")}>payload</span>
            {" "}
            as an object in these files, but BigQuery's
            {" "}
            <span className={cx("mono")}>githubarchive.day.2015*</span>
            {" "}
            tables store it as a JSON string.
            {" "}
            <span className={cx("mono")}>JSON_EXTRACT_SCALAR</span>
            {" "}
            is required there, not dot access.
          </p>
        </div>
        <div>
          <h3 className={cx("sub")}>
            Sources examined
          </h3>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Access</th>
                  <th>Coverage</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Source">
                    <span className={cx("mono")}>ethereum/EIPs</span>
                    {" "}
                    issue #20
                  </td>
                  <td data-label="Access">
                    GH Archive + GitHub API
                  </td>
                  <td data-label="Coverage">
                    19 body revisions, 2015-11-19 to 2016-11-29
                  </td>
                </tr>
                <tr>
                  <td data-label="Source">
                    <span className={cx("mono")}>ethereum/wiki</span>
                    {" "}
                    Standardized_Contract_APIs
                  </td>
                  <td data-label="Access">
                    git clone
                  </td>
                  <td data-label="Coverage">
                    All 54 revisions, 2015-06-17 to 2018-08-22
                  </td>
                </tr>
                <tr>
                  <td data-label="Source">
                    <span className={cx("mono")}>ethereum/wiki</span>
                    {" "}
                    poll page
                  </td>
                  <td data-label="Access">
                    git clone
                  </td>
                  <td data-label="Coverage">
                    9 revisions, 2015-11-21 to 2015-11-26
                  </td>
                </tr>
                <tr>
                  <td data-label="Source">
                    gist
                    {" "}
                    <span className={cx("mono")}>frozeman/090ae32…</span>
                  </td>
                  <td data-label="Access">
                    gist history API
                  </td>
                  <td data-label="Coverage">
                    6 revisions
                  </td>
                </tr>
                <tr>
                  <td data-label="Source">
                    gist
                    {" "}
                    <span className={cx("mono")}>frozeman/20c8b56…</span>
                  </td>
                  <td data-label="Access">
                    gist history API
                  </td>
                  <td data-label="Coverage">
                    5 revisions
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    ConsenSys/Tokens
                  </td>
                  <td data-label="Access">
                    full clone
                  </td>
                  <td data-label="Coverage">
                    2015-07-15 to present
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    slockit/DAO
                  </td>
                  <td data-label="Access">
                    full clone
                  </td>
                  <td data-label="Coverage">
                    <span className={cx("mono")}>Token.sol</span>
                    {" "}
                    from 2015-12-29
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    ethereum/meteor-dapp-wallet
                  </td>
                  <td data-label="Access">
                    full clone
                  </td>
                  <td data-label="Coverage">
                    <span className={cx("mono")}>tokenABI.js</span>
                    {" "}
                    2015-10-06 to 2015-12-02
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    ethereum/mist
                  </td>
                  <td data-label="Access">
                    full clone, releases API
                  </td>
                  <td data-label="Coverage">
                    Release 0.3.5 metadata and body
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    ethereum/dapp-bin
                  </td>
                  <td data-label="Access">
                    full clone
                  </td>
                  <td data-label="Coverage">
                    <span className={cx("mono")}>standardized_contract_apis/currency.sol</span>
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    ethereum/frontier-guide
                  </td>
                  <td data-label="Access">
                    full clone
                  </td>
                  <td data-label="Coverage">
                    All 216 commits, 2015-04-30 to 2015-07-28
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    go-ethereum.wiki
                  </td>
                  <td data-label="Access">
                    full clone
                  </td>
                  <td data-label="Coverage">
                    <span className={cx("mono")}>Contract-Tutorial.md</span>
                    {" "}
                    all 29 revisions, plus
                    {" "}
                    <span className={cx("mono")}>Coin-Contract-Tutorial.md</span>
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    ethereum/ethereum-org
                  </td>
                  <td data-label="Access">
                    full clone
                  </td>
                  <td data-label="Coverage">
                    All 1,210 commits, 2015-03-07 to 2019-04-17.
                    {" "}
                    <span className={cx("mono")}>views/content/token.md</span>
                    {" "}
                    all 117 revisions
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    dapphub/erc20
                  </td>
                  <td data-label="Access">
                    full clone
                  </td>
                  <td data-label="Coverage">
                    From 2016-04-24
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    blog.ethereum.org
                  </td>
                  <td data-label="Access">
                    fetched
                  </td>
                  <td data-label="Coverage">
                    “Ethereum in practice part 1” by Alex Van de Sande, 2015-12-03
                  </td>
                </tr>
                <tr>
                  <td data-label="Source" className={cx("mono")}>
                    r/ethereum
                  </td>
                  <td data-label="Access">
                    linked
                  </td>
                  <td data-label="Coverage">
                    The Wallet 0.3.5 announcement thread, and Fabian Vogelsteller's account of MistCoin
                  </td>
                </tr>
                <tr>
                  <td data-label="Source">
                    GitHub repo search
                  </td>
                  <td data-label="Access" className={cx("mono")}>
                    gh search repos
                  </td>
                  <td data-label="Coverage">
                    All repos created 2015-01-01 to 2016-12-31
                  </td>
                </tr>
                <tr>
                  <td data-label="Source">
                    gist
                    {" "}
                    <span className={cx("mono")}>alexvandesande/0d1a998…</span>
                  </td>
                  <td data-label="Access">
                    gist history API
                  </td>
                  <td data-label="Coverage">
                    2 revisions, from 2016-02-13
                  </td>
                </tr>
                <tr>
                  <td data-label="Source">
                    gist
                    {" "}
                    <span className={cx("mono")}>909d02…</span>
                    , anonymous
                  </td>
                  <td data-label="Access">
                    gist history API
                  </td>
                  <td data-label="Coverage">
                    1 revision, 2015-10-30
                  </td>
                </tr>
                <tr>
                  <td data-label="Source">
                    <strong>Mainnet create traces</strong>
                  </td>
                  <td data-label="Access">
                    local BigQuery export
                  </td>
                  <td data-label="Coverage">
                    2015-07-30 to 2016-12-31. 6,187 (2015) and 230,818 (2016) traces with runtime bytecode
                  </td>
                </tr>
                <tr>
                  <td data-label="Source">
                    <strong>Local contract index</strong>
                  </td>
                  <td data-label="Access">
                    SQLite, 12,023,046 contracts
                  </td>
                  <td data-label="Coverage">
                    Independent cross-check of the create-trace counts and bytecode families
                  </td>
                </tr>
                <tr>
                  <td data-label="Source">
                    <strong>solc 0.1.x archive</strong>
                  </td>
                  <td data-label="Access">
                    local
                    {" "}
                    <span className={cx("mono")}>soljson</span>
                    {" "}
                    builds
                  </td>
                  <td data-label="Coverage">
                    Period-correct recompilation
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <h3 className={cx("sub sub--gap2")}>
            Onchain detection
          </h3>
          <p style={{ color: "var(--ink-2)" }}>
            For each runtime blob the EVM opcode stream is walked and every
            {" "}
            <span className={cx("mono")}>PUSH4</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>PUSH32</span>
            {" "}
            operand collected. Walking the opcode stream rather than substring-matching avoids false positives from data bytes that happen to spell a selector.
            {" "}
            <span className={cx("mono")}>PUSH4</span>
            {" "}
            operands are matched against the keccak-256 selectors of the final six, the optional three and 20 superseded members;
            {" "}
            <span className={cx("mono")}>PUSH32</span>
            {" "}
            operands against 8 candidate event topic hashes.
          </p>
          <CodeBlock lang="python" code={"def push_operands(code_hex):\n    b = bytes.fromhex(code_hex[2:]); p4=set(); p32=set(); i=0\n    while i < len(b):\n        op=b[i]; i+=1\n        if 0x60 <= op <= 0x7f:                # PUSH1..PUSH32\n            ln=op-0x5f; data=b[i:i+ln]; i+=ln\n            if ln==4:  p4.add(data.hex())\n            if ln==32: p32.add(data.hex())\n    return p4, p32"} />
        </div>
      </div>
      <h3 className={cx("sub sub--gap sub--wide")}>
        Limits of this evidence
      </h3>
      <div className={cx("prose")}>
        <ol className={cx("numlist")}>
          <li>
            <strong>Issue-body snapshots exist only where a comment landed.</strong>
            {" "}
            The thread was silent between 2015-12-02T10:22:08Z and 2016-01-06T10:12:13Z, so an intermediate edit inside that window is invisible. The correct statement of finding 4 is a bound: the exact interface was present at 10:28:48Z and was not present at 10:12:13Z.
          </li>
          <li>
            <strong>A long stable period is genuine, not a gap.</strong>
            {" "}
            Between 2016-01-06T20:55:55Z and 2016-10-28T04:21:56Z the body did not change across 111 consecutive comment snapshots.
          </li>
          <li>
            <strong>“First public appearance” means first in the sources listed above.</strong>
            {" "}
            These are the canonical ones for this standard, but the claim is a lower bound on lateness, not proof of universal novelty. An exhaustive search would require the full 2015 and 2016 GH Archive corpus, roughly 8,760 files per year.
          </li>
          <li>
            <strong>Commit-message evidence for the term “ERC 20”</strong>
            {" "}
            was searched exhaustively within the cloned repositories and sampled through 280 GH Archive hours. An earlier use may exist in a repository not examined.
          </li>
          <li>
            <strong>Author dates, not committer dates</strong>
            , are used throughout. For these repositories the two agree on the commits cited.
          </li>
          <li>
            <strong>Onchain detection is bytecode-level, not semantic.</strong>
            {" "}
            A selector in a dispatcher proves a function is callable, not that it behaves as the standard specifies. The onchain section counts interfaces, not correctness.
          </li>
          <li>
            <strong>Create traces only.</strong>
            {" "}
            The onchain corpus contains contract creations and their bytecode. It holds no transaction logs, so no claim about transfers, balances or holders is testable from it.
          </li>
          <li>
            <strong>Onchain addresses are not identities.</strong>
            {" "}
            The corpus resolves deployments to addresses, not to people. Where a deployment is attributed to a named person on this page, the basis is the public record outside the corpus: gist and release authorship, and the participants' own accounts.
          </li>
          <li>
            <strong>Signature matching is mechanical.</strong>
            {" "}
            A
            {" "}
            <code>~</code>
            {" "}
            means the parameter list differs from the final form in order, type or arity. Differences in return variable names are treated as equivalent, since they do not change the ABI.
          </li>
          <li>
            <strong>A dispatcher scan can miss non-standard dispatchers.</strong>
            {" "}
            A contract using a hand-written dispatcher, or a proxy, would be missed. For 2015 Solidity output this is not a realistic concern, but it is a stated assumption rather than a proof.
          </li>
          <li>
            <strong>121 of the 3,062 window contracts have no runtime bytecode</strong>
            {" "}
            and were not analysed. They are almost certainly failed constructors, but that is an assumption.
          </li>
          <li>
            <strong>The scan's vocabulary list is incomplete.</strong>
            {" "}
            Every count of
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            {" "}
            on this page is a count of the specification's signature only, not the Frontier Guide's, and so understates how many contracts had a working transfer function. Set out in full
            {" "}
            <a href="#onchain">under the superseded vocabulary</a>
            .
          </li>
        </ol>
      </div>
      <h3 className={cx("sub sub--gap sub--wide")}>
        Gaps this pass did not close
      </h3>
      <div className={cx("prose")}>
        <p>
          <strong>MistCoin's first transfer is recorded outside this corpus.</strong>
          {" "}
          The onchain export holds contract-creation traces and bytecode only, with no transaction logs, so the transfer of half the supply to Alex Van de Sande is carried here on Fabian Vogelsteller's
          {" "}
          <a href="https://www.reddit.com/r/ethereum/s/ormEwaQzvO" className={cx("ext")} target="_blank" rel="noopener noreferrer">
            public account
          </a>
          {" "}
          rather than on the traces. Reading it off the chain would need event-log data for blocks 483,325 and later.
        </p>
        <p>
          <strong>The guide-shaped contracts have not been re-scanned.</strong>
          {" "}
          The 264 contracts identified by the
          {" "}
          <span className={cx("mono")}>coinBalanceOf</span>
          {" "}
          plus
          {" "}
          <span className={cx("mono")}>CoinTransfer</span>
          {" "}
          pairing are almost certainly compiled from the official tutorial, but the archived corpus stores decoded member lists rather than runtime bytecode, so
          {" "}
          <span className={cx("mono")}>sendCoin(address,uint256)</span>
          {" "}
          could not be tested directly. Re-running the opcode walk over the 2015 and window create traces with
          {" "}
          <span className={cx("mono")}>0x90b98a11</span>
          {" "}
          added to the vocabulary would convert the inference into a count.
        </p>
        <p>
          <strong>The three formalisation events of December 2016 and 2017 have no artifact here.</strong>
          {" "}
          They are shown in the timeline's final era and marked as outside the corpus. Closing them needs the
          {" "}
          <span className={cx("mono")}>ethereum/EIPs</span>
          {" "}
          pull request history and the EIP-1 revision history.
        </p>
      </div>
    </>
  );
}
