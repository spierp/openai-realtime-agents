
import chromadb

print("Testing ChromaDB Python client...")

# Create a persistent client
client = chromadb.PersistentClient(path="./chroma-db")

# Create or get a collection
collection = client.get_or_create_collection("test_collection")
print(f"Collection name: {collection.name}")

# Add some documents
collection.add(
    documents=["This is a test document", "This is another test document"],
    metadatas=[{"source": "test"}, {"source": "test"}],
    ids=["id1", "id2"]
)

# Query the collection
results = collection.query(
    query_texts=["test document"],
    n_results=2
)

print("Query results:")
print(results)

print("ChromaDB test completed successfully!")
