#!/bin/bash

# Set variables
SERVER_IP="134.209.1.205"
SERVER_USER="root"
REMOTE_DIR="/root/openai-realtime-agents"
LOCAL_ENV=".env.production"
REMOTE_ENV=".env"

# Colors for better readability
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploying to DigitalOcean (${SERVER_IP})...${NC}"

# Check if production env file exists
if [ ! -f "$LOCAL_ENV" ]; then
  echo -e "${RED}❌ Production environment file $LOCAL_ENV not found!${NC}"
  echo -e "Please create it using .env.example as a template."
  exit 1
fi

# Check connection to server
echo -e "${BLUE}🔍 Checking connection to server...${NC}"
ssh -q ${SERVER_USER}@${SERVER_IP} exit
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Cannot connect to server! Please check SSH setup.${NC}"
  exit 1
fi

# Create remote directory if it doesn't exist
echo -e "${BLUE}📁 Ensuring remote directory exists...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_DIR}"

# Copy configuration files
echo -e "${BLUE}📄 Copying environment file...${NC}"
scp ${LOCAL_ENV} ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/${REMOTE_ENV}

# Sync code changes (excluding development/build files)
echo -e "${BLUE}🔄 Syncing code changes...${NC}"
rsync -avz --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.env*' \
  --exclude 'logs' \
  --exclude 'chroma-db' \
  ./ ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/

# Deploy on server
echo -e "${BLUE}🐳 Building and starting Docker containers...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "cd ${REMOTE_DIR} && \
  docker compose down && \
  export \$(grep -v '^#' .env | xargs) && \
  docker compose build && \
  docker compose up -d"

# Check deployment status
echo -e "${BLUE}🔍 Checking deployment status...${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "cd ${REMOTE_DIR} && docker compose ps"

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Application available at:${NC}"
echo -e "   ${BLUE}http://${SERVER_IP}:3000${NC} (Next.js frontend)"
echo -e "   ${BLUE}http://${SERVER_IP}:8000${NC} (ChromaDB API)" 