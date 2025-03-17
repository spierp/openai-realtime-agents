const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testEmbedding() {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: ["test text"],
    });
    console.log("Embeddings generated successfully:", response.data);
  } catch (err) {
    console.error("Error generating embeddings:", err);
  }
}

testEmbedding();
