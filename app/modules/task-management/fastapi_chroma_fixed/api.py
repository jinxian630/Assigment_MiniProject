from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
import requests
from typing import List, Dict, Any, Optional, Tuple
import re
from datetime import datetime, timedelta

# =========================
# App setup
# =========================
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ok for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PERSIST_PATH = "./vectordb"
COLLECTION_NAME = "my_data"
RULE_USER_ID = "__global__"

chroma_client = chromadb.PersistentClient(path=PERSIST_PATH)
collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"


# =========================
# Request / Response models
# =========================
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str = "deepseek-r1:7b"  # you can change to 1.5b if needed
    text: str
    userId: str
    history: List[ChatMessage] = []
    n_results: int = 4
    temperature: float = 0.2
    num_ctx: int = 4096
    num_predict: int = 260
    tasksContext: str = ""  # from your TaskDashboard buildTasksContextForAI()


# =========================
# Helpers: Chroma retrieval (kept)
# =========================
def _safe_meta(meta: Any) -> Dict[str, Any]:
    return meta if isinstance(meta, dict) else {}


def _build_retrieved_payload(results: Dict[str, Any], preview_len: int) -> List[Dict[str, Any]]:
    docs = (results.get("documents") or [[]])[0]
    metas = (results.get("metadatas") or [[None] * len(docs)])[0]
    dists = (results.get("distances") or [[]])[0]

    retrieved: List[Dict[str, Any]] = []
    for doc, meta, dist in zip(docs, metas, dists):
        m = _safe_meta(meta)
        retrieved.append({
            "source_row": m.get("source_row"),
            "type": m.get("type"),
            "module": m.get("module"),
            "userId": m.get("userId"),
            "distance": round(float(dist), 4) if dist is not None else None,
            "text_preview": (doc or "")[:preview_len],
        })
    return retrieved


def _where_and(*clauses: Dict[str, Any]) -> Dict[str, Any]:
    return {"$and": list(clauses)}


