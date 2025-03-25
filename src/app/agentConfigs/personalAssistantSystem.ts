import { AgentConfig } from "@/app/types";
import { createRagTool, createRagToolLogic } from "./utils/rag";
import { injectTransferTools } from "./utils";

// Import individual agent definitions (without their transfer tools)
import familyAssistantAgents from "./familyAssistant";
import healthWellnessAgents from "./healthWellnessAgent";

// Extract the raw agent definitions without transfer tools
const familyAssistant = familyAssistantAgents[0];
const healthWellness = healthWellnessAgents[0];

// Define a central dispatcher agent that can route to specialized agents
const centralDispatcher: AgentConfig = {
  name: "personal_assistant",
  publicDescription: "Your main personal assistant that can help with various tasks and questions.",
  instructions: `
# Personality and Tone
You are a friendly, efficient personal assistant designed to help with a variety of tasks. Your tone is conversational,
helpful, and adaptive to the user's needs. You are responsive, concise, and focused on addressing the user's requests effectively.

# Your Capabilities
- You can handle general questions and requests
- You can retrieve information from the user's personal knowledge base
- You can transfer the user to specialized agents when appropriate

# When to Transfer to Specialized Agents
- For family-related questions, schedules, or personal information:
  → Transfer to the 'family_assistant' agent
- For health tracking, wellness recommendations, or fitness-related questions:
  → Transfer to the 'health_wellness' agent

# Transfer Guidelines
- Only transfer when the specialized agent would clearly provide better assistance
- Briefly explain why you're transferring before doing so
- If a request spans multiple domains, handle what you can and then transfer
- If unsure, try to help first before transferring

# Knowledge Retrieval Guidelines
- Use the queryKnowledgeBase tool to find relevant information
- For general queries, search without specific category filters
- Present information clearly and concisely

# General Guidelines
- Always prioritize being helpful and providing value
- Be conversational but efficient
- If you don't know something, be honest about it
- Always respect user privacy and security
  `,
  tools: [
    // Add the RAG tool with no specific filters
    createRagTool(),
    // Additional tools can be added here
  ],
  toolLogic: {
    // Add the RAG tool logic with no specific filters
    queryKnowledgeBase: createRagToolLogic()
    // Additional tool logic can be added here
  },
  // Set up downstream agents for transfer capabilities
  downstreamAgents: [
    {
      name: familyAssistant.name,
      publicDescription: familyAssistant.publicDescription
    },
    {
      name: healthWellness.name,
      publicDescription: healthWellness.publicDescription
    }
  ],
};

// Connect the agents so they can transfer to each other
// Family Assistant can transfer to Health & Wellness
familyAssistant.downstreamAgents = [
  {
    name: healthWellness.name,
    publicDescription: healthWellness.publicDescription
  }
];

// Health & Wellness can transfer to Family Assistant
healthWellness.downstreamAgents = [
  {
    name: familyAssistant.name,
    publicDescription: familyAssistant.publicDescription
  }
];

// Create the complete agent system with all agents
const personalAssistantSystem = [
  centralDispatcher,
  familyAssistant,
  healthWellness
];

// Inject transfer tools and export the complete system
const agents = injectTransferTools(personalAssistantSystem);
export default agents; 