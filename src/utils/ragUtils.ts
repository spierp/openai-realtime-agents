import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import * as fs from "fs";
import * as path from "path";

// Function to read all markdown files from a directory recursively
export async function readMarkdownFiles(dirPath: string): Promise<Document[]> {
  const documents: Document[] = [];

  async function processDirectory(
    currentPath: string,
    relativePath: string = "",
  ) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        await processDirectory(fullPath, entryRelativePath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        // Extract category from path (e.g., "Health & Wellness/Mental")
        const category = path.dirname(entryRelativePath);

        documents.push(
          new Document({
            pageContent: content,
            metadata: {
              source: fullPath,
              fileName: entry.name,
              category: category,
            },
          }),
        );
      }
    }
  }

  await processDirectory(dirPath);
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
export async function createVectorStore(
  documents: Document[],
  directory: string,
) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  const embeddings = new OpenAIEmbeddings({
    openai_api_key: process.env.OPENAI_API_KEY,
    //model: "text-embedding-3-large",
  });

  // Create a ChromaDB collection with a specified name
  const collectionName = "knowledge_base";
  const vectorStore = await Chroma.fromDocuments(documents, embeddings, {
    collectionName: collectionName,
    url: "http://0.0.0.0:8000", // ChromaDB by default runs on port 8000
  });

  return vectorStore;
}

// Load the vector store
export async function loadVectorStore(directory: string) {
  const embeddings = new OpenAIEmbeddings({
    // model: "text-embedding-3-large",
    openai_api_key: process.env.OPENAI_API_KEY,
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
