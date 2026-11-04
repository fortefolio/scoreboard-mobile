---
name: living-docs
description: "Automated codebase wiki documentation and continuous drift synchronization engine for scoreboard-mobile. Analyzes React Native / Expo Router navigation, referee scoring interfaces, offline queues, and push notifications to generate and maintain a living Markdown wiki in docs/ with Mermaid diagrams. Activate this skill whenever asked to document the mobile app, update referee docs, or sync mobile changes."
---

# Living Docs: Mobile Application Documentation & Continuous Sync

A local, autonomous documentation engine that functions as an intelligent, self-updating Code Wiki for `scoreboard-mobile`.

---

## 1. Documentation Architecture (`docs/`)

All project documentation lives in the `docs/` directory of `scoreboard-mobile`:

| File | Purpose | Key Contents |
| :--- | :--- | :--- |
| **[`docs/README.md`](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/README.md)** | **Mobile Wiki Index** | Architecture overview, data flow diagram, and directory map. |
| **[`docs/01-architecture-mobile.md`](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/01-architecture-mobile.md)** | **Expo Router & UI** | File-based navigation structure, tab layouts, screens, and styling. |
| **[`docs/02-referee-mode.md`](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/02-referee-mode.md)** | **Referee Mode & Live Scoring** | Match umpire controls, `appoint_match_umpire` integration, undo/redo UX. |
| **[`docs/03-offline-sync-and-realtime.md`](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/03-offline-sync-and-realtime.md)** | **Offline Queue & Realtime** | Optimistic UI updates, `AsyncStorage` persistence, reconnection sync, Realtime feeds. |
| **[`docs/04-backend-integration.md`](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/04-backend-integration.md)** | **Backend & Push Services** | React Native Supabase auth session, `expo-notifications`, token registration. |

---

## 2. Workflows

### Incremental Drift Synchronization (After Code Changes)
Whenever screens, navigation, or offline hooks are created or altered:
1. Inspect `git status` or `git diff` inside `scoreboard-mobile`.
2. Update the corresponding `docs/` file per `.agents/rules/docs-sync.md`.
3. Keep Mermaid diagrams accurate.
4. Commit doc updates alongside the React Native code changes.
