type FileSystemWindow = Window & {
  TEMPORARY?: number;
  RequestFileSystem?: FileSystemRequestFn;
  webkitRequestFileSystem?: FileSystemRequestFn;
};

type FileSystemRequestFn = (
  type: number,
  size: number,
  success: () => void,
  error: () => void
) => void;

/**
 * Best-effort private/incognito detection for client-side gating.
 * Returns true when the environment should be treated as private.
 */
export async function detectIncognitoMode(): Promise<boolean> {
  // DuckDuckGo is private-by-default but often reports a large storage quota,
  // so it must be checked before the quota heuristic.
  if (/DuckDuckGo/i.test(navigator.userAgent)) return true;

  try {
    if (navigator.storage?.estimate) {
      const { quota } = await navigator.storage.estimate();
      if (quota !== undefined) {
        // Original rule: Chrome/Edge incognito quota stays well below ~4 GB.
        return quota < 4_000_000_000;
      }
    }

    const fsWindow = window as FileSystemWindow;
    const fs = fsWindow.RequestFileSystem || fsWindow.webkitRequestFileSystem;
    if (typeof fs === "function") {
      return new Promise((resolve) => {
        fs.call(
          window,
          fsWindow.TEMPORARY ?? 0,
          100,
          () => resolve(false),
          () => resolve(true)
        );
      });
    }

    return true;
  } catch {
    return true;
  }
}
