/**
 * Checks if a data item belongs to the current user
 * by checking creator, assignedTo, or guests fields
 */
export function belongsToCurrentUser(
  data: any,
  uid: string | null,
  email: string | null
): boolean {
  let seenAnyUserField = false;
  let matched = false;

  const creator =
    data?.CreatedUser ||
    data?.createdBy ||
    data?.owner ||
    data?.ownerUser ||
    null;

  if (creator && typeof creator === "object") {
    seenAnyUserField = true;
    const creatorId = creator.id ?? creator.uid ?? null;
    const creatorEmail = creator.email ?? null;

    if (uid && creatorId === uid) matched = true;
    if (email && creatorEmail === email) matched = true;
  }

  if (data?.assignedTo) {
    seenAnyUserField = true;
    const assigned = data.assignedTo;

    if (typeof assigned === "string") {
      if (email && assigned === email) matched = true;
      if (uid && assigned === uid) matched = true;
    } else if (Array.isArray(assigned)) {
      if (email && assigned.includes(email)) matched = true;
      if (uid && assigned.includes(uid)) matched = true;
    } else if (typeof assigned === "object") {
      const aId = assigned.id ?? assigned.uid ?? null;
      const aEmail = assigned.email ?? null;
      if (uid && aId === uid) matched = true;
      if (email && aEmail === email) matched = true;
    }
  }

  if (Array.isArray(data?.guests)) {
    seenAnyUserField = true;

    for (const g of data.guests) {
      if (typeof g === "string") {
        if (email && g === email) {
          matched = true;
          break;
        }
      } else if (g && typeof g === "object") {
        const gId = g.id ?? g.uid ?? null;
        const gEmail = g.email ?? null;
        if ((uid && gId === uid) || (email && gEmail === email)) {
          matched = true;
          break;
        }
      }
    }
  }

  if (!seenAnyUserField) return false;
  return matched;
}
