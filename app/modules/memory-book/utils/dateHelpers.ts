export function formatShortDate(timestamp?: number): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatFullDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function getYear(timestamp: number): number {
  return new Date(timestamp).getFullYear();
}

export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const d1 = new Date(timestamp1);
  const d2 = new Date(timestamp2);
  return d1.toDateString() === d2.toDateString();
}

export function getStartOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getEndOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
