
// Simple script to test just the ChromaDB connection
const { ChromaClient } = require("chromadb");

async function testSimpleChromaConnection() {
  console.log("Testing basic connection to ChromaDB server...");
  
  // Create a client that connects to the server
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });

  try {
    // Test connection by listing collections
    console.log("Connecting to ChromaDB server...");
    const collections = await client.listCollections();
    console.log("Connected successfully! Available collections:", collections);
    
    // Just verify the knowledge_base collection exists without trying to query
    if (collections.includes("knowledge_base")) {
      console.log("Found the 'knowledge_base' collection");
    } else {
      console.log("The 'knowledge_base' collection was not found");
      console.log("You may need to run the vector store creation script first");
    }
  } catch (err) {
    console.error("Error connecting to ChromaDB:", err);
  }
}

// Execute the test
testSimpleChromaConnection();
