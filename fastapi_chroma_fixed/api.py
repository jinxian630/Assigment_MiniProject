from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
import requests
import json

# Initialize ChromaDB
# NOTE: Use get_or_create_collection so your server won't crash
# even if the DB was reset or is empty.
chroma_client = chromadb.PersistentClient(path="./vectordb")
collection = chroma_client.get_or_create_collection(name="my_data")

# FastAPI App
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class QueryRequest(BaseModel):
    # Default LLM model name
    model: str = "DeepSeek-R1-Distill-Qwen-7B"
    text: str
    n_results: int = 2


# Root endpoint
@app.get("/")
def root():
    return {"message": "FastAPI + ChromaDB backend is running"}


# Search vectors only
@app.post("/search_vectors")
def search_vectors(request: QueryRequest):
    results = collection.query(
        query_texts=[request.text],
        n_results=request.n_results
    )

    return {
        "ids": results["ids"],
        "documents": results["documents"],
        "distances": results["distances"]
    }


# Ollama API URL
OLLAMA_API_URL = "http://localhost:11434/api/generate"


# RAG endpoint: search + pass to LLM
@app.post("/search_rag_model")
def search_rag_model(request: QueryRequest):

    print("🔍 Received request data:")
    print(request)

    # Query ChromaDB
    results = collection.query(
        query_texts=[request.text],
        n_results=request.n_results
    )

    response = []

    docs = (results.get("documents") or [[]])[0]
    metas = (results.get("metadatas") or [[None] * len(docs)])[0]
    dists = (results.get("distances") or [[]])[0]

    # Loop results safely
    for doc, meta, dist in zip(docs, metas, dists):
        source_row = meta.get("source_row") if isinstance(meta, dict) else None

        response.append({
            "source_row": source_row,
            "distance": round(dist, 4),
            "text_preview": doc[:500]
        })

    # Build RAG context
    context = "\n".join([r["text_preview"] for r in response])

    # Fix broken multiline f-string
    prompt_text = (
        f"Answer the following query using the provided context.\n\n"
        f"Query: {request.text}\n\n"
        f"Context:\n{context}"
    )

    # Send to Ollama
    ollama_resp = requests.post(
        OLLAMA_API_URL,
        json={
            "model": request.model,
            "prompt": prompt_text
        },
        stream=True
    )

    # Stream result
    model_answer = ""
    for line in ollama_resp.iter_lines():
        if line:
            data = json.loads(line.decode("utf-8"))
            if "response" in data:
                model_answer += data["response"]

    return {
        "results": response,
        "model_answer": model_answer.strip()
    }
