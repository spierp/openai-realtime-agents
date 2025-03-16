
// Simple script to start ChromaDB server
const { spawn } = require('child_process');
const path = require('path');

// Create directory if it doesn't exist
const fs = require('fs');
const chromaDir = path.join(process.cwd(), 'chroma-db');
if (!fs.existsSync(chromaDir)) {
  fs.mkdirSync(chromaDir, { recursive: true });
}

// Import the ChromaDB server module
try {
  // This is how to start the ChromaDB server programmatically
  const chromadb = require('chromadb');
  const server = new chromadb.ChromaServer();
  
  server.start({
    host: '0.0.0.0',  // Allow external connections
    port: 8000,       // Default ChromaDB port
    path: chromaDir   // Where to store data
  }).then(() => {
    console.log('ChromaDB server started on http://0.0.0.0:8000');
  }).catch(err => {
    console.error('Failed to start ChromaDB server:', err);
  });
} catch (err) {
  console.error('Error importing ChromaDB:', err);
}
