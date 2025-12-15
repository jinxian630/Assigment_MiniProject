from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import chromadb
import requests
import json

# =========================
# Shared DB / collection
# =========================
PERSIST_PATH = "./vectordb"
COLLECTION_NAME = "my_data"

chroma_client = chromadb.PersistentClient(path=PERSIST_PATH)
collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

# =========================
# Main FastAPI app
# =========================
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # dev only
    allow_credentials=False,       # keep False if origins is "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Merged FastAPI backend running", "routes": ["/money-ai", "/task-ai"]}


# ============================================================
# Shared helpers
# ============================================================
def _where_and(*clauses: Dict[str, Any]) -> Dict[str, Any]:
    # Chroma where format using $and + $eq
    return {"$and": list(clauses)}


# ============================================================
# MONEY ROUTER
# ============================================================
money_router = APIRouter(prefix="/money-ai", tags=["money"])
OLLAMA_GENERATE_URL = "http://localhost:11434/api/generate"
MONEY_RULE_USER_ID = "__global__"

class MoneyQueryRequest(BaseModel):
    model: str = "deepseek-r1:7b"
    text: str
    n_results: int = 2

def _query_money_rules(text: str, n_results: int) -> Dict[str, Any]:
    # ✅ ONLY retrieve money-management rule docs
    return collection.query(
        query_texts=[text],
        n_results=n_results,
        where=_where_and(
            {"module": {"$eq": "money-management"}},
            {"type": {"$eq": "rule"}},
            {"userId": {"$eq": MONEY_RULE_USER_ID}},
        ),
    )

@money_router.post("/search_vectors")
def money_search_vectors(request: MoneyQueryRequest):
    # ✅ filtered
    results = _query_money_rules(request.text, request.n_results)
    return {
        "ids": results.get("ids", []),
        "documents": results.get("documents", []),
        "distances": results.get("distances", []),
        "metadatas": results.get("metadatas", []),
    }

@money_router.post("/search_rag_model")
def money_search_rag_model(request: MoneyQueryRequest):
    # ✅ filtered
    results = _query_money_rules(request.text, request.n_results)

    docs = (results.get("documents") or [[]])[0]
    metas = (results.get("metadatas") or [[None] * len(docs)])[0]
    dists = (results.get("distances") or [[]])[0]

    retrieved = []
    for doc, meta, dist in zip(docs, metas, dists):
        source_row = meta.get("source_row") if isinstance(meta, dict) else None
        retrieved.append({
            "source_row": source_row,
            "distance": round(float(dist), 4) if dist is not None else None,
            "text_preview": (doc or "")[:500],
        })

    context = "\n".join([r["text_preview"] for r in retrieved]).strip()

    prompt_text = (
        "Answer the following query using the provided context.\n\n"
        f"Query: {request.text}\n\n"
        f"Context:\n{context if context else '(no retrieved context)'}\n\n"
        "Rules:\n"
        "- Be practical and specific.\n"
        "- Use bullet points when helpful.\n"
        "- If context is weak, say so and give general best-practice advice.\n"
    )

    try:
        ollama_resp = requests.post(
            OLLAMA_GENERATE_URL,
            json={
                "model": request.model,
                "prompt": prompt_text,
                "stream": True,
                "options": {"num_predict": 220},
            },
            stream=True,
            timeout=(10, 120),
        )
    except requests.RequestException as e:
        return {"results": retrieved, "model_answer": "", "ollama_error": f"Request to Ollama failed: {str(e)}"}

    if ollama_resp.status_code != 200:
        return {"results": retrieved, "model_answer": "", "ollama_error": ollama_resp.text}

    model_answer = ""
    ollama_error = ""

    for line in ollama_resp.iter_lines():
        if not line:
            continue
        try:
            data = json.loads(line.decode("utf-8"))

            # normal streamed tokens
            if "response" in data and data["response"]:
                model_answer += data["response"]

            # capture Ollama errors if any
            if "error" in data and data["error"]:
                ollama_error = str(data["error"])
        except Exception:
            pass

    print("OLLAMA status:", ollama_resp.status_code)
    print("MODEL_ANSWER_LEN:", len(model_answer))

    if ollama_error:
        return {
            "results": retrieved,
            "model_answer": "",
            "ollama_error": ollama_error,
        }

    return {
        "results": retrieved,
        "model_answer": model_answer.strip(),
        "ollama_error": "",
    }


# ============================================================
# TASK ROUTER
# ============================================================
task_router = APIRouter(prefix="/task-ai", tags=["task"])
OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"
TASK_RULE_USER_ID = "__global__"

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str = "deepseek-r1:7b"
    text: str
    userId: str
    history: List[ChatMessage] = []
    n_results: int = 4
    temperature: float = 0.2
    num_ctx: int = 4096
    num_predict: int = 260
    tasksContext: str = ""

