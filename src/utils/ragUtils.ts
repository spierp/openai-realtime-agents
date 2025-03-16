
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import * as fs from 'fs';
import * as path from 'path';

// Function to recursively read markdown files from a directory
export async function readMarkdownFiles(dirPath: string): Promise<Document[]> {
  const documents: Document[] = [];
  
  const readDir = async (currentPath: string) => {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        await readDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = path.relative(dirPath, fullPath);
        
        documents.push(
          new Document({
            pageContent: content,
            metadata: {
              source: relativePath,
              fileName: entry.name
            }
          })
        );
      }
    }
  };
  
  await readDir(dirPath);
  return documents;
}

// Function to create text chunks from documents
export async function createTextChunks(documents: Document[]) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  
  return await textSplitter.splitDocuments(documents);
}

// Create and save the vector store
export async function createVectorStore(documents: Document[], directory: string) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  
  const embeddings = new OpenAIEmbeddings();
  
  // Create a ChromaDB collection with a specified name
  const collectionName = "knowledge_base";
  const vectorStore = await Chroma.fromDocuments(
    documents, 
    embeddings, 
    { 
      collectionName: collectionName,
      url: "http://localhost:8000", // ChromaDB by default runs on port 8000
      collectionMetadata: {
        "hnsw:space": "cosine" // Using cosine similarity
      }
    }
  );
  
  return vectorStore;
}

// Load the vector store
export async function loadVectorStore(directory: string) {
  const embeddings = new OpenAIEmbeddings();
  
  // Load the existing ChromaDB collection
  return await Chroma.fromExistingCollection(
    embeddings,
    { 
      collectionName: "knowledge_base",
      url: "http://localhost:8000" // ChromaDB by default runs on port 8000
    }
  );
}

// Search the vector store for similar documents
export async function searchVectorStore(vectorStore: Chroma, query: string, filter?: any, k: number = 5) {
  // ChromaDB has a different filtering mechanism than FAISS
  let metadata = undefined;
  if (filter) {
    metadata = filter; // In ChromaDB, we can filter by metadata directly
  }
  
  return await vectorStore.similaritySearch(query, k, metadata);
}
