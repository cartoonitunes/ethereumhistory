"""
Export Module for Bytecode Similarity Results

This module exports similarity results to formats suitable for:
- PostgreSQL COPY import (CSV)
- JSON Lines for streaming processing
- Direct database insertion

Output is designed to match the contract_similarity table schema.
"""

import csv
import json
from typing import List, Dict, Any, TextIO, Optional
from dataclasses import asdict
from pathlib import Path

from .similarity import SimilarityResult
from .fingerprint import ContractFingerprint, fingerprint_to_db_row


def similarity_to_db_row(result: SimilarityResult) -> Dict[str, Any]:
    """
    Convert a SimilarityResult to a database row dict.

    Matches the contract_similarity table schema.
    """
    return {
        "contract_address": result.contract_address,
        "matched_address": result.matched_address,
        "similarity_score": round(result.similarity_score, 10),
        "ngram_similarity": round(result.ngram_similarity, 10),
        "control_flow_similarity": round(result.control_flow_similarity, 10),
        "shape_similarity": round(result.shape_similarity, 10),
        "similarity_type": result.similarity_type,
        "confidence_score": result.confidence_score,
        "explanation": result.explanation,
        "shared_patterns": result.shared_patterns,
    }


def export_similarities_csv(
    results: List[SimilarityResult],
    output_path: str,
    include_header: bool = True
) -> int:
    """
    Export similarity results to CSV format.

    The CSV is designed for PostgreSQL COPY command:
    COPY contract_similarity FROM 'file.csv' WITH (FORMAT csv, HEADER true);

    Args:
        results: List of SimilarityResult objects
        output_path: Path to output CSV file
        include_header: Whether to include header row

    Returns:
        Number of rows written
    """
    fieldnames = [
        "contract_address",
        "matched_address",
        "similarity_score",
        "ngram_similarity",
        "control_flow_similarity",
        "shape_similarity",
        "similarity_type",
        "confidence_score",
        "explanation",
        "shared_patterns",
    ]

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)

        if include_header:
            writer.writeheader()

        for result in results:
            row = similarity_to_db_row(result)
            # Convert shared_patterns list to PostgreSQL array format
            row["shared_patterns"] = "{" + ",".join(
                f'"{p.replace(chr(34), chr(34)+chr(34))}"'
                for p in row["shared_patterns"]
            ) + "}"
            writer.writerow(row)

    return len(results)


def export_similarities_jsonl(
    results: List[SimilarityResult],
    output_path: str
) -> int:
    """
    Export similarity results to JSON Lines format.

    Each line is a complete JSON object. This format is:
    - Easy to stream/process
    - Human readable
    - Appendable

    Args:
        results: List of SimilarityResult objects
        output_path: Path to output file

    Returns:
        Number of rows written
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        for result in results:
            row = similarity_to_db_row(result)
            f.write(json.dumps(row, ensure_ascii=False) + '\n')

    return len(results)


def export_fingerprints_csv(
    fingerprints: List[ContractFingerprint],
    output_path: str,
    include_header: bool = True
) -> int:
    """
    Export fingerprints to CSV format.

    Matches the bytecode_analysis table schema.

    Args:
        fingerprints: List of ContractFingerprint objects
        output_path: Path to output CSV file
        include_header: Whether to include header row

    Returns:
        Number of rows written
    """
    fieldnames = [
        "contract_address",
        "opcode_count",
        "unique_opcode_count",
        "jump_count",
        "jumpdest_count",
        "branch_density",
        "storage_ops_count",
        "call_ops_count",
        "heuristic_has_loops",
        "heuristic_loop_count",
        "opcode_trigram_hash",
        "opcode_quadgram_hash",
        "opcode_pentagram_hash",
        "control_flow_signature",
        "shape_signature",
        "opcode_trigrams",
    ]

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)

        if include_header:
            writer.writeheader()

        for fp in fingerprints:
            row = fingerprint_to_db_row(fp)
            writer.writerow(row)

    return len(fingerprints)


def generate_sql_inserts(
    results: List[SimilarityResult],
    output_path: str,
    batch_size: int = 100
) -> int:
    """
    Generate SQL INSERT statements for similarity results.

    Uses multi-row INSERT for efficiency.
    Includes ON CONFLICT handling for upserts.

    Args:
        results: List of SimilarityResult objects
        output_path: Path to output SQL file
        batch_size: Number of rows per INSERT statement

    Returns:
        Number of rows written
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("-- Generated by ethereumhistory.com bytecode similarity pipeline\n")
        f.write("-- Import with: psql $DATABASE_URL -f this_file.sql\n\n")

        f.write("BEGIN;\n\n")

        for i in range(0, len(results), batch_size):
            batch = results[i:i + batch_size]

            f.write("INSERT INTO contract_similarity (\n")
            f.write("  contract_address, matched_address, similarity_score,\n")
            f.write("  ngram_similarity, control_flow_similarity, shape_similarity,\n")
            f.write("  similarity_type, confidence_score, explanation, shared_patterns\n")
            f.write(") VALUES\n")

            values = []
            for result in batch:
                row = similarity_to_db_row(result)

                # Escape strings for SQL
                def escape(s):
                    if s is None:
                        return "NULL"
                    return "'" + str(s).replace("'", "''") + "'"

                patterns_array = "ARRAY[" + ",".join(
                    escape(p) for p in row["shared_patterns"]
                ) + "]::TEXT[]"

                value = (
                    f"  ({escape(row['contract_address'])}, "
                    f"{escape(row['matched_address'])}, "
                    f"{row['similarity_score']}, "
                    f"{row['ngram_similarity']}, "
                    f"{row['control_flow_similarity']}, "
                    f"{row['shape_similarity']}, "
                    f"{escape(row['similarity_type'])}, "
                    f"{row['confidence_score']}, "
                    f"{escape(row['explanation'])}, "
                    f"{patterns_array})"
                )
                values.append(value)

            f.write(",\n".join(values))
            f.write("\nON CONFLICT (contract_address, matched_address) DO UPDATE SET\n")
            f.write("  similarity_score = EXCLUDED.similarity_score,\n")
            f.write("  ngram_similarity = EXCLUDED.ngram_similarity,\n")
            f.write("  control_flow_similarity = EXCLUDED.control_flow_similarity,\n")
            f.write("  shape_similarity = EXCLUDED.shape_similarity,\n")
            f.write("  similarity_type = EXCLUDED.similarity_type,\n")
            f.write("  confidence_score = EXCLUDED.confidence_score,\n")
            f.write("  explanation = EXCLUDED.explanation,\n")
            f.write("  shared_patterns = EXCLUDED.shared_patterns,\n")
            f.write("  computed_at = CURRENT_TIMESTAMP;\n\n")

        f.write("COMMIT;\n")

    return len(results)


