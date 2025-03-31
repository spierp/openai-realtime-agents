// Simple script to test tag filtering
require('dotenv').config();
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

async function testTagFiltering() {
  console.log("Testing tag filtering with client-side approach...");

  // Check for OpenAI API Key
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    return;
  }

  // Create a client
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });

  // Define the embedding function
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: "text-embedding-3-large",
    openai_dimensions: 3072
  });
  console.log("Created embedding function with model: text-embedding-3-large");

  try {
    // Connect to ChromaDB and get the collection
    console.log("Connecting to ChromaDB server...");
    const collections = await client.listCollections();
    console.log(`Connected successfully! Available collections: ${collections.join(", ")}`);

    // Get the knowledge_base collection with the embedding function
    const collection = await client.getCollection({
      name: "knowledge_base",
      embeddingFunction: embedder
    });
    console.log("Retrieved 'knowledge_base' collection");

    // Get collection info
    const count = await collection.count();
    console.log(`Collection contains ${count} documents`);

    // Get all documents
    console.log("\nFetching all documents to filter by tags...");
    const allDocs = await collection.get({
      include: ["metadatas", "documents"]
    });

    // Client-side filtering for documents with tags_string containing "family"
    const familyDocs = [];
    
    for (let i = 0; i < allDocs.ids.length; i++) {
      const metadata = allDocs.metadatas[i];
      if (metadata && metadata.tags_string && 
          (metadata.tags_string.toLowerCase().includes('family') || 
           metadata.tags_string.includes('"#family"'))) {
        familyDocs.push({
          id: allDocs.ids[i],
          metadata: metadata,
          document: allDocs.documents[i]
        });
      }
    }
    
    console.log(`\n--- Found ${familyDocs.length} documents with 'family' tag after client-side filtering ---`);
    
    // Display the filtered results
    for (let i = 0; i < familyDocs.length; i++) {
      const doc = familyDocs[i];
      console.log(`\nDocument ${i + 1}:`);
      console.log(`File: ${doc.metadata.fileName}`);
      console.log(`Tags string: ${doc.metadata.tags_string}`);
      console.log(`Category: ${doc.metadata.category}`);
      console.log(
        `Content Preview: ${typeof doc.document === 'string' 
          ? doc.document.substring(0, 150) 
          : JSON.stringify(doc.document).substring(0, 150)}...`,
      );
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

testTagFiltering(); 