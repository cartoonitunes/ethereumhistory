#!/usr/bin/env python3
"""
Data Format Converter for Ethereum History Pipeline

Converts contract data files to the format expected by the similarity pipeline.

Input format (from data files):
{
  "contracts": [
    {
      "address": "0x...",
      "bytecode": "0x...",
      "timestamp": 1234567890,
      ...
    }
  ]
}

Output format (for pipeline):
[
  {
    "address": "0x...",
    "runtime_bytecode": "0x...",
    "deployment_timestamp": "2015-08-07T15:12:22",
    ...
  }
]
"""

import json
import argparse
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional


def is_valid_bytecode(bytecode: str) -> bool:
    """
    Check if bytecode is valid for analysis.
    
    Filters out:
    - Empty or null bytecode
    - Very short placeholder values like "0xdeadbeef" (exact matches only)
    - Very short bytecode (< 10 bytes) which are likely invalid
    """
    if not bytecode or bytecode == "0x" or bytecode == "":
        return False
    
    # Remove 0x prefix for length check
    hex_str = bytecode[2:] if bytecode.startswith("0x") else bytecode
    
    # Must have at least 10 bytes (20 hex chars) to be meaningful
    if len(hex_str) < 20:
        # For very short bytecode, check if it's a known placeholder
        # (These are likely invalid, but we only check exact matches for short bytecode)
        hex_lower = hex_str.lower()
        short_placeholders = [
            "deadbeef",
            "0deadbeef",
            "deadbeef0",
            "00000000",  # Only filter if entire bytecode is just zeros
        ]
        
        # Only filter if it's an exact match to a placeholder
        if hex_lower in short_placeholders:
            return False
        
        # Very short bytecode (< 10 bytes) is likely invalid anyway
        return False
    
    # Check if it's valid hex
    try:
        bytes.fromhex(hex_str)
    except ValueError:
        return False
    
    # For longer bytecode, "00000000" or other patterns could be legitimate
    # (e.g., padding, initialization values, etc.)
    return True


def convert_timestamp(timestamp: Any) -> Optional[str]:
    """
    Convert timestamp to ISO format string.
    
    Handles:
    - Unix timestamp (int or float)
    - ISO string (already formatted)
    - None/null
    """
    if timestamp is None:
        return None
    
    if isinstance(timestamp, str):
        # Try to parse if it's already ISO format
        try:
            datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            return timestamp
        except ValueError:
            pass
        # Try to parse as Unix timestamp string
        try:
            ts = float(timestamp)
            return datetime.fromtimestamp(ts).isoformat()
        except (ValueError, OSError):
            return None
    
    if isinstance(timestamp, (int, float)):
        try:
            return datetime.fromtimestamp(timestamp).isoformat()
        except (OSError, ValueError):
            return None
    
    return None


def strip_ansi_codes(text: str) -> str:
    """
    Remove ANSI color codes from text.

    The Palkeoramix decompiler adds ANSI codes for colored output.
    We strip these for clean storage while preserving the semantic content.
    """
    import re
    ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
    return ansi_escape.sub('', text)


def extract_function_names(decompiled_code: str) -> List[str]:
    """
    Extract function names from decompiled Panoramix/Palkeoramix output.

    Looks for patterns like:
    - def functionName(...)
    - const variableName = ...
    """
    import re
    functions = []

    # Match function definitions: def functionName(...)
    func_pattern = re.compile(r'def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(')
    functions.extend(func_pattern.findall(decompiled_code))

    # Match const declarations: const name = ...
    const_pattern = re.compile(r'const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=')
    functions.extend(const_pattern.findall(decompiled_code))

    # Filter out common non-meaningful names
    excluded = {'_fallback', 'storage', 'unknown', 'payable'}
    return [f for f in functions if f.lower() not in excluded]


