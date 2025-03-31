// Test script to check array filtering with direct ChromaDB API
require('dotenv').config();
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

async function testDirectChromaDB() {
  console.log("Testing direct ChromaDB array filtering...");

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
  
  const testCollectionName = "test_array_filtering";
  
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
    
    // Add test documents with array tags directly using ChromaDB API
    console.log("Adding test documents with array tags...");
    
    await collection.add({
      ids: ["doc1", "doc2", "doc3", "doc4"],
      documents: [
        "This is a test document about family",
        "This is a test document about work",
        "This is a test document about both family and work",
        "This is a test document with no specific tags"
      ],
      metadatas: [
        { 
          title: "Family Document", 
          tags: ["family", "home"], 
          tags_array: ["family", "home"],  // Try different formats
          tags_string: "|family|home|" 
        },
        { 
          title: "Work Document", 
          tags: ["work", "office"], 
          tags_array: ["work", "office"],
          tags_string: "|work|office|" 
        },
        { 
          title: "Mixed Document", 
          tags: ["family", "work"], 
          tags_array: ["family", "work"],
          tags_string: "|family|work|" 
        },
        { 
          title: "No Tags", 
          tags: [], 
          tags_array: [],
          tags_string: "" 
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
    console.log("\n\n=== TESTING FILTERS ===");
    
    // Method 1: Try exact match on tags field
    try {
      console.log("\nMethod 1: Testing exact match on 'tags' field with array value");
      const results1 = await collection.get({
        where: { tags: ["family", "home"] }
      });
      console.log(`Found ${results1.ids.length} documents`);
      console.log(`Matching docs: ${results1.ids.join(", ")}`);
    } catch (err) {
      console.error("Method 1 error:", err.message);
    }
    
    // Method 2: Try $eq operator
    try {
      console.log("\nMethod 2: Testing $eq operator on 'tags' field");
      const results2 = await collection.get({
        where: { tags: { $eq: ["family", "home"] } }
      });
      console.log(`Found ${results2.ids.length} documents`);
      console.log(`Matching docs: ${results2.ids.join(", ")}`);
    } catch (err) {
      console.error("Method 2 error:", err.message);
    }
    
    // Method 3: Testing with tags_array field
    try {
      console.log("\nMethod 3: Testing with tags_array field");
      const results3 = await collection.get({
        where: { tags_array: ["family", "home"] }
      });
      console.log(`Found ${results3.ids.length} documents`);
      console.log(`Matching docs: ${results3.ids.join(", ")}`);
    } catch (err) {
      console.error("Method 3 error:", err.message);
    }
    
    // Method 4: Try using $in operator to check if a specific tag exists
    try {
      console.log("\nMethod 4: Testing $in operator to find documents with 'family' in 'tags_array'");
      const results4 = await collection.get({
        where: { tags_array: { $in: [["family"]] } }
      });
      console.log(`Found ${results4.ids.length} documents`);
      console.log(`Matching docs: ${results4.ids.join(", ")}`);
    } catch (err) {
      console.error("Method 4 error:", err.message);
    }
    
    // Method 5: Use string field as a workaround
    try {
      console.log("\nMethod 5: Testing with tags_string field");
      const results5 = await collection.get({
        where: { tags_string: "|family|home|" }
      });
      console.log(`Found ${results5.ids.length} documents`);
      console.log(`Matching docs: ${results5.ids.join(", ")}`);
    } catch (err) {
      console.error("Method 5 error:", err.message);
    }
    
    // Method 6: Try with direct string inclusion
    try {
      console.log("\nMethod 6: Testing with partial string match on tags_string");
      const familyDocs = await collection.get({
        where: { tags_string: { $ne: "" } }
      });
      // Client-side filtering
      const filtered = familyDocs.ids.filter((id, i) => 
        familyDocs.metadatas[i].tags_string && 
        familyDocs.metadatas[i].tags_string.includes("|family|")
      );
      console.log(`Found ${filtered.length} documents with 'family' tag`);
      console.log(`Matching docs: ${filtered.join(", ")}`);
    } catch (err) {
      console.error("Method 6 error:", err.message);
    }
    
    // Clean up
    console.log("\nCleaning up...");
    await client.deleteCollection({ name: testCollectionName });
    console.log("Test collection deleted");
    
  } catch (err) {
    console.error("Error:", err);
  }
}

testDirectChromaDB().then(() => console.log("Test completed")); 