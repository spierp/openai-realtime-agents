// ragUtils.ts

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

        // Get the full directory path relative to knowledge directory
        const category = path.dirname(entryRelativePath);

        // Split the path into segments for hierarchical categorization
        const pathSegments = category.split(path.sep).filter(segment => segment.length > 0);
        console.log(`File: ${entry.name}, Path: ${entryRelativePath}`);
        console.log(`Path segments: ${JSON.stringify(pathSegments)}`);

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

        // Create metadata with hierarchical categories
        const metadata: Record<string, any> = {
          source: fullPath,
          fileName: entry.name,
          category: category, // Keep original for backward compatibility
          tags: tags, // Add tags from frontmatter
        };

        // Add primary, secondary, tertiary categories based on directory levels
        if (pathSegments.length > 0) {
          metadata.primary_category = pathSegments[0];
          console.log(`Setting primary_category: ${pathSegments[0]}`);

          if (pathSegments.length > 1) {
            metadata.secondary_category = pathSegments[1];
            console.log(`Setting secondary_category: ${pathSegments[1]}`);

            if (pathSegments.length > 2) {
              metadata.tertiary_category = pathSegments[2];
              console.log(`Setting tertiary_category: ${pathSegments[2]}`);

              // For very deep hierarchies, store the rest as an array
              if (pathSegments.length > 3) {
                metadata.additional_categories = pathSegments.slice(3);
                console.log(`Setting additional_categories: ${JSON.stringify(pathSegments.slice(3))}`);
              }
            }
          }
        }

        documents.push(
          new Document({
            pageContent: content,
            metadata: metadata,
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
    chunkSize: 1500,
    chunkOverlap: 300,
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

  const embeddingModel = "text-embedding-3-large";
  console.log(`Creating embeddings using model: ${embeddingModel}`);
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY, // LangChain uses camelCase
    modelName: embeddingModel, // LangChain uses camelCase
    callbacks: [{
      handleLLMEnd: (output) => {
        console.log("OpenAI Embedding Response:", {
          model: output.model,
          tokenUsage: output.tokenUsage,
          startTime: output.startTime,
          endTime: output.endTime
        });
      }
    }]
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
    modelName: "text-embedding-3-large", // LangChain uses camelCase
    openAIApiKey: process.env.OPENAI_API_KEY, // LangChain uses camelCase
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