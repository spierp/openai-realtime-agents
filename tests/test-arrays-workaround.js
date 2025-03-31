// Test script to check array workarounds in ChromaDB JavaScript client
require('dotenv').config();
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

async function testArrayWorkarounds() {
  console.log("Testing array workarounds in ChromaDB JavaScript client...");

  // Create a client
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });

  // Define the embedding function
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: "text-embedding-3-large",
    openai_dimensions: 3072
  });
  
  const testCollectionName = "test_array_workarounds";
  
  try {
    // Delete test collection if it exists
    const collections = await client.listCollections();
    if (collections.includes(testCollectionName)) {
      console.log(`Deleting existing ${testCollectionName} collection`);
      await client.deleteCollection({ name: testCollectionName });
    }
    
    // Create a new test collection
    console.log(`Creating ${testCollectionName} collection...`);
    const collection = await client.createCollection({
      name: testCollectionName,
      embeddingFunction: embedder,
    });
    
    // Add test documents with various array workarounds
    console.log("Adding test documents with array workarounds...");
    
    await collection.add({
      ids: ["doc1", "doc2", "doc3", "doc4", "doc5"],
      documents: [
        "This is a test document about family",
        "This is a test document about work",
        "This is a test document about both family and work",
        "This is a test document with indexed array tags",
        "This is a test document with single tag"
      ],
      metadatas: [
        { 
          // Test flattened object notation
          "tag_0": "family",
          "tag_1": "home",
          tags_string: "|family|home|" 
        },
        { 
          // Test JSON stringified array
          tags_json: JSON.stringify(["work", "office"]),
          tags_string: "|work|office|" 
        },
        { 
          // Test comma-separated string
          tags_csv: "family,work",
          tags_string: "|family|work|" 
        },
        {
          // Test direct number indexing
          "tags.0": "indexed",
          "tags.1": "array",
          tags_string: "|indexed|array|"
        },
        {
          // Test single tag scenario
          tag: "single",
          tags_string: "|single|"
        }
      ]
    });
    console.log("Documents added successfully");
    
    // Print the collection items to see exactly what was stored
    console.log("\nRetrieving all documents to see how they're stored:");
    const allDocs = await collection.get({
      include: ["metadatas", "documents"]
    });
    
    console.log("\nDocument Metadatas:");
    allDocs.metadatas.forEach((metadata, i) => {
      console.log(`\nDocument ${i + 1} (${allDocs.ids[i]}):`, JSON.stringify(metadata, null, 2));
    });
    
    // Test different filtering methods
    console.log("\n\n=== TESTING FILTER WORKAROUNDS ===");
    
    // Method 1: Try indexing approach
    try {
      console.log("\nMethod 1: Testing where tag_0 = 'family'");
      const results1 = await collection.get({
        where: { tag_0: "family" }
      });
      console.log(`Found ${results1.ids.length} documents`);
      console.log(`Matching docs: ${results1.ids.join(", ")}`);
    } catch (err) {
      console.error("Method 1 error:", err.message);
    }
    
    // Method 2: Try JSON string approach
    try {
      console.log("\nMethod 2: Testing JSON stringified array");
      // First get all and then filter client-side
      const allResults = await collection.get({});
      const filtered = allResults.ids.filter((id, i) => {
        if (!allResults.metadatas[i].tags_json) return false;
        try {
          const tags = JSON.parse(allResults.metadatas[i].tags_json);
          return Array.isArray(tags) && tags.includes("work");
        } catch (e) {
          return false;
        }
      });
      console.log(`Found ${filtered.length} documents with 'work' in JSON array`);
      console.log(`Matching docs: ${filtered.join(", ")}`);
    } catch (err) {
      console.error("Method 2 error:", err.message);
    }
    
    // Method 3: Try CSV string approach
    try {
      console.log("\nMethod 3: Testing CSV string filtering");
      const results3 = await collection.get({
        where: { tags_csv: { $like: "%family%" } }
      });
      console.log(`Found ${results3.ids.length} documents with 'family' in CSV`);
      console.log(`Matching docs: ${results3.ids.join(", ")}`);
    } catch (err) {
      console.error("Method 3 error:", err.message);
    }
    
    // Method 4: Test direct dot notation
    try {
      console.log("\nMethod 4: Testing direct dot notation");
      const results4 = await collection.get({
        where: { "tags.0": "indexed" }
      });
      console.log(`Found ${results4.ids.length} documents`);
      console.log(`Matching docs: ${results4.ids.join(", ")}`);
    } catch (err) {
      console.error("Method 4 error:", err.message);
    }
    
    // Method 5: Test single tag field
    try {
      console.log("\nMethod 5: Testing single tag field");
      const results5 = await collection.get({
        where: { tag: "single" }
      });
      console.log(`Found ${results5.ids.length} documents`);
      console.log(`Matching docs: ${results5.ids.join(", ")}`);
    } catch (err) {
      console.error("Method 5 error:", err.message);
    }
    
    // Clean up
    console.log("\nCleaning up...");
    await client.deleteCollection({ name: testCollectionName });
    console.log("Test collection deleted");
    
  } catch (err) {
    console.error("Error:", err);
  }
}

testArrayWorkarounds().then(() => console.log("Test completed")); 