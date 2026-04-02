import os
import sys
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_core.documents import Document

# Load env for proper setup if needed, though local embeddings might not need API keys
load_dotenv()

def main():
    print("--- ChromaDB Educational Demo: Embedding & Search ---")
    print("(Note: This runs in-memory and does NOT save to disk)")

    # 1. Setup Embedding Model
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    print(f"\n[1] Initializing Embedding Model ({model_name})...")
    embeddings = SentenceTransformerEmbeddings(model_name=model_name)
    
    # Initialize ephemeral Chroma (no persist_directory)
    vectorstore = Chroma(
        collection_name="demo_collection",
        embedding_function=embeddings,
        # persist_directory=None # Passing None typically implies in-memory/ephemeral in newer versions or default
    )

    # 2. Get Data Input
    print("\n[2] Enter texts to add to the database (type 'DONE' on a new line to finish):")
    texts_to_add = []
    while True:
        line = input(f"Text {len(texts_to_add)+1}: ")
        if line.strip().upper() == 'DONE':
            break
        if line.strip():
            texts_to_add.append(line)
            
    if not texts_to_add:
        print("No text provided. Exiting.")
        return

    # 3. Embed and Add to Chroma
    print(f"\n[3] Embedding and adding {len(texts_to_add)} texts to Vector Store...")
    # Wrap in Document objects as typical RAG would
    docs = [Document(page_content=t, metadata={"id": i}) for i, t in enumerate(texts_to_add)]
    
    vectorstore.add_documents(docs)
    print("    -> Done.")

    # 4. Search
    while True:
        query = input("\n[4] Enter a query to search (or 'quit' to exit): ").strip()
        if query.lower() in ['quit', 'exit']:
            break
            
        print(f"    Searching for: '{query}'")
        
        # Perform similarity search
        results = vectorstore.similarity_search_with_score(query, k=2)
        
        print(f"    -> Found {len(results)} matches:\n")
        for doc, score in results:
            print(f"    * Score: {score:.4f}")
            print(f"    * Content: {doc.page_content}")
            print("    " + "-"*30)

if __name__ == "__main__":
    main()
