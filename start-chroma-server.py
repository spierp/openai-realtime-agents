
import os
import sys
import chromadb
from chromadb.config import Settings

# Create data directory
chroma_dir = os.path.join(os.getcwd(), 'chroma-db')
os.makedirs(chroma_dir, exist_ok=True)
print(f"ChromaDB directory: {chroma_dir}")

# Import the server module and start it
print("Starting ChromaDB server...")
from chromadb.server import app
import uvicorn

# This will keep running and not return to shell prompt
if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
