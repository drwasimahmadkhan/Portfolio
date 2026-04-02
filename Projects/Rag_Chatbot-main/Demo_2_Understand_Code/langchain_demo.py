import os
import sys
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Ensure you have your environment variables set or load them here
# from dotenv import load_dotenv
# load_dotenv()

def main():
    print("--- LangChain Educational Demo: Loader & Splitter ---")
    
    # 1. Get input file path from user
    file_path_str = input("Enter the absolute path to your file (PDF or TXT): ").strip()
    
    # Remove quotes if user added them
    if file_path_str.startswith('"') and file_path_str.endswith('"'):
        file_path_str = file_path_str[1:-1]
        
    file_path = Path(file_path_str)
    
    if not file_path.exists():
        print(f"Error: File not found at {file_path}")
        return

    # 2. Load the document
    print(f"\n[1] Loading file: {file_path.name}...")
    docs = []
    try:
        if file_path.suffix.lower() == ".pdf":
            loader = PyPDFLoader(str(file_path))
            docs.extend(loader.load())
        elif file_path.suffix.lower() in [".txt", ".md", ".log"]:
            loader = TextLoader(str(file_path), encoding="utf-8")
            docs.extend(loader.load())
        else:
            print("Error: Unsupported file type. Please use .pdf, .txt, .md, or .log")
            return
    except Exception as e:
        print(f"Error loading file: {e}")
        return

    print(f"    -> Successfully loaded {len(docs)} page(s)/document(s).")
    
    # 3. Split the document (Chunking)
    print("\n[2] Splitting text into chunks...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""]
    )
    
    chunks = splitter.split_documents(docs)
    
    print(f"    -> Created {len(chunks)} chunks.")

    # 4. Print Chunks
    print("\n[3] Printing Chunks (Preview first 3):")
    print("="*60)
    for i, chunk in enumerate(chunks[:3]):
        print(f"CHUNK {i+1}:")
        print(f"Metadata: {chunk.metadata}")
        print(f"Content Length: {len(chunk.page_content)}")
        print("-" * 20)
        print(chunk.page_content[:500] + "..." if len(chunk.page_content) > 500 else chunk.page_content)
        print("="*60)
        
    if len(chunks) > 3:
        print(f"... and {len(chunks) - 3} more chunks.")

if __name__ == "__main__":
    main()
