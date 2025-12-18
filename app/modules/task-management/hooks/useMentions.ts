import { useState, useMemo, useCallback } from "react";
import type { TaskType } from "../utils/types";

export function useMentions(
  selectedTask: TaskType | null,
  commentText: string
) {
  const [showMentionBox, setShowMentionBox] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const getMentionCandidates = useCallback(() => {
    const emails = new Set<string>();

    if (selectedTask?.CreatedUser?.email)
      emails.add(String(selectedTask.CreatedUser.email).toLowerCase());

    const assigned = Array.isArray(selectedTask?.assignedTo)
      ? selectedTask!.assignedTo
      : selectedTask?.assignedTo
      ? [selectedTask.assignedTo]
      : [];

    assigned.forEach(
      (e) => typeof e === "string" && emails.add(e.toLowerCase())
    );
    (selectedTask?.guests || []).forEach(
      (e) => typeof e === "string" && emails.add(e.toLowerCase())
    );

    return Array.from(emails);
  }, [selectedTask]);

  const mentionCandidates = useMemo(
    () => getMentionCandidates(),
    [getMentionCandidates]
  );

  const filteredMentionCandidates = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return mentionCandidates.slice(0, 6);
    return mentionCandidates.filter((e) => e.includes(q)).slice(0, 6);
  }, [mentionCandidates, mentionQuery]);

  const handleChangeCommentText = useCallback(
    (t: string, setCommentText: (text: string) => void) => {
      setCommentText(t);

      const lastAt = t.lastIndexOf("@");
      if (lastAt === -1) {
        setShowMentionBox(false);
        setMentionQuery("");
        return;
      }

      const afterAt = t.slice(lastAt + 1);
      if (afterAt.includes(" ") || afterAt.includes("\n")) {
        setShowMentionBox(false);
        setMentionQuery("");
        return;
      }

      setShowMentionBox(true);
      setMentionQuery(afterAt);
    },
    []
  );

  const insertMention = useCallback(
    (email: string, setCommentText: (text: string) => void) => {
      const t = commentText;
      const lastAt = t.lastIndexOf("@");
      if (lastAt === -1) return;

      const newText = t.slice(0, lastAt) + `@${email} `;
      setCommentText(newText);
      setShowMentionBox(false);
      setMentionQuery("");
    },
    [commentText]
  );

  return {
    showMentionBox,
    mentionQuery,
    filteredMentionCandidates,
    handleChangeCommentText,
    insertMention,
  };
}


