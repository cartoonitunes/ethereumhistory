// Generated. Lightweight index of the timeline, used by the filter shell
// so the event bodies themselves never have to reach the client bundle.
export interface TimelineIndexEvent {
  id: string;
  src: string;
  star: boolean;
}

export interface TimelineIndexEra {
  id: string;
  events: TimelineIndexEvent[];
}

export const TIMELINE_INDEX: TimelineIndexEra[] = [
  {
    "id": "era-1",
    "events": [
      {
        "id": "ev-a-coin-contract-with-no-standard-api",
        "src": "code",
        "star": false
      },
      {
        "id": "ev-the-frontier-guide-adds-a-token-chapter",
        "src": "guide",
        "star": true
      },
      {
        "id": "ev-vitalik-buterin-creates-standardized-contract-apis",
        "src": "wiki",
        "star": true
      },
      {
        "id": "ev-rewritten-as-the-sendcoin-api",
        "src": "wiki",
        "star": false
      },
      {
        "id": "ev-the-first-event-enters-the-specification",
        "src": "wiki",
        "star": false
      },
      {
        "id": "ev-coinbalanceof-enters-the-frontier-guide-tutorial",
        "src": "guide",
        "star": false
      },
      {
        "id": "ev-consensys-tokens-restarts-and-implements-the-wiki",
        "src": "code",
        "star": false
      },
      {
        "id": "ev-ethereum-org-publishes-a-token-page",
        "src": "guide",
        "star": true
      },
      {
        "id": "ev-the-guide-s-token-contract-reaches-its-final-form",
        "src": "guide",
        "star": true
      },
      {
        "id": "ev-the-guide-s-contract-on-mainnet",
        "src": "chain",
        "star": true
      },
      {
        "id": "ev-a-compile-fix-and-the-last-change-to-the-contract",
        "src": "guide",
        "star": false
      },
      {
        "id": "ev-the-approval-system-reaches-its-largest-form",
        "src": "wiki",
        "star": false
      },
      {
        "id": "ev-the-wiki-api-as-runnable-solidity",
        "src": "code",
        "star": false
      },
      {
        "id": "ev-alex-van-de-sande-proposes-the-optional-three",
        "src": "wiki",
        "star": false
      },
      {
        "id": "ev-gav-wood-renames-coinbalanceof-to-balanceof-and-cointransfer",
        "src": "wiki",
        "star": true
      },
      {
        "id": "ev-simon-de-la-rouviere-adds-transfer-and-transferfrom-twenty-f",
        "src": "wiki",
        "star": true
      },
      {
        "id": "ev-the-wallet-s-token-interface",
        "src": "wallet",
        "star": false
      },
      {
        "id": "ev-first-contract-on-mainnet-with-balanceof-transfer-and-transf",
        "src": "chain",
        "star": false
      },
      {
        "id": "ev-fabian-vogelsteller-fixes-the-parameter-order",
        "src": "wiki",
        "star": false
      },
      {
        "id": "ev-an-anonymous-gist-and-a-rename-in-the-wallet",
        "src": "gist",
        "star": false
      },
      {
        "id": "ev-mistcoin-is-deployed",
        "src": "chain",
        "star": true
      }
    ]
  },
  {
    "id": "era-2",
    "events": [
      {
        "id": "ev-the-draft-that-becomes-issue-20",
        "src": "gist",
        "star": true
      },
      {
        "id": "ev-totalsupply-appears-for-the-first-time-anywhere",
        "src": "gist",
        "star": true
      },
      {
        "id": "ev-the-wiki-is-updated-from-the-gist-and-issue-19-is-opened",
        "src": "eips",
        "star": false
      },
      {
        "id": "ev-issue-20-is-opened-erc-token-standard",
        "src": "eips",
        "star": true
      },
      {
        "id": "ev-the-issue-gets-a-number",
        "src": "eips",
        "star": false
      },
      {
        "id": "ev-pave-the-cowpaths",
        "src": "eips",
        "star": false
      },
      {
        "id": "ev-approve-gains-an-amount",
        "src": "eips",
        "star": false
      },
      {
        "id": "ev-allowance-and-approval-appear-and-all-eight-members-co-exist",
        "src": "eips",
        "star": true
      },
      {
        "id": "ev-the-poll-on-which-members-to-keep",
        "src": "wiki",
        "star": false
      },
      {
        "id": "ev-decimals-is-removed-from-the-specification",
        "src": "eips",
        "star": true
      },
      {
        "id": "ev-first-compilable-solidity-with-all-six-and-both-events",
        "src": "code",
        "star": true
      }
    ]
  },
  {
    "id": "era-3",
    "events": [
      {
        "id": "ev-regression-approval-is-renamed-approved",
        "src": "eips",
        "star": true
      },
      {
        "id": "ev-the-foundation-s-token-tutorial",
        "src": "blog",
        "star": true
      },
      {
        "id": "ev-the-only-contract-in-the-window-with-totalsupply",
        "src": "chain",
        "star": false
      },
      {
        "id": "ev-derp-approve-is-not-a-noun",
        "src": "code",
        "star": true
      },
      {
        "id": "ev-ethereum-org-drops-sendcoin-and-adopts-transfer",
        "src": "guide",
        "star": true
      },
      {
        "id": "ev-the-dao-is-still-running-the-superseded-interface",
        "src": "code",
        "star": false
      },
      {
        "id": "ev-a-readme-calls-issue-20-de-facto-finalised",
        "src": "code",
        "star": true
      },
      {
        "id": "ev-the-specification-reaches-its-final-form",
        "src": "eips",
        "star": true
      },
      {
        "id": "ev-first-contract-on-mainnet-carrying-all-six-selectors",
        "src": "chain",
        "star": true
      },
      {
        "id": "ev-the-first-contract-with-the-interface-and-a-real-supply",
        "src": "chain",
        "star": true
      },
      {
        "id": "ev-the-dao-adopts-the-exact-interface",
        "src": "code",
        "star": false
      },
      {
        "id": "ev-implement-erc-20-the-first-commit-message-to-name-the-standa",
        "src": "code",
        "star": true
      },
      {
        "id": "ev-the-first-erc-20-transfer",
        "src": "chain",
        "star": true
      },
      {
        "id": "ev-the-first-minimal-erc-20-on-mainnet",
        "src": "chain",
        "star": false
      }
    ]
  },
  {
    "id": "era-4",
    "events": [
      {
        "id": "ev-the-closed-up-form-erc20",
        "src": "code",
        "star": false
      },
      {
        "id": "ev-approve-and-transferfrom-reach-ethereum-org",
        "src": "guide",
        "star": false
      },
      {
        "id": "ev-van-de-sande-s-own-implementation",
        "src": "gist",
        "star": false
      },
      {
        "id": "ev-all-your-token-need-is-balanceof-and-transfer",
        "src": "eips",
        "star": true
      },
      {
        "id": "ev-first-compliant",
        "src": "chain",
        "star": true
      },
      {
        "id": "ev-the-first-repository-named-erc20",
        "src": "code",
        "star": true
      },
      {
        "id": "ev-the-wiki-stops-specifying-the-interface",
        "src": "wiki",
        "star": false
      },
      {
        "id": "ev-totalsupply-is-briefly-dropped-then-restored",
        "src": "eips",
        "star": false
      }
    ]
  },
  {
    "id": "era-5",
    "events": [
      {
        "id": "ev-an-erc-category-is-created-in-eip-1",
        "src": "eips",
        "star": false
      },
      {
        "id": "ev-fabian-vogelsteller-submits-the-standard-as-a-pull-request",
        "src": "eips",
        "star": false
      },
      {
        "id": "ev-merged-as-final",
        "src": "eips",
        "star": false
      },
      {
        "id": "ev-the-word-erc20-reaches-ethereum-org-as-a-filename",
        "src": "guide",
        "star": true
      }
    ]
  }
];

export const TIMELINE_TOTAL = 58;
