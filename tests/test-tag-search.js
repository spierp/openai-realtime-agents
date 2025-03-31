require('dotenv').config();
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");
const fs = require('fs');
const path = require('path');

// Helper function to normalize tag format
function normalizeTag(tag) {
  // Convert to string, remove "#" prefix, and trim whitespace
  const normalizedTag = String(tag).trim().toLowerCase();
  
  // Remove "#" prefix if present
  return normalizedTag.startsWith('#') ? normalizedTag.substring(1).trim() : normalizedTag;
}

async function testTagSearch() {
  console.log("Testing tag search in ChromaDB...");

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

  // Get the collection
  console.log("Connecting to ChromaDB server...");

  try {
    const collection = await client.getCollection({
      name: "knowledge_base",
      embeddingFunction: embedder
    });
    
    console.log(`Successfully connected. Collection has ${await collection.count()} documents.`);
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Dump all metadata for analysis
    const allDocs = await collection.get({
      include: ["metadatas"]
    });
    
    // Create timestamp for log files
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    // Save complete metadata to a log file for analysis
    const metadataLogPath = path.join(logsDir, `metadata-log-${timestamp}.json`);
    fs.writeFileSync(metadataLogPath, JSON.stringify(allDocs.metadatas, null, 2));
    console.log(`Logged all metadata to ${metadataLogPath}`);
    
    // Create a summary of metadata fields
    const fieldSummary = {};
    allDocs.metadatas.forEach(metadata => {
      Object.keys(metadata).forEach(key => {
        if (!fieldSummary[key]) {
          fieldSummary[key] = {
            count: 0,
            examples: []
          };
        }
        
        fieldSummary[key].count++;
        
        // Store a few examples of values
        if (fieldSummary[key].examples.length < 3) {
          fieldSummary[key].examples.push(metadata[key]);
        }
      });
    });
    
    // Save metadata summary to file
    const summaryPath = path.join(logsDir, `metadata-summary-${timestamp}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(fieldSummary, null, 2));
    console.log(`Logged metadata summary to ${summaryPath}`);
    
    // The tag we're searching for (normalize it to handle "#" variations)
    const targetTag = "family"; // This will match both "family" and "#family"
    const normalizedTargetTag = normalizeTag(targetTag);
    
    // Method 1: Try to find documents with tag_0 or tag_1 = target tag
    console.log(`\nMethod 1: Searching for documents with normalized tag '${normalizedTargetTag}'...`);
    let familyDocs = [];
    
    try {
      // Get all documents
      const allTagDocs = await collection.get({
        include: ["metadatas", "documents"]
      });
      
      // Client-side filtering to find matches in any tag field regardless of "#" prefix
      const filteredDocs = [];
      
      for (let i = 0; i < allTagDocs.ids.length; i++) {
        const metadata = allTagDocs.metadatas[i];
        let hasMatchingTag = false;
        
        // Check all fields that start with "tag_" (tag_0, tag_1, etc.)
        for (const key in metadata) {
          if (key.startsWith('tag_') && normalizeTag(metadata[key]) === normalizedTargetTag) {
            hasMatchingTag = true;
            break;
          }
        }
        
        if (hasMatchingTag) {
          filteredDocs.push({
            id: allTagDocs.ids[i],
            metadata: metadata,
            document: allTagDocs.documents[i]
          });
        }
      }
      
      if (filteredDocs.length > 0) {
        console.log(`Found ${filteredDocs.length} documents with normalized tag '${normalizedTargetTag}'`);
        
        // Show the first result as an example
        console.log(`Example document: ${filteredDocs[0].id}`);
        console.log(`Tags: ${filteredDocs[0].metadata.tags_string || "None"}`);
        
        familyDocs = filteredDocs.map(doc => doc.id);
      } else {
        console.log(`No documents found with normalized tag '${normalizedTargetTag}' using Method 1`);
      }
    } catch (err) {
      console.error("Method 1 error:", err.message);
    }
    
    // Method 2: Using client-side filtering with tags_string
    console.log(`\nMethod 2: Using client-side filtering with tags_string field...`);
    try {
      // Get all documents with non-empty tags_string
      const allTaggedDocs = await collection.get({
        where: { tags_string: { $ne: "" } },
        include: ["metadatas", "documents"],
      });
      
      // Filter for documents containing the target tag, ignoring "#"
      const filteredIds = [];
      
      allTaggedDocs.ids.forEach((id, i) => {
        const metadata = allTaggedDocs.metadatas[i];
        if (metadata.tags_string) {
          // Split the tags_string into individual tags and normalize them
          const tags = metadata.tags_string
            .split('|')
            .filter(tag => tag.length > 0)
            .map(normalizeTag);
          
          // Check if the normalized target tag is in the list
          if (tags.includes(normalizedTargetTag)) {
            filteredIds.push(id);
          }
        }
      });
      
      if (filteredIds.length > 0) {
        console.log(`Found ${filteredIds.length} documents with '${targetTag}' tag using client-side filtering`);
        
        // Show the first 5 documents at most
        const showCount = Math.min(filteredIds.length, 5);
        for (let i = 0; i < showCount; i++) {
          const index = allTaggedDocs.ids.indexOf(filteredIds[i]);
          console.log(`\nDocument ${i+1}: ${filteredIds[i]}`);
          console.log(`File: ${allTaggedDocs.metadatas[index].fileName || "N/A"}`);
          console.log(`Tags: ${allTaggedDocs.metadatas[index].tags_string}`);
          console.log(`Preview: ${allTaggedDocs.metadatas[index].preview || "N/A"}`);
        }
      } else {
        console.log(`No documents found with '${targetTag}' tag using client-side filtering`);
      }
    } catch (err) {
      console.error("Method 2 error:", err.message);
    }
    
    console.log("\nTag search test completed.");
    
  } catch (err) {
    console.error("Error:", err);
  }
}

testTagSearch().then(() => console.log("Script completed."));
