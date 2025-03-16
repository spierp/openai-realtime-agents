
import os
import sys
import chromadb
import logging

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

# Start the actual server - using the correct module import for the current version
import uvicorn

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Run the server using the ChromaDB binary
    # Since the server module structure has changed, we'll use the CLI
    print("Starting ChromaDB server on port 8000...")
    os.environ["CHROMA_SERVER_HOST"] = "0.0.0.0"
    os.environ["CHROMA_SERVER_HTTP_PORT"] = "8000"
    os.environ["PERSIST_DIRECTORY"] = chroma_dir
    os.environ["CHROMA_SERVER_CORS_ALLOW_ORIGINS"] = "*"
    
    # Use the installed ChromaDB server command
    from chromadb.cli.cli import app as chroma_app
    uvicorn.run(
        chroma_app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
