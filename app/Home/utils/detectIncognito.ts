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

const PRIVATE_BY_DEFAULT_UA = /DuckDuckGo/i;

function isPrivateByDefaultBrowser(): boolean {
  return PRIVATE_BY_DEFAULT_UA.test(navigator.userAgent);
}

function isLocalStorageBlocked(): boolean {
  try {
    const key = "__incognito_probe__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return false;
  } catch {
    return true;
  }
}

async function isIndexedDbBlocked(): Promise<boolean> {
  if (!window.indexedDB) return false;

  return new Promise((resolve) => {
    const dbName = `__incognito_probe_${Date.now()}__`;
    let settled = false;
    const finish = (blocked: boolean) => {
      if (settled) return;
      settled = true;
      resolve(blocked);
    };

    const request = window.indexedDB.open(dbName, 1);
    request.onerror = () => finish(true);
    request.onsuccess = () => {
      request.result.close();
      window.indexedDB.deleteDatabase(dbName);
      finish(false);
    };

    setTimeout(() => finish(false), 250);
  });
}

async function isStorageQuotaPrivate(): Promise<boolean | null> {
  if (!navigator.storage?.estimate) return null;

  const { quota } = await navigator.storage.estimate();
  if (quota === undefined) return null;

  // Chrome / Edge private windows are usually well under ~1.2 GB.
  if (quota < 1_200_000_000) return true;

  // Very large quota strongly suggests a normal browser profile.
  if (quota >= 4_000_000_000) return false;

  return null;
}

function isFileSystemPrivate(): Promise<boolean | null> {
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
 * Best-effort private/incognito detection for client-side gating.
 * Returns true when the environment should be treated as private.
 */
export async function detectIncognitoMode(): Promise<boolean> {
  if (isPrivateByDefaultBrowser()) return true;
  if (isLocalStorageBlocked()) return true;

  const indexedDbBlocked = await isIndexedDbBlocked();
  if (indexedDbBlocked) return true;

  const quotaSignal = await isStorageQuotaPrivate();
  if (quotaSignal === true) return true;
  if (quotaSignal === false) return false;

  const fileSystemSignal = await isFileSystemPrivate();
  if (fileSystemSignal !== null) return fileSystemSignal;

  // Unknown restrictive browsers: allow rather than block real private users.
  return true;
}
