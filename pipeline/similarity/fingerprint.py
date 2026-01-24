"""
Bytecode Fingerprint Generation Module

This module generates multiple fingerprints from normalized bytecode for
similarity comparison. Each fingerprint captures a different aspect of
the contract's structure.

Fingerprint Types:
-----------------
1. N-gram Fingerprints (Primary)
   - Sliding window of opcodes
   - Captures local instruction patterns
   - Robust to insertions/deletions elsewhere

2. Control-Flow Signals (Secondary)
   - Jump instruction counts
   - Branch density
   - Loop indicators
   - Captures program structure

3. Shape Signals (Tertiary)
   - Total opcode count
   - Unique opcode ratio
   - Captures contract "size" and "vocabulary"

Why This Approach:
-----------------
Early Ethereum contracts (2015-2017) were often:
- Copies or slight modifications of other contracts
- Written by hand (no Solidity)
- Compiled with early Solidity versions

N-grams capture these relationships well:
- Exact copies have identical n-grams
- Modifications change some n-grams but preserve most
- Different contracts have different n-gram distributions

This is explainable: "These contracts share 87% of their opcode trigrams"
is meaningful to a researcher.
"""

from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass
from collections import Counter
import hashlib
import json

from .opcodes import CONTROL_FLOW_OPCODES, STORAGE_OPCODES, CALL_OPCODES


@dataclass
class ContractFingerprint:
    """
    Complete fingerprint for a contract.

    All fields are deterministic and can be recomputed from bytecode.
    """
    # Identity
    address: str

    # N-gram fingerprints (stored as hashes for compact storage)
    trigram_hash: str           # Hash of trigram multiset
    quadgram_hash: str          # Hash of 4-gram multiset
    pentagram_hash: str         # Hash of 5-gram multiset

    # Raw n-gram data (for Jaccard computation)
    trigrams: Dict[str, int]    # Trigram -> count
    quadgrams: Dict[str, int]   # 4-gram -> count

    # Control-flow signals
    jump_count: int             # JUMP + JUMPI
    jumpdest_count: int         # JUMPDEST (branch targets)
    branch_density: float       # JUMPI / total opcodes
    sstore_count: int           # SSTORE operations
    sload_count: int            # SLOAD operations
    call_count: int             # External call operations
    has_selfdestruct: bool      # Contains SELFDESTRUCT
    has_delegatecall: bool      # Contains DELEGATECALL

    # Shape signals
    opcode_count: int           # Total opcodes
    unique_opcodes: int         # Distinct opcode types used
    unique_ratio: float         # unique / total

    # Heuristic loop detection
    estimated_loops: int        # Backward jump patterns detected

    # Control-flow signature (compact encoding)
    control_flow_signature: str

    # Shape signature (compact encoding)
    shape_signature: str


def generate_ngrams(opcodes: List[str], n: int) -> Dict[str, int]:
    """
    Generate n-grams from opcode sequence.

    An n-gram is a contiguous sequence of n opcodes.
    We return a count of each unique n-gram (multiset).

    Example (n=3):
        opcodes = [PUSH, PUSH, MSTORE, CALLVALUE, ISZERO]
        trigrams = {
            "PUSH|PUSH|MSTORE": 1,
            "PUSH|MSTORE|CALLVALUE": 1,
            "MSTORE|CALLVALUE|ISZERO": 1,
        }

    Args:
        opcodes: List of normalized opcode mnemonics
        n: Size of the sliding window

    Returns:
        Dict mapping n-gram strings to their counts
    """
    if len(opcodes) < n:
        return {}

    ngrams: Dict[str, int] = Counter()

    for i in range(len(opcodes) - n + 1):
        # Join opcodes with | delimiter
        ngram = "|".join(opcodes[i:i + n])
        ngrams[ngram] += 1

    return dict(ngrams)


