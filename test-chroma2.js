
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

async function testChromaDB() {
  // Initialize the Chroma client
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });

  // Define the embedding function with correct model name parameter
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    model_name: "text-embedding-3-small"
  });

  try {
    // Retrieve the collection with the embedding function
    const collection = await client.getCollection({
      name: "knowledge_base",
      embeddingFunction: embedder,
    });

    // Define query parameters
    const queryTexts = ["construction", "lake building"];
    const nResults = 5;

    // Perform the query
    const results = await collection.query({
      queryTexts,
      nResults,
      include: ["documents", "metadatas", "distances"]
    });

    console.log("Query Results:", results);
  } catch (err) {
    console.error("Error querying ChromaDB:", err);
  }
}

// Execute the function
testChromaDB();
