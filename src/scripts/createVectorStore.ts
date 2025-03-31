// createVectorStore.ts

import { readMarkdownFiles, createTextChunks, createVectorStore } from '../utils/ragUtils';
import * as path from 'path';

async function main() {
  console.log("Reading markdown files...");
  const knowledgeDir = path.join(process.cwd(), 'knowledge');
  const result = await readMarkdownFiles(knowledgeDir);
  
  console.log(`Found ${result.fileCount} markdown files (${result.documents.length} valid documents, ${result.errorCount} errors)`);
  
  console.log("Creating text chunks...");
  const chunks = await createTextChunks(result.documents);
  
  console.log(`Created ${chunks.length} text chunks`);
  
  console.log("Creating ChromaDB vector store...");
  const vectorStoreDir = path.join(process.cwd(), 'chroma-db');
  await createVectorStore(chunks, vectorStoreDir);
  
  console.log("ChromaDB vector store created successfully!");
}

main().catch(console.error);
