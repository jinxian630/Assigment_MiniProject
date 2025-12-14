import chromadb


"""Insert (or reset + insert) ONLY task-assistant rule documents into ChromaDB.

Why this exists:
- Your RAG endpoint (/search_rag_model) retrieves from ChromaDB.
- If you insert demo data (e.g., US presidents), the model will keep mentioning it.

Run this file once whenever you want to reset your vector DB content.
"""


PERSIST_PATH = "./vectordb"
COLLECTION_NAME = "my_data"

# Set True to remove any old/demo content (Obama/Trump/etc.)
RESET_COLLECTION = False

# ✅ NEW (non-breaking): keep default False so teammate flow stays the same
INSERT_MONEY_RULES = True


def main() -> None:
    chroma_client = chromadb.PersistentClient(path=PERSIST_PATH)

    if RESET_COLLECTION:
        try:
            chroma_client.delete_collection(name=COLLECTION_NAME)
            print(f"✅ Deleted old collection: {COLLECTION_NAME}")
        except Exception as e:
            print("(ok) No existing collection to delete:", e)

    collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

    # -----------------------------
    # ✅ Existing Task Assistant Docs (KEEP EXACTLY)
    # -----------------------------
    docs = [
        # Core contract (aligned with your TaskDashboard prompt)
        """You are an AI task coach inside a university student's mobile task management app.
Rules:
- NEVER invent tasks that are not in the list.
- Ignore tasks that are already Completed: Yes.
- Always rely on the numeric field DaysUntilDue to decide overdue vs this week vs later.
- Overdue: DaysUntilDue < 0
- This week: 0 <= DaysUntilDue <= 7
- Later: DaysUntilDue > 7
Output must include: Immediate focus / This week / Can postpone.
Keep the answer short (<= 180 words).
""",

        # Prioritization heuristics
        """Prioritization:
- Clear overdue tasks first.
- Then tasks due today.
- Then tasks due within 7 days.
- Use PriorityScore as a tie-breaker (higher first).
- If the user asks about 'this week', only include tasks where DaysUntilDue is between 0 and 7.
""",

        # Safety: stop unrelated 'current events' suggestions
        """Safety & relevance:
- Do NOT mention politics, presidents, elections, or 'current events' unless they appear in the task list.
- Do NOT suggest creating unrelated tasks.
- If there are no overdue tasks, say so plainly.
""",
    ]

    collection.add(
        ids=["task_rules_v1", "priority_rules_v1", "relevance_rules_v1"],
        documents=docs,
    )

    # -----------------------------
    # ✅ NEW: Money Coach Rules (APPEND ONLY)
    # -----------------------------
    if INSERT_MONEY_RULES:
        money_docs = [
            """You are an AI financial coach inside a personal money-management app.
Hard rules:
- NEVER invent transactions or amounts. Use only the numbers given by the app summary.
- If the user summary does not include a metric, ask to track it (category, account, income).
- Speak in short, practical steps with RM targets.
Tone: supportive, not judgmental.
""",
            """Cashflow decision rules:
- If Cashflow < 0: prioritize expense reduction first (do NOT recommend investing yet).
  Steps: (1) cut top category by 10–20%, (2) set a 7-day spending cap, (3) remove recurring charges.
- If Cashflow >= 0: keep spending stable and automate saving.
""",
            """Weekly cap logic:
- Prefer weekly caps over monthly restriction.
- Recommend: WeeklyCap = SuggestedWeeklyCap (from app) or 80% of weekly income if provided.
- If no income is provided, base cap on last 7–30 days average weekly spending and reduce by 5–15%.
""",
            """Emergency fund guidance:
- EmergencyFundTarget = 3 × (last 30 days expenses) as a simple starter.
- Build gradually: 5–10% of monthly expenses is acceptable if income is low.
- Priority order: emergency fund first, then investing.
""",
            """Spending pattern coaching:
- If spending spike > 25% week-over-week: highlight it and recommend a 7-day 'cooldown' plan.
- If many small purchases (<= RM10): suggest leakage control (snack budget weekly).
- If a recurring/subscription pattern is detected: advise to cancel/replace/renegotiate.
""",
            """Growth (increase money) recommendations:
- After cashflow is positive: suggest increasing savings rate slowly via automation.
- Encourage income growth options that match student context: part-time, freelancing, selling notes/services.
- Always prioritize consistency over extreme plans.
""",
            """Output format for money advice:
Return 3 sections:
1) What’s happening (based on provided metrics)
2) What to do this week (3–5 bullet steps with RM targets)
3) Longer-term plan (1–3 bullets)
Keep response <= 200 words unless user asks for details.
""",
        ]

        money_ids = [
            "money_rules_v1",
            "money_cashflow_v1",
            "money_weekly_cap_v1",
            "money_emergency_fund_v1",
            "money_patterns_v1",
            "money_growth_v1",
            "money_output_format_v1",
        ]

        # Non-breaking: this only adds new ids/docs to same collection
        collection.add(ids=money_ids, documents=money_docs)
        print(f"✅ Added money coach docs: {len(money_docs)}")

    # -----------------------------
    # ✅ Existing sanity test (KEEP)
    # -----------------------------
    results = collection.query(query_texts=["How should I prioritize my tasks?"], n_results=3)
    print("\n🔎 Retrieval test:")
    for i, doc in enumerate(results.get("documents", [[]])[0]):
        print(f"--- doc #{i+1} ---")
        print((doc or "")[:250])

    # ✅ NEW optional sanity test for money
    if INSERT_MONEY_RULES:
        money_test = collection.query(
            query_texts=["I spent more than I earned this month. What should I do?"],
            n_results=3,
        )
        print("\n💰 Money retrieval test:")
        for i, doc in enumerate(money_test.get("documents", [[]])[0]):
            print(f"--- money doc #{i+1} ---")
            print((doc or "")[:250])


if __name__ == "__main__":
    main()
