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
RESET_COLLECTION = True


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

    # Quick sanity test (should retrieve rule docs, not president names)
    results = collection.query(query_texts=["How should I prioritize my tasks?"], n_results=3)
    print("\n🔎 Retrieval test:")
    for i, doc in enumerate(results.get("documents", [[]])[0]):
        print(f"--- doc #{i+1} ---")
        print((doc or "")[:250])


if __name__ == "__main__":
    main()
