import subprocess
import os
import sys

# Better Docker detection - checks if we're running in a container
def is_running_in_docker():
    # Check for Docker-specific environment variable we set in Dockerfile
    if os.environ.get('DOCKER_CHROMA_DATA_DIR', '') != '':
        return True
        
    # Additional check: if /.dockerenv file exists, we're in Docker
    if os.path.exists('/.dockerenv'):
        return True
        
    # Check if cgroup contains docker string
    try:
        with open('/proc/self/cgroup', 'r') as f:
            return 'docker' in f.read()
    except:
        pass
    
    return False

# Set Docker flag based on detection
IN_DOCKER = is_running_in_docker()

def start_chroma_server_docker():
    """Start ChromaDB server directly in Docker environment"""
    import chromadb
    from chromadb.config import Settings
    
    # Define data directory
    data_dir = os.environ.get("DOCKER_CHROMA_DATA_DIR", "/app/chroma-db")
    
    print(f"Starting ChromaDB server in Docker with data directory: {data_dir}")
    
    # Configure ChromaDB settings
    settings = Settings(
        chroma_db_impl="duckdb+parquet",
        persist_directory=data_dir,
        allow_reset=True,
        anonymized_telemetry=False
    )
    
    # Start server using command-line 
    # We don't use the API directly because HttpServer isn't consistently available
    # across different ChromaDB versions
    args = ["chroma", "run", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--path", data_dir]
    
    process = subprocess.Popen(args)
    return process

def start_chroma_server_local():
    """Start ChromaDB server in local development environment"""
    # Define the path where ChromaDB will store its data
    chroma_db_path = os.path.abspath("./chroma-db")

    # Ensure the directory exists
    os.makedirs(chroma_db_path, exist_ok=True)

    # Command to start the ChromaDB server
    command = [
        "chroma",
        "run",
        "--host",
        "0.0.0.0",  # Listen on all network interfaces
        "--port",
        "8000",     # Port number
        "--path",
        chroma_db_path  # Data storage path
    ]

    # Start the server
    process = subprocess.Popen(command)

    print(f"ChromaDB server started with PID {process.pid}")
    print(f"Data directory: {chroma_db_path}")
    print(f"Access the server at http://localhost:8000")

    return process

if __name__ == "__main__":
    print(f"Running in Docker: {IN_DOCKER}")
    
    if IN_DOCKER:
        server_process = start_chroma_server_docker()
    else:
        server_process = start_chroma_server_local()
        
    try:
        server_process.wait()  # Wait for the server process to complete
    except KeyboardInterrupt:
        print("Shutting down the ChromaDB server...")
        server_process.terminate()
        server_process.wait()
        print("ChromaDB server has been stopped.")