def hash_ngrams(ngrams: Dict[str, int]) -> str:
    """
    Create a deterministic hash of an n-gram multiset.

    This hash is used for quick equality checking and storage.
    Two contracts with identical n-gram distributions will have
    identical hashes.

    Args:
        ngrams: Dict mapping n-gram strings to counts

    Returns:
        SHA-256 hex digest (first 16 chars for brevity)
    """
    if not ngrams:
        return "empty"

    # Sort for determinism
    sorted_items = sorted(ngrams.items())
    # Create canonical string representation
    canonical = json.dumps(sorted_items, separators=(',', ':'))
    # Hash it
    return hashlib.sha256(canonical.encode()).hexdigest()[:16]


def count_opcodes_by_type(opcodes: List[str], target_set: Set[str]) -> int:
    """Count how many opcodes are in the target set."""
    return sum(1 for op in opcodes if op in target_set)


def detect_loops(opcodes: List[str]) -> int:
    """
    Heuristically detect loops in bytecode.

    This is imperfect but useful. We look for JUMPI instructions
    that could be backward jumps (loop exits). In practice, we can't
    know without symbolic execution, but patterns like:

        JUMPDEST ... JUMPI

    often indicate loops.

    This is explicitly labeled as HEURISTIC.

    Args:
        opcodes: List of opcode mnemonics

    Returns:
        Estimated number of loops (0 if none detected)
    """
    # Simple heuristic: count JUMPDEST followed eventually by JUMPI
    # before another JUMPDEST
    loop_count = 0
    in_potential_loop = False
    distance_from_jumpdest = 0

    for op in opcodes:
        if op == "JUMPDEST":
            in_potential_loop = True
            distance_from_jumpdest = 0
        elif op == "JUMPI" and in_potential_loop:
            # Loops are typically short (<50 opcodes)
            if distance_from_jumpdest < 50:
                loop_count += 1
            in_potential_loop = False
        else:
            distance_from_jumpdest += 1

    return loop_count


def compute_control_flow_signature(
    jump_count: int,
    jumpdest_count: int,
    branch_density: float,
    call_count: int,
    has_selfdestruct: bool
) -> str:
    """
    Encode control-flow metrics into a compact signature.

    This signature enables quick similarity comparison of
    control-flow characteristics.

    Format: "J{jumps}D{dests}B{branch%}C{calls}S{selfdestruct}"
    """
    return (
        f"J{jump_count:04d}"
        f"D{jumpdest_count:04d}"
        f"B{int(branch_density * 1000):04d}"
        f"C{call_count:03d}"
        f"S{1 if has_selfdestruct else 0}"
    )


def compute_shape_signature(
    opcode_count: int,
    unique_opcodes: int,
    unique_ratio: float
) -> str:
    """
    Encode shape metrics into a compact signature.

    Format: "O{count}U{unique}R{ratio%}"
    """
    return (
        f"O{opcode_count:06d}"
        f"U{unique_opcodes:03d}"
        f"R{int(unique_ratio * 1000):04d}"
    )


