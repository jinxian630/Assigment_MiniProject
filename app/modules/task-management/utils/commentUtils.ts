import type { CommentType, CommentNode } from "./types";
import { isTaskAssignedToUser } from "./taskUtils";

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
