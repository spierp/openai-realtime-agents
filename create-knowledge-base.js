// Simplified script to create a knowledge_base collection with text-embedding-3-large
require('dotenv').config();
const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");
const fs = require('fs');
const path = require('path');
const recursive = require('recursive-readdir');
const yaml = require('yaml');

// Track tokens for rate limiting OpenAI API
const tokenRateLimit = {
  tokensThisMinute: 0,
  lastResetTime: Date.now(),
  maxTokensPerMinute: 100000, // OpenAI's rate limit
  // Approximate token count based on characters (very rough estimate)
  estimateTokens: function(text) {
    return Math.ceil(text.length / 4); // Roughly 4 chars per token
  },
  // Check if we're approaching the rate limit
  checkRateLimit: function(textLength) {
    // Reset counter if a minute has passed
    if (Date.now() - this.lastResetTime > 60000) {
      this.tokensThisMinute = 0;
      this.lastResetTime = Date.now();
    }
    
    // Estimate tokens for this text
    const estimatedTokens = this.estimateTokens(textLength);
    this.tokensThisMinute += estimatedTokens;
    
    // If we're approaching the limit, sleep until the minute resets
    if (this.tokensThisMinute >= this.maxTokensPerMinute * 0.9) {
      console.log(`Approaching rate limit (${this.tokensThisMinute} tokens). Pausing for rate limit reset...`);
      const timeToWait = 60000 - (Date.now() - this.lastResetTime) + 1000; // Add a buffer
      // We'll handle this pause in the calling function
      return { 
        estimatedTokens,
        shouldPause: true,
        pauseTime: timeToWait
      };
    }
    
    return {
      estimatedTokens,
      shouldPause: false
    };
  }
};

// Extract frontmatter from markdown content
function extractFrontmatter(content) {
  // Define the frontmatter delimiter (---)
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (match) {
    try {
      const frontmatterRaw = match[1];
      const cleanedContent = match[2];
      const frontmatter = yaml.parse(frontmatterRaw) || {};
      
      return { frontmatter, content: cleanedContent };
    } catch (error) {
      console.error('Error parsing frontmatter:', error);
      return { frontmatter: {}, content };
    }
  }

  // No frontmatter found
  return { frontmatter: {}, content };
}

// Extract tags from frontmatter
function extractTags(frontmatter) {
  // Initialize empty tags array
  let tags = [];
  
  // Check if frontmatter contains tags
  if (frontmatter.tags) {
    if (typeof frontmatter.tags === 'string') {
      // Handle comma-separated tags
      tags = frontmatter.tags.split(',').map(tag => tag.trim());
    } else if (Array.isArray(frontmatter.tags)) {
      tags = frontmatter.tags;
    }
  }
  
  // Normalize tags by removing "#" prefix and trimming whitespace
  tags = tags.map(normalizeTag);
  
  return tags;
}

// Helper function to normalize tag format
function normalizeTag(tag) {
  // Convert to string, remove "#" prefix, and trim whitespace
  const normalizedTag = String(tag).trim();
  
  // Remove "#" prefix if present
  return normalizedTag.startsWith('#') ? normalizedTag.substring(1).trim() : normalizedTag;
}

