# Offline Queue & Realtime Synchronization

Mobile connectivity at sports clubs and outdoor courts can be unstable. ScoreBoard implements an **offline-first optimistic queue** to guarantee zero lost points.

---

## 1. Offline Scoring Flow

```mermaid
sequenceDiagram
    autonumber
    actor Umpire as Referee Tap
    participant UI as React Native UI
    participant Queue as AsyncStorage Queue
    participant Net as NetInfo Listener
    participant DB as Supabase PostgreSQL

    Umpire->>UI: Awards Point to Team A
    UI->>UI: Optimistically updates score on screen
    UI->>Queue: Enqueues event with client-generated UUID
    alt Online
        UI->>DB: Sends point update / match_event
        DB-->>UI: 200 OK (De-queues event)
    else Offline
        Net-->>UI: Disconnected flag
        Note over UI,Queue: Event safely stored in AsyncStorage
        Net->>UI: Network restored!
        UI->>DB: Batch flushes queued events in chronological order
        DB-->>UI: Confirmed sync
    end
```

---

## 2. Realtime WebSocket Feeds

For spectators viewing matches on the mobile app:
- Subscribes via `@supabase/supabase-js` to channel `match-{matchId}`.
- Listens to `postgres_changes` on `matches` where `id = matchId`.
- Updates React state without pulling entire lists, preserving mobile battery life and cellular data.
