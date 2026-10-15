#!/usr/bin/env bash
set -e

echo "=== Installing Python dependencies ==="
pip install -r backend/requirements.txt

echo "=== Installing Node dependencies and building React frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== Build complete ==="
