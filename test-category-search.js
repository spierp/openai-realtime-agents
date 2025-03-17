
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

async function testCategorySearch() {
  console.log("Testing hierarchical category search in ChromaDB...");
  
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    return;
  }

  // Create a client that connects to the server
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });
  
  // Define the embedding function with OpenAI
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: "text-embedding-3-large"
  });
  
  try {
    console.log("Connecting to ChromaDB server...");
    const collections = await client.listCollections();
    console.log(`Connected successfully! Available collections: ${JSON.stringify(collections)}`);
    
    // Get the knowledge_base collection
    const collection = await client.getCollection({ 
      name: "knowledge_base",
      embeddingFunction: embedder
    });
    console.log("Retrieved 'knowledge_base' collection");
    
    // Test query for '03 Projects' primary category
    console.log("\nSearching for documents in primary_category '03 Projects'...");
    const projectResults = await collection.query({
      queryTexts: ["lake water pump"],
      where: { primary_category: "03 Projects" },
      nResults: 3,
      include: ["metadatas", "documents", "distances"]
    });
    
    console.log("\n--- Primary Category Query Results ---");
    console.log("Found documents:", projectResults.metadatas[0].length);
    
    for (let i = 0; i < projectResults.metadatas[0].length; i++) {
      console.log(`\nResult ${i+1}:`);
      console.log(`Distance: ${projectResults.distances[0][i]}`);
      console.log(`Category: ${projectResults.metadatas[0][i].category}`);
      console.log(`Primary Category: ${projectResults.metadatas[0][i].primary_category}`);
      
      if (projectResults.metadatas[0][i].secondary_category) {
        console.log(`Secondary Category: ${projectResults.metadatas[0][i].secondary_category}`);
      }
      
      if (projectResults.metadatas[0][i].tertiary_category) {
        console.log(`Tertiary Category: ${projectResults.metadatas[0][i].tertiary_category}`);
      }
      
      console.log(`Document: ${projectResults.documents[0][i].substring(0, 100)}...`);
    }
    
    // Test query for '04 Areas/Work' secondary category
    console.log("\nSearching for documents with secondary_category 'Work'...");
    const workResults = await collection.query({
      queryTexts: ["construction"],
      where: { secondary_category: "Work" },
      nResults: 3,
      include: ["metadatas", "documents", "distances"]
    });
    
    console.log("\n--- Secondary Category Query Results ---");
    console.log("Found documents:", workResults.metadatas[0].length);
    
    for (let i = 0; i < workResults.metadatas[0].length; i++) {
      console.log(`\nResult ${i+1}:`);
      console.log(`Distance: ${workResults.distances[0][i]}`);
      console.log(`Category: ${workResults.metadatas[0][i].category}`);
      console.log(`Primary Category: ${workResults.metadatas[0][i].primary_category}`);
      
      if (workResults.metadatas[0][i].secondary_category) {
        console.log(`Secondary Category: ${workResults.metadatas[0][i].secondary_category}`);
      }
      
      console.log(`Document: ${workResults.documents[0][i].substring(0, 100)}...`);
    }
    
  } catch (err) {
    console.error("Error during search:", err);
  }
}

testCategorySearch();
