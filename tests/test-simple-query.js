// Test simple query against ChromaDB
require('dotenv').config();
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

async function testSimpleQuery() {
  console.log("Testing simple query with text-embedding-3-large...");

  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    return;
  }

  // Create a client
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });
  console.log("Created ChromaDB client");

  // Use the large embeddings model with explicit dimensions
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: "text-embedding-3-large",
    openai_dimensions: 3072 // Explicitly set dimensions for large model
  });
  console.log("Created embedding function with model: text-embedding-3-large");

  try {
    // List collections to verify connection
    const collections = await client.listCollections();
    console.log("Collections:", collections);

    if (!collections.includes("knowledge_base")) {
      console.error("Error: knowledge_base collection not found");
      return;
    }

    // Get collection
    const collection = await client.getCollection({
      name: "knowledge_base",
      embeddingFunction: embedder
    });
    console.log("Retrieved collection");

    // Count items
    const count = await collection.count();
    console.log(`Collection has ${count} items`);

    // Try a simple peek (doesn't require embedding calculation)
    console.log("Peeking at collection...");
    const peek = await collection.peek({ limit: 2 });
    console.log("Peek results:", JSON.stringify(peek, null, 2));

    // Now try a simple query with minimal parameters
    console.log("Executing simple query...");
    const results = await collection.query({
      queryTexts: ["construction"],
      nResults: 1
    });

    console.log("Query succeeded!");
    console.log("Results:", JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Error:", err);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
  }
}

testSimpleQuery(); 