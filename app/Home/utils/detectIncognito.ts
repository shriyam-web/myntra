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

const GIB = 1024 ** 3;
/** Chrome 147 reported ~9 GiB headroom in incognito vs ~10 GiB in a normal tab. */
const QUOTA_HEADROOM_PRIVATE_MAX = 9.5 * GIB;
/** Pre-predictable-quota Chromium incognito stayed well below ~4 GB. */
const LEGACY_QUOTA_PRIVATE_MAX = 4_000_000_000;

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
    // ignore — fall through to quota / engine heuristics
  }

  return false;
}

function isIosWebKit(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Engine fingerprint via Number#toFixed error message length (detectIncognito). */
function toFixedEngineId(): number {
  const neg = Number.parseInt("-1", 10);
  try {
    neg.toFixed(neg);
  } catch (error) {
    return error instanceof Error ? error.message.length : 0;
  }
  return 0;
}

function isSafariEngine(): boolean {
  const id = toFixedEngineId();
  return id === 44 || id === 43 || isIosWebKit();
}

function isChromiumEngine(): boolean {
  return toFixedEngineId() === 51 || /Chrome|Chromium|Edg|OPR|Brave/i.test(navigator.userAgent);
}

function isFirefoxEngine(): boolean {
  return toFixedEngineId() === 25 || /Firefox\//.test(navigator.userAgent);
}

/**
 * True when storage quota still looks like a private profile.
 * After Chrome's 2026 static quota (usage + 10 GiB in both modes) this often
 * returns false for incognito too — callers must run a second check.
 */
async function quotaLooksPrivate(): Promise<boolean> {
  if (!navigator.storage?.estimate) return false;
  try {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota === undefined) return false;
    if (quota < LEGACY_QUOTA_PRIVATE_MAX) return true;
    const headroom = quota - (usage ?? 0);
    return headroom < QUOTA_HEADROOM_PRIVATE_MAX;
  } catch {
    return false;
  }
}

function fileSystemLooksPrivate(): Promise<boolean | null> {
  const fsWindow = window as FileSystemWindow;
  const fs = fsWindow.RequestFileSystem || fsWindow.webkitRequestFileSystem;
  if (typeof fs !== "function") return Promise.resolve(null);
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

/**
 * Chromium incognito uses an in-memory LevelDB; strict vs relaxed IDB commits
 * cost about the same. On disk, strict fsync is slower. Adapted from
 * detectIncognito v1.8.1 (MIT, Joe Rutkowski) — quota can no longer tell
 * the two modes apart once Chrome reports usage + 10 GiB in both.
 */
function chromiumIndexedDbLooksPrivate(): Promise<boolean | null> {
  const PAYLOAD = 16384;
  const WRITES = 15;
  const ROUNDS = 15;
  const MIN_ROUNDS = 7;
  const CAP_MS = 1000;
  const THRESHOLD = 1.3;

  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const dbName = `__di_${Math.random().toString(36).slice(2)}`;
    const payload = new Uint8Array(PAYLOAD);
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("s");
    };
    req.onerror = () => {
      indexedDB.deleteDatabase(dbName);
      resolve(null);
    };
    req.onsuccess = () => {
      const db = req.result;
      let honored = false;
      try {
        const probe = db.transaction("s", "readwrite", { durability: "strict" });
        honored = probe.durability === "strict";
        probe.abort();
      } catch {
        honored = false;
      }
      if (!honored) {
        db.close();
        indexedDB.deleteDatabase(dbName);
        resolve(null);
        return;
      }

      const block = (durability: IDBTransactionDurability) =>
        new Promise<number>((ok, fail) => {
          const t0 = performance.now();
          let i = 0;
          const step = () => {
            if (i === WRITES) {
              ok(performance.now() - t0);
              return;
            }
            const tx = db.transaction("s", "readwrite", { durability });
            tx.objectStore("s").put(payload, i);
            i += 1;
            tx.oncomplete = step;
            tx.onerror = () => fail(tx.error);
            tx.onabort = () => fail(tx.error);
          };
          step();
        });

      void (async () => {
        const start = performance.now();
        await block("relaxed");
        await block("strict");
        const ratios: number[] = [];
        for (let r = 0; r < ROUNDS; r++) {
          const rel = await block("relaxed");
          const str = await block("strict");
          ratios.push(rel > 0 ? str / rel : Number.POSITIVE_INFINITY);
          if (ratios.length >= MIN_ROUNDS && performance.now() - start >= CAP_MS) break;
        }
        ratios.sort((a, b) => a - b);
        db.close();
        indexedDB.deleteDatabase(dbName);
        resolve(ratios[ratios.length >> 1]! < THRESHOLD);
      })().catch(() => {
        db.close();
        indexedDB.deleteDatabase(dbName);
        resolve(null);
      });
    };
  });
}

async function safariLooksPrivate(): Promise<boolean | null> {
  if (typeof navigator.storage?.getDirectory === "function") {
    try {
      await navigator.storage.getDirectory();
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return message.includes("unknown transient reason");
    }
  }
  return null;
}

async function firefoxLooksPrivate(): Promise<boolean | null> {
  if (typeof navigator.storage?.getDirectory === "function") {
    try {
      await navigator.storage.getDirectory();
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("Security error")) return true;
      return null;
    }
  }
  return null;
}

/**
 * Best-effort private/incognito detection for client-side gating.
 * Returns true when the environment should be treated as private.
 */
export async function detectIncognitoMode(): Promise<boolean> {
  if (await isDuckDuckGoBrowser()) return true;

  try {
    if (await quotaLooksPrivate()) return true;

    if (isSafariEngine()) {
      const safari = await safariLooksPrivate();
      if (safari !== null) return safari;
    } else if (isFirefoxEngine() && !isChromiumEngine()) {
      const firefox = await firefoxLooksPrivate();
      if (firefox !== null) return firefox;
    } else if (isChromiumEngine()) {
      const chromium = await chromiumIndexedDbLooksPrivate();
      if (chromium !== null) return chromium;
    }

    const fs = await fileSystemLooksPrivate();
    if (fs !== null) return fs;

    // Unknown engine / APIs stripped: fail open so a private window is not locked out.
    return true;
  } catch {
    return true;
  }
}
