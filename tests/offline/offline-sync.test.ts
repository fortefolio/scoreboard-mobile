import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  enqueueOfflineEvent,
  getOfflineQueue,
  clearOfflineQueue,
  flushOfflineQueue,
} from "@/lib/offline/offlineQueue";
import { recordMatchEventAtomic } from "@/lib/scoring/atomicScoring";

describe("Mobile Offline Queue & Network Recovery Engine", () => {
  beforeEach(async () => {
    await clearOfflineQueue();
    vi.clearAllMocks();
  });

  it("enqueues atomic events with idempotency keys when offline", async () => {
    const event = await enqueueOfflineEvent({
      matchId: "match-mob-offline-1",
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      newScores: { current: { home: 1, away: 0 } },
      eventData: { type: "point_won", side: "home" },
    });

    expect(event.idempotencyKey).toBe("11111111-1111-4111-8111-111111111111");

    const queue = await getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].matchId).toBe("match-mob-offline-1");
    expect(queue[0].eventData.type).toBe("point_won");
  });

  it("automatically catches network failures in recordMatchEventAtomic and enqueues event", async () => {
    // Mock Supabase client where network fails
    const mockFailingSupabase = {
      rpc: vi.fn().mockRejectedValue(new Error("Network request failed")),
      from: vi.fn(),
    };

    const res = await recordMatchEventAtomic(mockFailingSupabase, {
      matchId: "match-mob-offline-2",
      newScores: { current: { home: 15, away: 12 } },
      eventData: { type: "score", points: 3, side: "home" },
    });

    // Should not throw, should indicate queued
    expect(res.error).toBeNull();
    expect((res as any).queued).toBe(true);

    const queue = await getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].matchId).toBe("match-mob-offline-2");
    expect(queue[0].newScores.current.home).toBe(15);
  });

  it("flushes queued events to Supabase in FIFO order when connectivity is restored", async () => {
    // 1. Enqueue 3 points while offline
    await enqueueOfflineEvent({
      matchId: "match-mob-offline-3",
      idempotencyKey: "key-1",
      newScores: { current: { home: 1, away: 0 } },
      eventData: { type: "point_won", side: "home" },
    });
    await enqueueOfflineEvent({
      matchId: "match-mob-offline-3",
      idempotencyKey: "key-2",
      newScores: { current: { home: 2, away: 0 } },
      eventData: { type: "point_won", side: "home" },
    });
    await enqueueOfflineEvent({
      matchId: "match-mob-offline-3",
      idempotencyKey: "key-3",
      newScores: { current: { home: 2, away: 1 } },
      eventData: { type: "point_won", side: "away" },
    });

    expect((await getOfflineQueue()).length).toBe(3);

    // 2. Reconnection: mock working Supabase RPC
    const rpcCalls: any[] = [];
    const mockOnlineSupabase = {
      rpc: vi.fn().mockImplementation((name, args) => {
        rpcCalls.push({ name, args });
        return Promise.resolve({ data: { id: args.p_match_id }, error: null });
      }),
    };

    // 3. Flush queue
    const { processed, remaining } = await flushOfflineQueue(mockOnlineSupabase);

    expect(processed).toBe(3);
    expect(remaining).toBe(0);
    expect(rpcCalls.length).toBe(3);

    // Verify FIFO order and preserved idempotency keys
    expect(rpcCalls[0].args.p_idempotency_key).toBe("key-1");
    expect(rpcCalls[1].args.p_idempotency_key).toBe("key-2");
    expect(rpcCalls[2].args.p_idempotency_key).toBe("key-3");

    // Queue is empty
    expect((await getOfflineQueue()).length).toBe(0);
  });
});
