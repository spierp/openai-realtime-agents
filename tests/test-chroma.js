// Load environment variables from .env file
require('dotenv').config();

// Simple script to test ChromaDB client connection
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

async function testChromaDB() {
  console.log("Testing connection to ChromaDB server...");

  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    console.log(
      "Please set the OPENAI_API_KEY in your .env file using the .env.example template.",
    );
    return;
  }

  // Create a client that connects to the server using environment variables
  const client = new ChromaClient({ 
    path: `http://${process.env.CHROMA_SERVER_HOST || '0.0.0.0'}:${process.env.CHROMA_SERVER_PORT || '8000'}` 
  });

  // Define the embedding function with OpenAI using text-embedding-3-large
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: "text-embedding-3-large",
    openai_dimensions: 3072  // Explicitly set dimensions for large model
  });

  try {
    // Test connection by listing collections
    console.log("Connecting to ChromaDB server...");
    const collections = await client.listCollections();
    console.log("Connected successfully! Available collections:", collections);

    // Get the knowledge_base collection specifically with the embedding function
    const collection = await client.getCollection({
      name: "knowledge_base",
      embeddingFunction: embedder,
    });
    console.log("Retrieved 'knowledge_base' collection");
    // console.log("Collection metadata:", await collection.getMetadata());

    // Run a query on the existing collection
    console.log("\nRunning test query on knowledge_base collection...");
    const queryResults = await collection.query({
      queryTexts: ["construction", "lake building"],
      nResults: 5,
      include: ["documents", "metadatas", "distances"],
    });

    console.log("\n--- Query Results ---");
    console.log(JSON.stringify(queryResults, null, 2));
  } catch (err) {
    console.error("Error during ChromaDB test:", err);
    if (err.message && err.message.includes("not found")) {
      console.log("\nThe 'knowledge_base' collection doesn't exist yet.");
      console.log(
        "You may need to run the vector store creation script first:",
      );
      console.log("npx tsx src/scripts/createVectorStore.ts");
    } else {
      console.log("\nFull error:", err);
    }
  }
}

// Execute the test
testChromaDB();
