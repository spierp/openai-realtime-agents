
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create directory if it doesn't exist
const chromaDir = path.join(process.cwd(), 'chroma-db');
if (!fs.existsSync(chromaDir)) {
  fs.mkdirSync(chromaDir, { recursive: true });
  console.log(`Created ChromaDB directory at ${chromaDir}`);
}

console.log(`Starting ChromaDB server with data directory: ${chromaDir}`);

// Run the ChromaDB server using the correct approach for the JS SDK
const server = spawn('npx', ['chromadb'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    PERSIST_DIRECTORY: chromaDir,
    CHROMA_SERVER_HTTP_PORT: '8000',
    CHROMA_SERVER_HOST: '0.0.0.0',
    CHROMA_SERVER_CORS_ALLOW_ORIGINS: '*'
  }
});

server.on('error', (err) => {
  console.error('Failed to start ChromaDB server:', err);
});

// Handle clean exit
process.on('SIGINT', () => {
  console.log('Stopping ChromaDB server...');
  server.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Stopping ChromaDB server...');
  server.kill();
  process.exit();
});
