// Simple script to test OpenAI embeddings with text-embedding-3-large
require('dotenv').config();
const { OpenAIEmbeddingFunction } = require("chromadb");

async function testEmbeddings() {
  console.log("Testing OpenAI embeddings with text-embedding-3-large...");

  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    process.exit(1);
  }

  // Create embedder with verbose logging
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY, 
    openai_model: "text-embedding-3-large",
    debug: true,
    axios: {
      interceptors: {
        request: [(config) => {
          console.log('OpenAI API Request:', {
            model: config.data ? JSON.parse(config.data).model : 'unknown',
            body: config.data ? JSON.parse(config.data) : 'none'
          });
          return config;
        }],
        response: [(response) => {
          console.log('OpenAI API Response:', {
            status: response.status,
            headers: response.headers,
            model_used: response.data.model,
            embedding_dimension: response.data.data?.[0]?.embedding?.length,
            embedding_sample: response.data.data?.[0]?.embedding?.slice(0, 5)
          });
          return response;
        }]
      }
    }
  });

  try {
    console.log("Generating embeddings for test text...");
    const texts = ["Hello world", "Testing embeddings"];
    const embeddings = await embedder.generate(texts);
    
    console.log("Embeddings generated successfully!");
    console.log("Number of embeddings:", embeddings.length);
    console.log("Embedding dimensions:", embeddings[0].length);
    console.log("Sample embedding values (first 5):", embeddings[0].slice(0, 5));
  } catch (err) {
    console.error("Error generating embeddings:", err);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
  }
}

testEmbeddings(); 