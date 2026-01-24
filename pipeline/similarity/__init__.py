"""
Bytecode Similarity Pipeline for ethereumhistory.com

This module provides deterministic, explainable bytecode similarity analysis
for historical Ethereum contracts (2015-2017 era).

Design Principles:
- Offline batch computation (NOT real-time)
- No black-box ML or embeddings
- Human-explainable scoring
- CPU-only, memory-efficient
- Deterministic output

Pipeline Steps:
1. normalize.py  - Parse bytecode, strip PUSH values, produce opcode sequence
2. fingerprint.py - Generate n-grams, control-flow signals, shape metrics
3. similarity.py - Compute pairwise similarity with weighted scoring
4. export.py     - Output to PostgreSQL-importable format
"""

__version__ = "0.1.0"
