
import { readMarkdownFiles, createTextChunks, createVectorStore } from '../utils/ragUtils';
import * as path from 'path';
import * as fs from 'fs';
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";

interface FileIndex {
  [filePath: string]: {
    lastModified: number;
    fileSize: number;
  };
}

// File to store the index data
const INDEX_FILE = path.join(process.cwd(), 'knowledge-index.json');
const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge');
const VECTOR_STORE_DIR = path.join(process.cwd(), 'chroma-db');

// Function to load the previous index
function loadIndex(): FileIndex {
  if (fs.existsSync(INDEX_FILE)) {
    const data = fs.readFileSync(INDEX_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

// Function to save the current index
function saveIndex(index: FileIndex) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

// Function to scan the knowledge directory and create an index
async function scanDirectory(dir: string, baseDir: string = dir): Promise<FileIndex> {
  const index: FileIndex = {};
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      const subIndex = await scanDirectory(fullPath, baseDir);
      Object.assign(index, subIndex);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const stats = fs.statSync(fullPath);
      // Store the path relative to knowledge directory
      const relativePath = path.relative(baseDir, fullPath);
      index[relativePath] = {
        lastModified: stats.mtimeMs,
        fileSize: stats.size
      };
    }
  }

  return index;
}

// Function to compare indices and identify changes
async function identifyChanges(oldIndex: FileIndex, newIndex: FileIndex) {
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];

  // Find added and modified files
  for (const filePath in newIndex) {
    if (!oldIndex[filePath]) {
      added.push(filePath);
    } else if (
      newIndex[filePath].lastModified !== oldIndex[filePath].lastModified ||
      newIndex[filePath].fileSize !== oldIndex[filePath].fileSize
    ) {
      modified.push(filePath);
    }
  }

  // Find deleted files
  for (const filePath in oldIndex) {
    if (!newIndex[filePath]) {
      deleted.push(filePath);
    }
  }

  return { added, modified, deleted };
}

// Function to update the vector store
async function updateVectorStore(changes: { added: string[], modified: string[], deleted: string[] }) {
  // Only proceed if there are changes
  if (changes.added.length === 0 && changes.modified.length === 0 && changes.deleted.length === 0) {
    console.log("No changes detected in knowledge directory.");
    return;
  }

  console.log(`Changes detected: ${changes.added.length} added, ${changes.modified.length} modified, ${changes.deleted.length} deleted`);

  // Setup OpenAI embeddings
  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-large",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Get the ChromaDB collection
  const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: "knowledge_base",
    url: "http://0.0.0.0:8000",
  });

  // Process deleted files
  if (changes.deleted.length > 0) {
    console.log("Removing deleted files from vector store...");
    
    for (const filePath of changes.deleted) {
      const fullPath = path.join(KNOWLEDGE_DIR, filePath);
      await vectorStore.delete({
        filter: { source: fullPath }
      });
      console.log(`Deleted vectors for: ${filePath}`);
    }
  }

  // Process added and modified files
  if (changes.added.length > 0 || changes.modified.length > 0) {
    console.log("Processing added and modified files...");
    
    // Prepare list of files to process
    const filesToProcess = [...changes.added, ...changes.modified];
    
    // Read and process each file
    const documents: Document[] = [];
    
    for (const filePath of filesToProcess) {
      const fullPath = path.join(KNOWLEDGE_DIR, filePath);
      
      // First, if it's a modified file, remove the old vectors
      if (changes.modified.includes(filePath)) {
        await vectorStore.delete({
          filter: { source: fullPath }
        });
        console.log(`Removed previous vectors for modified file: ${filePath}`);
      }
      
      // Read the file content
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Get directory path for category
      const category = path.dirname(filePath);
      
      // Split the path into segments for hierarchical categorization
      const pathSegments = category.split(path.sep).filter(segment => segment.length > 0);
      
      // Extract frontmatter tags if they exist
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      let tags: string[] = [];
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const tagsMatch = frontmatter.match(/tags:\n(\s+- [^\n]+\n?)+/);
        if (tagsMatch) {
          tags = tagsMatch[0]
            .split('\n')
            .filter(line => line.trim().startsWith('- '))
            .map(line => line.replace(/^\s*- /, '').trim());
        }
      }
      
      // Create metadata
      const metadata: Record<string, any> = {
        source: fullPath,
        fileName: path.basename(filePath),
        category: category,
        tags: tags,
      };
      
      // Add hierarchical categories
      if (pathSegments.length > 0) {
        metadata.primary_category = pathSegments[0];
        
        if (pathSegments.length > 1) {
          metadata.secondary_category = pathSegments[1];
          
          if (pathSegments.length > 2) {
            metadata.tertiary_category = pathSegments[2];
            
            if (pathSegments.length > 3) {
              metadata.additional_categories = pathSegments.slice(3);
            }
          }
        }
      }
      
      // Add document
      documents.push(
        new Document({
          pageContent: content,
          metadata: metadata,
        })
      );
      
      console.log(`Processed file: ${filePath}`);
    }
    
    // Create chunks and add to vector store
    if (documents.length > 0) {
      console.log("Creating text chunks...");
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1500,
        chunkOverlap: 300,
      });
      const chunks = await textSplitter.splitDocuments(documents);
      
      console.log(`Created ${chunks.length} text chunks from ${documents.length} documents`);
      
      console.log("Adding chunks to vector store...");
      await vectorStore.addDocuments(chunks);
      
      console.log("Successfully added documents to vector store!");
    }
  }
}

async function main() {
  try {
    console.log("Scanning knowledge directory for changes...");
    
    // Load previous index
    const oldIndex = loadIndex();
    
    // Create new index
    const newIndex = await scanDirectory(KNOWLEDGE_DIR);
    
    // Identify changes
    const changes = await identifyChanges(oldIndex, newIndex);
    
    // Update vector store with changes
    await updateVectorStore(changes);
    
    // Save the new index
    saveIndex(newIndex);
    
    console.log("Vector store update complete!");
  } catch (error) {
    console.error("Error updating vector store:", error);
  }
}

// Call the main function
if (require.main === module) {
  main().catch(console.error);
}

// Export for potential programmatic use
export { main as updateVectorStore };
