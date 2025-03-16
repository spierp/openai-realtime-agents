
import os
import chromadb
from chromadb.config import Settings

# Create data directory
chroma_dir = os.path.join(os.getcwd(), 'chroma-db')
os.makedirs(chroma_dir, exist_ok=True)
print(f"ChromaDB directory: {chroma_dir}")

# Start the server using the correct API
print("Starting ChromaDB server...")
chromadb.Server(
    host="0.0.0.0",
    port=8000,
    persist_directory=chroma_dir,
    settings=Settings(
        allow_reset=True,
        anonymized_telemetry=False
    )
).run()
