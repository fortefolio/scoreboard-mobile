/**
 * Offline Scoring Queue & Synchronization Engine
 * Persists match events locally when network connectivity is lost
 * and automatically drains them (FIFO) with idempotency guards upon reconnection.
 */

export interface QueuedAtomicEvent {
  id: string;
  idempotencyKey: string;
  matchId: string;
  newScores?: any;
  eventData: Record<string, any>;
  newStatus?: string | null;
  createdAt: number;
  retryCount: number;
}

const STORAGE_KEY = "@scoreboard_offline_queue_v1";

let memoryStorage: Record<string, string> = {};
let isFlushing = false;
const listeners = new Set<(pendingCount: number) => void>();

async function getStorageItem(key: string): Promise<string | null> {
  try {
    // Dynamic import to prevent crash in test/web environments without native AsyncStorage
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default ||
      require("@react-native-async-storage/async-storage");
    if (AsyncStorage && typeof AsyncStorage.getItem === "function") {
      const val = await AsyncStorage.getItem(key);
      if (val !== undefined) return val;
    }
  } catch {}
  return memoryStorage[key] || null;
}

async function setStorageItem(key: string, value: string): Promise<void> {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default ||
      require("@react-native-async-storage/async-storage");
    if (AsyncStorage && typeof AsyncStorage.setItem === "function") {
      await AsyncStorage.setItem(key, value);
      return;
    }
  } catch {}
  memoryStorage[key] = value;
}

export function subscribeQueueChanges(cb: (pendingCount: number) => void): () => void {
  listeners.add(cb);
  getOfflineQueue().then((q) => cb(q.length));
  return () => {
    listeners.delete(cb);
  };
}

function notifyListeners(count: number) {
  listeners.forEach((cb) => {
    try {
      cb(count);
    } catch {}
  });
}

export async function getOfflineQueue(): Promise<QueuedAtomicEvent[]> {
  try {
    const raw = await getStorageItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedAtomicEvent[];
  } catch {
    return [];
  }
}

export async function saveOfflineQueue(queue: QueuedAtomicEvent[]): Promise<void> {
  await setStorageItem(STORAGE_KEY, JSON.stringify(queue));
  notifyListeners(queue.length);
}

export async function enqueueOfflineEvent(params: {
  matchId: string;
  newScores?: any;
  eventData: Record<string, any>;
  newStatus?: string | null;
  idempotencyKey: string;
}): Promise<QueuedAtomicEvent> {
  const queue = await getOfflineQueue();
  const event: QueuedAtomicEvent = {
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    idempotencyKey: params.idempotencyKey,
    matchId: params.matchId,
    newScores: params.newScores ?? null,
    eventData: params.eventData,
    newStatus: params.newStatus ?? null,
    createdAt: Date.now(),
    retryCount: 0,
  };

  queue.push(event);
  await saveOfflineQueue(queue);
  return event;
}

export async function clearOfflineQueue(): Promise<void> {
  await saveOfflineQueue([]);
}

/**
 * Drains all queued offline events sequentially in FIFO order.
 * Safe to call repeatedly thanks to RPC idempotency key.
 */
export async function flushOfflineQueue(
  supabase: any,
  matchIdFilter?: string
): Promise<{ processed: number; remaining: number }> {
  if (isFlushing) return { processed: 0, remaining: (await getOfflineQueue()).length };
  isFlushing = true;

  try {
    let queue = await getOfflineQueue();
    if (queue.length === 0) {
      isFlushing = false;
      return { processed: 0, remaining: 0 };
    }

    const itemsToProcess = matchIdFilter
      ? queue.filter((item) => item.matchId === matchIdFilter)
      : [...queue];

    let processedCount = 0;

    for (const item of itemsToProcess) {
      try {
        let res: any;
        if (typeof supabase?.rpc === "function") {
          res = await supabase.rpc("record_match_event_atomic", {
            p_match_id: item.matchId,
            p_idempotency_key: item.idempotencyKey,
            p_new_scores: item.newScores,
            p_event_data: item.eventData,
            p_new_status: item.newStatus,
          });
        } else {
          // Fallback to table inserts
          if (item.newScores || item.newStatus) {
            const upd: any = { updated_at: new Date().toISOString() };
            if (item.newScores) upd.scores = item.newScores;
            if (item.newStatus) upd.status = item.newStatus;
            await supabase.from("matches").update(upd).eq("id", item.matchId);
          }
          res = await supabase.from("match_events").insert([
            {
              match_id: item.matchId,
              event_data: item.eventData,
              idempotency_key: item.idempotencyKey,
            },
          ]);
        }

        // Check if network failed or server returned success
        if (res?.error) {
          const isNetworkError =
            res.error?.message?.includes("network") ||
            res.error?.message?.includes("fetch") ||
            res.error?.message?.includes("offline") ||
            res.error?.code === "ECONNREFUSED";

          if (isNetworkError) {
            // Stop draining on network failure; keep remaining items in queue
            break;
          }
        }

        // Successfully sent or already processed via idempotency
        queue = queue.filter((q) => q.id !== item.id);
        processedCount++;
        await saveOfflineQueue(queue);
      } catch (err: any) {
        const isNetworkError =
          err?.message?.includes("network") ||
          err?.message?.includes("fetch") ||
          err?.message?.includes("offline") ||
          err?.code === "ECONNREFUSED";

        if (isNetworkError) {
          break;
        }
        // Non-network error (e.g. invalid status), remove to prevent infinite loop
        queue = queue.filter((q) => q.id !== item.id);
        await saveOfflineQueue(queue);
      }
    }

    return { processed: processedCount, remaining: queue.length };
  } finally {
    isFlushing = false;
  }
}

/**
 * Initializes automatic connectivity listener using NetInfo.
 */
export function initOfflineNetworkSync(supabase: any) {
  try {
    const NetInfo =
      require("@react-native-community/netinfo").default ||
      require("@react-native-community/netinfo");

    if (NetInfo && typeof NetInfo.addEventListener === "function") {
      return NetInfo.addEventListener((state: any) => {
        if (state.isConnected && state.isInternetReachable !== false) {
          flushOfflineQueue(supabase);
        }
      });
    }
  } catch {}
  return () => {};
}
