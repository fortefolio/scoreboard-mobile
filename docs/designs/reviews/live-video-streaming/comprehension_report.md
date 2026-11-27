# Stage 6: Comprehension Test Report

* **Target Document:** [live-video-streaming.md](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/designs/live-video-streaming.md)
* **Reviewer:** `egm-comprehension`

---

### FeatureRange Paraphrase (Lines 1–117)

**What this proposes:**
This design adds `720p30` live video streaming to YouTube (via user-supplied RTMP URL and Stream Key) and 10-second instant replay directly into the `scoreboard-mobile` iOS and Android apps. A React Native/TypeScript layer handles match state sync (via Supabase Realtime), credential storage (`expo-secure-store`), and operator UI, while a new custom Expo native module (`live-streamer`, wrapping HaishinKit on iOS and RootEncoder on Android) handles camera/mic capture, GPU scoreboard overlay compositing, a rolling 10-second pre-overlay ring buffer, hardware H.264/AAC encoding, and RTMP publishing. To avoid dropping the YouTube stream during a replay, a single continuous encoder and RTMP connection remain open while an input switcher swaps the live camera texture for the decoded 10-second replay clip (with live mic audio and a `REPLAY` badge on the scoreboard overlay) and saves a clean MP4 locally. Both two-device (dedicated camera phone + separate scorer) and single-device (camera phone with an edge-docked score strip and camera-touch lock) workflows are supported, with adaptive bitrate, thermal monitoring, and an early 30+ minute physical-device PoC gate.

**How the existing system works, per this document:**
Currently, live ScoreBoard broadcast overlays are only available through `scoreboard-web` (`/match/[matchId]/overlay`), which requires a laptop running desktop streaming software (such as OBS Studio or vMix), capture hardware/setup, and manual scene configuration. Match scores are already synchronized in real time via Supabase Realtime (`score_update`, `SCORE_UPDATED`, and `postgres_changes` on `matches`), as implemented in `scoreboard-mobile/src/app/match/[id]/scoreboard.tsx`, and edit permissions use `isOrganizer || isUmpire`.

---

### DetailedRange Paraphrase (Lines 118–155)

The implementation is broken into four workstreams:
1. **Permissions & Build Config:** Add iOS/Android camera, microphone, and media-write permissions to `app.json`, register `modules/live-streamer` and `expo-media-library` in `package.json`, and link HaishinKit (iOS) and RootEncoder (Android) via Podfile/Gradle.
2. **Native Expo Module (`modules/live-streamer/`):** Create the Expo module config, TypeScript types (`StreamConfig`, `OverlaySnapshot`, `ReplayResult`, `StreamHealthEvent`), unified JS/TS bridge (`src/index.ts`), and parallel iOS (Swift/Metal) and Android (Kotlin/OpenGL ES) implementations (`LiveStreamerModule`, `VideoPipeline`, `OverlayRenderer`, `ReplayRingBuffer`).
3. **TypeScript State, Storage & UI (`src/`):** Add secure RTMP credential storage (`rtmpCredentials.ts`), pure `OverlaySnapshot` mapping with equality checks (`overlaySnapshot.ts`), a shared `useMatchRealtime.ts` hook (refactored out of `scoreboard.tsx`), `RtmpSetupModal.tsx`, `StreamControlsOverlay.tsx`, the landscape `stream.tsx` route, a "Live Stream" entry button on `[id].tsx`, and English/Portuguese i18n strings.
4. **Testing & Documentation:** Add unit tests for `overlaySnapshot.ts`, mocked component tests for `stream.tsx`, and a new `docs/05-live-streaming.md` guide (indexed in `docs/README.md`) including the 30+ minute physical-device PoC checklist.

---

### Comprehension Findings

1. **Severity**: Major
   **Affected Scope**: Native third-party dependencies — `HaishinKit` and `RootEncoder` (Lines 52, 108, 123, 130, 134)
   **Discrepancy Description & Rationale**: The entire native streaming and replay pipeline depends on `HaishinKit` (iOS) and `RootEncoder` (Android), but neither library is linked to its documentation/repository or briefly described (nor are target versions specified). A fresh reader cannot verify their capabilities, licensing, or API assumptions from the document alone.

2. **Severity**: Major
   **Affected Scope**: Assumed project-specific Realtime & permission model — `match:{id}`, `score_update`, `SCORE_UPDATED`, `postgres_changes` on `matches`, "match access", `isOrganizer || isUmpire` (Lines 28, 46, 92–93, 141)
   **Discrepancy Description & Rationale**: The document assumes prior knowledge of ScoreBoard's Supabase schema and auth model. It does not explain what "match access" means for a two-device camera operator (e.g., whether an unauthenticated user or any signed-in user can stream a public match), how `isOrganizer || isUmpire` is derived, or why both `score_update` and `SCORE_UPDATED` events exist alongside `postgres_changes` on `matches`.

3. **Severity**: Major
   **Affected Scope**: Replay MP4 export lifecycle & permission-denial handling (Lines 60, 76, 121–122, 132, 136)
   **Discrepancy Description & Rationale**: `ReplayRingBuffer` is described as writing a clean MP4 to local storage/camera roll, while `package.json` adds `expo-media-library` for exporting clips to the gallery/photos. It is ambiguous whether native writes a temporary file that JS copies to Photos via `expo-media-library` or writes directly to the camera roll, and what happens if the user denies photo-library write permission (`NSPhotoLibraryAddUsageDescription` / Android media write)—specifically whether in-stream replay still works without saving locally or fails.

4. **Severity**: Nit
   **Affected Scope**: Unlinked sibling project & issue reference — `scoreboard-web`, `scoreboard-web#47` (Lines 10, 34, 112, 114–115)
   **Discrepancy Description & Rationale**: `scoreboard-web` is referenced without a brief inline definition (e.g., "the ScoreBoard web app") or link, and `scoreboard-web#47` is an unlinked issue/PR reference.

5. **Severity**: Nit
   **Affected Scope**: Match clock ticking ownership — "JS or native ticks the clock at 1Hz" (Line 87)
   **Discrepancy Description & Rationale**: Leaving the owner of the 1Hz match-clock tick undecided ("JS or native") leaves a minor ambiguity in `OverlaySnapshot` bridge frequency and `OverlayRenderer` responsibilities for timed sports.
