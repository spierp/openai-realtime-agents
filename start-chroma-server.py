
import os
import sys
import chromadb
import subprocess

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

if __name__ == "__main__":
    # Use subprocess to run the ChromaDB CLI as a separate process
    print("Starting ChromaDB server on port 8000...")
    
    # Set the environment variables
    env = os.environ.copy()
    env["CHROMA_SERVER_HOST"] = "0.0.0.0"  # Use 0.0.0.0 to allow external connections
    env["CHROMA_SERVER_HTTP_PORT"] = "8000"
    env["PERSIST_DIRECTORY"] = chroma_dir
    env["CHROMA_SERVER_CORS_ALLOW_ORIGINS"] = '["*"]'  # JSON format for list of allowed origins
    
    # Run the ChromaDB CLI directly
    subprocess.run([
        sys.executable, 
        "-m", 
        "chromadb", 
        "run", 
        "--host", 
        "0.0.0.0", 
        "--port", 
        "8000", 
        "--path", 
        chroma_dir
    ], env=env)
