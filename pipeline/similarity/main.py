#!/usr/bin/env python3
"""
Bytecode Similarity Pipeline - Main Entry Point

This is the main orchestration script for the ethereumhistory.com
bytecode similarity analysis pipeline.

Usage:
    # From input JSON file
    python -m similarity.main --input contracts.json --output ./results

    # From database
    python -m similarity.main --from-db --output ./results

    # With custom thresholds
    python -m similarity.main --input contracts.json --threshold 0.7 --max-matches 5

Example input format (JSON):
[
    {
        "address": "0x...",
        "runtime_bytecode": "0x6080604052...",
        "deployment_timestamp": "2015-08-07T15:12:22"
    },
    ...
]

Output:
    - bytecode_analysis.csv: Fingerprints for each contract
    - contract_similarity.csv: Pairwise similarities above threshold
    - contract_similarity.jsonl: Same data in JSON Lines format
    - contract_similarity.sql: SQL INSERT statements for import
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

from .normalize import parse_bytecode, get_opcode_sequence
from .fingerprint import generate_fingerprint, ContractFingerprint
from .similarity import compute_all_similarities, SimilarityResult, THRESHOLD_WEAK
from .export import SimilarityExporter, print_summary


def load_contracts_from_json(file_path: str) -> List[Dict[str, Any]]:
    """
    Load contracts from a JSON file.

    Expected format:
    [
        {
            "address": "0x...",
            "runtime_bytecode": "0x...",
            "deployment_timestamp": "...",  // optional
            ...
        }
    ]
    """
    with open(file_path, 'r') as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("Input JSON must be a list of contract objects")

    # Validate required fields
    for i, contract in enumerate(data):
        if 'address' not in contract:
            raise ValueError(f"Contract at index {i} missing 'address' field")
        if 'runtime_bytecode' not in contract:
            raise ValueError(f"Contract at index {i} missing 'runtime_bytecode' field")

    return data


def load_contracts_from_db(connection_string: str) -> List[Dict[str, Any]]:
    """
    Load contracts from PostgreSQL database.

    Requires psycopg2.
    """
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        raise ImportError("psycopg2 required for database access. Install with: pip install psycopg2-binary")

    conn = psycopg2.connect(connection_string)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cursor.execute("""
        SELECT address, runtime_bytecode, deployment_timestamp
        FROM contracts
        WHERE runtime_bytecode IS NOT NULL
        AND runtime_bytecode != ''
        AND runtime_bytecode != '0x'
    """)

    contracts = [dict(row) for row in cursor.fetchall()]

    cursor.close()
    conn.close()

    return contracts


def process_contracts(
    contracts: List[Dict[str, Any]],
    verbose: bool = True
) -> List[ContractFingerprint]:
    """
    Process contracts: normalize bytecode and generate fingerprints.

    Args:
        contracts: List of contract dicts with 'address' and 'runtime_bytecode'
        verbose: Whether to print progress

    Returns:
        List of ContractFingerprint objects
    """
    fingerprints: List[ContractFingerprint] = []
    errors: List[str] = []

    if verbose:
        print(f"\nProcessing {len(contracts)} contracts...")

    iterator = contracts
    if verbose and HAS_TQDM:
        iterator = tqdm(contracts, desc="Generating fingerprints")

    for contract in iterator:
        address = contract['address']
        bytecode = contract.get('runtime_bytecode', '')

        if not bytecode or bytecode == '0x':
            errors.append(f"Empty bytecode for {address}")
            continue

        try:
            opcodes = get_opcode_sequence(bytecode)
            if not opcodes:
                errors.append(f"No opcodes parsed for {address}")
                continue

            fp = generate_fingerprint(address, opcodes)
            fingerprints.append(fp)

        except Exception as e:
            errors.append(f"Error processing {address}: {e}")

    if verbose and errors:
        print(f"\nWarnings ({len(errors)}):")
        for error in errors[:10]:  # Show first 10
            print(f"  - {error}")
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more")

    return fingerprints


def run_pipeline(
    contracts: List[Dict[str, Any]],
    output_dir: str,
    threshold: float = THRESHOLD_WEAK,
    max_matches: int = 10,
    verbose: bool = True
) -> Dict[str, str]:
    """
    Run the complete similarity pipeline.

    Args:
        contracts: List of contract dicts
        output_dir: Directory for output files
        threshold: Minimum similarity score to include
        max_matches: Maximum matches per contract
        verbose: Whether to print progress

    Returns:
        Dict mapping output type to file path
    """
    start_time = datetime.now()

    if verbose:
        print("=" * 60)
        print("ETHEREUMHISTORY.COM BYTECODE SIMILARITY PIPELINE")
        print("=" * 60)
        print(f"Start time: {start_time.isoformat()}")
        print(f"Contracts to process: {len(contracts)}")
        print(f"Similarity threshold: {threshold:.0%}")
        print(f"Max matches per contract: {max_matches}")

    # Step 1: Generate fingerprints
    fingerprints = process_contracts(contracts, verbose)

    if verbose:
        print(f"\nFingerprints generated: {len(fingerprints)}")

    if len(fingerprints) < 2:
        print("ERROR: Need at least 2 contracts for similarity analysis")
        return {}

    # Step 2: Compute similarities
    if verbose:
        print(f"\nComputing pairwise similarities...")
        print(f"Total pairs to compare: {len(fingerprints) * (len(fingerprints) - 1) // 2}")

    def progress_callback(current, total):
        if HAS_TQDM:
            return  # tqdm handles this
        if current % 5000 == 0:
            print(f"  Progress: {current}/{total} ({current/total:.1%})")

    if HAS_TQDM and verbose:
        # Use tqdm for similarity computation
        total_pairs = len(fingerprints) * (len(fingerprints) - 1) // 2
        with tqdm(total=total_pairs, desc="Computing similarities") as pbar:
            def tqdm_callback(current, total):
                pbar.update(1000)  # Update in chunks

            similarities = compute_all_similarities(
                fingerprints,
                threshold=threshold,
                max_matches_per_contract=max_matches,
                progress_callback=tqdm_callback
            )
    else:
        similarities = compute_all_similarities(
            fingerprints,
            threshold=threshold,
            max_matches_per_contract=max_matches,
            progress_callback=progress_callback if verbose else None
        )

    if verbose:
        print(f"\nSimilarity pairs found: {len(similarities)}")

    # Step 3: Export results
    if verbose:
        print(f"\nExporting to {output_dir}...")

    exporter = SimilarityExporter(output_dir)
    outputs = exporter.export_all(fingerprints, similarities)

    # Print summary
    if verbose:
        print_summary(fingerprints, similarities)

    end_time = datetime.now()
    duration = end_time - start_time

    if verbose:
        print(f"\nCompleted in {duration.total_seconds():.1f} seconds")
        print(f"\nOutput files:")
        for name, path in outputs.items():
            print(f"  {name}: {path}")

    return outputs


def main():
    parser = argparse.ArgumentParser(
        description="Bytecode similarity analysis for ethereumhistory.com",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Process contracts from JSON file
    python -m similarity.main --input contracts.json --output ./results

    # Process from database
    python -m similarity.main --from-db --output ./results

    # Custom thresholds
    python -m similarity.main --input contracts.json --threshold 0.7 --max-matches 5
        """
    )

    # Input options (mutually exclusive)
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument(
        '--input', '-i',
        help='Path to input JSON file containing contracts'
    )
    input_group.add_argument(
        '--from-db',
        action='store_true',
        help='Load contracts from database (requires DATABASE_URL env var)'
    )

    # Output options
    parser.add_argument(
        '--output', '-o',
        required=True,
        help='Output directory for results'
    )

    # Analysis options
    parser.add_argument(
        '--threshold', '-t',
        type=float,
        default=THRESHOLD_WEAK,
        help=f'Minimum similarity score to include (default: {THRESHOLD_WEAK})'
    )
    parser.add_argument(
        '--max-matches', '-m',
        type=int,
        default=10,
        help='Maximum matches per contract (default: 10)'
    )

    # Verbosity
    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Suppress progress output'
    )

    args = parser.parse_args()

    # Load contracts
    if args.from_db:
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            print("ERROR: DATABASE_URL environment variable required for --from-db")
            sys.exit(1)
        contracts = load_contracts_from_db(db_url)
    else:
        if not os.path.exists(args.input):
            print(f"ERROR: Input file not found: {args.input}")
            sys.exit(1)
        contracts = load_contracts_from_json(args.input)

    # Run pipeline
    outputs = run_pipeline(
        contracts=contracts,
        output_dir=args.output,
        threshold=args.threshold,
        max_matches=args.max_matches,
        verbose=not args.quiet
    )

    if not outputs:
        sys.exit(1)


if __name__ == "__main__":
    main()