def _query_task_rules(n_results: int) -> Dict[str, Any]:
    return collection.query(
        query_texts=["task assistant rules / prioritization / scheduling / safety"],
        n_results=min(n_results, 5),
        where=_where_and(
            {"module": {"$eq": "task-management"}},
            {"type": {"$eq": "rule"}},
            {"userId": {"$eq": TASK_RULE_USER_ID}},
        ),
    )

def _query_tasks(user_id: str, text: str, n_results: int) -> Dict[str, Any]:
    return collection.query(
        query_texts=[text],
        n_results=n_results,
        where=_where_and(
            {"module": {"$eq": "task-management"}},
            {"type": {"$eq": "task"}},
            {"userId": {"$eq": user_id}},
        ),
    )

INTENT_TOP_TODAY = "top_today"
INTENT_PLAN_WEEK = "plan_week"
INTENT_CLEAR_OVERDUE = "clear_overdue"
INTENT_COUNT_OVERDUE = "count_overdue"
INTENT_OTHER = "other"

def detect_intent(user_text: str) -> str:
    t = (user_text or "").strip().lower()
    if ("how many" in t or "count" in t) and "overdue" in t:
        return INTENT_COUNT_OVERDUE
    if "overdue" in t and ("clear" in t or "finish" in t or "first" in t or "which" in t):
        return INTENT_CLEAR_OVERDUE
    if ("next 7 days" in t) or ("plan my week" in t) or ("schedule over the next" in t):
        return INTENT_PLAN_WEEK
    if ("top" in t and "today" in t) or ("what should i do today" in t) or ("most urgent today" in t):
        return INTENT_TOP_TODAY
    return INTENT_OTHER

def call_ollama(model: str, messages: List[Dict[str, str]], temperature: float, num_ctx: int, num_predict: int) -> str:
    resp = requests.post(
        OLLAMA_CHAT_URL,
        json={
            "model": model,
            "messages": messages,
            "options": {
                "temperature": temperature,
                "num_ctx": num_ctx,
                "num_predict": num_predict,
            },
            "stream": False,
        },
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return ((data.get("message") or {}).get("content") or "").strip()

@task_router.get("/health")
def task_health():
    return {"ok": True}

@task_router.post("/chat_rag")
def task_chat_rag(request: ChatRequest):
    if not request.userId or not request.userId.strip():
        raise HTTPException(status_code=400, detail="userId is required")

    user_text = (request.text or "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="text is required")

    intent = detect_intent(user_text)

    try:
        rule_results = _query_task_rules(request.n_results)
    except Exception:
        rule_results = {"documents": [[]]}

    task_results = _query_tasks(request.userId.strip(), user_text, request.n_results)

    rules_text = "\n".join((rule_results.get("documents") or [[]])[0]) or "No rules found."
    tasks_text = "\n".join((task_results.get("documents") or [[]])[0]) or "No tasks found."
    tasks_context_block = (request.tasksContext or "").strip() or "No TASKS_CONTEXT provided."

    system = (
        "You are the in-app AI assistant for a task management module.\n"
        "Be concise and actionable.\n"
        "Use TASKS_CONTEXT for exact task titles/dates.\n"
        "If you cannot answer, ask ONE short follow-up question.\n"
        "Return plain text.\n"
    )

    messages = [{"role": "system", "content": system}]
    for m in (request.history or [])[-8:]:
        if m.role in ("user", "assistant", "system") and m.content:
            messages.append({"role": m.role, "content": m.content})

    messages.append({
        "role": "user",
        "content": (
            "RULES:\n" + rules_text + "\n\n"
            "TASKS_CONTEXT:\n" + tasks_context_block + "\n\n"
            "TASKS (retrieved from Chroma):\n" + tasks_text + "\n\n"
            "USER QUESTION:\n" + user_text
        )
    })

    try:
        answer = call_ollama(
            model=request.model,
            messages=messages,
            temperature=request.temperature,
            num_ctx=request.num_ctx,
            num_predict=request.num_predict,
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Ollama request failed: {str(e)}")

    return {"intent": intent, "model_answer": answer}


# =========================
# Register routers
# =========================
app.include_router(money_router)
app.include_router(task_router)
# =========================
# BACKWARD-COMPAT ALIASES
# (so old frontend routes still work)
# =========================

@app.post("/search_rag_model")
def search_rag_model_alias(request: MoneyQueryRequest):
    return money_search_rag_model(request)

@app.post("/search_vectors")
def search_vectors_alias(request: MoneyQueryRequest):
    return money_search_vectors(request)

@app.post("/chat_rag")
def chat_rag_alias(request: ChatRequest):
    return task_chat_rag(request)

@app.get("/health")
def health_alias():
    return {"ok": True}
