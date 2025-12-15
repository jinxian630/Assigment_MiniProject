from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
import json
import re

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
    # ✅ Use the same model name as TaskDashboard: deepseek-r1:7b
    # Make sure this model is available in your Ollama / DeepSeek setup.
    model: str = "deepseek-r1:7b"

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


def _parse_money_summary(prompt: str):
    """Extract key numbers from the structured prompt sent by FinancialAdvice.tsx."""
    text = prompt or ""

    def _num(pattern: str):
        m = re.search(pattern, text, flags=re.MULTILINE)
        if not m:
            return None
        try:
            return float(m.group(1))
        except ValueError:
            return None

    def _int(pattern: str):
        m = re.search(pattern, text, flags=re.MULTILINE)
        if not m:
            return None
        try:
            return int(m.group(1))
        except ValueError:
            return None

    def _str(pattern: str):
        m = re.search(pattern, text, flags=re.MULTILINE)
        if not m:
            return None
        return m.group(1).strip()

    transactions = _int(r"TransactionsCount:\s*(\d+)")
    income = _num(r"Income:\s*RM\s*([\-0-9\.]+)")
    expenses = _num(r"Expenses:\s*RM\s*([\-0-9\.]+)")
    cashflow = _num(r"Cashflow:\s*RM\s*([\-0-9\.]+)")
    savings_rate = _num(r"SavingsRate:\s*([0-9\.]+)%")
    top_account = _str(r"TopAccount:\s*(.+)")
    top_category = _str(r"TopCategory:\s*(.+?)\s*\(RM")
    small_purchases = _int(r"SmallPurchasesCount.*?:\s*(\d+)")

    if top_account in ("-", "null", "None"):
        top_account = None
    if top_category in ("-", "null", "None"):
        top_category = None

    return {
        "transactions": transactions,
        "income": income,
        "expenses": expenses,
        "cashflow": cashflow,
        "savings_rate": savings_rate,
        "top_account": top_account,
        "top_category": top_category,
        "small_purchases": small_purchases,
    }


def _build_rule_based_advice(summary):
    """Create a short 3‑section advice text based on numeric summary only."""
    income = summary.get("income")
    expenses = summary.get("expenses")
    cashflow = summary.get("cashflow")
    savings_rate = summary.get("savings_rate")
    top_category = summary.get("top_category")
    small_purchases = summary.get("small_purchases") or 0

    lines = []

    # 1) What's happening
    lines.append("1) What's happening")

    if income is None or expenses is None or cashflow is None:
        lines.append(
            "- I don't have full numbers yet, but you already have some "
            "transactions recorded. Once income and expenses are filled in, I "
            "can summarise your cashflow more precisely."
        )
    else:
        if cashflow < 0:
            lines.append(
                f"- Your last 30 days show a NEGATIVE cashflow of RM {abs(cashflow):.2f} "
                f"(income RM {income:.2f}, expenses RM {expenses:.2f})."
            )
        elif cashflow == 0:
            lines.append(
                f"- Your cashflow is roughly breakeven (income RM {income:.2f}, "
                f"expenses RM {expenses:.2f})."
            )
        else:
            lines.append(
                f"- You have a POSITIVE cashflow of RM {cashflow:.2f} over the last "
                f"30 days (income RM {income:.2f}, expenses RM {expenses:.2f})."
            )

        if savings_rate is not None:
            lines.append(
                f"- Your estimated savings rate is about {savings_rate:.1f}% of income."
            )

        if top_category:
            lines.append(f"- Your highest spending category is {top_category}.")

        if small_purchases >= 10:
            lines.append(
                f"- You also have {small_purchases} small purchases (≤ RM10) which can "
                "quietly increase your monthly spending."
            )

    # 2) What to do this week
    lines.append("")
    lines.append("2) What to do this week (with RM targets)")

    if cashflow is not None and cashflow < 0:
        target = abs(cashflow) + 50
        lines.append(
            f"- Aim to reduce this month's expenses by at least RM {target:.0f} to "
            "turn your cashflow positive (start with wants, not needs)."
        )
    elif cashflow is not None and cashflow >= 0:
        save_target = max(50, cashflow * 0.4)
        lines.append(
            f"- Move at least RM {save_target:.0f} into savings or a separate "
            "account so it is not spent by accident."
        )

    if top_category:
        lines.append(
            f"- Pick ONE rule for {top_category} (for example: cap it by RM 50–100 "
            "less than this month) and track it inside the app."
        )
    else:
        lines.append(
            "- Identify one category you feel is 'leaking' money and set a simple "
            "weekly cap for it (e.g. snacks, rides, subscriptions)."
        )

    if small_purchases >= 10:
        lines.append(
            "- For the next 7 days, group small purchases and limit them to a fixed "
            "amount (for example RM 20–30 total)."
        )

    lines.append(
        "- Log every expense in the app this week so future advice reflects your "
        "real behaviour."
    )

    # 3) Longer‑term plan
    lines.append("")
    lines.append("3) Longer‑term plan")

    lines.append(
        "- Build a simple monthly budget: split income into needs, wants, and "
        "savings, and review it at the end of each month."
    )
    lines.append(
        "- Once you can consistently save each month, set a target emergency fund "
        "of at least 3 months of essential expenses."
    )
    lines.append(
        "- Revisit this Money Coach every few weeks to adjust RM targets based "
        "on how your income and spending change."
    )

    return "\n".join(lines)


# RAG endpoint: now returns a deterministic, rule‑based answer using the numbers
# encoded into the prompt sent from FinancialAdvice.tsx. No external LLM is used.
@app.post("/search_rag_model")
def search_rag_model(request: QueryRequest):
    print("🔍 Received request data:")
    print(request)

    summary = _parse_money_summary(request.text)
    answer = _build_rule_based_advice(summary)

    # Optional: still query Chroma so you can show retrieved rules in debug,
    # but they are not needed to build the answer.
    try:
        results = collection.query(
            query_texts=[request.text],
            n_results=request.n_results,
        )
    except Exception:
        results = {"documents": [[]], "metadatas": [[]], "distances": [[]]}

    docs = (results.get("documents") or [[]])[0]
    metas = (results.get("metadatas") or [[None] * len(docs)])[0]
    dists = (results.get("distances") or [[]])[0]

    payload = []
    for doc, meta, dist in zip(docs, metas, dists):
        m = meta if isinstance(meta, dict) else {}
        payload.append(
            {
                "source_row": m.get("source_row"),
                "distance": float(dist) if dist is not None else None,
                "text_preview": (doc or "")[:400],
            }
        )

    return {
        "results": payload,
        "model_answer": answer.strip(),
        "ollama_error": None,
    }
