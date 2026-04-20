import { turso } from './turso';
import { getContractByAddress } from './db/contracts';
import { ERAS } from '@/types';
import type { Contract as AppContract, EthereumEra } from '@/types';

export type ContractLayer = 'on-chain' | 'indexed' | 'uncovered' | 'documented';

export interface ResolvedContract {
  address: string;
  layer: ContractLayer;

  // Layer 2+ (from Turso index)
  deployer?: string;
  blockNumber?: number;
  timestamp?: number;
  bytecodeHash?: string;
  codeSize?: number;
  era?: string;
  year?: number;
  isInternal?: boolean;
  gasUsed?: number;
  valueWei?: string;

  // Layer 2+ bytecode family
  siblingCount?: number;

  // Layer 3 (uncovered — sibling is documented)
  crackedSiblingAddress?: string;
  proofUrl?: string;

  // Layer 4 (from Neon editorial)
  neon?: AppContract;
}

interface TursoIndexRow {
  address: string;
  deployer: string;
  block_number: number;
  timestamp: number;
  bytecode_hash: string | null;
  code_size: number;
  era: string;
  year: number;
  is_internal: number;
  gas_used: number | null;
  value_wei: string | null;
}

interface TursoFamilyRow {
  sibling_count: number;
  is_cracked: number;
  cracked_address: string | null;
  proof_url: string | null;
}

export async function resolveContract(address: string): Promise<ResolvedContract | null> {
  const addr = address.toLowerCase();

  // Query Turso and Neon in parallel
  const [indexResult, neonContract] = await Promise.all([
    turso.execute({ sql: 'SELECT * FROM contract_index WHERE address = ?', args: [addr] }),
    getContractByAddress(addr).catch(() => null),
  ]);

  const indexRow = indexResult.rows[0] as unknown as TursoIndexRow | undefined;

  // Layer 4: documented in Neon with editorial content
  if (neonContract?.shortDescription) {
    const base = buildFromIndex(addr, indexRow);
    return {
      ...base,
      layer: 'documented',
      neon: neonContract,
    };
  }

  // Layer 2/3: in Turso index
  if (indexRow) {
    let familyRow: TursoFamilyRow | undefined;
    if (indexRow.bytecode_hash) {
      const familyResult = await turso.execute({
        sql: 'SELECT sibling_count, is_cracked, cracked_address, proof_url FROM bytecode_families WHERE bytecode_hash = ?',
        args: [indexRow.bytecode_hash],
      });
      familyRow = familyResult.rows[0] as unknown as TursoFamilyRow | undefined;
    }

    const base = buildFromIndex(addr, indexRow);
    if (familyRow) {
      base.siblingCount = familyRow.sibling_count;
    }

    // Layer 3: bytecode family has a cracked (documented) sibling
    if (familyRow?.is_cracked && familyRow.cracked_address) {
      return {
        ...base,
        layer: 'uncovered',
        crackedSiblingAddress: familyRow.cracked_address,
        proofUrl: familyRow.proof_url ?? undefined,
        neon: neonContract ?? undefined,
      };
    }

    return { ...base, layer: 'indexed', neon: neonContract ?? undefined };
  }

  // Not in any index
  return null;
}

function buildFromIndex(address: string, row: TursoIndexRow | undefined): ResolvedContract {
  if (!row) return { address, layer: 'on-chain' };
  return {
    address,
    layer: 'indexed',
    deployer: row.deployer,
    blockNumber: row.block_number,
    timestamp: row.timestamp,
    bytecodeHash: row.bytecode_hash ?? undefined,
    codeSize: row.code_size,
    era: row.era,
    year: row.year,
    isInternal: row.is_internal === 1,
    gasUsed: row.gas_used ?? undefined,
    valueWei: row.value_wei ?? undefined,
  };
}

export function buildContractFromResolved(r: ResolvedContract): AppContract {
  const era: EthereumEra | null = r.era ? (ERAS[r.era] ?? null) : null;
  const deploymentTimestamp = r.timestamp
    ? new Date(r.timestamp * 1000).toISOString()
    : null;

  return {
    address: r.address,
    runtimeBytecode: null,
    runtimeBytecodeHash: r.bytecodeHash ?? null,
    creationBytecode: null,
    deployerAddress: r.deployer ?? null,
    deploymentTxHash: null,
    deploymentBlock: r.blockNumber ?? null,
    deploymentTimestamp,
    deploymentTxIndex: null,
    deploymentTraceIndex: null,
    deploymentRank: null,
    deployStatus: null,
    decompiledCode: null,
    decompilationSuccess: false,
    currentBalanceWei: null,
    transactionCount: null,
    lastStateUpdate: null,
    gasUsed: r.gasUsed ?? null,
    gasPrice: null,
    codeSizeBytes: r.codeSize ?? null,
    eraId: r.era ?? null,
    era,
    heuristics: {
      contractType: null,
      confidence: 0.5,
      isProxy: false,
      hasSelfDestruct: false,
      isErc20Like: false,
      notes: null,
    },
    manualCategories: null,
    ensName: null,
    deployerEnsName: null,
    etherscanVerified: false,
    etherscanContractName: null,
    sourceCode: null,
    abi: null,
    compilerVersion: null,
    tokenName: null,
    tokenSymbol: null,
    tokenDecimals: null,
    tokenLogo: null,
    tokenTotalSupply: null,
    shortDescription: null,
    description: null,
    historicalSummary: null,
    historicalSignificance: null,
    historicalContext: null,
    compilerLanguage: null,
    compilerCommit: null,
    compilerRepo: null,
    verificationMethod: null,
    verificationProofUrl: null,
    verificationNotes: null,
    sourcifyMatch: null,
    verificationStatus: 'bytecode_only',
  };
}
