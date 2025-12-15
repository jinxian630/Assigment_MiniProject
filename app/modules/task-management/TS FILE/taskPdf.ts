// app/modules/task-management/utils/taskPdfBuilder.ts

import { MODULE_COLOR } from "./TaskSharedUI";

type Task = {
  taskName: string;
  details?: string;
  startDate?: number | null;
  dueDate?: number | null;
  completed?: boolean;
  priorityScore?: number;
};

type BuildTaskPdfParams = {
  tasks: Task[];
  userEmail: string;
  counts: {
    overdue: number;
    active: number;
    completed: number;
  };
};

const formatDate = (ms?: number | null) => {
  if (typeof ms !== "number") return "-";
  return new Date(ms).toLocaleDateString("en-GB");
};

const escapeHtml = (s: string) =>
  (s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildTaskPdfHtml({
  tasks,
  userEmail,
  counts,
}: BuildTaskPdfParams): string {
  const rows = tasks
    .map((t, i) => {
      const start = formatDate(t.startDate);
      const due = formatDate(t.dueDate);
      const status = t.completed ? "Completed" : "Pending";

      const score = t.priorityScore ?? null;
      let priorityLabel = "Low";
      let priorityClass = "p-low";

      if (score !== null && score >= 100) {
        priorityLabel = "High";
        priorityClass = "p-high";
      } else if (score !== null && score >= 60) {
        priorityLabel = "Medium";
        priorityClass = "p-med";
      }

      const isOverdue =
        !t.completed &&
        typeof t.dueDate === "number" &&
        new Date(t.dueDate).setHours(0, 0, 0, 0) <
          new Date().setHours(0, 0, 0, 0);

      return `
<tr class="${isOverdue ? "row-overdue" : ""}">
  <td>${i + 1}</td>
  <td>
    <div class="task-title ${t.completed ? "task-done" : ""}">
      ${escapeHtml(t.taskName)}
    </div>
    ${
      t.details
        ? `<div class="task-sub ${t.completed ? "task-done" : ""}">
            ${escapeHtml(t.details)}
           </div>`
        : ""
    }
  </td>
  <td>${start}</td>
  <td>${due}</td>
  <td>
    ${
      score == null
        ? "—"
        : `<span class="badge ${priorityClass}">
            ${priorityLabel} (${score})
          </span>`
    }
  </td>
  <td>${status}${isOverdue ? " • Overdue" : ""}</td>
</tr>`;
    })
    .join("");

  return `
<html>
<head>
<style>
  body {
    font-family: Arial, sans-serif;
    background: #020617;
    color: #306de8ff;
    padding: 20px;
  }
  h1 { font-size: 20px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
    font-size: 12px;
  }
  th, td {
    padding: 10px;
    border-bottom: 1px solid #1e293b;
    text-align: left;
  }
  th {
    color: #2767bfff;
    font-size: 11px;
  }
  .task-title { font-weight: bold; }
  .task-sub { font-size: 11px; color: #3c65acff; margin-top: 2px; }
  .task-done { text-decoration: line-through; opacity: 0.6; }

  .badge {
    padding: 4px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: bold;
  }
  .p-high { background: #fee2e2; color: #b91c1c; }
  .p-med  { background: #dbeafe; color: #1d4ed8; }
  .p-low  { background: #e5e7eb; color: #111827; }

  .row-overdue { background: rgba(239,68,68,0.08); }
</style>
</head>

<body>
  <h1>Task List</h1>
  <p>User: ${escapeHtml(userEmail)}</p>

  <p>
    Overdue: ${counts.overdue} |
    Active: ${counts.active} |
    Completed: ${counts.completed}
  </p>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Task</th>
        <th>Start</th>
        <th>Due</th>
        <th>Priority</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="6">No tasks available.</td></tr>`}
    </tbody>
  </table>
</body>
</html>
`;
}
