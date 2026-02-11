#!/usr/bin/env bash
# ============================================================================
# collect-and-upload-monotype-fonts.sh
#
# Step 1: Collects all Monotype subscription fonts from ~/Library/Fonts
#         into ~/Desktop/FONTS/ organized by family name.
# Step 2: Uploads the collected fonts to S3 (trr-backend bucket, fonts/ prefix)
#         using the existing upload-fonts-to-s3.py script.
#
# Usage:
#   ./scripts/collect-and-upload-monotype-fonts.sh              # collect + upload
#   ./scripts/collect-and-upload-monotype-fonts.sh --collect     # collect only
#   ./scripts/collect-and-upload-monotype-fonts.sh --upload      # upload only
#   ./scripts/collect-and-upload-monotype-fonts.sh --dry-run     # upload dry-run
# ============================================================================

set -uo pipefail

FONT_SOURCE="$HOME/Library/Fonts"
DEST_BASE="$HOME/Desktop/FONTS"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UPLOAD_SCRIPT="$SCRIPT_DIR/upload-fonts-to-s3.py"
S3_BUCKET="trr-backend"

# Find a python3 that has boto3 installed
PYTHON3=""
for py in python3 python3.11 python3.12 python3.13 python3.14; do
  if command -v "$py" &>/dev/null && "$py" -c "import boto3" 2>/dev/null; then
    PYTHON3="$py"
    break
  fi
done

# Parse flags
DO_COLLECT=true
DO_UPLOAD=true
DRY_RUN=""

for arg in "$@"; do
  case "$arg" in
    --collect)  DO_UPLOAD=false ;;
    --upload)   DO_COLLECT=false ;;
    --dry-run)  DRY_RUN="--dry-run" ;;
  esac
done

# ============================================================================
# Collect a single font family
# Args: $1 = family display name (used as folder name)
#       $2 = grep -iE pattern to match filenames in ~/Library/Fonts
#       $3 = (optional) exclusion grep -ivE pattern
# ============================================================================
copy_family() {
  local family_dir="$1"
  local pattern="$2"
  local exclude="${3:-}"
  local dest_dir="$DEST_BASE/$family_dir"

  # Find matching font files
  local matches
  if [ -n "$exclude" ]; then
    matches=$(ls "$FONT_SOURCE" 2>/dev/null \
      | grep -iE "$pattern" \
      | grep -iE '\.(otf|ttf|woff2?)$' \
      | grep -ivE "$exclude" \
      || true)
  else
    matches=$(ls "$FONT_SOURCE" 2>/dev/null \
      | grep -iE "$pattern" \
      | grep -iE '\.(otf|ttf|woff2?)$' \
      || true)
  fi

  if [ -z "$matches" ]; then
    echo "  ⚠  $family_dir — not installed in ~/Library/Fonts"
    return 0
  fi

  mkdir -p "$dest_dir"
  local copied=0

  while IFS= read -r file; do
    local src="$FONT_SOURCE/$file"
    local dst="$dest_dir/$file"
    if [ ! -f "$dst" ]; then
      cp "$src" "$dst"
      ((copied++))
    fi
  done <<< "$matches"

  local total
  total=$(ls "$dest_dir" 2>/dev/null | wc -l | tr -d ' ')
  echo "  ✓  $family_dir — $total files${copied:+ ($copied new)}"
}

