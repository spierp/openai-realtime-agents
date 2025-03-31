// Script to forcefully clean up ChromaDB collections and their files
require('dotenv').config();
const { ChromaClient } = require('chromadb');
const fs = require('fs');
const path = require('path');

async function forceCleanupChromaDB() {
  console.log('ChromaDB Force Cleanup Tool');
  console.log('===========================');
  
  // Connect to ChromaDB
  const client = new ChromaClient({ path: 'http://0.0.0.0:8000' });
  
  try {
    // List all collections
    console.log('\nListing collections in ChromaDB...');
    const collections = await client.listCollections();
    
    if (collections.length === 0) {
      console.log('No collections found in ChromaDB.');
    } else {
      console.log('Found collections:', collections);
      
      // Delete all collections from ChromaDB
      for (const collection of collections) {
        try {
          console.log(`Deleting collection: ${collection}`);
          await client.deleteCollection({ name: collection });
          console.log(`Collection ${collection} deleted successfully.`);
        } catch (err) {
          console.error(`Error deleting collection ${collection}:`, err.message);
        }
      }
    }
    
    // Check chroma-db directory contents
    const chromaDir = path.join(process.cwd(), 'chroma-db');
    console.log(`\nChecking contents of ${chromaDir}...`);
    
    if (!fs.existsSync(chromaDir)) {
      console.error(`Directory ${chromaDir} does not exist!`);
      return;
    }
    
    // Get all subdirectories in the chroma-db directory
    const dirContents = fs.readdirSync(chromaDir, { withFileTypes: true });
    const subDirs = dirContents
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name);
    
    console.log(`Found ${subDirs.length} subdirectories in ${chromaDir}`);
    
    if (subDirs.length > 0) {
      console.log('\nDeleting all collection directories...');
      
      // Clean up subdirectories
      for (const dir of subDirs) {
        try {
          const dirPath = path.join(chromaDir, dir);
          console.log(`Removing directory: ${dirPath}`);
          fs.rmSync(dirPath, { recursive: true, force: true });
          console.log(`Directory ${dirPath} removed successfully.`);
        } catch (err) {
          console.error(`Error removing directory ${dir}:`, err.message);
        }
      }
    } else {
      console.log('No subdirectories found to clean up.');
    }
    
    // Keep the SQLite database file by default
    console.log('\nNote: SQLite database file (chroma.sqlite3) has been preserved.');
    console.log('Cleanup completed successfully!');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

forceCleanupChromaDB(); 