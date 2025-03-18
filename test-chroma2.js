const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

class CustomOpenAIEmbeddingFunction extends OpenAIEmbeddingFunction {
  constructor({ openai_api_key, openai_model }) {
    super({ openai_api_key, openai_model });
    this.model = openai_model; // Store the model for logging
  }

  async generate(texts) {
    // Call the parent class's generate method to get embeddings
    const embeddings = await super.generate(texts);

    // Log the model used (assuming the parent class respects the model passed)
    console.log("Embedding Function Validation:", {
      specifiedModel: this.model,
      inputTexts: texts.length > 5 ? `${texts.slice(0, 5)}...` : texts, // Truncate for brevity
      embeddingCount: embeddings.length,
      sampleEmbedding: embeddings[0]?.slice(0, 5), // First 5 values of first embedding
    });

    return embeddings;
  }
}

async function testChromaDB() {
  console.log("Testing connection to ChromaDB server...");

  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    console.log(
      "Please set the OPENAI_API_KEY in your environment variables or secrets.",
    );
    return;
  }

  // Create a client that connects to the server
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });

  // Define the embedding function with OpenAI using text-embedding-3-large
  const embedder = new CustomOpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: "text-embedding-3-small",
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
