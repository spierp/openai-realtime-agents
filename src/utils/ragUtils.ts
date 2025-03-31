// ragUtils.ts

import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import * as fs from "fs";
import * as path from "path";
import { ChromaClient } from "chromadb";
import { parse as parseYaml } from "yaml";

/**
 * Helper function to normalize tag format
 * @param tag The tag to normalize
 * @returns The normalized tag with "#" prefix removed and whitespace trimmed
 */
function normalizeTag(tag: string): string {
  // Convert to string, remove "#" prefix, and trim whitespace
  const normalizedTag = String(tag).trim();
  
  // Remove "#" prefix if present
  return normalizedTag.startsWith('#') ? normalizedTag.substring(1).trim() : normalizedTag;
}

/**
 * Extracts frontmatter from markdown content.
 * @param content The markdown content
 * @returns Object containing the frontmatter data and the content without frontmatter
 */
export function extractFrontmatter(content: string): { frontmatter: any; content: string } {
  // Define the frontmatter delimiter (---)
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (match) {
    try {
      const frontmatterRaw = match[1];
      const cleanedContent = match[2];
      const frontmatter = parseYaml(frontmatterRaw) || {};
      
      // If tags exist in frontmatter, ensure they're processed correctly
      if (frontmatter.tags) {
        console.log(`Found tags in frontmatter: ${JSON.stringify(frontmatter.tags)}`);
      }
      
      return { frontmatter, content: cleanedContent };
    } catch (error) {
      console.error('Error parsing frontmatter:', error);
      return { frontmatter: {}, content };
    }
  }

  // No frontmatter found
  return { frontmatter: {}, content };
}

/**
 * Preprocesses text by removing extra whitespace and normalizing content to ensure compatibility with embedding APIs.
 * @param text The text to preprocess
 * @returns The preprocessed text
 */
