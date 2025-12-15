// app/modules/task-management/utils/eventUtils.ts
import { ref as storageRef } from "firebase/storage";
import { refFromURL } from "firebase/storage";

export type AnyUser = { uid?: string; email?: string } | null;

export const getTodayMs = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.getTime();
};

export const formatDateGB = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const isEventPast = (date?: number) => {
  if (typeof date !== "number") return false;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return date < d.getTime();
};

export const normalizeAttachments = (att?: string[] | string): string[] => {
  if (Array.isArray(att)) return att.filter(Boolean);
  if (typeof att === "string" && att.trim()) return [att.trim()];
  return [];
};

export const normalizeGuests = (guests?: string[] | string): string => {
  if (Array.isArray(guests)) return guests.filter(Boolean).join(", ");
  if (typeof guests === "string" && guests.trim()) return guests.trim();
  return "—";
};

export const canUserSeeItem = (item: any, user: AnyUser): boolean => {
  if (!user) return false;

  const uid = user.uid || "";
  const email = (user.email || "").toLowerCase();

  if (item?.createdBy?.id === uid) return true;
  if (item?.assignedToId && item.assignedToId === uid) return true;

  if (
    Array.isArray(item?.assignedUserIds) &&
    item.assignedUserIds.includes(uid)
  )
    return true;

  if (Array.isArray(item?.guests) && email) {
    const guestEmails = item.guests
      .filter((g: any) => typeof g === "string")
      .map((g: string) => g.toLowerCase());
    return guestEmails.includes(email);
  }

  return false;
};

export const escapeHtml = (value: any) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const resolveStorageRef = (storage: any, urlOrPath: string) => {
  if (!urlOrPath) return null;

  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    return refFromURL(urlOrPath);
  }

  return storageRef(storage, urlOrPath);
};
