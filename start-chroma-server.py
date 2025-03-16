
import os
import sys
from chromadb.server import ServerRunner

# Create data directory
chroma_dir = os.path.join(os.getcwd(), 'chroma-db')
os.makedirs(chroma_dir, exist_ok=True)
print(f"ChromaDB directory: {chroma_dir}")

# Start the server
server = ServerRunner(
    host="0.0.0.0",
    port=8000,
    persist_directory=chroma_dir,
    allow_reset=True,
    cors_allow_origins=["*"]
)

print("Starting ChromaDB server...")
server.run()
