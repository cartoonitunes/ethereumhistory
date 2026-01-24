"""
EVM Opcode Definitions

A complete mapping of EVM opcodes as they existed in the 2015-2017 era.
This is reference data used by the normalization module.

Historical Note:
- Frontier (2015) had the base opcode set
- Homestead (2016) added DELEGATECALL
- Byzantium (2017) added REVERT, RETURNDATASIZE, RETURNDATACOPY, STATICCALL

We include all opcodes up to Spurious Dragon for completeness.
"""

from typing import Dict, Tuple

# Opcode -> (mnemonic, push_bytes, description)
# push_bytes: how many bytes follow this opcode (for PUSH1-32, LOG0-4, etc.)
OPCODES: Dict[int, Tuple[str, int, str]] = {
    # Stop and Arithmetic
    0x00: ("STOP", 0, "Halts execution"),
    0x01: ("ADD", 0, "Addition operation"),
    0x02: ("MUL", 0, "Multiplication operation"),
    0x03: ("SUB", 0, "Subtraction operation"),
    0x04: ("DIV", 0, "Integer division operation"),
    0x05: ("SDIV", 0, "Signed integer division operation"),
    0x06: ("MOD", 0, "Modulo operation"),
    0x07: ("SMOD", 0, "Signed modulo operation"),
    0x08: ("ADDMOD", 0, "Modulo addition operation"),
    0x09: ("MULMOD", 0, "Modulo multiplication operation"),
    0x0A: ("EXP", 0, "Exponential operation"),
    0x0B: ("SIGNEXTEND", 0, "Extend length of two's complement signed integer"),

    # Comparison & Bitwise Logic
    0x10: ("LT", 0, "Less-than comparison"),
    0x11: ("GT", 0, "Greater-than comparison"),
    0x12: ("SLT", 0, "Signed less-than comparison"),
    0x13: ("SGT", 0, "Signed greater-than comparison"),
    0x14: ("EQ", 0, "Equality comparison"),
    0x15: ("ISZERO", 0, "Simple NOT operator"),
    0x16: ("AND", 0, "Bitwise AND operation"),
    0x17: ("OR", 0, "Bitwise OR operation"),
    0x18: ("XOR", 0, "Bitwise XOR operation"),
    0x19: ("NOT", 0, "Bitwise NOT operation"),
    0x1A: ("BYTE", 0, "Retrieve single byte from word"),
    0x1B: ("SHL", 0, "Shift left"),           # Constantinople
    0x1C: ("SHR", 0, "Shift right"),          # Constantinople
    0x1D: ("SAR", 0, "Arithmetic shift right"), # Constantinople

    # SHA3
    0x20: ("SHA3", 0, "Compute Keccak-256 hash"),

    # Environmental Information
    0x30: ("ADDRESS", 0, "Get address of currently executing account"),
    0x31: ("BALANCE", 0, "Get balance of the given account"),
    0x32: ("ORIGIN", 0, "Get execution origination address"),
    0x33: ("CALLER", 0, "Get caller address"),
    0x34: ("CALLVALUE", 0, "Get deposited value by the instruction/transaction"),
    0x35: ("CALLDATALOAD", 0, "Get input data of current environment"),
    0x36: ("CALLDATASIZE", 0, "Get size of input data"),
    0x37: ("CALLDATACOPY", 0, "Copy input data to memory"),
    0x38: ("CODESIZE", 0, "Get size of code running"),
    0x39: ("CODECOPY", 0, "Copy code to memory"),
    0x3A: ("GASPRICE", 0, "Get price of gas"),
    0x3B: ("EXTCODESIZE", 0, "Get size of external account's code"),
    0x3C: ("EXTCODECOPY", 0, "Copy external account's code to memory"),
    0x3D: ("RETURNDATASIZE", 0, "Get size of return data"),  # Byzantium
    0x3E: ("RETURNDATACOPY", 0, "Copy return data to memory"), # Byzantium
    0x3F: ("EXTCODEHASH", 0, "Get hash of external account's code"), # Constantinople

    # Block Information
    0x40: ("BLOCKHASH", 0, "Get the hash of one of the recent blocks"),
    0x41: ("COINBASE", 0, "Get the block's beneficiary address"),
    0x42: ("TIMESTAMP", 0, "Get the block's timestamp"),
    0x43: ("NUMBER", 0, "Get the block's number"),
    0x44: ("DIFFICULTY", 0, "Get the block's difficulty"),
    0x45: ("GASLIMIT", 0, "Get the block's gas limit"),
    0x46: ("CHAINID", 0, "Get the chain ID"),         # Istanbul
    0x47: ("SELFBALANCE", 0, "Get balance of current account"), # Istanbul

    # Stack, Memory, Storage and Flow Operations
    0x50: ("POP", 0, "Remove item from stack"),
    0x51: ("MLOAD", 0, "Load word from memory"),
    0x52: ("MSTORE", 0, "Save word to memory"),
    0x53: ("MSTORE8", 0, "Save byte to memory"),
    0x54: ("SLOAD", 0, "Load word from storage"),
    0x55: ("SSTORE", 0, "Save word to storage"),
    0x56: ("JUMP", 0, "Alter the program counter"),
    0x57: ("JUMPI", 0, "Conditionally alter the program counter"),
    0x58: ("PC", 0, "Get the value of the program counter"),
    0x59: ("MSIZE", 0, "Get the size of active memory"),
    0x5A: ("GAS", 0, "Get the remaining gas"),
    0x5B: ("JUMPDEST", 0, "Mark a valid destination for jumps"),

    # Push Operations (PUSH1 through PUSH32)
    **{0x60 + i: (f"PUSH{i+1}", i + 1, f"Place {i+1}-byte item on stack") for i in range(32)},

    # Duplication Operations (DUP1 through DUP16)
    **{0x80 + i: (f"DUP{i+1}", 0, f"Duplicate {i+1}th stack item") for i in range(16)},

    # Exchange Operations (SWAP1 through SWAP16)
    **{0x90 + i: (f"SWAP{i+1}", 0, f"Exchange 1st and {i+2}th stack items") for i in range(16)},

    # Logging Operations
    0xA0: ("LOG0", 0, "Append log record with no topics"),
    0xA1: ("LOG1", 0, "Append log record with one topic"),
    0xA2: ("LOG2", 0, "Append log record with two topics"),
    0xA3: ("LOG3", 0, "Append log record with three topics"),
    0xA4: ("LOG4", 0, "Append log record with four topics"),

    # System Operations
    0xF0: ("CREATE", 0, "Create a new account with associated code"),
    0xF1: ("CALL", 0, "Message-call into an account"),
    0xF2: ("CALLCODE", 0, "Message-call with alternative account's code"),
    0xF3: ("RETURN", 0, "Halt execution returning output data"),
    0xF4: ("DELEGATECALL", 0, "Message-call with caller's context"),  # Homestead
    0xF5: ("CREATE2", 0, "Create with deterministic address"),  # Constantinople
    0xFA: ("STATICCALL", 0, "Static message-call"),  # Byzantium
    0xFD: ("REVERT", 0, "Halt execution reverting state"),  # Byzantium
    0xFE: ("INVALID", 0, "Designated invalid instruction"),
    0xFF: ("SELFDESTRUCT", 0, "Halt execution and register for deletion"),
}

