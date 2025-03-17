
const { OpenAI } = require("openai");

async function testEmbedding() {
  console.log("Testing OpenAI embedding generation directly...");
  
  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    return;
  }
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: ["test text"],
    });
    console.log("Embeddings generated successfully!");
    console.log(`Dimensions: ${response.data[0].embedding.length}`);
    console.log(`First few values: ${response.data[0].embedding.slice(0, 5)}`);
  } catch (err) {
    console.error("Error generating embeddings:", err);
  }
}

testEmbedding();
