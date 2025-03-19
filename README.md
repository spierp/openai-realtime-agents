# Realtime API Agents Demo

This is a simple demonstration of more advanced, agentic patterns built on top of the Realtime API. In particular, this demonstrates:
- Sequential agent handoffs according to a defined agent graph (taking inspiration from [OpenAI Swarm](https://github.com/openai/swarm))
- Background escalation to more intelligent models like o1-mini for high-stakes decisions
- Prompting models to follow a state machine, for example to accurately collect things like names and phone numbers with confirmation character by character to authenticate a user.

You should be able to use this repo to prototype your own multi-agent realtime voice app in less than 20 minutes!

![Screenshot of the Realtime API Agents Demo](/public/screenshot.png)

## Setup

- This is a Next.js typescript app
- Install dependencies with `npm i`
- Add your `OPENAI_API_KEY` to your env
- Start the server with `npm run dev`
- Open your browser to [http://localhost:3000](http://localhost:3000) to see the app. It should automatically connect to the `simpleExample` Agent Set.

## Configuring Agents
Configuration in `src/app/agentConfigs/simpleExample.ts`
```javascript
import { AgentConfig } from "@/app/types";
import { injectTransferTools } from "./utils";

// Define agents
const haiku: AgentConfig = {
  name: "haiku",
  publicDescription: "Agent that writes haikus.", // Context for the agent_transfer tool
  instructions:
    "Ask the user for a topic, then reply with a haiku about that topic.",
  tools: [],
};

const greeter: AgentConfig = {
  name: "greeter",
  publicDescription: "Agent that greets the user.",
  instructions:
    "Please greet the user and ask them if they'd like a Haiku. If yes, transfer them to the 'haiku' agent.",
  tools: [],
  downstreamAgents: [haiku],
};

// add the transfer tool to point to downstreamAgents
const agents = injectTransferTools([greeter, haiku]);

export default agents;
```

This fully specifies the agent set that was used in the interaction shown in the screenshot above.

### Next steps
- Check out the configs in `src/app/agentConfigs`. The example above is a minimal demo that illustrates the core concepts.
- [frontDeskAuthentication](src/app/agentConfigs/frontDeskAuthentication) Guides the user through a step-by-step authentication flow, confirming each value character-by-character, authenticates the user with a tool call, and then transfers to another agent. Note that the second agent is intentionally "bored" to show how to prompt for personality and tone.
- [customerServiceRetail](src/app/agentConfigs/customerServiceRetail) Also guides through an authentication flow, reads a long offer from a canned script verbatim, and then walks through a complex return flow which requires looking up orders and policies, gathering user context, and checking with `o1-mini` to ensure the return is eligible. To test this flow, say that you'd like to return your snowboard and go through the necessary prompts!

### Defining your own agents
- You can copy these to make your own multi-agent voice app! Once you make a new agent set config, add it to `src/app/agentConfigs/index.ts` and you should be able to select it in the UI in the "Scenario" dropdown menu.
- To see how to define tools and toolLogic, including a background LLM call, see [src/app/agentConfigs/customerServiceRetail/returns.ts](src/app/agentConfigs/customerServiceRetail/returns.ts)
- To see how to define a detailed personality and tone, and use a prompt state machine to collect user information step by step, see [src/app/agentConfigs/frontDeskAuthentication/authentication.ts](src/app/agentConfigs/frontDeskAuthentication/authentication.ts)
- To see how to wire up Agents into a single Agent Set, see [src/app/agentConfigs/frontDeskAuthentication/index.ts](src/app/agentConfigs/frontDeskAuthentication/index.ts)
- If you want help creating your own prompt using these conventions, we've included a metaprompt [here](src/app/agentConfigs/voiceAgentMetaprompt.txt), or you can use our [Voice Agent Metaprompter GPT](https://chatgpt.com/g/g-678865c9fb5c81918fa28699735dd08e-voice-agent-metaprompt-gpt)

## UI
- You can select agent scenarios in the Scenario dropdown, and automatically switch to a specific agent with the Agent dropdown.
- The conversation transcript is on the left, including tool calls, tool call responses, and agent changes. Click to expand non-message elements.
- The event log is on the right, showing both client and server events. Click to see the full payload.
- On the bottom, you can disconnect, toggle between automated voice-activity detection or PTT, turn off audio playback, and toggle logs.

## Core Contributors
- Noah MacCallum - [noahmacca](https://x.com/noahmacca)
- Ilan Bigio - [ibigio](https://github.com/ibigio)

# OpenAI Realtime Agents

A hobby project demonstrating the OpenAI Realtime API with a Next.js frontend and ChromaDB for vector storage.

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/openai-realtime-agents.git
   cd openai-realtime-agents
   ```

2. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
   
3. Add your API keys and configuration to `.env`

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Docker Deployment

### Local Testing

1. Make sure Docker and Docker Compose are installed on your system

2. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

3. Add your API keys and configuration to `.env`

4. Run the deployment script:
   ```bash
   ./deploy.sh
   ```

5. Access your application:
   - Next.js frontend: http://localhost:3000
   - ChromaDB server: http://localhost:8000

### Production Deployment (DigitalOcean)

1. Create a DigitalOcean Droplet (Basic $10/month plan is sufficient)
   - Choose Ubuntu 22.04 LTS
   - Add your SSH key for secure access

2. SSH into your Droplet:
   ```bash
   ssh root@your_droplet_ip
   ```

3. Install Docker and Docker Compose:
   ```bash
   apt update
   apt install -y docker.io docker-compose
   systemctl enable docker
   systemctl start docker
   ```

4. Clone your repository:
   ```bash
   git clone https://github.com/yourusername/openai-realtime-agents.git
   cd openai-realtime-agents
   ```

5. Create a `.env` file with your production settings:
   ```bash
   cp .env.example .env
   nano .env  # Edit your settings
   ```

6. Make the deployment script executable and run it:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

7. Set up a firewall:
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 3000/tcp  # For Next.js (if not using a reverse proxy)
   ufw allow 8000/tcp  # For ChromaDB (if needed externally)
   ufw enable
   ```

8. (Optional) Set up Nginx as a reverse proxy:
   ```bash
   apt install -y nginx
   
   # Configure Nginx (sample config)
   nano /etc/nginx/sites-available/default
   
   # Restart Nginx
   systemctl restart nginx
   ```

9. (Optional) Set up SSL with Let's Encrypt:
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```

## Docker Images

This project uses a simple and straightforward approach for Docker images:

- **Next.js**: Uses Node.js slim image for simplicity and compatibility
- **ChromaDB**: Uses Python slim image for ChromaDB's dependencies

This simple approach prioritizes:
- Ease of maintenance
- Simplicity in configuration
- Reliability across environments

## Configuration

See `.env.example` for all available configuration options.

## Backup Strategy

The deployment script includes an optional backup feature. Set `BACKUP_DIR` and `BACKUP_RETENTION_DAYS` in your `.env` file to enable automated daily backups.

## Troubleshooting

- **Container not starting**: Check logs with `docker-compose logs`
- **Next.js build failing**: Try `docker-compose build --no-cache nextjs`
- **ChromaDB connection issues**: Ensure the environment variables in `.env` are correct

## License

[MIT License](LICENSE)
