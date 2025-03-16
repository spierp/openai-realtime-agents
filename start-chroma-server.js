
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

// Run the ChromaDB server using npx
const server = spawn('npx', ['chromadb-server', '--path', chromaDir, '--host', '0.0.0.0', '--port', '8000'], {
  stdio: 'inherit',
  shell: true
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
