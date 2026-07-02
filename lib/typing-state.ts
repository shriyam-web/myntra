import { notifyTyping } from "./realtime-hub";

const TYPING_TTL_MS = 4000;
const VALID_USERS = new Set(["alpha 1", "delta 1"]);

const typingExpiry = new Map<string, number>();
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const activeTyping = new Set<string>();

function normalizeUser(user: string): string | null {
  const normalized = user.trim().toLowerCase();
  return VALID_USERS.has(normalized) ? normalized : null;
}

function clearTypingTimer(user: string) {
  const timer = expiryTimers.get(user);
  if (timer) {
    clearTimeout(timer);
    expiryTimers.delete(user);
  }
}

function expireTyping(user: string) {
  const expiresAt = typingExpiry.get(user);
  if (!expiresAt || expiresAt > Date.now()) return;

  typingExpiry.delete(user);
  clearTypingTimer(user);

  if (activeTyping.delete(user)) {
    notifyTyping({ user, typing: false });
  }
}

function scheduleExpiry(user: string) {
  clearTypingTimer(user);
  expiryTimers.set(
    user,
    setTimeout(() => expireTyping(user), TYPING_TTL_MS)
  );
}

export function setTypingState(user: string, typing: boolean): boolean {
  const normalized = normalizeUser(user);
  if (!normalized) return false;

  if (!typing) {
    typingExpiry.delete(normalized);
    clearTypingTimer(normalized);
    if (activeTyping.delete(normalized)) {
      notifyTyping({ user: normalized, typing: false });
    }
    return true;
  }

  const wasTyping = activeTyping.has(normalized);
  typingExpiry.set(normalized, Date.now() + TYPING_TTL_MS);
  activeTyping.add(normalized);
  scheduleExpiry(normalized);

  if (!wasTyping) {
    notifyTyping({ user: normalized, typing: true });
  }

  return true;
}

export function isUserTyping(user: string): boolean {
  const normalized = normalizeUser(user);
  if (!normalized) return false;
  const expiresAt = typingExpiry.get(normalized);
  if (!expiresAt || expiresAt <= Date.now()) return false;
  return activeTyping.has(normalized);
}
