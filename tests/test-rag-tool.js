// Load environment variables from .env file
require('dotenv').config();

// Import the ChromaDB client for reference implementation
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

// This is a manual test of our RAG tool implementation
// In a real app, we'd import the TypeScript modules, but for testing we'll recreate the key functionality here
async function testRagTool() {
  console.log("Testing RAG tool implementation with ChromaDB...");

  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    return;
  }

  // Create a client that connects to the server
  const client = new ChromaClient({
    path: `http://${process.env.CHROMA_SERVER_HOST || '0.0.0.0'}:${process.env.CHROMA_SERVER_PORT || '8000'}`
  });

  // Define the embedding function with OpenAI
  const embeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
  console.log(`Using embedding model: ${embeddingModel}`);
  
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: embeddingModel
  });

  try {
    console.log("Connecting to ChromaDB...");
    
    // Get the knowledge_base collection
    const collection = await client.getCollection({ 
      name: process.env.CHROMA_COLLECTION || "knowledge_base",
      embeddingFunction: embedder
    });

    console.log("Successfully connected to collection");
    
    // Simulate RAG tool query functionality
    
    // 1. Simple query without filters
    console.log("\n--- Test 1: Simple query without filters ---");
    const simpleQuery = "construction";
    console.log(`Searching for: "${simpleQuery}"`);
    
    const simpleResults = await collection.query({
      queryTexts: [simpleQuery],
      nResults: 3,
      include: ["documents", "metadatas", "distances"]
    });
    
    console.log(`Found ${simpleResults.ids[0].length} results`);
    formatAndPrintResults(simpleResults);
    
    // 2. Query with primary category filter
    console.log("\n--- Test 2: Query with primary category filter ---");
    const filteredQuery = "lake";
    const primaryCategory = "03 Projects"; // Adjust based on your actual data
    
    console.log(`Searching for: "${filteredQuery}" in primary category: "${primaryCategory}"`);
    
    const filteredResults = await collection.query({
      queryTexts: [filteredQuery],
      where: { primary_category: primaryCategory },
      nResults: 3,
      include: ["documents", "metadatas", "distances"]
    });
    
    console.log(`Found ${filteredResults.ids[0].length} results`);
    formatAndPrintResults(filteredResults);
    
    // 3. Query with combined filters
    console.log("\n--- Test 3: Query with combined category filters ---");
    const combinedQuery = "meeting";
    
    // These category values should be adjusted to match your actual data
    const combinedFilter = {
      $and: [
        { primary_category: "04 Areas" },
        { secondary_category: "Work" }
      ]
    };
    
    console.log(`Searching for: "${combinedQuery}" with combined filters`);
    console.log("Filter:", JSON.stringify(combinedFilter, null, 2));
    
    const combinedResults = await collection.query({
      queryTexts: [combinedQuery],
      where: combinedFilter,
      nResults: 3,
      include: ["documents", "metadatas", "distances"]
    });
    
    console.log(`Found ${combinedResults.ids[0].length} results`);
    formatAndPrintResults(combinedResults);

    console.log("\nRAG tool test completed successfully");
    
  } catch (err) {
    console.error("Error during RAG tool test:", err);
    if (err.message && err.message.includes("Collection not found")) {
      console.log("\nHint: Make sure you've created the 'knowledge_base' collection first.");
    }
  }
}

// Helper function to format and print results in a similar way to our ragService utility
function formatAndPrintResults(results) {
  if (!results.documents || !results.documents[0] || results.documents[0].length === 0) {
    console.log("No results found");
    return;
  }
  
  console.log("\nTop results:");
  
  for (let i = 0; i < results.documents[0].length; i++) {
    const doc = results.documents[0][i];
    const metadata = results.metadatas[0][i] || {};
    const distance = results.distances ? results.distances[0][i] : null;
    const relevanceScore = distance !== null ? (1 - distance).toFixed(4) : 'N/A';
    
    console.log(`\nResult ${i + 1} (relevance: ${relevanceScore}):`);
    console.log("Metadata:", JSON.stringify(metadata, null, 2));
    console.log("Content:", typeof doc === 'string' 
      ? doc.substring(0, 150) + (doc.length > 150 ? '...' : '')
      : JSON.stringify(doc).substring(0, 150) + (JSON.stringify(doc).length > 150 ? '...' : ''));
  }
}

// Run the test
testRagTool(); 