def convert_contract(contract: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Convert a single contract from input format to pipeline format.

    Handles multiple field name formats:
    - Standard: "address", "bytecode", "timestamp"
    - Alternative: "Contract Address", "bytecode", "Deployment Timestamp"

    Now includes decompiled code and extracted function names for search.

    Args:
        contract: Contract dict from input file

    Returns:
        Converted contract dict, or None if invalid
    """
    # Extract address (handle different field names)
    address = (
        contract.get("address") or
        contract.get("Contract Address") or
        contract.get("contract_address")
    )
    if not address:
        return None

    # Map bytecode -> runtime_bytecode
    bytecode = (
        contract.get("bytecode") or
        contract.get("runtime_bytecode") or
        contract.get("Runtime Bytecode")
    )
    if not bytecode:
        return None

    # Validate bytecode
    if not is_valid_bytecode(bytecode):
        return None

    # Build output contract
    output = {
        "address": address,
        "runtime_bytecode": bytecode,
    }

    # Convert timestamp if present (handle different field names)
    timestamp = (
        contract.get("timestamp") or
        contract.get("deployment_timestamp") or
        contract.get("Deployment Timestamp")
    )
    if timestamp:
        iso_timestamp = convert_timestamp(timestamp)
        if iso_timestamp:
            output["deployment_timestamp"] = iso_timestamp

    # Copy other useful fields (optional, handle different field names)
    field_mappings = {
        "block_number": ["block_number", "deployment_block", "Block Number"],
        "deployment_block": ["deployment_block", "block_number", "Block Number"],
        "creator": ["creator", "deployer_address", "Deployer Address"],
        "deployer_address": ["deployer_address", "creator", "Deployer Address"],
        "transaction_hash": ["transaction_hash", "deployment_tx_hash", "Transaction Hash"],
        "deployment_tx_hash": ["deployment_tx_hash", "transaction_hash", "Transaction Hash"],
        "gas_used": ["gas_used", "Gas Used"],
        "gas_price": ["gas_price", "Gas Price"],
    }

    for output_field, possible_input_fields in field_mappings.items():
        for input_field in possible_input_fields:
            if input_field in contract:
                output[output_field] = contract[input_field]
                break

    # Handle decompiled code - this is the rich data we want to preserve
    # Support different field names: "decompiled_code" or "Method Code"
    decompiled_code = contract.get("decompiled_code") or contract.get("Method Code")
    decompilation_success = contract.get("decompilation_success", False)

    # If we have Method Code, that counts as successful decompilation
    if not decompilation_success and decompiled_code:
        decompilation_success = True

    output["decompilation_success"] = decompilation_success

    if decompiled_code and decompilation_success:
        # Strip ANSI codes for clean storage
        clean_decompiled = strip_ansi_codes(decompiled_code)
        output["decompiled_code"] = clean_decompiled

        # Extract function names for search indexing
        function_names = extract_function_names(clean_decompiled)
        if function_names:
            output["extracted_functions"] = function_names
    else:
        output["decompiled_code"] = None

    # Copy source code and ABI if available (verified contracts)
    if contract.get("source_code"):
        output["source_code"] = contract["source_code"]
    if contract.get("abi"):
        output["abi"] = contract["abi"]
    if contract.get("contract_name"):
        output["contract_name"] = contract["contract_name"]

    # Handle token metadata (from 2016-2018 data format)
    token_name = contract.get("Name")
    token_symbol = contract.get("Symbol")
    token_decimals = contract.get("Decimals")
    is_token = contract.get("Potential Token")

    if token_name:
        output["token_name"] = token_name
    if token_symbol:
        output["token_symbol"] = token_symbol
    if token_decimals is not None:
        try:
            output["token_decimals"] = int(token_decimals)
        except (ValueError, TypeError):
            pass
    if is_token:
        output["is_token"] = is_token

    return output


def convert_file(input_path: str, output_path: str, verbose: bool = True) -> Dict[str, int]:
    """
    Convert a contract data file to pipeline format.
    
    Args:
        input_path: Path to input JSON file
        output_path: Path to output JSON file
        verbose: Whether to print progress
        
    Returns:
        Dict with statistics: {"total": N, "valid": M, "invalid": K}
    """
    if verbose:
        print(f"Reading {input_path}...")
    
    with open(input_path, 'r') as f:
        data = json.load(f)
    
    # Handle wrapped format {"contracts": [...]}
    if isinstance(data, dict) and "contracts" in data:
        contracts = data["contracts"]
        if verbose:
            print(f"Found {len(contracts)} contracts in wrapped format")
    elif isinstance(data, list):
        contracts = data
        if verbose:
            print(f"Found {len(contracts)} contracts in array format")
    else:
        raise ValueError(f"Unexpected data format: expected list or dict with 'contracts' key")
    
    # Convert contracts
    if verbose:
        print("Converting contracts...")
    
    converted = []
    invalid_count = 0
    
    for i, contract in enumerate(contracts):
        converted_contract = convert_contract(contract)
        if converted_contract:
            converted.append(converted_contract)
        else:
            invalid_count += 1
        
        if verbose and (i + 1) % 10000 == 0:
            print(f"  Processed {i + 1}/{len(contracts)} contracts...")
    
    # Write output
    if verbose:
        print(f"Writing {len(converted)} valid contracts to {output_path}...")
    
    with open(output_path, 'w') as f:
        json.dump(converted, f, indent=2)
    
    stats = {
        "total": len(contracts),
        "valid": len(converted),
        "invalid": invalid_count
    }
    
    if verbose:
        print(f"\nConversion complete:")
        print(f"  Total contracts: {stats['total']}")
        print(f"  Valid contracts: {stats['valid']}")
        print(f"  Invalid/filtered: {stats['invalid']}")
        print(f"  Output file: {output_path}")
    
    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Convert contract data files to pipeline format",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Convert 2015 contracts
    python convert_data_format.py \\
        --input ../eth_2015/data_files/ethereum_2015_contracts.json \\
        --output ./converted_2015_contracts.json
    
    # Convert 2016-2018 contracts
    python convert_data_format.py \\
        --input ../eth_2015/data_files/2016to2018_contracts_with_bytecode.json \\
        --output ./converted_2016to2018_contracts.json
        """
    )
    
    parser.add_argument(
        '--input', '-i',
        required=True,
        help='Path to input JSON file'
    )
    
    parser.add_argument(
        '--output', '-o',
        required=True,
        help='Path to output JSON file'
    )
    
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Suppress progress output'
    )
    
    args = parser.parse_args()
    
    # Validate input file exists
    if not Path(args.input).exists():
        print(f"ERROR: Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)
    
    # Create output directory if needed
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    try:
        stats = convert_file(
            args.input,
            args.output,
            verbose=not args.quiet
        )
        
        if stats['valid'] == 0:
            print("WARNING: No valid contracts found in input file", file=sys.stderr)
            sys.exit(1)
        
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
