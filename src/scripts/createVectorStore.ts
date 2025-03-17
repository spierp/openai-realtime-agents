// createVectorStore.ts

import { readMarkdownFiles, createTextChunks, createVectorStore } from '../utils/ragUtils';
import * as path from 'path';

async function main() {
  console.log("Reading markdown files...");
  const knowledgeDir = path.join(process.cwd(), 'knowledge');
  const documents = await readMarkdownFiles(knowledgeDir);
  
  console.log(`Found ${documents.length} markdown files`);
  
  console.log("Creating text chunks...");
  const chunks = await createTextChunks(documents);
  
  console.log(`Created ${chunks.length} text chunks`);
  
  console.log("Creating ChromaDB vector store...");
  const vectorStoreDir = path.join(process.cwd(), 'chroma-db');
  await createVectorStore(chunks, vectorStoreDir);
  
  console.log("ChromaDB vector store created successfully!");
}

main().catch(console.error);
