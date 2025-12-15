import type { CommentType, CommentNode } from "./types";

/**
 * Builds a thread tree from a flat list of comments
 * Groups comments by parentId and creates nested reply structures
 */
export const buildThreadTree = (items: CommentType[]): CommentNode[] => {
  const map = new Map<string, CommentNode>();
  items.forEach((c) => map.set(c.id, { ...c, replies: [] }));

  const roots: CommentNode[] = [];

  map.forEach((node) => {
    const pid = node.parentId ? String(node.parentId) : "";
    if (pid && map.has(pid)) map.get(pid)!.replies.push(node);
    else roots.push(node);
  });

  const sortRec = (arr: CommentNode[]) => {
    arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    arr.forEach((n) => sortRec(n.replies));
  };
  sortRec(roots);

  return roots;
};

/**
 * Checks if a user can comment on a task
 */
export const canUserCommentOnTask = (task: any, user: any | null): boolean => {
  if (!user) return false;
  return (
    task?.CreatedUser?.id === user.uid || isTaskAssignedToUser(task, user.email)
  );
};

// Helper function reference (should be imported from taskUtils, but avoiding circular dependency)
const isTaskAssignedToUser = (task: any, email: string | null): boolean => {
  if (!email) return false;
  const assigned = task.assignedTo;
  if (!assigned) return false;
  const emailLower = email.toLowerCase();
  if (Array.isArray(assigned)) {
    return assigned.some(
      (e: any) => typeof e === "string" && e.toLowerCase() === emailLower
    );
  }
  return typeof assigned === "string" && assigned.toLowerCase() === emailLower;
};
