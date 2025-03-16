// Simple script to test ChromaDB client connection
const { ChromaClient } = require('chromadb');

console.log("Testing connection to ChromaDB server...");

// Create a client that connects to the server
const client = new ChromaClient({
  path: "http://0.0.0.0:8000" 
});

// Test connection with heartbeat
client.heartbeat()
  .then(heartbeat => {
    console.log(`Connected to ChromaDB server! Heartbeat: ${heartbeat}`);
    return client.listCollections();
  })
  .then(collections => {
    console.log("Available collections:", collections);
  })
  .catch(err => {
    console.error('Error connecting to ChromaDB server:', err);
    console.log("Please start the ChromaDB server first with:");
    console.log("python start-chroma-server.py");
  });