def _query_rules(n_results: int) -> Dict[str, Any]:
    return collection.query(
        query_texts=["task assistant rules / prioritization / scheduling / safety"],
        n_results=min(n_results, 5),
        where=_where_and(
            {"module": {"$eq": "task-management"}},
            {"type": {"$eq": "rule"}},
            {"userId": {"$eq": RULE_USER_ID}},
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


# =========================
# Intent detection (THIS is the key)
# =========================
INTENT_TOP_TODAY = "top_today"
INTENT_PLAN_WEEK = "plan_week"
INTENT_CLEAR_OVERDUE = "clear_overdue"
INTENT_COUNT_OVERDUE = "count_overdue"
INTENT_OTHER = "other"


def detect_intent(user_text: str) -> str:
    t = (user_text or "").strip().lower()

    # count overdue
    if ("how many" in t or "count" in t) and "overdue" in t:
        return INTENT_COUNT_OVERDUE

    # overdue first
    if "overdue" in t and ("clear" in t or "finish" in t or "first" in t or "which" in t):
        return INTENT_CLEAR_OVERDUE

    # plan week
    if ("next 7 days" in t) or ("plan my week" in t) or ("schedule over the next" in t):
        return INTENT_PLAN_WEEK

    # top today
    if ("top" in t and "today" in t) or ("what should i do today" in t) or ("most urgent today" in t):
        return INTENT_TOP_TODAY

    return INTENT_OTHER


# =========================
# Parse tasksContext -> structured tasks (MOST IMPORTANT)
# Your TaskDashboard already sends tasksContext with:
#  Title: ...
#  PriorityScore: ...
#  DaysUntilDue: ...
#  Start/Due etc.
# =========================
class ParsedTask(Dict[str, Any]):
    pass


def parse_tasks_context(tasks_context: str) -> List[ParsedTask]:
    s = (tasks_context or "").strip()
    if not s or "No active tasks" in s:
        return []

    # Split blocks by "#<num>"
    blocks = re.split(r"(?m)^\s*#\d+\s*$", s)
    tasks: List[ParsedTask] = []

    for b in blocks:
        b = b.strip()
        if not b:
            continue

        def grab(pattern: str) -> Optional[str]:
            m = re.search(pattern, b, flags=re.MULTILINE)
            return m.group(1).strip() if m else None

        title = grab(r"(?m)^\s*Title:\s*(.+)\s*$") or "Untitled"
        details = grab(r"(?m)^\s*Details:\s*(.+)\s*$")
        prio_raw = grab(r"(?m)^\s*PriorityScore:\s*(\d+)")
        days_raw = grab(r"(?m)^\s*DaysUntilDue:\s*([-\d]+|null)\s*$")
        start_raw = grab(r"(?m)^\s*Start:\s*(.+?)\s*\|\s*Due:\s*(.+)\s*$")
        overdue_raw = grab(r"(?m)^\s*Overdue:\s*(yes|no)\s*$")

        start_date = None
        due_date = None
        if start_raw:
            # start_raw captured "Start: <x> | Due: <y>" as groups is hard;
            # easier: re-find both
            m2 = re.search(r"(?m)^\s*Start:\s*(.+?)\s*\|\s*Due:\s*(.+)\s*$", b)
            if m2:
                start_date = m2.group(1).strip()
                due_date = m2.group(2).strip()

        try:
            prio = int(prio_raw) if prio_raw is not None else 0
        except:
            prio = 0

        days_until_due: Optional[int] = None
        if days_raw and days_raw != "null":
            try:
                days_until_due = int(days_raw)
            except:
                days_until_due = None

        overdue = (overdue_raw == "yes") if overdue_raw else (days_until_due is not None and days_until_due < 0)

        tasks.append(ParsedTask(
            title=title,
            details=details,
            priority=prio,
            daysUntilDue=days_until_due,
            start=start_date,
            due=due_date,
            overdue=overdue,
            raw=b
        ))

    # keep only tasks that have at least title
    return tasks


# =========================
# Local “AI-like” reasoning (deterministic, no Ollama needed)
# This is what makes it "intelligent but safe".
# =========================
def _sort_by_urgency(tasks: List[ParsedTask]) -> List[ParsedTask]:
    # overdue first by most overdue, then due soon, then priority
    def key(t: ParsedTask):
        d = t.get("daysUntilDue", None)
        pr = t.get("priority", 0)
        # treat None due as far future
        if d is None:
            return (2, 9999, -pr)
        if d < 0:
            return (0, d, -pr)     # more negative = more overdue => earlier
        return (1, d, -pr)
    return sorted(tasks, key=key)


def _pick_top3(tasks: List[ParsedTask]) -> List[ParsedTask]:
    return _sort_by_urgency(tasks)[:3]


def _reason_for_task(t: ParsedTask) -> str:
    d = t.get("daysUntilDue", None)
    pr = t.get("priority", 0)
    overdue = t.get("overdue", False)

    if d is None:
        return "No due date set — set/confirm due date to avoid surprise deadlines."
    if d < 0:
        return f"Overdue by {abs(d)} day(s) — clearing it reduces backlog pressure."
    if d == 0:
        return "Due today — finish it to avoid becoming overdue."
    if 1 <= d <= 3:
        return f"Due in {d} day(s) — do early to keep buffer for unexpected issues."
    if 4 <= d <= 7:
        return f"Due in {d} day(s) — schedule a focused block this week."
    return f"Due in {d} day(s) — lower urgency right now; plan ahead."


def _suggested_plan(intent: str, selected: List[ParsedTask], all_tasks: List[ParsedTask]) -> List[str]:
    overdue_tasks = [t for t in all_tasks if t.get("daysUntilDue") is not None and t["daysUntilDue"] < 0]
    due_week = [t for t in all_tasks if t.get("daysUntilDue") is not None and 0 <= t["daysUntilDue"] <= 7]

    plan: List[str] = []
    if intent == INTENT_CLEAR_OVERDUE:
        if overdue_tasks:
            plan.append(f"Finish **{overdue_tasks[0]['title']}** today (it’s the most overdue).")
            if len(overdue_tasks) > 1:
                plan.append("If time remains, start the next overdue item to stop backlog growing.")
        else:
            plan.append("No overdue tasks — use today to pre-finish the nearest due task.")
        return plan

    if intent == INTENT_PLAN_WEEK:
        if overdue_tasks:
            plan.append(f"Day 1: clear **{overdue_tasks[0]['title']}** first (overdue tasks come first).")
        if due_week:
            # pick 1-2 due soon
            sorted_week = _sort_by_urgency(due_week)
            if sorted_week:
                plan.append(f"Book 1 focused block for **{sorted_week[0]['title']}** within the next 2–3 days.")
            if len(sorted_week) > 1:
                plan.append(f"Reserve another block later this week for **{sorted_week[1]['title']}**.")
        else:
            plan.append("No tasks due within 7 days — use this week to clear overdue work or set due dates/steps.")
        return plan

    # top today
    if selected:
        plan.append(f"Do **{selected[0]['title']}** first, then move to the next item if time allows.")
        if len(selected) >= 2:
            plan.append(f"If you finish early, start **{selected[1]['title']}** to reduce future pressure.")
    else:
        plan.append("No active tasks — add tasks with due dates so the assistant can prioritize accurately.")
    return plan


def answer_by_intent(intent: str, user_text: str, tasks: List[ParsedTask]) -> str:
    total_active = len(tasks)
    overdue_tasks = [t for t in tasks if t.get("daysUntilDue") is not None and t["daysUntilDue"] < 0]
    due_week = [t for t in tasks if t.get("daysUntilDue") is not None and 0 <= t["daysUntilDue"] <= 7]

    if total_active == 0:
        return "No active tasks found. Add tasks (with due dates) and ask again."

    # Special: count overdue question
    if intent == INTENT_COUNT_OVERDUE:
        if overdue_tasks:
            names = ", ".join([t["title"] for t in overdue_tasks[:3]])
            return f"You have {len(overdue_tasks)} overdue task(s) out of {total_active} active task(s): {names}. Please do it ASAP."
        return f"You have 0 overdue task(s) out of {total_active} active task(s). You're on track."

    # For the 3 main intents, use same safe format
    top = _pick_top3(tasks)

    lines: List[str] = []
    # Immediate focus block (overdue + due today)
    immediate = [t for t in tasks if t.get("daysUntilDue") is not None and t["daysUntilDue"] <= 0]
    immediate = _sort_by_urgency(immediate)

    lines.append("Immediate focus:")
    if immediate:
        t1 = immediate[0]
        d = t1.get("daysUntilDue")
        due = t1.get("due") or "-"
        if d is not None and d < 0:
            lines.append(f"1. {t1['title']} — overdue by {abs(d)} day(s) due on {due}. {_reason_for_task(t1)}")
        elif d == 0:
            lines.append(f"1. {t1['title']} — due today ({due}). {_reason_for_task(t1)}")
        else:
            lines.append(f"1. {t1['title']} — {_reason_for_task(t1)}")
    else:
        # if no overdue/due today, use top task as #1
        t1 = top[0]
        d = t1.get("daysUntilDue")
        due = t1.get("due") or "-"
        if d is None:
            lines.append(f"1. {t1['title']} — no due date. {_reason_for_task(t1)}")
        else:
            lines.append(f"1. {t1['title']} — due in {d} day(s) due on {due}. {_reason_for_task(t1)}")

    # This week block
    lines.append("")
    lines.append("This week:")
    week_sorted = _sort_by_urgency(due_week)
    # exclude tasks already used as #1
    used_title = immediate[0]["title"] if immediate else top[0]["title"]
    week_sorted = [t for t in week_sorted if t["title"] != used_title]

    if week_sorted:
        # output up to 2 items (#2 and #3)
        for idx, t in enumerate(week_sorted[:2], start=2):
            d = t.get("daysUntilDue")
            due = t.get("due") or "-"
            if d is None:
                lines.append(f"{idx}. {t['title']} — no due date. {_reason_for_task(t)}")
            else:
                lines.append(f"{idx}. {t['title']} — due in {d} day(s) due on {due}. {_reason_for_task(t)}")
    else:
        lines.append("No tasks due within the next 7 days. Use this time to clear overdue work or prepare ahead.")

    # Suggested plan
    plan = _suggested_plan(intent, top, tasks)
    lines.append("")
    lines.append("Suggested plan:")
    for p in plan[:2]:
        # keep it short and stable
        lines.append(f"- {p}")

    return "\n".join(lines).strip()


# =========================
# Optional: fallback to Ollama for “other” questions
# =========================
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


# =========================
# Routes
# =========================
@app.get("/health")
def health():
    return {"ok": True}


@app.post("/chat_rag")
def chat_rag(request: ChatRequest):
    if not request.userId or not request.userId.strip():
        raise HTTPException(status_code=400, detail="userId is required")

    user_id = request.userId.strip()
    user_text = (request.text or "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="text is required")

    # Parse tasksContext first (most reliable)
    tasks = parse_tasks_context(request.tasksContext)

    # Intent detection
    intent = detect_intent(user_text)

    # If it's one of your 3 main questions (or overdue count), answer locally (NO LLM needed)
    if intent in (INTENT_TOP_TODAY, INTENT_PLAN_WEEK, INTENT_CLEAR_OVERDUE, INTENT_COUNT_OVERDUE):
        answer = answer_by_intent(intent, user_text, tasks)
        return {
            "intent": intent,
            "rules_results": [],
            "task_results": [],
            "model_answer": answer,
        }

    # Otherwise: keep your RAG + Ollama behavior (optional)
    try:
        rule_results = _query_rules(request.n_results)
    except Exception:
        rule_results = {"documents": [[]], "metadatas": [[]], "distances": [[]]}

    try:
        task_results = _query_tasks(user_id, user_text, request.n_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chroma query failed: {e}")

    retrieved_rules = _build_retrieved_payload(rule_results, preview_len=900)
    retrieved_tasks = _build_retrieved_payload(task_results, preview_len=1200)

    rules_text = "\n".join([f"- {r['text_preview']}".strip() for r in retrieved_rules if r.get("text_preview")]) or "No rules found."
    tasks_text = "\n\n".join([f"- {t['text_preview']}".strip() for t in retrieved_tasks if t.get("text_preview")]) or "No tasks found."
    tasks_context_block = (request.tasksContext or "").strip() or "No TASKS_CONTEXT provided."

    system = (
        "You are the in-app AI assistant for a task management module.\n"
        "Be concise and actionable.\n"
        "Use TASKS_CONTEXT for exact task titles/dates.\n"
        "If you cannot answer, ask ONE short follow-up question.\n"
        "Return plain text.\n"
    )

    messages = [{"role": "system", "content": system}]
    trimmed_history = request.history[-8:] if request.history else []
    for m in trimmed_history:
        if m.role in ("user", "assistant", "system") and m.content:
            messages.append({"role": m.role, "content": m.content})

    user_payload = (
        "RULES:\n"
        f"{rules_text}\n\n"
        "TASKS_CONTEXT:\n"
        f"{tasks_context_block}\n\n"
        "TASKS (retrieved from Chroma):\n"
        f"{tasks_text}\n\n"
        "USER QUESTION:\n"
        f"{user_text}\n"
    )
    messages.append({"role": "user", "content": user_payload})

    try:
        answer = call_ollama(
            model=request.model,
            messages=messages,
            temperature=request.temperature,
            num_ctx=request.num_ctx,
            num_predict=request.num_predict,
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Ollama call failed: {e}")

    if not answer or len(answer) < 10:
        answer = "I couldn’t generate a reply. Try again with a more specific question."

    return {
        "intent": intent,
        "rules_results": retrieved_rules,
        "task_results": retrieved_tasks,
        "model_answer": answer,
    }
