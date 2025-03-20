// Load environment variables from .env file
require('dotenv').config();

console.log('==== Environment Variable Debug ====');
console.log('API_KEY exists:', !!process.env.API_KEY);

if (process.env.API_KEY) {
  console.log('API_KEY length:', process.env.API_KEY.length);
  console.log('API_KEY first 4 chars:', process.env.API_KEY.substring(0, 4));
  console.log('API_KEY last 4 chars:', process.env.API_KEY.substring(process.env.API_KEY.length - 4));
  console.log('API_KEY contains equals sign:', process.env.API_KEY.includes('='));
  // Safely show the full key as this is a direct debug script not exposed to users
  console.log('Full API_KEY value:', process.env.API_KEY);
}

// Check if there might be quoting or whitespace issues
const envFileContent = require('fs').readFileSync('.env', 'utf8');
const apiKeyLine = envFileContent.split('\n').find(line => line.startsWith('API_KEY='));
console.log('API_KEY line in .env file:', apiKeyLine);

console.log('==== End of Debug ===='); 