class SimilarityExporter:
    """
    High-level exporter for similarity pipeline results.

    Provides a unified interface for exporting to multiple formats.
    """

    def __init__(self, output_dir: str):
        """
        Initialize exporter with output directory.

        Args:
            output_dir: Directory to write output files
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def export_all(
        self,
        fingerprints: List[ContractFingerprint],
        similarities: List[SimilarityResult],
        formats: List[str] = None
    ) -> Dict[str, str]:
        """
        Export all results in multiple formats.

        Args:
            fingerprints: Contract fingerprints
            similarities: Similarity results
            formats: List of formats to export ('csv', 'jsonl', 'sql')
                     Default: all formats

        Returns:
            Dict mapping format to output file path
        """
        if formats is None:
            formats = ['csv', 'jsonl', 'sql']

        outputs = {}

        # Export fingerprints
        fp_csv_path = self.output_dir / "bytecode_analysis.csv"
        export_fingerprints_csv(fingerprints, str(fp_csv_path))
        outputs['fingerprints_csv'] = str(fp_csv_path)

        # Export similarities
        if 'csv' in formats:
            csv_path = self.output_dir / "contract_similarity.csv"
            export_similarities_csv(similarities, str(csv_path))
            outputs['similarities_csv'] = str(csv_path)

        if 'jsonl' in formats:
            jsonl_path = self.output_dir / "contract_similarity.jsonl"
            export_similarities_jsonl(similarities, str(jsonl_path))
            outputs['similarities_jsonl'] = str(jsonl_path)

        if 'sql' in formats:
            sql_path = self.output_dir / "contract_similarity.sql"
            generate_sql_inserts(similarities, str(sql_path))
            outputs['similarities_sql'] = str(sql_path)

        return outputs


def print_summary(
    fingerprints: List[ContractFingerprint],
    similarities: List[SimilarityResult]
) -> None:
    """
    Print a summary of the analysis results.

    Useful for quick inspection of pipeline output.
    """
    print("=" * 60)
    print("BYTECODE SIMILARITY ANALYSIS SUMMARY")
    print("=" * 60)
    print(f"\nContracts analyzed: {len(fingerprints)}")
    print(f"Similarity pairs found: {len(similarities)}")

    if similarities:
        # Count by type
        type_counts = {}
        for s in similarities:
            type_counts[s.similarity_type] = type_counts.get(s.similarity_type, 0) + 1

        print("\nSimilarity breakdown:")
        for sim_type, count in sorted(type_counts.items()):
            print(f"  {sim_type}: {count}")

        # Top matches
        top_matches = sorted(similarities, key=lambda s: s.similarity_score, reverse=True)[:5]
        print("\nTop 5 most similar pairs:")
        for m in top_matches:
            print(f"  {m.contract_address[:10]}... <-> {m.matched_address[:10]}... : {m.similarity_score:.2%} ({m.similarity_type})")

        # Score distribution
        scores = [s.similarity_score for s in similarities]
        avg_score = sum(scores) / len(scores)
        min_score = min(scores)
        max_score = max(scores)
        print(f"\nScore statistics:")
        print(f"  Average: {avg_score:.2%}")
        print(f"  Min: {min_score:.2%}")
        print(f"  Max: {max_score:.2%}")

    print("\n" + "=" * 60)
