/** Shared helpers for important-date countdowns. */

export function nextOccurrence(dateStr: string, recurringYearly?: boolean): Date {
  const base = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(base.getTime())) return new Date(0);
  if (!recurringYearly) return base;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), base.getMonth(), base.getDate(), 12);
  if (next < today) {
    next = new Date(today.getFullYear() + 1, base.getMonth(), base.getDate(), 12);
  }
  return next;
}

export function countdownLabel(dateStr: string, recurringYearly?: boolean): string {
  const target = nextOccurrence(dateStr, recurringYearly);
  if (target.getTime() === 0) return "";
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1) return `In ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
