
// Simple script to test ChromaDB client connection
const { ChromaClient } = require("chromadb");

async function testChromaDB() {
  console.log("Testing connection to ChromaDB server...");
  
  // Create a client that connects to the server
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });

  try {
    // Test connection by listing collections
    console.log("Connecting to ChromaDB server...");
    const collections = await client.listCollections();
    console.log("Connected successfully! Available collections:", collections);
    
    // Get the knowledge_base collection WITHOUT specifying the embedding function
    const collection = await client.getCollection({
      name: "knowledge_base"
    });
    console.log("Retrieved 'knowledge_base' collection");
    
    // Run a query on the existing collection
    console.log("\nRunning test query on knowledge_base collection...");
    const queryResults = await collection.query({
      queryTexts: ["construction", "lake building"],
      nResults: 5
    });
    
    console.log("\n--- Query Results ---");
    console.log(JSON.stringify(queryResults, null, 2));
    
  } catch (err) {
    console.error("Error during ChromaDB test:", err);
    console.log("\nFull error:", err);
  }
}

// Execute the test
testChromaDB();
