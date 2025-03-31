// Script to delete ChromaDB collection
require('dotenv').config();
const { ChromaClient } = require('chromadb');

async function deleteCollection() {
  const client = new ChromaClient({ path: 'http://0.0.0.0:8000' });
  
  try {
    console.log('Listing collections...');
    const collections = await client.listCollections();
    console.log('Available collections:', collections);
    
    if (collections.includes('knowledge_base')) {
      console.log('Deleting knowledge_base collection...');
      await client.deleteCollection({ name: 'knowledge_base' });
      console.log('Collection deleted successfully');
    } else {
      console.log('knowledge_base collection not found');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

deleteCollection();
