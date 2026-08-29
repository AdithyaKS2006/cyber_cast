#!/bin/bash
echo "Stopping CrimeCast demo..."
pkill -f "daphne" 2>/dev/null || true
pkill -f "celery" 2>/dev/null || true
redis-cli shutdown 2>/dev/null || true
pkill -f "npm run preview" 2>/dev/null || true
echo "All services stopped."
