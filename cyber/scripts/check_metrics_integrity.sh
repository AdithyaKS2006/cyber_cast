#!/bin/bash
# CrimeCast Audit Guard: Verify no fabricated accuracy metrics exist in codebase

echo "🔍 Running CrimeCast Audit Integrity Check..."

# Forbidden hardcoded patterns that represent past fabricated accuracy metrics
FORBIDDEN_PATTERNS="(93\.85%|94\.8%|93\.75%|83\.7%|95% cash-out probability|trend=\{[-+]?[0-9]+\}|sub=[\"']?[-+]?[0-9]+%?[\"']?)"

FOUND=$(grep -E -rn "$FORBIDDEN_PATTERNS" src/ apps/ 2>/dev/null)

if [ -n "$FOUND" ]; then
    echo "❌ AUDIT FAILURE: Found hardcoded accuracy metric literals in source code:"
    echo "$FOUND"
    echo "Please replace hardcoded percentages with live metrics fetched from model_metrics.json via API."
    exit 1
else
    echo "✅ AUDIT PASSED: Zero fabricated accuracy metrics detected in source code."
    exit 0
fi