# Opcodes that indicate control flow
CONTROL_FLOW_OPCODES = {"JUMP", "JUMPI", "JUMPDEST", "CALL", "CALLCODE",
                        "DELEGATECALL", "STATICCALL", "RETURN", "REVERT",
                        "STOP", "SELFDESTRUCT", "INVALID"}

# Opcodes that interact with storage
STORAGE_OPCODES = {"SLOAD", "SSTORE"}

# Opcodes that make external calls
CALL_OPCODES = {"CALL", "CALLCODE", "DELEGATECALL", "STATICCALL", "CREATE", "CREATE2"}

# Opcodes commonly found in token contracts
TOKEN_INDICATOR_OPCODES = {"LOG1", "LOG2", "LOG3", "CALLER", "SSTORE", "SLOAD"}

# PUSH opcodes (used to identify values to strip)
PUSH_OPCODES = {f"PUSH{i}" for i in range(1, 33)}


def get_opcode(byte: int) -> Tuple[str, int]:
    """
    Get opcode mnemonic and byte count from opcode byte.

    Args:
        byte: Single byte (0-255)

    Returns:
        Tuple of (mnemonic, bytes_to_skip)
        If unknown, returns ("UNKNOWN_XX", 0)
    """
    if byte in OPCODES:
        mnemonic, push_bytes, _ = OPCODES[byte]
        return mnemonic, push_bytes
    return f"UNKNOWN_{byte:02X}", 0


def is_push_opcode(mnemonic: str) -> bool:
    """Check if an opcode is a PUSH instruction."""
    return mnemonic in PUSH_OPCODES


def get_push_size(mnemonic: str) -> int:
    """Get the number of bytes a PUSH opcode pushes."""
    if mnemonic.startswith("PUSH"):
        try:
            return int(mnemonic[4:])
        except ValueError:
            return 0
    return 0
