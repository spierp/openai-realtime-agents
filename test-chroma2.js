const { OpenAIEmbeddingFunction } = require("chromadb");
const embedder = new OpenAIEmbeddingFunction({
  openai_api_key: process.env.OPENAI_API_KEY,
  model_name: "text-embedding-ada-002",
});
async function testEmbedding() {
  try {
    const embeddings = await embedder.generate(["test text"]);
    console.log("Embeddings generated successfully:", embeddings);
  } catch (err) {
    console.error("Error generating embeddings:", err);
  }
}
testEmbedding();
