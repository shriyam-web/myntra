type RealtimeListener = () => void;

const listeners = new Set<RealtimeListener>();

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
