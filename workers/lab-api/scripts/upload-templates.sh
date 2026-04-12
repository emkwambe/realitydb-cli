#!/usr/bin/env bash
# upload-templates.sh — Generate SQL from a RealityDB pack and upload to R2
#
# Usage:
#   ./upload-templates.sh <pack-path> <template-name> [row-counts...]
#
# Example:
#   ./upload-templates.sh "C:\Users\HP\Documents\realityDB Packs\Banking\realitydb-studio-pack.json" banking 5000 10000 50000 100000
#
# Requirements:
#   - Node.js with CLI built at apps/cli/dist/index.js
#   - wrangler authenticated with Cloudflare

set -euo pipefail

PACK_PATH="${1:?Usage: $0 <pack-path> <template-name> [row-counts...]}"
TEMPLATE_NAME="${2:?Usage: $0 <pack-path> <template-name> [row-counts...]}"
shift 2

ROW_COUNTS=("${@:-5000 10000 50000 100000}")
if [ ${#ROW_COUNTS[@]} -eq 0 ]; then
  ROW_COUNTS=(5000 10000 50000 100000)
fi

# Resolve CLI path relative to this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI_PATH="${SCRIPT_DIR}/../../../apps/cli/dist/index.js"
TEMP_DIR=$(mktemp -d)
R2_BUCKET="realitydb-templates"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  RealityDB Template Upload"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Pack: ${PACK_PATH}"
echo "  Template: ${TEMPLATE_NAME}"
echo "  Row counts: ${ROW_COUNTS[*]}"
echo "  R2 bucket: ${R2_BUCKET}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for ROWS in "${ROW_COUNTS[@]}"; do
  # Format: 5000 → 5k, 100000 → 100k
  if [ "$ROWS" -ge 1000000 ]; then
    SUFFIX="$((ROWS / 1000000))m"
  elif [ "$ROWS" -ge 1000 ]; then
    SUFFIX="$((ROWS / 1000))k"
  else
    SUFFIX="${ROWS}"
  fi

  FILENAME="${TEMPLATE_NAME}-${SUFFIX}.sql"
  OUTPUT_PATH="${TEMP_DIR}/${FILENAME}"
  R2_KEY="templates/${FILENAME}"

  echo "📊 Generating ${TEMPLATE_NAME} at ${ROWS} rows..."
  node "${CLI_PATH}" run \
    --pack "${PACK_PATH}" \
    --rows "${ROWS}" \
    --format sql \
    --drop-tables \
    --seed 42 \
    -o "${OUTPUT_PATH}"

  echo "☁️  Uploading to R2: ${R2_KEY}"
  npx wrangler r2 object put "${R2_BUCKET}/${R2_KEY}" \
    --file "${OUTPUT_PATH}" \
    --remote

  echo "✅ ${FILENAME} uploaded ($(du -h "${OUTPUT_PATH}" | cut -f1))"
  echo ""
done

# Cleanup
rm -rf "${TEMP_DIR}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ All templates uploaded to R2"
echo "  Verify: npx wrangler r2 object list ${R2_BUCKET} --prefix templates/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
