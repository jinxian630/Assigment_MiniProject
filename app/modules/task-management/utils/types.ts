export type TaskType = {
  id: string;
  taskName: string;
  details?: string;
  startDate?: number | null;
  dueDate?: number | null;
  assignedTo?: string | string[];
  completed?: boolean;
  createdAt: number;
  updatedAt: number;
  CreatedUser: { id: string; name: string; email?: string };
  priorityScore?: number;
  guests?: string[];
};

export type BucketKey = "doNow" | "doSoon" | "plan" | "low";

export type ViewMode = "all" | "assignedToMe" | "ai";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type CommentType = {
  id: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
  user: { id: string; name: string; email?: string };
  parentId?: string | null;
  mentions?: string[];
};

export type ChatMessageType = {
  id: string;
  text: string;
  createdAt: number;
  user: { id: string; name: string; email?: string };
};

export type FilterType = "all" | "active" | "completed" | "overdue";

export type CommentNode = CommentType & { replies: CommentNode[] };

export type CalendarTarget =
  | "taskStart"
  | "taskDue"
  | "subtaskStart"
  | "subtaskDue"
  | null;
