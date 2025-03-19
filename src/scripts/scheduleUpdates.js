/* eslint-disable */
import { config } from 'dotenv';
import { scheduleJob } from 'node-schedule';
import { updateVectorStore } from './updateVectorStore';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// Configuration
const UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
const LOG_FILE = path.join(process.cwd(), 'vector-store-updates.log');

function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  // Log to console
  console.log(message);
  
  // Append to log file
  fs.appendFileSync(LOG_FILE, logEntry);
}

function runUpdate() {
  logMessage('Starting vector store update...');
  
  const updateScript = path.join(process.cwd(), 'node_modules/.bin/tsx');
  const scriptPath = path.join(process.cwd(), 'src/scripts/updateVectorStore.ts');
  
  const child = spawn(updateScript, [scriptPath], {
    stdio: 'pipe',
    env: process.env
  });
  
  let output = '';
  
  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  child.stderr.on('data', (data) => {
    output += data.toString();
  });
  
  child.on('close', (code) => {
    if (code === 0) {
      logMessage('Vector store update completed successfully.');
    } else {
      logMessage(`Vector store update failed with code ${code}.`);
    }
    
    // Log detailed output
    logMessage('Output:\n' + output);
    
    // Schedule next update
    logMessage(`Next update scheduled in ${UPDATE_INTERVAL/60000} minutes.`);
  });
}

// Initial run
logMessage('Starting scheduled vector store updates');
runUpdate();

// Schedule regular updates
setInterval(runUpdate, UPDATE_INTERVAL);

logMessage(`Updates scheduled to run every ${UPDATE_INTERVAL/60000} minutes.`);
