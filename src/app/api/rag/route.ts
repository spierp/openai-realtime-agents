import { NextRequest, NextResponse } from 'next/server';

// Server-only runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configure environment variables
const CHROMA_HOST = process.env.CHROMA_SERVER_HOST || '0.0.0.0';
const CHROMA_PORT = process.env.CHROMA_SERVER_PORT || '8000';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'knowledge_base';

// Function to format results
function formatResults(results: any) {
  if (!results || !results.documents || !results.metadatas) {
    return { 
      count: 0, 
      results: [] 
    };
  }
  
  const formattedResults = results.documents[0].map((doc: string, index: number) => {
    return {
      content: doc,
      metadata: results.metadatas[0][index] || {},
      relevance_score: results.distances ? 1 - (results.distances[0][index] || 0) : 1
    };
  });
  
  return {
    count: formattedResults.length,
    results: formattedResults
  };
}

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key is required but not found in environment variables" },
      { status: 500 }
    );
  }
  
  try {
    // Import chromadb dynamically - this runs only on the server
    const { ChromaClient } = await import('chromadb');
    
    // Parse request body
    const body = await req.json();
    const { query, filters = {}, maxResults = 5 } = body;
    
    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }
    
    // Create client
    const client = new ChromaClient({ 
      path: `http://${CHROMA_HOST}:${CHROMA_PORT}`
    });
    
    // Create a custom embedding function for OpenAI API
    const embeddingFunction = {
      generate: async (texts: string[]): Promise<number[][]> => {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            input: texts,
            model: EMBEDDING_MODEL
          })
        });
        
        if (!response.ok) {
          throw new Error(`OpenAI API returned ${response.status}: ${await response.text()}`);
        }
        
        const result = await response.json();
        return result.data.map((item: any) => item.embedding);
      }
    };
    
    // Get collection
    const collection = await client.getCollection({
      name: COLLECTION_NAME,
      embeddingFunction
    });
    
    // Build query parameters
    const queryParams: any = {
      queryTexts: [query],
      nResults: maxResults,
      include: ["documents", "metadatas", "distances"]
    };
    
    // Add filters if they exist
    if (Object.keys(filters).length > 0) {
      queryParams.where = filters;
    }
    
    // Execute query
    const results = await collection.query(queryParams);
    
    // Return formatted results
    return NextResponse.json(formatResults(results));
    
  } catch (error) {
    console.error("Error querying knowledge base:", error);
    return NextResponse.json(
      { 
        error: `Failed to query knowledge base: ${error instanceof Error ? error.message : String(error)}`,
        results: [] 
      },
      { status: 500 }
    );
  }
} 