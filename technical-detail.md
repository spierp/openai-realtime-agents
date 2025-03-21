# OpenAI Realtime Agents: Technical Documentation

## Overview

The OpenAI Realtime Agents application is a framework for building and deploying voice-based conversational agents powered by OpenAI's realtime models. The application enables the creation of multi-agent workflows where users can interact with different specialized agents that can transfer control between each other as needed.

## System Architecture

### Core Components

1. **Client-side Application (Next.js/React)**
   - Manages UI rendering, audio streaming, and WebRTC communication
   - Handles state management through React contexts 
   - Processes server events and updates the UI accordingly

2. **Realtime Connection (WebRTC)**
   - Establishes peer connections with OpenAI's API
   - Streams audio input from the user to the OpenAI API
   - Receives audio output and events from the API

3. **Agent System**
   - Configurable agent definitions with instructions, tools, and workflows
   - Tool invocation and execution logic
   - Agent-to-agent transfer mechanism

## Technical Flow

### Connection Initialization

1. The application requests an ephemeral API key from the server via `/api/session`
2. Using this key, it establishes a WebRTC connection with OpenAI's realtime API
3. The connection includes:
   - A data channel for sending/receiving JSON events
   - Audio tracks for streaming user voice input and receiving AI voice output

### Communication Protocol

The system uses a bidirectional event-based communication protocol:

1. **Client Events**: Sent from the application to the OpenAI API
   - `session.update`: Updates agent configuration and settings
   - `conversation.item.create`: Sends user messages or tool outputs
   - `response.create`: Triggers the model to generate a response
   - `input_audio_buffer.clear`: Clears audio buffer when needed

2. **Server Events**: Received from the OpenAI API
   - Transcript updates (speech-to-text)
   - Assistant responses (text generation)
   - Tool call requests
   - Audio streaming events

### Agent Configuration

Agents are defined in the `src/app/agentConfigs` directory and follow this structure:

```typescript
interface AgentConfig {
  name: string;
  publicDescription: string;
  instructions: string;
  tools: Tool[];
  toolLogic?: Record<string, Function>;
  downstreamAgents?: AgentConfig[] | { name: string; publicDescription: string }[];
}
```

Components:
- **name**: Unique identifier for the agent
- **publicDescription**: Description shown to other agents for transfer context
- **instructions**: Prompt defining agent behavior, personality, and capabilities
- **tools**: Available tools/functions the agent can use
- **toolLogic**: Implementation of tool functionality
- **downstreamAgents**: Other agents this agent can transfer to

### Tool System

Tools enable agents to perform actions beyond simple conversation:

1. **Definition**: Tools are defined with a name, description, and parameter schema
2. **Invocation**: The model can call tools by sending a function call event
3. **Execution**: The client executes the tool logic and returns results
4. **Response**: Results are sent back to the model to continue the conversation

### Agent Transfer Mechanism

The application supports seamless transitions between specialized agents:

1. A special `transferAgents` tool is automatically injected into agents with `downstreamAgents`
2. When invoked, the system:
   - Identifies the target agent from the `destination_agent` parameter
   - Updates the active agent configuration
   - Preserves conversation context across the transfer
   - Returns transfer success/failure to the model

## State Management

The application uses React contexts to manage application state:

1. **TranscriptContext**: Manages conversation history
   - Stores messages, tool calls, and breadcrumbs
   - Provides methods to add/update transcript items

2. **EventContext**: Tracks client and server events
   - Logs events for debugging and auditing
   - Formats and displays events in the UI

## Agent Implementation Patterns

### Prompt State Machines

Complex agent workflows are implemented using state machines in the instructions:

```json
{
  "id": "1_greeting",
  "description": "Begin with a friendly greeting",
  "instructions": ["Use company name", "Offer help"],
  "transitions": [{"next_step": "2_get_name", "condition": "After greeting"}]
}
```

### Authentication Flows

Agents can implement structured authentication processes:
- Step-by-step collection of identifying information
- Character-by-character verification of inputs
- Tool-based validation of credentials
- Security checkpoints before accessing sensitive functionality

### Tool-augmented Reasoning

Agents can use tools to access external information and capabilities:
- Database lookups (orders, policies, user information)
- Background LLM calls for specialized reasoning
- Business logic execution (return processing, eligibility checking)

## Technical Implementation Details

### WebRTC Implementation

```typescript
export async function createRealtimeConnection(
  EPHEMERAL_KEY: string,
  audioElement: RefObject<HTMLAudioElement | null>
): Promise<{ pc: RTCPeerConnection; dc: RTCDataChannel }> {
  const pc = new RTCPeerConnection();
  pc.ontrack = (e) => {
    if (audioElement.current) {
      audioElement.current.srcObject = e.streams[0];
    }
  };

  const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
  pc.addTrack(ms.getTracks()[0]);

  const dc = pc.createDataChannel("oai-events");
  // Connection setup logic...
  
  return { pc, dc };
}
```

### Event Handling

The application uses a custom hook to handle server events:

```typescript
export function useHandleServerEvent({
  setSessionStatus,
  selectedAgentName,
  selectedAgentConfigSet,
  sendClientEvent,
  setSelectedAgentName,
}: UseHandleServerEventParams) {
  // Event handling logic for different types of events
  // Including function calls, transcripts, and messages
}
```

### Dynamic Tool Injection

Tools are dynamically injected into agents using utility functions:

```typescript
export function injectTransferTools(agentDefs: AgentConfig[]): AgentConfig[] {
  agentDefs.forEach((agentDef) => {
    const downstreamAgents = agentDef.downstreamAgents || [];
    
    if (downstreamAgents.length > 0) {
      // Create transfer tool based on downstream agents
      const transferAgentTool = {...};
      agentDef.tools.push(transferAgentTool);
    }
  });
  
  return agentDefs;
}
```

## Agent Configuration Examples

### Simple Example

```typescript
const haiku: AgentConfig = {
  name: "haiku",
  publicDescription: "Agent that writes haikus.",
  instructions: "Ask the user for a topic, then reply with a haiku about that topic.",
  tools: [],
};

const greeter: AgentConfig = {
  name: "greeter",
  publicDescription: "Agent that greets the user.",
  instructions: "Greet the user and ask if they'd like a Haiku. If yes, transfer them to the 'haiku' agent.",
  tools: [],
  downstreamAgents: [haiku],
};

const agents = injectTransferTools([greeter, haiku]);
```

### Complex Example: Customer Service

A complex customer service implementation can include:
- Multiple specialized agents (authentication, returns, sales)
- Structured conversation flows
- Tool integration for business logic
- Personality and tone definitions
- Authentication requirements

## Conclusion

The OpenAI Realtime Agents application provides a powerful framework for building voice-based conversational agents with specialized capabilities. By leveraging WebRTC for realtime communication and a flexible agent configuration system, developers can create sophisticated multi-agent workflows that handle complex customer interactions. 