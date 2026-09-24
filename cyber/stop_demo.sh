#!/bin/bash
echo "Stopping CrimeCast v3.0 demo services..."
pkill -f "crimecast.asgi" 2>/dev/null || true
pkill -f "manage.py runserver" 2>/dev/null || true
pkill -f "daphne" 2>/dev/null || true
pkill -f "celery" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run preview" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
echo "✓ All CrimeCast services stopped cleanly."
