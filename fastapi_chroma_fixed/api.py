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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class QueryRequest(BaseModel):
    # ✅ You only have gemma3:1b installed, so set it as default
    model: str = "gemma3:1b"

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
        "ids": results.get("ids", []),
        "documents": results.get("documents", []),
        "distances": results.get("distances", [])
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
            "distance": round(float(dist), 4) if dist is not None else None,
            "text_preview": (doc or "")[:500]
        })

    # Build RAG context
    context = "\n".join([r["text_preview"] for r in response])

    # Build prompt
    prompt_text = (
        f"Answer the following query using the provided context.\n\n"
        f"Query: {request.text}\n\n"
        f"Context:\n{context}\n\n"
        f"Rules:\n"
        f"- Be practical and specific.\n"
        f"- Use bullet points when helpful.\n"
        f"- If context is weak, say so and give general best-practice advice.\n"
    )

    # ✅ Send to Ollama (with timeout + generation limit)
    try:
        ollama_resp = requests.post(
            OLLAMA_API_URL,
            json={
                "model": request.model,       # ✅ correct variable
                "prompt": prompt_text,        # ✅ correct variable
                "stream": True,
                "options": {"num_predict": 220},  # ✅ avoid hanging
            },
            stream=True,
            timeout=(10, 120),  # ✅ connect timeout 10s, read timeout 120s
        )
    except requests.RequestException as e:
        return {
            "results": response,
            "model_answer": "",
            "ollama_error": f"Request to Ollama failed: {str(e)}",
        }

    # ✅ If Ollama returns error, expose it so frontend can show it
    if ollama_resp.status_code != 200:
        try:
            err_text = ollama_resp.text
        except Exception:
            err_text = "Unknown Ollama error"
        return {
            "results": response,
            "model_answer": "",
            "ollama_error": err_text,
        }

    # Stream result
    model_answer = ""
    for line in ollama_resp.iter_lines():
        if not line:
            continue
        try:
            data = json.loads(line.decode("utf-8"))
            if "response" in data:
                model_answer += data["response"]
        except Exception:
            # ignore malformed chunks
            pass

    return {
        "results": response,
        "model_answer": model_answer.strip(),
    }
