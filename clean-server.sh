#!/bin/bash

# Set variables
SERVER_IP="134.209.1.205"
SERVER_USER="root"
REMOTE_DIR="/root/openai-realtime-agents"

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧹 Cleaning up server before deployment...${NC}"

# Check connection to server
echo -e "${BLUE}🔍 Checking connection to server...${NC}"
ssh -q ${SERVER_USER}@${SERVER_IP} exit
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Cannot connect to server! Please check SSH setup.${NC}"
  exit 1
fi

# Stop and remove Docker containers
echo -e "${BLUE}🐳 Stopping and removing Docker containers...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "cd ${REMOTE_DIR} && docker compose down"

# Remove all build files and caches
echo -e "${BLUE}🗑️ Removing build files and caches...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "cd ${REMOTE_DIR} && \
  rm -rf .next node_modules src/app/login/debug.tsx src/app/api/debug* && \
  mkdir -p src/app/login"

echo -e "${GREEN}✅ Server cleanup complete!${NC}"
echo -e "${GREEN}👉 Now run ./deploy-to-do.sh to deploy a fresh build.${NC}" 