// Helper function to clean and sanitize content for embedding
function preprocessText(text) {
  if (!text || typeof text !== 'string') {
    return "Empty document";
  }
  
  try {
    // Remove excessive newlines and normalize whitespace
    let processed = text.trim()
      .replace(/\n{3,}/g, '\n\n')  // Replace 3+ consecutive newlines with 2
      .replace(/\s+/g, ' ');       // Replace multiple spaces with a single space
      
    // Remove any null bytes and other control characters that can cause API issues
    processed = processed
      .replace(/\0/g, '')                  // Remove null bytes
      .replace(/[\x00-\x1F\x7F]/g, ' ')    // Replace control chars with spaces
      .replace(/\\u0000/g, '')             // Remove Unicode escape for null
      .replace(/[^\x20-\x7E\x0A\x0D\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/g, '') // Keep only basic Latin and common extended chars
      .replace(/\\/g, '\\\\')              // Escape backslashes
      .replace(/"/g, '\\"');               // Escape double quotes
    
    // Ensure the text is not too long for embeddings (OpenAI has token limits)
    const maxLength = 8000;  // Conservative limit
    if (processed.length > maxLength) {
      processed = processed.substring(0, maxLength) + '...';
    }
    
    // If empty after cleaning, return placeholder
    if (!processed || processed.length < 10) {
      return "Empty or minimal content document";
    }
    
    return processed;
  } catch (error) {
    console.error('Error preprocessing text:', error);
    return 'Error processing document content';
  }
}

// Process a single document and add it to the collection
async function processAndAddDocument(file, collection, knowledgeDir, index) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Extract frontmatter and content
    const { frontmatter, content: contentWithoutFrontmatter } = extractFrontmatter(content);
    
    // Extract tags from frontmatter
    const tags = extractTags(frontmatter);
    if (tags.length > 0) {
      console.log(`Tags for ${path.basename(file)}: ${JSON.stringify(tags)}`);
    }
    
    // Preprocess content to avoid embedding API errors
    const processedContent = preprocessText(contentWithoutFrontmatter);
    
    // Check rate limit before embedding
    const rateCheckResult = tokenRateLimit.checkRateLimit(processedContent.length);
    console.log(`Estimated tokens for ${path.basename(file)}: ${rateCheckResult.estimatedTokens}`);
    
    // If we need to pause for rate limiting
    if (rateCheckResult.shouldPause) {
      console.log(`Pausing for ${rateCheckResult.pauseTime}ms to avoid rate limit...`);
      await new Promise(resolve => setTimeout(resolve, rateCheckResult.pauseTime));
    }
    
    const relativePath = path.relative(knowledgeDir, file);
    const dirPath = path.dirname(relativePath);
    
    // Parse path segments for metadata
    const pathSegments = dirPath.split(path.sep).filter(segment => segment.length > 0);
    
    // Create metadata
    const metadata = {
      source: file,
      fileName: path.basename(file),
      category: dirPath,
      preview: processedContent.substring(0, 150) + '...',
    };
    
    // Add primary, secondary categories
    if (pathSegments.length > 0) {
      metadata.primary_category = pathSegments[0];
      
      if (pathSegments.length > 1) {
        metadata.secondary_category = pathSegments[1];
        
        if (pathSegments.length > 2) {
          metadata.tertiary_category = pathSegments[2];
        }
      }
    }
    
    // Override with frontmatter categories if present
    if (frontmatter.primary_category) metadata.primary_category = frontmatter.primary_category;
    if (frontmatter.secondary_category) metadata.secondary_category = frontmatter.secondary_category; 
    if (frontmatter.category) metadata.category = frontmatter.category;
    
    /**
     * IMPORTANT: ChromaDB JavaScript client has a limitation with array fields.
     * Arrays are silently dropped from metadata and cannot be used for filtering.
     * 
     * We handle tags in three ways to ensure they can be queried:
     * 1. tags_string: Delimited string format for string-contains matching
     * 2. Individual numbered fields (tag_0, tag_1, etc.) for direct equality matching
     * 3. Keep the original array as a JSON string for client-side filtering
     */
    if (tags.length > 0) {
      // 1. String format with delimiters
      metadata.tags_string = `|${tags.join('|')}|`;
      
      // 2. Individual numbered fields for direct querying
      tags.forEach((tag, index) => {
        metadata[`tag_${index}`] = tag;
      });
      
      // 3. Keep the original array as a JSON string (for client parsing)
      metadata.tags_json = JSON.stringify(tags);
      
      // Log the metadata with tags for debugging
      console.log(`Document metadata for ${path.basename(file)}:`, JSON.stringify(metadata));
    }
    
    // Use a deterministic ID format
    const fileId = path.basename(file, '.md') + '-' + index;
    
    // Add document to collection
    await collection.add({
      ids: [fileId],
      documents: [processedContent],
      metadatas: [metadata]
    });
    
    console.log(`Processed and added: ${relativePath}`);
    
    // Add a small delay between documents based on size
    const delayMs = Math.min(500, Math.ceil(rateCheckResult.estimatedTokens / 100));
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    return { success: true };
  } catch (err) {
    console.error(`Error processing file ${file}: ${err.message}`);
    
    // If we hit a rate limit error, wait longer and allow for retry
    if (err.message.includes('Rate limit') || err.message.includes('429')) {
      console.log('Rate limit hit, waiting for 65 seconds before continuing...');
      await new Promise(resolve => setTimeout(resolve, 65000));
    }
    
    return { success: false, error: err.message };
  }
}

async function createKnowledgeBase() {
  console.log("Creating knowledge_base with text-embedding-3-large...");

  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    return;
  }

  // Create a client
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });
  console.log("Created ChromaDB client");

  // Create embedding function with dimensions setting
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: "text-embedding-3-large", 
    openai_dimensions: 3072
  });
  console.log("Created embedding function with model: text-embedding-3-large");

  try {
    // Delete knowledge_base collection if it exists
    const collections = await client.listCollections();
    if (collections.includes("knowledge_base")) {
      console.log("Deleting existing knowledge_base collection...");
      await client.deleteCollection({ name: "knowledge_base" });
    }

    // Create a new collection
    console.log("Creating new knowledge_base collection...");
    const collection = await client.createCollection({
      name: "knowledge_base",
      embeddingFunction: embedder,
    });
    console.log("knowledge_base collection created");

    // Read all markdown files from the knowledge directory
    const knowledgeDir = path.join(process.cwd(), 'knowledge');
    console.log(`Reading markdown files from ${knowledgeDir}...`);
    
    const files = await recursive(knowledgeDir, ['!*.md']);
    console.log(`Found ${files.length} markdown files`);

    // Process files one by one with rate limiting
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let retryCount = 0;
    const maxRetries = 3;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i+1} of ${files.length}...`);
      
      let result;
      let retries = 0;
      
      // Allow for retries on rate limit errors
      do {
        if (retries > 0) {
          console.log(`Retry #${retries} for file ${path.basename(file)}`);
        }
        
        result = await processAndAddDocument(file, collection, knowledgeDir, i);
        
        if (!result.success && result.error && (result.error.includes('Rate limit') || result.error.includes('429'))) {
          retries++;
          console.log(`Rate limit hit, waiting before retry #${retries}...`);
          await new Promise(resolve => setTimeout(resolve, 65000)); // Wait longer for rate limit to reset
        } else {
          break; // Exit retry loop if not a rate limit error or if successful
        }
      } while (retries < maxRetries);
      
      totalProcessed++;
      
      if (result.success) {
        totalSuccess++;
      } else {
        totalErrors++;
        console.error(`Failed to process ${file}: ${result.error}`);
      }
      
      // If we've processed a reasonable batch, log progress
      if (totalProcessed % 10 === 0) {
        console.log(`Progress: ${totalProcessed}/${files.length} files (${Math.floor(totalProcessed/files.length*100)}%)`);
      }
    }

    // Count total items
    const count = await collection.count();
    console.log(`Collection now has ${count} items`);
    console.log(`Total files processed: ${totalProcessed}, Successful: ${totalSuccess}, Errors: ${totalErrors}`);
    
    console.log("Knowledge base created successfully!");
  } catch (err) {
    console.error("Error:", err);
  }
}

createKnowledgeBase(); 