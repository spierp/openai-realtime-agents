require('dotenv').config();
// Simple script to run the vector store update manually
const { spawn } = require('child_process');
const path = require('path');

console.log('Running vector store update...');

const updateScript = path.join(__dirname, 'node_modules/.bin/tsx');
const scriptPath = path.join(__dirname, 'src/scripts/updateVectorStore.ts');

const child = spawn(updateScript, [scriptPath], {
  stdio: 'inherit',
  env: process.env
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('Vector store update completed successfully.');
  } else {
    console.error(`Vector store update failed with code ${code}.`);
  }
});
