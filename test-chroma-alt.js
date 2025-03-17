
// Simple script to test ChromaDB client connection
const { ChromaClient } = require("chromadb");
const { OpenAI } = require("openai");

// Custom embedding function that doesn't pass dimensions parameter
class CustomOpenAIEmbeddingFunction {
  constructor(options) {
    this.openai = new OpenAI({
      apiKey: options.openai_api_key
    });
    this.model = options.model_name || "text-embedding-ada-002";
  }

  async generate(texts) {
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: texts,
    });
    return response.data.map(item => item.embedding);
  }
}

async function testChromaDB() {
  console.log("Testing connection to ChromaDB server...");
  
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    console.log("Please set the OPENAI_API_KEY in your environment variables or secrets.");
    return;
  }

  // Create a client that connects to the server
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });
  
  // Define our custom embedding function
  const embedder = new CustomOpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    model_name: "text-embedding-ada-002"
  });

  try {
    // Test connection by listing collections
    console.log("Connecting to ChromaDB server...");
    const collections = await client.listCollections();
    console.log("Connected successfully! Available collections:", collections);
    
    // Get the knowledge_base collection with the embedding function
    const collection = await client.getCollection({
      name: "knowledge_base",
      embeddingFunction: embedder
    });
    console.log("Retrieved 'knowledge_base' collection");
    
    // Run a query on the existing collection
    console.log("\nRunning test query on knowledge_base collection...");
    const queryResults = await collection.query({
      queryTexts: ["construction", "lake building"],
      nResults: 5,
      include: ["documents", "metadatas", "distances"]
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
