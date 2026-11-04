# Mobile Documentation Synchronization Rule (Docs-as-Code)

This repository maintains a living technical wiki in `docs/` describing the React Native / Expo Router architecture, referee mode UX, offline synchronization queue, and mobile backend integrations.

## 1. Synchronization Mandate
Whenever you create, modify, or delete mobile screens or hooks, you **must update the corresponding documentation in `docs/` within the same working session**:

| Area Modified | Target Documentation File | What to Update |
| :--- | :--- | :--- |
| **Screens & Navigation** (`src/app/`, `src/navigation/`) | [`docs/01-architecture-mobile.md`](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/01-architecture-mobile.md) | New tab screens, stack routes, modals, layouts, and NativeWind theme changes. |
| **Referee & Scoring UX** (`src/app/match/score/`, `src/components/scoring/`) | [`docs/02-referee-mode.md`](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/02-referee-mode.md) | Umpire controls, `appoint_match_umpire` RPC usage, score undo/redo, service indicators. |
| **Offline Sync & Realtime** (`src/lib/offline/`, `src/hooks/useRealtime.ts`) | [`docs/03-offline-sync-and-realtime.md`](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/03-offline-sync-and-realtime.md) | `AsyncStorage` queue logic, network reconnection batching, and Realtime channels. |
| **Supabase & Push Alerts** (`src/lib/supabase.ts`, `src/lib/notifications.ts`) | [`docs/04-backend-integration.md`](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/04-backend-integration.md) | Push token registration, background notifications, and authentication sessions. |

## 2. Diagram Standards
- When data structures or flow changes, update the relevant **Mermaid diagrams** (`sequenceDiagram`, `flowchart TD`).
- Always quote special characters in labels: `id["Node (Details)"]`.

## 3. Commit Rule
- Include the updated documentation in the same git commit as the mobile code changes.
