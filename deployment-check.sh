#!/bin/bash

echo "=== DEPLOYMENT HEALTH CHECK ==="
echo ""

echo "1. BUILD OUTPUT CHECK:"
npm run build 2>&1 | grep -i "error\|warning\|fail" || echo "✓ No errors or warnings"
echo ""

echo "2. ENVIRONMENT VARIABLES CHECK:"
echo "Required vars in .env:"
grep "^[A-Z_]" .env | cut -d= -f1 | sort
echo ""

echo "3. DEPENDENCIES CHECK:"
npm ls 2>&1 | grep -i "unmet\|missing" || echo "✓ All dependencies satisfied"
echo ""

echo "4. PACKAGE.JSON SCRIPTS:"
grep -A 5 '"scripts"' package.json
echo ""

echo "5. TYPESCRIPT CONFIG:"
cat tsconfig.json | head -20
echo ""

echo "6. NEXT.JS CONFIG:"
cat next.config.js
echo ""

echo "7. CRITICAL FILES PRESENT:"
test -f src/app/layout.tsx && echo "✓ src/app/layout.tsx" || echo "✗ MISSING: src/app/layout.tsx"
test -f src/app/page.tsx && echo "✓ src/app/page.tsx" || echo "✗ MISSING: src/app/page.tsx"
test -f package.json && echo "✓ package.json" || echo "✗ MISSING: package.json"
test -f next.config.js && echo "✓ next.config.js" || echo "✗ MISSING: next.config.js"
test -f tsconfig.json && echo "✓ tsconfig.json" || echo "✗ MISSING: tsconfig.json"
