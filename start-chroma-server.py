
import os
import chromadb
from chromadb.server.fastapi import FastAPI

# Create data directory
chroma_dir = os.path.join(os.getcwd(), 'chroma-db')
os.makedirs(chroma_dir, exist_ok=True)
print(f"ChromaDB directory: {chroma_dir}")

# Import the server module and start it
print("Starting ChromaDB server...")

# Setup the Chroma server
from chromadb.config import Settings
import uvicorn

settings = Settings(
    chroma_api_impl="chromadb.api.segment.SegmentAPI",
    chroma_db_impl="chromadb.db.duckdb.DuckDB",
    persist_directory=chroma_dir,
    chroma_server_host="0.0.0.0",
    chroma_server_http_port=8000,
    allow_reset=True,
    anonymized_telemetry=False
)

# This will keep running and not return to shell prompt
if __name__ == "__main__":
    server = FastAPI(settings)
    uvicorn.run(
        server.app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
