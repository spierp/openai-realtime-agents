
import { loadVectorStore, searchVectorStore } from './ragUtils';
import * as path from 'path';

export async function searchKnowledge(query: string, filter?: any, k: number = 5) {
  const vectorStoreDir = path.join(process.cwd(), 'chroma-db'); // Updated directory path
  const vectorStore = await loadVectorStore(vectorStoreDir);
  
  return await searchVectorStore(vectorStore, query, filter, k);
}

export async function searchByCategory(query: string, category: string, k: number = 5) {
  return searchKnowledge(query, { category }, k);
}
