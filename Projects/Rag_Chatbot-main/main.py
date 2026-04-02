import os
import shutil
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv
from loguru import logger
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

# LangChain / Chroma imports
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_groq import ChatGroq

load_dotenv()

# --- Configuration ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_db")
CHROMA_COLLECTION = os.getenv("CHROMA_COLLECTION", "redjet_collection")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
DATA_DIR = Path("./data")

# --- Prompts ---
SYSTEM_PROMPT = (
    "You are a precise, pragmatic assistant. You refine user queries to maximize retrieval "
    "quality, maintain factual grounding, and respond with clear, concise explanations "
    "based strictly on provided context. If context is insufficient, state limitations."
)

DEVELOPER_PROMPT = (
    "First, refine the user’s raw query to better target the corpus. Then answer using only "
    "the retrieved chunks. Prefer technical clarity, cite chunk IDs inline where relevant, "
    "and avoid speculation."
)

REFINE_TEMPLATE = (
    "Refine the following query to maximize retrieval quality from a technical corpus.\n\n"
    "Raw Query:\n{query}\n\n"
    "Output only the refined query, no commentary."
)

ANSWER_TEMPLATE = (
    "System:\n{system}\nDeveloper:\n{dev}\n\n"
    "User Query: {query}\nRefined Query: {refined}\n\n"
    "Context Chunks (id: content):\n{context}\n\n"
    "Task: Provide a direct, well-structured answer grounded strictly in the context. "
    "Prefer concise, technical clarity. If uncertain or insufficient context, say so."
)

# --- FastAPI App ---
app = FastAPI(title="Redjet RAG Service with Upload", version="1.1.0")

# --- Data Models ---
class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    min_score: float = 0.0

class ChunkResult(BaseModel):
    chunk_id: str
    score: float
    content: str
    metadata: Dict[str, Any]

class QueryResponse(BaseModel):
    refined_query: str
    top_chunks: List[ChunkResult]
    answer: str

class UploadResponse(BaseModel):
    filename: str
    status: str
    chunks_added: int

# --- Helper Functions (Core Logic) ---

def get_llm():
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY missing in environment variables.")
    return ChatGroq(api_key=GROQ_API_KEY, model=GROQ_MODEL)

def get_vectorstore():
    embeddings = SentenceTransformerEmbeddings(model_name=EMBEDDING_MODEL)
    return Chroma(
        collection_name=CHROMA_COLLECTION,
        persist_directory=CHROMA_DIR,
        embedding_function=embeddings,
    )

def process_file(file_path: Path):
    """Parses a file, chunks it, and adds it to the vector store."""
    logger.info(f"Processing file: {file_path}")
    
    # 1. Load
    docs = []
    if file_path.suffix.lower() == ".pdf":
        loader = PyPDFLoader(str(file_path))
        docs.extend(loader.load())
    elif file_path.suffix.lower() in [".txt", ".md", ".log"]:
        loader = TextLoader(str(file_path), encoding="utf-8")
        docs.extend(loader.load())
    else:
        logger.warning(f"Unsupported file type: {file_path}")
        return 0

    if not docs:
        logger.warning(f"No content found in {file_path}")
        return 0

    # 2. Chunk
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = splitter.split_documents(docs)

    # 3. Add Metadata
    for i, c in enumerate(chunks):
        c.metadata = c.metadata or {}
        # Make a simple ID based on filename and index to help tracking
        c.metadata["chunk_id"] = f"{file_path.name}-chunk-{i}"
        c.metadata["source"] = str(file_path)

    # 4. Upsert to Chroma
    if chunks:
        vs = get_vectorstore()
        texts = [c.page_content for c in chunks]
        metadatas = [c.metadata for c in chunks]
        ids = [m.get("chunk_id") for m in metadatas]
        
        logger.info(f"Upserting {len(chunks)} chunks from {file_path.name}")
        vs.add_texts(texts=texts, metadatas=metadatas, ids=ids)
        # Note: newer langchain-chroma auto-persists, so no vs.persist() needed
        return len(chunks)
    
    return 0

def refine_query(llm: ChatGroq, raw_query: str) -> str:
    prompt = REFINE_TEMPLATE.format(query=raw_query)
    resp = llm.invoke(prompt)
    refined = resp.content.strip()
    logger.info(f"Refined query: {refined}")
    return refined

def retrieve_chunks(vs: Chroma, query: str, top_k: int) -> List[Dict[str, Any]]:
    results = vs.similarity_search_with_relevance_scores(query, k=top_k)
    structured = []
    for doc, score in results:
        chunk_id = doc.metadata.get("chunk_id", "unknown")
        structured.append({
            "chunk_id": chunk_id,
            "score": float(score),
            "content": doc.page_content,
            "metadata": doc.metadata
        })
    return structured

def answer_with_context(llm: ChatGroq, user_query: str, refined_query: str, chunks: List[Dict[str, Any]]) -> str:
    context_lines = [f"{c['chunk_id']}: {c['content']}" for c in chunks]
    context_str = "\n---\n".join(context_lines)
    
    prompt = ANSWER_TEMPLATE.format(
        system=SYSTEM_PROMPT,
        dev=DEVELOPER_PROMPT,
        query=user_query,
        refined=refined_query,
        context=context_str
    )
    resp = llm.invoke(prompt)
    return resp.content.strip()

# --- Endpoints ---

@app.on_event("startup")
async def startup_event():
    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Server ready. Data dir: {DATA_DIR.absolute()}")

@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Uploads a file (PDF/Text), saves it to ./data, and ingests it into ChromaDB.
    """
    try:
        # 1. Save File
        file_path = DATA_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 2. Ingest
        chunks_count = process_file(file_path)
        
        msg = f"Successfully processed and ingested {file.filename} into the vector database. Added {chunks_count} new chunks of data."
        return UploadResponse(
            filename=file.filename,
            status=msg,
            chunks_added=chunks_count
        )
    except Exception as e:
        logger.error(f"Error processing file upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query", response_model=QueryResponse)
async def query_endpoint(payload: QueryRequest):
    """
    Queries the vector store for answers.
    """
    llm = get_llm()
    vs = get_vectorstore()

    # 1. Refine
    refined = refine_query(llm, payload.query)

    # 2. Retrieve
    raw_chunks = retrieve_chunks(vs, refined, payload.top_k)

    # 3. Filter (optional)
    if payload.min_score > 0:
        filtered = [c for c in raw_chunks if c["score"] >= payload.min_score]
    else:
        filtered = raw_chunks

    # 4. Answer
    answer = answer_with_context(llm, payload.query, refined, filtered)

    # Returns structured response
    top_chunks = [
        ChunkResult(
            chunk_id=c["chunk_id"],
            score=c["score"],
            content=c["content"],
            metadata=c["metadata"]
        ) for c in filtered
    ]

    return QueryResponse(
        refined_query=refined,
        top_chunks=top_chunks,
        answer=answer
    )

@app.get("/health")
def health():
    return {"status": "ok", "collection": CHROMA_COLLECTION}

@app.get("/form", response_class=FileResponse)
async def serve_form():
    return FileResponse("form.html")
