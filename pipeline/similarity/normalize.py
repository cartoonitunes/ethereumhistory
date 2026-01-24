"""
Bytecode Normalization Module

This module parses EVM bytecode and produces normalized opcode sequences
suitable for structural similarity comparison.

Why Normalization Matters:
-------------------------
Two contracts compiled from the same source with different compiler settings,
or with different constant values, will have different bytecode but the same
*structure*. By stripping out the values pushed onto the stack (addresses,
constants, etc.), we expose the underlying opcode skeleton.

Example:
    Original: PUSH1 0x60 PUSH1 0x40 MSTORE CALLVALUE ISZERO PUSH2 0x0010 JUMPI
    Normalized: PUSH PUSH MSTORE CALLVALUE ISZERO PUSH JUMPI

This allows us to identify contracts that are structurally identical even if
they were deployed with different parameters.

Historical Context (2015-2017):
------------------------------
- Solidity was young and evolving rapidly
- Many contracts were hand-written or used early compilers
- No standard patterns existed yet
- Bytecode varied wildly in structure
"""

from typing import List, Tuple, Optional
from dataclasses import dataclass

from .opcodes import get_opcode, is_push_opcode, OPCODES


@dataclass
class NormalizedBytecode:
    """
    Result of bytecode normalization.

    Attributes:
        opcodes: List of normalized opcode mnemonics (PUSH values stripped)
        raw_opcodes: List of original opcode mnemonics (with PUSH1, PUSH2, etc.)
        opcode_count: Total number of opcodes
        original_size: Size of original bytecode in bytes
        has_metadata: Whether Solidity metadata was detected and stripped
        metadata_offset: Byte offset where metadata begins (if detected)
        parse_errors: List of any parsing errors encountered
    """
    opcodes: List[str]
    raw_opcodes: List[str]
    opcode_count: int
    original_size: int
    has_metadata: bool
    metadata_offset: Optional[int]
    parse_errors: List[str]


def strip_0x_prefix(bytecode: str) -> str:
    """Remove 0x prefix if present."""
    if bytecode.startswith("0x") or bytecode.startswith("0X"):
        return bytecode[2:]
    return bytecode


def detect_metadata_offset(bytecode_bytes: bytes) -> Optional[int]:
    """
    Detect Solidity metadata section at the end of bytecode.

    Solidity (since ~0.4.7) appends a CBOR-encoded metadata hash to bytecode.
    The format is:
    - 0xa165... (CBOR prefix)
    - Followed by "bzzr0" or "ipfs" identifier
    - The last 2 bytes encode the metadata length

    This metadata is NOT executable code and should be excluded from analysis.

    Returns:
        Byte offset where metadata begins, or None if not detected.
    """
    if len(bytecode_bytes) < 43:  # Minimum size for metadata
        return None

    # Check for CBOR-encoded metadata (Solidity 0.4.7+)
    # Look for common patterns at the end

    # Try to read the length from the last 2 bytes
    try:
        # Solidity encodes length in last 2 bytes (big-endian)
        length_bytes = bytecode_bytes[-2:]
        metadata_length = int.from_bytes(length_bytes, 'big')

        # Sanity check: metadata should be 32-64 bytes typically
        if 32 <= metadata_length <= 100 and metadata_length < len(bytecode_bytes):
            potential_start = len(bytecode_bytes) - metadata_length - 2

            # Check for CBOR prefix 0xa2 (map with 2 items) or 0xa1 (map with 1 item)
            if potential_start > 0:
                marker = bytecode_bytes[potential_start]
                if marker in (0xa1, 0xa2, 0xa3):
                    return potential_start

    except (IndexError, ValueError):
        pass

    # Also check for older "bzzr" pattern
    bzzr_marker = b'bzzr'
    if bzzr_marker in bytecode_bytes[-64:]:
        idx = bytecode_bytes.rfind(bzzr_marker)
        # Walk back to find the start of the CBOR structure
        if idx > 2:
            return idx - 2

    return None


def normalize_push_opcode(mnemonic: str) -> str:
    """
    Normalize PUSH opcodes to a single 'PUSH' mnemonic.

    PUSH1, PUSH2, ... PUSH32 all become 'PUSH'.
    This allows comparing contracts that use different-sized constants.

    Args:
        mnemonic: Original opcode mnemonic

    Returns:
        'PUSH' if it's a PUSH opcode, otherwise the original mnemonic
    """
    if is_push_opcode(mnemonic):
        return "PUSH"
    return mnemonic


