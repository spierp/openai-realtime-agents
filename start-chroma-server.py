
import os
import chromadb

# Create data directory
chroma_dir = os.path.join(os.getcwd(), 'chroma-db')
os.makedirs(chroma_dir, exist_ok=True)
print(f"ChromaDB directory: {chroma_dir}")

# Start the server with the correct API
print("Starting ChromaDB server...")
server = chromadb.PersistentClient(
    path=chroma_dir,
)

# Create a simple in-memory instance to confirm it's working
print("Creating a test collection...")
try:
    collection = server.get_or_create_collection("test_collection")
    print(f"Successfully created collection: {collection.name}")
    print("ChromaDB is working correctly!")
except Exception as e:
    print(f"Error creating collection: {e}")

print("ChromaDB server is ready. Keep this terminal open and run 'node start-chroma.js' in another terminal to test the connection.")
