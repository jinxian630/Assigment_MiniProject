import chromadb

"""
Merged Insert_Data.py for BOTH Task + Money rules.

- Stores everything in the SAME ChromaDB collection.
- Adds metadata so your merged API can filter by module/type/userId.x
- Optional reset (dangerous) is OFF by default.
"""

PERSIST_PATH = "./vectordb"
COLLECTION_NAME = "my_data"

RESET_COLLECTION = False   # set True only when you want to wipe everything
RULE_USER_ID = "__global__"

INSERT_TASK_RULES = True
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
    # TASK RULES
    # -----------------------------
    if INSERT_TASK_RULES:
        task_docs = [
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
            """Prioritization:
- Clear overdue tasks first.
- Then tasks due today.
- Then tasks due within 7 days.
- Use PriorityScore as a tie-breaker (higher first).
- If the user asks about 'this week', only include tasks where DaysUntilDue is between 0 and 7.
""",
            """Safety & relevance:
- Do NOT mention politics, presidents, elections, or 'current events' unless they appear in the task list.
- Do NOT suggest creating unrelated tasks.
- If there are no overdue tasks, say so plainly.
""",
        ]

        task_ids = ["task_rules_v1", "priority_rules_v1", "relevance_rules_v1"]
        task_metas = [
            {"module": "task-management", "type": "rule", "userId": RULE_USER_ID},
            {"module": "task-management", "type": "rule", "userId": RULE_USER_ID},
            {"module": "task-management", "type": "rule", "userId": RULE_USER_ID},
        ]

        collection.add(ids=task_ids, documents=task_docs, metadatas=task_metas)
        print(f"✅ Inserted task rules: {len(task_docs)}")

    # -----------------------------
    # MONEY RULES
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

        money_metas = [
            {"module": "money-management", "type": "rule", "userId": RULE_USER_ID}
            for _ in money_docs
        ]

        collection.add(ids=money_ids, documents=money_docs, metadatas=money_metas)
        print(f"✅ Inserted money rules: {len(money_docs)}")

    # -----------------------------
    # SANITY TESTS (optional)
    # -----------------------------
    if INSERT_TASK_RULES:
        t = collection.query(
            query_texts=["How should I prioritize tasks due this week?"],
            n_results=3,
            where={"module": "task-management", "type": "rule", "userId": RULE_USER_ID},
        )
        print("\n🔎 Task retrieval test:")
        for i, doc in enumerate(t.get("documents", [[]])[0]):
            print(f"--- task doc #{i+1} ---")
            print((doc or "")[:200])

    if INSERT_MONEY_RULES:
        m = collection.query(
            query_texts=["I spent more than I earned this month. What should I do?"],
            n_results=3,
            where={"module": "money-management", "type": "rule", "userId": RULE_USER_ID},
        )
        print("\n💰 Money retrieval test:")
        for i, doc in enumerate(m.get("documents", [[]])[0]):
            print(f"--- money doc #{i+1} ---")
            print((doc or "")[:200])


if __name__ == "__main__":
    main()
