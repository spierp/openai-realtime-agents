
// Simple script to start ChromaDB client
const path = require('path');
const fs = require('fs');

// Create directory if it doesn't exist
const chromaDir = path.join(process.cwd(), 'chroma-db');
if (!fs.existsSync(chromaDir)) {
  fs.mkdirSync(chromaDir, { recursive: true });
  console.log(`Created ChromaDB directory at ${chromaDir}`);
}

try {
  // Import the ChromaDB client
  const { ChromaClient } = require('chromadb');
  
  // Create a client that connects to the server
  const client = new ChromaClient({
    path: "http://localhost:8000"
  });
  
  // Test connection with heartbeat
  client.heartbeat()
    .then(heartbeat => {
      console.log(`Connected to ChromaDB server successfully! Heartbeat: ${heartbeat}`);
      console.log(`Please start the ChromaDB server separately with:`);
      console.log(`npx chromadb-server --path ${chromaDir}`);
    })
    .catch(err => {
      console.error('Error connecting to ChromaDB server:', err);
      console.log(`Please start the ChromaDB server with:`);
      console.log(`npx chromadb-server --path ${chromaDir}`);
    });
} catch (err) {
  console.error('Error importing ChromaDB:', err);
}