def parse_bytecode(bytecode: str, strip_metadata: bool = True) -> NormalizedBytecode:
    """
    Parse EVM bytecode into a normalized opcode sequence.

    This is the core normalization function. It:
    1. Converts hex bytecode to bytes
    2. Detects and optionally strips Solidity metadata
    3. Walks through opcodes, skipping PUSH operands
    4. Produces both raw and normalized opcode lists

    Args:
        bytecode: Hex-encoded bytecode string (with or without 0x prefix)
        strip_metadata: Whether to detect and exclude metadata section

    Returns:
        NormalizedBytecode containing parsed opcode sequences
    """
    errors: List[str] = []

    # Clean and convert to bytes
    hex_str = strip_0x_prefix(bytecode)

    # Handle empty or invalid input
    if not hex_str:
        return NormalizedBytecode(
            opcodes=[],
            raw_opcodes=[],
            opcode_count=0,
            original_size=0,
            has_metadata=False,
            metadata_offset=None,
            parse_errors=["Empty bytecode"]
        )

    try:
        bytecode_bytes = bytes.fromhex(hex_str)
    except ValueError as e:
        return NormalizedBytecode(
            opcodes=[],
            raw_opcodes=[],
            opcode_count=0,
            original_size=len(hex_str) // 2,
            has_metadata=False,
            metadata_offset=None,
            parse_errors=[f"Invalid hex: {e}"]
        )

    original_size = len(bytecode_bytes)

    # Detect metadata
    metadata_offset = detect_metadata_offset(bytecode_bytes) if strip_metadata else None
    has_metadata = metadata_offset is not None

    # Determine effective end of code section
    code_end = metadata_offset if has_metadata else len(bytecode_bytes)

    # Parse opcodes
    raw_opcodes: List[str] = []
    normalized_opcodes: List[str] = []
    position = 0

    while position < code_end:
        byte = bytecode_bytes[position]
        mnemonic, operand_bytes = get_opcode(byte)

        raw_opcodes.append(mnemonic)
        normalized_opcodes.append(normalize_push_opcode(mnemonic))

        # Skip operand bytes (for PUSH1-32)
        position += 1 + operand_bytes

        # Safety check: don't read past code section
        if position > code_end and operand_bytes > 0:
            errors.append(f"PUSH operand extends past code end at position {position - operand_bytes - 1}")
            break

    return NormalizedBytecode(
        opcodes=normalized_opcodes,
        raw_opcodes=raw_opcodes,
        opcode_count=len(normalized_opcodes),
        original_size=original_size,
        has_metadata=has_metadata,
        metadata_offset=metadata_offset,
        parse_errors=errors
    )


def bytecode_to_opcode_string(bytecode: str) -> str:
    """
    Convert bytecode to a space-separated opcode string.

    Useful for quick visual inspection.

    Example:
        >>> bytecode_to_opcode_string("0x6080604052")
        'PUSH PUSH MSTORE'
    """
    result = parse_bytecode(bytecode)
    return " ".join(result.opcodes)


def get_opcode_sequence(bytecode: str) -> List[str]:
    """
    Get the normalized opcode sequence from bytecode.

    This is the primary function used by the fingerprinting module.

    Args:
        bytecode: Hex-encoded bytecode string

    Returns:
        List of normalized opcode mnemonics
    """
    return parse_bytecode(bytecode).opcodes


# Patterns commonly seen at the start of Solidity-compiled contracts
# These help identify the compiler version era
COMMON_PROLOGUE_PATTERNS = {
    # Solidity 0.4.x style
    "solidity_0_4": ["PUSH", "PUSH", "MSTORE", "CALLVALUE", "ISZERO", "PUSH", "JUMPI"],
    # Older Solidity
    "solidity_early": ["PUSH", "PUSH", "MSTORE", "PUSH", "CALLDATASIZE"],
    # Hand-written or minimal
    "minimal": ["CALLER", "PUSH", "EQ"],
}


def detect_prologue_pattern(opcodes: List[str]) -> Optional[str]:
    """
    Detect which prologue pattern a contract uses.

    This can hint at the compiler version or whether it was hand-written.

    Args:
        opcodes: Normalized opcode list

    Returns:
        Pattern name if matched, None otherwise
    """
    if len(opcodes) < 7:
        return None

    prefix = opcodes[:7]

    for pattern_name, pattern in COMMON_PROLOGUE_PATTERNS.items():
        if prefix == pattern:
            return pattern_name

    return None


if __name__ == "__main__":
    # Quick test with a sample bytecode
    sample = "0x6080604052348015600f57600080fd5b50603580601d6000396000f3fe6080604052600080fdfea165627a7a72305820"

    result = parse_bytecode(sample)
    print(f"Original size: {result.original_size} bytes")
    print(f"Opcode count: {result.opcode_count}")
    print(f"Has metadata: {result.has_metadata}")
    print(f"Metadata offset: {result.metadata_offset}")
    print(f"Normalized opcodes: {' '.join(result.opcodes[:20])}...")
    print(f"Errors: {result.parse_errors}")
