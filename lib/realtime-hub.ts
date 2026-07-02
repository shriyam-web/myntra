type RealtimeListener = () => void;

export type TypingPayload = {
  user: string;
  typing: boolean;
};

type TypingListener = (payload: TypingPayload) => void;

const listeners = new Set<RealtimeListener>();
const typingListeners = new Set<TypingListener>();

export function subscribeRealtime(listener: RealtimeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyRealtime(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeTyping(listener: TypingListener): () => void {
  typingListeners.add(listener);
  return () => typingListeners.delete(listener);
}

export function notifyTyping(payload: TypingPayload): void {
  typingListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // ignore listener errors
    }
  });
}
