
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

export async function searchByPrimaryCategory(query: string, primaryCategory: string, k: number = 5) {
  return searchKnowledge(query, { primary_category: primaryCategory }, k);
}

export async function searchBySecondaryCategory(query: string, secondaryCategory: string, k: number = 5) {
  return searchKnowledge(query, { secondary_category: secondaryCategory }, k);
}

export async function searchByMultiLevelCategory(
  query: string, 
  options: { 
    primary_category?: string, 
    secondary_category?: string, 
    tertiary_category?: string 
  }, 
  k: number = 5
) {
  return searchKnowledge(query, options, k);
}
