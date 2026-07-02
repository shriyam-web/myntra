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

type NavigatorWithHints = Navigator & {
  userAgentData?: {
    brands?: Array<{ brand: string; version: string }>;
    getHighEntropyValues?: (hints: string[]) => Promise<{
      brands?: Array<{ brand: string; version: string }>;
      fullVersionList?: Array<{ brand: string; version: string }>;
    }>;
  };
};

function hasDuckDuckGoBrand(
  brands?: Array<{ brand: string; version: string }>
): boolean {
  return brands?.some((entry) => /duckduckgo/i.test(entry.brand)) ?? false;
}

/**
 * DuckDuckGo is private-by-default but often hides in the UA string
 * (Android: ddg_android, Windows: spoofs Edge, macOS: Ddg/).
 */
async function isDuckDuckGoBrowser(): Promise<boolean> {
  const ua = navigator.userAgent;
  if (/duckduckgo|ddg_android|ddg_ios|com\.duckduckgo|(?:^|\s)ddg\//i.test(ua)) {
    return true;
  }

  const nav = navigator as NavigatorWithHints;
  if (hasDuckDuckGoBrand(nav.userAgentData?.brands)) {
    return true;
  }

  try {
    const hints = await nav.userAgentData?.getHighEntropyValues?.([
      "brands",
      "fullVersionList",
    ]);
    if (hasDuckDuckGoBrand(hints?.brands)) return true;
    if (hasDuckDuckGoBrand(hints?.fullVersionList)) return true;
  } catch {
    // ignore — fall through to quota heuristics
  }

  return false;
}

/**
 * Best-effort private/incognito detection for client-side gating.
 * Returns true when the environment should be treated as private.
 */
export async function detectIncognitoMode(): Promise<boolean> {
  if (await isDuckDuckGoBrowser()) return true;

  try {
    if (navigator.storage?.estimate) {
      const { quota } = await navigator.storage.estimate();
      if (quota !== undefined) {
        // Chrome/Edge incognito quota stays well below ~4 GB.
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
