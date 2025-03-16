
import os
import sys
import chromadb

# Create data directory
chroma_dir = os.path.join(os.getcwd(), 'chroma-db')
os.makedirs(chroma_dir, exist_ok=True)
print(f"ChromaDB directory: {chroma_dir}")

# Import the server module and start it
print("Starting ChromaDB server...")

# Create a test client to verify ChromaDB works
client = chromadb.PersistentClient(path=chroma_dir)
test_collection = client.get_or_create_collection(name="test_collection")
print(f"Successfully created collection: {test_collection.name}")
print("ChromaDB is working correctly!")

# Start the ChromaDB server
print("ChromaDB server is ready. Keep this terminal open and run 'node start-chroma.js' in another terminal to test the connection.")

# Start the actual server
import uvicorn
from chromadb.server.app import app
import logging

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Run the server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000
    )
