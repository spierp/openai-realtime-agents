// Script to properly clean up ChromaDB collections and their files
require('dotenv').config();
const { ChromaClient } = require('chromadb');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function cleanupChromaDB() {
  console.log('ChromaDB Cleanup Tool');
  console.log('=====================');
  
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
    }
    
    // Check chroma-db directory contents
    const chromaDir = path.join(process.cwd(), 'chroma-db');
    console.log(`\nChecking contents of ${chromaDir}...`);
    
    if (!fs.existsSync(chromaDir)) {
      console.error(`Directory ${chromaDir} does not exist!`);
      process.exit(1);
    }
    
    // Get all subdirectories in the chroma-db directory
    const dirContents = fs.readdirSync(chromaDir, { withFileTypes: true });
    const subDirs = dirContents
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name);
    
    console.log(`Found ${subDirs.length} subdirectories in ${chromaDir}`);
    
    if (subDirs.length > 0) {
      // Ask for confirmation before deletion
      rl.question('\nDo you want to delete all collections and clean up associated files? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          console.log('\nDeleting collections and cleaning up files...');
          
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
          
          // Check if we should delete the SQLite database file
          const sqliteFile = path.join(chromaDir, 'chroma.sqlite3');
          if (fs.existsSync(sqliteFile)) {
            rl.question('\nDo you want to delete the ChromaDB SQLite database file? (y/n): ', (answer) => {
              if (answer.toLowerCase() === 'y') {
                try {
                  console.log(`Removing SQLite database: ${sqliteFile}`);
                  fs.unlinkSync(sqliteFile);
                  console.log('SQLite database removed successfully.');
                } catch (err) {
                  console.error('Error removing SQLite database:', err.message);
                }
              } else {
                console.log('Keeping SQLite database file.');
              }
              
              console.log('\nCleanup completed successfully!');
              rl.close();
            });
          } else {
            console.log('\nCleanup completed successfully!');
            rl.close();
          }
        } else {
          console.log('Operation cancelled.');
          rl.close();
        }
      });
    } else {
      console.log('No subdirectories found to clean up.');
      rl.close();
    }
  } catch (err) {
    console.error('Error:', err);
    rl.close();
  }
}

cleanupChromaDB(); 