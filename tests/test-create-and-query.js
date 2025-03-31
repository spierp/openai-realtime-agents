// Test creating and querying a collection with text-embedding-3-large
require('dotenv').config();
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

async function testCreateAndQuery() {
  console.log("Testing create and query with text-embedding-3-large...");

  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    return;
  }

  // Create a client
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });
  console.log("Created ChromaDB client");

  // Create embedding function
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: "text-embedding-3-large",
  });
  console.log("Created embedding function with model: text-embedding-3-large");

  try {
    // Delete test collection if it exists
    const collections = await client.listCollections();
    if (collections.includes("test_large_embeddings")) {
      console.log("Deleting existing test collection...");
      await client.deleteCollection({ name: "test_large_embeddings" });
    }

    // Create a new collection
    console.log("Creating new test collection...");
    const collection = await client.createCollection({
      name: "test_large_embeddings",
      embeddingFunction: embedder,
    });
    console.log("Test collection created");

    // Add some documents
    console.log("Adding documents to collection...");
    await collection.add({
      ids: ["doc1", "doc2", "doc3"],
      documents: [
        "This is a document about construction and building techniques.",
        "This is a document about machine learning and natural language processing.",
        "This is a document about lakes, water pumps, and irrigation systems."
      ],
      metadatas: [
        { category: "construction" },
        { category: "technology" },
        { category: "water systems" }
      ]
    });
    console.log("Documents added");

    // Count items
    const count = await collection.count();
    console.log(`Collection has ${count} items`);

    // Now query the collection
    console.log("Executing query...");
    const results = await collection.query({
      queryTexts: ["construction building techniques"],
      nResults: 3
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

testCreateAndQuery(); 