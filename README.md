# ethereumhistory.com

A historical archive and analysis tool for Ethereum smart contracts, with a focus on the 2015-2017 era when standards were still forming.

**This is not a trading site, block explorer, or dashboard.** It is a long-term preservation effort — part museum, part research terminal, part Wikipedia for Ethereum's earliest code.

## Philosophy

- **Accuracy over Speed**: Every claim is backed by evidence or clearly marked as heuristic
- **Transparency**: Similarity algorithms are deterministic and explainable. No black boxes.
- **Preservation**: Ethereum's early contracts deserve to be preserved and understood

## Features

### Contract Analysis
- Bytecode parsing and opcode analysis
- Pattern detection (heuristic, clearly labeled)
- Function signature identification
- Historical context and narratives

### Bytecode Similarity
- Deterministic, explainable similarity scoring
- Based on opcode n-grams, control flow, and shape metrics
- No ML embeddings or black boxes
- Precomputed offline (not real-time)

### Historical Context
- Ethereum era classification (Frontier, Homestead, DAO Fork, etc.)
- Editorial narratives for significant contracts
- Timeline visualization

## Tech Stack

### Frontend
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion

### Backend
- Next.js Route Handlers
- PostgreSQL (Neon/Supabase compatible)

### Analysis Pipeline
- Python 3.9+
- No ML dependencies
- Deterministic output

## Project Structure

```
ethereumhistory/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Homepage
│   │   ├── contract/
│   │   │   └── [address]/     # Contract detail page
│   │   └── api/               # API routes
│   ├── components/            # React components
│   ├── lib/                   # Utilities and DB queries
│   └── types/                 # TypeScript types
├── pipeline/
│   └── similarity/            # Python bytecode analysis
│       ├── normalize.py       # Bytecode normalization
│       ├── fingerprint.py     # Fingerprint generation
│       ├── similarity.py      # Similarity computation
│       ├── export.py          # Export to PostgreSQL
│       └── main.py            # CLI entry point
├── db/
│   └── schema.sql             # Database schema
├── seeds/
│   ├── sample_contracts.json  # Sample contract data
│   └── seed_database.sql      # Seed SQL
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL database

### Installation

1. **Clone and install dependencies**

```bash
cd ethereumhistory
npm install
```

2. **Set up environment variables**

```bash
cp .env.example .env.local
# Edit .env.local with your database URL
```

By default, if `POSTGRES_URL` is set the app will **only** use Postgres (and will not parse the large `data/*.json` files).
If you explicitly want JSON fallback even when Postgres is configured, set:

```bash
ALLOW_JSON_FALLBACK=1
```

3. **Start PostgreSQL (recommended: Docker)**

```bash
docker compose up -d
```

The Docker database listens on **localhost port 5433** (so it won’t conflict with an existing local Postgres on 5432).

This will create a local database and run:

- `db/schema.sql`

4. **Import the full dataset into PostgreSQL**

```bash
npm run db:import
```

If you need to re-run init scripts:

```bash
docker compose down -v
docker compose up -d
```

5. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Bytecode Similarity Pipeline

The similarity pipeline runs offline to precompute relationships between contracts.

### Setup

```bash
cd pipeline
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Running the Pipeline

**From JSON file:**
```bash
python -m similarity.main --input ../seeds/sample_contracts.json --output ./results
```

**From database:**
```bash
export POSTGRES_URL="postgresql://..."
python -m similarity.main --from-db --output ./results
```

**Custom thresholds:**
```bash
python -m similarity.main --input contracts.json --threshold 0.7 --max-matches 5 --output ./results
```

### Output Files

- `bytecode_analysis.csv` - Fingerprints for each contract
- `contract_similarity.csv` - Pairwise similarities
- `contract_similarity.jsonl` - JSON Lines format
- `contract_similarity.sql` - SQL INSERT statements

### Import to Database

```bash
psql "$POSTGRES_URL" -f results/contract_similarity.sql
```

Or use COPY:
```sql
COPY contract_similarity FROM 'results/contract_similarity.csv' WITH (FORMAT csv, HEADER true);
```

## Similarity Algorithm

The similarity score is computed as:

```
similarity_score =
    0.70 * jaccard(opcode_ngrams)      # Primary: structural similarity
  + 0.20 * control_flow_similarity      # Secondary: behavioral similarity
  + 0.10 * shape_similarity             # Tertiary: size/complexity match
```

### Thresholds

- **Exact (≥0.95)**: Almost certainly the same source code
- **Structural (0.70-0.95)**: Likely derived from same template
- **Weak (0.60-0.70)**: Some structural similarity

### Why This Approach?

1. **Deterministic**: Same input always produces same output
2. **Explainable**: "These contracts share 87% of their opcode trigrams"
3. **Fast**: O(n²) comparison, but n-gram sets are small
4. **Robust**: Works even with different compiler versions or constants

## API Routes

### `GET /api/contract/[address]`

Returns full contract data including analysis and similar contracts.

### `GET /api/search?q=[address]`

Quick lookup for an address.

### `GET /api/featured`

Returns featured historical contracts for the homepage.

## Database Schema

Key tables:

- `contracts` - Core contract data
- `bytecode_analysis` - Parsed bytecode metrics
- `contract_similarity` - Precomputed similarities
- `detected_patterns` - Heuristic pattern detection
- `function_signatures` - Known function selectors
- `ethereum_eras` - Historical era definitions

## Contributing

### Adding Historical Context

The most valuable contribution is adding historical narratives to contracts. These require research and should be:

- Factual and sourced
- Neutral in tone
- Focused on technical and historical significance

### Improving Detection

Pattern detection heuristics can always be improved. All heuristics should:

- Be clearly labeled as heuristic
- Include confidence scores
- Not be presented as facts

## TODO

- [ ] Add more seed data from historical contracts
- [ ] Implement decompiler integration
- [ ] Add 4byte.directory lookup for function signatures
- [ ] Build admin interface for adding historical context
- [ ] Add API rate limiting
- [ ] Implement caching layer
- [ ] Add batch contract import from Etherscan
- [ ] Build similarity visualization (graph view)
- [ ] Add export functionality for researchers

## License

MIT

## Acknowledgments

- The Ethereum community for preserving early contract history
- Etherscan for historical data access
- The teams behind early Ethereum projects

---

*Ethereum has a history worth preserving.*
