import { Tool } from "@/app/types";
import { queryKnowledgeBase, createCategoryFilter } from "./service";

/**
 * Create a RAG tool that can be shared across agents
 * 
 * @param defaultFilters - Default metadata filters to apply to all queries
 * @param toolName - Custom name for the tool (defaults to "queryKnowledgeBase")
 * @returns A tool configuration object ready to be added to an agent
 */
export function createRagTool(
  defaultFilters: Record<string, any> = {},
  toolName: string = "queryKnowledgeBase"
): Tool {
  return {
    type: "function",
    name: toolName,
    description: `
      Query your knowledge base to retrieve relevant information.
      The search uses semantic similarity to find the most relevant documents that match your query.
      You can use this to retrieve personal notes, documents, or other information stored in your knowledge base.
    `,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to find relevant information",
        },
        primaryCategory: {
          type: "string",
          description: "Optional: Filter by primary category (e.g., 'Personal', 'Work', 'Projects')",
        },
        secondaryCategory: {
          type: "string",
          description: "Optional: Filter by secondary category",
        },
        maxResults: {
          type: "number",
          description: "Optional: Maximum number of results to return (default: 5)",
        },
      },
      required: ["query"],
    },
  };
}

/**
 * Create the tool logic function for the RAG tool
 * 
 * @param defaultFilters - Default metadata filters to apply to all queries
 * @returns A function that can be used in the agent's toolLogic
 */
export function createRagToolLogic(defaultFilters: Record<string, any> = {}) {
  return async function ragToolLogic({ 
    query, 
    primaryCategory, 
    secondaryCategory, 
    maxResults = 5 
  }: {
    query: string;
    primaryCategory?: string;
    secondaryCategory?: string;
    maxResults?: number;
  }) {
    try {
      // Combine default filters with any category filters
      const categoryFilter = createCategoryFilter({ 
        primaryCategory, 
        secondaryCategory 
      });
      
      const combinedFilters = {
        ...defaultFilters,
        ...categoryFilter
      };
      
      // Query the knowledge base
      const results = await queryKnowledgeBase({
        query,
        filters: combinedFilters,
        maxResults
      });
      
      return results;
    } catch (error) {
      console.error("Error in RAG tool logic:", error);
      return {
        error: `Failed to query knowledge base: ${error instanceof Error ? error.message : String(error)}`,
        results: []
      };
    }
  };
} 