#!/usr/bin/env bash
# shard-discovery-2018.sh
#
# Splits the 2018 block range across N Alchemy keys and launches one
# discover-contracts-2018.ts process per key in the background.
# Each shard writes to its own T7 subdirectory and can be interrupted/resumed
# independently. Merge with: npx tsx scripts/merge-shards-2018.ts
#
# USAGE:
#   ./scripts/shard-discovery-2018.sh KEY1 KEY2 KEY3 ...
#
# EXAMPLE (10 keys):
#   ./scripts/shard-discovery-2018.sh \
#     aBcDeFg1... hIjKlMn2... oOpQrSt3... ...
#
# LOGS: /tmp/eh-shard-N.log  (tail -f to watch)
# PIDS: /tmp/eh-shard-pids.txt  (kill all: cat /tmp/eh-shard-pids.txt | xargs kill)

set -euo pipefail

TOTAL_START=4850000
TOTAL_END=6988614
TOTAL_BLOCKS=$((TOTAL_END - TOTAL_START + 1))

KEYS=("$@")
N=${#KEYS[@]}

if [[ $N -eq 0 ]]; then
  echo "Usage: $0 KEY1 KEY2 KEY3 ..."
  echo "Pass one Alchemy API key per shard (e.g. 10 keys = 10x speed)"
  exit 1
fi

BLOCKS_PER_SHARD=$(( (TOTAL_BLOCKS + N - 1) / N ))

echo "=== EH 2018 Sharded Discovery ==="
echo "Total block range: $TOTAL_START → $TOTAL_END ($TOTAL_BLOCKS blocks)"
echo "Shards: $N"
echo "Blocks per shard: ~$BLOCKS_PER_SHARD"
echo "Estimated time: ~$(( TOTAL_BLOCKS / N / 1 / 3600 + 1 )) hours (1 block/sec per shard)"
echo ""

> /tmp/eh-shard-pids.txt  # reset PID file

for i in "${!KEYS[@]}"; do
  KEY="${KEYS[$i]}"
  SHARD_START=$(( TOTAL_START + i * BLOCKS_PER_SHARD ))
  SHARD_END=$(( SHARD_START + BLOCKS_PER_SHARD - 1 ))
  # Clamp last shard to actual end
  [[ $SHARD_END -gt $TOTAL_END ]] && SHARD_END=$TOTAL_END
  SHARD_DIR="shard-$(printf '%02d' $i)"
  LOG="/tmp/eh-shard-${i}.log"

  echo "Shard $i: blocks $SHARD_START → $SHARD_END  key=...${KEY: -6}  log=$LOG"

  npx tsx scripts/discover-contracts-2018.ts \
    --alchemy-key "$KEY" \
    --shard-dir "$SHARD_DIR" \
    --start-block "$SHARD_START" \
    --end-block "$SHARD_END" \
    > "$LOG" 2>&1 &

  PID=$!
  echo $PID >> /tmp/eh-shard-pids.txt
  echo "  → PID $PID"

  # Stagger starts by 2s to avoid simultaneous burst from multiple keys on same account
  sleep 2
done

echo ""
echo "All shards launched."
echo ""
echo "Monitor:"
echo "  tail -f /tmp/eh-shard-*.log"
echo "  cat /tmp/eh-shard-pids.txt   # running PIDs"
echo ""
echo "Stop all:"
echo "  cat /tmp/eh-shard-pids.txt | xargs kill"
echo ""
echo "After all shards complete:"
echo "  npx tsx scripts/merge-shards-2018.ts"
