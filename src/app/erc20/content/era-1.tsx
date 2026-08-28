// Generated from the ERC-20 Code Trail research document.
// Source: erc20-archaeology/site/index.html. Edit the generator, not this file.
import { cx } from "../cx";
import { Addr } from "../components/Addr";
import { CodeBlock } from "../components/CodeBlock";
import { TableScroll } from "../components/TableScroll";
import { TimelineEra, TimelineEvent } from "../components/Timeline";

export function Era1() {
  return (
    <>
      <TimelineEra
        id="era-1"
        span={"23 February 2015 – 3 November 2015"}
        title={"The wiki page and the guides"}
        blurb={
          <>
            Before there was an issue there was a page.
            {" "}
            <span className={cx("mono")}>Standardized_Contract_APIs</span>
            {" "}
            described currencies, exchanges and registries together, and its currency section is the direct ancestor of ERC-20. Over its first 35 revisions its vocabulary is replaced word by word, mostly by people renaming each other's functions. Running alongside it, and never quite agreeing with it, is the official documentation: the Frontier Guide for the first live network, and the ethereum.org token page. Both taught a vocabulary of their own.
          </>
        }
      >
        <TimelineEvent
          id="ev-a-coin-contract-with-no-standard-api"
          src="code"
          date={"2015-02-23"}
          times={["12:59:40Z"]}
          mobileWhen={"2015-02-23 · 12:59:40Z"}
          title={"A coin contract with no standard API"}
          tags={[{ label: "Gav Wood", actor: true }, { label: "ethereum/dapp-bin", actor: false }]}
          summary={
            <>
            Gav Wood commits
            {" "}
            <span className={cx("mono")}>coin.sol</span>
            {" "}
            to
            {" "}
            <span className={cx("mono")}>ethereum/dapp-bin</span>
            . It is a currency contract written before anyone proposed that currency contracts should agree on anything.
            </>
          }
        >
          <p>
            Included as the floor of the trail. Nothing in this file survives into the standard, and that is the point: the problem the wiki page was created to solve is visible here as an absence.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ethereum/dapp-bin/commit/1898d63" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ethereum/dapp-bin@1898d63
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-frontier-guide-adds-a-token-chapter"
          src="guide"
          star
          date={"2015-05-04"}
          times={["22:09:49Z", "22:11:37Z"]}
          mobileWhen={"2015-05-04 · 22:09:49Z and 22:11:37Z"}
          title={"The Frontier Guide adds a token chapter"}
          tags={[{ label: "Taylor Gerring", actor: true }, { label: "ethereum/frontier-guide", actor: false }, { label: "go-ethereum.wiki", actor: false }, { label: "0 of 6", actor: false }]}
          summary={
            <>
            Taylor Gerring creates
            {" "}
            <span className={cx("mono")}>contract_coin.md</span>
            {" "}
            in the Ethereum Frontier Guide, then creates the page it transcludes. The contract uses
            {" "}
            <span className={cx("mono")}>sendToken</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>getBalance</span>
            . Six weeks before
            {" "}
            <span className={cx("mono")}>Standardized_Contract_APIs</span>
            {" "}
            exists.
            </>
          }
        >
          <p>
            The Frontier Guide is the official Ethereum user documentation for the first live network. It is a GitBook, and it holds almost no prose of its own: chapters are one-line transclusions of pages in the
            {" "}
            <span className={cx("mono")}>go-ethereum</span>
            {" "}
            wiki.
            {" "}
            <span className={cx("mono")}>contract_coin.md</span>
            {" "}
            in full, as created:
          </p>
          <CodeBlock lang="text" code={"# Coin contract"} />
          <p>
            One hundred and eighteen seconds later Gerring created the wiki page it would point at, and rewrote the chapter to pull it in:
          </p>
          <CodeBlock lang="text" caption={"frontier-guide contract_coin.md at 8c91460, 2015-05-04T22:11:47Z"} code={"{% include \"git+https://github.com/ethereum/go-ethereum.wiki.git/Coin-Contract-Tutorial.md\" %}"} />
          <p>
            That transclusion is why the guide's own repository contains no token vocabulary at any point in its history: 216 commits between 2015-04-30 and 2015-07-28, and a search of every revision for
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            ,
            {" "}
            <span className={cx("mono")}>balanceOf</span>
            ,
            {" "}
            <span className={cx("mono")}>coinBalance</span>
            {" "}
            or the word “token” returns nothing. The content lives in the wiki.
          </p>
          <h4>The contract the official guide shipped</h4>
          <CodeBlock lang="sol" caption={"go-ethereum.wiki Coin-Contract-Tutorial.md at cc23634, verbatim"} code={"contract token { \n    mapping (address => uint) balances;\n\n    // Initializes contract with 10 000 tokens to the creator of the contract\n    function token() {\n        balances[msg.sender] = 10000;\n    }\n    // Very simple trade function\n    function sendToken(address receiver, uint amount) returns(bool sufficient) {\n        if (balances[msg.sender] < amount) return false;\n        balances[msg.sender] -= amount;\n        balances[receiver] += amount;\n        return true;\n    }\n\n    // Check balances of any account\n    function getBalance(address account) returns(uint balance){\n        return balances[account];\n    }\n}"} />
          <p>
            This is a third vocabulary, and it belongs to neither of the others. Not the wiki's
            {" "}
            <code>sendCoin</code>
            {" "}
            and
            {" "}
            <code>coinBalanceOf</code>
            , which do not exist yet. Not the standard's
            {" "}
            <code>transfer</code>
            {" "}
            and
            {" "}
            <code>balanceOf</code>
            , which are five months away. The official guide for the first live Ethereum network taught
            {" "}
            <code>sendToken</code>
            {" "}
            and
            {" "}
            <code>getBalance</code>
            , and it did so before there was any standardization effort to disagree with.
          </p>
          <p>
            There is no event of any kind. Nothing a client could watch.
          </p>
          <h4>The selectors, and where they can be seen</h4>
          <CodeBlock lang="text" code={"sendToken(address,uint256)   0x412664ae\ngetBalance(address)          0xf8b2cb4f"} />
          <p>
            Both appear in the compiled bytecode the tutorial pastes underneath the source, in its dispatcher:
            {" "}
            <span className={cx("mono")}>…90048063412664ae1461003a578063f8b2cb4f1461005257005b…</span>
            . The published bytecode and the published source agree.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Guide chapter</span>
              <a href="https://github.com/ethereum/frontier-guide/commit/a465ac55afe0194ccd536e3e83fbe22111f9742e" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                frontier-guide a465ac5 · Create contract_coin.md
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Transclusion</span>
              <a href="https://github.com/ethereum/frontier-guide/commit/8c9146093c5bad36e27861ae18a5a87681d602eb" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                frontier-guide 8c91460 · Update contract_coin.md
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Tutorial page</span>
              <a href="https://github.com/ethereum/go-ethereum/wiki/Coin-Contract-Tutorial/cc236342996894a61a884303a3e9869bed2fb7a7" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                go-ethereum wiki cc23634 · Created Coin Contract Tutorial
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Wiki clone</span>
              <span className={cx("val mono")}>
                git clone https://github.com/ethereum/go-ethereum.wiki.git · cc236342996894a61a884303a3e9869bed2fb7a7
              </span>
            </li>
            <li>
              <span className={cx("lbl")}>Repo created</span>
              <span className={cx("val mono")}>2015-04-30T21:04:22Z, Taylor Gerring</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-vitalik-buterin-creates-standardized-contract-apis"
          src="wiki"
          star
          date={"2015-06-17"}
          times={["16:06:56Z"]}
          mobileWhen={"2015-06-17 · 16:06:56Z"}
          title={"Vitalik Buterin creates Standardized_Contract_APIs"}
          tags={[{ label: "vbuterin", actor: true }, { label: "ethereum/wiki", actor: false }, { label: "revision 1 of 54", actor: false }]}
          summary={
            <>
            The page that becomes ERC-20 begins as a three-part document covering currencies, exchanges and registries. Its currency API has
            {" "}
            <span className={cx("mono")}>balance</span>
            ,
            {" "}
            <span className={cx("mono")}>send</span>
            , and an
            {" "}
            <code>approve</code>
            {" "}
            that takes a boolean. Zero of the final six.
            </>
          }
        >
          <p>
            The framing sentence of the page states the whole design intent, and it is worth reading before anything else in this trail:
          </p>
          <blockquote>
            Although Ethereum allows developers to create absolutely any kind of application without restriction to specific feature types, and prides itself on its "lack of features", there is nevertheless a need to standardize certain very common use cases in order to allow users and applications to more easily interact with each other.
            <cite>Standardized_Contract_APIs, revision 1, verbatim</cite>
          </blockquote>
          <h4>The currency API as created</h4>
          <CodeBlock lang="sol" code={"balance(address addr) returns (uint256 bal)\nsend(address to, uint256 value) returns (bool success)\nsend(address to, uint256 value, address from) returns (bool success)\n\napprove(address addr, bool status)\napproved(address addr) returns (bool status)\napprove_once(address addr, bool status, uint256 maxval)"} />
          <p>
            Two structures already present here survive all the way to the finished standard. The first is the pull model: a third-party spender is authorised in advance, then moves funds on the owner's behalf. The second is the paragraph justifying it, which travels almost unedited into the issue five months later:
          </p>
          <blockquote>
            The third command is used for a "direct debit" workflow, allowing contracts to charge fees in sub-currencies; the second
            {" "}
            <code>send</code>
            {" "}
            command should fail unless the
            {" "}
            <code>from</code>
            {" "}
            account has deliberately authorized the sender of the message via some mechanism; we propose these standardized APIs for approval
            <cite>Standardized_Contract_APIs, revision 1, verbatim</cite>
          </blockquote>
          <p>
            What is not here: no events at all, no
            {" "}
            <code>totalSupply</code>
            , no read of another account's balance, and an approval that is a boolean switch rather than an amount.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Wiki revision</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/748c9b0a7f459ed5754420b6368bdd536bc4bdc4" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                748c9b0a7f459ed5754420b6368bdd536bc4bdc4
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Message</span>
              <span className={cx("val")}>Created Standardized_Contract_APIs (markdown)</span>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/wiki-revisions/01-2015-06-17_18-06-56-748c9b0.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-rewritten-as-the-sendcoin-api"
          src="wiki"
          date={"2015-06-18"}
          times={["03:37:28Z"]}
          mobileWhen={"2015-06-18 · 03:37:28Z"}
          title={"Rewritten as the sendCoin API"}
          tags={[{ label: "vbuterin", actor: true }, { label: "ethereum/wiki", actor: false }]}
          summary={
            <>
            Eleven hours after creating it, Buterin replaces the whole currency section.
            {" "}
            <span className={cx("mono")}>balance</span>
            {" "}
            becomes
            {" "}
            <span className={cx("mono")}>coinBalanceOf</span>
            ,
            {" "}
            <span className={cx("mono")}>send</span>
            {" "}
            becomes
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            , and the approval members take the names they will keep for the next five months.
            </>
          }
        >
          <p>
            This revision installs the vocabulary that the rest of 2015 runs on:
            {" "}
            <code>sendCoin</code>
            ,
            {" "}
            <code>coinBalanceOf</code>
            ,
            {" "}
            <code>isApprovedFor</code>
            ,
            {" "}
            <code>approveOnce</code>
            ,
            {" "}
            <code>isApprovedOnceFor</code>
            . Every one of these names is eventually replaced, and every replacement is dated in this timeline.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Wiki revision</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/b65a40cbaee585674f17cbe9d471ac7e6c40227a" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                b65a40cbaee585674f17cbe9d471ac7e6c40227a
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-first-event-enters-the-specification"
          src="wiki"
          date={"2015-06-23"}
          times={["07:46:09Z"]}
          mobileWhen={"2015-06-23 · 07:46:09Z"}
          title={"The first event enters the specification"}
          tags={[{ label: "vbuterin", actor: true }, { label: "ethereum/wiki", actor: false }]}
          summary={
            <>
            <span className={cx("mono")}>CoinSent(address,uint256,address)</span>
            . The ancestor of
            {" "}
            <span className={cx("mono")}>Transfer</span>
            , with the value in the middle and the recipient last.
            </>
          }
        >
          <p>
            Two renames separate this from the final event. It becomes
            {" "}
            <code>CoinTransfer</code>
            {" "}
            on 5 July 2015 and
            {" "}
            <code>Transfer</code>
            {" "}
            on 4 October 2015. The parameter order also changes: the deployed
            {" "}
            <code>Transfer</code>
            {" "}
            topic is
            {" "}
            <span className={cx("mono")}>(from, to, value)</span>
            , not
            {" "}
            <span className={cx("mono")}>(from, value, to)</span>
            .
          </p>
          <p>
            The
            {" "}
            <code>CoinSent</code>
            {" "}
            form was not merely a draft. It reached mainnet: two contracts deployed in the 2015-11-03 to 2016-01-06 window still carry its topic hash.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Wiki revision</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/6fa7692d225a8562f65c9c1d44712ac4d73e7c95" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                6fa7692d225a8562f65c9c1d44712ac4d73e7c95
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Rename to CoinTransfer</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/ee6f5a06d03210e343114f1f721dc0cf01012824" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ee6f5a0, 2015-07-05T10:48:34Z
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-coinbalanceof-enters-the-frontier-guide-tutorial"
          src="guide"
          date={"2015-07-02"}
          times={["21:51:06Z"]}
          mobileWhen={"2015-07-02 · 21:51:06Z"}
          title={"coinBalanceOf enters the Frontier Guide tutorial"}
          tags={[{ label: "Alexandre Van de Sande", actor: true }, { label: "go-ethereum.wiki", actor: false }]}
          summary={
            <>
            “Updated contracts with latest google docs.” The tutorial gains
            {" "}
            <span className={cx("mono")}>coinBalanceOf</span>
            {" "}
            and one mention of
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            , while still carrying
            {" "}
            <span className={cx("mono")}>sendToken</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>getBalance</span>
            {" "}
            elsewhere. The page is briefly bilingual.
            </>
          }
        >
          <p>
            This is the first appearance of the wiki standardization vocabulary inside the official user guide, and it is partial. Counting occurrences across the page at this revision:
            {" "}
            <span className={cx("mono")}>sendToken</span>
            {" "}
            12,
            {" "}
            <span className={cx("mono")}>coinBalanceOf</span>
            {" "}
            5,
            {" "}
            <span className={cx("mono")}>getBalance</span>
            {" "}
            2,
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            {" "}
            1. The token contract itself has been rewritten around a public
            {" "}
            <span className={cx("mono")}>coinBalanceOf</span>
            {" "}
            mapping but has not yet regained a transfer function or an event.
          </p>
          <CodeBlock lang="sol" caption={"go-ethereum.wiki Contract-Tutorial.md at 3efbb93, contract opening"} code={"contract token { \n    mapping (address => uint) public coinBalanceOf;\n\n    /* Initializes contract with 10 000 tokens to the creator of the contract */\n    function token() {\n        coinBalanceOf[msg.sender] = 10000;\n    }"} />
          <p>
            Declaring the mapping
            {" "}
            <code>public</code>
            {" "}
            is what makes
            {" "}
            <code>coinBalanceOf(address)</code>
            {" "}
            callable: the getter is generated, not written. Its selector,
            {" "}
            <span className={cx("mono")}>0xbbd39ac0</span>
            , is the same one the wiki specification asks for. That coincidence is what makes the onchain census below readable at all, and also what makes it ambiguous.
          </p>
          <p>
            The commit message is the useful part. “latest google docs” places the drafting somewhere outside version control, which is consistent with the rest of this trail: almost nothing here was designed in the repository it ended up in.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Tutorial page</span>
              <a href="https://github.com/ethereum/go-ethereum/wiki/Contract-Tutorial/3efbb93212cea5d90c1d9239f8f6b5cd9c260292" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                go-ethereum wiki 3efbb93 · Updated contracts with latest google docs.
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Author date</span>
              <span className={cx("val mono")}>2015-07-02 18:51:06 -0300</span>
            </li>
            <li>
              <span className={cx("lbl")}>Wiki clone</span>
              <span className={cx("val mono")}>3efbb93212cea5d90c1d9239f8f6b5cd9c260292</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-consensys-tokens-restarts-and-implements-the-wiki"
          src="code"
          date={"2015-07-15"}
          times={["08:52:32Z", "10:23:14Z"]}
          mobileWhen={"2015-07-15 · 08:52:32Z and 10:23:14Z"}
          title={"ConsenSys/Tokens restarts, and implements the wiki"}
          tags={[{ label: "Simon de la Rouviere", actor: true }, { label: "ConsenSys/Tokens", actor: false }]}
          summary={
            <>
            Simon de la Rouviere restarts the repository with “Let there be tokens.”, then ninety minutes later commits the first Solidity implementation of the wiki API. This repository tracks the specification revision by revision for the next year.
            </>
          }
        >
          <p>
            ConsenSys/Tokens is the implementation lineage of ERC-20, and it starts four months before issue #20 exists. Its abstract
            {" "}
            <span className={cx("mono")}>Token.sol</span>
            {" "}
            is the file that eventually holds the exact final interface, on 21 December 2015.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Restart</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/e9817a3cae7c1480e619e09d811cc41b9ea6c832" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                e9817a3 · Refactor & Restart. Let there be tokens.
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Implementation</span>
              <a href="https://github.com/ConsenSys/Tokens/commit/0463a18d6186ff78ee6be33df112a29dc1e35523" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                0463a18 · Standardised Token
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-ethereum-org-publishes-a-token-page"
          src="guide"
          star
          date={"2015-07-15"}
          times={["15:38:24Z"]}
          mobileWhen={"2015-07-15 · 15:38:24Z"}
          title={"ethereum.org publishes a token page"}
          tags={[{ label: "Alexandre Van de Sande", actor: true }, { label: "ethereum/ethereum-org", actor: false }, { label: "0 of 6", actor: false }]}
          summary={
            <>
            Van de Sande adds
            {" "}
            <span className={cx("mono")}>token.md</span>
            {" "}
            to the ethereum.org source. It carries
            {" "}
            <span className={cx("mono")}>coinBalanceOf</span>
            ,
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>event CoinTransfer</span>
            , and links the wiki as the “Meta coin standard”. Nine days before the same contract reaches the go-ethereum wiki.
            </>
          }
        >
          <p>
            This is the page reached at
            {" "}
            <span className={cx("mono")}>ethereum.org/token</span>
            , and it is the third piece of official documentation in this trail, alongside the Frontier Guide and the wallet's own ABI. It is the one Van de Sande points the issue thread to eight months later, when he writes that “the latest proposed standard is kept updated at ethereum.org/token”.
          </p>
          <CodeBlock lang="sol" caption={"ethereum-org views/content/token.md at 33b1217, contract as published"} code={"contract token { \n    mapping (address => uint) public coinBalanceOf;\n    event CoinTransfer(address sender, address receiver, uint amount);\n\n    /* Initializes contract with initial supply tokens to the creator of the contract */\n    function token(uint supply) {\n        coinBalanceOf[msg.sender] = (supply || 10000);\n    }\n\n    /* Very simple trade function */\n    function sendCoin(address receiver, uint amount) returns(bool sufficient) {\n        if (coinBalanceOf[msg.sender] < amount) return false;\n        coinBalanceOf[msg.sender] -= amount;\n        coinBalanceOf[receiver] += amount;\n        CoinTransfer(msg.sender, receiver, amount);\n        return true;\n    }\n}"} />
          <div className={cx("callout")}>
            This is the contract the Frontier Guide would carry, and ethereum.org has it first. On this date the go-ethereum wiki tutorial that the guide transcludes still has
            {" "}
            <code>coinBalanceOf</code>
            {" "}
            with no event and no
            {" "}
            <code>sendCoin</code>
            {" "}
            in the contract; it does not reach this form until Van de Sande's rewrite on
            {" "}
            <span className={cx("mono")}>2015-07-24</span>
            , nine days later. The same author wrote both.
          </div>
          <h4>What the page said the standard was</h4>
          <blockquote>
            [Meta coin standard](https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs) is a proposed standardization of function names for coin and token contracts, to allow them to be automatically added to other ethereum contract that utilizes trading, like exchanges or escrow.
            <cite>ethereum.org/token, Learn More section, verbatim including its markdown link syntax</cite>
          </blockquote>
          <p>
            A pointer to the wiki, under the name “Meta coin standard”. It stays on the page for five months and is removed on 23 December 2015.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ethereum/ethereum-org/commit/33b1217" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ethereum-org 33b1217 · Updating the release to the latest frontier page
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Author date</span>
              <span className={cx("val mono")}>2015-07-15 12:38:24 -0300</span>
            </li>
            <li>
              <span className={cx("lbl")}>File</span>
              <span className={cx("val mono")}>views/content/token.md, first of 117 revisions</span>
            </li>
            <li>
              <span className={cx("lbl")}>Referenced by</span>
              <a href="https://github.com/ethereum/EIPs/issues/20#issuecomment-196816918" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                issue #20, comment 196816918, 2016-03-15
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-guide-s-token-contract-reaches-its-final-form"
          src="guide"
          star
          date={"2015-07-24"}
          times={["14:51:33Z", "16:24:55Z"]}
          mobileWhen={"2015-07-24 · 14:51:33Z and 16:24:55Z"}
          title={"The guide's token contract reaches its final form"}
          tags={[{ label: "Alexandre Van de Sande", actor: true }, { label: "Viktor Trón", actor: true }, { label: "go-ethereum.wiki", actor: false }, { label: "ethereum/frontier-guide", actor: false }]}
          summary={
            <>
            Van de Sande's rewrite drops
            {" "}
            <span className={cx("mono")}>sendToken</span>
            {" "}
            entirely and adds
            {" "}
            <span className={cx("mono")}>event CoinTransfer</span>
            . Ninety-three minutes later zelig updates the guide's section anchors “for Alex tutorial updates”. Six days before Frontier launches.
            </>
          }
        >
          <p>
            After this edit the page contains
            {" "}
            <span className={cx("mono")}>coinBalanceOf</span>
            {" "}
            35 times,
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            {" "}
            14 times, and
            {" "}
            <span className={cx("mono")}>sendToken</span>
            {" "}
            zero. The token contract is now this, and the source does not change again until a one-operator compile fix four weeks later:
          </p>
          <CodeBlock lang="sol" caption={"go-ethereum.wiki Contract-Tutorial.md, section “The Coin”, verbatim including its irregular indentation"} code={"contract token { \n    mapping (address => uint) public coinBalanceOf;\n    event CoinTransfer(address sender, address receiver, uint amount);\n  \n  /* Initializes contract with initial supply tokens to the creator of the contract */\n  function token(uint supply) {\n        coinBalanceOf[msg.sender] = (supply || 10000);\n    }\n  \n  /* Very simple trade function */\n    function sendCoin(address receiver, uint amount) returns(bool sufficient) {\n        if (coinBalanceOf[msg.sender] < amount) return false;\n        coinBalanceOf[msg.sender] -= amount;\n        coinBalanceOf[receiver] += amount;\n        CoinTransfer(msg.sender, receiver, amount);\n        return true;\n    }\n}"} />
          <div className={cx("callout")}>
            <strong>The guide and the specification agree on two names and disagree on the signature of one of them.</strong>
            {" "}
            The wiki specifies
            {" "}
            <span className={cx("mono")}>sendCoin(uint _value, address _to)</span>
            . The guide writes
            {" "}
            <span className={cx("mono")}>sendCoin(address receiver, uint amount)</span>
            . Same name, reversed parameters, different ABI selector, no interoperability.
          </div>
          <CodeBlock lang="text" code={"guide  sendCoin(address,uint256)              0x90b98a11\nwiki   sendCoin(uint256,address)              0xc86a90fe\n\nboth   coinBalanceOf(address)                 0xbbd39ac0\nguide  CoinTransfer(address,address,uint256)  0x16cdf170…6146"} />
          <p>
            The
            {" "}
            <code>coinBalanceOf</code>
            {" "}
            getter matches. The transfer function does not. A contract written from the guide and a contract written from the specification could read each other's balances and could not move each other's tokens.
          </p>
          <p>
            Note also what the event is not. The wiki had specified indexed parameters since June; this one indexes nothing, so a client cannot filter its logs by sender or recipient. And it is named
            {" "}
            <code>CoinTransfer</code>
            , which the wiki had already renamed from
            {" "}
            <code>CoinSent</code>
            {" "}
            on 5 July and would rename to
            {" "}
            <code>Transfer</code>
            {" "}
            on 4 October. The guide never follows.
          </p>
          <h4>The guide follows, ninety-three minutes later</h4>
          <CodeBlock lang="text" caption={"frontier-guide contract_coin.md at 7366342, complete"} code={"{% sections \"the-coin\", \"\" %}\n{% endsections %}\n\n{% include \"git+https://github.com/ethereum/go-ethereum.wiki.git/Contract-Tutorial.md\" %}"} />
          <p>
            The commit message is “fix section anchors for Alex tutorial updates”. The guide had been pulling the section anchored
            {" "}
            <span className={cx("mono")}>"coin"</span>
            ; the rewrite renamed the heading, so the anchor became
            {" "}
            <span className={cx("mono")}>"the-coin"</span>
            . That one-word edit is the entire mechanism by which the official Frontier documentation adopted this contract.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Tutorial rewrite</span>
              <a href="https://github.com/ethereum/go-ethereum/wiki/Contract-Tutorial/8eaddd02029e5d50b5a0aa6edba36fd425128435" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                go-ethereum wiki 8eaddd0 · updated tutorial
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Guide anchor fix</span>
              <a href="https://github.com/ethereum/frontier-guide/commit/7366342ea34bbf7661cfb61c4b26cdf8c457a6d4" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                frontier-guide 7366342 · fix section anchors for Alex tutorial updates
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Author dates</span>
              <span className={cx("val mono")}>2015-07-24 11:51:33 -0300 · 2015-07-24 17:24:55 +0100</span>
            </li>
            <li>
              <span className={cx("lbl")}>Last guide commit</span>
              <span className={cx("val mono")}>
                2015-07-28T09:05:36Z, Fabian Vogelsteller, “Update SUMMARY.md”. The repository stops here, two days before Frontier.
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-guide-s-contract-on-mainnet"
          src="chain"
          star
          date={"2015-08-07"}
          times={["20:42:23Z"]}
          mobileWhen={"2015-08-07 · 20:42:23Z · block 49,853"}
          title={"The guide's contract on mainnet"}
          tags={[{ label: "mainnet", actor: false }, { label: "264 contracts", actor: false }, { label: "42% of 2015 token vocabulary", actor: false }]}
          summary={
            <>
            Eight days after Frontier launch.
            {" "}
            <strong>
              264 of the 628 token-vocabulary contracts deployed on mainnet in 2015 carry
              {" "}
              <span className={cx("mono")}>coinBalanceOf</span>
              {" "}
              together with the
              {" "}
              <span className={cx("mono")}>CoinTransfer</span>
              {" "}
              topic
            </strong>
            , the guide's exact pairing. Seven carry the specification's
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            .
            </>
          }
        >
          <p>
            Measured across every contract created on mainnet from Frontier launch on 2015-07-30 to 2015-12-31: 6,187
            {" "}
            <span className={cx("mono")}>create</span>
            {" "}
            traces, 5,724 with runtime bytecode, 628 carrying token vocabulary.
          </p>
          <TableScroll>
            <table>
              <thead>
                <tr>
                  <th>In 2015</th>
                  <th className={cx("num")}>Contracts</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="In 2015" className={cx("mono")}>
                    coinBalanceOf(address)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    274
                  </td>
                </tr>
                <tr>
                  <td data-label="In 2015" className={cx("mono")}>
                    CoinTransfer(address,address,uint256)
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    287
                  </td>
                </tr>
                <tr>
                  <td data-label="In 2015">
                    <strong>Both together, the guide's pairing</strong>
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    <strong>264</strong>
                  </td>
                </tr>
                <tr>
                  <td data-label="In 2015">
                    …of those, also carrying
                    {" "}
                    <span className={cx("mono")}>sendCoin(uint256,address)</span>
                  </td>
                  <td data-label="Contracts" className={cx("num")}>
                    7
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <h4>The first six</h4>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>UTC</th>
                  <th className={cx("num")}>Block</th>
                  <th>Address</th>
                  <th className={cx("num")}>Runtime</th>
                  <th>Family</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-08-07T20:42:23Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    49,853
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0x8374f5CC22eDA52e960D9558fb48DD4b7946609a" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    495
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    21c82a42
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-08-07T20:45:00Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    49,864
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0x3B4446ACD9547D0183811F0E7c31b63706295f52" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    495
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    21c82a42
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-08-07T20:50:03Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    49,888
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0xD958b51bC95338D152D55BEEd17a156e8aeC4c9f" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    607
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    b9184117
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-08-08T11:01:11Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    53,051
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0x3c401B518252aBE3BBBf898A44939699E7dA1634" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    495
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    21c82a42
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-08-08T11:01:38Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    53,054
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0x33e98638ea7F2C2fd83731528fb53802Af395D13" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    495
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    21c82a42
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-08-08T17:41:09Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    54,537
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0xE9712E9d4635f4c6937E9982A1596C64F0968A4c" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    495
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    21c82a42
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p>
            None of the 264 has
            {" "}
            <code>name</code>
            ,
            {" "}
            <code>symbol</code>
            {" "}
            or
            {" "}
            <code>decimals</code>
            , and none has any of the final six. They cluster tightly by bytecode: 91 in one family, 54 in a second, 46 in a third, and runtime sizes of 495 bytes (99 contracts), 278 (66) and 238 (46). By month: 65 in August, 51 in September, 102 in October, 12 in November, 34 in December.
          </p>
          <div className={cx("callout callout--warn")}>
            <strong>This exposes a gap in the original scan.</strong>
            {" "}
            Its superseded-vocabulary list was built from the wiki, dapp-bin and the DAO, so it tested
            {" "}
            <span className={cx("mono")}>sendCoin(uint256,address)</span>
            {" "}
            and never tested the guide's
            {" "}
            <span className={cx("mono")}>sendCoin(address,uint256)</span>
            . That is why the drafting-window figures elsewhere on this page report 56 contracts with
            {" "}
            <span className={cx("mono")}>coinBalanceOf</span>
            {" "}
            and only 2 with
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            : 53 of those 56 pair
            {" "}
            <span className={cx("mono")}>coinBalanceOf</span>
            {" "}
            with
            {" "}
            <span className={cx("mono")}>CoinTransfer</span>
            , and
            {" "}
            <strong>
              none of the 53 carries the specification's
              {" "}
              <span className={cx("mono")}>sendCoin</span>
              {" "}
              at all
            </strong>
            . Their transfer function is under a signature the scan did not look for.
          </div>
          <p>
            What is established is the co-occurrence and its size. The attribution to the guide is an inference, though a tight one: the pairing of a public
            {" "}
            <code>coinBalanceOf</code>
            {" "}
            mapping with an unindexed
            {" "}
            <code>CoinTransfer</code>
            {" "}
            event, no optional metadata, and no specification
            {" "}
            <code>sendCoin</code>
            , is exactly the shape of the contract printed in the official tutorial and of nothing else in the vocabulary. It has not been re-verified by re-scanning, because the archived corpus stores decoded member lists rather than bytecode. Re-running the walk with
            {" "}
            <span className={cx("mono")}>0x90b98a11</span>
            {" "}
            added would settle it.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Corpus</span>
              <span className={cx("val mono")}>
                raw/onchain/y2015-token-vocabulary-hits.json (628 records), window-token-vocabulary-hits.json (320 records)
              </span>
            </li>
            <li>
              <span className={cx("lbl")}>Scan vocabulary</span>
              <span className={cx("val mono")}>raw/onchain/scan-selectors.py, LEGACY map</span>
            </li>
            <li>
              <span className={cx("lbl")}>Missing selector</span>
              <span className={cx("val mono")}>sendCoin(address,uint256) = 0x90b98a11</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-a-compile-fix-and-the-last-change-to-the-contract"
          src="guide"
          date={"2015-08-22"}
          times={["19:23:23Z"]}
          mobileWhen={"2015-08-22 · 19:23:23Z"}
          title={"A compile fix, and the last change to the contract"}
          tags={[{ label: "Eerik Puska", actor: true }, { label: "go-ethereum.wiki", actor: false }, { label: "final form", actor: false }]}
          summary={
            <>
            Eerik Puska: “Solc gave error ‘Type error: Operator || not compatible with types uint256 and int_const’, fixed code to make it compile”. After this edit the guide's token contract is byte-identical through 2019.
            </>
          }
        >
          <p>
            The fix is
            {" "}
            <span className={cx("mono")}>coinBalanceOf[msg.sender] = (supply || 10000);</span>
            {" "}
            becoming
            {" "}
            <span className={cx("mono")}>coinBalanceOf[msg.sender] = supply;</span>
            . The default-supply idea is dropped rather than rewritten. The reported error means the contract as published at Frontier launch did not compile under the solc of the day, and stood that way for twenty-three days after launch, and twenty-nine days after it was written.
          </p>
          <h4>The token contract source across every revision of the page</h4>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>UTC</th>
                  <th>Commit</th>
                  <th>Author</th>
                  <th>Source state</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-05-09T20:50:35Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    49baa0a
                  </td>
                  <td data-label="Author">
                    Viktor Trón
                  </td>
                  <td data-label="Source state">
                    <span className={cx("mono")}>sendToken</span>
                    {" "}
                    /
                    {" "}
                    <span className={cx("mono")}>getBalance</span>
                    , no event
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-07-02T21:51:06Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    3efbb93
                  </td>
                  <td data-label="Author">
                    Alexandre Van de Sande
                  </td>
                  <td data-label="Source state">
                    public
                    {" "}
                    <span className={cx("mono")}>coinBalanceOf</span>
                    {" "}
                    mapping
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-07-24T14:51:33Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    8eaddd0
                  </td>
                  <td data-label="Author">
                    Alexandre Van de Sande
                  </td>
                  <td data-label="Source state">
                    <span className={cx("mono")}>sendCoin(address,uint)</span>
                    {" "}
                    +
                    {" "}
                    <span className={cx("mono")}>CoinTransfer</span>
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-08-22T19:23:23Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    4c31226
                  </td>
                  <td data-label="Author">
                    Eerik Puska
                  </td>
                  <td data-label="Source state">
                    compile fix.
                    {" "}
                    <strong>Unchanged from here</strong>
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-03-31T16:56:51Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    8bab868
                  </td>
                  <td data-label="Author">
                    Péter Szilágyi
                  </td>
                  <td data-label="Source state">
                    a missing
                    {" "}
                    <span className={cx("mono")}>+</span>
                    {" "}
                    in a
                    {" "}
                    <span className={cx("mono")}>console.log</span>
                    , outside the contract
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2016-10-31T18:29:02Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    f49ff0e
                  </td>
                  <td data-label="Author">
                    Felix Lange
                  </td>
                  <td data-label="Source state">
                    no change to the section at all
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2017-12-20T11:07:43Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    620afae
                  </td>
                  <td data-label="Author">
                    Felix Lange
                  </td>
                  <td data-label="Source state">
                    “Delete legacy documentation”
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            Between 2015-08-22 and 2016-10-31 the whole “The Coin” section changed by exactly one character, and the contract source not at all. Verified by extracting the section from each of the 29 revisions of the page and hashing it.
          </p>
          <div className={cx("callout")}>
            <strong>The official Ethereum client documentation never adopted ERC-20.</strong>
            {" "}
            The wiki renamed
            {" "}
            <code>coinBalanceOf</code>
            {" "}
            to
            {" "}
            <code>balanceOf</code>
            {" "}
            and
            {" "}
            <code>CoinTransfer</code>
            {" "}
            to
            {" "}
            <code>Transfer</code>
            {" "}
            on 4 October 2015. The specification froze on 6 January 2016. The guide's tutorial went on printing
            {" "}
            <code>coinBalanceOf</code>
            ,
            {" "}
            <code>sendCoin</code>
            {" "}
            and
            {" "}
            <code>CoinTransfer</code>
            {" "}
            unchanged for another twenty-two months, until the page was marked legacy in December 2017.
          </div>
          <p>
            Placed beside the onchain census, this is the plainest available explanation for a number that otherwise looks strange: 53 contracts emitting
            {" "}
            <code>CoinTransfer</code>
            {" "}
            during the drafting window, months after the standard had renamed it. They were following the documentation, and the documentation had not moved.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Compile fix</span>
              <a href="https://github.com/ethereum/go-ethereum/wiki/Contract-Tutorial/4c312264141c2fea96052c3f30b6e17695583a19" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                go-ethereum wiki 4c31226
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Legacy marker</span>
              <span className={cx("val mono")}>620afae, 2017-12-20T11:07:43Z, “Delete legacy documentation”</span>
            </li>
            <li>
              <span className={cx("lbl")}>Method</span>
              <span className={cx("val")}>
                Section extracted from all 29 revisions of Contract-Tutorial.md in a fresh clone and hashed; the contract body isolated by regex and hashed separately.
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-approval-system-reaches-its-largest-form"
          src="wiki"
          date={"2015-08-24"}
          times={["14:35:48Z"]}
          mobileWhen={"2015-08-24 · 14:35:48Z"}
          title={"The approval system reaches its largest form"}
          tags={[{ label: "caktux", actor: true }, { label: "ethereum/wiki", actor: false }]}
          summary={
            <>
            caktux adds
            {" "}
            <span className={cx("mono")}>disapprove</span>
            ,
            {" "}
            <span className={cx("mono")}>isApprovedOnce</span>
            ,
            {" "}
            <span className={cx("mono")}>isApprovedOnceFor</span>
            , and the events
            {" "}
            <span className={cx("mono")}>AddressApproval</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>AddressApprovalOnce</span>
            . The approval system now has six members. It ends with two.
            </>
          }
        >
          <p>
            This is the high-water mark of the approval design. Both events added here reached mainnet: one contract in the drafting window carries the
            {" "}
            <code>AddressApproval</code>
            {" "}
            topic and one carries
            {" "}
            <code>AddressApprovalOnce</code>
            .
          </p>
          <p>
            On 2 September 2015 Simon de la Rouviere renames
            {" "}
            <code>disapprove</code>
            {" "}
            to
            {" "}
            <code>unapprove</code>
            , the form that survives into issue #20 and is not removed until 6 January 2016.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Wiki revision</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/f06f0de55979bc222c58d6cb962e199c9f237266" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                f06f0de · add disapprove, isApprovedOnce and isApprovedOnceFor methods
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Rename</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/89ab4cf26940b09af1ff13d064fb9d6545dcf860" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                89ab4cf · disapprove becomes unapprove, 2015-09-02T13:36:16Z
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-wiki-api-as-runnable-solidity"
          src="code"
          date={"2015-09-06"}
          times={["12:04:52Z"]}
          mobileWhen={"2015-09-06 · 12:04:52Z"}
          title={"The wiki API as runnable Solidity"}
          tags={[{ label: "vbuterin", actor: true }, { label: "ethereum/dapp-bin", actor: false }]}
          summary={
            <>
            <span className={cx("mono")}>standardized_contract_apis/currency.sol</span>
            {" "}
            lands in
            {" "}
            <span className={cx("mono")}>ethereum/dapp-bin</span>
            . Zero of the final six, by signature.
            </>
          }
        >
          <h4>The interface at that commit</h4>
          <CodeBlock lang="sol" code={"function currency()\nfunction sendCoin(uint _value, address _to)\nfunction sendCoinFrom(address _from, uint _value, address _to)\nfunction coinBalance()\nfunction coinBalanceOf(address _addr)\nfunction approve(address _addr)\nfunction isApproved(address _proxy)\nfunction approveOnce(address _addr, uint256 _maxValue)\nfunction isApprovedOnceFor(address _target, address _proxy)\nfunction disapprove(address _addr)\nevent CoinSent(address indexed from, uint256 value, address indexed to)"} />
          <p>
            Not one member here carries a name that ERC-20 requires. This file is worth keeping in view when reading the onchain section: fifty-six contracts deployed during the drafting window implement
            {" "}
            <code>coinBalanceOf</code>
            , months after the wiki had renamed it away.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Commit</span>
              <a href="https://github.com/ethereum/dapp-bin/commit/8f6d0008118a22335e2f85861889885440d49a3c" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                8f6d000 · Moved from serpent/examples
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Blob</span>
              <a href="https://github.com/ethereum/dapp-bin/blob/8f6d0008118a22335e2f85861889885440d49a3c/standardized_contract_apis/currency.sol" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                standardized_contract_apis/currency.sol
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-alex-van-de-sande-proposes-the-optional-three"
          src="wiki"
          date={"2015-10-01"}
          times={["20:38:26Z"]}
          mobileWhen={"2015-10-01 · 20:38:26Z"}
          title={"Alex Van de Sande proposes the optional three"}
          tags={[{ label: "Alexandre Van de Sande", actor: true }, { label: "ethereum/wiki", actor: false }, { label: "revision 27", actor: false }]}
          summary={
            <>
            A new section, “Variables”, adds
            {" "}
            <span className={cx("mono")}>coinSymbol</span>
            ,
            {" "}
            <span className={cx("mono")}>coinName</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>coinBaseUnit</span>
            {" "}
            to a page that until then described only methods and events. He marks them optional in the same sentence he introduces them.
            </>
          }
        >
          <p>
            These three members are invisible in the finished EIP-20 text precisely because they are the three the standard marks OPTIONAL. They are also, in practice, the three that most token contracts of the era actually implemented.
          </p>
          <h4>The section as added, from the diff against revision 26</h4>
          <CodeBlock lang="text" caption={"ethereum/wiki 1f0f0a5, abridged where marked"} code={"### Variables\n\nThese variables contain information about the coin. They are optional but adding\nthem would increase the experience of the user that the GUI Client can use or not.\n\n#### coinSymbol (string)\nContains a short sequence of letters that are used to represent the unit of the coin.\n[...] Examples: `USDX`, `BOB$`, `Ƀ`, `% of shares`.\n\n#### coinName (string)\nContains a longer sequence of the coin name.\n[...] Examples: `e-Dollar`, `BobCoin`, `Bitcoin-Eth`.\n\n#### coinBaseUnit (integer)\nAlthough most coins are displayed to the final user as containing decimal points,\ncoin values are unsigned integers, as the recommended method is to to calculations\nin the smallest possible unit. The client should always display the total units\ndivided by coinBaseUnit. [...]\n\nExample: Bob has a balance of 100000 BobCoins, whose base unit is 100.\nHis balance will be displayed on the client as **BOB$100.00**"} />
          <p>
            Three things in this text survive into the standard unchanged. The members themselves. Their optionality, written 49 days before issue #20 was filed. And their justification: these were never protocol features, they were wallet rendering hints.
          </p>
          <h4>How the third member got its final name</h4>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>UTC</th>
                  <th>Source</th>
                  <th>Form</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-01T20:38:26Z
                  </td>
                  <td data-label="Source">
                    wiki
                    {" "}
                    <span className={cx("mono")}>1f0f0a5</span>
                    , Van de Sande
                  </td>
                  <td data-label="Form" className={cx("mono")}>
                    coinSymbol, coinName, coinBaseUnit
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-04T15:07:06Z
                  </td>
                  <td data-label="Source">
                    wiki
                    {" "}
                    <span className={cx("mono")}>607b6ac</span>
                    , Gav Wood
                  </td>
                  <td data-label="Form" className={cx("mono")}>
                    name, symbol, baseUnit
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-30T12:51:31Z
                  </td>
                  <td data-label="Source">
                    meteor-dapp-wallet
                    {" "}
                    <span className={cx("mono")}>860b85f</span>
                  </td>
                  <td data-label="Form" className={cx("mono")}>
                    tokenName, tokenSymbol, tokenDecimals
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-30T18:04:44Z
                  </td>
                  <td data-label="Source">
                    meteor-dapp-wallet
                    {" "}
                    <span className={cx("mono")}>ce24214</span>
                  </td>
                  <td data-label="Form" className={cx("mono")}>
                    name, symbol,
                    {" "}
                    <strong>decimals</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            <code>decimals</code>
            {" "}
            never appears on the wiki page at all. The wiki carried
            {" "}
            <code>baseUnit</code>
            {" "}
            unchanged from revision 27 through revision 40. The word
            {" "}
            <code>decimals</code>
            {" "}
            enters the record from the wallet side and travels from there into issue #20.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Wiki revision</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/1f0f0a59f446c6fa23c977cf13918a7b671b0a24" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                1f0f0a5 · Standard Suggestion: Coin Variables
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Author date</span>
              <span className={cx("val mono")}>2015-10-01 17:38:26 -0300</span>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/wiki-revisions/27-2015-10-01_17-38-26-1f0f0a5.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-gav-wood-renames-coinbalanceof-to-balanceof-and-cointransfer"
          src="wiki"
          star
          date={"2015-10-04"}
          times={["15:07:06Z"]}
          mobileWhen={"2015-10-04 · 15:07:06Z"}
          title={"Gav Wood renames coinBalanceOf to balanceOf, and CoinTransfer to Transfer"}
          tags={[{ label: "Gav Wood", actor: true }, { label: "ethereum/wiki", actor: false }, { label: "revision 28", actor: false }]}
          summary={
            <>
            Two of the eight final names arrive in a single wiki edit whose commit message is “Updated Standardized_Contract_APIs (markdown)”. Both keep their final signature from this moment onward.
            </>
          }
        >
          <p>
            This is the earliest public appearance of
            {" "}
            <code>balanceOf</code>
            {" "}
            and of the
            {" "}
            <code>Transfer</code>
            {" "}
            event anywhere in the sources examined. The same edit shortens Van de Sande's
            {" "}
            <code>coinBaseUnit</code>
            {" "}
            to
            {" "}
            <code>baseUnit</code>
            {" "}
            and drops the
            {" "}
            <code>coin</code>
            {" "}
            prefix from the other two optional members.
          </p>
          <h4>The full interface after this edit</h4>
          <CodeBlock lang="sol" code={"sendCoin(uint _value, address _to)\nsendCoinFrom(address _from, uint _value, address _to)\nbalanceOf(address _addr)\napprove(address _addr)\nunapprove(address _addr)\nisApprovedFor(address _target, address _proxy)\napproveOnce(address _addr, uint256 _maxValue)\nisApprovedOnceFor(address _target, address _proxy)\n\nevent Transfer(address indexed from, address indexed to, uint256 value)\nevent AddressApproval(address indexed address, address indexed proxy, bool result)\nevent AddressApprovalOnce(address indexed address, address indexed proxy, uint256 value)"} />
          <p>
            Note what has and has not happened.
            {" "}
            <code>balanceOf</code>
            {" "}
            and
            {" "}
            <code>Transfer</code>
            {" "}
            are final. The two transfer methods are still
            {" "}
            <code>sendCoin</code>
            {" "}
            and
            {" "}
            <code>sendCoinFrom</code>
            , and still take value before recipient. There is no
            {" "}
            <code>totalSupply</code>
            , no
            {" "}
            <code>allowance</code>
            , and
            {" "}
            <code>approve</code>
            {" "}
            takes no amount.
          </p>
          <p>
            A second, cosmetic revision follows nineteen seconds later at
            {" "}
            <span className={cx("mono")}>15:07:25Z</span>
            .
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Wiki revision</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/607b6ac9c090c45c10e05a00c172793811d02621" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                607b6ac9c090c45c10e05a00c172793811d02621
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Follow-up</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/352eade476e2b4ce6651be10fb51fa154a8dda17" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                352eade · 2015-10-04T15:07:25Z
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/wiki-revisions/28-2015-10-04_17-07-06-607b6ac.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-simon-de-la-rouviere-adds-transfer-and-transferfrom-twenty-f"
          src="wiki"
          star
          date={"2015-10-06"}
          times={["12:57:06Z", "12:57:30Z"]}
          mobileWhen={"2015-10-06 · 12:57:06Z and 12:57:30Z"}
          title={"Simon de la Rouviere adds transfer and transferFrom, twenty-four seconds apart"}
          tags={[{ label: "Simon de la Rouviere", actor: true }, { label: "ethereum/wiki", actor: false }, { label: "revisions 30 & 31", actor: false }]}
          summary={
            <>
            The commit message is “Function names were still ‘coin’ related.”
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            {" "}
            becomes
            {" "}
            <span className={cx("mono")}>transfer</span>
            .
            {" "}
            <span className={cx("mono")}>sendCoinFrom</span>
            {" "}
            becomes
            {" "}
            <span className={cx("mono")}>trasnferFrom</span>
            , misspelled. The typo is fixed in the next revision, 24 seconds later.
            </>
          }
        >
          <p>
            The function is named in a wiki edit that also misspells its sibling. The correction commit message is “Typo fix”.
          </p>
          <h4>After the typo fix, revision 31</h4>
          <CodeBlock lang="sol" code={"transfer(uint _value, address _to)\ntransferFrom(address _from, uint _value, address _to)\nbalanceOf(address _addr)\napprove(address _addr)\nunapprove(address _addr)\nisApprovedFor(address _target, address _proxy)\napproveOnce(address _address, uint256 _maxValue)\nisApprovedOnceFor(address _target, address _proxy)\n\nevent Transfer(address indexed from, address indexed to, uint256 value)\nevent AddressApproval(address indexed address, address indexed proxy, bool result)\nevent AddressApprovalOnce(address indexed address, address indexed proxy, uint256 value)"} />
          <p>
            The names are now final but the signatures are not.
            {" "}
            <code>transfer</code>
            {" "}
            still takes value first and recipient second, which is the reverse of the standard. That is corrected on 28 October 2015 by Fabian Vogelsteller, and only then do these two members reach the form the ABI selectors are computed from.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Rename</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/bfc39cb5edefe8d40b3b4056de7ccb49eb1dbc4e" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                bfc39cb · Function names were still "coin" related.
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Typo fix</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/9721a6be9f6207629d0c58f349aa90ce5890cd13" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                9721a6b · Typo fix
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifacts</span>
              <span className={cx("val mono")}>raw/wiki-revisions/30-…-bfc39cb.md, 31-…-9721a6b.md</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-the-wallet-s-token-interface"
          src="wallet"
          date={"2015-10-06"}
          times={["21:37:39Z"]}
          mobileWhen={"2015-10-06 · 21:37:39Z"}
          title={"The wallet's token interface"}
          tags={[{ label: "Alexandre Van de Sande", actor: true }, { label: "meteor-dapp-wallet", actor: false }]}
          summary={
            <>
            Alex Van de Sande adds
            {" "}
            <span className={cx("mono")}>tokenABI.js</span>
            {" "}
            to
            {" "}
            <span className={cx("mono")}>ethereum/meteor-dapp-wallet</span>
            . It expects three members:
            {" "}
            <span className={cx("mono")}>sendCoin</span>
            ,
            {" "}
            <span className={cx("mono")}>coinBalanceOf</span>
            , and the
            {" "}
            <span className={cx("mono")}>CoinTransfer</span>
            {" "}
            event. Nine hours after the wiki renamed all three away.
            </>
          }
        >
          <p>
            This file is the interface the Ethereum Wallet, shipped inside Mist, actually required of a token. It is the operative definition of “token” for the entire period covered here, and
            {" "}
            <strong>it never required the six</strong>
            . Its full history:
          </p>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>UTC</th>
                  <th>Commit</th>
                  <th>Members in the ABI</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-06T21:37:39Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    <a href="https://github.com/ethereum/meteor-dapp-wallet/commit/43a5115b8e04de429a851ac552f4e57085d26d08" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      43a5115
                    </a>
                  </td>
                  <td data-label="Members in the ABI" className={cx("mono")}>
                    sendCoin, coinBalanceOf, CoinTransfer (event)
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-23T13:44:44Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    <a href="https://github.com/ethereum/meteor-dapp-wallet/commit/cc1be08b85e7496548006e4c8c00d5ccc870a0ba" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      cc1be08
                    </a>
                  </td>
                  <td data-label="Members in the ABI" className={cx("mono")}>
                    balanceOf, transfer, Transfer (event)
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-27T14:40:33Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    <a href="https://github.com/ethereum/meteor-dapp-wallet/commit/518db2d1e3895f0ce7aa623da5dabcbe75a19262" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      518db2d
                    </a>
                  </td>
                  <td data-label="Members in the ABI" className={cx("mono")}>
                    balances, balanceof, transfer, Transfer (event)
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-30T12:51:31Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    <a href="https://github.com/ethereum/meteor-dapp-wallet/commit/860b85f2d8a532027a6473120ba103f2b2ef2ee4" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      860b85f
                    </a>
                  </td>
                  <td data-label="Members in the ABI" className={cx("mono")}>
                    balanceOf, transfer, tokenDecimals, tokenName, tokenSymbol, Transfer (event)
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-30T18:04:44Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    <a href="https://github.com/ethereum/meteor-dapp-wallet/commit/ce24214e6a019c65e589294a00eb8531ee701c92" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      ce24214
                    </a>
                  </td>
                  <td data-label="Members in the ABI" className={cx("mono")}>
                    balanceOf, transfer, decimals, name, symbol, Transfer (event)
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-11-03T12:06:23Z
                  </td>
                  <td data-label="Commit" className={cx("mono")}>
                    <a href="https://github.com/ethereum/meteor-dapp-wallet/commit/0022e375d0e8917039485fb9663f681343f9e648" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                      0022e37
                    </a>
                  </td>
                  <td data-label="Members in the ABI" className={cx("mono")}>
                    name, decimals, balanceOf, symbol, transfer, Transfer (event)
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            <span className={cx("mono")}>518db2d</span>
            {" "}
            contains the typo
            {" "}
            <span className={cx("mono")}>balanceof</span>
            {" "}
            alongside
            {" "}
            <span className={cx("mono")}>balances</span>
            , preserved here as found. After 2 December 2015 the file moved to
            {" "}
            <span className={cx("mono")}>tokenInterface.js</span>
            {" "}
            with the same five members plus the event.
          </p>
          <div className={cx("callout")}>
            The wallet wanted
            {" "}
            <code>name</code>
            ,
            {" "}
            <code>symbol</code>
            {" "}
            and
            {" "}
            <code>decimals</code>
            , none of which ERC-20 requires. It did not want
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
            , four of the six that it does. The wallet's requirement and the specification's requirement were never the same document, and were never reconciled during this period.
          </div>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Raw artifacts</span>
              <span className={cx("val mono")}>
                raw/code-snapshots/mist-wallet-43a5115-tokenABI.js, mist-wallet-cc1be08-tokenABI.js, mist-wallet-0022e37-tokenABI.js
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-first-contract-on-mainnet-with-balanceof-transfer-and-transf"
          src="chain"
          date={"2015-10-23"}
          times={["09:41:56Z"]}
          mobileWhen={"2015-10-23 · 09:41:56Z · block 426,661"}
          title={"First contract on mainnet with balanceOf, transfer and Transfer together"}
          tags={[{ label: "mainnet", actor: false }, { label: "create trace", actor: false }]}
          summary={
            <>
            <span className={cx("mono")}>
              <Addr a="0x3C655ccb35666579511489af88153517fc58b017" />
            </span>
            , 508 bytes. The first of nine contracts from a two-address prototyping run over the following week. None of the nine has a name, a symbol or a decimal place.
            </>
          }
        >
          <p>
            Established against every contract created on mainnet from Frontier launch on 2015-07-30 to 2015-12-31: 6,187
            {" "}
            <span className={cx("mono")}>create</span>
            {" "}
            traces, 5,724 with runtime bytecode, 628 carrying token vocabulary.
          </p>
          <h4>The prototyping run</h4>
          <TableScroll>
            <table className={cx("table--stack")}>
              <thead>
                <tr>
                  <th>UTC</th>
                  <th className={cx("num")}>Block</th>
                  <th>Address</th>
                  <th className={cx("num")}>Runtime</th>
                  <th>Family</th>
                  <th>Deployer</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-23T09:41:56Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    426,661
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0x3C655ccb35666579511489af88153517fc58b017" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    508
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    6ec841c7
                  </td>
                  <td data-label="Deployer" className={cx("mono")}>
                    <Addr a="0xB1a2B43A7433dd150BB82227eD519Cd6b142d382" />
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-23T12:18:34Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    427,198
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0xe6512959d9cAA531c260E97C731BA0C821EC0C13" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    508
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    6ec841c7
                  </td>
                  <td data-label="Deployer" className={cx("mono")}>
                    <Addr a="0xB1a2B43A7433dd150BB82227eD519Cd6b142d382" />
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-23T12:30:46Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    427,248
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0xCAe62D22E8480b230d7aD93039167a0FfA7A2B8B" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    625
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    0316932e
                  </td>
                  <td data-label="Deployer" className={cx("mono")}>
                    <Addr a="0xB1a2B43A7433dd150BB82227eD519Cd6b142d382" />
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-23T12:34:58Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    427,265
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0x11485C5f164d6A67A72eEE9093b2581D1c304094" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    625
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    0316932e
                  </td>
                  <td data-label="Deployer" className={cx("mono")}>
                    <Addr a="0xB1a2B43A7433dd150BB82227eD519Cd6b142d382" />
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-26T16:09:34Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    443,423
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0xE274d18EF7b194A1EDEbB04cfE297CFe1489ef65" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    625
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    0316932e
                  </td>
                  <td data-label="Deployer" className={cx("mono")}>
                    <strong>
                      <Addr a="0x9b22a80D5c7B3374a05b446081f97d0A34079e7F" />
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-26T16:11:46Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    443,429
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0x00576287D3263ba831C8cf0886f06537e0515A2C" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    625
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    0316932e
                  </td>
                  <td data-label="Deployer" className={cx("mono")}>
                    <Addr a="0xB1a2B43A7433dd150BB82227eD519Cd6b142d382" />
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-27T11:21:38Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    447,432
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0x27Cb40ce7EB4d078196923d608Eb903A17E0C0ED" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    625
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    c56ecb93
                  </td>
                  <td data-label="Deployer" className={cx("mono")}>
                    <Addr a="0xB1a2B43A7433dd150BB82227eD519Cd6b142d382" />
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-27T17:47:26Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    448,848
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0x22D9d0D4c30f7ad097E46669F3D624923179e949" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    611
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    ede40200
                  </td>
                  <td data-label="Deployer" className={cx("mono")}>
                    <Addr a="0xB1a2B43A7433dd150BB82227eD519Cd6b142d382" />
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    2015-10-30T11:05:29Z
                  </td>
                  <td data-label="Block" className={cx("num")}>
                    462,663
                  </td>
                  <td data-label="Address" className={cx("mono")}>
                    <Addr a="0xe6EE69495B571e1042f760d7f34009164AFF87a2" />
                  </td>
                  <td data-label="Runtime" className={cx("num")}>
                    211
                  </td>
                  <td data-label="Family" className={cx("mono")}>
                    15c53184
                  </td>
                  <td data-label="Deployer" className={cx("mono")}>
                    <Addr a="0xB1a2B43A7433dd150BB82227eD519Cd6b142d382" />
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <p className={cx("tnote")}>
            The second of those deployers,
            {" "}
            <span className={cx("mono")}>
              <Addr a="0x9b22a80D5c7B3374a05b446081f97d0A34079e7F" />
            </span>
            , is MistCoin's own, eight days later.
          </p>
          <p>
            These are not nine independent tokens. Eight come from one address, which deployed twelve token-vocabulary contracts between 23 October and 20 November 2015 across six distinct bytecode families: one developer iterating. The ninth comes from MistCoin's own deployer and is byte-identical to a contract
            {" "}
            <span className={cx("mono")}>
              <Addr a="0xB1a2B43A7433dd150BB82227eD519Cd6b142d382" />
            </span>
            {" "}
            deployed two minutes and twelve seconds later from the same family. Two addresses put the same build on mainnet two minutes apart.
          </p>
          <div className={cx("callout")}>
            The wallet's
            {" "}
            <span className={cx("mono")}>tokenABI.js</span>
            {" "}
            at
            {" "}
            <span className={cx("mono")}>cc1be08</span>
            , committed on the same day, opens with a commented-out address:
            {" "}
            <span className={cx("mono")}>
              {"//\""}
              <Addr a="0x11485C5f164d6A67A72eEE9093b2581D1c304094" />
              "
            </span>
            . That is row four of the table above. The client's token interface was being written against these prototypes as they were deployed.
          </div>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Corpus</span>
              <span className={cx("val")}>
                BigQuery
                {" "}
                <span className={cx("mono")}>crypto_ethereum.traces</span>
                {" "}
                export, cross-checked against a local index of 12,023,046 contracts
              </span>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifacts</span>
              <span className={cx("val mono")}>
                raw/onchain/y2015-token-vocabulary-hits.json, raw/code-snapshots/mist-wallet-cc1be08-tokenABI.js
              </span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-fabian-vogelsteller-fixes-the-parameter-order"
          src="wiki"
          date={"2015-10-28"}
          times={["13:44:47Z"]}
          mobileWhen={"2015-10-28 · 13:44:47Z"}
          title={"Fabian Vogelsteller fixes the parameter order"}
          tags={[{ label: "Fabian Vogelsteller", actor: true }, { label: "ethereum/wiki", actor: false }, { label: "revision 32", actor: false }]}
          summary={
            <>
            “changed order to parameters in transfer and transferFrom”.
            {" "}
            <span className={cx("mono")}>transfer(address _to, uint256 _value)</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>transferFrom(_from, _to, _value)</span>
            {" "}
            reach their final signatures, three weeks after reaching their final names.
            </>
          }
        >
          <p>
            This edit is what fixes the two ABI selectors that matter most:
            {" "}
            <span className={cx("mono")}>0xa9059cbb</span>
            {" "}
            for
            {" "}
            <code>transfer</code>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>0x23b872dd</span>
            {" "}
            for
            {" "}
            <code>transferFrom</code>
            . Before it, the same names hash to different selectors and would not interoperate with anything deployed after.
          </p>
          <CodeBlock lang="sol" code={"transfer(address _to, uint256 _value)\ntransferFrom(address _from, address _to, uint256 _value)\nbalanceOf(address _address)\napprove(address _address)\nunapprove(address _address)\nisApprovedFor(address _target, address _proxy)\napproveOnce(address _address, uint256 _maxValue)\nisApprovedOnceFor(address _target, address _proxy)\n\nevent Transfer(address indexed from, address indexed to, uint256 value)\nevent AddressApproval(address indexed address, address indexed proxy, bool result)\nevent AddressApprovalOnce(address indexed address, address indexed proxy, uint256 value)"} />
          <p>
            Four of the six now stand in final form:
            {" "}
            <code>balanceOf</code>
            ,
            {" "}
            <code>transfer</code>
            ,
            {" "}
            <code>transferFrom</code>
            , and the
            {" "}
            <code>Transfer</code>
            {" "}
            event. Missing:
            {" "}
            <code>totalSupply</code>
            ,
            {" "}
            <code>allowance</code>
            , an
            {" "}
            <code>approve</code>
            {" "}
            that takes an amount, and the
            {" "}
            <code>Approval</code>
            {" "}
            event.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Wiki revision</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/0627f2404a6f031d523e263e65cbf0353769f6b1" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                0627f24 · changed order to parameters in transfer and transferFrom
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Follow-up</span>
              <a href="https://github.com/ethereum/wiki/wiki/Standardized_Contract_APIs/c0f52f19cc782c482314216873cbacac32a2d883" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                c0f52f1 · addd syntax highlighting, 13:50:32Z
              </a>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-an-anonymous-gist-and-a-rename-in-the-wallet"
          src="gist"
          date={"2015-10-30"}
          times={["18:01:51Z"]}
          mobileWhen={"2015-10-30 · 18:01:51Z"}
          title={"An anonymous gist, and a rename in the wallet"}
          tags={[{ label: "gist 909d02…", actor: false }, { label: "meteor-dapp-wallet", actor: false }]}
          summary={
            <>
            Gist
            {" "}
            <span className={cx("mono")}>909d02feff3a2e59f714</span>
            , “myToken”, one revision. Three minutes later the wallet ABI renames
            {" "}
            <span className={cx("mono")}>tokenName</span>
            ,
            {" "}
            <span className={cx("mono")}>tokenSymbol</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>tokenDecimals</span>
            {" "}
            to
            {" "}
            <span className={cx("mono")}>name</span>
            ,
            {" "}
            <span className={cx("mono")}>symbol</span>
            {" "}
            and
            {" "}
            <span className={cx("mono")}>decimals</span>
            .
            </>
          }
        >
          <p>
            This gist is the one the Ethereum Wallet 0.3.5 release notes link as their example token, four days later. It declares
            {" "}
            <span className={cx("mono")}>contract myToken</span>
            , its
            {" "}
            <code>transfer</code>
            {" "}
            carries
            {" "}
            <span className={cx("mono")}>returns(bool success)</span>
            , and it has no overflow guard.
          </p>
          <p>
            Both differences matter, because the contract deployed as MistCoin on 3 November has the opposite of each: no return value, and an overflow check. The wallet release shipped pointing at a source that is not the one its own author deployed.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Gist</span>
              <a href="https://gist.github.com/909d02feff3a2e59f714" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                909d02feff3a2e59f714
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Revision</span>
              <span className={cx("val mono")}>6eedf7f4863be61c40137433aa44e1957304cb12</span>
            </li>
            <li>
              <span className={cx("lbl")}>Wallet rename</span>
              <a href="https://github.com/ethereum/meteor-dapp-wallet/commit/ce24214e6a019c65e589294a00eb8531ee701c92" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                ce24214 · 2015-10-30T18:04:44Z
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifact</span>
              <span className={cx("val mono")}>raw/gists/mytoken-anon-909d02feff3a2e59f714-20151030.sol</span>
            </li>
          </ul>
        </TimelineEvent>
        <TimelineEvent
          id="ev-mistcoin-is-deployed"
          src="chain"
          star
          date={"2015-11-03"}
          times={["11:26:01Z", "→ 13:43:51Z"]}
          mobileWhen={"2015-11-03 · 11:26:01Z to 13:43:51Z"}
          title={"MistCoin is deployed"}
          tags={[{ label: "frozeman", actor: true }, { label: "gist 20c8b56…", actor: false }, { label: "mainnet", actor: false }, { label: "ethereum/mist", actor: false }]}
          summary={
            <>
            Fabian Vogelsteller creates the MyToken gist at 11:26:01Z. Ethereum Wallet 0.3.5 is drafted twelve minutes later. MistCoin is deployed at 12:03:29Z. The gist revision it was compiled from is saved
            {" "}
            <strong>seventeen seconds after the block that contains the deployment</strong>
            . The wallet ships at 13:43:51Z.
            </>
          }
        >
          <p>
            Sixteen days before issue #20 was filed, and two months before the specification stopped moving, the token that is most often called the first ERC-20 was put on mainnet. This is the day, minute by minute. Gist times come from the GitHub gist history API, release times from the GitHub releases API, and the deployment time from the block timestamp of its
            {" "}
            <span className={cx("mono")}>create</span>
            {" "}
            trace.
          </p>
          <TableScroll>
            <table>
              <thead>
                <tr>
                  <th>UTC</th>
                  <th>Event</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    11:26:01Z
                  </td>
                  <td data-label="Event">
                    frozeman creates gist
                    {" "}
                    <span className={cx("mono")}>20c8b5658349b003b08d</span>
                    , “MyToken solidity contract”. Revision
                    {" "}
                    <span className={cx("mono")}>bce55cca</span>
                    .
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    11:28:43Z
                  </td>
                  <td data-label="Event">
                    Revision
                    {" "}
                    <span className={cx("mono")}>251c7324</span>
                    .
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    11:28:56Z
                  </td>
                  <td data-label="Event">
                    Revision
                    {" "}
                    <span className={cx("mono")}>9f826f1a</span>
                    .
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    11:37:56Z
                  </td>
                  <td data-label="Event">
                    Ethereum Wallet release
                    {" "}
                    <span className={cx("mono")}>0.3.5</span>
                    {" "}
                    (Beta 3) created as a draft by
                    {" "}
                    <span className={cx("mono")}>frozeman</span>
                    . Eleven minutes and fifty-five seconds after the gist.
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    11:59:12Z
                  </td>
                  <td data-label="Event">
                    Revision
                    {" "}
                    <span className={cx("mono")}>759cddeb</span>
                    {" "}
                    removes
                    {" "}
                    <span className={cx("mono")}>returns (bool success)</span>
                    {" "}
                    from
                    {" "}
                    <code>transfer</code>
                    . Constructor is still
                    {" "}
                    <span className={cx("mono")}>(_supply, _name, _decimals, _symbol)</span>
                    .
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    <strong>12:03:29Z</strong>
                  </td>
                  <td data-label="Event">
                    <strong>MistCoin deployed.</strong>
                    {" "}
                    Block 483,325, tx
                    {" "}
                    <span className={cx("mono")}>0x74349ce6…54a7</span>
                    , deployer
                    {" "}
                    <span className={cx("mono")}>
                      <Addr a="0x9b22a80D5c7B3374a05b446081f97d0A34079e7F" />
                    </span>
                    .
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    <strong>12:03:46Z</strong>
                  </td>
                  <td data-label="Event">
                    Revision
                    {" "}
                    <span className={cx("mono")}>7bcfaef3</span>
                    {" "}
                    swaps the constructor to
                    {" "}
                    <span className={cx("mono")}>(_supply, _name, _symbol, _decimals)</span>
                    . Final revision; the gist has not changed since.
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    12:06:23Z
                  </td>
                  <td data-label="Event">
                    Wallet ABI adds
                    {" "}
                    <code>name</code>
                    ,
                    {" "}
                    <code>decimals</code>
                    ,
                    {" "}
                    <code>symbol</code>
                    {" "}
                    (
                    <span className={cx("mono")}>0022e37</span>
                    ).
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    13:43:51Z
                  </td>
                  <td data-label="Event">
                    Ethereum Wallet
                    {" "}
                    <span className={cx("mono")}>0.3.5</span>
                    {" "}
                    (Beta 3) published.
                  </td>
                </tr>
                <tr>
                  <td data-label="UTC" className={cx("mono")}>
                    18:27:06Z
                  </td>
                  <td data-label="Event">
                    Second contract with the full wallet-renderable token shape,
                    {" "}
                    <span className={cx("mono")}>
                      <Addr a="0x853737186cb24D4152f979B9152F652b67F7e9b7" />
                    </span>
                    . Whitcoin is third at 18:46:18Z.
                  </td>
                </tr>
              </tbody>
            </table>
          </TableScroll>
          <div className={cx("callout")}>
            <strong>
              MistCoin was deployed seventeen seconds before the gist revision whose source it was compiled from, and one hour forty minutes before the wallet release that made the feature public.
            </strong>
          </div>
          <p>
            The seventeen-second ordering is not a paradox. Recompilation shows the deployed bytecode carries revision 5's constructor argument order, not revision 4's: the source was edited locally, compiled, deployed, and saved back to the gist afterwards.
          </p>
          <h4>The source, gist revision 7bcfaef3, contract body</h4>
          <CodeBlock lang="sol" caption={"License header omitted. Verbatim otherwise, including the two typographic errors in the comments."} code={"contract MyToken {\n    /* Public variables of the token */\n    string public name;\n    string public symbol;\n    uint8 public decimals;\n\n    /* This creates an array with all balances */\n    mapping (address => uint256) public balanceOf;\n\n    /* This generates a public event on the blockchain that will notify clients */\n    event Transfer(address indexed from, address indexed to, uint256 value);\n\n    /* Initializes contract with initial supply tokens to the creator of the contract */\n    function MyToken(uint256 _supply, string _name, string _symbol, uint8 _decimals) {\n        /* if supply not given then generate 1 million of the smallest unit of the token */\n        if (_supply == 0) _supply = 1000000;\n\n        /* Unless you add other functions these variables will never change */\n        balanceOf[msg.sender] = _supply;\n        name = _name;\n        symbol = _symbol;\n\n        /* If you want a divisible token then add the amount of decimals the base unit has  */\n        decimals = _decimals;\n    }\n\n    /* Send coins */\n    function transfer(address _to, uint256 _value) {\n        /* if the sender doenst have enough balance then stop */\n        if (balanceOf[msg.sender] < _value) throw;\n        if (balanceOf[_to] + _value < balanceOf[_to]) throw;\n\n        /* Add and subtract new balances */\n        balanceOf[msg.sender] -= _value;\n        balanceOf[_to] += _value;\n\n        /* Notifiy anyone listening that this transfer took place */\n        Transfer(msg.sender, _to, _value);\n    }\n}"} />
          <p>
            That is the entire contract. One method, one event, three public variables. The
            {" "}
            <code>transfer</code>
            {" "}
            here declares no return value at all, which is why the deployed function returns nothing where EIP-20 specifies
            {" "}
            <span className={cx("mono")}>returns (bool success)</span>
            .
          </p>
          <p>
            Issue #20 did not exist on this day, and would not for another sixteen. See the
            {" "}
            <a href="#mistcoin">MistCoin section</a>
            {" "}
            for what the deployed bytecode contains and where the contract sits in the record.
          </p>
          <h4>What the release notes said</h4>
          <blockquote>
            This release fixes a lot of bugs and adds a new custom Token system, as well as a simple way to deploy contracts right from the wallet!
            <cite>Ethereum Wallet 0.3.5 release notes, verbatim</cite>
          </blockquote>
          <p>
            The notes never use the words “standard”, “ERC” or “EIP”. They describe tokens purely as a wallet feature, and they are explicit that names and symbols are not trustworthy identifiers:
          </p>
          <blockquote>
            Tokens can have any names or symbols (including "US dollar" or "BTC" and other token names) but each one will have a single unique icon, this is your guarantee of sending and receiving the token you want.
            <cite>Ethereum Wallet 0.3.5 release notes, verbatim</cite>
          </blockquote>
          <p>
            The release links its example token to the anonymous gist of 30 October, not to frozeman's own gist of that morning.
          </p>
          <h4>Sources</h4>
          <ul className={cx("sources")}>
            <li>
              <span className={cx("lbl")}>Gist</span>
              <a href="https://gist.github.com/frozeman/20c8b5658349b003b08d" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                frozeman/20c8b5658349b003b08d
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>First revision</span>
              <a href="https://gist.github.com/frozeman/20c8b5658349b003b08d/bce55cca788d90df01447f74eb227e3ed953ec4c" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                bce55cca788d90df01447f74eb227e3ed953ec4c
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Release</span>
              <a href="https://github.com/ethereum/mist/releases/tag/0.3.5" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                github.com/ethereum/mist/releases/tag/0.3.5
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Announcement</span>
              <a href="https://www.reddit.com/r/ethereum/s/RaFWsX2fTj" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                r/ethereum, the wallet release thread
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Fabian on MistCoin</span>
              <a href="https://www.reddit.com/r/ethereum/s/ormEwaQzvO" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                r/ethereum, his own account of the deployment
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Wallet ABI</span>
              <a href="https://github.com/ethereum/meteor-dapp-wallet/commit/0022e375d0e8917039485fb9663f681343f9e648" className={cx("ext")} target="_blank" rel="noopener noreferrer">
                0022e37
              </a>
            </li>
            <li>
              <span className={cx("lbl")}>Raw artifacts</span>
              <span className={cx("val mono")}>
                raw/gists/mytoken-rev5-7bcfaef3…sol, raw/onchain/mist-release-0.3.5.json, raw/onchain/mistcoin-0xf4eced2f-runtime.hex
              </span>
            </li>
          </ul>
        </TimelineEvent>
      </TimelineEra>
    </>
  );
}
