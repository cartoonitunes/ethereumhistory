#!/usr/bin/env python3
"""Token detector: finds contracts similar to reference tokens using the similarity pipeline."""

import json
import logging
import time
import csv
import os
import sys
from typing import Dict, List, Any, Optional
from collections import Counter
from pathlib import Path

# Add pipeline to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from similarity.normalize import get_opcode_sequence
from similarity.fingerprint import generate_fingerprint, ContractFingerprint
from similarity.similarity import compute_similarity, THRESHOLD_WEAK

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class TokenDetector:
    """Token detector based on bytecode similarity to reference contracts"""
    
    def __init__(self, fast_mode=False, skip_json=False):
        # Performance options
        self.fast_mode = fast_mode
        self.skip_json = skip_json
        
        # Reference token contracts to compare against
        # These are the same reference contracts from the 2015 analysis
        self.reference_contracts = {
            '0x3edDc7ebC7db94f54b72D8Ed1F42cE6A527305bB': {
                'name': 'Reference Token 1',
                'type': 'ERC-20 Token',
                'description': 'First reference token contract for similarity comparison'
            },
            '0xa2e3680ACaF5D2298697bdc016cf75a929385463': {
                'name': 'Reference Token 2',
                'type': 'ERC-20 Token',
                'description': 'Second reference token contract for similarity comparison'
            },
            '0xf4eCEd2f682CE333f96f2D8966C613DeD8fC95DD': {
                'name': 'MistCoin',
                'type': 'ERC-20 Token',
                'description': 'Third reference token contract for similarity comparison'
            },
            '0x3B4446ACD9547D0183811F0E7c31b63706295f52': {
                'name': 'Reference Token 4',
                'type': 'ERC-20 Token',
                'description': 'Fourth reference token contract for similarity comparison'
            },
            '0x8494F777d13503BE928BB22b1F4ae3289E634FD3': {
                'name': 'Reference Token 5',
                'type': 'ERC-20 Token',
                'description': 'Fifth reference token contract for similarity comparison'
            },
            '0xA8a937c840C9d808E20b7F89815F658384257E97': {
                'name': 'Reference Token 6',
                'type': 'ERC-20 Token',
                'description': 'Sixth reference token contract for similarity comparison'
            },
            '0xFF2947b1851bB16a7C8E71C6a8458D29600F9D6a': {
                'name': 'Reference Token 7',
                'type': 'ERC-20 Token',
                'description': 'Seventh reference token contract for similarity comparison'
            },
            '0xd3740542c91aF53ec6F62A0b31EC252Cdd323Cc6': {
                'name': 'Reference Token 8',
                'type': 'ERC-20 Token with Mint Function',
                'description': 'Eighth reference token contract with minting capability'
            },
            '0x807689D9426D8E36AD655e633Ec2F27cA075Fc91': {
                'name': 'Reference Token 9',
                'type': 'ERC-20 Token',
                'description': 'Ninth reference token contract for similarity comparison'
            },
            '0xa07e0a9519A2eca3312083F3FE91496f5D899cCd': {
                'name': 'Reference Token 10',
                'type': 'ERC-20 Token',
                'description': 'Tenth reference token contract for similarity comparison'
            },
            # Add more reference contracts as needed
        }
        
        # Data storage
        self.contracts_data = []
        self.reference_fingerprints: Dict[str, ContractFingerprint] = {}
        self.token_results = []
        
    def load_contracts(self, input_file: str) -> bool:
        """Load contracts from converted JSON file"""
        if not os.path.exists(input_file):
            logger.error(f"Contracts file not found: {input_file}")
            return False
            
        logger.info(f"Loading contracts from: {input_file}")
        with open(input_file, 'r') as f:
            self.contracts_data = json.load(f)
        
        logger.info(f"Loaded {len(self.contracts_data)} contracts")
        return True
    
    def load_reference_fingerprints(self, reference_file: Optional[str] = None) -> bool:
        """Load and fingerprint reference contracts
        
        Args:
            reference_file: Optional path to file containing reference contracts.
                           If not provided, searches in contracts_data.
        """
        logger.info("Loading reference contract fingerprints...")
        
        # Load reference contracts from separate file if provided
        all_contracts = self.contracts_data.copy()
        if reference_file and os.path.exists(reference_file):
            logger.info(f"Loading reference contracts from: {reference_file}")
            with open(reference_file, 'r') as f:
                reference_contracts = json.load(f)
                all_contracts.extend(reference_contracts)
                logger.info(f"Added {len(reference_contracts)} contracts from reference file")
        
        # Create lookup dictionary
        contracts_lookup = {
            contract['address'].lower(): contract 
            for contract in all_contracts
        }
        
        for ref_address in self.reference_contracts.keys():
            ref_contract = contracts_lookup.get(ref_address.lower())
            
            if not ref_contract:
                logger.warning(f"Reference contract {ref_address} not found in data")
                continue
            
            bytecode = ref_contract.get('runtime_bytecode') or ref_contract.get('bytecode')
            if not bytecode or bytecode == '0x':
                logger.warning(f"Reference contract {ref_address} has no bytecode")
                continue
            
            try:
                # Use the pipeline's normalization and fingerprinting
                opcodes = get_opcode_sequence(bytecode)
                if not opcodes:
                    logger.warning(f"Could not parse opcodes for {ref_address}")
                    continue
                
                fingerprint = generate_fingerprint(ref_address, opcodes)
                self.reference_fingerprints[ref_address] = fingerprint
                
                logger.info(f"Loaded fingerprint for {ref_address} ({self.reference_contracts[ref_address]['name']})")
                logger.info(f"  Opcode count: {fingerprint.opcode_count}")
                
            except Exception as e:
                logger.error(f"Error processing reference {ref_address}: {e}")
                continue
        
        if not self.reference_fingerprints:
            logger.error("No reference fingerprints loaded. Cannot proceed.")
            return False
        
        logger.info(f"Loaded {len(self.reference_fingerprints)} reference fingerprints")
        return True
    
    def analyze_contract(self, contract: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Analyze a single contract for similarity to reference tokens"""
        address = contract.get('address')
        if not address:
            return None
        
        bytecode = contract.get('runtime_bytecode') or contract.get('bytecode')
        if not bytecode or bytecode == '0x':
            return None
        
        try:
            # Generate fingerprint for this contract
            opcodes = get_opcode_sequence(bytecode)
            if not opcodes:
                return None
            
            contract_fp = generate_fingerprint(address, opcodes)
            
            # Compare to all reference contracts
            best_match = None
            best_score = 0.0
            similarities = {}
            
            for ref_address, ref_fp in self.reference_fingerprints.items():
                # Use the pipeline's similarity computation
                similarity_result = compute_similarity(contract_fp, ref_fp)
                score = similarity_result.similarity_score
                
                similarities[ref_address] = {
                    'overall': score,
                    'ngram': similarity_result.ngram_similarity,
                    'control_flow': similarity_result.control_flow_similarity,
                    'shape': similarity_result.shape_similarity,
                    'type': similarity_result.similarity_type,
                    'explanation': similarity_result.explanation
                }
                
                if score > best_score:
                    best_score = score
                    best_match = ref_address
            
            # Only include if similarity is above threshold
            if best_score < THRESHOLD_WEAK:
                return None
            
            # Extract metadata from contract
            result = {
                'address': address,
                'block_number': contract.get('block_number') or contract.get('deployment_block'),
                'timestamp': contract.get('deployment_timestamp') or contract.get('timestamp'),
                'creator': contract.get('creator') or contract.get('deployer_address'),
                'transaction_hash': contract.get('transaction_hash') or contract.get('deployment_tx_hash'),
                'confidence_score': int(best_score * 100),
                'best_match': best_match,
                'best_similarity': best_score,
                'similarity_type': similarities[best_match]['type'] if best_match else None,
                'name': contract.get('name') or contract.get('Name'),
                'symbol': contract.get('symbol') or contract.get('Symbol'),
                'decimals': contract.get('decimals') or contract.get('Decimals'),
                'potential_token': contract.get('potential_token') or contract.get('Potential Token'),
                'similarities': similarities
            }
            
            return result
            
        except Exception as e:
            logger.debug(f"Error analyzing contract {address}: {e}")
            return None
    
    def analyze_all_contracts(self):
        """Analyze all contracts for similarity to reference tokens"""
        logger.info("Starting similarity-based token analysis...")
        
        total = len(self.contracts_data)
        results = []
        
        for i, contract in enumerate(self.contracts_data):
            if (i + 1) % 1000 == 0:
                logger.info(f"Processed {i + 1}/{total} contracts... ({len(results)} matches found)")
            
            result = self.analyze_contract(contract)
            if result:
                results.append(result)
        
        self.token_results = results
        logger.info(f"Analysis complete. Found {len(self.token_results)} similar contracts")
    
    def save_results(self, output_dir: str = "data_files"):
        """Save results to JSON and CSV files"""
        timestamp = int(time.time())
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save JSON results (optional)
        json_file = None
        if not self.skip_json:
            json_file = output_path / f'token_detection_results_{timestamp}.json'
            results_data = {
                'analysis_timestamp': timestamp,
                'total_contracts_analyzed': len(self.contracts_data),
                'similar_contracts_found': len(self.token_results),
                'analysis_type': 'similarity_based',
                'reference_contracts': self.reference_contracts,
                'threshold_used': THRESHOLD_WEAK,
                'results': self.token_results
            }
            
            with open(json_file, 'w') as f:
                json.dump(results_data, f, indent=2)
            
            logger.info(f"Saved JSON results to: {json_file}")
        
        # Save CSV results
        csv_file = output_path / f'token_detection_results_{timestamp}.csv'
        if self.token_results:
            fieldnames = [
                'address', 'block_number', 'timestamp', 'creator', 'transaction_hash',
                'confidence_score', 'best_match', 'best_similarity', 'similarity_type',
                'name', 'symbol', 'decimals', 'potential_token'
            ]
            
            with open(csv_file, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for result in self.token_results:
                    csv_row = {
                        'address': result['address'],
                        'block_number': result.get('block_number'),
                        'timestamp': result.get('timestamp'),
                        'creator': result.get('creator'),
                        'transaction_hash': result.get('transaction_hash'),
                        'confidence_score': result['confidence_score'],
                        'best_match': result['best_match'],
                        'best_similarity': result['best_similarity'],
                        'similarity_type': result.get('similarity_type'),
                        'name': result.get('name'),
                        'symbol': result.get('symbol'),
                        'decimals': result.get('decimals'),
                        'potential_token': result.get('potential_token')
                    }
                    writer.writerow(csv_row)
            
            logger.info(f"Saved CSV results to: {csv_file}")
        
        return json_file, csv_file
    
    def generate_summary(self):
        """Generate analysis summary"""
        if not self.token_results:
            logger.info("No similar contracts found")
            return
        
        # Sort by confidence score
        sorted_results = sorted(self.token_results, key=lambda x: x['confidence_score'], reverse=True)
        
        # Categorize by similarity
        high_similarity = [r for r in sorted_results if r['confidence_score'] >= 70]
        medium_similarity = [r for r in sorted_results if 40 <= r['confidence_score'] < 70]
        low_similarity = [r for r in sorted_results if r['confidence_score'] < 40]
        
        logger.info(f"\n=== TOKEN DETECTION SUMMARY ===")
        logger.info(f"Total contracts analyzed: {len(self.contracts_data)}")
        logger.info(f"Similar contracts found: {len(self.token_results)}")
        logger.info(f"High similarity (≥70): {len(high_similarity)}")
        logger.info(f"Medium similarity (40-69): {len(medium_similarity)}")
        logger.info(f"Low similarity (<40): {len(low_similarity)}")
        
        # Reference contract usage
        ref_usage = Counter(r['best_match'] for r in self.token_results if r['best_match'])
        logger.info(f"\n=== REFERENCE CONTRACT USAGE ===")
        for ref_addr, count in ref_usage.most_common():
            ref_name = self.reference_contracts.get(ref_addr, {}).get('name', 'Unknown')
            logger.info(f"{ref_name} ({ref_addr[:10]}...): {count} similar contracts")
        
        if high_similarity:
            logger.info(f"\n=== TOP 10 HIGH SIMILARITY CONTRACTS ===")
            for i, contract in enumerate(high_similarity[:10]):
                ref_name = self.reference_contracts.get(contract['best_match'], {}).get('name', 'Unknown') if contract['best_match'] else 'Unknown'
                logger.info(f"{i+1}. {contract['address']} - Score: {contract['confidence_score']}% - Similar to: {ref_name}")
                if contract.get('name'):
                    logger.info(f"   Name: {contract['name']}")
    
    def run(self, input_file: str, output_dir: str = "data_files", reference_file: Optional[str] = None):
        """Run the complete token detection analysis
        
        Args:
            input_file: Path to contracts JSON file to analyze
            output_dir: Directory for output files
            reference_file: Optional path to file containing reference contracts
        """
        logger.info("Starting Similarity-Based Token Detector...")
        
        # Load contracts
        if not self.load_contracts(input_file):
            logger.error("Failed to load contracts. Exiting.")
            return
        
        # Load reference fingerprints
        if not self.load_reference_fingerprints(reference_file):
            logger.error("Failed to load reference fingerprints. Exiting.")
            return
        
        # Analyze contracts
        self.analyze_all_contracts()
        
        # Save results
        json_file, csv_file = self.save_results(output_dir)
        
        # Generate summary
        self.generate_summary()
        
        logger.info(f"\nToken detection complete!")
        logger.info(f"Results saved to: {csv_file}")
        if json_file:
            logger.info(f"JSON results saved to: {json_file}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Similarity-Based Token Detector for 2016-2018 Contracts',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example:
    python token_detector.py -i converted_2016to2018_contracts.json -r converted_2015_contracts.json
        """
    )
    
    parser.add_argument(
        '--input', '-i',
        required=True,
        help='Path to converted contracts JSON file'
    )
    
    parser.add_argument(
        '--output', '-o',
        default='data_files',
        help='Output directory for results (default: data_files)'
    )
    
    parser.add_argument(
        '--fast',
        action='store_true',
        help='Enable fast mode (currently unused, kept for compatibility)'
    )
    
    parser.add_argument(
        '--no-json',
        action='store_true',
        help='Skip JSON output for better performance'
    )
    
    parser.add_argument(
        '--reference-file', '-r',
        help='Path to file containing reference contracts (e.g., 2015 contracts for reference tokens)'
    )
    
    args = parser.parse_args()
    
    detector = TokenDetector(fast_mode=args.fast, skip_json=args.no_json)
    detector.run(args.input, args.output, args.reference_file)


if __name__ == "__main__":
    main()
