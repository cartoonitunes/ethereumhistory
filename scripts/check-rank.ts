import { sql } from 'drizzle-orm';
import { getDb } from '../src/lib/db-client';

// Restore scifi contract to its original verified state
const ADDRESS = '0x8bbf81e9a8e936242354047c9905d621e269c7f7';

const SOURCE = `contract SciFi {
    mapping(bytes32 => uint) public bids;
    bytes32[1000000000] public movies;
    uint public movie_num;
    function vote(bytes32 name) {
        if (msg.value==0)
            return;
        uint val=bids[name];
        if (val==0) {
            movies[movie_num++]=name;
        }
        bids[name]+=msg.value;
    } 
}`;

const SHORT_DESC = "A Frontier Day 1 movie voting contract where users send ETH to vote for movies by bytes32 name.";

const DESCRIPTION = `One of Ethereum's earliest interactive dApps, deployed just 9 days after the Frontier launch on August 8, 2015.

Users bid ETH to rank their favorite sci-fi movies by calling vote(bytes32 name). New movies are added automatically on first bid; repeat bids accumulate. All ETH is permanently locked — there is no withdrawal function, ensuring no one can vote for free.

The author posted the source on r/ethereum the same day (r/ethereum/3g7lx6). The Reddit post shows bytes32[1000000] (1 million) while the deployed contract uses bytes32[1000000000] (1 billion) — the post was edited after deployment, likely simplifying for readability.

The author's opening bids: eXistenZ at #1 (0.0045 ETH), Blade Runner at #2, Melancholia at #3.`;

const HISTORICAL_SIGNIFICANCE = `One of the first user-deployed dApps on Ethereum's live network. Demonstrates the "ETH as signal" pattern — burning ETH irrevocably to prove conviction — which predates token-curated registries and bonding curves by years. The permanent ETH lock also foreshadows the "no admin key" design philosophy that became a DeFi principle.`;

async function main() {
  const db = getDb();
  await db.execute(sql.raw(`
    UPDATE contracts SET
      etherscan_contract_name = 'SciFi',
      short_description = ${sql.raw(`'${SHORT_DESC.replace(/'/g, "''")}'`)},
      description = ${sql.raw(`'${DESCRIPTION.replace(/'/g, "''")}'`)},
      historical_significance = ${sql.raw(`'${HISTORICAL_SIGNIFICANCE.replace(/'/g, "''")}'`)},
      source_code = ${sql.raw(`'${SOURCE.replace(/'/g, "''")}'`)},
      compiler_language = 'Solidity',
      compiler_commit = 'solc v0.1.4+commit.5f6c3cdf (optimizer enabled)',
      verification_method = 'exact_bytecode_match',
      verification_proof_url = 'https://github.com/cartoonitunes/scifi-verify',
      verification_notes = 'Runtime bytecode: exact match (219 bytes). Creation bytecode: 1-byte difference — native C++ solc adds STOP (0x00) padding byte after constructor RETURN. Source posted by author on r/ethereum same day (Aug 8 2015).'
    WHERE address = '${ADDRESS}'
  `));
  console.log('Restored scifi contract.');

  // Verify
  const r = await db.execute(sql.raw(`
    SELECT verification_method, verification_proof_url, compiler_commit, short_description FROM contracts WHERE address = '${ADDRESS}'
  `));
  console.log('Verified:', (r as any)[0]);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
