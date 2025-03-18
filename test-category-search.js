const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");

async function testCategorySearch() {
  console.log("Testing hierarchical category search in ChromaDB...");

  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
    return;
  }

  // Create a client that connects to the server
  const client = new ChromaClient({ path: "http://0.0.0.0:8000" });

  // Define the embedding function with OpenAI
  const embeddingModel = "text-embedding-3-large";
  console.log(`Using embedding model: ${embeddingModel}`);
  
  const embedder = new OpenAIEmbeddingFunction({
    openai_api_key: process.env.OPENAI_API_KEY,
    openai_model: embeddingModel,
    debug: true,
    axios: {
      interceptors: {
        request: [(config) => {
          console.log('OpenAI API Request Model:', config.data ? JSON.parse(config.data).model : 'unknown');
          return config;
        }],
        response: [(response) => {
          console.log('Full OpenAI API Response:', {
            raw_response: response.data,
            model_used: response.data.model,
            embedding_dimension: response.data.data?.[0]?.embedding?.length
          });
          return response;
        }]
      }
    }
  });

  try {
    // Get the knowledge_base collection
    const collection = await client.getCollection({ 
      name: "knowledge_base",
      embeddingFunction: embedder
    });

    // Test query for '03 Projects' primary category
    console.log("\nSearching for documents in primary_category '03 Projects'...");
    const projectResults = await collection.query({
      queryTexts: ["lake water pump"],
      where: { 
        primary_category: "03 Projects"
      },
      nResults: 3
    });

    console.log("\n--- Project Category Results ---");
    console.log("Found documents:", projectResults.metadatas.length);

    for (let i = 0; i < projectResults.metadatas.length; i++) {
      console.log(`\nResult ${i+1}:`);
      console.log("Metadata:", projectResults.metadatas[i]);
      console.log("Document:", projectResults.documents[i].substring(0, 100));
    }

    // Test query for Work area
    console.log("\nSearching for documents in Work area...");
    const workResults = await collection.query({
      queryTexts: ["construction"],
      where: { 
        primary_category: "04 Areas",
        secondary_category: "Work"
      },
      nResults: 3
    });

    console.log("\n--- Work Area Results ---");
    console.log("Found documents:", workResults.metadatas.length);

    for (let i = 0; i < workResults.metadatas.length; i++) {
      console.log(`\nResult ${i+1}:`);
      console.log("Metadata:", workResults.metadatas[i]);
      console.log("Document:", workResults.documents[i].substring(0, 100));
    }

  } catch (err) {
    console.error("Error during search:", err);
  }
}

testCategorySearch();