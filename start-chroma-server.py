import subprocess
import os


def start_chroma_server():
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
        "8000",  # Port number
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
    server_process = start_chroma_server()
    try:
        server_process.wait()  # Wait for the server process to complete
    except KeyboardInterrupt:
        print("Shutting down the ChromaDB server...")
        server_process.terminate()
        server_process.wait()
        print("ChromaDB server has been stopped.")
