import chromadb

"""
Insert (or reset + insert) ONLY task-assistant rule documents into ChromaDB.

Run this once whenever you want to reset your vector DB content.
"""

PERSIST_PATH = "./vectordb"
COLLECTION_NAME = "my_data"

# Set True to remove any old/demo content (Obama/Trump/etc.)
RESET_COLLECTION = True

# Use a constant userId for rule docs (rules are shared for everyone)
RULE_USER_ID = "__global__"


def main() -> None:
    chroma_client = chromadb.PersistentClient(path=PERSIST_PATH)

    if RESET_COLLECTION:
        try:
            chroma_client.delete_collection(name=COLLECTION_NAME)
            print(f"✅ Deleted old collection: {COLLECTION_NAME}")
        except Exception as e:
            print("(ok) No existing collection to delete:", e)

    collection = chroma_client.get_or_create_collection(name=COLLECTION_NAME)

    docs = [
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

    ids = ["task_rules_v1", "priority_rules_v1", "relevance_rules_v1"]

    # ✅ IMPORTANT: add metadata so you can filter by module/type/userId
    metadatas = [
        {"module": "task-management", "type": "rule", "userId": RULE_USER_ID},
        {"module": "task-management", "type": "rule", "userId": RULE_USER_ID},
        {"module": "task-management", "type": "rule", "userId": RULE_USER_ID},
    ]

    collection.add(ids=ids, documents=docs, metadatas=metadatas)
    print("✅ Inserted rule docs into ChromaDB")

    # ✅ Quick sanity test (NO request.* here)
    test_query = "How should I prioritize tasks due this week?"
    results = collection.query(
        query_texts=[test_query],
        n_results=3,
        where={"module": "task-management", "type": "rule", "userId": RULE_USER_ID},
    )

    print("\n🔎 Retrieval test:")
    for i, doc in enumerate(results.get("documents", [[]])[0]):
        print(f"--- doc #{i+1} ---")
        print((doc or "")[:250])


if __name__ == "__main__":
    main()
