#!/usr/bin/env bash
#
# copy-fonts.sh — stage the licensed Futura Condensed TTFs into public/.
#
# The Futura Condensed web license is unconfirmed, so these files are NOT
# committed (public repo == redistribution). They live in the gitignored
# directory public/fonts/futura/; globals.css @font-face loads them at runtime
# and falls back to Oswald (bundled via next/font/google) when they are absent.
#
# Idempotent: re-running overwrites the staged copies. Warns (non-fatal) when a
# source file is missing so a fresh clone without the brand kit still builds.

set -euo pipefail

# Repo root (site/) is the parent of this scripts/ directory.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

SRC_DIR="${REPO_ROOT}/../design dinners/Design Dinners Fonts"
DEST_DIR="${REPO_ROOT}/public/fonts/futura"

# Source filename -> staged (renamed) filename used by globals.css @font-face.
declare -a MAP=(
  "Futura-CondensedExtraBold-05.ttf:futura-condensed-extrabold.ttf"
  "Futura-CondensedMedium-04.ttf:futura-condensed-medium.ttf"
)

mkdir -p "${DEST_DIR}"

missing=0
for pair in "${MAP[@]}"; do
  src_name="${pair%%:*}"
  dest_name="${pair##*:}"
  src="${SRC_DIR}/${src_name}"
  dest="${DEST_DIR}/${dest_name}"

  if [[ -f "${src}" ]]; then
    cp -f "${src}" "${dest}"
    echo "copied: ${src_name} -> public/fonts/futura/${dest_name}"
  else
    echo "WARNING: source font not found, skipping: ${src}" >&2
    missing=1
  fi
done

if [[ "${missing}" -eq 1 ]]; then
  echo "One or more Futura sources were missing; headings will fall back to Oswald." >&2
fi

echo "Done. Staged fonts live in (gitignored) public/fonts/futura/."