# ============================================================================
# STEP 1: Collect fonts from ~/Library/Fonts into ~/Desktop/FONTS
# ============================================================================
collect_fonts() {
  echo "============================================="
  echo "  STEP 1: Collecting fonts → $DEST_BASE"
  echo "============================================="
  echo ""

  # ------- Already on CDN (will be skipped by upload) -------
  echo "  — Already on CDN (verifying) —"
  copy_family "Hamburg Serial"       "^HamburgSerial"
  copy_family "Plymouth Serial"      "^PlymouthSerial"
  copy_family "Rude Slab Condensed"  "^RudeSlab"
  copy_family "Gloucester"           "^Gloucester"
  copy_family "Goodall"              "^Goodall"
  echo ""

  # ------- Not yet on CDN — need uploading -------
  echo "  — Need CDN upload —"
  copy_family "Bernhard Modern"         "^Bernhard"
  copy_family "Beton"                   "^Beton"
  copy_family "Biotif Pro"              "^Biotif"
  # Cheltenham (Bitstream) = non-Std, non-Old files
  copy_family "Cheltenham"              "^(Cheltenham|cheltenham-bt)" "CheltenhamStd|CheltenhamOld"
  copy_family "Cheltenham Old Style Pro" "^CheltenhamOld"
  # Franklin Gothic (ITC) — exclude NYT/Tee variants and Raw
  copy_family "Franklin Gothic"         "^Franklin" "FranklinGothicRaw|NYTFranklin|TeeFranklin"
  copy_family "Franklin Gothic Raw"     "^FranklinGothicRaw"
  copy_family "Futura Now"              "^(futura-|FuturaNow|futurabold)"
  copy_family "Geometric Slabserif 703" "^(geometric-slabserif-703|Geometric.Slabserif.703)"
  copy_family "Geometric Slabserif 712" "^(geometric-slabserif-712|Geometric.Slabserif.712)"
  # ITC Cheltenham = CheltenhamStd files
  copy_family "ITC Cheltenham"          "^CheltenhamStd"
  copy_family "ITC Franklin Gothic LT"  "^ITCFranklinGothic"
  copy_family "Magnus"                  "^Magnus"
  copy_family "Malden Sans"             "^Malden"
  # News Gothic (ParaType) = NewsGothicStd and newsgott/newsgotno (exclude No.2/No2)
  copy_family "News Gothic"             "^(NewsGothicStd|newsgott|news-got)" "No.?2"
  # News Gothic No. 2 = files with No2 or No.2
  copy_family "News Gothic No. 2"       "^(News.Gothic.No|newsgotno2)"
  copy_family "Newspaper Publisher JNL"  "^Newspaper"
  copy_family "Newston"                 "^Newston"
  copy_family "Rockwell"                "^(Rockwell|rockwell)" "RockwellNova"
  copy_family "Rockwell Nova"           "^RockwellNova"
  copy_family "Sofia Pro"               "^Sofia"
  copy_family "Stafford Serial"         "^Stafford"
  # Stymie — exclude "Extra Bold" variant
  copy_family "Stymie"                  "^Stymie" "Extra.Bold"
  copy_family "Stymie Extra Bold"       "^Stymie.Extra.Bold"
  copy_family "Velino Compressed Text"  "^Velino"
  copy_family "Winner Sans"             "^Winner"
  echo ""

  # Summary
  echo "  Collection complete. Contents of $DEST_BASE:"
  echo ""
  local grand_total=0
  for dir in "$DEST_BASE"/*/; do
    if [ -d "$dir" ]; then
      local name
      name=$(basename "$dir")
      local count
      count=$(ls "$dir" 2>/dev/null | wc -l | tr -d ' ')
      printf "    %-35s %3s files\n" "$name" "$count"
      ((grand_total += count))
    fi
  done
  echo ""
  echo "  Total: $grand_total font files across $(ls -d "$DEST_BASE"/*/ 2>/dev/null | wc -l | tr -d ' ') families"
  echo ""
}

# ============================================================================
# STEP 2: Upload to S3
# ============================================================================
upload_fonts() {
  echo "============================================="
  echo "  STEP 2: Uploading to S3 ($S3_BUCKET)"
  echo "============================================="
  echo ""

  if [ ! -f "$UPLOAD_SCRIPT" ]; then
    echo "ERROR: Upload script not found: $UPLOAD_SCRIPT"
    echo "Make sure you're running from the TRR-APP repo root."
    exit 1
  fi

  # Check for boto3
  if [ -z "$PYTHON3" ]; then
    echo "ERROR: No python3 with boto3 found. Run: pip3 install boto3"
    echo "  Checked: python3, python3.11, python3.12, python3.13, python3.14"
    exit 1
  fi
  echo "  Using: $(command -v $PYTHON3) ($($PYTHON3 --version 2>&1))"
  echo ""

  # Check AWS credentials
  if ! aws sts get-caller-identity &>/dev/null; then
    echo "ERROR: AWS credentials not configured."
    echo "Run: aws configure  (or set AWS_PROFILE=trr)"
    exit 1
  fi

  $PYTHON3 "$UPLOAD_SCRIPT" \
    --source "$DEST_BASE" \
    --bucket "$S3_BUCKET" \
    --prefix "fonts/monotype" \
    $DRY_RUN
}

# ============================================================================
# Main
# ============================================================================
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Monotype Font Collector & CDN Uploader      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Source:  $FONT_SOURCE"
echo "  Staging: $DEST_BASE"
echo "  Bucket:  s3://$S3_BUCKET/fonts/monotype/"
echo "  CDN:     https://d1fmdyqfafwim3.cloudfront.net/fonts/monotype/"
echo ""

if $DO_COLLECT; then
  collect_fonts
fi

if $DO_UPLOAD; then
  upload_fonts
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  TODO — Fonts not found locally:"
echo ""
echo "  Open the Monotype Fonts app and activate these families,"
echo "  then re-run this script with --collect:"
echo ""
echo "    1. Open Monotype Fonts app (or https://www.monotype.com/fonts)"
echo "    2. Search for & activate each missing family (⚠ above)"
echo "    3. Font files will appear in ~/Library/Fonts/"
echo "    4. Re-run: ./scripts/collect-and-upload-monotype-fonts.sh --collect"
echo "    5. Then:   ./scripts/collect-and-upload-monotype-fonts.sh --dry-run"
echo "    6. Then:   ./scripts/collect-and-upload-monotype-fonts.sh --upload"
echo ""
echo "  After all fonts are uploaded, run the @font-face generator:"
echo "    node scripts/generate-cdn-font-faces.js"
echo "    (or manually add @font-face blocks to cdn-fonts.css)"
echo ""
