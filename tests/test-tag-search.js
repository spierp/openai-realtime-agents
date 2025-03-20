require('dotenv').config();
const { ChromaClient } = require("chromadb");
const fs = require('fs');
const path = require('path');

async function testTagSearch() {
  console.log("Testing tag search in ChromaDB...");

  // Create a client that connects to the server
  const client = new ChromaClient({ 
    path: `http://${process.env.CHROMA_SERVER_HOST || '0.0.0.0'}:${process.env.CHROMA_SERVER_PORT || '8000'}`
  });

  try {
    console.log("Connecting to ChromaDB server...");
    const collections = await client.listCollections();
    console.log(
      `Connected successfully! Available collections: ${JSON.stringify(collections)}`,
    );

    // Get the knowledge_base collection
    let collection;
    try {
      collection = await client.getCollection({
        name: "knowledge_base",
      });
      console.log("Retrieved 'knowledge_base' collection");
    } catch (error) {
      if (error.message.includes("not found")) {
        console.error("Error: 'knowledge_base' collection not found. Please run the vector store creation script first:");
        console.log("npm run create-vector-store");
        process.exit(1);
      }
      throw error;
    }

    // Get collection info
    const info = await collection.count();
    console.log(`Collection contains ${info} documents`);

    // Get all documents and their metadata
    console.log("\nFetching all documents and metadata...");
    const allResults = await collection.get({
      limit: info, // Get all documents
      include: ["metadatas", "documents"]
    });

    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, 'logs');
    try {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
    } catch (error) {
      console.error("Error creating logs directory:", error);
      process.exit(1);
    }

    // Create a log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(logsDir, `metadata-log-${timestamp}.json`);
    
    // Format the data for better readability
    const logData = allResults.metadatas.map((metadata, index) => ({
      documentIndex: index,
      fileName: metadata.fileName,
      category: metadata.category,
      primary_category: metadata.primary_category,
      secondary_category: metadata.secondary_category,
      tertiary_category: metadata.tertiary_category,
      tags: metadata.tags,
      source: metadata.source,
      locFrom: metadata.locFrom,
      locTo: metadata.locTo,
      preview: typeof allResults.documents[index] === 'string' 
        ? allResults.documents[index].substring(0, 100) 
        : JSON.stringify(allResults.documents[index]).substring(0, 100)
    }));

    // Write to file
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
    console.log(`\nMetadata logged to: ${logFile}`);

    // Also log a summary of unique values for each field
    const summary = {
      totalDocuments: info,
      uniqueCategories: [...new Set(allResults.metadatas.map(m => m.category))],
      uniquePrimaryCategories: [...new Set(allResults.metadatas.map(m => m.primary_category))],
      uniqueSecondaryCategories: [...new Set(allResults.metadatas.map(m => m.secondary_category))],
      uniqueTertiaryCategories: [...new Set(allResults.metadatas.map(m => m.tertiary_category))],
      uniqueTags: [...new Set(allResults.metadatas.flatMap(m => Array.isArray(m.tags) ? m.tags : [m.tags]).filter(Boolean))]
    };

    const summaryFile = path.join(logsDir, `metadata-summary-${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`Summary logged to: ${summaryFile}`);

    // Continue with the original tag search
    console.log("\nSearching for documents with 'family' tag...");
    const results = await collection.get({
      where: { tags: "family" },
      limit: 5,
    });

    console.log("\n--- Documents with 'family' tag ---");
    console.log(`Found ${results.metadatas.length} documents`);
    
    for (let i = 0; i < results.metadatas.length; i++) {
      console.log(`\nDocument ${i + 1}:`);
      console.log(`File: ${results.metadatas[i].fileName}`);
      console.log(`Tags: ${Array.isArray(results.metadatas[i].tags) 
        ? results.metadatas[i].tags.join(', ') 
        : results.metadatas[i].tags || "No tags"}`);
      console.log(`Category: ${results.metadatas[i].category}`);
      console.log(
        `Content Preview: ${typeof results.documents[i] === 'string' 
          ? results.documents[i].substring(0, 150) 
          : JSON.stringify(results.documents[i]).substring(0, 150)}...`,
      );
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testTagSearch().catch(console.error);
