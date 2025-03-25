/**
 * Core RAG (Retrieval-Augmented Generation) service for querying the knowledge base
 */

/**
 * Query the knowledge base with filtering options
 */
export async function queryKnowledgeBase({ 
  query, 
  filters = {}, 
  maxResults = 5 
}: {
  query: string;
  filters?: Record<string, any>;
  maxResults?: number;
}) {
  try {
    // Call the API endpoint instead of directly using ChromaDB
    const response = await fetch('/api/rag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        filters,
        maxResults
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    
    // Parse and return the API response
    return await response.json();
    
  } catch (error) {
    console.error("Error querying knowledge base:", error);
    return {
      error: `Failed to query knowledge base: ${error instanceof Error ? error.message : String(error)}`,
      results: []
    };
  }
}

/**
 * Create a filter for querying specific categories
 */
export function createCategoryFilter({
  primaryCategory,
  secondaryCategory,
  tertiaryCategory
}: {
  primaryCategory?: string;
  secondaryCategory?: string;
  tertiaryCategory?: string;
}) {
  const filter: Record<string, any> = {};
  const conditions = [];
  
  if (primaryCategory) {
    conditions.push({ primary_category: primaryCategory });
  }
  
  if (secondaryCategory) {
    conditions.push({ secondary_category: secondaryCategory });
  }
  
  if (tertiaryCategory) {
    conditions.push({ tertiary_category: tertiaryCategory });
  }
  
  if (conditions.length === 1) {
    // Single condition
    return conditions[0];
  } else if (conditions.length > 1) {
    // Multiple conditions with AND
    return { $and: conditions };
  }
  
  return filter; // Empty filter
} 