export function preprocessText(text: string): string {
  if (!text) return '';
  
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
      .replace(/[^\x20-\x7E\x0A\x0D\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/g, ''); // Keep only basic Latin and common extended chars
    
    // Ensure the text is not too long for embeddings (OpenAI has token limits)
    const maxLength = 8000;  // Conservative limit
    if (processed.length > maxLength) {
      processed = processed.substring(0, maxLength);
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

/**
 * Reads markdown files recursively, processes them, and returns an array of processed document objects.
 * @param rootPath Path to the root folder containing markdown files
 * @returns Array of processed document objects with content and metadata
 */
export async function readMarkdownFiles(rootPath: string): Promise<{
  documents: Document[];
  fileCount: number;
  errorCount: number;
}> {
  let fileCount = 0;
  let errorCount = 0;
  let documents: Document[] = [];
  
  console.log(`Reading markdown files recursively from ${rootPath}...`);
  
  // Helper function to process directories recursively
  function processDirectoryRecursively(dirPath: string, relativePath: string = ""): void {
    try {
      // Read all entries in the directory
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      // Process each entry
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const entryRelativePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively process subdirectories
          processDirectoryRecursively(fullPath, entryRelativePath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Process markdown files
          fileCount++;
          
          try {
            // Read file content
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Extract frontmatter and content
            const { frontmatter, content: contentWithoutFrontmatter } = extractFrontmatter(content);
            
            // Create a unique ID for the document
            const docId = `doc_${fileCount}_${entry.name.replace(/\s+/g, '_').replace(/\.[^/.]+$/, '')}`;
            
            // Preprocess the content to ensure it's clean for embedding
            const processedContent = preprocessText(contentWithoutFrontmatter);
            
            // Extract tags from frontmatter
            let tags: string[] = [];
            if (frontmatter.tags) {
              if (typeof frontmatter.tags === 'string') {
                // Handle comma-separated tags
                tags = frontmatter.tags.split(',').map((tag: string) => tag.trim());
              } else if (Array.isArray(frontmatter.tags)) {
                tags = frontmatter.tags;
              }
            }
            
            // Normalize tags by removing "#" prefix and trimming whitespace
            tags = tags.map(normalizeTag);
            
            console.log(`Tags for ${entry.name}: ${JSON.stringify(tags)}`);
            
            // Get categories from file path or frontmatter
            const pathSegments = relativePath.split(path.sep).filter(segment => segment.length > 0);
            
            // Prepare metadata
            const metadata: Record<string, any> = {
              fileName: entry.name,
              filePath: fullPath,
              source: fullPath,
              category: relativePath, // Store the relative path as category
              preview: processedContent.substring(0, 150) + '...',
            };
            
            // Add hierarchical categories based on directory structure
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
              console.log(`Document metadata for ${entry.name}:`, JSON.stringify(metadata));
            }
            
            // Create document object
            const doc = new Document({
              pageContent: processedContent,
              metadata
            });
            
            documents.push(doc);
            console.log(`Processed: ${entryRelativePath}`);
            
          } catch (error) {
            console.error(`Error processing file ${fullPath}:`, error);
            errorCount++;
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      errorCount++;
    }
  }
  
  // Start processing from the root path
  processDirectoryRecursively(rootPath);
  
  console.log(`Successfully processed ${documents.length} documents from ${fileCount} files with ${errorCount} errors.`);
  
  return {
    documents,
    fileCount,
    errorCount
  };
}

// Function to create text chunks from documents
export async function createTextChunks(documents: Document[]) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 300,
  });

  return await textSplitter.splitDocuments(documents);
}

/**
 * Creates a vector store from the given documents.
 * @param documents Documents to add to the vector store
 * @param collectionName Name of the collection to use
 * @returns The created vector store
 */
export async function createVectorStore(
  documents: Document[],
  collectionName: string = "knowledge_base"
): Promise<Chroma> {
  try {
    console.log(`Creating vector store with collection name: ${collectionName}`);
    
    // Check for OpenAI API Key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set!");
    }

    // Create ChromaDB URL from environment variables or default
    const chromaUrl = `http://${process.env.CHROMA_SERVER_HOST || '0.0.0.0'}:${process.env.CHROMA_SERVER_PORT || '8000'}`;
    console.log(`Connecting to ChromaDB at ${chromaUrl}`);
    
    // First try to reset (delete) the collection if it exists
    try {
      const client = new ChromaClient({ path: chromaUrl });
      const collections = await client.listCollections();
      
      if (collections.includes(collectionName)) {
        console.log(`Collection ${collectionName} exists. Deleting...`);
        await client.deleteCollection({ name: collectionName });
        console.log(`Collection ${collectionName} deleted.`);
      }
    } catch (error: any) {
      console.warn(`Warning: Unable to reset collection: ${error.message}`);
    }
    
    // Initialize OpenAI embeddings with the API key
    const embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-3-large",
      dimensions: 3072,
    });
    
    // Process documents in smaller batches to avoid API errors
    const batchSize = 10;
    const totalDocuments = documents.length;
    let processed = 0;
    let vectorStore: Chroma | null = null;
    
    console.log(`Processing ${totalDocuments} documents in batches of ${batchSize}...`);
    
    for (let i = 0; i < totalDocuments; i += batchSize) {
      const batch = documents.slice(i, Math.min(i + batchSize, totalDocuments));
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(totalDocuments/batchSize)}`);
      
      try {
        // Verify that batch content is properly formatted
        batch.forEach((doc, index) => {
          // Ensure content is a string to avoid API errors
          if (typeof doc.pageContent !== 'string' || doc.pageContent.length < 1) {
            console.warn(`Document ${i + index} has invalid content, setting placeholder`);
            doc.pageContent = "Empty document placeholder";
          }
        });
        
        if (vectorStore === null) {
          // Create the initial vector store with first batch
          vectorStore = await Chroma.fromDocuments(batch, embeddings, {
            collectionName: collectionName,
            url: chromaUrl,
            collectionMetadata: {
              "hnsw:space": "cosine"
            }
          });
          console.log(`Created ${collectionName} collection with first batch of ${batch.length} documents`);
        } else {
          // Add documents to existing collection
          await vectorStore.addDocuments(batch);
          console.log(`Added batch of ${batch.length} documents to collection`);
        }
        
        processed += batch.length;
        console.log(`Progress: ${processed}/${totalDocuments} documents processed`);
        
        // Add a small delay between batches to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err: any) {
        console.error(`Error processing batch: ${err.message}`);
        console.error("Continuing with next batch...");
      }
    }
    
    if (vectorStore === null) {
      throw new Error("Failed to create vector store with any documents");
    }
    
    console.log(`Vector store created successfully with collection: ${collectionName}`);
    return vectorStore;
  } catch (error: any) {
    console.error("Error creating vector store:", error);
    throw error;
  }
}

// Load the vector store
export async function loadVectorStore() {
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-large", // Use large model
    apiKey: process.env.OPENAI_API_KEY, 
    dimensions: 3072 // Explicitly set dimensions for large model
  });

  // Load the existing ChromaDB collection
  return await Chroma.fromExistingCollection(embeddings, {
    collectionName: "knowledge_base",
    url: "http://0.0.0.0:8000", // ChromaDB by default runs on port 8000
  });
}

// Search the vector store for similar documents
export async function searchVectorStore(
  vectorStore: Chroma,
  query: string,
  filter?: any,
  k: number = 5,
) {
  // ChromaDB has a different filtering mechanism than FAISS
  let metadata = undefined;
  if (filter) {
    metadata = filter; // In ChromaDB, we can filter by metadata directly
  }

  return await vectorStore.similaritySearch(query, k, metadata);
}