#!/usr/bin/env bash
# Start the LogIQ frontend dev server (Vite on port 5173).
set -e
cd "$(dirname "$0")/../frontend"
npm run dev
