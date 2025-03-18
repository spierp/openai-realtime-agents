
const { ChromaClient } = require("chromadb");

async function testTagSearch() {
  console.log("Testing tag search in ChromaDB...");
  
  // Create a client that connects to the server
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });
  
  try {
    console.log("Connecting to ChromaDB server...");
    const collections = await client.listCollections();
    console.log(`Connected successfully! Available collections: ${JSON.stringify(collections)}`);
    
    // Get the knowledge_base collection
    const collection = await client.getCollection({ 
      name: "knowledge_base"
    });
    console.log("Retrieved 'knowledge_base' collection");
    
    // Get collection info
    const info = await collection.count();
    console.log(`Collection contains ${info} documents`);
    
    // Search for documents with "family" tag
    console.log("\nSearching for documents with 'family' tag...");
    const results = await collection.query({
      queryTexts: [""],  // Empty query text to match all documents
      where: { tags: "family" },
      include: ["metadatas", "documents"],
      nResults: 5
    });
    
    console.log("\n--- Documents with 'family' tag ---");
    for (let i = 0; i < results.metadatas.length; i++) {
      console.log(`\nDocument ${i+1}:`);
      console.log(`File: ${results.metadatas[i].fileName}`);
      console.log(`Tags: ${results.metadatas[i].tags || 'No tags'}`);
      console.log(`Category: ${results.metadatas[i].category}`);
      console.log(`Content Preview: ${results.documents[i].substring(0, 150)}...`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testTagSearch().catch(console.error);
