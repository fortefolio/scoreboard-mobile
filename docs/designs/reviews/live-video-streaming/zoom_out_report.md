# Stage 5: Initial Zoom Out & Inventive Catalyst Review Report

* **Target Document:** [live-video-streaming.md](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/designs/live-video-streaming.md)
* **Baseline Context:** [concepts_brief.md](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/concepts_brief.md)
* **Reviewers:** `egm-zoom-out`, `egm-inventive-catalyst`

---

## Zoom Out Review (`egm-zoom-out`)

Overall, the design aligns with the conservative v1 PoC scope, avoids server-side transcoding and WebView compositing, and reuses existing dependencies (`expo-secure-store`, `@react-native-community/netinfo`, `expo-keep-awake`, `expo-screen-orientation`) while extracting `useMatchRealtime.ts`.

### Findings

1. **Major — Reinventing Scoring Logic in `StreamControlsOverlay.tsx` (Codebase Reuse)**
   * **Affected Scope:** `Technical Plan > 4. Single-Device vs. Two-Device Workflows` (L93) & `Detailed Implementation > 3` (L144)
   * **Rationale:** The design proposes a generic `+1` / `-1` score strip in `StreamControlsOverlay.tsx` without referencing ScoreBoard's existing scoring engines (`src/lib/scoring/tennis-engine.ts`, etc.) or `recordMatchEventAtomic` (`src/lib/scoring/atomicScoring.ts`), which existing sport scoreboards use. A naive `+1`/`-1` increment cannot validly update Tennis/Padel (`0/15/30/40/AD`, tiebreaks, sets) or Volleyball (sets, win-by-2), and writing score updates directly would duplicate Supabase broadcast/DB sync and offline-queue logic. Single-device controls should reuse `recordMatchEventAtomic` and the existing sport scoring engines behind simple point/undo actions.

2. **Nit — Custom ABR, Load-Shedding, and Granular Telemetry in v1 PoC (YAGNI)**
   * **Affected Scope:** `Technical Plan > 5. Native Module Contract & Resilience` (L103, L106–107) & `Detailed Implementation > 3` (L144)
   * **Rationale:** Streaming live `bitrate` and `actual fps` to JS for a HUD pill and building custom RTMP send-queue ABR stepping adds native-to-JS event noise for a v1 PoC. Prefer HaishinKit/RootEncoder's built-in reconnect/bitrate handling and surface only coarse states (`Connecting`, `Live`, `Reconnecting`, `Thermal Warning`) unless 30+ minute PoC testing shows custom ABR is required.

3. **Nit — `expo-media-library` & Photo Gallery Permissions in v1 PoC (YAGNI)**
   * **Affected Scope:** `Detailed Implementation > 1. Native Permissions & Build Configuration` (L121–122)
   * **Rationale:** Adding `expo-media-library` and `NSPhotoLibraryAddUsageDescription` / Android media write permissions introduces extra native configuration and runtime permission prompts for a v1 PoC. Saving 10-second replay MP4s to app-local storage (with an optional system share sheet if needed) is simpler until the core streaming and replay pipeline is validated.

---

## Inventive Catalyst Review (`egm-inventive-catalyst`)

### Findings

1. **Major — Unseen Thermal Warnings in Two-Device Mode**
   * **Affected Scope:** `Technical Plan > 5. Native Module Contract & Resilience` and `4. Single-Device vs. Two-Device Workflows`
   * **False Compromise:** The design assumes surfacing a thermal/network warning pill on the filming phone's `StreamControlsOverlay` and letting the operator manually shed load is sufficient. In Two-Device mode, the filming phone is mounted away from the scorekeeper, so on-screen warnings go unseen before the OS throttles or kills the camera session.
   * **Proposed Resolution:** Use an autonomous thermal reconciliation loop in `VideoPipeline` to automatically pause the replay ring buffer or step down bitrate when critical thermal thresholds are reached, and optionally relay coarse `StreamHealthEvent` alerts over `match:{id}` Realtime so the scorer device can alert the operator.
   * **Secondary Liabilities:** Autonomous load shedding disables instant replay during high-heat periods without operator confirmation; relaying health telemetry adds minor Realtime traffic.

2. **Major — Hidden Dual-Encoder Contention & Buffer Freeze Gap**
   * **Affected Scope:** `Technical Plan > 2. Stream Continuity & 10-Second Instant Replay Pipeline` (L73–76)
   * **False Compromise:** Section 2 states the native module runs "one permanent hardware H.264/AAC encoder" (L73), while step 1 (L74) proposes continuously writing the pre-overlay 10-second ring buffer as "compressed clean GOP segments in memory or rotating 2-second temp MP4 chunks." Continuously encoding clean pre-overlay video alongside the post-overlay RTMP stream silently requires a *second* continuous hardware H.264 encoder (plus a hardware decoder during replay), creating contention with Android `MediaCodec` concurrent-session limits and the thermal budget. Additionally, "freezing" the buffer on replay trigger (L76) drops 10 seconds of incoming live footage during replay playback.
   * **Proposed Resolution:** Probe hardware encoder concurrency at stream startup and dynamically degrade (disable the pre-overlay compressed ring buffer on encoder-constrained or thermally stressed devices) rather than assuming dual-encoder availability. Use a sliding/double-buffered ring window rather than freezing capture during replay.
   * **Secondary Liabilities:** Capability probing and fallback paths add platform-specific branching in `VideoPipeline.kt`/`VideoPipeline.swift` and feature variance across mid-range devices.

3. **Nit — Replay Playback Coupled to Media Library I/O**
   * **Affected Scope:** `Technical Plan > 2. Stream Continuity & 10-Second Instant Replay Pipeline` (L75–77)
   * **False Compromise:** Triggering `expo-media-library` persistence alongside decoding the clip for live RTMP playback risks I/O stalls or permission/storage errors delaying the live broadcast cut.
   * **Proposed Resolution:** Decouple real-time replay playback (reading directly from the ring buffer) from asynchronous background export to local storage.
   * **Secondary Liabilities:** Requires managing temporary clip cleanup if background export fails.
