# Stage 8: Intermediate Zoom Out Review

* **Target Document:** [live-video-streaming.md](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/docs/designs/live-video-streaming.md)
* **Baseline Context:** [concepts_brief.md](file:///Users/goncaloforte/Sandbox/ScoreBoard/scoreboard-mobile/concepts_brief.md)
* **Inputs Audited:** [zoom_out_report.md](file:///Users/goncaloforte/.gemini/antigravity-cli/brain/8c191be3-e401-453f-90e4-24ddc8d09048/zoom_out_report.md), [comprehension_report.md](file:///Users/goncaloforte/.gemini/antigravity-cli/brain/8c191be3-e401-453f-90e4-24ddc8d09048/comprehension_report.md), [critic_report.md](file:///Users/goncaloforte/.gemini/antigravity-cli/brain/8c191be3-e401-453f-90e4-24ddc8d09048/critic_report.md)

## Assessment Summary
The core architecture in `live-video-streaming.md` remains aligned with a conservative v1 PoC (`720p30`, user-owned RTMP, no cloud transcoding, single continuous encoder). However, **several proposed additions in Stage 7 (`critic_report.md`) would introduce significant over-engineering and low-level media-engine complexity for a v1 PoC**, and Stage 5's reuse/YAGNI findings remain unresolved in the current draft.

---

## Findings

1. **Severity:** Major
   **Affected Scope:** Stage 7 `critic_report.md` Design Critic #2, #3, #6, #7; `live-video-streaming.md` `Technical Plan > 2` & `5` (L71–80, L105–108)
   **Simplicity Rationale:** Multiple Stage 7 Critic proposals push production-hardening and low-level AV engineering into a v1 PoC before the 30+ minute physical-device PoC gate has even run:
   * *Custom VFR-to-CFR frame pacer & silent-PCM audio fallback (Critic #2):* Building custom frame-pacing and silent-PCM audio synthesizers in both Swift and Kotlin is heavy native media work. For v1 PoC, rely on HaishinKit/RootEncoder's built-in capture clocks and treat phone-call/Bluetooth audio interruptions as a stream warning/stop rather than synthesizing silent PCM. Likewise, back-to-back or `<10s` `triggerReplay()` calls are prevented by disabling the Replay button for the first 10s and during active replay—no double-buffered replay queue needed.
   * *Background streaming lifecycle / Android 14+ Foreground Service (Critic #3):* `stream.tsx` already uses `expo-keep-awake` to keep the screen active. Adding an Android Foreground Service (`camera|microphone`) and iOS background `AVCaptureSession` recovery is unnecessary for a v1 PoC mounted on a tripod; cleanly stopping/pausing on backgrounding is simpler.
   * *Manual H.264 SPS/PPS + AAC `AudioSpecificConfig` header resync & concrete ABR/thermal thresholds (Critic #6, #7):* HaishinKit and RootEncoder already manage RTMP handshake and codec headers on reconnect; specifying NAL-level header resending drops into library internals. Inventing concrete ABR step-down and thermal-shedding thresholds before running the PoC spike is premature optimization.

2. **Severity:** Major
   **Affected Scope:** `live-video-streaming.md` `Technical Plan > 4` (L93) & `Detailed Implementation > 3` (L144); `critic_report.md` #3
   **Simplicity Rationale:** Stage 5's reuse finding (`zoom_out_report.md` Major #1) is still unresolved: `StreamControlsOverlay.tsx` proposes a generic `+1` / `-1` score strip instead of reusing `scoreboard-mobile`'s existing sport scoring engines and `recordMatchEventAtomic`. A raw `+1`/`-1` increment cannot validly score Tennis/Padel or Volleyball and duplicates Realtime/offline-queue sync logic. Additionally, `Camera Touch Lock` does not need new native module methods unless native tap-to-focus is explicitly implemented; a React Native `pointerEvents` overlay achieves touch lock with zero native bridge code.

3. **Severity:** Major
   **Affected Scope:** `live-video-streaming.md` `Technical Plan > 3` (L82–87), `Detailed Implementation > 1` & `2` (L121–122, L131, L135); `critic_report.md` #5; `comprehension_report.md` #3
   **Simplicity Rationale:**
   * *HUD Rendering:* Scoping v1 to a single generic HUD layout (as stated in `concepts_brief.md` L16) is far simpler than adding a React Native offscreen-view rasterization bridge.
   * *Replay Export & Permissions:* Adopting Stage 5 Nit #3 (drop `expo-media-library` and Photo Library permissions in v1; save 10s MP4s to app-local storage) eliminates both the extra native dependency and permission-denial edge cases.

4. **Severity:** Nit
   **Affected Scope:** `live-video-streaming.md` `Technical Plan > 2` (L73–76); `critic_report.md` #1, #9
   **Simplicity Rationale:** Resolving the contradiction between "one permanent encoder" (L73) and "compressed clean GOP segments" (L74) is necessary, and noting the ~3–4 MB footprint is helpful. However, avoid building a crash-safe temp-chunk state machine for v1—a simple cleanup sweep of the temp folder on stream start/init is sufficient.

5. **Severity:** Nit
   **Affected Scope:** `live-video-streaming.md` `Technical Plan > 3` (L87); `comprehension_report.md` #5
   **Simplicity Rationale:** If timed sports need a clock in v1, keep the 1Hz tick in JS (or omit the running clock from the generic v1 PoC HUD) rather than building native timers in both Swift and Kotlin.
