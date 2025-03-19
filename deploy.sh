#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment...${NC}"

# Make sure .env file exists
if [ ! -f .env ]; then
  echo -e "${BLUE}⚠️  .env file not found. Creating from .env.example...${NC}"
  cp .env.example .env
  echo -e "${BLUE}⚠️  Please update the .env file with your API keys and settings.${NC}"
  exit 1
fi

# Build and start Docker containers
echo -e "${GREEN}🔨 Building and starting containers...${NC}"
docker compose up -d --build

# Wait for services to start
echo -e "${GREEN}⏳ Waiting for services to start...${NC}"
sleep 5

# Check if services are running
echo -e "${GREEN}🔍 Checking service status...${NC}"
docker compose ps

# Print success message
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}📝 Next.js app is available at: http://localhost:3000${NC}"
echo -e "${BLUE}📚 ChromaDB server is available at: http://localhost:8000${NC}"

# Setup backup cron job if configured
if [ ! -z "$BACKUP_DIR" ]; then
  echo "📦 Setting up backup cron job..."
  mkdir -p $BACKUP_DIR
  
  # Create backup script
  cat > backup.sh << EOL
#!/bin/bash
TIMESTAMP=\$(date +%Y-%m-%d_%H-%M-%S)
docker compose exec -T chromadb tar -czf - -C /app/chroma-db . > $BACKUP_DIR/chroma-backup-\$TIMESTAMP.tar.gz
find $BACKUP_DIR -name "chroma-backup-*.tar.gz" -type f -mtime +${BACKUP_RETENTION_DAYS:-7} -delete
EOL
  
  chmod +x backup.sh
  
  # Add to crontab if not already there
  if ! crontab -l | grep -q "backup.sh"; then
    (crontab -l 2>/dev/null; echo "0 0 * * * $(pwd)/backup.sh") | crontab -
    echo "🕒 Daily backup scheduled at midnight"
  fi
fi 