// Simple script to test ChromaDB client connection
const { ChromaClient } = require('chromadb');

console.log("Testing connection to ChromaDB server...");

// Create a client that connects to the server
const client = new ChromaClient({
  path: "http://localhost:8000" 
});

// Test connection with heartbeat
console.log("Attempting to connect to ChromaDB server...");
setTimeout(() => {
  // Try listing collections directly instead of using heartbeat
  client.listCollections()
    .then(collections => {
      console.log("Connected to ChromaDB server successfully!");
      console.log("Available collections:", collections);
    })
    .catch(err => {
      console.error('Error connecting to ChromaDB server:', err);
      console.log("Please start the ChromaDB server first with:");
      console.log("python start-chroma-server.py");
    });
}, 2000); // Give the server a moment to start