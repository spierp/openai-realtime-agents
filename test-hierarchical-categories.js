
const { ChromaClient } = require("chromadb");

async function testHierarchicalCategories() {
  console.log("Testing hierarchical categories in ChromaDB...");
  
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
    
    // Get some document metadata to examine
    const results = await collection.get({
      limit: 10,
      include: ["metadatas"]
    });
    
    console.log("\n--- Sample Document Metadata ---");
    for (let i = 0; i < results.metadatas.length; i++) {
      console.log(`\nDocument ${i+1}:`);
      console.log(`File: ${results.metadatas[i].fileName}`);
      console.log(`Full Category: ${results.metadatas[i].category}`);
      console.log(`Primary Category: ${results.metadatas[i].primary_category || 'Not set'}`);
      console.log(`Secondary Category: ${results.metadatas[i].secondary_category || 'Not set'}`);
      console.log(`Tertiary Category: ${results.metadatas[i].tertiary_category || 'Not set'}`);
      
      if (results.metadatas[i].additional_categories) {
        console.log(`Additional Categories: ${JSON.stringify(results.metadatas[i].additional_categories)}`);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testHierarchicalCategories().catch(console.error);
