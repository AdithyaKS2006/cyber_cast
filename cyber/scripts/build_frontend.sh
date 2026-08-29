#!/bin/bash
set -e

# Build Frontend — Minify JS, Minify CSS, Collect Static Files
# Usage: bash scripts/build_frontend.sh

echo "=== Building frontend assets ==="

# Ensure node_modules are available
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dev dependencies..."
    npm install --save-dev uglify-js clean-css-cli 2>/dev/null || true
fi

# Minify JS files
echo "Minifying JavaScript..."
if command -v npx &> /dev/null && [ -f "package.json" ]; then
    npx uglify-js frontend/static/js/*.js \
        -o frontend/static/js/bundle.min.js \
        --compress --mangle 2>/dev/null || echo "Warning: JS minification skipped"
fi

# Minify CSS files
echo "Minifying CSS..."
if command -v npx &> /dev/null && [ -f "package.json" ]; then
    npx clean-css-cli frontend/static/css/*.css \
        -o frontend/static/css/bundle.min.css 2>/dev/null || echo "Warning: CSS minification skipped"
fi

# Collect static files for production
echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "=== Frontend build complete ==="
