/**
 * Tiny IndexedDB-backed store for the latest metrics snapshot.
 *
 * Purpose: give returning visitors an instant first paint. We persist the most
 * recent *live* all-sources snapshot the user saw, then replay it on the next
 * visit while the backend cold-starts. Replaced by live data the moment the
 * socket delivers it.
 *
 * Deliberately dependency-free (native IndexedDB) and fully fault-tolerant:
 * SSR, private-browsing, quota errors and blocked upgrades all degrade to a
 * no-op / null rather than throwing. IndexedDB is browser-only, so callers must
 * invoke these from effects, never during render/SSR.
 */

const DB_NAME = "devops-insights";
const STORE_NAME = "metrics";
const SNAPSHOT_KEY = "latest-snapshot";
const DB_VERSION = 1;

export interface PersistedSnapshot {
  metrics: Record<string, unknown>;
  latestTimestamps: Record<string, string>;
  savedAt: string; // ISO timestamp of when this snapshot was persisted
}

function isAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (!isAvailable()) {
      resolve(null);
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

export async function loadSnapshot(): Promise<PersistedSnapshot | null> {
  try {
    const db = await openDB();
    if (!db) return null;
    return await new Promise<PersistedSnapshot | null>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
        req.onsuccess = () => {
          const value = req.result as PersistedSnapshot | undefined;
          resolve(value && value.metrics ? value : null);
        };
        req.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function saveSnapshot(snapshot: PersistedSnapshot): Promise<void> {
  try {
    const db = await openDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(snapshot, SNAPSHOT_KEY);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // Swallow — persistence is best-effort and must never break the app.
  }
}
