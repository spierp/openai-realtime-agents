// Test script to test the TypeScript utility functions
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { readMarkdownFiles, createVectorStore } from '../src/utils/ragUtils';

dotenv.config();

async function runTest() {
  try {
    console.log('Starting test of TypeScript utils...');
    
    // Check for OpenAI API Key
    if (!process.env.OPENAI_API_KEY) {
      console.error("ERROR: OPENAI_API_KEY environment variable is not set!");
      process.exit(1);
    }
    
    console.log('Reading markdown files...');
    const knowledgeDir = path.join(process.cwd(), 'knowledge');
    
    // Read and process markdown files
    const result = await readMarkdownFiles(knowledgeDir);
    console.log(`Processed ${result.fileCount} files with ${result.errorCount} errors`);
    console.log(`Total documents to add: ${result.documents.length}`);
    
    // Sample some of the documents to check their structure
    if (result.documents.length > 0) {
      const sampleDoc = result.documents[0];
      console.log('\nSample document:');
      console.log('Title:', sampleDoc.metadata.fileName);
      console.log('Content preview:', sampleDoc.pageContent.substring(0, 100) + '...');
      console.log('Metadata:', JSON.stringify(sampleDoc.metadata, null, 2));
      
      // Check if any files have tags
      const docsWithTags = result.documents.filter(doc => 
        doc.metadata.tags_string && doc.metadata.tags_string.length > 0
      );
      
      console.log(`\nFound ${docsWithTags.length} documents with tags`);
      
      if (docsWithTags.length > 0) {
        const tagSample = docsWithTags[0];
        console.log('\nSample document with tags:');
        console.log('Title:', tagSample.metadata.fileName);
        console.log('Tags string:', tagSample.metadata.tags_string);
        console.log('Individual tag fields:', Object.keys(tagSample.metadata)
          .filter(key => key.startsWith('tag_'))
          .reduce((obj, key) => {
            obj[key] = tagSample.metadata[key];
            return obj;
          }, {} as Record<string, any>));
        
        if (tagSample.metadata.tags_json) {
          console.log('Tags JSON:', tagSample.metadata.tags_json);
        }
      }
    }
    
    // Create vector store with the processed documents
    console.log('\nCreating vector store...');
    const vectorStore = await createVectorStore(result.documents, 'knowledge_base');
    console.log('Vector store created with collection:', vectorStore.collectionName);
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest(); 