def generate_fingerprint(address: str, opcodes: List[str]) -> ContractFingerprint:
    """
    Generate a complete fingerprint for a contract.

    This is the main entry point for fingerprint generation.

    Args:
        address: Contract address (for identification)
        opcodes: Normalized opcode sequence (from normalize.py)

    Returns:
        ContractFingerprint with all computed metrics
    """
    # Handle empty input
    if not opcodes:
        return ContractFingerprint(
            address=address,
            trigram_hash="empty",
            quadgram_hash="empty",
            pentagram_hash="empty",
            trigrams={},
            quadgrams={},
            jump_count=0,
            jumpdest_count=0,
            branch_density=0.0,
            sstore_count=0,
            sload_count=0,
            call_count=0,
            has_selfdestruct=False,
            has_delegatecall=False,
            opcode_count=0,
            unique_opcodes=0,
            unique_ratio=0.0,
            estimated_loops=0,
            control_flow_signature="J0000D0000B0000C000S0",
            shape_signature="O000000U000R0000",
        )

    # Generate n-grams
    trigrams = generate_ngrams(opcodes, 3)
    quadgrams = generate_ngrams(opcodes, 4)
    pentagrams = generate_ngrams(opcodes, 5)

    # Control-flow metrics
    jump_count = opcodes.count("JUMP") + opcodes.count("JUMPI")
    jumpdest_count = opcodes.count("JUMPDEST")
    jumpi_count = opcodes.count("JUMPI")
    branch_density = jumpi_count / len(opcodes) if opcodes else 0.0

    sstore_count = opcodes.count("SSTORE")
    sload_count = opcodes.count("SLOAD")
    call_count = count_opcodes_by_type(opcodes, CALL_OPCODES)

    has_selfdestruct = "SELFDESTRUCT" in opcodes
    has_delegatecall = "DELEGATECALL" in opcodes

    # Shape metrics
    opcode_count = len(opcodes)
    unique_opcodes = len(set(opcodes))
    unique_ratio = unique_opcodes / opcode_count if opcode_count else 0.0

    # Loop detection (heuristic)
    estimated_loops = detect_loops(opcodes)

    # Compute signatures
    control_flow_sig = compute_control_flow_signature(
        jump_count, jumpdest_count, branch_density, call_count, has_selfdestruct
    )
    shape_sig = compute_shape_signature(opcode_count, unique_opcodes, unique_ratio)

    return ContractFingerprint(
        address=address,
        trigram_hash=hash_ngrams(trigrams),
        quadgram_hash=hash_ngrams(quadgrams),
        pentagram_hash=hash_ngrams(pentagrams),
        trigrams=trigrams,
        quadgrams=quadgrams,
        jump_count=jump_count,
        jumpdest_count=jumpdest_count,
        branch_density=branch_density,
        sstore_count=sstore_count,
        sload_count=sload_count,
        call_count=call_count,
        has_selfdestruct=has_selfdestruct,
        has_delegatecall=has_delegatecall,
        opcode_count=opcode_count,
        unique_opcodes=unique_opcodes,
        unique_ratio=unique_ratio,
        estimated_loops=estimated_loops,
        control_flow_signature=control_flow_sig,
        shape_signature=shape_sig,
    )


def fingerprint_to_db_row(fp: ContractFingerprint) -> Dict:
    """
    Convert fingerprint to a dict suitable for database insertion.

    This maps to the bytecode_analysis table schema.
    """
    return {
        "contract_address": fp.address,
        "opcode_count": fp.opcode_count,
        "unique_opcode_count": fp.unique_opcodes,
        "jump_count": fp.jump_count,
        "jumpdest_count": fp.jumpdest_count,
        "branch_density": fp.branch_density,
        "storage_ops_count": fp.sstore_count + fp.sload_count,
        "call_ops_count": fp.call_count,
        "heuristic_has_loops": fp.estimated_loops > 0,
        "heuristic_loop_count": fp.estimated_loops,
        "opcode_trigram_hash": fp.trigram_hash,
        "opcode_quadgram_hash": fp.quadgram_hash,
        "opcode_pentagram_hash": fp.pentagram_hash,
        "control_flow_signature": fp.control_flow_signature,
        "shape_signature": fp.shape_signature,
        "opcode_trigrams": json.dumps(fp.trigrams),
    }


if __name__ == "__main__":
    # Quick test
    from .normalize import get_opcode_sequence

    sample_bytecode = "0x6080604052348015600f57600080fd5b50603580601d6000396000f3fe6080604052600080fdfe"

    opcodes = get_opcode_sequence(sample_bytecode)
    fp = generate_fingerprint("0xTEST", opcodes)

    print(f"Address: {fp.address}")
    print(f"Opcode count: {fp.opcode_count}")
    print(f"Unique opcodes: {fp.unique_opcodes}")
    print(f"Trigram hash: {fp.trigram_hash}")
    print(f"Jump count: {fp.jump_count}")
    print(f"Branch density: {fp.branch_density:.4f}")
    print(f"Estimated loops: {fp.estimated_loops}")
    print(f"Control flow sig: {fp.control_flow_signature}")
    print(f"Shape sig: {fp.shape_signature}")
    print(f"Top trigrams: {list(fp.trigrams.items())[:5]}")
