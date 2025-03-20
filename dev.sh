#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting development environment...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${BLUE}⚠️ .env file not found. Creating from .env.example...${NC}"
  cp .env.example .env
  echo -e "${BLUE}⚠️ Please update the .env file with your API keys and settings.${NC}"
  exit 1
fi

# Export environment variables from .env file
echo -e "${BLUE}🔐 Loading environment variables...${NC}"
export $(grep -v '^#' .env | xargs)

# Create logs directory if it doesn't exist
mkdir -p logs

# Start ChromaDB in background
echo -e "${BLUE}📊 Starting ChromaDB server...${NC}"

# Explicitly unset Docker environment variables to ensure local mode
unset DOCKER_CHROMA_DATA_DIR

# Start ChromaDB server
python start-chroma-server.py &
CHROMA_PID=$!

# Wait for ChromaDB to start
echo -e "${BLUE}⏳ Waiting for ChromaDB to start...${NC}"
sleep 3

# Start Next.js dev server
echo -e "${BLUE}🌐 Starting Next.js development server...${NC}"
echo -e "${GREEN}✅ Development environment ready!${NC}"
echo -e "   ${BLUE}http://localhost:3000${NC} (Next.js frontend)"
echo -e "   ${BLUE}http://localhost:8000${NC} (ChromaDB API)"
echo -e "${RED}Press Ctrl+C to stop both servers${NC}"

# Start Next.js
npm run dev

# When Next.js is stopped, also stop ChromaDB
echo -e "${BLUE}🛑 Stopping ChromaDB server...${NC}"
kill $CHROMA_PID

echo -e "${GREEN}👋 Development environment stopped${NC}" 